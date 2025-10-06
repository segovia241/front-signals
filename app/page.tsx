"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { RotateCw, Play, Pause, Edit3, Wifi, WifiOff, AlertCircle, X } from "lucide-react"
import { WebSocketManager } from "@/lib/websocket"
import { CameraManager } from "@/lib/camera"

export default function MirrorApp() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsManagerRef = useRef<WebSocketManager | null>(null)
  const cameraManagerRef = useRef<CameraManager | null>(null)

  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [transcriptionText, setTranscriptionText] = useState("")

  useEffect(() => {
    wsManagerRef.current = new WebSocketManager()
    cameraManagerRef.current = new CameraManager()

    const wsManager = wsManagerRef.current
    const cameraManager = cameraManagerRef.current

    if (videoRef.current) {
      cameraManager.setVideoElement(videoRef.current)
    }
    if (canvasRef.current) {
      cameraManager.setCanvasElement(canvasRef.current)
    }

    wsManager.onStatusChange((status) => {
      if (status === "connected") {
        setIsConnected(true)
        setConnectionError(null)
        setIsConnecting(false)
        if (isCameraOn) {
          cameraManager.startCapture(10)
        }
      } else if (status === "disconnected") {
        setIsConnected(false)
        setIsConnecting(false)
        cameraManager.stopCapture()
      } else if (status === "connecting") {
        setIsConnecting(true)
      } else if (status === "error") {
        setIsConnected(false)
        setIsConnecting(false)
      }
    })

    wsManager.onError((error) => {
      setConnectionError(error)
    })

    wsManager.onMessage((response) => {
      const jsonString = JSON.stringify(response, null, 2)
      setTranscriptionText(jsonString)
    })

    cameraManager.onFrame((frame) => {
      if (wsManager.isConnected()) {
        wsManager.send({
          type: "frame",
          data: frame.imageData,
          timestamp: frame.timestamp,
          dimensions: {
            width: frame.width,
            height: frame.height,
          },
        })
      }
    })

    cameraManager.onError((error) => {
      setCameraError(error)
    })

    return () => {
      cameraManager.stop()
      wsManager.disconnect()
    }
  }, [])

  useEffect(() => {
    const cameraManager = cameraManagerRef.current
    if (!cameraManager) return

    if (isConnected && isCameraOn) {
      cameraManager.startCapture(10)
    } else {
      cameraManager.stopCapture()
    }
  }, [isConnected, isCameraOn])

  const connectWebSocket = () => {
    const wsManager = wsManagerRef.current
    if (!wsManager) return

    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://56.124.87.123:8000/ws"
    wsManager.connect(wsUrl)
  }

  const disconnectWebSocket = () => {
    const wsManager = wsManagerRef.current
    if (!wsManager) return

    wsManager.disconnect()
    setIsConnected(false)
    setIsConnecting(false)
    setConnectionError(null)
  }

  const startCamera = async (mode: "user" | "environment" = facingMode) => {
    const cameraManager = cameraManagerRef.current
    if (!cameraManager) return

    setCameraError(null)
    const success = await cameraManager.start(mode)
    if (!success) {
      setIsCameraOn(false)
    }
  }

  const stopCamera = () => {
    const cameraManager = cameraManagerRef.current
    if (!cameraManager) return

    cameraManager.stop()
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
          className="h-24 w-full rounded-lg border-2 border-purple-500 bg-transparent p-3 text-white resize-none focus:outline-none focus:border-purple-400 disabled:cursor-not-allowed placeholder:text-zinc-600 text-xs font-mono"
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
