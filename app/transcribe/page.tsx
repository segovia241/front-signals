"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSignLanguage } from "@/hooks/use-sign-language"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Video, VideoOff, Hand } from "lucide-react"
import Image from "next/image"

export default function TranscribePage() {
  const router = useRouter()
  const { isConnected, prediction, frame, connect, disconnect } = useSignLanguage()
  const [transcribedWords, setTranscribedWords] = useState<string[]>([])
  const [lastPrediction, setLastPrediction] = useState<string>("")

  useEffect(() => {
    if (prediction?.prediction && prediction.prediction !== lastPrediction) {
      setLastPrediction(prediction.prediction)
      setTranscribedWords((prev) => [...prev, prediction.prediction])
    }
  }, [prediction?.prediction, lastPrediction])

  const handleStart = async () => {
    try {
      setTranscribedWords([])
      setLastPrediction("")
      await connect()
    } catch (error) {
      console.error("Failed to start:", error)
    }
  }

  const handleStop = async () => {
    await disconnect()
  }

  const handleClear = () => {
    setTranscribedWords([])
    setLastPrediction("")
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-gradient-to-br from-[#0a0a1f] via-[#1a1a3f] to-[#0a0a1f]">
      <div className="flex items-center gap-4 bg-black/30 px-4 py-4 backdrop-blur-sm">
        <Button
          onClick={() => router.push("/menu")}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold text-white">Transcripción en Tiempo Real</h1>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {frame && isConnected ? (
          <div className="flex h-full items-center justify-center bg-black">
            <Image
              src={`data:image/jpeg;base64,${frame}`}
              alt="Sign language detection"
              width={640}
              height={480}
              className="h-full w-full object-contain"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Hand className="mx-auto h-16 w-16 text-purple-400/30" />
              <p className="mt-4 text-sm text-white/60">
                {isConnected ? "Esperando señal de cámara..." : "Presiona iniciar para comenzar"}
              </p>
            </div>
          </div>
        )}

        {prediction?.prediction && (
          <div className="absolute left-0 right-0 top-6 flex justify-center px-6">
            <div className="rounded-2xl border-2 border-purple-400/30 bg-black/80 px-8 py-4 backdrop-blur-md">
              <div className="text-center text-xs font-medium uppercase tracking-wider text-purple-300">Detectando</div>
              <div className="mt-1 text-center text-5xl font-bold text-white">{prediction.prediction}</div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <div className="text-center text-sm text-white/70">
                  {(prediction.confidence * 100).toFixed(0)}% confianza
                </div>
              </div>
              {prediction.hasHandDetection && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-green-400">
                  <Hand className="h-3 w-3" />
                  <span>Mano detectada</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-black/40 px-6 py-4 backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-purple-300">Palabras Traducidas</h2>
          {transcribedWords.length > 0 && (
            <Button
              onClick={handleClear}
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-white/60 hover:bg-white/10 hover:text-white"
            >
              Limpiar
            </Button>
          )}
        </div>
        <div className="min-h-[60px] rounded-lg bg-white/5 p-4">
          {transcribedWords.length > 0 ? (
            <p className="text-lg leading-relaxed text-white">{transcribedWords.join(" ")}</p>
          ) : (
            <p className="text-sm italic text-white/40">Las palabras traducidas aparecerán aquí...</p>
          )}
        </div>
      </div>

      <div className="bg-black/30 px-6 py-6 backdrop-blur-sm">
        <Button
          onClick={isConnected ? handleStop : handleStart}
          className={`h-16 w-full rounded-xl text-lg font-bold transition-all ${
            isConnected
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
          }`}
        >
          {isConnected ? (
            <>
              <VideoOff className="mr-2 h-5 w-5" />
              DETENER
            </>
          ) : (
            <>
              <Video className="mr-2 h-5 w-5" />
              INICIAR CÁMARA
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
