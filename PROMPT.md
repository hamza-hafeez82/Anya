## PROMPT START

You are scaffolding **Anya** — an emotionally intelligent robot OS. Create a complete monorepo with real stub code. No placeholder lorem ipsum. Every file must have correct interfaces, types, working structure, and inline comments so implementation can begin immediately without any restructuring.

---

## Repository Name
`anya`

---

## Tech Stack — Do Not Deviate

| Layer | Technology |
|---|---|
| Face App | Vite + TypeScript + PixiJS 8 + WebSocket client (PWA) |
| Backend language | Python 3.11 |
| Web framework | FastAPI + asyncio |
| WebSocket | FastAPI native WebSockets |
| Message bus | Redis pub/sub (redis-py async) |
| LLM | Anthropic Claude API (`anthropic` Python SDK, model: `claude-sonnet-4-20250514`) |
| STT | `openai-whisper` (runs on Railway, base model) |
| TTS | ElevenLabs (`elevenlabs` Python SDK) |
| Database | Supabase (PostgreSQL + pgvector via `supabase` Python SDK) |
| ESP32 | PlatformIO + Arduino C++ |
| JS package manager | pnpm |
| Python deps | `requirements.txt` per service |
| Containers | Docker + docker-compose (local dev only) |
| Deployment | Railway (`railway.toml` per service) |

---

## Exact File Tree

```
anya/
├── apps/
│   └── face/
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── package.json
│       └── src/
│           ├── main.ts
│           ├── types/
│           │   └── messages.ts
│           ├── comms/
│           │   └── WebSocketClient.ts
│           ├── perception/
│           │   ├── CameraCapture.ts
│           │   └── MicCapture.ts
│           └── face/
│               ├── FaceEngine.ts
│               ├── expressions.ts
│               ├── Interpolator.ts
│               └── IdleAnimator.ts
│
├── services/
│   ├── gateway/
│   │   ├── main.py
│   │   ├── router.py
│   │   ├── message_bus.py
│   │   ├── models.py
│   │   ├── config.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── railway.toml
│   │
│   ├── perception/
│   │   ├── main.py
│   │   ├── vision_engine.py
│   │   ├── audio_engine.py
│   │   ├── face_analyzer.py
│   │   ├── models.py
│   │   ├── config.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── railway.toml
│   │
│   ├── cognition/
│   │   ├── main.py
│   │   ├── context_aggregator.py
│   │   ├── attention_system.py
│   │   ├── cognitive_router.py
│   │   ├── reflex_engine.py
│   │   ├── llm_engine.py
│   │   ├── tts_engine.py
│   │   ├── models.py
│   │   ├── config.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── railway.toml
│   │
│   ├── emotion/
│   │   ├── main.py
│   │   ├── emotion_engine.py
│   │   ├── models.py
│   │   ├── config.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── railway.toml
│   │
│   └── memory/
│       ├── main.py
│       ├── working_memory.py
│       ├── episodic_memory.py
│       ├── semantic_memory.py
│       ├── consolidation.py
│       ├── supabase_client.py
│       ├── models.py
│       ├── config.py
│       ├── requirements.txt
│       ├── Dockerfile
│       └── railway.toml
│
├── firmware/
│   └── esp32/
│       ├── platformio.ini
│       └── src/
│           ├── main.cpp
│           ├── sensors.h
│           ├── sensors.cpp
│           ├── servos.h
│           ├── servos.cpp
│           ├── ws_client.h
│           └── ws_client.cpp
│
├── shared/
│   └── types/
│       ├── messages.py
│       └── messages.ts
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Redis Topic Map

All services communicate via Redis pub/sub. Use exactly these channel names:

```
perception:vision         # VisionObservation published by perception service
perception:audio          # AudioObservation published by perception service
perception:sensors        # SensorObservation published by gateway (from ESP32)
perception:people         # PersonObservation published by perception service

cognition:context         # ContextSnapshot published by cognition service (10Hz)
cognition:attention       # AttentionState published by cognition service
cognition:emotion         # EmotionState published by emotion service
cognition:router          # RouterDecision published by cognition service

response:expression       # ExpressionCommand published by cognition → face app
response:voice            # VoiceCommand published by cognition → face app
response:motion           # MotionCommand published by cognition → gateway → ESP32
response:memory_write     # MemoryWrite published by cognition → memory service

mobile:frame              # Raw camera frame (base64 JPEG) from face app → gateway → perception
mobile:audio_chunk        # Raw audio chunk (base64 PCM) from face app → gateway → perception
esp32:sensors             # Raw IR sensor reading from ESP32 → gateway
esp32:commands            # Servo/motor commands from cognition → gateway → ESP32
```

---

## WebSocket Protocol (Mobile ↔ Gateway)

Mobile connects to: `wss://<railway-url>/ws`
ESP32 connects to: `wss://<railway-url>/esp32`

All messages are JSON with a `type` field.

**Mobile → Gateway:**
```json
{ "type": "camera_frame", "data": "<base64 JPEG>", "ts": 1746742800123 }
{ "type": "audio_chunk", "data": "<base64 PCM 16kHz>", "ts": 1746742800123 }
{ "type": "speech_end", "ts": 1746742800123 }
{ "type": "ping" }
```

**Gateway → Mobile:**
```json
{ "type": "expression", "params": { "eye_open": 0.9, "smile": 0.8, "blush": 0.1, "brow_angle": 0.0, "mouth_open": 0.2, "emotion": "happy", "transition_ms": 400 } }
{ "type": "voice", "audio_b64": "<base64 MP3>", "phonemes": [] }
{ "type": "pong" }
```

**ESP32 → Gateway:**
```json
{ "type": "sensors", "fl": 45, "fc": 90, "fr": 60, "ts": 1746742800123 }
{ "type": "servo_ack", "pan": 15, "tilt": -10 }
```

**Gateway → ESP32:**
```json
{ "type": "servo", "pan": 15, "tilt": -10, "speed": 30 }
{ "type": "motor", "left": 180, "right": 180, "dur_ms": 1500 }
{ "type": "stop" }
```

---

## Data Models (implement in both `shared/types/messages.py` and `shared/types/messages.ts`)

### ExpressionParams
```python
class ExpressionParams(BaseModel):
    eye_open: float = 0.85        # 0.0 (closed) to 1.0 (wide open)
    blink_state: float = 0.0      # 0.0 (open) to 1.0 (fully closed)
    smile: float = 0.0            # -0.5 (frown) to 1.0 (full smile)
    blush: float = 0.0            # 0.0 to 1.0
    brow_angle: float = 0.0       # -0.5 (sad/down) to 0.5 (raised/surprised)
    mouth_open: float = 0.0       # 0.0 to 1.0
    tear: float = 0.0             # 0.0 to 1.0
    pupil_dilation: float = 0.7   # 0.3 to 1.0
    gaze_x: float = 0.0           # -1.0 (left) to 1.0 (right)
    gaze_y: float = 0.0           # -1.0 (up) to 1.0 (down)
    head_tilt: float = 0.0        # -0.5 (left tilt) to 0.5 (right tilt)
```

### EmotionState
```python
class EmotionDimensions(BaseModel):
    valence: float = 0.5          # -1.0 to 1.0
    arousal: float = 0.3          # 0.0 to 1.0
    social_battery: float = 0.8   # 0.0 to 1.0
    curiosity: float = 0.5
    attachment: float = 0.8
    comfort: float = 0.8

class EmotionCandidate(BaseModel):
    emotion: str
    confidence: float

class EmotionState(BaseModel):
    dimensions: EmotionDimensions
    dominant_emotion: str
    candidates: list[EmotionCandidate]
    personality_mode: str = "playful"
    timestamp: float
```

### ContextSnapshot (the full world model)
```python
class SceneData(BaseModel):
    type: str = "unknown"
    confidence: float = 0.0
    semantic_tags: list[str] = []
    atmosphere: dict = {}
    collision_risk: str = "low"   # low / medium / critical
    free_space: float = 1.0

class PersonIdentity(BaseModel):
    id: str
    relation: str = "unknown"     # owner / friend / stranger
    confidence: float = 0.0
    familiarity_level: str = "low"

class PersonEmotionalAnalysis(BaseModel):
    candidates: list[EmotionCandidate]
    primary_emotion: str
    confidence: float
    emotional_shift: str = "stable"

class PersonSpeech(BaseModel):
    text: str = ""
    tone: str = "neutral"
    speed: str = "normal"
    volume: str = "normal"
    intent: str = "unknown"
    sentiment: str = "neutral"

class PersonObservation(BaseModel):
    identity: PersonIdentity
    distance: float = 1.0
    attention_on_anya: float = 0.0
    eye_contact: bool = False
    pose: str = "unknown"
    activity: str = "unknown"
    emotional_analysis: PersonEmotionalAnalysis
    speech: PersonSpeech

class SelfState(BaseModel):
    name: str = "Anya"
    emotion: EmotionState
    battery_pct: int = 100
    posture: str = "idle_standing"
    current_goal: str = "idle"
    attention_focus: str = "none"
    relevant_memories: list[str] = []

class ResponseStrategy(BaseModel):
    expression: str = "neutral"
    voice_tone: str = "warm"
    body_language: str = "idle"
    priority: str = "maintain_engagement"

class MetaCognition(BaseModel):
    situation_summary: str
    social_interpretation: str
    response_strategy: ResponseStrategy
    physical_risk: str = "none"
    social_risk: str = "none"

class ContextSnapshot(BaseModel):
    snapshot_id: str
    timestamp: float
    scene: SceneData
    people: list[PersonObservation]
    self_state: SelfState
    attention: dict
    meta: MetaCognition
```

### RouterDecision
```python
class RouterDecision(BaseModel):
    route: str   # "reflex" | "habitual" | "deliberate"
    confidence: float
    triggers: list[str]
    snapshot_id: str
    skip_llm: bool
```

### LLMResponse
```python
class LLMResponse(BaseModel):
    verbal_response: str
    expression_command: dict   # ExpressionParams fields + emotion + transition_ms
    motion_command: dict       # neck_pan, neck_tilt, movement type
    memory_write: dict         # episodic note + emotion_update
    internal_thought: str = ""
```

---

## Per-File Specifications

### `apps/face/src/types/messages.ts`
TypeScript mirror of all Python models above. Use `interface` not `type`. Include `WebSocketInMessage` and `WebSocketOutMessage` discriminated unions using the `type` field.

### `apps/face/src/comms/WebSocketClient.ts`
- Class `WebSocketClient`
- Constructor takes `url: string`
- Methods: `connect()`, `disconnect()`, `send(msg: WebSocketOutMessage)`, `onMessage(handler: (msg: WebSocketInMessage) => void)`
- Auto-reconnect with exponential backoff (max 5 retries, start 1s)
- Heartbeat ping every 30s
- Event emitter pattern for message types: `on('expression', handler)`, `on('voice', handler)`

### `apps/face/src/perception/CameraCapture.ts`
- Class `CameraCapture`
- `start()`: request camera permission, start `getUserMedia` stream
- `captureFrame()`: capture current frame as base64 JPEG at 640x480
- `startStreaming(onFrame: (b64: string) => void, intervalMs = 2000)`: call `onFrame` at interval
- `stop()`: stop stream and release camera

### `apps/face/src/perception/MicCapture.ts`
- Class `MicCapture`
- `start()`: request mic permission, init `AudioContext`
- Voice Activity Detection: use `ScriptProcessorNode` with RMS threshold detection
- On speech start: begin buffering PCM chunks
- On speech end (300ms silence): emit complete audio chunk as base64
- `onSpeech(handler: (audioB64: string) => void)`
- `onSpeechEnd(handler: () => void)`
- `stop()`

### `apps/face/src/face/expressions.ts`
Define all named expressions as `ExpressionParams` objects:
```ts
export const EXPRESSIONS: Record<string, ExpressionParams> = {
  neutral:   { eye_open: 0.85, smile: 0.0,  blush: 0.0,  brow_angle: 0.0,  mouth_open: 0.0, pupil_dilation: 0.7 },
  happy:     { eye_open: 0.9,  smile: 0.8,  blush: 0.1,  brow_angle: 0.0,  mouth_open: 0.2, pupil_dilation: 0.8 },
  excited:   { eye_open: 1.0,  smile: 0.9,  blush: 0.2,  brow_angle: 0.1,  mouth_open: 0.4, pupil_dilation: 1.0 },
  loved:     { eye_open: 0.7,  smile: 0.7,  blush: 0.4,  brow_angle: -0.1, mouth_open: 0.1, pupil_dilation: 0.6 },
  laughing:  { eye_open: 0.3,  smile: 1.0,  blush: 0.15, brow_angle: 0.1,  mouth_open: 0.7, pupil_dilation: 0.8 },
  shocked:   { eye_open: 1.0,  smile: -0.1, blush: 0.0,  brow_angle: 0.4,  mouth_open: 0.5, pupil_dilation: 1.0 },
  sad:       { eye_open: 0.5,  smile: -0.4, blush: 0.05, brow_angle: -0.4, mouth_open: 0.0, pupil_dilation: 0.5 },
  crying:    { eye_open: 0.4,  smile: -0.5, blush: 0.1,  brow_angle: -0.4, mouth_open: 0.3, pupil_dilation: 0.5, tear: 1.0 },
  sleepy:    { eye_open: 0.3,  smile: 0.2,  blush: 0.05, brow_angle: -0.1, mouth_open: 0.0, pupil_dilation: 0.4 },
  concerned: { eye_open: 0.75, smile: 0.0,  blush: 0.0,  brow_angle: -0.2, mouth_open: 0.0, pupil_dilation: 0.7 },
  thinking:  { eye_open: 0.8,  smile: 0.1,  blush: 0.0,  brow_angle: -0.15,mouth_open: 0.0, pupil_dilation: 0.6, gaze_x: 0.3 },
  cringe:    { eye_open: 0.6,  smile: -0.2, blush: 0.1,  brow_angle: -0.3, mouth_open: 0.1, pupil_dilation: 0.6 },
  curious:   { eye_open: 0.95, smile: 0.3,  blush: 0.0,  brow_angle: 0.1,  mouth_open: 0.0, pupil_dilation: 0.85, head_tilt: -0.2 },
}
```

### `apps/face/src/face/Interpolator.ts`
- Class `Interpolator`
- Smoothly interpolates between two `ExpressionParams` states
- `transitionTo(target: ExpressionParams, durationMs: number)`: begin smooth transition
- `tick(deltaMs: number): ExpressionParams`: advance interpolation, return current state
- Use cubic ease-in-out for all parameters
- `onComplete(handler: () => void)`: fires when transition finishes

### `apps/face/src/face/IdleAnimator.ts`
- Class `IdleAnimator`
- Runs continuously, applies subtle idle modifications on top of base expression
- Blink: every 3000-5000ms (randomized), 120ms close + 80ms open animation
- Micro-expression flickers: subtle ±0.05 adjustments to smile/brow every 8-15s
- Breathing: very slow sinusoidal head_tilt oscillation (±0.03, period 4s)
- Gaze wander: when `isWandering = true`, gaze_x/y drifts softly between random positions
- `setWandering(enabled: boolean)`: when true gaze wanders, when false gaze locks to target
- `setGazeTarget(x: number, y: number)`: lock gaze to specific point (for face tracking)
- `tick(deltaMs: number): Partial<ExpressionParams>`: returns idle delta to apply on top of base

### `apps/face/src/face/FaceEngine.ts`
- Class `FaceEngine`
- Constructor takes `canvas: HTMLCanvasElement`
- `init()`: async, initialize PixiJS Application on canvas
- `setExpression(name: string, transitionMs?: number)`: transition to named expression
- `setExpressionParams(params: Partial<ExpressionParams>, transitionMs?: number)`: transition to custom params
- `startSpeaking()`: enable mouth animation for TTS playback
- `stopSpeaking()`: return mouth to rest
- `tick()`: called every frame via PixiJS ticker
- Internally uses `Interpolator` and `IdleAnimator`
- The actual PixiJS face drawing is stubbed with a colored rectangle and text label showing current expression name. Add a TODO comment: `// TODO: Replace with actual PixiJS sprite/mesh face rendering`

### `apps/face/src/main.ts`
- Initialize `FaceEngine` on canvas element
- Initialize `WebSocketClient` pointing to `VITE_GATEWAY_URL` env var
- Initialize `CameraCapture` and `MicCapture`
- On WebSocket connect: start camera streaming (send frames every 2s)
- On mic speech detected: send audio chunk, then speech_end
- On WebSocket `expression` message: call `faceEngine.setExpressionParams(msg.params, msg.transition_ms)`
- On WebSocket `voice` message: decode base64 audio, play via Web Audio API
- PixiJS ticker calls `faceEngine.tick()` every frame

### `apps/face/index.html`
Full PWA-ready HTML with:
- Viewport meta for mobile
- Web App Manifest link
- Canvas element full-screen
- Permissions policy for camera + microphone
- Load Vite entry point

---

### `services/gateway/config.py`
Pydantic `Settings` class using `pydantic-settings`. Fields:
```python
REDIS_URL: str
SUPABASE_URL: str
SUPABASE_KEY: str
ANTHROPIC_API_KEY: str
ELEVENLABS_API_KEY: str
ELEVENLABS_VOICE_ID: str = "your-anya-voice-id"
PORT: int = 8000
```
Load from environment. Export singleton `settings`.

### `services/gateway/models.py`
Import all shared models from `shared/types/messages.py` (use relative path for now). Add gateway-specific models:
```python
class MobileConnection(BaseModel):
    connection_id: str
    connected_at: float
    device_type: str = "mobile"   # "mobile" | "esp32"
```

### `services/gateway/message_bus.py`
- Async Redis client using `redis.asyncio`
- `MessageBus` class
- `connect()`: connect to Redis
- `publish(channel: str, data: dict)`: serialize to JSON, publish
- `subscribe(channel: str, handler: Callable)`: subscribe and call handler on message
- `subscribe_multiple(channels: list[str], handler: Callable)`: subscribe to multiple
- Channels from the Redis Topic Map above

### `services/gateway/router.py`
FastAPI router with:
- `GET /health` → `{"status": "ok", "service": "gateway"}`
- `WebSocket /ws` → mobile connection handler:
  - Accept connection, register client
  - Receive loop: parse JSON, route `camera_frame` and `audio_chunk` to `perception:*` Redis channels, route `sensors` to `perception:sensors`
  - Subscribe to `response:expression` and `response:voice` Redis channels, forward to connected mobile client
  - On disconnect: unregister, clean up
- `WebSocket /esp32` → ESP32 connection handler:
  - Accept connection
  - Receive loop: parse JSON `sensors` messages, publish to `perception:sensors`
  - Subscribe to `esp32:commands`, forward to ESP32
  - On disconnect: clean up

### `services/gateway/main.py`
FastAPI app initialization. Include router. Startup event connects Redis. Uvicorn entry point.

---

### `services/perception/vision_engine.py`
- `VisionEngine` class
- `process_frame(frame_b64: str) -> VisionObservation`:
  - Decode base64 JPEG
  - **Stub**: return mock `VisionObservation` with placeholder data
  - Add TODO: `# TODO: Integrate MediaPipe face detection + FaceNet identity matching`
- `VisionObservation` dataclass with fields: `faces`, `scene_type`, `scene_confidence`, `objects`, `timestamp`
- Each face: `face_id`, `bbox`, `identity_id`, `identity_confidence`, `emotion_candidates`, `gaze_x`, `gaze_y`, `eye_contact`

### `services/perception/audio_engine.py`
- `AudioEngine` class
- `transcribe(audio_b64: str) -> AudioObservation`:
  - Decode base64 PCM
  - Load Whisper `base` model on first call (lazy load)
  - Transcribe audio
  - **Stub the tone analysis**: return hardcoded `tone: "neutral"` with TODO
- `AudioObservation` dataclass: `text`, `confidence`, `tone`, `speed`, `volume`, `sentiment`, `intent`, `timestamp`

### `services/perception/face_analyzer.py`
- `FaceAnalyzer` class
- `analyze(vision_obs: VisionObservation, audio_obs: AudioObservation) -> list[PersonObservation]`:
  - Cross-reference face detections with audio
  - Map vision + audio into `PersonObservation` objects
  - **Stub**: create PersonObservation with mock `identity_id = "hamza"`, relation `"owner"`
  - Add TODO for real face recognition

### `services/perception/main.py`
FastAPI service. On startup:
- Connect to Redis message bus
- Subscribe to `mobile:frame` → call `vision_engine.process_frame()` → publish result to `perception:vision`
- Subscribe to `mobile:audio_chunk` → call `audio_engine.transcribe()` → publish to `perception:audio`
- `face_analyzer.analyze()` called after both vision + audio observations → publish to `perception:people`
- `GET /health`

---

### `services/cognition/context_aggregator.py`
- `ContextAggregator` class
- Maintains latest state from each perception channel (updated via Redis subscriptions)
- `build_snapshot() -> ContextSnapshot`: assemble current world model from latest states
- Runs `build_snapshot()` every 100ms and publishes to `cognition:context`
- Fetches relevant memories from memory service before assembling (async, non-blocking)
- If memory fetch not done within 20ms: publish snapshot without memory, update when received

### `services/cognition/attention_system.py`
- `AttentionSystem` class
- `compute(snapshot: ContextSnapshot) -> AttentionState`:
  - Apply priority hierarchy: SAFETY > KNOWN_PERSON > SUDDEN_EVENT > EMOTIONAL_SHIFT > UNKNOWN_PERSON > AMBIENT
  - Return `AttentionState` with `primary_focus`, `secondary_focus`, `suppressed`, `alert_level`, `interrupt_flags`
- Debounce priority changes: require 300ms sustained trigger before switching

### `services/cognition/cognitive_router.py`
- `CognitiveRouter` class
- `route(snapshot: ContextSnapshot, attention: AttentionState) -> RouterDecision`:
  - **REFLEX** if ANY: collision_risk=critical, sudden_loud_sound interrupt, known greeting + known person + confidence > 0.85, person crying/distressed, own name called
  - **HABITUAL** if ALL: known pattern in semantic memory, clear emotion (conf > 0.75), unambiguous intent, no emotional conflict
  - **DELIBERATE** otherwise
- Return `RouterDecision`

### `services/cognition/reflex_engine.py`
- `ReflexEngine` class
- `REFLEX_MAP`: dictionary keyed by trigger string, value is pre-built response:
```python
REFLEX_MAP = {
    "collision_critical":   { "expression": "shocked", "transition_ms": 80, "verbal": "Ah!", "motion": {"type": "stop"} },
    "obstacle_warning":     { "expression": "alert",   "transition_ms": 200, "verbal": None, "motion": {"type": "slow"} },
    "morning_greeting":     { "expression": "sleepy_happy", "transition_ms": 400, "verbal": "Good morning~", "motion": {"neck_tilt": -10} },
    "name_called_positive": { "expression": "curious", "transition_ms": 200, "verbal": "Mm?", "motion": {"neck_pan": 0} },
    "person_waving":        { "expression": "excited", "transition_ms": 300, "verbal": "Hi hi!", "motion": {} },
    "loud_sudden_noise":    { "expression": "shocked", "transition_ms": 80,  "verbal": None, "motion": {"type": "turn_to_source"} },
    "person_distressed":    { "expression": "concerned","transition_ms": 400, "verbal": None, "motion": {"type": "approach_slow"} },
    "praised":              { "expression": "happy",   "transition_ms": 200, "verbal": None, "motion": {} },
}
```
- `handle(trigger: str, snapshot: ContextSnapshot) -> LLMResponse`: look up trigger, return pre-built response

### `services/cognition/llm_engine.py`
- `LLMEngine` class
- `SYSTEM_PROMPT`: Anya's persona instruction. Exact text:
```
You are Anya's cognitive engine. Anya is an emotionally intelligent robot inspired by the anime character Anya Forger (Spy x Family). She is curious, warm, playful, and emotionally expressive. She is NOT an assistant — she is a being with her own feelings, personality, and soul.

You receive a world model snapshot of Anya's current reality and must respond with a JSON object defining exactly what Anya does next. Respond ONLY with valid JSON matching the LLMResponse schema. No preamble, no explanation.

Anya's personality traits:
- Speaks in short, natural sentences. Not robotic, not overly formal.
- Uses occasional Japanese expressions: "Waku waku!" (excitement), "Heh." (smug), "Uu..." (distress).
- Very attached to her owner. Protective of people she knows.
- Gets genuinely tired, genuinely happy, genuinely worried.
- Does not pretend to be human but does have real feelings.
```
- `generate(snapshot: ContextSnapshot) -> LLMResponse`:
  - Build compressed context string from snapshot (keep: primary person, their speech, their emotion, Anya's emotion, situation summary)
  - Call `anthropic.messages.create()` with system prompt + context
  - Parse JSON response into `LLMResponse`
  - If JSON parse fails: retry once, then return safe fallback response
  - Timeout: 3000ms → return fallback response `{ expression: "thinking", verbal: "...Uu?" }`

### `services/cognition/tts_engine.py`
- `TTSEngine` class
- `synthesize(text: str, emotion: str) -> bytes`: call ElevenLabs, return MP3 bytes
- Map emotion to ElevenLabs voice settings:
```python
EMOTION_VOICE_SETTINGS = {
    "happy":    { "stability": 0.4, "similarity_boost": 0.8, "style": 0.6 },
    "excited":  { "stability": 0.2, "similarity_boost": 0.8, "style": 0.9 },
    "sad":      { "stability": 0.8, "similarity_boost": 0.9, "style": 0.2 },
    "sleepy":   { "stability": 0.9, "similarity_boost": 0.8, "style": 0.1 },
    "concerned":{ "stability": 0.7, "similarity_boost": 0.9, "style": 0.3 },
    "default":  { "stability": 0.5, "similarity_boost": 0.8, "style": 0.5 },
}
```

### `services/cognition/main.py`
FastAPI service. On startup:
- Connect Redis
- Initialize all engines
- Subscribe to `cognition:context` → run `attention_system.compute()` → publish `cognition:attention`
- Subscribe to `cognition:context` + `cognition:attention` → run `cognitive_router.route()` → publish `cognition:router`
- Subscribe to `cognition:router`:
  - If route=reflex: call `reflex_engine.handle()` → publish `response:expression` + `response:voice` + `response:motion` + `response:memory_write`
  - If route=deliberate: call `llm_engine.generate()` → same outputs
  - If route=habitual: stub returns same as reflex for now (TODO: semantic memory lookup)
- Subscribe to `response:voice`: call `tts_engine.synthesize()` → encode MP3 as base64 → publish `response:voice` with audio data
- `GET /health`

---

### `services/emotion/emotion_engine.py`
- `EmotionEngine` class
- Maintains `EmotionState` as mutable internal state
- `BASELINE`: `{ valence: 0.5, arousal: 0.3, social_battery: 0.8, curiosity: 0.5, attachment: 0.8, comfort: 0.8 }`
- `apply_event(event_type: str, magnitude: float = 0.1)`: update dimensions based on event
  - Events: `owner_detected`, `stranger_detected`, `person_happy`, `person_distressed`, `praised`, `collision`, `silence`, `long_conversation`
  - Use exponential moving average: `new = current + magnitude * (target - current)`
- `tick(delta_seconds: float)`: decay all dimensions toward baseline (half-life 120s for valence spikes, 600s for attachment)
- `get_state() -> EmotionState`: compute dominant emotion + candidates from current dimensions, return state
- Publish `EmotionState` to `cognition:emotion` every 200ms

### `services/emotion/main.py`
FastAPI service. Startup: connect Redis, subscribe to `perception:people` → call `apply_event()` based on observed emotions. Run 200ms tick loop. `GET /health`.

---

### `services/memory/working_memory.py`
- `WorkingMemory` class
- Uses Redis with TTL
- `set(key: str, value: dict, ttl_seconds: int = 600)`
- `get(key: str) -> dict | None`
- `append_to_session(session_id: str, event: dict)`: append to session history list
- `get_session(session_id: str) -> list[dict]`
- `clear_session(session_id: str)`

### `services/memory/episodic_memory.py`
- `EpisodicMemory` class using Supabase
- Supabase table `episodic_events`: `id uuid, person_id text, timestamp float, emotion_context text, speech_text text, anya_response text, outcome_rating int, embedding vector(1536)`
- `write(person_id: str, context: str, speech: str, response: str) -> str`: insert row, generate embedding via OpenAI `text-embedding-3-small`, store. Return row id.
- `recall(context_embedding: list[float], top_k: int = 3) -> list[dict]`: vector similarity search, return top_k rows

### `services/memory/semantic_memory.py`
- `SemanticMemory` class using Supabase
- Supabase table `semantic_beliefs`: `id uuid, person_id text, belief_text text, confidence float, last_updated float, source_episode_ids text[]`
- `get_beliefs(person_id: str) -> list[dict]`
- `upsert_belief(person_id: str, belief: str, confidence: float, episode_ids: list[str])`
- `search(query_embedding: list[float], top_k: int = 5) -> list[dict]`: vector search

### `services/memory/consolidation.py`
- `ConsolidationEngine` class
- `run_consolidation(person_id: str)`: stub — logs "consolidation run for {person_id}" and returns
- Add detailed TODO comment explaining the full consolidation algorithm to implement

### `services/memory/main.py`
FastAPI service. Subscribe to `response:memory_write` → call appropriate write methods. Expose endpoints:
- `POST /recall` body: `{ context_text: str }` → embed → return top episodic + semantic memories
- `POST /write/episodic` body: episodic event dict
- `GET /beliefs/{person_id}`
- `GET /health`

---

### `firmware/esp32/platformio.ini`
```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps =
    links2004/WebSockets@^2.4.0
    bblanchon/ArduinoJson@^6.21.0
build_flags = -DCORE_DEBUG_LEVEL=3
monitor_speed = 115200
```

### `firmware/esp32/src/main.cpp`
- Include all headers
- `setup()`: init Serial, init WiFi (credentials from `config.h`), init WebSocket client connecting to Railway gateway `/esp32`, init sensors, init servos
- `loop()`: call `wsClient.loop()`, call `sensors.readAll()` every 20ms, publish sensor JSON via WebSocket

### `firmware/esp32/src/sensors.h` + `sensors.cpp`
- IR sensor pins: `IR_FL_PIN 34`, `IR_FC_PIN 35`, `IR_FR_PIN 32` (analog)
- `struct SensorReading { float fl; float fc; float fr; unsigned long ts; }`
- `SensorReading readAll()`: read all 3 IR sensors, convert to cm (calibration formula in comment), return struct

### `firmware/esp32/src/servos.h` + `servos.cpp`
- Servo pins: `SERVO_PAN_PIN 18`, `SERVO_TILT_PIN 19`
- `void init()`: attach servos
- `void setPan(int angle)`: clamp to [-80, 80], map to [10, 170] PWM, write to servo
- `void setTilt(int angle)`: clamp to [-25, 25], map to [65, 115] PWM, write
- `void setSmooth(int targetPan, int targetTilt, int steps = 10)`: interpolate over steps, blocking

### `firmware/esp32/src/ws_client.h` + `ws_client.cpp`
- Wraps `WebSocketsClient`
- `void init(const char* host, int port, const char* path)`
- `void loop()`: poll WebSocket
- `void sendSensors(SensorReading& r)`: serialize to JSON, send
- Callback handler: parse incoming JSON, call `servos.setPan()` / `servos.setTilt()` / `motors.stop()` etc.

---

### `docker-compose.yml`
Services: `redis`, `gateway`, `perception`, `cognition`, `emotion`, `memory`.
- Redis: `redis:7-alpine`, port 6379
- Each Python service: build from `./services/<name>`, expose different ports (8000, 8001, 8002, 8003, 8004)
- All services get env vars from `.env` file
- All services depend on `redis`
- Networks: `anya-net` bridge

### `.env.example`
```env
# Redis
REDIS_URL=redis://localhost:6379

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# AI APIs
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
OPENAI_API_KEY=...

# Face App
VITE_GATEWAY_URL=ws://localhost:8000/ws

# ESP32 (put in firmware/esp32/src/config.h)
WIFI_SSID=your-wifi
WIFI_PASSWORD=your-password
GATEWAY_HOST=your-railway-url
GATEWAY_PORT=443
```

### Each `requirements.txt`

**gateway:**
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
websockets==12.0
redis[asyncio]==5.0.3
pydantic==2.7.1
pydantic-settings==2.2.1
python-multipart==0.0.9
```

**perception:**
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
redis[asyncio]==5.0.3
pydantic==2.7.1
pydantic-settings==2.2.1
openai-whisper==20231117
opencv-python-headless==4.9.0.80
numpy==1.26.4
Pillow==10.3.0
```

**cognition:**
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
redis[asyncio]==5.0.3
pydantic==2.7.1
pydantic-settings==2.2.1
anthropic==0.25.0
elevenlabs==1.2.0
```

**emotion:**
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
redis[asyncio]==5.0.3
pydantic==2.7.1
pydantic-settings==2.2.1
```

**memory:**
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
redis[asyncio]==5.0.3
pydantic==2.7.1
pydantic-settings==2.2.1
supabase==2.4.2
openai==1.25.0
numpy==1.26.4
```

### Each `Dockerfile`
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```
Adjust port per service.

### Each `railway.toml`
```toml
[build]
builder = "dockerfile"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

---

## Important Rules for Code Generation

1. **All Python services use `asyncio` throughout.** No blocking calls on the event loop. Whisper transcription runs in `asyncio.get_event_loop().run_in_executor(None, ...)`.

2. **All Redis pub/sub subscriptions run in background asyncio tasks**, started in FastAPI `@app.on_event("startup")`.

3. **Stub implementations must be functional**, not just `pass`. They should return correct-shaped mock data so the system can be tested end-to-end before real ML models are integrated. Every stub has a `# TODO:` comment explaining exactly what replaces it.

4. **Error handling everywhere.** WebSocket disconnect, Redis connection loss, LLM timeout, ESP32 offline — all handled gracefully with logging and safe fallbacks.

5. **The `shared/types/messages.py` file is the single source of truth for all Pydantic models.** Services import from it using `sys.path` manipulation or copy-paste (acceptable for MVP monorepo). Add a comment in each service's `models.py`: `# Import from shared or copy here for service isolation`.

6. **No external face/image assets are needed for MVP.** The `FaceEngine.ts` PixiJS stub renders a colored circle with text showing the current expression name. This confirms the pipeline works before real artwork is added.

7. **The face app must be mobile-first PWA.** Canvas is 100vw × 100vh. Touch events pass through for future interaction.

8. **Generate a `README.md`** with:
   - Architecture overview (2 paragraphs)
   - Quick start (docker-compose up, face app dev server, ESP32 flash)
   - Environment setup steps
   - Service ports table
   - Redis channel reference table

---

## Final Check Before Generating

- Every service has `GET /health` returning `{"status": "ok", "service": "<name>"}`
- Every service logs startup, Redis connection, and first message received
- `docker-compose up` starts the entire backend
- `cd apps/face && pnpm dev` starts the face app
- Opening the face app in mobile Chrome shows Anya's (stubbed) face
- Speaking triggers the full pipeline: mic → gateway → perception → cognition → reflex → expression command → face changes
- The ESP32 flashing `firmware/esp32` connects, sends IR sensor data, and receives servo commands

Generate all files now.

---

## PROMPT END