# 開発・学習・アリーナ

[English](ACTIONS.md) · [简体中文](RL.zh-CN.md) · **日本語** · [한국어](GUIDE.ko.md) · [Español](GUIDE.es.md)

[ルール](RULES.ja.md) · [A4 PDF](shenzhen-flower-rules-a4.ja.pdf) · [README](../README.ja.md)

標準ルール1.0.0を使うSDK、共通アクション、Gym、2種類の模倣学習モデル、方策投稿のガイドです。API名、トークン、シード、成果物IDは全言語で共通です。詳細な実験記録とAPIリファレンスへのリンクは英語です。

<a id="sdk"></a>
## SDK

SDKはJavaScript / TypeScript、Python、Rust、C++17を提供します。ソースから利用し、パッケージレジストリからの配布を前提としません。Python SDKは3.10以上です。

リポジトリのルートで実行します。

```js
const {Game, actions} = require('./sdk/structured.js');
const game = new Game(19, 0);
const obs = game.structuredObservation(game.actor);
const grammar = actions.build(obs);
const {mask, complete} = grammar.next([actions.T.PLAY_3]);
game.stepStructured(obs.legal_actions[0]);
```

`actor`は0または1。自動進行では`null`になります。ホストは`game.grammar()`で`advance` / `next_game`を処理します。マッチ終了後に行動はありません。無効な行動はカードや乱数状態を変えません。

シードによる再現にはxorshift32とFisher–Yatesを使います。暗号学的な乱数ではありません。保存データには非公開情報があるため、方策には`structuredObservation`だけを渡します。

[SDKリファレンス](SDK.md) · [適合性検証](GAMETEST.md)

<a id="actions"></a>
## 共通アクション

コード、手全体を評価するモデル、自己回帰モデルは、同じ`actions-v2`の完全な行動を返します。GameCoreが全体を検証して一度だけ適用します。モデルの構造はゲームの行動空間を変更しません。

カードIDは`13 × suit + rank − 2`。花色は♠ ♥ ♣ ♦、ランクは2〜Aです。

| ID | 意味 |
| --- | --- |
| 0〜51 | 実在する52枚のカード |
| 52 / 53 / 54 | `PLAY_3` / `PLAY_4` / `PLAY_5` |
| 55 | `SWAP` |
| 56 / 57 | 今回だけ交換を見送る / 残りの交換を終了 |
| 58 / 59 | 解決を進める / 次のゲーム |
| 60 / 61 | 山札 / 相手のランダムな手札 |
| 62 / 63 / 64 | 自分の手札 / 自分のダメージカード / 相手のダメージカード |
| 65 | 完成した列を6枠に揃える`PAD`。モデルの出力には含めない |

```js
{type: 'play', cards: [12, 25, 38]}
// [52, 12, 25, 38, 65, 65]
{type: 'play', cards: [5, 18, 31, 44]}
// [53, 5, 18, 31, 44, 65]
{type: 'play', cards: [5, 13, 18, 31, 44]}
// [54, 5, 13, 18, 31, 44] — ♥2がワイルドなら5枚の7
{type: 'swap', source: 34, target: {zone: 'deck'}}
// [55, 34, 60, 65, 65, 65]
{type: 'swap', source: 34, target: {zone: 'rival_wounds', card: 1}}
// [55, 34, 64, 1, 65, 65]
{type: 'skip_swap'}
{type: 'stop_swaps'}
```

出すカードはIDの昇順に揃えます。同じ3枚の順列は同じ行動になり、順列によるデータ拡張は不要です。3枚は自分の手札・ダメージカードを混ぜて選べます。4枚・5枚は対応する同ランクの役が必要です。

65要素の`action_mask`は、現在状態と選択済み接頭列に条件づけられます。1は完全な合法行動に延長可能、0は不可能。IDの意味は変わりません。マスクの問い合わせではターン・報酬・乱数は進みません。

交換元は自分の実カードIDです。公開された交換先には相対ゾーンとカードIDを指定し、山札・相手の非公開手札には隠れたIDを指定しません。交換の見送りは1回分、終了は残り全部を放棄します。

[プロトコル全仕様](ACTIONS.md)

<a id="gym"></a>
## 観察とGym

```sh
python -m pip install -e './python[gym]'
```

```python
from threecard_royale.gym_structured import StructuredRoyaleEnv

env = StructuredRoyaleEnv(episode='game', player=0)
obs, info = env.reset(seed=19)
options = env.scoring_observation()
# 自作モデルが、完全な合法行動ごとに1つのスコアを返す。
scores = model(options['state'], options['candidates'])
chosen = int(scores.argmax())
obs, reward, terminated, truncated, info = env.step(options['tokens'][chosen])
```

`model`は利用者が実装する評価器です。上の例は接続方法を示します。`gym_structured`のインポートで`ThreeCardRoyale-v1`が登録されます。

| 観察 | 形状 | 内容 |
| --- | --- | --- |
| `state`のカード部分 | 6 × 52 | 自分の手札、自分・相手のダメージカード、捨て札、自分・相手の現在の出札 |
| フェーズ | 6 | 攻撃、防御、交換、解決済み、ゲーム終了、マッチ終了のone-hot |
| その他 | 18 | 正規化したレベル、カード枚数、ワイルド、先攻、残り交換回数など |
| `state`合計 | 336 / float32 | 現在の可視状態 |
| `action_mask` | 65 / int8 | 最初に選べるトークン |

相手の非公開手札、山札順、シード、乱数状態は含みません。完全な過去の対局列も入力しません。公開捨て札は現在の盤面情報として含みます。

行動の輸送形式は`MultiDiscrete([66] * 6)`です。6個の独立した選択ではなく、1つの完全な行動の直列化です。自己回帰モデルは`env.action_masks(prefix)`で各段階を制約し、完成後にPADを補って一度だけ`step`します。

`episode='game'`は単独ゲーム、`'match'`は2からAまでのマッチです。合法な途中行動の報酬は0、終端は学習側の勝敗に応じて+1 / −1。無効な行動は−0.05で盤面・乱数を変えませんが、ステップ上限には数えます。標準上限は学習側4096、内部自動進行10000です。時間切れは`truncated`であり敗北ではありません。リセット直後の`reset_terminal` / `reset_truncated`も確認します。

RLでは、手全体の評価器は選んだ行動の対数確率を使います。自己回帰では非PADトークンの対数確率を合計します。報酬と割引は完全な環境遷移ごとに1回。PPOには対応する確率分布と価値ヘッドが必要です。独立したMultiDiscreteヘッドだけでは条件付き合法性を扱えません。

<a id="models"></a>
## モデルと評価

現在のチェックポイントは報酬学習ではなく、凍結したSDK Code AIの選択を学ぶ行動模倣です。WebのHardは別のCode AIです。

| 方式 | 入力 → 隠れ層 → 出力 | パラメーター | ONNX |
| --- | --- | ---: | ---: |
| 手全体のスコアリング | 336 + 72 → 256 → 128 → 1 | 137,729 | 552,407 bytes |
| 自己回帰 | 336 + 396 → 256 → 128 → 65 | 228,929 | 916,663 bytes |

両方ReLUを使用。評価器は共有MLPで各合法行動を採点し、候補間softmaxと教師の選択に対する交差エントロピーを使います。候補の行番号はその判断内だけの値で、公開プロトコルには出しません。自己回帰は6 × 66の接頭列を入力し、合法な次トークンを予測します。教師強制で、1判断の総学習重みを1にします。

評価器の72特徴には手作業の役特徴もあるため、この比較はネットワーク構造だけを変えた実験ではありません。複数の良い行動を教師にする学習は可能ですが、公開チェックポイントはtop-1模倣です。

各組は同じ500シード、席交換・先攻均等化、レベル2から1,000ゲームです。

| 相手 | 手全体のスコアリング | 自己回帰 |
| --- | ---: | ---: |
| Code AI / Hard | 42.6% | 23.9% |
| SDK Code AI | 45.5% | 26.6% |
| Easy · 64 | 55.9% | 36.6% |
| スコアリング · 512 → 256 | 50.5% | 29.8% |
| Random | 100.0% | 99.7% |

直接対戦では自己回帰が28.8%。このシード群では自己回帰の勝率が低く、明快な表現やトークン正解率は強さを保証しません。[11,000ゲームの原記録](experiments/neural-baselines/README.md)と[完全ベンチマーク](experiments/complete-baseline/README.md)を公開しています。Arenaの独立した60ゲームによる暫定Eloとは別の評価です。

ブラウザーのNN AIは自己回帰、Arenaでは両方式を選べます。ONNXはWASM Workerで動作し、読み込み・推論失敗時は表示を伴ってEasyへ戻ります。モデルサイズに約14 MBの別キャッシュのランタイムは含みません。記録されたNode / Apple M1の遅延は、スマートフォンの測定値ではありません。

<a id="training"></a>
## 学習を再現する

### 手全体のスコアリング

```sh
python3.12 -m venv .venv
.venv/bin/pip install -r training/requirements-lock.txt
.venv/bin/python training/reproduce.py
```

シード20261024、10,000ゲーム・252,859判断。ゲーム単位で8,000 / 1,000 / 1,000に分割し、両席を同じ分割に保ちます。圧縮データは112,497,347 bytesで10 MBを超えるため、Gitには入れず自己対戦から再生成します。

CPU4スレッド、バッチ128、AdamW 0.001、weight decay 0.0001、勾配上限5、10 epoch。検証損失でepoch 5を選択。記録環境はPython3.12.14 / Node24.19です。`artifacts/nn-policy-256/reproduction.json`にハッシュと再現結果、同ディレクトリ下に学習記録を保存します。メモリ不足なら`--workers 2`を使います。

[固定依存関係と再現手順](../training/README.md) · [モデル情報](../models/nn-policy/)

### 自己回帰

```sh
node training/structured/collect.cjs
python3 -m venv .venv
. .venv/bin/activate
pip install -r training/structured/requirements.txt
python training/structured/train.py --epochs 40
tensorboard --logdir artifacts/structured-v2/tensorboard --host 127.0.0.1
```

シード20261101、10,000ゲーム・252,906判断・988,571トークン。開始レベルは2、各種レベル、Aを混ぜます。`game_id % 10`が0なら検証、1ならテスト、その他は学習。8,000 / 1,000 / 1,000ゲームです。gzipは12,665,068 bytesのため再生成します。`dataset.json`にソースハッシュと件数を記録します。

CPU4スレッド、バッチ1024、AdamW 0.001、weight decay 0.0001、勾配上限5、40 epoch。検証損失でepoch 16を選択。PyTorch2.8.0 / NumPy2.0.2、記録環境はPython3.9.6ですが、SDKは3.10以上が必要です。異なる環境でONNXのバイト一致は保証しません。教師は交換を辞退しないため、skip / stopの正例がありません。

TensorBoardと`history.json`にtrain / validation曲線を記録。テストの90.44%はトークン一致率であり、完全な行動の正解率ではありません。2,048トークンのPyTorch / ONNX検証ではマスク後の選択が一致しました。

```sh
node training/evaluate-baselines.mjs --games 1000 --seed-start 91000000 \
  --output artifacts/neural-baselines
```

このコマンドは**Git内のモデル**を評価します。今学習した重みではありません。新しい重みは新IDで登録し、検証票を作ってからそのIDを評価します。学習データ、`.pt`、TensorBoardログは無視対象の`artifacts/`へ。配布用ONNXと実験メタデータはGitで管理します。

[自己回帰の完全な手順](../training/structured/README.md) · [ONNXと学習記録](../models/structured-policy/)

<a id="arena"></a>
## 方策を投稿する

`policies/entries/<id>/`に`manifest.json`、`policy.mjs`または`policy.onnx`、README、`validation.json`を配置します。成果物は5,000,000 bytes以下。作者にはGitHubハンドルを使い、ライセンスと出典を記載します。評価済みIDの重み・コードは変更せず、新版には新IDを使います。

| 形式 | 契約 |
| --- | --- |
| JavaScript | `createPolicy({random, sdk, actions, scoring})` → `act(observation)` → 完全な行動 |
| ONNX · `scoring-v2` | `state [B,336]` + `candidates [B,N,72]` → `logits [B,N]` |
| ONNX · `structured-v2` | `state [B,336]` + `prefix [B,396]` → `logits [B,65]` |

新規投稿は`api: "royale-policy-v2"`、`actions: "actions-v2"`、`rules: "1.0.0"`、`episode: "game"`、`information: "public"`を宣言します。[JSテンプレート](../policies/templates/structured-policy.mjs)または[ONNXの実例](../policies/entries/nn-structured-v2/manifest.json)を基にし、レジストリにも追加します。Pythonなどのコード方策はJSへ移植し、元のライセンスと挙動一致を確認してください。

注入された`random`を使い、ネットワーク、時計、ストレージ、環境変数、非公開情報に依存しません。ゲーム内メモリを使うなら宣言し、ゲームごとにリセット。WorkerはUIを止めない仕組みであり、セキュリティ境界ではありません。信頼できないコードは資格情報のない隔離環境で検証します。

```sh
npm ci
npm run arena:validate
node arena/stamp.mjs your-policy-v1
npm run arena:submit -- --policy your-policy-v1
npm run arena:rate -- --policies your-policy-v1
```

`your-policy-v1`は自分のIDに置き換えます。ローカルではCode AIと席・先攻を均等化した4ゲームを完走し、ハッシュ付き検証票をコミットします。PR CIは独立に再検証。リリース時に新規・未評価の方策だけを3つの固定基準と各20ゲーム対戦させます。全件総当たりではなく投稿数に対してO(n)です。

固定基準はCode AI1500、NNスコアリング1440、Easy1387。期待勝率は`1 / (1 + 10 ** ((opponentElo - rating) / 400))`。60ゲームの尤度に1500中心・標準偏差400の事前分布を加えて当てはめます。K係数で順次更新する方式ではありません。暫定スコアであり、人間にとっての難しさの実測値でもありません。Godlikeは相手手札を見られるため対象外です。

実行は書き込み権限・認証情報のないジョブに分離。信頼された公開ジョブが検証済み結果を保存し、leaderboardをコミットしてPagesを起動します。リリース中にHEADが変われば停止します。無効行動時に別AIへ代打させて採点することはありません。

[投稿仕様](../policies/README.md) · [採点と公開](../arena/README.md)

<a id="contribute"></a>
## 開発と翻訳

```sh
python3 -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/about.html?lang=ja
```

画面は[共通デザインシステム](../design-system.html?lang=ja)、既存の花・カード・プレイヤーマークを再利用します。翻訳でプロトコル名、カードID、GitHubハンドル、入力された名前は変えません。製品版とルール版は別に管理します。

ルール本文の翻訳元は`app/locales/rules.js`。`python3 scripts/build-rule-docs.py`でGitHub版を再生成します。A4の文言は`scripts/onepager-locales.json`です。[PDFの生成・目視検証](ONE_PAGER.md)と[翻訳の保守](I18N.md)に従い、対応するリンクも更新します。

<a id="validation"></a>
## 検証

```sh
npm test
npm run test:actions
npm run test:gym
python3 scripts/build-rule-docs.py --check
```

PythonのテストにはGymの追加依存関係が必要です。規則変更時は[言語間適合性・ゲーム検証](GAMETEST.md)も実行。UI変更は中英日韓西、狭い画面、明暗テーマで確認します。モデル変更には合法性、隠れ情報不変性、Torch / ONNX一致、対戦・遅延測定が必要です。
