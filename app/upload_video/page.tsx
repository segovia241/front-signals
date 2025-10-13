"use client"

import { useState, useRef, useEffect } from "react"
import { useVideoUpload } from "@/hooks/use-video-upload"
import { Button } from "@/components/ui/button"
import { Volume2, ArrowLeft, Upload, Video, X, Play, Pause, RotateCcw } from "lucide-react"
import router from "next/router"

export default function VideoUploadPage() {
  const { 
    isConnected, 
    isProcessing, 
    prediction, 
    error, 
    videoInfo,
    progress,
    hasCompleted,
    videoRef, 
    canvasRef,
    loadVideoFile,
    connect, 
    disconnect,
    reprocess,
    togglePause
  } = useVideoUpload()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('video/')) {
        return
      }
      
      setSelectedFile(file)
      
      if (isConnected) {
        await handleStop()
      }

      const loaded = await loadVideoFile(file)
      if (!loaded) {
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }
  }

  const clearFile = async () => {
    if (isConnected) {
      await handleStop()
    }
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    if (videoRef.current) {
      videoRef.current.src = ""
    }
  }

  const handleStart = async () => {
    if (!selectedFile) return
    
    setIsStarting(true)
    
    try {
      await connect(
        (data) => {
          console.log("[VIDEO_UPLOAD]", data)
        },
        (error) => {
          console.error("[VIDEO_UPLOAD] Error:", error)
          setIsStarting(false)
        },
        () => {
          setIsStarting(false)
        },
      )
      
    } catch (error) {
      console.error("[VIDEO_UPLOAD] Failed to start:", error)
      setIsStarting(false)
    }
  }

  const handleStop = async () => {
    await disconnect()
    setIsStarting(false)
  }

  const handleReprocess = async () => {
    await reprocess()
  }

  const handleBack = () => {
    if (isConnected) {
      handleStop()
    }
  }

  const handlePlayAudio = () => {
    if (prediction?.prediction && prediction.prediction !== "---") {
      const utterance = new SpeechSynthesisUtterance(prediction.prediction)
      utterance.lang = 'es-ES'
      speechSynthesis.speak(utterance)
    }
  }

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(console.error)
    }
  }

  // Determinar el texto del botón principal
  const getButtonText = () => {
    if (hasCompleted) {
      return "REPROCESAR"
    } else if (isConnected) {
      return "DETENER"
    } else if (isStarting) {
      return (
        <div className="flex items-center gap-1">
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
          CONECTANDO...
        </div>
      )
    } else {
      return "PROCESAR"
    }
  }

  // Determinar la acción del botón principal
  const handleMainAction = () => {
    if (hasCompleted) {
      handleReprocess()
    } else if (isConnected) {
      handleStop()
    } else {
      handleStart()
    }
  }

  return (
    <div className="h-screen w-screen bg-[#1a1a1a] flex flex-col overflow-hidden">
      {/* Header compacto */}
      <header className="bg-[#2a2a2a] px-4 py-2 flex items-center justify-between flex-shrink-0">
        <button 
          onClick={handleBack} 
          className="p-2 hover:bg-white/10 rounded-lg transition-colors" 
        >
          <ArrowLeft className="h-5 w-5 text-purple-400" />
        </button>

        <h1 className="text-white text-base font-semibold">TRANSCRIPCIÓN DE VIDEO</h1>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden">
          <img src="/diverse-user-avatars.png" alt="Usuario" className="w-full h-full object-cover" />
        </div>
      </header>

      {/* Main Content más compacto */}
      <main className="flex-1 flex flex-col min-h-0 p-3 gap-3">
        {/* Upload Area compacta */}
        <div className="bg-[#2a2a2a] rounded-lg p-3">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-400/30 rounded-lg p-4 cursor-pointer hover:border-purple-400/50 transition-colors bg-black/20">
            <Upload className="h-8 w-8 text-purple-400 mb-2" />
            <span className="text-white text-sm font-medium">Seleccionar video</span>
            <span className="text-white/50 text-xs mt-1">MP4, MOV, AVI</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          
          {selectedFile && (
            <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-green-400" />
                <div>
                  <p className="text-white font-medium text-xs">{selectedFile.name}</p>
                  <p className="text-white/50 text-xs">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    {videoInfo?.duration && ` • ${Math.round(videoInfo.duration)}s`}
                  </p>
                </div>
              </div>
              <button
                onClick={clearFile}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="h-3 w-3 text-white/60" />
              </button>
            </div>
          )}
        </div>

        {/* Video Preview - área principal */}
        <div className="relative bg-black rounded-lg flex-1 min-h-0 overflow-hidden">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-contain rounded-lg bg-black"
          />
          
          {!selectedFile && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center px-4">
                <Video className="mx-auto h-12 w-12 text-purple-400/30 mb-2" />
                <p className="text-white/50 text-sm">Selecciona un video</p>
              </div>
            </div>
          )}

          {/* Controles de video */}
          {selectedFile && (
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
              <button
                onClick={handleReplay}
                className="bg-black/70 hover:bg-black/90 text-white p-1.5 rounded-full transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={togglePause}
                className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
              >
                {videoRef.current?.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
            </div>
          )}

          {/* Barra de progreso */}
          {(isProcessing || hasCompleted) && (
            <div className="absolute bottom-0 left-0 right-0 bg-purple-500/30 h-1">
              <div 
                className={`h-full transition-all duration-100 ${
                  hasCompleted ? 'bg-green-500' : 'bg-purple-500'
                }`}
                style={{ width: `${hasCompleted ? 100 : progress}%` }}
              />
            </div>
          )}

          {/* Estado de procesamiento */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-purple-500 border-t-transparent mx-auto mb-2"></div>
                <p className="text-white text-sm font-medium">Procesando</p>
                <p className="text-white/60 text-xs mt-1">
                  {Math.round(progress)}% completado
                </p>
              </div>
            </div>
          )}

          {/* Estado completado */}
          {hasCompleted && !isProcessing && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full"></div>
                </div>
                <p className="text-white text-sm font-medium">Procesamiento completado</p>
                <p className="text-white/60 text-xs mt-1">
                  Video analizado al 100%
                </p>
              </div>
            </div>
          )}

          {/* Indicador de estado */}
          {isConnected && (
            <div className="absolute top-3 left-3">
              <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                EN VIVO
              </div>
            </div>
          )}

          {/* Resultado de predicción */}
          {prediction?.prediction && prediction.prediction !== "---" && (
            <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-purple-500/30">
              <div className="text-center">
                <div className="text-xl font-bold text-purple-300">
                  {prediction.prediction}
                </div>
                <div className="text-xs text-white/70">
                  {Math.round(prediction.confidence * 100)}% confianza
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mensajes de error */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}
      </main>

      {/* Footer Actions */}
      <div className="bg-[#2a2a2a] px-3 py-3 flex gap-2 border-t border-white/10 flex-shrink-0">
        <Button
          onClick={() => router.push("/transcribe")}
          variant="outline"
          size="sm"
          className="flex-1 bg-transparent hover:bg-white/10 text-white border border-white/20 h-12 text-sm font-semibold rounded-lg"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          VOLVER
        </Button>

        <Button
          onClick={handleMainAction}
          disabled={!selectedFile || (isStarting && !isConnected && !hasCompleted)}
          size="sm"
          className={`flex-1 border-0 h-12 text-sm font-semibold rounded-lg ${
            hasCompleted 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
          }`}
        >
          {getButtonText()}
        </Button>

        {prediction?.prediction && prediction.prediction !== "---" && (
          <button
            onClick={handlePlayAudio}
            className="px-3 hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center"
          >
            <Volume2 className="h-5 w-5 text-white" />
          </button>
        )}
      </div>

      {/* Canvas oculto para procesamiento */}
      <canvas ref={canvasRef} width="640" height="480" style={{ display: "none" }} />
    </div>
  )
}