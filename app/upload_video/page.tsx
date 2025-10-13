 "use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Volume2, Hand, ArrowLeft, Upload, Video, X } from "lucide-react"

export default function VideoUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [prediction, setPrediction] = useState<{prediction: string, confidence: number} | null>(null)
  const [error, setError] = useState<string>("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validar que sea un archivo de video
      if (!file.type.startsWith('video/')) {
        setError("Por favor selecciona un archivo de video válido")
        return
      }
      
      // Validar tamaño (opcional: máximo 100MB)
      if (file.size > 100 * 1024 * 1024) {
        setError("El archivo es demasiado grande. Máximo 100MB")
        return
      }
      
      setSelectedFile(file)
      setError("")
      setPrediction(null)
      
      // Cargar el video en el elemento video
      if (videoRef.current) {
        const url = URL.createObjectURL(file)
        videoRef.current.src = url
        videoRef.current.load()
      }
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setPrediction(null)
    if (videoRef.current) {
      videoRef.current.src = ""
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const processVideo = async () => {
    if (!selectedFile) return
    
    setIsProcessing(true)
    setError("")
    
    try {
      const formData = new FormData()
      formData.append('video', selectedFile)
      
      // Llamar a la API para procesar el video
      const response = await fetch('/api/process-video', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error al procesar el video')
      }
      
      const result = await response.json()
      setPrediction(result)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al procesar el video')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBack = () => {
    // Add your navigation logic here
    console.log("Navigate back")
  }

  const handlePlayAudio = () => {
    if (prediction?.prediction) {
      // Implementar lectura del texto en voz alta
      const utterance = new SpeechSynthesisUtterance(prediction.prediction)
      utterance.lang = 'es-ES'
      speechSynthesis.speak(utterance)
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
            <p className="text-white/60 text-sm">Selecciona un archivo de video para transcribir lenguaje de señas</p>
          </div>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-400/30 rounded-xl p-8 cursor-pointer hover:border-purple-400/50 transition-colors bg-black/20">
            <Upload className="h-12 w-12 text-purple-400 mb-3" />
            <span className="text-white text-lg font-medium">Haz clic para seleccionar video</span>
            <span className="text-white/50 text-sm mt-2">Formatos: MP4, MOV, AVI (Max. 100MB)</span>
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

        {/* Video Preview */}
        <div className="relative bg-black rounded-xl flex-1 min-h-0 overflow-hidden">
          <video
            ref={videoRef}
            controls
            className="w-full h-full object-contain rounded-xl"
          />
          
          {!selectedFile && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl">
              <div className="text-center px-4">
                <Video className="mx-auto h-20 w-20 text-purple-400/30 mb-4" />
                <p className="text-white/50 text-lg">Vista previa del video</p>
                <p className="text-white/30 text-sm mt-2">Selecciona un archivo para verlo aquí</p>
              </div>
            </div>
          )}

          {/* Prediction Result */}
          {prediction && (
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

        {/* Status Messages */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
              <p className="text-blue-400 text-sm">Procesando video, por favor espera...</p>
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
          onClick={processVideo}
          disabled={!selectedFile || isProcessing}
          size="lg"
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 h-14 text-base font-semibold rounded-xl shadow-lg"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              PROCESANDO
            </div>
          ) : (
            "TRANSCRIBIR VIDEO"
          )}
        </Button>

        {prediction && (
          <button
            onClick={handlePlayAudio}
            className="px-4 hover:bg-white/5 rounded-xl transition-colors flex items-center justify-center"
            aria-label="Escuchar audio"
          >
            <Volume2 className="h-6 w-6 text-white" />
          </button>
        )}
      </div>
    </div>
  )
}