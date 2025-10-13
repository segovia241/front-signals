"use client"

import { useState, useEffect } from "react"
import { useSignLanguage } from "@/hooks/use-sign-language"
import { Button } from "@/components/ui/button"
import { Volume2, Hand, ArrowLeft } from "lucide-react"

export default function SignLanguagePage() {
  const { isConnected, isCameraInitialized, prediction, error, videoRef, canvasRef, connect, disconnect } =
    useSignLanguage()

  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    if (error) {
      console.error("[v0] Error:", error)
    }
  }, [error])

  const handleStart = async () => {
    setIsStarting(true)
    try {
      await connect(
        (data) => {
          console.log("[v0] WebSocket message:", data)
        },
        (error) => {
          console.error("[v0] WebSocket error:", error)
          setIsStarting(false)
        },
        () => {
          console.log("[v0] WebSocket closed")
          setIsStarting(false)
        },
      )
    } catch (error) {
      console.error("[v0] Failed to start:", error)
      setIsStarting(false)
    }
  }

  const handleStop = async () => {
    await disconnect()
    setIsStarting(false)
  }

  const handleBack = () => {
    if (isConnected) {
      handleStop()
    }
    // Add your navigation logic here
  }

  return (
    <div className="h-screen w-screen bg-[#1a1a1a] flex flex-col overflow-hidden">
      <header className="bg-[#2a2a2a] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors" aria-label="Volver">
          <Hand className="h-6 w-6 text-purple-400" />
        </button>

        <h1 className="text-white text-lg font-semibold tracking-wide">TRANSCRIPCIÓN</h1>

        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden">
          <img src="/diverse-user-avatars.png" alt="Usuario" className="w-full h-full object-cover" />
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0">
        {/* Video Feed */}
        <div className="relative bg-black flex-1 min-h-0">
          <div className="w-full h-full relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{
                display: isCameraInitialized ? "block" : "none",
                transform: "scaleX(-1)",
              }}
            />

            {!isCameraInitialized && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center px-4">
                  <Hand className="mx-auto h-16 w-16 text-purple-400/50 mb-4" />
                  <p className="text-white/70 text-sm">
                    {isStarting ? "Inicializando cámara..." : "Presiona GRABAR para comenzar"}
                  </p>
                </div>
              </div>
            )}

            {isConnected && (
              <div className="absolute top-4 left-4">
                <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  REC
                </div>
              </div>
            )}

            {prediction?.prediction && prediction.prediction !== "---" && (
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
                <div className="text-2xl font-bold">{prediction.prediction}</div>
                <div className="text-xs text-white/70">{Math.round(prediction.confidence * 100)}%</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-[#1a1a1a] px-6 py-4 flex flex-col justify-between min-h-0">
          <div className="flex-1 flex items-center">
            <p className="text-white text-lg leading-relaxed">
              Prestemos mucha atención. <span className="text-yellow-400 font-medium">Especialmente</span>, en las
              expresiones del rostro.
            </p>
          </div>

          {error && (
            <div className="mt-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button className="self-end p-3 hover:bg-white/5 rounded-full transition-colors mt-2" aria-label="Audio">
            <Volume2 className="h-7 w-7 text-white" />
          </button>
        </div>
      </main>

      <div className="bg-[#2a2a2a] px-4 py-3 flex gap-3 border-t border-white/10 flex-shrink-0">
        <Button
          onClick={handleBack}
          variant="outline"
          size="lg"
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white border-0 h-12 text-base font-semibold rounded-xl"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          VOLVER
        </Button>

        <Button
          onClick={isConnected ? handleStop : handleStart}
          disabled={isStarting && !isConnected}
          size="lg"
          className="flex-1 bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 text-white border-0 h-12 text-base font-semibold rounded-xl"
        >
          {isConnected ? "DETENER" : isStarting ? "CONECTANDO..." : "GRABAR"}
        </Button>
      </div>

      {/* Canvas oculto para procesamiento */}
      <canvas ref={canvasRef} width="640" height="480" style={{ display: "none" }} />
    </div>
  )
}