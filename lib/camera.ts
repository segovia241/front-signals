export interface CameraFrame {
  imageData: string
  width: number
  height: number
  timestamp: number
}

export class CameraManager {
  private stream: MediaStream | null = null
  private videoElement: HTMLVideoElement | null = null
  private canvasElement: HTMLCanvasElement | null = null
  private frameInterval: NodeJS.Timeout | null = null
  private onFrameCallback: ((frame: CameraFrame) => void) | null = null
  private onErrorCallback: ((error: string) => void) | null = null

  setVideoElement(video: HTMLVideoElement) {
    this.videoElement = video
  }

  setCanvasElement(canvas: HTMLCanvasElement) {
    this.canvasElement = canvas
  }

  async start(facingMode: "user" | "environment" = "user") {
    try {
      if (this.stream) {
        this.stop()
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      this.stream = mediaStream

      if (this.videoElement) {
        this.videoElement.srcObject = mediaStream
      }

      return true
    } catch (err) {
      console.error("[v0] Error accessing camera:", err)
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          this.onErrorCallback?.("Permiso de cámara denegado. Permite el acceso en tu navegador.")
        } else if (err.name === "NotFoundError") {
          this.onErrorCallback?.("No se encontró ninguna cámara en tu dispositivo.")
        } else {
          this.onErrorCallback?.("No se puede acceder a la cámara. Intenta recargar la página.")
        }
      } else {
        this.onErrorCallback?.("Error desconocido al acceder a la cámara.")
      }
      return false
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
      if (this.videoElement) {
        this.videoElement.srcObject = null
      }
    }
    this.stopCapture()
  }

  startCapture(fps = 10) {
    if (this.frameInterval) {
      clearInterval(this.frameInterval)
    }

    const interval = 10 / fps

    this.frameInterval = setInterval(() => {
      this.captureFrame()
    }, interval)
  }

  stopCapture() {
    if (this.frameInterval) {
      clearInterval(this.frameInterval)
      this.frameInterval = null
    }
  }

  private captureFrame() {
    if (!this.videoElement || !this.canvasElement) {
      return
    }

    const video = this.videoElement
    const canvas = this.canvasElement
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = canvas.toDataURL("image/jpeg", 0.7)

    const frame: CameraFrame = {
      imageData,
      width: canvas.width,
      height: canvas.height,
      timestamp: Date.now(),
    }

    this.onFrameCallback?.(frame)
  }

  onFrame(callback: (frame: CameraFrame) => void) {
    this.onFrameCallback = callback
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback
  }

  isActive(): boolean {
    return this.stream !== null
  }
}
