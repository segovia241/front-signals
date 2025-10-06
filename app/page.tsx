"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { useWebSocket } from "@/hooks/use-websocket"
import { useCamera } from "@/hooks/use-camera"
import { useRecording } from "@/hooks/use-recording"
import { ConnectionStatus } from "@/components/connection-status"
import { RecordingStatus } from "@/components/recording-status"
import { VideoDisplay } from "@/components/video-display"
import { RecordingControls } from "@/components/recording-controls"
import { ActionButtons } from "@/components/action-buttons"

export default function MirrorApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isEditing, setIsEditing] = useState(false)

  const { wsRef, isConnected, connectionError, isConnecting, connect, disconnect, sendMessage, onMessage } =
    useWebSocket()

  const { videoRef, facingMode, isCameraOn, cameraError, startCamera, stopCamera, toggleCamera, setCameraError } =
    useCamera()

  const captureFrame = useCallback((): string | null => {
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
  }, [videoRef])

  const {
    isRecording,
    recordedFrames,
    detectedWord,
    detectionConfidence,
    isProcessing,
    startRecording: startRecordingHook,
    stopRecording,
    resetRecording,
    setIsProcessing,
    setAnalysisResult,
  } = useRecording(captureFrame, stopCamera)

  useEffect(() => {
    onMessage((response) => {
      if (response.type === "analysis") {
        const data = response.data

        if (data.detected_word) {
          setAnalysisResult(data.detected_word, data.confidence || 0)
          console.log("[v0] Palabra detectada:", data.detected_word, "Confianza:", data.confidence)
        }

        console.log("[v0] Respuesta del servidor:", data)
      }
    })
  }, [onMessage, setAnalysisResult])

  const handleStartRecording = useCallback(async () => {
    if (!isConnected) {
      alert("Primero conecta el WebSocket")
      return
    }

    if (!isCameraOn) {
      await startCamera()
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    startRecordingHook()
  }, [isConnected, isCameraOn, startCamera, startRecordingHook])

  const sendRecordingForAnalysis = useCallback(async () => {
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
      for (let i = 0; i < recordedFrames.length; i++) {
        const frame = recordedFrames[i]

        const message = {
          type: "recording_frame",
          data: frame,
          timestamp: Date.now(),
          frame_index: i,
          total_frames: recordedFrames.length,
          is_complete: i === recordedFrames.length - 1,
        }

        sendMessage(message)

        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      console.log("[v0] Grabación enviada completamente")
    } catch (err) {
      console.error("[v0] Error enviando grabación:", err)
      setIsProcessing(false)
      alert("Error enviando la grabación")
    }
  }, [recordedFrames, wsRef, sendMessage, setIsProcessing])

  const handleClearErrors = useCallback(() => {
    setCameraError(null)
  }, [setCameraError])

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-white overflow-hidden">
      <canvas ref={canvasRef} className="hidden" />

      <ConnectionStatus
        isConnected={isConnected}
        isConnecting={isConnecting}
        connectionError={connectionError}
        cameraError={cameraError}
        isRecording={isRecording}
        isProcessing={isProcessing}
        onConnect={connect}
        onDisconnect={disconnect}
        onClearErrors={handleClearErrors}
      />

      <div className="px-4 pb-2 shrink-0">
        <h1 className="text-center text-xl font-bold tracking-wider">
          {isRecording ? "GRABANDO SEÑA..." : "GRABADOR DE SEÑAS"}
        </h1>
        <div className="mt-1 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
      </div>

      <RecordingStatus
        isProcessing={isProcessing}
        detectedWord={detectedWord}
        detectionConfidence={detectionConfidence}
        isRecording={isRecording}
        recordedFrames={recordedFrames.length}
        isConnected={isConnected}
        isCameraOn={isCameraOn}
      />

      <VideoDisplay videoRef={videoRef} isCameraOn={isCameraOn} cameraError={cameraError} facingMode={facingMode} />

      <RecordingControls
        isRecording={isRecording}
        isConnected={isConnected}
        isCameraOn={isCameraOn}
        isEditing={isEditing}
        onToggleCamera={toggleCamera}
        onStartRecording={handleStartRecording}
        onStopRecording={stopRecording}
        onToggleEditing={() => setIsEditing(!isEditing)}
      />

      <ActionButtons
        recordedFrames={recordedFrames.length}
        isProcessing={isProcessing}
        isRecording={isRecording}
        onReset={resetRecording}
        onAnalyze={sendRecordingForAnalysis}
      />
    </div>
  )
}
