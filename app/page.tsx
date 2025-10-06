"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { RotateCw, Play, Pause, Edit3, Wifi, WifiOff, AlertCircle, X } from "lucide-react"

export default function MirrorApp() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [transcriptionText, setTranscriptionText] = useState("")

  const connectWebSocket = () => {
    setIsConnecting(true)
    setConnectionError(null)

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://56.124.87.123:8000/ws"
      console.log("[v0] Intentando conectar a WebSocket:", wsUrl)

      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log("[v0] WebSocket conectado exitosamente")
        setIsConnected(true)
        setConnectionError(null)
        setIsConnecting(false)
        if (isCameraOn) {
          startSendingFrames()
        }
      }

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data)

          if (response.type === "analysis" && response.data) {
            if (response.data.text) {
              setTranscriptionText(response.data.text)
            }
          }
        } catch (err) {
          console.error("[v0] Error parseando respuesta:", err)
        }
      }

      ws.onerror = (error) => {
        console.error("[v0] Error en WebSocket:", error)
        setIsConnected(false)
        setIsConnecting(false)
        setConnectionError("Conexión bloqueada por seguridad. Usa wss:// o despliega con HTTP")
      }

      ws.onclose = () => {
        setIsConnected(false)
        setIsConnecting(false)
        stopSendingFrames()
      }

      wsRef.current = ws
    } catch (error) {
      console.error("[v0] Error creando WebSocket:", error)
      if (error instanceof DOMException && error.message.includes("insecure")) {
        setConnectionError("HTTPS requiere wss:// - Configura SSL en tu servidor Python")
      } else {
        setConnectionError("No se puede conectar al servidor")
      }
      setIsConnected(false)
      setIsConnecting(false)
    }
  }

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
    setConnectionError(null)
    stopSendingFrames()
  }

  const sendFrameToServer = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    if (!videoRef.current || !canvasRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const frameData = canvas.toDataURL("image/jpeg", 0.8).split(",")[1]

    const message = {
      type: "frame",
      data: frameData,
      timestamp: Date.now(),
    }

    try {
      wsRef.current.send(JSON.stringify(message))
    } catch (err) {
      console.error("[v0] Error enviando frame:", err)
    }
  }

  const startSendingFrames = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
    }

    frameIntervalRef.current = setInterval(() => {
      sendFrameToServer()
    }, 1000)
  }

  const stopSendingFrames = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
  }

  const startCamera = async (mode: "user" | "environment" = facingMode) => {
    try {
      setCameraError(null)

      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      if (isConnected) {
        startSendingFrames()
      }
    } catch (err) {
      console.error("[v0] Error accessing camera:", err)
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          setCameraError("Permiso de cámara denegado. Permite el acceso en tu navegador.")
        } else if (err.name === "NotFoundError") {
          setCameraError("No se encontró ninguna cámara en tu dispositivo.")
        } else {
          setCameraError("No se puede acceder a la cámara. Intenta recargar la página.")
        }
      } else {
        setCameraError("Error desconocido al acceder a la cámara.")
      }
      setIsCameraOn(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
    stopSendingFrames()
  }

  const toggleCameraOnOff = () => {
    if (isCameraOn) {
      stopCamera()
      setIsCameraOn(false)
    } else {
      startCamera()
      setIsCameraOn(true)
    }
  }

  const toggleCamera = () => {
    const newMode = facingMode === "user" ? "environment" : "user"
    setFacingMode(newMode)
    startCamera(newMode)
  }

  const toggleEditing = () => {
    setIsEditing(!isEditing)
  }

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      stopSendingFrames()
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-white overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={isConnected ? disconnectWebSocket : connectWebSocket}
          disabled={isConnecting}
          className={`p-2 rounded-full transition-all duration-200 ${
            isConnecting
              ? "bg-purple-500/30 scale-95"
              : isConnected
                ? "bg-green-500/20 hover:bg-green-500/30 active:scale-90"
                : "bg-purple-500/20 hover:bg-purple-500/30 active:scale-90"
          }`}
        >
          {isConnecting ? (
            <Wifi className="h-6 w-6 text-yellow-400 animate-pulse" strokeWidth={2.5} />
          ) : isConnected ? (
            <Wifi className="h-6 w-6 text-green-400" strokeWidth={2.5} />
          ) : (
            <WifiOff className="h-6 w-6 text-purple-400" strokeWidth={2.5} />
          )}
        </button>
        <div
          className={`h-10 w-10 rounded-full transition-all duration-300 ${
            isConnecting
              ? "bg-gradient-to-br from-yellow-400 to-orange-400 animate-pulse"
              : isConnected
                ? "bg-gradient-to-br from-green-400 to-emerald-400"
                : connectionError
                  ? "bg-gradient-to-br from-red-400 to-rose-400"
                  : "bg-gradient-to-br from-purple-400 to-pink-400"
          }`}
        />
      </div>

      <div className="px-4 pb-2 shrink-0">
        <h1 className="text-center text-xl font-bold tracking-wider">TRANSCRIPCIÓN</h1>
        <div className="mt-1 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
      </div>

      {(connectionError || cameraError) && (
        <div className="px-6 pb-2 shrink-0">
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {connectionError && (
                <div className="mb-1">
                  <p className="text-xs font-semibold text-red-400">WebSocket:</p>
                  <p className="text-xs text-red-300">{connectionError}</p>
                  {connectionError.includes("wss://") && (
                    <p className="text-xs text-red-300/70 mt-1">💡 Usa ngrok o configura SSL en Python</p>
                  )}
                </div>
              )}
              {cameraError && (
                <div>
                  <p className="text-xs font-semibold text-red-400">Cámara:</p>
                  <p className="text-xs text-red-300">{cameraError}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setConnectionError(null)
                setCameraError(null)
              }}
              className="shrink-0 p-1 rounded hover:bg-red-500/20 transition-colors"
            >
              <X className="h-4 w-4 text-red-400" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 px-6 py-3 min-h-0">
        <div className="relative mx-auto h-full max-w-sm overflow-hidden rounded-lg bg-pink-300">
          {!isCameraOn ? (
            <div className="flex h-full w-full items-center justify-center bg-zinc-900">
              <div className="text-center">
                <Play className="h-12 w-12 text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">Presiona Play para iniciar</p>
                <p className="text-xs text-zinc-500 mt-1">La cámara se activará como espejo</p>
              </div>
            </div>
          ) : cameraError ? (
            <div className="flex h-full w-full items-center justify-center bg-zinc-900">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">Cámara no disponible</p>
                <p className="text-xs text-zinc-500 mt-1">Permite el acceso en tu navegador</p>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 px-4 py-3 shrink-0">
        <button onClick={toggleCamera} className="rounded-full p-2 hover:bg-zinc-800 transition-colors">
          <RotateCw className="h-6 w-6 text-zinc-400" />
        </button>
        <button onClick={toggleCameraOnOff} className="rounded-full p-2 hover:bg-zinc-800 transition-colors">
          {isCameraOn ? <Pause className="h-6 w-6 text-zinc-400" /> : <Play className="h-6 w-6 text-zinc-400" />}
        </button>
        <button onClick={toggleEditing} className="rounded-full p-2 hover:bg-zinc-800 transition-colors">
          <Edit3 className={`h-6 w-6 ${isEditing ? "text-purple-400" : "text-zinc-400"}`} />
        </button>
      </div>

      <div className="px-6 pb-3 shrink-0">
        <textarea
          value={transcriptionText}
          onChange={(e) => setTranscriptionText(e.target.value)}
          disabled={!isEditing}
          placeholder={isEditing ? "Escribe aquí..." : ""}
          className="h-24 w-full rounded-lg border-2 border-purple-500 bg-transparent p-3 text-white resize-none focus:outline-none focus:border-purple-400 disabled:cursor-not-allowed placeholder:text-zinc-600"
        />
      </div>

      <div className="flex gap-3 px-6 pb-4 shrink-0">
        <Button
          variant="outline"
          className="flex-1 border-2 border-pink-500 bg-transparent text-pink-500 hover:bg-pink-500/10 text-base font-semibold py-4"
        >
          VOLVER
        </Button>
        <Button
          variant="outline"
          className="flex-1 border-2 border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-base font-semibold py-4"
        >
          GUARDAR
        </Button>
      </div>
    </div>
  )
}
