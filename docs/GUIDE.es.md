# Desarrollo, entrenamiento y Arena

[English](ACTIONS.md) · [简体中文](RL.zh-CN.md) · [日本語](GUIDE.ja.md) · [한국어](GUIDE.ko.md) · **Español**

[Reglas](RULES.es.md) · [PDF A4](shenzhen-flower-rules-a4.es.pdf) · [README](../README.es.md)

Guía del SDK, el protocolo común, Gym, los dos modelos de imitación y el envío de políticas, con las reglas estándar 1.0.0. Los nombres de API, tokens, semillas e identificadores son iguales en todos los idiomas. Las referencias detalladas y los registros experimentales enlazados están en inglés.

<a id="sdk"></a>
## SDK

Hay SDK para JavaScript / TypeScript, Python, Rust y C++17. Se usan desde el código fuente; no se presupone su publicación en registros de paquetes. El SDK de Python requiere 3.10 o posterior. Desde la raíz del repositorio:

```js
const {Game, actions} = require('./sdk/structured.js');
const game = new Game(19, 0);
const obs = game.structuredObservation(game.actor);
const grammar = actions.build(obs);
const {mask, complete} = grammar.next([actions.T.PLAY_3]);
game.stepStructured(obs.legal_actions[0]);
```

`actor` vale 0 o 1, y `null` durante las transiciones automáticas. El anfitrión usa `game.grammar()` para gestionar `advance` / `next_game`. Al terminar el encuentro no quedan acciones. Una acción inválida no modifica las cartas ni el estado aleatorio.

La reproducción por semilla usa xorshift32 y Fisher–Yates, no un generador criptográfico. Las partidas guardadas contienen información privada: entrega a la política únicamente `structuredObservation`. [Referencia del SDK](SDK.md) · [Pruebas del juego](GAMETEST.md)

<a id="actions"></a>
## Acciones comunes

Una política de código, un evaluador de jugadas completas y un modelo autorregresivo devuelven la misma acción completa `actions-v2`. GameCore valida el conjunto y lo aplica una sola vez. La arquitectura del modelo no cambia el espacio de acciones del juego.

El ID de carta es `13 × suit + rank − 2`: palos ♠ ♥ ♣ ♦ y valores de 2 a A.

| ID | Significado |
| --- | --- |
| 0–51 | Las 52 cartas físicas |
| 52 / 53 / 54 | `PLAY_3` / `PLAY_4` / `PLAY_5` |
| 55 | `SWAP` |
| 56 / 57 | Saltar esta oportunidad de cambio / terminar todos los cambios |
| 58 / 59 | Avanzar la resolución / iniciar el siguiente juego |
| 60 / 61 | Mazo / carta aleatoria de la mano rival |
| 62 / 63 / 64 | Mano propia / heridas propias / heridas rivales |
| 65 | `PAD`: rellena una secuencia completa hasta seis posiciones; no es salida del modelo |

```js
{type: 'play', cards: [12, 25, 38]}
// [52, 12, 25, 38, 65, 65]
{type: 'play', cards: [5, 18, 31, 44]}
// [53, 5, 18, 31, 44, 65]
{type: 'play', cards: [5, 13, 18, 31, 44]}
// [54, 5, 13, 18, 31, 44] — repóquer de 7 si ♥2 es comodín
{type: 'swap', source: 34, target: {zone: 'deck'}}
// [55, 34, 60, 65, 65, 65]
{type: 'swap', source: 34, target: {zone: 'rival_wounds', card: 1}}
// [55, 34, 64, 1, 65, 65]
{type: 'skip_swap'}
{type: 'stop_swaps'}
```

Las cartas de una jugada se ordenan por ID ascendente. Todas sus permutaciones representan una única acción, por lo que no hace falta aumentación por permutaciones. Puedes combinar mano y heridas propias para jugar tres cartas. Cuatro y cinco cartas deben formar póquer y repóquer, respectivamente.

`action_mask` tiene 65 valores y depende del estado y del prefijo ya elegido. Un 1 significa que se puede completar una acción legal; un 0, que no. La identidad del token no cambia. Consultar la máscara no avanza turnos, recompensas ni aleatoriedad.

El origen de un cambio es una carta física propia. Un destino público especifica zona relativa e ID; el mazo y la mano oculta rival no incluyen un ID secreto. `skip_swap` consume una oportunidad; `stop_swaps` renuncia a todas las restantes. [Protocolo completo](ACTIONS.md)

<a id="gym"></a>
## Observación y Gym

```sh
python -m pip install -e './python[gym]'
```

```python
from threecard_royale.gym_structured import StructuredRoyaleEnv

env = StructuredRoyaleEnv(episode='game', player=0)
obs, info = env.reset(seed=19)
options = env.scoring_observation()
# Tu evaluador devuelve una puntuación por acción legal completa.
scores = model(options['state'], options['candidates'])
chosen = int(scores.argmax())
obs, reward, terminated, truncated, info = env.step(options['tokens'][chosen])
```

`model` es un evaluador que debes implementar: el ejemplo muestra cómo conectarlo. Importar `gym_structured` registra `ThreeCardRoyale-v1`.

| Observación | Forma | Contenido |
| --- | --- | --- |
| Zonas de cartas | 6 × 52 | Mano propia, heridas propias y rivales, descartes, jugadas activas propias y rivales |
| Fase | 6 | One-hot de ataque, defensa, cambios, resolución completada, fin de juego, fin de encuentro |
| Otros valores | 18 | Niveles, cantidades, comodín, primer atacante, cambios restantes y otros valores normalizados |
| Total de `state` | 336 / float32 | Estado visible actual |
| `action_mask` | 65 / int8 | Tokens disponibles al comenzar |

No incluye identidades de la mano oculta rival, orden del mazo, semilla, estado aleatorio ni una secuencia completa de jugadas pasadas. Los descartes públicos sí forman parte de la posición actual.

El transporte de acciones es `MultiDiscrete([66] * 6)`: serializa una jugada completa, no seis elecciones independientes. Un modelo autorregresivo consulta `env.action_masks(prefix)`, completa la secuencia, añade PAD y llama una sola vez a `step`.

`episode='game'` termina tras un juego; `'match'` cubre el encuentro de 2 a A. Las decisiones legales intermedias dan 0, y el resultado final +1 / −1 desde la perspectiva del agente. Una acción inválida da −0,05 sin cambiar cartas ni aleatoriedad, pero consume presupuesto. Los límites predeterminados son 4096 decisiones del agente y 10000 transiciones internas. Agotarlos produce `truncated`, no una derrota ficticia. Comprueba también `reset_terminal` / `reset_truncated` tras el reinicio.

En RL, el evaluador usa la log-probabilidad de la jugada elegida. El autorregresivo suma las de los tokens que no son PAD. Recompensa y descuento se aplican una sola vez por transición completa. PPO necesita una distribución adecuada y una cabeza de valor; unas cabezas MultiDiscrete independientes no garantizan la legalidad condicional.

<a id="models"></a>
## Modelos y evaluación

Los checkpoints publicados imitan las decisiones del SDK Code AI congelado; no se entrenaron con recompensas. El Code AI de la dificultad Hard del navegador es otra política.

| Método | Entrada → capas ocultas → salida | Parámetros | ONNX |
| --- | --- | ---: | ---: |
| Evaluación de jugadas completas | 336 + 72 → 256 → 128 → 1 | 137.729 | 552.407 bytes |
| Autorregresivo | 336 + 396 → 256 → 128 → 65 | 228.929 | 916.663 bytes |

Ambos usan ReLU. El evaluador comparte un MLP entre las acciones legales y aprende con softmax entre candidatos y entropía cruzada respecto a la elección del profesor. El índice de fila solo existe dentro de esa decisión: no se devuelve como acción pública. El autorregresivo recibe un prefijo de 6 × 66 y predice el siguiente token legal. Se entrena con teacher forcing y peso total uno por decisión.

Las 72 características del evaluador incluyen información calculada sobre el tipo de mano. Por tanto, no es una comparación que aísle únicamente la arquitectura. Supervisar varias buenas jugadas es compatible con el protocolo, pero los checkpoints actuales imitan una sola elección top-1.

Cada pareja juega 1.000 juegos con las mismas 500 semillas, asientos intercambiados, primeros atacantes equilibrados y comienzo en nivel 2.

| Rival | Evaluación completa | Autorregresivo |
| --- | ---: | ---: |
| Code AI / Hard | 42,6% | 23,9% |
| SDK Code AI | 45,5% | 26,6% |
| Easy · 64 | 55,9% | 36,6% |
| Evaluador · 512 → 256 | 50,5% | 29,8% |
| Random | 100,0% | 99,7% |

En el enfrentamiento directo, el autorregresivo gana el 28,8%. En este conjunto de semillas obtiene una tasa de victoria menor. Una representación clara o una alta precisión por token no garantizan fuerza de juego. [Registros de 11.000 juegos](experiments/neural-baselines/README.md) · [Benchmark completo](experiments/complete-baseline/README.md). El Elo provisional de Arena usa otros 60 juegos independientes.

NN AI del navegador usa el autorregresivo; Arena permite ambos. ONNX se ejecuta en un Worker WASM. Si falla la carga o la inferencia, se avisa y se vuelve a Easy. El tamaño del modelo no incluye el runtime de unos 14 MB, que se almacena por separado en caché. Las latencias registradas en Node / Apple M1 no son mediciones móviles.

<a id="training"></a>
## Reproducir el entrenamiento

### Evaluación de jugadas completas

```sh
python3.12 -m venv .venv
.venv/bin/pip install -r training/requirements-lock.txt
.venv/bin/python training/reproduce.py
```

Semilla 20261024, 10.000 juegos y 252.859 decisiones. La separación es por juegos completos: 8.000 / 1.000 / 1.000 para entrenamiento / validación / prueba, manteniendo ambos asientos juntos. Los datos comprimidos ocupan 112.497.347 bytes, más de 10 MB: se regeneran por autojuego y no se guardan en Git.

CPU de cuatro hilos, lote 128, AdamW 0.001, weight decay 0.0001, recorte de gradiente 5 y 10 épocas. La pérdida de validación selecciona la época 5. Entorno registrado: Python 3.12.14 / Node 24.19. `artifacts/nn-policy-256/reproduction.json` guarda hashes y resultados. Usa `--workers 2` si falta memoria. [Dependencias fijadas y receta](../training/README.md) · [Datos del modelo](../models/nn-policy/)

### Autorregresivo

```sh
node training/structured/collect.cjs
python3 -m venv .venv
. .venv/bin/activate
pip install -r training/structured/requirements.txt
python training/structured/train.py --epochs 40
tensorboard --logdir artifacts/structured-v2/tensorboard --host 127.0.0.1
```

Semilla 20261101, 10.000 juegos, 252.906 decisiones y 988.571 tokens. Los comienzos mezclan nivel 2, niveles variados y A. `game_id % 10` asigna 0 a validación, 1 a prueba y el resto a entrenamiento: 8.000 / 1.000 / 1.000 juegos. El gzip ocupa 12.665.068 bytes y se regenera. `dataset.json` registra hashes del código y cantidades.

CPU de cuatro hilos, lote 1024, AdamW 0.001, weight decay 0.0001, recorte de gradiente 5 y 40 épocas. Se seleccionó la época 16 por pérdida de validación. PyTorch 2.8.0 / NumPy 2.0.2; el entorno de entrenamiento registrado usa Python 3.9.6, mientras que el SDK requiere 3.10 o posterior. No se garantiza igualdad de bytes ONNX entre plataformas. El profesor nunca rechaza un cambio, por lo que faltan ejemplos positivos de skip / stop.

TensorBoard y `history.json` registran las curvas de entrenamiento y validación. El 90,44% de prueba es coincidencia por token, no exactitud de acciones completas. Torch y ONNX coincidieron en las elecciones enmascaradas de 2.048 tokens.

```sh
node training/evaluate-baselines.mjs --games 1000 --seed-start 91000000 \
  --output artifacts/neural-baselines
```

Este comando evalúa **los modelos incluidos en Git**, no los pesos recién entrenados. Registra estos últimos con un nuevo ID y recibo de validación, y evalúa ese ID. Los datos, `.pt` y logs de TensorBoard van en `artifacts/`, excluido de Git. El ONNX distribuido y los metadatos experimentales sí se versionan. [Receta completa](../training/structured/README.md) · [ONNX y registros](../models/structured-policy/)

<a id="arena"></a>
## Enviar una política

Crea `policies/entries/<id>/` con `manifest.json`, `policy.mjs` o `policy.onnx`, README y `validation.json`. El artefacto no debe superar 5.000.000 bytes. Identifica al autor con su usuario de GitHub e indica licencia y procedencia. No modifiques código o pesos de un ID ya puntuado: crea otro ID para una nueva versión.

| Formato | Contrato |
| --- | --- |
| JavaScript | `createPolicy({random, sdk, actions, scoring})` → `act(observation)` → acción completa |
| ONNX · `scoring-v2` | `state [B,336]` + `candidates [B,N,72]` → `logits [B,N]` |
| ONNX · `structured-v2` | `state [B,336]` + `prefix [B,396]` → `logits [B,65]` |

Las nuevas entradas declaran `api: "royale-policy-v2"`, `actions: "actions-v2"`, `rules: "1.0.0"`, `episode: "game"` e `information: "public"`. Parte de la [plantilla JS](../policies/templates/structured-policy.mjs) o del [ejemplo ONNX](../policies/entries/nn-structured-v2/manifest.json), y añade la entrada al registro. Porta las políticas de Python u otros lenguajes a JS, conservando la licencia y comprobando la equivalencia de comportamiento.

Usa el `random` inyectado. No dependas de red, reloj, almacenamiento, variables de entorno ni información oculta. Declara la memoria dentro de un juego y reiníciala en cada juego. Un Worker mantiene la interfaz fluida; no es una frontera de seguridad. Revisa código no confiable en un entorno aislado sin credenciales.

```sh
npm ci
npm run arena:validate
node arena/stamp.mjs your-policy-v1
npm run arena:submit -- --policy your-policy-v1
npm run arena:rate -- --policies your-policy-v1
```

Sustituye `your-policy-v1` por tu ID. La validación local completa cuatro juegos contra Code AI con asientos y primeros atacantes equilibrados. Incluye el recibo con hashes en el commit. El CI de PR lo verifica de forma independiente. Al publicar, solo las políticas pendientes juegan 20 juegos contra cada una de tres referencias fijas: O(n) respecto a los envíos, sin liga de todos contra todos.

Referencias: Code AI 1500, evaluador NN 1440 y Easy 1387. Victoria esperada: `1 / (1 + 10 ** ((opponentElo - rating) / 400))`. Se ajusta la verosimilitud de 60 juegos con una distribución previa de media 1500 y desviación 400. No se actualiza secuencialmente con un factor K. Es una puntuación provisional, no una medición de dificultad humana. Godlike ve la mano rival y queda excluido.

La ejecución se separa en un trabajo sin credenciales ni permisos de escritura. El trabajo de publicación confiable guarda resultados validados, actualiza leaderboard y activa Pages. Si HEAD cambia durante el proceso, se detiene. Una acción inválida no se sustituye por otra IA para puntuar. [Especificación de envíos](../policies/README.md) · [Puntuación y publicación](../arena/README.md)

<a id="contribute"></a>
## Desarrollo y traducciones

```sh
python3 -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/about.html?lang=es
```

Reutiliza el [sistema de diseño](../design-system.html?lang=es) y las flores, cartas y marcas de jugador existentes. No traduzcas nombres de protocolo, IDs, usuarios de GitHub ni nombres introducidos por jugadores. Las versiones de producto y reglas se gestionan por separado.

La fuente de las reglas traducidas es `app/locales/rules.js`. Regenera Markdown con `python3 scripts/build-rule-docs.py`. El texto A4 está en `scripts/onepager-locales.json`. Sigue las instrucciones de [generación y revisión visual del PDF](ONE_PAGER.md) y [mantenimiento de traducciones](I18N.md); actualiza también los enlaces.

<a id="validation"></a>
## Comprobaciones

```sh
npm test
npm run test:actions
npm run test:gym
python3 scripts/build-rule-docs.py --check
```

Las pruebas Python necesitan las dependencias opcionales de Gym. Para reglas, ejecuta también las [pruebas de conformidad y juego](GAMETEST.md). Comprueba la interfaz en los cinco idiomas, pantallas estrechas y temas claro y oscuro. Los cambios de modelo requieren legalidad, invariancia frente a información oculta, coincidencia Torch / ONNX, partidas de evaluación y latencia.
