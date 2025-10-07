"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSignLanguage } from "@/hooks/use-sign-language"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Video, VideoOff } from "lucide-react"

export default function TranscribePage() {
  const router = useRouter()
  const { isConnected, prediction, connect, disconnect } = useSignLanguage()
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const startCamera = async () => {
      if (isConnected && !streamRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" },
            audio: false,
          })
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        } catch (error) {
          console.error("[v0] Error accessing camera:", error)
        }
      }
    }

    const stopCamera = () => {
      if (!isConnected && streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
        setIsCameraActive(false)
      }
    }

    startCamera()
    stopCamera()
  }, [isConnected])

  const handleStart = async () => {
    try {
      await connect()
    } catch (error) {
      console.error("[v0] Failed to start:", error)
    }
  }

  const handleStop = async () => {
    await disconnect()
  }

  const handleVideoLoaded = () => {
    setIsCameraActive(true)
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#0a0a1f]">
      <div className="flex items-center gap-4 bg-black/30 px-4 py-4">
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

      <div className="relative flex-1">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={handleVideoLoaded}
          className="h-full w-full object-cover"
          style={{ display: isCameraActive ? "block" : "none" }}
        />

        {!isCameraActive && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Video className="mx-auto h-16 w-16 text-white/30" />
              <p className="mt-4 text-sm text-white/60">
                {isConnected ? "Esperando señal de cámara..." : "Presiona iniciar para comenzar"}
              </p>
            </div>
          </div>
        )}

        {prediction?.prediction && (
          <div className="absolute bottom-32 left-0 right-0 flex justify-center px-6">
            <div className="rounded-2xl bg-black/70 px-8 py-6 backdrop-blur-sm">
              <div className="text-center text-6xl font-bold text-white">{prediction.prediction}</div>
              <div className="mt-2 text-center text-sm text-white/70">
                {(prediction.confidence * 100).toFixed(0)}% confianza
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-black/30 px-6 py-6">
        <Button
          onClick={isConnected ? handleStop : handleStart}
          className={`h-16 w-full rounded-xl text-lg font-bold ${
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
