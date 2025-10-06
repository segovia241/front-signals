export interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
}

export interface FrameMessage {
  type: "frame"
  data: string
  timestamp: number
  dimensions: {
    width: number
    height: number
  }
}

export interface AnalysisResponse {
  type: "analysis"
  data: {
    mean_intensity?: number
    edge_intensity?: number
    image_dimensions?: {
      width: number
      height: number
    }
    processing_time?: string
    status?: string
    text?: string
  }
  timestamp: number
}

export class WebSocketManager {
  private ws: WebSocket | null = null
  private onMessageCallback: ((message: AnalysisResponse) => void) | null = null
  private onStatusChangeCallback: ((status: "connected" | "disconnected" | "connecting" | "error") => void) | null =
    null
  private onErrorCallback: ((error: string) => void) | null = null

  connect(url: string) {
    try {
      console.log("[v0] Intentando conectar a WebSocket:", url)
      this.ws = new WebSocket(url)

      this.onStatusChangeCallback?.("connecting")

      this.ws.onopen = () => {
        console.log("[v0] WebSocket conectado exitosamente")
        this.onStatusChangeCallback?.("connected")
      }

      this.ws.onmessage = (event) => {
        try {
          const response: AnalysisResponse = JSON.parse(event.data)
          console.log("[v0] Respuesta recibida:", response)
          this.onMessageCallback?.(response)
        } catch (err) {
          console.error("[v0] Error parseando respuesta:", err)
        }
      }

      this.ws.onerror = (error) => {
        console.error("[v0] Error en WebSocket:", error)
        this.onStatusChangeCallback?.("error")
        this.onErrorCallback?.("Conexión bloqueada por seguridad. Usa wss:// o despliega con HTTP")
      }

      this.ws.onclose = () => {
        console.log("[v0] WebSocket desconectado")
        this.onStatusChangeCallback?.("disconnected")
      }
    } catch (error) {
      console.error("[v0] Error creando WebSocket:", error)
      if (error instanceof DOMException && error.message.includes("insecure")) {
        this.onErrorCallback?.("HTTPS requiere wss:// - Configura SSL en tu servidor Python")
      } else {
        this.onErrorCallback?.("No se puede conectar al servidor")
      }
      this.onStatusChangeCallback?.("error")
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(message: FrameMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message))
      } catch (err) {
        console.error("[v0] Error enviando mensaje:", err)
      }
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  onMessage(callback: (message: AnalysisResponse) => void) {
    this.onMessageCallback = callback
  }

  onStatusChange(callback: (status: "connected" | "disconnected" | "connecting" | "error") => void) {
    this.onStatusChangeCallback = callback
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback
  }
}
