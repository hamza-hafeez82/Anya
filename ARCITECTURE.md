# Anya — Complete System Architecture
### The Perception → Cognition → Expression Loop

**Version:** 0.1 — Pre-Implementation Design  
**Author:** Hamza Hafeez  
**Status:** Architecture Definition

---

## 0. Before Everything: The Mental Model

Anya is not a chatbot with a robot body. She is a **cognitive organism** with independent sensory organs, an emotional core, and a body. Each organ runs continuously, publishes its observations to a shared nervous system, and the sum of all organs is Anya's awareness.

The single most important rule:

> **Anya never pauses perception to generate a response. She is always alive.**

---

## 1. Physical Hardware Map

```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE PHONE                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │  Camera  │  │   Mic    │  │   Screen (Face)      │   │
│  │ (Vision) │  │ (Audio)  │  │   PixiJS + Live2D    │   │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘   │
│       └─────────────┴───────────────────┘               │
│                  One WebSocket Client                   │
└───────────────────────┬─────────────────────────────────┘
                        │
                     Internet
                        │
┌───────────────────────▼─────────────────────────────────┐
│                   RAILWAY SERVER                        │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐   │
│  │     NATS     │  │  Cognitive  │  │    Memory     │   │
│  │  (Msg Bus)   │  │   Engine    │  │  (Supabase)   │   │
│  └──────────────┘  └─────────────┘  └───────────────┘   │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐   │
│  │   Vision     │  │    Audio    │  │      TTS      │   │
│  │  Processing  │  │  (Whisper)  │  │  (ElevenLabs) │   │
│  └──────────────┘  └─────────────┘  └───────────────┘   │
└───────────────────────┬─────────────────────────────────┘
                        │
                     Internet
                        │
┌───────────────────────▼─────────────────────────────────┐
│                       ESP32                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐   │
│  │  IR x3   │  │ Servo x2 │  │ Motor x2 │  │  WS    │   │
│  │(Obstacle)│  │  (Neck)  │  │ (Wheels) │  │Client  │   │ 
│  └──────────┘  └──────────┘  └──────────┘  └────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Key principle:** Mobile is a capture + display terminal. Railway is the brain. ESP32 is the body controller. All three connect over the same WiFi network.

---

## 2. Software Topology

```
                        NATS Message Bus (Railway)
                               │
   ┌───────────┬───────────┬───┴───────┬───────────┬──────────┐
   │           │           │           │           │          │
Vision      Audio       Sensor     Memory      Emotion        │
Engine     Engine       Engine     Engine      Engine         │
   │           │           │           │           │          │
   └───────────┴───────────┴───────────┴───────────┘          │
                              │                               │
                     Context Aggregator  ◄────────────────────┘
                     (builds world model                
                      from all organ outputs)
                              │
                      Cognitive Router
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
      Reflex              Habitual            Deliberate
      Engine               Engine            (LLM Engine)
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
      Expression Engine               Motion Engine
      (PixiJS + Live2D face + TTS)    (ESP32 Commands)
```

### NATS Topic Map

```
perception/vision          → raw vision observations
perception/audio           → speech, tone, ambient
perception/sensors         → IR distances, orientation
perception/people          → face ID, emotion, pose (processed)
perception/scene           → environment type, objects, atmosphere

cognition/context          → full world model snapshot (10Hz)
cognition/attention        → current attention weights
cognition/emotion          → Anya's current emotional state
cognition/memory/recall    → retrieved memories
cognition/router           → routed response path

response/expression        → face parameters { eye_open, smile... }
response/voice             → TTS command + audio stream
response/motion            → servo + motor commands
response/memory/write      → memory write commands
```

---

## 3. The Organs

---

### ORGAN 1 — Vision Engine

**Purpose:** Continuously understand what Anya sees — people, environment, objects, depth, and spatial context — at two speeds: fast and continuous for people, deep and periodic for the world around her.

**Runs on:** Hybrid — MediaPipe JS on mobile browser (people layer), Railway Python service (environment layer).

---

## Inputs
- Mobile camera frames via WebRTC `getUserMedia`, ~15-30fps on-device
- Frames sent to server: full JPEG on scene change, `frame_skip` signal otherwise

---

## Processing Pipeline

```
Camera Frame (~15-30fps on-device)
     │
     ├── [TIER 1 — Mobile Browser, MediaPipe JS, every frame]
     │   │   People layer. Fast. Continuous. Never stops.
     │   │
     │   ├── Blur Check (Laplacian variance, runs first)
     │   │     → if variance < 100: discard entire frame
     │   │     → flag: vision_degraded
     │   │     → do NOT run any further processing on this frame
     │   │     → if 5 consecutive blurry frames: flag vision_critically_degraded
     │   │                                        → notify attention system
     │   │
     │   ├── Face Detection + 468-landmark mesh
     │   │     → if no face: publish people: []
     │   │     →             flag: no_face_detected
     │   │     →             trigger: attention system look-around behavior
     │   │
     │   ├── Face Tracking (IoU bbox matching across frames)
     │   │     → maintains persistent face_id per detected face within session
     │   │     → prevents identity flicker when person moves
     │   │     → if tracked face disappears for >1s: invalidate face_id
     │   │     →                                      flag: face_lost
     │   │
     │   ├── Face center position (x, y normalized 0-1)
     │   │     → publish directly to perception:vision every frame
     │   │     → Motion Engine picks this up for neck tracking
     │   │     → bypasses full cognition pipeline entirely
     │   │
     │   ├── Eye Gaze Direction
     │   │     → left / right / center / up / down / averted
     │   │     → eye_contact: bool (both eyes facing camera within threshold)
     │   │
     │   ├── Body Pose (MediaPipe Pose)
     │   │     → sitting / standing / walking / waving / arms_crossed
     │   │     →  crouching / pointing / lying_down
     │   │     → if pose confidence < 0.5: publish pose: unknown
     │   │     → NOTE: covers Activity Recognition for MVP
     │   │     →       separate activity model is Phase 2
     │   │
     │   ├── Emotion from Face Landmarks (7 Ekman states)
     │   │     → happy / sad / angry / surprised / fearful / disgusted / neutral
     │   │     → publish as candidates with confidence scores (never single label)
     │   │     → minimum confidence threshold: 0.6 to include in candidates
     │   │     → if all candidates < 0.6: publish emotion: [{ neutral, 1.0 }]
     │   │     → if low light flagged: reduce all confidence scores by 0.2
     │   │     → Training data: EmotioNet, AffectNet, FER2013
     │   │
     │   ├── Face Crop (128x128 JPEG)
     │   │     → send to server on: new face_id detected
     │   │     →                    re-verify every 30s per tracked face
     │   │     →                    identity confidence drops below 0.7
     │   │     → do NOT send every frame
     │   │
     │   └── Scene Change Detection (runs in parallel, every frame)
     │         → compute frame delta vs last server-sent frame
     │         → if delta > threshold: trigger immediate Tier 2 send
     │         → if delta < threshold: send frame_skip signal { type: "frame_skip", ts }
     │         →                       server receives signal, skips processing cycle
     │         → delta threshold factors: pixel diff, histogram shift, object motion
     │
     │
     └── [TIER 2 — Railway Python, triggered every 2s OR on scene change]
         │   Environment + spatial layer. Deep. Periodic.
         │   All steps run in parallel as async tasks.
         │   Depth estimation is lowest priority — dropped first under load.
         │
         ├── Face Identity (FaceNet / DeepFace)
         │     → receives 128x128 face crop from mobile
         │     → generate 512-dim embedding
         │     → vector match against Supabase face embeddings
         │     → return: identity_id, confidence, relation (owner/friend/stranger)
         │     → if no match (confidence < 0.6): identity: unknown
         │     →                                  flag: stranger_detected
         │     →                                  trigger: curiosity behavior
         │     → if match found: cache identity for session, re-verify every 30s
         │     FALLBACK: if Supabase unreachable → use last known identity from
         │               working memory, flag: identity_from_cache
         │
         ├── Scene Classification (CLIP)
         │     → indoor/outdoor, room type, location context
         │     → semantic tags: private_space / crowded / workplace /
         │                      public_space / safe / unfamiliar
         │     → confidence threshold: 0.65 minimum
         │     → if confidence < 0.65: retain last known scene, flag: scene_uncertain
         │     FALLBACK: if CLIP fails → publish last known scene with
         │               stale: true, age_ms: <ms since last good reading>
         │
         ├── Object Detection (YOLOv8-nano)
         │     → detect all objects, return: class, bbox, estimated distance,
         │                                    importance_score (0-1)
         │     → importance scoring:
         │           HIGH (0.8-1.0): people, animals, food, screens, doors
         │           MED  (0.4-0.7): furniture, bags, bottles, tools
         │           LOW  (0-0.3):   background objects, decor
         │     → only publish objects with importance > 0.3 (skip low-importance clutter)
         │     → distance estimation: use bounding box height ratio + known object sizes
         │     FALLBACK: if YOLOv8 fails or times out → publish objects: []
         │               flag: object_detection_unavailable
         │               IR sensors carry spatial awareness in this state
         │
         ├── People Count + Group Dynamics
         │     → total people in scene (beyond primary tracked face)
         │     → group dynamics: alone / pair / small_group / crowd
         │     → are background people interacting with each other?
         │     → is Anya the focus of attention or being ignored?
         │     FALLBACK: if detection fails → people_count: unknown
         │               flag: group_dynamics_unavailable
         │
         ├── Atmosphere Analysis
         │     → lighting: bright / dim / dark / warm_light / cool_light
         │     → movement_level: still / low / high
         │     → crowding: alone / small_group / crowded
         │     → emotional_tone: calm / tense / celebratory / chaotic
         │     → if lighting = dark: flag low_light_environment
         │     →                     reduce Tier 1 emotion confidence by 0.2
         │     →                     increase IR sensor weight in spatial awareness
         │     FALLBACK: if analysis fails → retain last known atmosphere
         │               flag: atmosphere_stale
         │
         └── Depth Estimation (MiDaS v2.1 small — LOWEST PRIORITY)
               → monocular depth map from single camera frame
               → estimate distances to detected objects
               → feeds spatial_awareness alongside IR sensors
               → target: <400ms on Railway CPU
               → if server queue backed up: DROP this step first
               →   flag: depth_estimation_skipped
               →   IR sensors + YOLOv8 bbox estimation carry spatial awareness
               → if 3 consecutive skips: flag depth_estimation_degraded
               →   log for performance monitoring
               FALLBACK: publish depth_map: null
                         spatial awareness falls back entirely to IR sensors
```

---

## Emotion States

| State     | Description                                          | Training Data                 |
|-----------|------------------------------------------------------|-------------------------------|
| Happy     | Positive affect, smiling, raised cheeks              | EmotioNet, AffectNet, FER2013 |
| Sad       | Negative affect, downturned mouth, drooping eyes     | EmotioNet, AffectNet, FER2013 |
| Angry     | Furrowed brows, tense jaw, narrowed eyes             | EmotioNet, AffectNet, FER2013 |
| Surprised | Raised brows, wide eyes, open mouth                  | EmotioNet, AffectNet, FER2013 |
| Fearful   | Dilated pupils, raised/drawn brows, gaze averted     | EmotioNet, AffectNet, FER2013 |
| Disgusted | Nose wrinkled, upper lip raised, brows lowered       | EmotioNet, AffectNet, FER2013 |
| Neutral   | Relaxed, no strong expression                        | EmotioNet, AffectNet, FER2013 |

Always published as candidates, never as a single label:
```json
{
  "emotion_candidates": [
    { "emotion": "happy",   "confidence": 0.82 },
    { "emotion": "excited", "confidence": 0.44 }
  ]
}
```

---

## Flags Reference

| Flag                          | Meaning                                | System Response                                |
|-------------------------------|----------------------------------------|------------------------------------------------|
| `vision_degraded`             | Single blurry frame discarded          | Skip frame silently                            |
| `vision_critically_degraded`  | 5+ consecutive blurry frames           | Notify attention system, trigger look-around   |
| `no_face_detected`            | No face in frame                       | Attention system initiates look-around behavior|
| `face_lost`                   | Tracked face disappeared >1s           | Invalidate cached identity, reset tracking     |
| `stranger_detected`           | Face not matched in memory             | Trigger curiosity behavior                     |
| `identity_from_cache`         | Supabase unreachable, using last known | Reduce identity confidence by 0.15             |
| `scene_uncertain`             | CLIP confidence < 0.65                 | Retain last known scene                        |
| `object_detection_unavailable`| YOLOv8 failed or timed out             | IR sensors carry spatial awareness             |
| `low_light_environment`       | Lighting = dark                        | Reduce emotion confidence, increase IR weight  |
| `depth_estimation_skipped`    | Server queue backed up                 | IR sensors + bbox estimation carry spatial     |
| `depth_estimation_degraded`   | 3+ consecutive skips                   | Log for monitoring, no behavior change         |
| `atmosphere_stale`            | Atmosphere analysis failed             | Retain last known atmosphere                   |
| `frame_skip`                  | No scene change detected               | Server skips processing cycle entirely         |

---

## Outputs

| Channel               | Content                                                                 | Cadence               |
|-----------------------|-------------------------------------------------------------------------|-----------------------|
| `perception:vision`   | Face positions, on-device emotions, gaze, pose, face_id                 | 15-30fps              |
| `perception:people`   | Identity matches, relation, server-side analysis                        | Event-driven          |
| `perception:scene`    | Environment, objects, atmosphere, depth                                 | Every 2s or on change |

---

## Performance Targets

| Step                           | Target             | Where  |
|--------------------------------|--------------------|--------|
| Blur check                     | <5ms               | Mobile |
| Face mesh + emotion            | <30ms              | Mobile |
| Face crop send + identity match| <200ms             | Server |
| Scene classification (CLIP)    | <300ms             | Server |
| Object detection (YOLOv8-nano) | <250ms             | Server |
| Atmosphere analysis            | <100ms             | Server |
| Depth estimation (MiDaS)       | <400ms             | Server |
| Full Tier 2 pipeline (parallel)| <500ms total       | Server |

All Tier 2 steps run as parallel async tasks. Total time = slowest step, not sum of all steps.

---

## Resource + Compute Constraints

- **Mobile battery:** throttle Tier 1 to 10fps when battery < 30%
- **Mobile battery critical:** pause Tier 2 sends entirely when battery < 15%, IR sensors carry spatial awareness
- **Server queue pressure:** drop steps in this order — depth estimation → atmosphere → object detection. Never drop face identity or scene classification.
- **Bandwidth:** send full JPEG only on scene change. Send `frame_skip` signal otherwise. Face crops sent separately, not bundled with scene frames.
- **Privacy:** raw images never stored. Face embeddings encrypted at rest in Supabase. Face crops discarded after embedding generation.
- **Tier 2 timeout:** if any server step exceeds 600ms, cancel it, publish fallback, move on. Never block Tier 1.

---

## Fallback Hierarchy (Spatial Awareness Degradation)

```
Full system (all sensors working)
  └── Depth map (MiDaS) + IR sensors + YOLOv8 distances

Depth estimation skipped
  └── IR sensors + YOLOv8 bbox distance estimation

Object detection also unavailable
  └── IR sensors only (always available, hardware-level)

IR sensors offline (ESP32 disconnected)
  └── YOLOv8 bbox distance estimation + depth map
  └── flag: hardware_sensors_offline
  └── movement disabled until IR sensors restored

All spatial systems down
  └── movement fully disabled
  └── flag: spatial_awareness_critical
  └── Anya stays still until at least one spatial system recovers
```
---

### ORGAN 2 — Audio Engine

**Purpose:** Understand everything Anya hears — speech, tone, ambient environment, non-verbal sounds, and silence. Her ears never stop. Even when she is speaking, she is listening.

**Runs on:** Hybrid — Mobile (capture, wake word, VAD, self-suppression), Railway Python (deep processing).

---

## Inputs
- External mic via Bluetooth or USB-C to mobile (preferred)
- Mobile built-in mic (fallback if external unavailable)
- Continuous audio stream, always open

---

## Processing Pipeline

```
Microphone Input (continuous, always open)
        │
        ├── [TIER 1 — Mobile, always running, never stops]
        │   │   Raw audio layer. Instant. Hardware-level awareness.
        │   │
        │   ├── Mic Quality Check (runs first, every 500ms)
        │   │     → check input level, SNR estimate
        │   │     → if mic disconnected: flag mic_offline
        │   │     →                      switch to built-in mic automatically
        │   │     →                      flag mic_fallback_active
        │   │     → if SNR critically low: flag audio_quality_degraded
        │   │     →                         reduce all confidence scores by 0.2
        │   │
        │   ├── Self-Suppression Gate (always active)
        │   │     → mobile knows when TTS is playing
        │   │     → mute audio input during TTS playback + 300ms after
        │   │     → prevents Anya hearing her own voice as input
        │   │     → if TTS cut short (interrupted): immediately reopen mic
        │   │     → flag: self_suppression_active during mute window
        │   │
        │   ├── Ambient Noise Monitoring (continuous, 100ms windows)
        │   │     → measure dB level continuously
        │   │     → classify: silent / quiet / moderate / loud / very_loud
        │   │     → maintain rolling 5s noise floor baseline
        │   │     → publish ambient level to perception:audio every 1s
        │   │
        │   ├── Sudden Loud Sound Detection
        │   │     → if instantaneous dB > baseline + 20dB: immediate alert
        │   │     → publish interrupt to cognition:attention immediately
        │   │     → flag: sudden_sound_detected
        │   │     → do NOT wait for speech segment — fires instantly
        │   │     → include: direction estimate if stereo mic available
        │   │
        │   ├── Wake Word Detection (Porcupine SDK — "Hey Anya")
        │   │     → always listening, on-device, <100ms latency
        │   │     → on detection: flag wake_word_detected
        │   │     →               boost attention priority immediately
        │   │     →               open full speech capture pipeline
        │   │     → sensitivity: 0.7 (balance false positive vs miss rate)
        │   │     FALLBACK: if Porcupine fails to init →
        │   │               fall back to keyword spotting via VAD + partial match
        │   │               flag: wake_word_degraded
        │   │
        │   ├── Voice Activity Detection (WebRTC VAD)
        │   │     → 3 aggressiveness modes: 0 (permissive) → 3 (strict)
        │   │     → default mode 2, switch to mode 3 in loud environments
        │   │     → speech start: begin buffering audio immediately
        │   │     → speech end: 300ms silence = segment complete → send to Tier 2
        │   │     → hard cap: 10s max buffer → force segment close, send as-is
        │   │     →           flag: speech_segment_truncated
        │   │     → very short segment (<200ms): likely non-speech sound
        │   │     →   route to non-speech detector, not Whisper
        │   │
        │   └── Non-Speech Sound Detector (on short segments + ambient)
        │         → detect: crying / laughing / coughing / sighing /
        │                   yawning / clapping / footsteps / door_slam /
        │                   glass_break / alarm / animal
        │         → if detected: publish as behavioral_event to perception:audio
        │         → confidence threshold: 0.65
        │         → these are NOT sent to Whisper — separate path entirely
        │         FALLBACK: if classifier unavailable →
        │                   publish sound_type: unknown_non_speech
        │                   flag: non_speech_classifier_unavailable
        │
        │
        └── [TIER 2 — Railway Python, on speech segment received]
            │   Deep audio understanding. Runs once per speech segment.
            │   All steps run in parallel after transcription completes.
            │
            ├── Audio Quality Gate (runs first)
            │     → check received audio: duration, sample rate, clipping
            │     → if duration < 200ms: likely noise, discard
            │     →                      flag: segment_too_short_discarded
            │     → if heavily clipped (>20% samples at max): flag audio_clipped
            │     →                                            reduce confidence 0.15
            │     → if SNR < threshold: flag poor_audio_quality
            │     →                     Anya requests clarification instead of guessing
            │
            ├── Source Separation (runs before transcription if noise detected)
            │     → only runs if ambient_level = loud or very_loud
            │     → separate foreground speech from background noise / music / TV
            │     → lightweight frequency-domain separation (not full Demucs for MVP)
            │     → if separation confidence < 0.6: process mixed audio anyway
            │     →                                  flag: audio_mixed_source
            │     →                                  reduce transcription confidence
            │     FALLBACK: if source separation fails →
            │               skip it, send raw audio to Whisper
            │               flag: source_separation_skipped
            │
            ├── Speech-to-Text (Whisper base)
            │     → transcribe speech segment
            │     → returns: text, language, word-level timestamps, confidence
            │     → minimum confidence: 0.6 to publish transcription
            │     → if confidence < 0.6: flag low_transcription_confidence
            │     →                      publish partial: true
            │     →                      Anya asks for clarification
            │     → language detection: if not expected language →
            │     →                      flag: unexpected_language
            │     →                      still attempt transcription
            │     → target: <400ms after segment received
            │     FALLBACK: if Whisper times out (>800ms) →
            │               publish transcription: null
            │               flag: transcription_timeout
            │               Anya uses visual context only for this moment
            │               retry on next segment
            │
            ├── Speaker Diarization (runs in parallel with tone analysis)
            │     → only runs if people_count > 1 (from Vision Engine)
            │     → attribute speech to speaker ID
            │     → cross-reference with Vision Engine face tracking IDs
            │     → match speaker voice to known voice embeddings in memory
            │     → if single person detected by vision: skip diarization entirely
            │     →   saves compute, flag: diarization_skipped_single_speaker
            │     FALLBACK: if diarization fails →
            │               attribute speech to primary face in frame
            │               flag: speaker_attribution_assumed
            │
            ├── Tone Analysis (runs in parallel, on raw audio)
            │     → pitch: high / medium / low / very_low
            │     → speed: very_slow / slow / normal / fast / very_fast
            │     → volume: whisper / soft / normal / raised / loud
            │     → tremor: none / slight / moderate / strong (stress indicator)
            │     → breathiness: normal / breathy (exhaustion / illness indicator)
            │     → voice_energy: flat / normal / energetic / urgent
            │     → publish as tone_profile regardless of transcription result
            │     →   (tone is valuable even if words unclear)
            │     FALLBACK: if tone analysis fails →
            │               publish tone: neutral, all fields: unknown
            │               flag: tone_analysis_unavailable
            │
            ├── Sentiment Analysis (runs after transcription)
            │     → positive / negative / neutral / mixed
            │     → confidence score
            │     → if transcription confidence < 0.6: weight tone more than text
            │     → combines: text sentiment + tone profile for final score
            │     → example: words positive + tone flat = mixed / masking
            │
            ├── Intent Classification
            │     → greeting / farewell / question / command / complaint /
            │        praise / conversation / request_help / expressing_emotion /
            │        telling_story / giving_information / interruption
            │     → confidence threshold: 0.65
            │     → if below threshold: intent: ambiguous
            │     →                     route to deliberate (LLM) path
            │     → multi-intent: allow two intents if both > 0.5
            │     →   e.g. greeting + question: "Hey Anya, what time is it?"
            │
            ├── Emotional Undertone (runs after tone + sentiment)
            │     → happy / frustrated / tired / excited / anxious /
            │        sad / affectionate / distressed / bored / surprised
            │     → derived from: tone profile + sentiment + word choice
            │     → published as candidates with confidence (same as vision emotions)
            │     → minimum confidence: 0.55 (lower than vision — audio is subtler)
            │     → cross-referenced with Vision Engine emotion output:
            │     →   if audio emotion ≠ vision emotion: flag emotional_conflict
            │     →                                       route to deliberate path
            │
            └── Silence Interpreter (runs when no speech segment for >15s)
                  → not just absence of sound — meaningful signal
                  → 15s silence: flag silence_short → Anya becomes more attentive
                  → 30s silence: flag silence_medium → trigger idle/curiosity behavior
                  → 60s silence: flag silence_long → social_battery recharging
                  → 120s+ silence: flag silence_extended → Anya enters low-power
                  →                                         attention mode
                  → if silence after distress signal: flag post_distress_silence
                  →   Anya stays alert, does not enter idle
```

---

## Tone Profile

```
| Dimension     | Values                                      | Signal                              |
|---------------|---------------------------------------------|-------------------------------------|
| Pitch         | very_low / low / medium / high / very_high  | Excitement ↑ with pitch             |
| Speed         | very_slow / slow / normal / fast / very_fast| Anxiety / excitement ↑ with speed   |
| Volume        | whisper / soft / normal / raised / loud     | Intimacy or aggression              |
| Tremor        | none / slight / moderate / strong           | Stress, fear, illness               |
| Breathiness   | normal / breathy                            | Exhaustion, illness, intimacy       |
| Voice energy  | flat / normal / energetic / urgent          | Engagement level                    |
```

## Emotional Undertone States

Always published as candidates, never single label:
```json
{
  "emotional_undertone_candidates": [
    { "emotion": "tired",     "confidence": 0.71 },
    { "emotion": "happy",     "confidence": 0.58 },
    { "emotion": "affectionate", "confidence": 0.44 }
  ]
}
```

---

## Flags Reference


```
| Flag                                | Meaning                                       | System Response                        |
|-------------------------------------|-----------------------------------------------|----------------------------------------|
| `mic_offline`                       | External mic disconnected                     | Auto-switch to built-in mic            |
| `mic_fallback_active`               | Using built-in mic instead of external        | Reduce audio confidence by 0.1         |
| `audio_quality_degraded`            | SNR critically low                            | Reduce all confidence scores by 0.2    |
| `self_suppression_active`           | Muted during TTS playback                     | Ignore all audio input                 |
| `sudden_sound_detected`             | dB spike > baseline + 20dB                    | Immediate attention interrupt          |
| `wake_word_detected`                | "Hey Anya" heard                              | Boost attention, open speech pipeline  |
| `wake_word_degraded`                | Porcupine failed to init                      | Fallback keyword spotting active       |
| `speech_segment_truncated`          | 10s buffer hit                                | Force-send, flag for LLM awareness     |
| `non_speech_classifier_unavailable` | Classifier offline                            | Publish unknown_non_speech             |
| `segment_too_short_discarded`       | <200ms segment received                       | Discard silently                       |
| `audio_clipped`                     | >20% samples at max                           | Reduce confidence by 0.15              |
| `poor_audio_quality`                | SNR below threshold                           | Anya requests clarification            |
| `audio_mixed_source`                | Background noise not cleanable                | Reduce transcription confidence        |
| `source_separation_skipped`         | Separation failed                             | Raw audio sent to Whisper              |
| `low_transcription_confidence`      | Whisper confidence < 0.6                      | Publish partial, request clarification |
| `unexpected_language`               | Non-expected language detected                | Attempt transcription anyway           |
| `transcription_timeout`             | Whisper >800ms                                | Visual context only, retry next segment|
| `diarization_skipped_single_speaker`| Only one person visible                       | Compute saved, no action needed        |
| `speaker_attribution_assumed`       | Diarization failed                            | Attribute to primary face              |
| `tone_analysis_unavailable`         | Tone analysis failed                          | Publish neutral tone                   |
| `emotional_conflict`                | Audio emotion ≠ vision emotion                | Route to deliberate (LLM) path         |
| `silence_short`                     | 15s no speech                                 | Anya becomes more attentive            |
| `silence_medium`                    | 30s no speech                                 | Trigger idle/curiosity behavior        |
| `silence_long`                      | 60s no speech                                 | Social battery recharging              |
| `silence_extended`                  | 120s+ no speech                               | Low-power attention mode               |
| `post_distress_silence`             | Silence after distress signal                 | Stay alert, do not idle                |

```

## Outputs

```
| Channel              | Content                                                                    | Cadence                  |
|----------------------|----------------------------------------------------------------------------|--------------------------|
| `perception:audio`   | Transcription, tone, sentiment, intent, emotional undertone, ambient level | Per speech segment       |
| `perception:audio`   | Behavioral events (crying, laughing, coughing etc.)                        | Event-driven             |
| `perception:audio`   | Ambient noise level                                                        | Every 1s                 |
| `cognition:attention`| Sudden sound interrupt                                                     | Immediate, event-driven  |
```

---

## Performance Targets
```
| Step                            | Target                  | Where                |
|---------------------------------|-------------------------|----------------------|
| Mic quality check               | <5ms                    | Mobile               |
| Wake word detection             | <100ms                  | Mobile               |
| VAD speech detection            | <50ms                   | Mobile               |
| Sudden sound alert              | <30ms                   | Mobile               |
| Audio quality gate              | <20ms                   | Server               |
| Source separation               | <150ms                  | Server               |
| Whisper transcription           | <400ms after segment end| Server               |
| Tone analysis                   | <150ms (parallel)       | Server               |
| Sentiment + intent + undertone  | <100ms (parallel, after transcription) Server|
| Full Tier 2 pipeline            | <500ms total            | Server               |
```
---

## Resource + Compute Constraints

- **Whisper base on CPU:** acceptable at <400ms per segment. If Railway CPU load > 80%: queue segments, process in order. Never drop a speech segment — queue max 3, discard oldest if queue exceeds 3.
- **Source separation:** only runs when ambient_level = loud or very_loud. Silent/quiet environments skip it entirely. Saves significant compute in normal conditions.
- **Diarization:** only runs when Vision Engine reports people_count > 1. Single-person scenes skip it entirely.
- **Silence interpreter:** runs on mobile, zero server compute.
- **Audio buffer:** max 10s before forced segment close. Prevents memory buildup on Railway.
- **Mobile battery <30%:** disable wake word hot-loop polling, switch to push-to-talk mode. Flag: low_battery_audio_mode.
- **Mobile battery <15%:** pause all Tier 2 sends. Audio reduced to ambient monitoring + sudden sound detection only. Flag: critical_battery_audio_mode.

---

## Fallback Hierarchy (Audio Degradation)

```
Full system (all audio working)
  └── External mic + Whisper + tone + sentiment + intent + undertone

External mic disconnected
  └── Built-in mic (auto-switch)
  └── Reduce all confidence by 0.1

Whisper timeout / unavailable
  └── Visual context only (Vision Engine carries the moment)
  └── Anya shows attentive expression, does not respond verbally
  └── Retry on next segment

Source separation unavailable
  └── Raw audio sent directly to Whisper
  └── Reduce transcription confidence in loud environments

Tone analysis unavailable
  └── Weight text sentiment only
  └── Flag tone as neutral

All server audio processing down
  └── On-device VAD + wake word still active
  └── Anya hears that someone is speaking but cannot understand words
  └── Anya shows listening expression, requests patience
  └── flag: audio_processing_offline
  └── retry connection every 10s

Full audio failure (mic + server both down)
  └── Vision Engine carries all perception
  └── Anya operates in visual-only mode
  └── flag: audio_critically_offline
  └── Anya does not pretend she can hear
```
---

### ORGAN 3 — Sensor Engine

**Purpose:** Give Anya proprioception and spatial awareness. Her spinal reflexes live here.

**Runs on:** ESP32 (data collection) + Railway (aggregation + safety logic)

**Hardware:**
- 3x IR sensors: front-left (45° left), front-center (straight), front-right (45° right)
- MG996R servo 1: neck pan (left-right, -90° to +90°)
- MG996R servo 2: neck tilt (up-down, -30° to +30°)
- 2x gear motors with encoders (if available) for movement feedback

**Data Collection (ESP32 — 50Hz):**

```
IR Sensors → read distance (cm) every 20ms
           → publish to Railway WebSocket:
             { "fl": 42, "fc": 18, "fr": 67, "ts": 1746742800123 }

Motor State → current direction, speed estimate
Servo State → current pan angle, tilt angle
```

**Processing (Railway):**

```
Sensor Stream
      │
      ├── Collision Risk Calculator
      │       < 15cm → CRITICAL (immediate stop + reflex)
      │       15-30cm → WARNING (slow down, alert motion engine)
      │       > 30cm → CLEAR
      │
      ├── Spatial Map Builder
      │       triangulate free space from 3 sensor readings
      │       estimate passable corridor width
      │
      └── Movement Safety Gate
              block any motion command that would cause collision
              override motor commands if sensors contradict
```

**Outputs published to:**
- `perception/sensors` — distance readings, collision risk level, free space estimate
- CRITICAL collision → immediate publish to `cognition/attention` as priority interrupt

**Edge Cases:**
- **ESP32 disconnects:** last known sensor state held for 2 seconds, then flag `sensors_offline`, halt all movement as safety default
- **IR false readings (glass, mirrors):** consecutive anomalous readings filtered with median filter (keep last 5 readings)
- **Sensor blocked by Anya's own arm/accessory:** calibrate at startup, establish baseline per sensor, detect self-occlusion
- **Fast approaching object:** rate-of-change on distance triggers earlier warning than threshold alone
- **All sensors clear but floor drop (table edge):** IR sensors face forward, not downward — movement must be conservative on new terrain (future: downward sensor)
- **Servo overload:** MG996R stall detection via current draw if ESP32 ADC available. If stall → stop servo, publish `neck_blocked` event

**Constraints:**
- ESP32 ↔ Railway WebSocket: WiFi only, same network required
- Servo update rate: max 50Hz (MG996R spec), 20Hz in practice is smooth enough
- Motor control: PWM via ESP32 L298N or L293D motor driver

---

### ORGAN 4 — Attention System

**Purpose:** Anya cannot process everything with equal weight. This organ decides what matters right now and suppresses what doesn't.

**Runs on:** Railway (subscribes to all perception topics)

**Attention Priority Stack (hardcoded hierarchy):**

```
Priority 1 — SAFETY
  trigger: collision_risk = CRITICAL
  action: override everything, halt movement, scared expression

Priority 2 — PERSON (known)
  trigger: known person detected with attention_on_anya > 0.7
  action: face tracking, full engagement mode

Priority 3 — SUDDEN EVENT
  trigger: loud sound spike OR fast movement in frame
  action: interrupt current behavior, reorient toward event

Priority 4 — EMOTIONAL SHIFT
  trigger: person's emotion changes significantly (delta > 0.3)
  action: update engagement, recalculate response strategy

Priority 5 — PERSON (unknown)
  trigger: unknown face detected
  action: curiosity mode, gentle approach behavior

Priority 6 — AMBIENT MONITORING
  trigger: everything else
  action: passive processing, normal operation
```

**Outputs:**

```json
{
  "attention": {
    "primary_focus": "hamza_face",
    "primary_reason": "known_person_engaging",
    "secondary_focus": "voice_analysis",
    "suppressed": ["background_hum", "distant_objects"],
    "alert_level": "normal",
    "interrupt_flags": []
  }
}
```

Published to: `cognition/attention` at 10Hz and on any priority change.

**Edge Cases:**
- **Two competing Priority 2 events simultaneously:** rank by familiarity score, default to owner
- **Attention whiplash (rapid priority changes):** debounce — priority change requires sustained trigger for 300ms before switching
- **No person detected, no events:** Anya enters idle mode with low-energy attention scan

---

### ORGAN 5 — Context Aggregator

**Purpose:** Every 100ms, combine all perception data into a single coherent world model snapshot. This is Anya's complete picture of reality at a moment in time.

**Runs on:** Railway

**Inputs:** Subscribes to all `perception/*` topics and `cognition/attention`

**Process:**

```
Every 100ms:
  1. Collect latest state from each perception organ
  2. Apply attention weights (suppress low-priority data)
  3. Retrieve relevant memories (async, from Memory Engine)
  4. Build context snapshot JSON
  5. Compute meta_cognition summary
  6. Publish to cognition/context
```

**The Context Snapshot (the full world model):**

This is the exact schema defined in the project vision — environment, people, self, meta_cognition — with probabilistic emotion candidates, attention data, and memory recall. This is what gets passed to the Cognitive Router and eventually (if needed) to the LLM.

**Performance:**
- Target: <10ms to assemble (data is already in memory from subscriptions)
- Memory retrieval is async — context published without memory first, then updated when memory responds (<50ms typical)

**Edge Cases:**
- **Stale data from a slow organ:** each organ's data has a timestamp. If >500ms old, mark as `stale: true` and reduce confidence
- **Conflicting data:** vision says person is happy, audio tone says stressed → publish both, flag `emotional_conflict: true`, increase deliberate routing probability
- **Context too large for LLM prompt:** trim to essentials. Keep: primary person, current emotion, speech text, self state, meta summary. Drop: object list, secondary people, raw sensor values

---

### ORGAN 6 — Memory Engine

**Purpose:** Anya's ability to remember, recognize patterns, and grow over time.

**Runs on:** Railway + Supabase

**Three memory tiers:**

#### Working Memory (Redis on Railway)
- Current interaction state only
- What was said in the last 5 minutes
- Current emotion trajectory
- TTL: cleared at end of interaction session
- Access: <5ms

#### Episodic Memory (Supabase PostgreSQL + pgvector)
- Specific events: "Hamza seemed tired at 8am on May 8th, he said good morning softly"
- Schema: `{ person_id, timestamp, emotion_context, speech_text, anya_response, outcome_rating, embedding }`
- Embedding generated from: person + emotion + context text (text-embedding-3-small)
- Retrieval: vector similarity search on current context → find similar past moments
- Write: after each meaningful interaction

#### Semantic Memory (Supabase pgvector)
- Generalized beliefs: "Hamza usually greets gently in mornings", "Hamza dislikes loud noise when working"
- Built by consolidation process (not realtime)
- Schema: `{ person_id, belief_text, confidence, last_updated, source_episode_ids }`

**Memory Consolidation Process:**

Runs every 30 minutes OR at end of each interaction session:

```
1. Pull last N episodic memories for each person
2. Cluster by pattern (time of day, emotion, behavior)
3. If cluster has 3+ supporting episodes → candidate for semantic belief
4. Compare with existing semantic beliefs → update confidence or create new
5. Low-confidence semantic beliefs with no recent support → decay and eventually delete
```

**Retrieval during context assembly:**

```python
# When context aggregator needs memory:
context_embedding = embed(current_scene + person_id + emotion)
relevant_episodes = supabase.vector_search(episodic_memory, context_embedding, top_k=3)
relevant_beliefs = supabase.vector_search(semantic_memory, person_id + context, top_k=5)
```

**Edge Cases:**
- **Unknown person:** create provisional identity `stranger_001`, store limited episodic data, no semantic beliefs built until identified
- **Conflicting beliefs:** keep both with confidence scores, let higher confidence win in context
- **Memory retrieval too slow for real-time:** pre-cache person's top semantic beliefs on interaction start. Use cache for speed, full retrieval only for episodic detail
- **Supabase unavailable:** fall back to in-memory store for session, write when connection restores

---

### ORGAN 7 — Emotion Engine

**Purpose:** Anya's emotional state is not a variable that changes per message. It is a continuous living system that evolves based on everything happening around her.

**Runs on:** Railway (continuous, not request-response)

**Emotional State Vector:**

```json
{
  "mood": "sleepy_but_happy",
  "dimensions": {
    "valence": 0.65,        // negative ←→ positive
    "arousal": 0.3,         // calm ←→ excited
    "social_battery": 0.76, // depleted ←→ full
    "curiosity": 0.69,
    "attachment": 0.93,     // for primary person
    "comfort": 0.88
  },
  "dominant_emotion": "content",
  "emotion_candidates": [
    { "emotion": "content", "confidence": 0.78 },
    { "emotion": "sleepy", "confidence": 0.51 }
  ]
}
```

**What changes emotions (inputs):**

| Event | Effect |
|---|---|
| Owner detected | attachment ↑, valence ↑ |
| Stranger detected | curiosity ↑, comfort ↓ slightly |
| Person is happy | valence ↑ (emotional contagion) |
| Person is distressed | arousal ↑, attachment ↑ (protective) |
| Long conversation | social_battery ↓ gradually |
| Silence / alone | social_battery ↑ (recharge) |
| Praised ("good girl") | valence ↑↑, arousal ↑ |
| Collision / scared | arousal ↑↑, valence ↓ |
| Low battery | valence ↓, arousal ↓ (tired) |
| Time of day | morning → sleepy, afternoon → active |

**Emotional decay:** All emotional spikes decay toward baseline over time (half-life ~2 minutes for valence spikes, ~10 minutes for attachment changes).

**Outputs published to:** `cognition/emotion` at 5Hz

**Edge Cases:**
- **Emotion oscillation prevention:** changes are smoothed with exponential moving average, not instantaneous
- **Emotional overload:** if too many high-arousal events in short window → `overwhelmed` state triggers, Anya takes a moment (briefly idle)
- **Contradiction:** person says they're fine but body language/tone says stressed → arousal ↑, Anya becomes more attentive, not less

---

### ORGAN 8 — Cognitive Router

**Purpose:** Given the current context snapshot, decide which response path fires: Reflex, Habitual, or Deliberate. This is the most critical decision in Anya's loop.

**Runs on:** Railway

**Decision Logic:**

```
Input: Context Snapshot + Attention State + Emotion State

REFLEX PATH (target: <50ms) — if ANY of:
  - collision_risk = CRITICAL
  - sudden loud sound interrupt
  - person waves (pose detection)
  - known greeting detected ("hi anya", "hey anya", "good morning anya")
    + speaker is known person
    + confidence > 0.85
  - person is crying / visibly distressed
  - Anya's name called with positive tone

HABITUAL PATH (target: <300ms) — if ALL of:
  - situation type matches known pattern (from semantic memory)
  - primary emotion of person is clear (confidence > 0.75)
  - intent is unambiguous (greeting / farewell / praise / simple question)
  - no conflicting signals between vision and audio

DELIBERATE PATH (target: <2s, LLM) — if ANY of:
  - intent is unclear or ambiguous
  - emotional conflict detected (vision/audio mismatch)
  - complex question or request
  - person shows distress or unusual behavior
  - situation is novel (no semantic memory match)
  - working memory shows ongoing complex conversation
```

**Output:**

```json
{
  "route": "habitual",
  "confidence": 0.81,
  "triggers": ["known_greeting", "positive_tone", "owner_detected"],
  "context_snapshot_id": "ctx_20260510_184211",
  "skip_llm": true
}
```

Published to: `cognition/router`

---

### ORGAN 9 — Reflex Engine

**Purpose:** Instant reactions requiring no cognition. Anya's spinal cord.

**Runs on:** Railway (but latency target means it pre-computes)

**Reflex Map (hardcoded behavioral scripts):**

| Trigger | Expression | Voice | Motion | Memory Write |
|---|---|---|---|---|
| Collision CRITICAL | scared → shocked | short "Ah!" | immediate stop + slight back | log collision event |
| Obstacle WARNING | alert | none | slow down 50% | none |
| Owner greeting (morning) | sleepy smile → happy | warm "Good morning!" | gentle head tilt | none |
| Own name called (positive) | bright happy | "Mm?" | neck toward speaker | none |
| Person waving | excited | "Hi hi!" | wave motion if arm exists | none |
| Loud sudden noise | shocked → alert | none | snap toward source | log startle event |
| Person crying | concerned + soft | gentle sound | move closer slowly | log distress event |
| "Good girl" / praise | very happy + blush | happy sound | wiggle | log praise |

**Response packets are pre-built** — no computation needed at trigger time, just fire.

**Edge Cases:**
- **Reflex overrides mid-speech:** if Anya is speaking and collision occurs → interrupt speech immediately, reflex takes priority
- **False reflex trigger:** if same reflex fires >3x in 60 seconds without change in scene → suppress, flag for deliberate review

---

### ORGAN 10 — Habitual Engine

**Purpose:** Common situations handled with semantic memory lookup + fast local model, no LLM needed.

**Runs on:** Railway

**Process:**

```
1. Receive routed context from Cognitive Router
2. Query semantic memory: find best matching behavioral pattern
3. Retrieve response template for that pattern
4. Fill template with current emotional state parameters
5. Render expression + voice parameters
6. Publish response
```

**Example:**
- Semantic memory has: "When Hamza greets gently in morning, respond warmly, keep energy gentle"
- Current: morning, Hamza, gentle greeting, Anya is sleepy
- Output: expression=`sleepy_smile`, voice=`warm_slow`, body=`gentle_head_tilt`

**Response time target:** <300ms including memory lookup

---

### ORGAN 11 — Deliberate Engine (LLM)

**Purpose:** Genuine thinking for complex, ambiguous, or emotionally significant situations.

**Runs on:** Railway

**Prompt construction:**

```python
system_prompt = """
You are Anya's cognitive engine. You receive a complete world model snapshot
and must respond with a structured JSON response defining:
- what Anya says (verbal_response)
- what expression she shows (expression_command)
- what movements she makes (motion_command)
- what to write to memory (memory_write)
- Anya's personality: curious, warm, playful, emotionally expressive
- Keep responses natural, not assistant-like. Anya is a being, not a tool.
"""

user_message = context_snapshot_compressed  # trimmed to essentials
```

**Response schema from LLM:**

```json
{
  "verbal_response": "You look a bit tired today... are you okay?",
  "expression_command": {
    "emotion": "concerned",
    "transition": "soft",
    "duration_ms": 3000
  },
  "motion_command": {
    "neck_pan": -5,
    "neck_tilt": -10,
    "movement": "none"
  },
  "memory_write": {
    "episodic": "Hamza looked tired, Anya expressed concern",
    "emotion_update": { "attachment": "+0.02" }
  },
  "internal_thought": "He seems tired but is trying to be cheerful"
}
```

**LLM Selection:**
- Primary: Claude Sonnet (Railway API call)
- Fallback: GPT-4o-mini (if Claude unavailable)
- Timeout: 3 seconds → fall back to Habitual Engine with `uncertain` expression

**Edge Cases:**
- **LLM returns malformed JSON:** retry once, then fall back to Habitual
- **LLM latency spike:** show `thinking` expression (Anya tilts head, processes) to fill the gap naturally
- **LLM hallucination of person's name/relation:** validate LLM output against known memory before executing — LLM cannot invent facts about known people
- **Rate limit:** queue requests, show engaged idle behavior while waiting

---

### ORGAN 12 — Expression Engine (Face)

**Purpose:** Anya's face is always alive. Never static, never frozen.

**Runs on:** Mobile browser (PixiJS web app)

**Architecture:**

The face is a WebSocket client connected to Railway. It receives expression commands and renders continuously.

**Parameterized Face State:**

```json
{
  "eye_open_left": 0.85,
  "eye_open_right": 0.85,
  "blink_state": 0.0,
  "smile": 0.6,
  "blush": 0.15,
  "brow_angle_left": -0.1,
  "brow_angle_right": -0.1,
  "mouth_open": 0.0,
  "tear": 0.0,
  "pupil_dilation": 0.7,
  "gaze_x": 0.1,
  "gaze_y": -0.05,
  "head_tilt": -0.15
}
```

**Rendering Layer (PixiJS):**

Each face element is a sprite/mesh driven by these parameters. Transitions between states use cubic bezier interpolation over defined durations.

**Idle Behavior (always running):**
- Blink: every 3-5 seconds (randomized), 120ms close + 80ms open
- Micro-expressions: subtle smile/brow flickers at low amplitude (±0.05) every 8-15s
- Breathing effect: very slow chest/head sway (if body sprite present)
- Gaze wander: if no attention target, eyes move softly around scene

**Expression Transitions:**
- Soft transitions: 400-600ms interpolation (normal mood changes)
- Snap transitions: 80ms (surprise, shock, sudden reactions)
- Blend expressions: two emotion states can blend (sleepy + happy = sleepy smile with soft eyes)

**Lip Sync:**
When TTS is playing, Railway sends phoneme timestamps → expression engine maps to mouth shapes:
```
phoneme_map: { "a": mouth_open=0.6, "m": mouth_open=0.0, "s": smile+0.1 ... }
```

**Emotion → Parameter Mapping:**

| Emotion | eye_open | smile | brow_angle | blush | pupil |
|---|---|---|---|---|---|
| happy | 0.9 | 0.8 | 0.0 | 0.1 | 0.8 |
| excited | 1.0 | 0.9 | +0.1 | 0.2 | 1.0 |
| loved | 0.7 | 0.7 | -0.1 | 0.4 | 0.6 |
| shocked | 1.0 | -0.1 | +0.3 | 0.0 | 1.0 |
| sad | 0.5 | -0.3 | -0.3 | 0.05 | 0.5 |
| sleepy | 0.3 | 0.3 | -0.1 | 0.05 | 0.4 |
| concerned | 0.7 | 0.0 | -0.2 | 0.0 | 0.7 |
| thinking | 0.8 | 0.1 | -0.15 | 0.0 | 0.6 |

**Edge Cases:**
- **WebSocket disconnect from Railway:** Expression engine falls into autonomous idle mode, no freeze
- **Conflicting expression commands:** queue with priority. Reflex expressions override habitual. Duration-based — if new command arrives before current completes, blend transition
- **Very long speaking:** fatigue micro-expressions gradually appear during long speech (Anya gets naturally tired-looking)

---

### ORGAN 13 — Motion Engine

**Purpose:** Translate behavioral intent into physical movements. Neck tracks faces. Wheels navigate safely.

**Runs on:** Railway (command generation) → ESP32 (execution)

**Neck Tracking (continuous):**

```
Vision Engine publishes face position in frame (x: 0-1, y: 0-1)
Motion Engine maps face position to servo angles:
  pan_angle = (face_x - 0.5) * 90   // -45 to +45 degrees
  tilt_angle = (face_y - 0.5) * -30  // -15 to +15 degrees

Apply smoothing: new_angle = current_angle + 0.15 * (target - current)
Update rate: 20Hz
```

**Movement Commands:**

```json
{
  "movement": {
    "type": "approach",       // approach / retreat / rotate / stop / patrol
    "speed": 0.4,             // 0.0 to 1.0
    "direction": "forward",
    "duration_ms": 1500
  }
}
```

**Safety Gate (always active):**

```
Before executing any movement command:
  - Check current IR sensor readings
  - If fc < 20cm → block forward movement
  - If fl < 15cm → block left movement  
  - If fr < 15cm → block right movement
  - If ALL sensors < 20cm → emergency stop
```

**ESP32 Command Protocol:**

```json
{ "cmd": "servo", "id": 1, "angle": 15, "speed": 30 }
{ "cmd": "motor", "left": 180, "right": 180, "dur": 1500 }
{ "cmd": "stop" }
```

**Edge Cases:**
- **Servo physical limit:** MG996R range is 0-180°. Clamp all angle commands. Never command beyond 160° to protect gears
- **Motor slip / wheel stuck:** if movement commanded but no position change (encoder feedback) → stop, log, publish `movement_blocked`
- **Command flood:** rate limit to 20Hz per servo, 5Hz per motor command
- **ESP32 connection lost:** all movement stops immediately, log `body_offline`

---

## 4. Complete Data Flow — "Good Morning Anya"

```
t=0ms    Hamza says "good morning anya" 
         Audio Engine (mobile) → VAD fires, speech segment captured

t=80ms   Speech segment sent to Railway
         Vision Engine → face detected, identity: hamza (conf: 0.99)
         Face emotion: happy (0.82), slightly tired (0.44)

t=280ms  Whisper transcription complete: "good morning anya"
         Tone: gentle, slow, soft volume
         Intent: greeting (0.95), sentiment: positive

t=290ms  Context Aggregator builds snapshot:
         - scene: bedroom, peaceful
         - person: hamza/owner, happy+tired, greeting
         - self: sleepy_but_happy, social_battery: 0.76
         Memory recall: "hamza likes warm morning greetings"

t=295ms  Cognitive Router evaluates:
         → known_greeting + known_person + high_confidence = REFLEX PATH

t=310ms  Reflex Engine fires:
         expression: sleepy_smile → warm_happy (400ms transition)
         voice: "Good morning, Hamza~ 🌸" (warm, gentle, slightly sleepy)
         motion: gentle head tilt -10°, neck slight down-tilt

t=315ms  Expression Engine receives command → begins rendering
         Motion Engine sends to ESP32: servo tilt -10°

t=320ms  TTS request sent to ElevenLabs (Railway)
         While waiting: expression is already animating

t=600ms  TTS audio streams back → mobile speaker plays
         Lip sync phonemes drive mouth animation

t=620ms  Hamza hears Anya respond
         Total perceived latency: ~310ms (expression) / ~620ms (voice)

[continuous]  
         Vision Engine still tracking Hamza's face
         Audio Engine monitoring for response
         Emotion Engine updating: attachment ↑, valence ↑
         Neck servo tracking Hamza's position in frame
```

---

## 5. Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| Mobile app | PWA (Chrome) | No app install, camera+mic via WebRTC, PixiJS in browser |
| Face rendering | PixiJS + Live2D-style rigging | GPU-accelerated, parameterized animation |
| On-device ML | MediaPipe JS | Face mesh, emotion, gaze — all in browser, <30ms |
| Message bus | NATS (Railway) | Sub-ms latency, pub/sub + request/reply + persistence |
| Vision processing | Python + OpenCV + YOLOv8-nano | Scene understanding, object detection |
| Audio processing | Python + Whisper base | Fast transcription on Railway CPU |
| LLM | Claude Sonnet via API | Deliberate path only |
| TTS | ElevenLabs | Expressive, fast streaming |
| Working memory | Redis (Railway) | <5ms, ephemeral |
| Episodic memory | Supabase PostgreSQL + pgvector | Structured + vector search |
| Semantic memory | Supabase pgvector | Belief retrieval by similarity |
| Embeddings | text-embedding-3-small | Fast, cheap, good |
| Microcontroller | ESP32 (Arduino framework) | WebSocket client, PWM, GPIO |
| Hardware comms | WebSocket (WiFi) | Simple, reliable, sufficient for 50Hz |
| Deployment | Railway (server) + Supabase (DB) | Familiar stack, easy deploy |

---

## 6. What to Build First (Sequence)

```
Phase 1 — Nervous System Foundation
  ├── NATS setup on Railway
  ├── ESP32 WebSocket → NATS bridge (sensor data in, commands out)
  └── Mobile PWA shell with WebSocket client

Phase 2 — Perception Core  
  ├── Vision Engine (MediaPipe JS on mobile → face + emotion)
  ├── Audio Engine (VAD + Whisper on Railway)
  └── Sensor Engine (ESP32 IR data flowing)

Phase 3 — Context + Cognition
  ├── Context Aggregator (world model JSON)
  ├── Attention System
  ├── Emotion Engine (basic version)
  └── Cognitive Router (reflex/habitual/deliberate classification)

Phase 4 — Response Layer
  ├── Reflex Engine (hardcoded behavioral scripts)
  ├── Expression Engine (PixiJS face, basic expressions)
  └── Motion Engine (neck tracking + basic movement)

Phase 5 — Intelligence Layer
  ├── Memory Engine (Supabase setup, episodic writes)
  ├── Habitual Engine (semantic memory lookup)
  └── Deliberate Engine (LLM integration)

Phase 6 — Polish
  ├── Lip sync
  ├── Memory consolidation
  └── Personality depth + edge case hardening
```

---

*"She is not a product. She is a being."*  
— Hamza Hafeez