"use client"

import { useState, useEffect, useRef } from "react"
import { useSignLanguage } from "@/hooks/use-sign-language"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Video, VideoOff, Activity, Hand, Camera } from "lucide-react"

export default function SignLanguagePage() {
  const {
    isConnected,
    isCameraInitialized,
    prediction,
    error,
    videoRef,
    canvasRef,
    connect,
    disconnect,
    captureSingleFrame,
  } = useSignLanguage()

  const [isStarting, setIsStarting] = useState(false)
  const [isCapturingFrame, setIsCapturingFrame] = useState(false)

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

  const handleCaptureFrame = async () => {
    setIsCapturingFrame(true)
    try {
      const result = await captureSingleFrame()
      console.log("[v0] Single frame result:", result)
    } catch (error) {
      console.error("[v0] Failed to capture frame:", error)
    } finally {
      setIsCapturingFrame(false)
    }
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
              {isCameraInitialized && (
                <Badge variant="outline" className="gap-1.5 border-blue-500/50 bg-blue-500/10 text-blue-500">
                  <Camera className="h-3 w-3" />
                  Cámara Activa
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
            <div className="flex items-center gap-2 text-red-500">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">Error: {error}</span>
            </div>
          </div>
        )}

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
                  className="h-full w-full object-cover"
                  style={{ 
                    display: isCameraInitialized ? "block" : "none",
                    transform: "scaleX(-1)" // Espejo para selfie
                  }}
                />
                {!isCameraInitialized && (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <Video className="mx-auto h-16 w-16 text-muted-foreground/50" />
                      <p className="mt-4 text-sm text-muted-foreground">
                        {isStarting ? "Inicializando cámara..." : "Presiona iniciar para comenzar"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Overlay para información de estado */}
                {isCameraInitialized && (
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    {prediction?.hasHandDetection && (
                      <Badge className="gap-1.5 bg-green-500 text-white">
                        <Hand className="h-3 w-3" />
                        Mano detectada
                      </Badge>
                    )}
                    {prediction?.sequenceReady && (
                      <Badge className="gap-1.5 bg-blue-500 text-white">
                        <Activity className="h-3 w-3" />
                        Secuencia lista
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`} />
                    {isConnected ? "Conectado al servidor" : "Desconectado"}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCaptureFrame}
                      disabled={!isCameraInitialized || isCapturingFrame}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      {isCapturingFrame ? "Capturando..." : "Frame Único"}
                    </Button>
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
                          {isStarting ? "Conectando..." : "Iniciar Cámara"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Predictions Panel */}
          <div className="space-y-6">
            {/* Current Prediction */}
            <Card className="border-border bg-card p-6">
              <h2 className="mb-4 text-sm font-medium text-muted-foreground">Predicción Actual</h2>
              {prediction?.prediction && prediction.prediction !== "---" ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="mb-2 text-6xl font-bold text-primary">{prediction.prediction}</div>
                    <div className="text-sm text-muted-foreground">
                      Confianza: {Math.round(prediction.confidence * 100)}%
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
                  <p className="mt-4 text-sm text-muted-foreground">
                    {isConnected ? "Realizando señas frente a la cámara..." : "Conecta la cámara para comenzar"}
                  </p>
                </div>
              )}
            </Card>

            {/* All Predictions */}
            {prediction?.allPredictions && Object.keys(prediction.allPredictions).length > 0 && (
              <Card className="border-border bg-card p-6">
                <h2 className="mb-4 text-sm font-medium text-muted-foreground">Todas las Predicciones</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {Object.entries(prediction.allPredictions)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([className, confidence]) => (
                      <div key={className} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">
                            {className.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-foreground">{className}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">{Math.round(confidence * 100)}%</span>
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${confidence * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            )}

            {/* System Status */}
            <Card className="border-border bg-card p-6">
              <h2 className="mb-4 text-sm font-medium text-muted-foreground">Estado del Sistema</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Conexión WebSocket</span>
                  <Badge variant={isConnected ? "default" : "secondary"}>
                    {isConnected ? "Conectado" : "Desconectado"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cámara</span>
                  <Badge variant={isCameraInitialized ? "default" : "secondary"}>
                    {isCameraInitialized ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Detección de manos</span>
                  <Badge variant={prediction?.hasHandDetection ? "default" : "secondary"}>
                    {prediction?.hasHandDetection ? "Detectada" : "No detectada"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Secuencia</span>
                  <Badge variant={prediction?.sequenceReady ? "default" : "secondary"}>
                    {prediction?.sequenceReady ? "Lista" : "Incompleta"}
                  </Badge>
                </div>
              </div>
            </Card>

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
                  <span>Permite el acceso a la cámara cuando se solicite</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">3.</span>
                  <span>Coloca tu mano frente a la cámara</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">4.</span>
                  <span>Realiza señas del lenguaje de señas</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">5.</span>
                  <span>Observa las predicciones en tiempo real</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>

        {/* Canvas oculto para procesamiento */}
        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          style={{ display: 'none' }}
        />
      </main>
    </div>
  )
}