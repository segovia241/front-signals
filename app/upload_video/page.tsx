"use client"

import { useState, useRef, useEffect } from "react"
import { useVideoUpload } from "@/hooks/use-video-upload"
import { Button } from "@/components/ui/button"
import { Volume2, ArrowLeft, Upload, Video, X, Play, Pause, RotateCcw } from "lucide-react"

export default function VideoUploadPage() {
  const { 
    isConnected, 
    isProcessing, 
    prediction, 
    error, 
    videoInfo,
    progress,
    videoRef, 
    canvasRef,
    loadVideoFile,
    connect, 
    disconnect,
    togglePause
  } = useVideoUpload()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [debugInfo, setDebugInfo] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (error) {
      setDebugInfo(`Error: ${error}`)
    }
  }, [error])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('video/')) {
        setDebugInfo("❌ Tipo de archivo no válido")
        return
      }
      
      setSelectedFile(file)
      setDebugInfo(`📁 Cargando: ${file.name}`)
      
      // Reiniciar estado si hay una conexión previa
      if (isConnected) {
        await handleStop()
      }

      // Cargar el archivo de video
      const loaded = await loadVideoFile(file)
      if (loaded) {
        setDebugInfo(`✅ Video cargado: ${file.name}`)
      } else {
        setDebugInfo("❌ Error cargando video")
      }
    }
  }

  const clearFile = async () => {
    setSelectedFile(null)
    setDebugInfo("")
    if (isConnected) {
      await handleStop()
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    if (videoRef.current) {
      videoRef.current.src = ""
    }
  }

  const handleStart = async () => {
    if (!selectedFile) {
      setDebugInfo("❌ No hay video seleccionado")
      return
    }
    
    console.log("🚀 Iniciando procesamiento de video...")
    setIsStarting(true)
    setDebugInfo("Conectando con el modelo...")
    
    try {
      await connect(
        (data) => {
          console.log("[VIDEO_UPLOAD] WebSocket message:", data)
          if (data.has_hand_detection !== undefined) {
            setDebugInfo(prev => 
              `Detección de manos: ${data.has_hand_detection ? "SÍ" : "NO"} | Predicción: ${data.prediction}`
            )
          }
        },
        (error) => {
          console.error("[VIDEO_UPLOAD] WebSocket error:", error)
          setDebugInfo(`Error de conexión: ${error}`)
          setIsStarting(false)
        },
        () => {
          console.log("[VIDEO_UPLOAD] WebSocket closed")
          setDebugInfo("Conexión cerrada")
          setIsStarting(false)
        },
      )
      
    } catch (error) {
      console.error("[VIDEO_UPLOAD] Failed to start:", error)
      setDebugInfo(`Error iniciando: ${error}`)
      setIsStarting(false)
    }
  }

  const handleStop = async () => {
    console.log("🛑 Deteniendo procesamiento...")
    setDebugInfo("Deteniendo...")
    await disconnect()
    setIsStarting(false)
    setDebugInfo("Procesamiento detenido")
  }

  const handleBack = () => {
    if (isConnected) {
      handleStop()
    }
    console.log("Navigate back")
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

  return (
    <div className="h-screen w-screen bg-[#1a1a1a] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-[#2a2a2a] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <button 
          onClick={handleBack} 
          className="p-2 hover:bg-white/10 rounded-lg transition-colors" 
          aria-label="Volver"
        >
          <ArrowLeft className="h-6 w-6 text-purple-400" />
        </button>

        <h1 className="text-white text-lg font-semibold tracking-wide">TRANSCRIPCIÓN DE VIDEO</h1>

        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden">
          <img src="/diverse-user-avatars.png" alt="Usuario" className="w-full h-full object-cover" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 p-4 gap-4">
        {/* Upload Area */}
        <div className="bg-[#2a2a2a] rounded-xl p-4">
          <div className="text-center mb-4">
            <h2 className="text-white text-xl font-semibold mb-2">Sube tu video</h2>
            <p className="text-white/60 text-sm">Selecciona un video que muestre claramente las manos y señas</p>
          </div>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-400/30 rounded-xl p-8 cursor-pointer hover:border-purple-400/50 transition-colors bg-black/20">
            <Upload className="h-12 w-12 text-purple-400 mb-3" />
            <span className="text-white text-lg font-medium">Haz clic para seleccionar video</span>
            <span className="text-white/50 text-sm mt-2">Formatos: MP4, MOV, AVI</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          
          {selectedFile && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-white font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-white/50 text-xs">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    {videoInfo?.duration && ` • ${Math.round(videoInfo.duration)}s`}
                  </p>
                </div>
              </div>
              <button
                onClick={clearFile}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                aria-label="Quitar archivo"
              >
                <X className="h-4 w-4 text-white/60" />
              </button>
            </div>
          )}
        </div>

        {/* Video Preview & Processing */}
        <div className="relative bg-black rounded-xl flex-1 min-h-0 overflow-hidden">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-contain rounded-xl bg-black"
          />
          
          {!selectedFile && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
              <div className="text-center px-4">
                <Video className="mx-auto h-20 w-20 text-purple-400/30 mb-4" />
                <p className="text-white/50 text-lg">Vista previa del video</p>
                <p className="text-white/30 text-sm mt-2">Selecciona un archivo para comenzar</p>
              </div>
            </div>
          )}

          {/* Controles de video */}
          {selectedFile && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              <button
                onClick={handleReplay}
                className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
                aria-label="Reiniciar"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
              <button
                onClick={togglePause}
                className="bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-colors"
                aria-label={videoRef.current?.paused ? "Reproducir" : "Pausar"}
              >
                {videoRef.current?.paused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
              </button>
            </div>
          )}

          {/* Barra de progreso */}
          {isProcessing && (
            <div className="absolute bottom-0 left-0 right-0 bg-purple-500/30 h-1">
              <div 
                className="bg-purple-500 h-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Estado de procesamiento */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-xl">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                <p className="text-white text-lg font-medium">Procesando video</p>
                <p className="text-white/60 text-sm mt-2">
                  {Math.round(progress)}% completado
                </p>
              </div>
            </div>
          )}

          {/* Indicador de estado */}
          {isConnected && (
            <div className="absolute top-4 left-4">
              <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                EN VIVO
              </div>
            </div>
          )}

          {/* Resultado de predicción */}
          {prediction?.prediction && prediction.prediction !== "---" && (
            <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-6 py-4 rounded-xl border border-purple-500/30">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-300 mb-1">
                  {prediction.prediction}
                </div>
                <div className="text-sm text-white/70">
                  Confianza: {Math.round(prediction.confidence * 100)}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Información de debug */}
        {debugInfo && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-xs font-mono">{debugInfo}</p>
          </div>
        )}

        {/* Mensajes de error */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer Actions */}
      <div className="bg-[#2a2a2a] px-4 py-4 flex gap-3 border-t border-white/10 flex-shrink-0">
        <Button
          onClick={handleBack}
          variant="outline"
          size="lg"
          className="flex-1 bg-transparent hover:bg-white/10 text-white border border-white/20 h-14 text-base font-semibold rounded-xl"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          VOLVER
        </Button>

        <Button
          onClick={isConnected ? handleStop : handleStart}
          disabled={!selectedFile || (isStarting && !isConnected)}
          size="lg"
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 h-14 text-base font-semibold rounded-xl shadow-lg"
        >
          {isConnected ? (
            "DETENER"
          ) : isStarting ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              CONECTANDO...
            </div>
          ) : (
            "PROCESAR VIDEO"
          )}
        </Button>

        {prediction?.prediction && prediction.prediction !== "---" && (
          <button
            onClick={handlePlayAudio}
            className="px-4 hover:bg-white/5 rounded-xl transition-colors flex items-center justify-center"
            aria-label="Escuchar audio"
          >
            <Volume2 className="h-6 w-6 text-white" />
          </button>
        )}
      </div>

      {/* Canvas oculto para procesamiento */}
      <canvas ref={canvasRef} width="640" height="480" style={{ display: "none" }} />
    </div>
  )
}