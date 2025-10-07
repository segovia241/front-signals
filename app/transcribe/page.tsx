"use client"

import { useState, useEffect, useRef } from "react"
import { useSignLanguage } from "@/hooks/use-sign-language"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Video, VideoOff, Activity, Hand } from "lucide-react"

export default function SignLanguagePage() {
  const { isConnected, prediction, frame, connect, disconnect } = useSignLanguage()
  const [isStarting, setIsStarting] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const startCamera = async () => {
      if (isConnected && !streamRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
          })
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
          console.log("[v0] Camera started successfully")
        } catch (error) {
          console.error("[v0] Error accessing camera:", error)
          setIsCameraActive(false)
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
        console.log("[v0] Camera stopped")
      }
    }

    startCamera()
    stopCamera()
  }, [isConnected])

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

  const handleVideoLoaded = () => {
    setIsCameraActive(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Hand className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">SignSpeak</h1>
                <p className="text-sm text-muted-foreground">Reconocimiento en Tiempo Real</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <Badge variant="outline" className="gap-1.5 border-green-500/50 bg-green-500/10 text-green-500">
                  <Activity className="h-3 w-3 animate-pulse" />
                  Conectado
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Video Feed */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden border-border bg-card">
              <div className="aspect-video bg-muted relative">
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
                      <Video className="mx-auto h-16 w-16 text-muted-foreground/50" />
                      <p className="mt-4 text-sm text-muted-foreground">
                        {isConnected ? "Esperando señal de cámara..." : "Presiona iniciar para comenzar"}
                      </p>
                    </div>
                  </div>
                )}

                {prediction?.hasHandDetection && (
                  <div className="absolute top-4 right-4">
                    <Badge className="gap-1.5 bg-green-500 text-white">
                      <Hand className="h-3 w-3" />
                      Mano detectada
                    </Badge>
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {isConnected ? "Cámara activa" : "Cámara inactiva"}
                  </div>
                  <Button
                    onClick={isConnected ? handleStop : handleStart}
                    disabled={isStarting && !isConnected}
                    variant={isConnected ? "destructive" : "default"}
                    className="gap-2"
                  >
                    {isConnected ? (
                      <>
                        <VideoOff className="h-4 w-4" />
                        Detener
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4" />
                        {isStarting ? "Iniciando..." : "Iniciar Cámara"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Predictions Panel */}
          <div className="space-y-6">
            {/* Current Prediction */}
            <Card className="border-border bg-card p-6">
              <h2 className="mb-4 text-sm font-medium text-muted-foreground">Predicción Actual</h2>
              {prediction?.prediction ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="mb-2 text-6xl font-bold text-primary">{prediction.prediction}</div>
                    <div className="text-sm text-muted-foreground">
                      Confianza: {(prediction.confidence * 100).toFixed(1)}%
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="space-y-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${prediction.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Hand className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-sm text-muted-foreground">Esperando detección de señas...</p>
                </div>
              )}
            </Card>

            {/* All Predictions */}
            {prediction?.allPredictions && prediction.allPredictions.length > 0 && (
              <Card className="border-border bg-card p-6">
                <h2 className="mb-4 text-sm font-medium text-muted-foreground">Todas las Predicciones</h2>
                <div className="space-y-2">
                  {prediction.allPredictions.slice(0, 5).map((pred: any, index: number) => (
                    <div key={index} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                          {pred.class}
                        </div>
                        <span className="text-sm font-medium text-foreground">Clase {pred.class}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{(pred.confidence * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Info Card */}
            <Card className="border-border bg-card p-6">
              <h2 className="mb-4 text-sm font-medium text-muted-foreground">Cómo Usar</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary">1.</span>
                  <span>Presiona "Iniciar Cámara" para comenzar</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">2.</span>
                  <span>Coloca tu mano frente a la cámara</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">3.</span>
                  <span>Realiza señas del lenguaje de señas</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">4.</span>
                  <span>Observa las predicciones en tiempo real</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
