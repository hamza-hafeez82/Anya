# Anya OS — Web Interface Cursor Prompt

Copy everything below this line and paste directly into Cursor.

---

## PROMPT START

Build the complete **Anya web** web interface. This is the operating system dashboard for Anya — an emotionally intelligent robot. The web app runs on the robot's mobile phone (portrait, full screen) and also accessible from any browser on the same network for monitoring and control.

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + custom CSS variables
- **WebSocket**: native browser WebSocket client
- **Joysticks**: `nipplejs` library
- **Audio visualization**: Web Audio API + Canvas
- **Map**: `leaflet` + `react-leaflet`
- **Camera overlay**: WebRTC `getUserMedia` + Canvas 2D
- **Fonts**: `Geist Mono` for UI chrome, `Zen Kaku Gothic New` for Anya's speech text
- **Package manager**: pnpm

---

## Aesthetic Direction

**Dark anime-tech OS.** Think: Kali Linux terminal meets anime VTuber HUD. This is a real operating system for a real robot, but it has soul.

**Color palette (CSS variables):**
```css
--bg-primary: #080810       /* near black with blue tint */
--bg-secondary: #0f0f1a     /* panel backgrounds */
--bg-panel: #12121f         /* card backgrounds */
--accent-pink: #ff6b9d      /* Anya pink — primary accent */
--accent-green: #4ade80     /* system online green */
--accent-cyan: #22d3ee      /* data/info cyan */
--accent-yellow: #fbbf24    /* warning yellow */
--text-primary: #f0f0ff     /* near white */
--text-secondary: #8888aa   /* muted text */
--border: #1e1e35           /* subtle borders */
--glow-pink: 0 0 20px rgba(255, 107, 157, 0.3)
--glow-green: 0 0 20px rgba(74, 222, 128, 0.3)
--glow-cyan: 0 0 20px rgba(34, 211, 238, 0.2)
```

**Design rules:**
- Every panel has a subtle border with `--border` color
- Active/online elements glow with their accent color
- Scanline texture overlay on backgrounds (CSS, very subtle, 2% opacity)
- Corner brackets `┌ ┐ └ ┘` on important panels as decorative elements (CSS pseudo-elements)
- Status indicators always visible (battery, connection, mood)
- Numbers and data use `Geist Mono`
- All text is crisp, no blurry shadows

---

## File Structure

```
anya-os/
├── app/
│   ├── layout.tsx              ← root layout, status bar, WebSocket provider
│   ├── page.tsx                ← / face page
│   ├── view/
│   │   └── page.tsx            ← /view camera + detection
│   ├── hear/
│   │   └── page.tsx            ← /hear audio visualization
│   ├── control/
│   │   └── page.tsx            ← /control joysticks
│   ├── mind/
│   │   └── page.tsx            ← /mind context/thinking view
│   └── locate/
│       └── page.tsx            ← /locate GPS map
├── components/
│   ├── StatusBar.tsx           ← persistent top status bar
│   ├── NavDock.tsx             ← bottom navigation dock
│   ├── AnyaFace.tsx            ← expression image display
│   ├── SpeechBubble.tsx        ← what Anya just said
│   ├── CameraView.tsx          ← WebRTC camera + canvas overlays
│   ├── AudioVisualizer.tsx     ← waveform + spectrum + dB
│   ├── Joystick.tsx            ← nipplejs wrapper
│   ├── MindView.tsx            ← live JSON context display
│   ├── MapView.tsx             ← leaflet map
│   └── PanelFrame.tsx          ← reusable panel with corner brackets
├── lib/
│   ├── ws-client.ts            ← WebSocket client singleton
│   ├── ws-context.tsx          ← React context for WebSocket
│   └── types.ts                ← all TypeScript types
├── public/
│   └── expressions/            ← expression images (referenced, not included)
│       ├── happy.jpg
│       ├── excited.jpg
│       ├── loved.jpg
│       ├── laugh.jpg
│       ├── shocked.jpg
│       ├── cringe.jpg
│       ├── creepy.jpg
│       ├── cry.jpg
│       ├── sleepy.jpg
│       ├── hurt.jpg
│       └── neutral.jpg
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── .env.local.example
```

---

## WebSocket Protocol

Connect to: `process.env.NEXT_PUBLIC_GATEWAY_WS_URL` (e.g. `wss://anya-gateway.railway.app/ws`)

**Messages received from server:**
```typescript
// Expression update
{ type: "expression", expression: "happy", transition_ms: 300 }

// Voice/speech — Anya speaking
{ type: "voice", audio_b64: string, text: string }

// Navigate to a page
{ type: "navigate", path: "/" | "/view" | "/hear" | "/control" | "/mind" | "/locate" }

// Context snapshot update (for /mind page)
{ type: "context_snapshot", data: ContextSnapshot }

// Detection overlay data (for /view page)
{ type: "detections", faces: Detection[], objects: Detection[], scene: SceneData }

// Audio analysis data (for /hear page)
{ type: "audio_analysis", transcript: string, speaker: string, sentiment: string }

// Location update (for /locate page)
{ type: "location", lat: number, lng: number, accuracy: number, room: string }

// System status
{ type: "status", battery: number, mood: string, connection: string, uptime: number }
```

**Messages sent to server:**
```typescript
// Camera frame
{ type: "camera_frame", data: string, ts: number }

// Audio chunk
{ type: "audio_chunk", data: string, ts: number }

// Speech ended
{ type: "speech_end", ts: number }

// Manual control
{ type: "control_neck", pan: number, tilt: number }
{ type: "control_move", x: number, y: number }
{ type: "control_expression", expression: string }

// Heartbeat
{ type: "ping" }
```

---

## TypeScript Types (`lib/types.ts`)

```typescript
export type ExpressionName =
  | "happy" | "excited" | "loved" | "laugh"
  | "shocked" | "cringe" | "creepy" | "cry"
  | "sleepy" | "hurt" | "neutral"

export interface Detection {
  label: string
  confidence: number
  bbox: { x: number; y: number; w: number; h: number } // normalized 0-1
  distance?: number
  identity?: string
  relation?: string
}

export interface SceneData {
  type: string
  confidence: number
  tags: string[]
  atmosphere: string
  lighting: string
}

export interface SystemStatus {
  battery: number
  mood: string
  connection: "online" | "connecting" | "offline"
  uptime: number
  expression: ExpressionName
}

export interface ContextSnapshot {
  timestamp: number
  scene: object
  people: object[]
  self_state: object
  attention: object
  meta: {
    situation_summary: string
    response_strategy: object
  }
}

export type NavigatePath = "/" | "/view" | "/hear" | "/control" | "/mind" | "/locate"
```

---

## WebSocket Client (`lib/ws-client.ts`)

Singleton class:
- `connect(url: string)`: connect, setup ping every 30s
- `disconnect()`
- `send(msg: object)`: JSON.stringify and send
- `on(type: string, handler: (data: any) => void)`: event listener
- `off(type: string, handler: Function)`: remove listener
- Auto-reconnect with exponential backoff: 1s, 2s, 4s, 8s, max 30s
- On reconnect: emit `reconnected` event

---

## WebSocket Context (`lib/ws-context.tsx`)

React context wrapping the singleton:
- `useWS()` hook returns `{ send, on, off, status }`
- Initializes connection on mount
- `status`: "connecting" | "connected" | "disconnected"
- Listens for `navigate` messages → calls `router.push(path)`
- Listens for `status` messages → updates global system status atom

---

## Root Layout (`app/layout.tsx`)

Full screen, dark background. Structure:
```
<html>
  <body style="background: var(--bg-primary)">
    <WSProvider>           ← WebSocket context
      <StatusBar />        ← fixed top, 40px
      <main>               ← content area, full height minus status + nav
        {children}
      </main>
      <NavDock />          ← fixed bottom, 60px
    </WSProvider>
  </body>
</html>
```

Apply subtle scanline texture to body via CSS:
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(255,255,255,0.01) 2px,
    rgba(255,255,255,0.01) 4px
  );
  pointer-events: none;
  z-index: 9999;
}
```

---

## StatusBar Component

Fixed top bar, 40px height, `--bg-secondary` background, subtle bottom border.

Left side:
- `ANYA OS` in `Geist Mono`, pink accent, small caps
- Blinking green dot + `ONLINE` when connected, red dot + `OFFLINE` when not

Center:
- Current mood emoji + mood name (from system status)
- Example: `😊 content` or `😴 sleepy`

Right side:
- Battery icon + percentage with color coding:
  - >50%: green
  - 20-50%: yellow  
  - <20%: red + pulsing
- Uptime counter `UPT 00:42:11`

---

## NavDock Component

Fixed bottom navigation, 60px height, `--bg-secondary` background, subtle top border.

6 nav items evenly spaced:

| Icon | Label | Path |
|------|-------|------|
| 👾 | FACE | / |
| 👁 | VIEW | /view |
| 👂 | HEAR | /hear |
| 🕹 | CTRL | /control |
| 🧠 | MIND | /mind |
| 📍 | LOCATE | /locate |

Active item: pink accent color + glow, slightly larger
Inactive: muted text, no glow
Use `usePathname()` for active state

---

## PanelFrame Component

Reusable wrapper for all data panels. Props: `title`, `subtitle?`, `status?`, `children`, `glowColor?`

Renders:
- Panel with `--bg-panel` background, `--border` border, 8px radius
- Top bar with title in `Geist Mono` (small, uppercase, `--text-secondary`)
- Optional status pill (green dot + text)
- Corner bracket decorations via CSS pseudo-elements:
```css
.panel::before { content: '┌'; position: absolute; top: -1px; left: -1px; color: var(--accent-pink); }
.panel::after { content: '┐'; position: absolute; top: -1px; right: -1px; color: var(--accent-pink); }
```
- Optional glow on border when `glowColor` provided

---

## PAGE: / (Face — `app/page.tsx`)

**This is Anya's soul. Make it beautiful.**

Layout — full screen portrait, centered:

```
┌─────────────────────────┐
│  [StatusBar]            │
│                         │
│   WAKU WAKU!  ← tagline │
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │   ANYA FACE IMG   │  │  ← large, centered, ~70% screen width
│  │                   │  │     crossfade transition between expressions
│  └───────────────────┘  │
│                         │
│  ┌─ SPEECH BUBBLE ────┐ │  ← what Anya just said, fades in/out
│  │ "Good morning~"    │ │     Zen Kaku Gothic New font
│  └────────────────────┘ │
│                         │
│  ● LISTENING...         │  ← pulsing pink dot when mic active
│                         │
│  [NavDock]              │
└─────────────────────────┘
```

**AnyaFace Component:**
- Display current expression image
- CSS transition: `opacity 0s → 0 → new image → opacity 1` crossfade over `transition_ms`
- Images from `/expressions/{name}.jpg`
- Soft vignette shadow around image
- Subtle breathing animation: `scale(1.0) → scale(1.015) → scale(1.0)` over 4s loop
- On expression change: image scales down slightly (0.97) then back up (1.0) as it crossfades

**SpeechBubble Component:**
- Appears when `voice` message received with `text`
- Anime-style speech bubble shape (CSS clip-path or border-radius)
- Pink border, dark background
- Text in `Zen Kaku Gothic New`
- Fades out 3 seconds after TTS ends
- If text is long: typewriter animation at TTS speed

**Listening indicator:**
- Pink pulsing dot when mic is active and capturing
- Changes to animated waveform bars (3 bars, CSS animation) when speech detected
- Goes idle when silent

**Background:**
- Very subtle pink particle effect (5-8 tiny dots drifting slowly, CSS animation)
- Or: soft radial gradient behind face image (pink center, fading to `--bg-primary`)

---

## PAGE: /view (`app/view/page.tsx`)

**What Anya sees. Her visual mind.**

Layout:
```
┌─────────────────────────┐
│  [StatusBar]            │
│                         │
│  ┌─ LIVE VIEW ─────────┐│
│  │ [Camera feed]       ││  ← WebRTC camera, full width
│  │ [Detection overlays]││     canvas on top for bounding boxes
│  └─────────────────────┘│
│                         │
│  ┌─ SCENE ─────────────┐│  ← 2 panels side by side
│  │ bedroom     0.93    ││
│  │ #private    #calm   ││
│  └─────────────────────┘│
│  ┌─ DETECTIONS ────────┐│
│  │ hamza  owner  0.99  ││
│  │ laptop  0.8m  high  ││
│  └─────────────────────┘│
│                         │
│  [NavDock]              │
└─────────────────────────┘
```

**CameraView Component:**
- `getUserMedia` with rear camera preferred (`facingMode: environment`)
- Video element + canvas overlay stacked
- Canvas draws bounding boxes from `detections` WS message:
  - Faces: pink box, `identity | confidence` label above
  - Objects: cyan box, `label | distance` label
  - Box style: 2px solid, with corner brackets at each corner of the box
  - Confidence opacity: lower confidence = more transparent box
- If no detections data from server: show boxes from on-device MediaPipe (stub with empty array)

**Scene panel:**
- Scene type in large text, confidence as percentage
- Semantic tags as pills (small rounded badges)
- Atmosphere label with color coding: calm=green, tense=yellow, chaotic=red

**Detections list:**
- Scrollable list of all detected objects/people
- Each row: icon + label + distance + importance indicator
- People rows have identity + relation badge
- Distance in meters (estimated)

---

## PAGE: /hear (`app/hear/page.tsx`)

**What Anya hears. Her sonic awareness.**

Layout:
```
┌─────────────────────────┐
│  [StatusBar]            │
│                         │
│  ┌─ WAVEFORM ──────────┐│
│  │ [live waveform]     ││  ← canvas, pink wave, scrolling
│  └─────────────────────┘│
│                         │
│  ┌─ SPECTRUM ──────────┐│
│  │ [frequency bars]    ││  ← canvas, bar chart, pink→cyan gradient
│  └─────────────────────┘│
│                         │
│  ┌─ LEVELS ────────────┐│
│  │ dB ████████░ -12dB  ││  ← decibel meter bar
│  │ CLASS: moderate     ││
│  └─────────────────────┘│
│                         │
│  ┌─ TRANSCRIPTION ─────┐│
│  │ "good morning anya" ││  ← streaming live transcript
│  │ hamza | positive    ││     speaker identity + sentiment
│  └─────────────────────┘│
│                         │
│  [NavDock]              │
└─────────────────────────┘
```

**AudioVisualizer Component:**
- Request mic permission, set up `AudioContext` + `AnalyserNode`
- **Waveform**: scrolling time-domain wave, pink stroke, canvas animation loop
- **Spectrum**: frequency domain, vertical bars 0-20kHz, gradient pink→cyan
  - Bass frequencies: taller bars, pink
  - High frequencies: shorter, cyan
  - Bars animate smoothly (lerp toward actual values)
- **dB meter**: horizontal bar, color-coded:
  - Silent (<-40dB): dark gray
  - Quiet (-40 to -20dB): green
  - Normal (-20 to -10dB): cyan
  - Loud (-10 to 0dB): yellow
  - Clipping (0dB): red + flash

**Transcription panel:**
- Text streams in word by word as server sends transcript
- Current partial transcript in `--text-secondary`
- Completed sentences in `--text-primary`
- Speaker tag: pink badge showing `hamza` or `unknown`
- Sentiment tag: green=positive, red=negative, gray=neutral
- Auto-scrolls to bottom, keeps last 10 lines

---

## PAGE: /control (`app/control/page.tsx`)

**Manual control. Take the wheel.**

Layout:
```
┌─────────────────────────┐
│  [StatusBar]            │
│                         │
│  ┌─ NECK CONTROL ──────┐│
│  │  PAN:  +15°  ──── ││  ← live angle readouts
│  │  TILT: -10°  ──── ││
│  └─────────────────────┘│
│                         │
│  ┌─────────┐  ┌────────┐│
│  │  LEFT   │  │ RIGHT  ││
│  │         │  │        ││
│  │  [JOY]  │  │ [JOY]  ││  ← nipplejs joysticks
│  │         │  │        ││
│  │  MOVE   │  │  NECK  ││
│  └─────────┘  └────────┘│
│                         │
│  ┌─ EXPRESSIONS ───────┐│
│  │ [happy][excited]    ││  ← expression override buttons
│  │ [sleepy][shocked]   ││     2 rows, all 11 expressions
│  │ [neutral]...        ││
│  └─────────────────────┘│
│                         │
│  [■ STOP]               │  ← large red emergency stop button
│  [NavDock]              │
└─────────────────────────┘
```

**Joystick Component (nipplejs wrapper):**
- Left joystick: movement control
  - x-axis → rotate (send `control_move` with x=-1 to 1)
  - y-axis → forward/back (send `control_move` with y=-1 to 1)
  - Throttle: send every 50ms while active, send `{x:0,y:0}` on release
- Right joystick: neck control
  - x-axis → pan (-80 to +80 degrees mapped from -1 to 1)
  - y-axis → tilt (-25 to +25 degrees)
  - Throttle: send every 50ms while active

**Joystick visual style:**
- Dark panel background
- Nipple: pink circle
- Zone: subtle cyan circle outline
- Direction lines: very subtle grid

**Expression buttons:**
- Grid of small buttons, each shows expression name
- Active expression: pink background, glow
- On tap: send `control_expression` + navigate to / to see face change

**Emergency stop:**
- Full width, 50px height, red background
- `■ EMERGENCY STOP` in Geist Mono
- On press: send `{ type: "control_stop" }`, vibrate device if supported

---

## PAGE: /mind (`app/mind/page.tsx`)

**Anya's inner world. What she is thinking right now.**

Layout:
```
┌─────────────────────────┐
│  [StatusBar]            │
│                         │
│  ┌─ SITUATION ─────────┐│
│  │ "Owner greeted      ││  ← meta.situation_summary
│  │  Anya warmly in     ││
│  │  a calm room."      ││
│  └─────────────────────┘│
│                         │
│  ┌─ COGNITIVE PATH ────┐│
│  │ ● REFLEX            ││  ← which path fired, with color
│  │   triggers: [...]   ││     reflex=yellow, habitual=cyan, deliberate=pink
│  └─────────────────────┘│
│                         │
│  ┌─ EMOTION STATE ─────┐│
│  │ valence    ████ 0.7 ││  ← bar charts for each dimension
│  │ arousal    ██░░ 0.3 ││
│  │ social_bat ████ 0.8 ││
│  │ curiosity  ███░ 0.6 ││
│  └─────────────────────┘│
│                         │
│  ┌─ ATTENTION ─────────┐│
│  │ → hamza_face        ││  ← what Anya is focused on
│  │ ↓ background_hum    ││     suppressed inputs dimmed
│  └─────────────────────┘│
│                         │
│  ┌─ MEMORY RECALL ─────┐│
│  │ "hamza likes        ││  ← relevant_memories array
│  │  energetic greetings││
│  │  in mornings"       ││
│  └─────────────────────┘│
│                         │
│  [NavDock]              │
└─────────────────────────┘
```

**MindView Component:**
- Receives `context_snapshot` WS messages
- Updates live — no page refresh needed
- All data panels auto-update with smooth transitions
- Emotion dimension bars animate smoothly to new values (CSS transition 500ms)
- Cognitive path badge color-codes: REFLEX=yellow, HABITUAL=cyan, DELIBERATE=pink
- Memory recall items scroll in from right, old ones fade out
- If no data yet: show `AWAITING COGNITION...` with blinking cursor

---

## PAGE: /locate (`app/locate/page.tsx`)

**Where Anya is in the world.**

Layout:
```
┌─────────────────────────┐
│  [StatusBar]            │
│                         │
│  ┌─ COORDINATES ───────┐│
│  │ LAT  31.5204° N     ││  ← exact GPS coordinates
│  │ LNG  74.3587° E     ││     Geist Mono font, large
│  │ ACC  ±3m            ││
│  └─────────────────────┘│
│                         │
│  ┌─ MAP ───────────────┐│
│  │                     ││  ← Leaflet map, dark tile layer
│  │    [MAP]            ││     Anya marker (pink dot + pulse)
│  │                     ││     movement trail (last 10 positions)
│  │                     ││
│  └─────────────────────┘│
│                         │
│  ┌─ ENVIRONMENT ───────┐│
│  │ ROOM: bedroom       ││  ← from Vision Engine scene classification
│  │ ZONE: private_space ││
│  └─────────────────────┘│
│                         │
│  [NavDock]              │
└─────────────────────────┘
```

**MapView Component:**
- Leaflet with dark tile layer: `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png`
- Anya marker: custom pink pulsing dot SVG
- Movement trail: polyline of last 10 positions, fading opacity
- Auto-centers on Anya's position
- Zoom level 17 (street level)
- GPS via browser `navigator.geolocation.watchPosition()`
- Also accepts location from WS `location` message (server-side GPS if available)
- If no GPS: show `GPS UNAVAILABLE` panel, show environment from Vision instead

---

## Voice Navigation (Anya controls her own UI)

In `lib/ws-context.tsx`, listen for `navigate` messages:
```typescript
ws.on('navigate', (data) => {
  router.push(data.path)
  // optional: play a small navigation sound
})
```

When Anya navigates, add a route transition animation:
- Current page: slides out left (transform: translateX(-20px), opacity: 0)
- New page: slides in right (transform: translateX(20px) → 0, opacity: 0 → 1)
- Duration: 200ms, ease-out
- Implement via Next.js layout animation or simple CSS class toggle

---

## Environment Variables (`.env.local.example`)

```env
NEXT_PUBLIC_GATEWAY_WS_URL=wss://your-gateway.railway.app/ws
NEXT_PUBLIC_APP_NAME=ANYA OS
NEXT_PUBLIC_VERSION=0.1.0
```

---

## Package.json Dependencies

```json
{
  "dependencies": {
    "next": "14.2.0",
    "react": "^18",
    "react-dom": "^18",
    "nipplejs": "^0.10.1",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "@react-leaflet/core": "^2.1.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/leaflet": "^1.9.8",
    "@types/nipplejs": "^0.9.4",
    "tailwindcss": "^3.4.0",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

---

## Important Implementation Rules

1. **Mobile-first, portrait layout.** Max width 430px centered on desktop. On desktop: center the app with the remaining space as dark background.

2. **WebSocket is always trying to connect.** Status bar always shows connection state. Never show a broken UI — if WS is offline, show the state gracefully with a reconnecting indicator.

3. **Camera and mic permissions.** Request on first visit to /view and /hear respectively. If denied: show a clear permission request panel with instructions, not a broken page.

4. **All pages work without server data.** If WebSocket has no data yet, pages show their UI in an empty/waiting state, not blank screens. Every panel shows `—` or `AWAITING DATA` in the right style.

5. **No placeholder lorem ipsum anywhere.** Every text element shows real labels, real status text, real field names.

6. **Leaflet SSR.** Import Leaflet dynamically with `{ ssr: false }` to avoid Next.js SSR issues.

7. **Nipplejs SSR.** Same — dynamic import only.

8. **Audio context.** Only create `AudioContext` after user interaction (browser requirement). Show a `TAP TO ACTIVATE AUDIO` prompt if needed.

9. **Performance.** Canvas animation loops use `requestAnimationFrame`. Stop loops when page is not visible (`document.visibilityState`). This matters because it's running on a mobile phone.

10. **The face page is the home.** It should feel the most polished and alive. Everything else is diagnostic/control. The face is the soul.

---

## Final Check Before Generating

- `pnpm install && pnpm dev` runs without errors
- All 6 routes load without crashes
- Face page shows neutral expression image with breathing animation
- NavDock navigates between all pages
- StatusBar shows connection status
- WebSocket connects to `NEXT_PUBLIC_GATEWAY_WS_URL` (shows disconnected gracefully if not available)
- /control page renders both joysticks
- /hear page renders audio visualizer (even with no mic, canvas shows)
- /view page renders camera (shows permission prompt if not granted)
- /locate page renders map centered on Lahore (default coordinates: 31.5204, 74.3587)
- /mind page renders all panels in waiting state

Generate all files now.

---

## PROMPT END