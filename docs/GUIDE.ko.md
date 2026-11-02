# 개발·학습·아레나

[English](ACTIONS.md) · [简体中文](RL.zh-CN.md) · [日本語](GUIDE.ja.md) · **한국어** · [Español](GUIDE.es.md)

[규칙](RULES.ko.md) · [A4 PDF](shenzhen-flower-rules-a4.ko.pdf) · [README](../README.ko.md)

표준 규칙 1.0.0을 사용하는 SDK, 공통 액션, Gym, 두 모방 학습 모델과 정책 제출 안내입니다. API 이름, 토큰, 시드와 산출물 ID는 모든 언어에서 같습니다. 상세 실험 기록과 API 참조 링크는 영어입니다.

<a id="sdk"></a>
## SDK

JavaScript / TypeScript, Python, Rust, C++17 SDK를 소스로 제공합니다. 패키지 레지스트리 배포를 전제로 하지 않습니다. Python SDK는 3.10 이상이 필요합니다. 저장소 루트에서 실행합니다.

```js
const {Game, actions} = require('./sdk/structured.js');
const game = new Game(19, 0);
const obs = game.structuredObservation(game.actor);
const grammar = actions.build(obs);
const {mask, complete} = grammar.next([actions.T.PLAY_3]);
game.stepStructured(obs.legal_actions[0]);
```

`actor`는 0 또는 1이며 자동 진행 중에는 `null`입니다. 호스트는 `game.grammar()`로 `advance` / `next_game`을 처리합니다. 전체 경기 종료 후에는 액션이 없습니다. 잘못된 액션은 카드나 난수 상태를 바꾸지 않습니다.

시드 재현에는 xorshift32와 Fisher–Yates를 사용하며 암호학적 난수는 아닙니다. 저장 데이터에는 비공개 정보가 있으므로 정책에는 `structuredObservation`만 전달합니다. [SDK 참조](SDK.md) · [게임 검증](GAMETEST.md)

<a id="actions"></a>
## 공통 액션

코드 정책, 전체 수 평가 모델과 자기회귀 모델 모두 같은 `actions-v2` 완성 액션을 반환합니다. GameCore는 액션 전체를 검증한 후 한 번만 실행합니다. 모델 구조는 게임의 액션 공간을 바꾸지 않습니다.

카드 ID는 `13 × suit + rank − 2`입니다. 무늬는 ♠ ♥ ♣ ♦, 숫자는 2부터 A 순서입니다.

| ID | 의미 |
| --- | --- |
| 0–51 | 실제 카드 52장 |
| 52 / 53 / 54 | `PLAY_3` / `PLAY_4` / `PLAY_5` |
| 55 | `SWAP` |
| 56 / 57 | 이번 교환 건너뛰기 / 남은 교환 모두 종료 |
| 58 / 59 | 정산 진행 / 다음 판 |
| 60 / 61 | 덱 / 무작위 상대 손패 |
| 62 / 63 / 64 | 내 손패 / 내 피해 카드 / 상대 피해 카드 |
| 65 | 완성된 열을 6칸으로 채우는 `PAD`; 모델 출력에는 포함하지 않음 |

```js
{type: 'play', cards: [12, 25, 38]}
// [52, 12, 25, 38, 65, 65]
{type: 'play', cards: [5, 18, 31, 44]}
// [53, 5, 18, 31, 44, 65]
{type: 'play', cards: [5, 13, 18, 31, 44]}
// [54, 5, 13, 18, 31, 44] — ♥2가 와일드일 때 7 파이브카드
{type: 'swap', source: 34, target: {zone: 'deck'}}
// [55, 34, 60, 65, 65, 65]
{type: 'swap', source: 34, target: {zone: 'rival_wounds', card: 1}}
// [55, 34, 64, 1, 65, 65]
{type: 'skip_swap'}
{type: 'stop_swaps'}
```

낼 카드는 ID 오름차순으로 정렬합니다. 같은 카드의 순열은 하나의 액션이므로 순열 데이터 증강이 필요 없습니다. 3장은 내 손패와 피해 카드를 섞어 선택할 수 있습니다. 4장과 5장은 각각 유효한 포카드·파이브카드여야 합니다.

65개 값의 `action_mask`는 현재 상태와 이미 선택한 접두열에 따라 달라집니다. 1은 완전한 합법 액션으로 이어질 수 있음, 0은 불가능함을 뜻합니다. ID의 의미는 바뀌지 않습니다. 마스크 조회는 턴·보상·난수를 진행하지 않습니다.

교환 출발점은 내 실제 카드 ID입니다. 공개 목적지는 상대적 영역과 카드 ID를 지정합니다. 덱이나 상대 비공개 손패에는 숨겨진 ID를 지정하지 않습니다. `skip_swap`은 기회 1회를 쓰고, `stop_swaps`는 남은 기회를 모두 포기합니다. [전체 프로토콜](ACTIONS.md)

<a id="gym"></a>
## 관측과 Gym

```sh
python -m pip install -e './python[gym]'
```

```python
from threecard_royale.gym_structured import StructuredRoyaleEnv

env = StructuredRoyaleEnv(episode='game', player=0)
obs, info = env.reset(seed=19)
options = env.scoring_observation()
# 사용자 모델은 완전한 합법 액션마다 점수 하나를 반환합니다.
scores = model(options['state'], options['candidates'])
chosen = int(scores.argmax())
obs, reward, terminated, truncated, info = env.step(options['tokens'][chosen])
```

`model`은 사용자가 구현할 평가기입니다. 위 코드는 연결 방식을 보여 줍니다. `gym_structured`를 가져오면 `ThreeCardRoyale-v1`이 등록됩니다.

| 관측 | 형태 | 내용 |
| --- | --- | --- |
| 카드 영역 | 6 × 52 | 내 손패, 내·상대 피해 카드, 버린 카드, 내·상대 현재 낸 카드 |
| 단계 | 6 | 공격, 방어, 교환, 정산 완료, 한 판 종료, 전체 경기 종료의 one-hot |
| 나머지 | 18 | 정규화한 레벨, 카드 수, 와일드, 선공, 남은 교환 횟수 등 |
| `state` 합계 | 336 / float32 | 현재 보이는 상태 |
| `action_mask` | 65 / int8 | 처음 선택할 수 있는 토큰 |

상대 비공개 손패, 덱 순서, 시드, 난수 상태와 전체 대국 기록은 입력에 없습니다. 공개 버린 카드는 현재 판면 정보로 포함합니다.

액션 전달 형식은 `MultiDiscrete([66] * 6)`입니다. 독립된 선택 6개가 아니라 하나의 완성 액션을 직렬화한 것입니다. 자기회귀 모델은 `env.action_masks(prefix)`로 각 단계를 제한하고, 완성 후 PAD를 채워 `step`을 한 번 호출합니다.

`episode='game'`은 한 판, `'match'`는 2부터 A까지의 전체 경기입니다. 합법적인 중간 액션의 보상은 0, 종료 보상은 학습자 승패에 따라 +1 / −1입니다. 잘못된 액션은 −0.05이며 판면·난수를 바꾸지 않지만 스텝 제한에는 포함됩니다. 기본 한도는 학습자 4096, 내부 자동 진행 10000입니다. 제한 종료는 패배가 아니라 `truncated`입니다. 리셋 직후의 `reset_terminal` / `reset_truncated`도 처리합니다.

RL에서 전체 수 평가기는 선택한 액션의 로그 확률을 사용합니다. 자기회귀는 PAD를 제외한 토큰 로그 확률을 합칩니다. 보상·할인은 완전한 환경 전이당 한 번만 적용합니다. PPO에는 적합한 확률 분포와 가치 헤드가 필요하며, 독립적인 MultiDiscrete 헤드만으로 조건부 합법성을 보장할 수 없습니다.

<a id="models"></a>
## 모델과 평가

공개 체크포인트는 보상 학습이 아닌, 고정된 SDK Code AI의 선택을 모방한 모델입니다. 웹의 Hard는 별도의 Code AI입니다.

| 방식 | 입력 → 은닉층 → 출력 | 파라미터 | ONNX |
| --- | --- | ---: | ---: |
| 전체 수 평가 | 336 + 72 → 256 → 128 → 1 | 137,729 | 552,407 bytes |
| 자기회귀 | 336 + 396 → 256 → 128 → 65 | 228,929 | 916,663 bytes |

둘 다 ReLU를 사용합니다. 평가기는 공유 MLP로 합법 액션을 채점하고 후보 간 softmax 및 교사의 선택에 대한 교차 엔트로피를 계산합니다. 후보 행 번호는 해당 판단 내부 값이며 공개 액션으로 반환하지 않습니다. 자기회귀는 6 × 66 접두열을 입력받아 합법적인 다음 토큰을 예측합니다. teacher forcing을 사용하며 판단 하나의 총 학습 가중치는 1입니다.

평가기의 72차원에는 수작업 패 유형 특징도 포함됩니다. 따라서 순수한 구조 차이만 통제한 실험은 아닙니다. 여러 좋은 액션을 감독하는 방식도 가능하지만, 공개 체크포인트는 top-1 모방입니다.

각 대진은 같은 500개 시드, 자리 교환·선공 균등화, 레벨 2 시작으로 1,000판을 진행했습니다.

| 상대 | 전체 수 평가 | 자기회귀 |
| --- | ---: | ---: |
| Code AI / Hard | 42.6% | 23.9% |
| SDK Code AI | 45.5% | 26.6% |
| Easy · 64 | 55.9% | 36.6% |
| 평가기 · 512 → 256 | 50.5% | 29.8% |
| Random | 100.0% | 99.7% |

직접 대결에서는 자기회귀가 28.8%를 이겼습니다. 이 시드 집합에서는 자기회귀의 승률이 낮았습니다. 명확한 표현이나 높은 토큰 정확도가 실력을 보장하지는 않습니다. [11,000판 원본 기록](experiments/neural-baselines/README.md) · [전체 벤치마크](experiments/complete-baseline/README.md). 아레나의 독립된 60판 임시 Elo와는 다른 평가입니다.

브라우저 NN AI는 자기회귀이며 아레나에서 두 방식을 모두 선택할 수 있습니다. ONNX는 WASM Worker에서 실행됩니다. 로드·추론 실패 시 안내와 함께 Easy로 대체합니다. 모델 크기에는 별도로 캐시하는 약 14 MB 런타임이 포함되지 않습니다. 기록된 Node / Apple M1 지연은 휴대전화 측정값이 아닙니다.

<a id="training"></a>
## 학습 재현

### 전체 수 평가

```sh
python3.12 -m venv .venv
.venv/bin/pip install -r training/requirements-lock.txt
.venv/bin/python training/reproduce.py
```

시드 20261024, 10,000판·252,859개 판단. 판 단위로 학습 / 검증 / 테스트를 8,000 / 1,000 / 1,000으로 나누고 두 자리는 같은 분할에 둡니다. 압축 데이터는 112,497,347 bytes로 10 MB를 넘으므로 Git에 넣지 않고 자기 대국으로 재생성합니다.

CPU 4스레드, 배치 128, AdamW 0.001, weight decay 0.0001, 기울기 제한 5, 10 epoch. 검증 손실로 epoch 5를 선택합니다. 기록 환경은 Python 3.12.14 / Node 24.19입니다. `artifacts/nn-policy-256/reproduction.json`에 해시와 재현 결과를 저장합니다. 메모리가 부족하면 `--workers 2`를 사용합니다. [고정 의존성과 재현 절차](../training/README.md) · [모델 자료](../models/nn-policy/)

### 자기회귀

```sh
node training/structured/collect.cjs
python3 -m venv .venv
. .venv/bin/activate
pip install -r training/structured/requirements.txt
python training/structured/train.py --epochs 40
tensorboard --logdir artifacts/structured-v2/tensorboard --host 127.0.0.1
```

시드 20261101, 10,000판·252,906개 판단·988,571개 토큰. 시작 레벨은 2, 다양한 레벨, A를 섞습니다. `game_id % 10`이 0이면 검증, 1이면 테스트, 나머지는 학습으로 8,000 / 1,000 / 1,000판입니다. gzip은 12,665,068 bytes이므로 재생성하며 `dataset.json`에 소스 해시와 개수를 기록합니다.

CPU 4스레드, 배치 1024, AdamW 0.001, weight decay 0.0001, 기울기 제한 5, 40 epoch. 검증 손실로 epoch 16을 선택했습니다. PyTorch 2.8.0 / NumPy 2.0.2, 기록된 학습 환경은 Python 3.9.6이지만 SDK는 3.10 이상입니다. 환경 간 ONNX 바이트 일치를 보장하지 않습니다. 교사는 교환을 거절하지 않으므로 skip / stop의 양성 예제가 없습니다.

TensorBoard와 `history.json`에 학습 / 검증 곡선을 기록합니다. 테스트 90.44%는 토큰 일치율이며 완성 액션의 정확도가 아닙니다. 2,048개 토큰의 Torch / ONNX 검사에서 마스크 적용 후 선택이 같았습니다.

```sh
node training/evaluate-baselines.mjs --games 1000 --seed-start 91000000 \
  --output artifacts/neural-baselines
```

이 명령은 방금 학습한 가중치가 아닌 **Git에 저장된 모델**을 평가합니다. 새 가중치는 새 ID로 등록하고 로컬 검증 확인서를 만든 뒤 그 ID를 평가합니다. 데이터, `.pt`, TensorBoard 로그는 무시되는 `artifacts/`에 보관합니다. 배포 ONNX와 실험 메타데이터는 Git으로 관리합니다. [전체 학습 절차](../training/structured/README.md) · [ONNX와 학습 기록](../models/structured-policy/)

<a id="arena"></a>
## 정책 제출

`policies/entries/<id>/`에 `manifest.json`, `policy.mjs` 또는 `policy.onnx`, README, `validation.json`을 둡니다. 산출물 한도는 5,000,000 bytes입니다. 작성자는 GitHub 핸들로 표시하고 라이선스와 출처를 적습니다. 평가된 ID의 코드·가중치는 바꾸지 않고 새 버전에 새 ID를 부여합니다.

| 형식 | 계약 |
| --- | --- |
| JavaScript | `createPolicy({random, sdk, actions, scoring})` → `act(observation)` → 완성 액션 |
| ONNX · `scoring-v2` | `state [B,336]` + `candidates [B,N,72]` → `logits [B,N]` |
| ONNX · `structured-v2` | `state [B,336]` + `prefix [B,396]` → `logits [B,65]` |

새 정책은 `api: "royale-policy-v2"`, `actions: "actions-v2"`, `rules: "1.0.0"`, `episode: "game"`, `information: "public"`을 선언합니다. [JS 템플릿](../policies/templates/structured-policy.mjs) 또는 [ONNX 예제](../policies/entries/nn-structured-v2/manifest.json)를 참고하고 레지스트리에도 추가합니다. Python 등 코드 정책은 JS로 포팅하며 원래 라이선스와 동작 일치를 확인합니다.

주입된 `random`을 사용하고 네트워크, 시계, 저장소, 환경 변수, 비공개 정보에 의존하지 않습니다. 판 내부 메모리를 쓰면 선언하고 매 판 초기화합니다. Worker는 UI 응답성을 위한 장치이지 보안 경계가 아닙니다. 신뢰하지 않는 코드는 인증 정보 없는 격리 환경에서 검사합니다.

```sh
npm ci
npm run arena:validate
node arena/stamp.mjs your-policy-v1
npm run arena:submit -- --policy your-policy-v1
npm run arena:rate -- --policies your-policy-v1
```

`your-policy-v1`을 자신의 ID로 바꿉니다. 로컬에서 Code AI와 자리·선공을 균등화한 4판을 완주하고 해시가 포함된 확인서를 커밋합니다. PR CI는 독립적으로 재검증합니다. 릴리스에서는 미평가 정책만 3개 고정 기준과 각 20판 대결합니다. 전체 라운드 로빈 대신 제출 수에 대해 O(n)입니다.

고정 기준은 Code AI 1500, NN 평가기 1440, Easy 1387입니다. 기대 승률은 `1 / (1 + 10 ** ((opponentElo - rating) / 400))`. 60판 우도에 평균 1500·표준편차 400의 사전 분포를 더해 적합합니다. K 계수로 순차 갱신하지 않습니다. 임시 점수이며 사람에게 얼마나 어려운지 실측한 값도 아닙니다. 상대 손패를 보는 Godlike는 제외합니다.

정책 실행은 쓰기 권한과 인증 정보 없는 작업으로 분리합니다. 신뢰된 게시 작업이 검증 결과와 leaderboard를 커밋하고 Pages를 시작합니다. 도중에 HEAD가 바뀌면 중단합니다. 잘못된 액션을 다른 AI로 대신 처리한 결과로 채점하지 않습니다. [제출 규격](../policies/README.md) · [채점·게시](../arena/README.md)

<a id="contribute"></a>
## 개발과 번역

```sh
python3 -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/about.html?lang=ko
```

UI는 [공통 디자인 시스템](../design-system.html?lang=ko)과 기존 꽃·카드·플레이어 마크를 재사용합니다. 번역 시 프로토콜 이름, 카드 ID, GitHub 핸들, 사용자가 입력한 이름을 바꾸지 않습니다. 제품 버전과 규칙 버전은 별개입니다.

규칙 번역 원본은 `app/locales/rules.js`입니다. `python3 scripts/build-rule-docs.py`로 GitHub 규칙을 재생성합니다. A4 문구는 `scripts/onepager-locales.json`에 있습니다. [PDF 생성·육안 검사](ONE_PAGER.md)와 [번역 유지 관리](I18N.md)를 따르고 관련 링크도 갱신합니다.

<a id="validation"></a>
## 검증

```sh
npm test
npm run test:actions
npm run test:gym
python3 scripts/build-rule-docs.py --check
```

Python 테스트에는 Gym 추가 의존성이 필요합니다. 규칙 변경은 [언어 간 적합성·게임 검사](GAMETEST.md)도 수행합니다. UI는 5개 언어, 좁은 화면, 밝고 어두운 테마를 확인합니다. 모델 변경에는 합법성, 숨은 정보 불변성, Torch / ONNX 일치, 대국 및 지연 측정이 필요합니다.
