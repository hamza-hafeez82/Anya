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
  scene: any
  people: any[]
  self_state: any
  attention: any
  meta: {
    situation_summary: string
    response_strategy: any
  }
}

export type NavigatePath = "/" | "/view" | "/hear" | "/control" | "/mind" | "/locate"
