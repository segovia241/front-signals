"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { RotateCw, Play, Square, Edit3, Wifi, WifiOff, AlertCircle, X, Send } from "lucide-react"

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
  
  // 🔥 CAMBIO: Estados para el nuevo flujo de grabación
  const [isRecording, setIsRecording] = useState(false)
  const [recordedFrames, setRecordedFrames] = useState<string[]>([])
  const [detectedWord, setDetectedWord] = useState("")
  const [detectionConfidence, setDetectionConfidence] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

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
      }

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data)

          if (response.type === "analysis") {
            const data = response.data
            
            // 🔥 CAMBIO: Procesar respuesta del análisis de grabación
            if (data.detected_word) {
              setDetectedWord(data.detected_word)
              setDetectionConfidence(data.confidence || 0)
              setIsProcessing(false)
              console.log("[v0] Palabra detectada:", data.detected_word, "Confianza:", data.confidence)
            }
            
            // Para debugging
            console.log("[v0] Respuesta del servidor:", data)
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
        stopRecording()
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
    stopRecording()
  }

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) {
      return null
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return null

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    return canvas.toDataURL("image/jpeg", 0.7)
  }

  const startRecording = () => {
    if (!isConnected || !isCameraOn) {
      alert("Primero conecta el WebSocket y activa la cámara")
      return
    }

    setIsRecording(true)
    setRecordedFrames([])
    setDetectedWord("")
    setDetectionConfidence(0)

    // 🔥 Grabar frames cada 100ms (10 FPS para la grabación)
    frameIntervalRef.current = setInterval(() => {
      const frame = captureFrame()
      if (frame) {
        setRecordedFrames(prev => [...prev, frame])
      }
    }, 100) // 10 FPS para grabación

    console.log("[v0] Iniciando grabación...")
  }

  const stopRecording = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
    
    if (isRecording) {
      console.log("[v0] Grabación terminada. Frames capturados:", recordedFrames.length)
    }
    
    setIsRecording(false)
  }

  const sendRecordingForAnalysis = async () => {
    if (recordedFrames.length === 0) {
      alert("No hay frames grabados. Primero graba una seña.")
      return
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert("WebSocket no conectado")
      return
    }

    setIsProcessing(true)
    console.log("[v0] Enviando grabación para análisis...", recordedFrames.length, "frames")

    try {
      // 🔥 ENVIAR TODOS LOS FRAMES DE LA GRABACIÓN
      for (let i = 0; i < recordedFrames.length; i++) {
        const frame = recordedFrames[i]
        
        const message = {
          type: "recording_frame",
          data: frame,
          timestamp: Date.now(),
          frame_index: i,
          total_frames: recordedFrames.length,
          is_complete: i === recordedFrames.length - 1 // Último frame
        }

        wsRef.current.send(JSON.stringify(message))
        
        // Pequeña pausa entre frames para no saturar
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      console.log("[v0] Grabación enviada completamente")
      
    } catch (err) {
      console.error("[v0] Error enviando grabación:", err)
      setIsProcessing(false)
      alert("Error enviando la grabación")
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
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      setIsCameraOn(true)
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
    stopRecording()
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
    setIsCameraOn(false)
  }

  const toggleCameraOnOff = () => {
    if (isCameraOn) {
      stopCamera()
    } else {
      startCamera()
    }
  }

  const toggleCamera = () => {
    const newMode = facingMode === "user" ? "environment" : "user"
    setFacingMode(newMode)
    if (isCameraOn) {
      startCamera(newMode)
    }
  }

  const toggleEditing = () => {
    setIsEditing(!isEditing)
  }

  // 🔥 NUEVO: Reiniciar todo
  const resetAll = () => {
    stopRecording()
    setRecordedFrames([])
    setDetectedWord("")
    setDetectionConfidence(0)
    setIsProcessing(false)
  }

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      stopRecording()
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
        
        {/* 🔥 CAMBIO: Indicador de estado de grabación */}
        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-xs text-red-400">GRABANDO</span>
            </div>
          )}
          {isProcessing && (
            <div className="flex items-center gap-1 bg-blue-500/20 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-xs text-blue-400">PROCESANDO</span>
            </div>
          )}
        </div>

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
        <h1 className="text-center text-xl font-bold tracking-wider">
          {isRecording ? "GRABANDO SEÑA..." : "GRABADOR DE SEÑAS"}
        </h1>
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

      {/* 🔥 CAMBIO: Mostrar estado de grabación y resultado */}
      <div className="px-6 py-2 shrink-0">
        <div className="text-center">
          {isProcessing ? (
            <div className="space-y-1">
              <div className="text-lg text-blue-400 animate-pulse">
                Analizando grabación...
              </div>
              <div className="text-xs text-zinc-400">
                {recordedFrames.length} frames capturados
              </div>
            </div>
          ) : detectedWord ? (
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-400">
                {detectedWord}
                <span className="text-lg text-green-300 ml-2">
                  ({Math.round(detectionConfidence * 100)}%)
                </span>
              </div>
              <div className="text-xs text-zinc-400">
                Palabra detectada
              </div>
            </div>
          ) : isRecording ? (
            <div className="space-y-1">
              <div className="text-lg text-red-400">
                Grabando... {recordedFrames.length} frames
              </div>
              <div className="text-xs text-zinc-400">
                Haz tu seña completa
              </div>
            </div>
          ) : (
            <div className="text-lg text-zinc-500">
              {isConnected && isCameraOn ? "Listo para grabar" : "Conecta y activa la cámara"}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 px-6 py-3 min-h-0">
        <div className="relative mx-auto h-full max-w-sm overflow-hidden rounded-lg bg-pink-300">
          {!isCameraOn ? (
            <div className="flex h-full w-full items-center justify-center bg-zinc-900">
              <div className="text-center">
                <Play className="h-12 w-12 text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">Activa la cámara para comenzar</p>
              </div>
            </div>
          ) : cameraError ? (
            <div className="flex h-full w-full items-center justify-center bg-zinc-900">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">Cámara no disponible</p>
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

      {/* 🔥 CAMBIO: Controles de grabación */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 shrink-0">
        <button onClick={toggleCamera} className="rounded-full p-2 hover:bg-zinc-800 transition-colors">
          <RotateCw className="h-6 w-6 text-zinc-400" />
        </button>
        
        {!isRecording ? (
          <button 
            onClick={startRecording} 
            disabled={!isConnected || !isCameraOn}
            className="rounded-full p-4 bg-red-500 hover:bg-red-600 disabled:bg-zinc-700 disabled:cursor-not-allowed transition-colors"
          >
            <Play className="h-8 w-8 text-white" />
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="rounded-full p-4 bg-red-500 hover:bg-red-600 transition-colors"
          >
            <Square className="h-8 w-8 text-white" />
          </button>
        )}
        
        <button onClick={toggleEditing} className="rounded-full p-2 hover:bg-zinc-800 transition-colors">
          <Edit3 className={`h-6 w-6 ${isEditing ? "text-purple-400" : "text-zinc-400"}`} />
        </button>
      </div>

      {/* 🔥 CAMBIO: Botones de acción */}
      <div className="flex gap-3 px-6 pb-4 shrink-0">
        <Button
          onClick={resetAll}
          variant="outline"
          className="flex-1 border-2 border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-base font-semibold py-4"
        >
          REINICIAR
        </Button>
        
        <Button
          onClick={sendRecordingForAnalysis}
          disabled={!recordedFrames.length || isProcessing || isRecording}
          variant="outline"
          className="flex-1 border-2 border-green-500 bg-transparent text-green-500 hover:bg-green-500/10 disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-400 text-base font-semibold py-4"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              ANALIZANDO
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              ANALIZAR GRABACIÓN
            </div>
          )}
        </Button>
      </div>

      {/* 🔥 INFO: Estado de la grabación */}
      <div className="px-6 pb-3 shrink-0">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
          <div className="text-xs text-zinc-400 text-center">
            {recordedFrames.length > 0 ? (
              `📹 ${recordedFrames.length} frames grabados - Listos para analizar`
            ) : (
              "🎥 Graba una seña completa y luego analízala"
            )}
          </div>
        </div>
      </div>
    </div>
  )
}