"use client"

import { useCallback, useRef, useState, useEffect } from "react"

export class VideoUploadAPI {
    constructor(baseURL = "https://supersafe-jeanna-spinulose.ngrok-free.dev") {
        this.baseURL = baseURL
        this.ws = null
        this.sessionId = null
        this.video = null
        this.canvas = null
        this.frameInterval = null
        this.progressInterval = null
        this.isProcessing = false
        this.hasCompleted = false
        this.lastPredictionTime = 0
    }

    initializeVideo(videoElement, canvasElement) {
        this.video = videoElement
        this.canvas = canvasElement

        if (this.video) {
            this.video.onended = () => {
                console.log("🎬 Video terminado - deteniendo procesamiento")
                this.hasCompleted = true
                this.stopProcessing()
            }
        }

        return { success: true }
    }

    async loadVideoFile(file) {
        if (!this.video) {
            return { success: false, error: "Elemento de video no inicializado" }
        }

        return new Promise((resolve) => {
            this.hasCompleted = false
            this.isProcessing = false
            this.lastPredictionTime = 0

            const url = URL.createObjectURL(file)
            this.video.src = url
            this.video.muted = true
            this.video.playsInline = true
            this.video.loop = false

            const onLoaded = () => {
                this.video.removeEventListener('loadeddata', onLoaded)
                this.video.removeEventListener('error', onError)
                resolve({
                    success: true,
                    duration: this.video.duration,
                    dimensions: {
                        width: this.video.videoWidth,
                        height: this.video.videoHeight
                    }
                })
            }

            const onError = () => {
                this.video.removeEventListener('loadeddata', onLoaded)
                this.video.removeEventListener('error', onError)
                resolve({ success: false, error: "Error cargando video" })
            }

            this.video.addEventListener('loadeddata', onLoaded)
            this.video.addEventListener('error', onError)
            this.video.load()
        })
    }

    captureFrame() {
        if (!this.canvas || !this.video || this.video.readyState < 2) {
            return null
        }

        try {
            const context = this.canvas.getContext('2d')
            context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height)
            return this.canvas.toDataURL('image/jpeg', 0.7)
        } catch (error) {
            console.error("Error capturando frame:", error)
            return null
        }
    }

    connectWebSocket(onMessage, onError, onClose) {
        this.sessionId = `video_${Date.now()}`

        this.ws = new WebSocket(`wss://supersafe-jeanna-spinulose.ngrok-free.dev/ws/${this.sessionId}`)

        this.ws.onopen = () => {
            console.log("✅ WebSocket conectado para video upload")
        }

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                onMessage(data)
            } catch (error) {
                console.error("Error parsing WebSocket message:", error)
            }
        }

        this.ws.onerror = (error) => {
            console.error("WebSocket error:", error)
            if (onError) onError(error)
        }

        this.ws.onclose = (event) => {
            console.log("WebSocket disconnected")
            this.stopProcessing()
            if (onClose) onClose(event)
        }

        return this.sessionId
    }

    async startProcessing(onProgressUpdate, onPredictionDetected) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error("❌ WebSocket no conectado")
            return false
        }

        if (!this.video) {
            console.error("❌ Video no disponible")
            return false
        }

        this.isProcessing = true
        this.hasCompleted = false
        this.lastPredictionTime = 0

        this.video.loop = false
        this.video.currentTime = 0

        // Configurar intervalo para actualizar progreso
        this.progressInterval = setInterval(() => {
            if (this.video && this.isProcessing && onProgressUpdate) {
                const progress = (this.video.currentTime / this.video.duration) * 100
                onProgressUpdate(progress)

                // Detectar cuando el video termina DURANTE el procesamiento
                if (this.video.ended && this.isProcessing) {
                    console.log("🎬 Video terminado durante procesamiento")
                    this.completeProcessing()
                }
            }
        }, 100)

        // Esperar un momento para que el video se resetee
        await new Promise(resolve => setTimeout(resolve, 200))

        // Iniciar reproducción automática
        try {
            await this.video.play()
            console.log("✅ Video reproduciéndose para procesamiento")
        } catch (error) {
            console.error("❌ Error reproduciendo video:", error)
            this.stopProcessing()
            return false
        }

        // Enviar frames
        this.frameInterval = setInterval(() => {
            if (!this.isProcessing ||
                !this.ws ||
                this.ws.readyState !== WebSocket.OPEN ||
                !this.video) {
                return
            }

            // Si el video terminó durante el procesamiento, detenerse
            if (this.video.ended) {
                console.log("🛑 Video terminado, deteniendo procesamiento...")
                this.completeProcessing()
                return
            }

            // Verificar si el video está reproduciéndose
            if (this.video.paused) {
                return
            }

            const frameData = this.captureFrame()
            if (frameData) {
                this.ws.send(JSON.stringify({
                    type: "video_frame",
                    frame: frameData,
                    current_time: this.video.currentTime
                }))
            }
        }, 50)

        return true
    }

    // Nueva función para completar el procesamiento cuando se detecta una palabra
    completeProcessing() {
        console.log("✅ Procesamiento completado por detección de palabra")
        this.hasCompleted = true
        this.isProcessing = false

        if (this.frameInterval) {
            clearInterval(this.frameInterval)
            this.frameInterval = null
        }

        if (this.progressInterval) {
            clearInterval(this.progressInterval)
            this.progressInterval = null
        }

        if (this.video) {
            this.video.pause()
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: "video_ended",
                session_id: this.sessionId,
                reason: "prediction_detected"
            }))
        }
    }

    stopProcessing() {
        this.isProcessing = false

        if (this.frameInterval) {
            clearInterval(this.frameInterval)
            this.frameInterval = null
        }

        if (this.progressInterval) {
            clearInterval(this.progressInterval)
            this.progressInterval = null
        }
    }

    async restartProcessing(onProgressUpdate, onPredictionDetected) {
        console.log("🔄 Reiniciando procesamiento...")
        this.hasCompleted = false
        this.stopProcessing()

        await new Promise(resolve => setTimeout(resolve, 300))
        return this.startProcessing(onProgressUpdate, onPredictionDetected)
    }

    async close() {
        this.stopProcessing()
        this.hasCompleted = true

        if (this.ws) {
            this.ws.close()
            this.ws = null
        }

        if (this.video && this.video.src) {
            URL.revokeObjectURL(this.video.src)
        }

        this.sessionId = null
    }
}

export const useVideoUpload = () => {
    const [isConnected, setIsConnected] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [prediction, setPrediction] = useState(null)
    const [error, setError] = useState(null)
    const [videoInfo, setVideoInfo] = useState(null)
    const [progress, setProgress] = useState(0)
    const [hasCompleted, setHasCompleted] = useState(false)

    const apiRef = useRef(null)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)

    const updateProgress = useCallback((newProgress) => {
        setProgress(Math.min(100, Math.max(0, newProgress)))
    }, [])

    // Función para manejar cuando se detecta una palabra
    const handlePredictionDetected = useCallback(() => {
        console.log("🎯 Palabra detectada - completando procesamiento")
        if (apiRef.current) {
            apiRef.current.completeProcessing()
        }
        setHasCompleted(true)
        setIsProcessing(false)
        setProgress(100)
    }, [])

    useEffect(() => {
        apiRef.current = new VideoUploadAPI()
        return () => {
            if (apiRef.current) {
                apiRef.current.close()
            }
        }
    }, [])

    const loadVideoFile = useCallback(async (file) => {
        if (!apiRef.current || !videoRef.current) {
            setError("Elementos de video no disponibles")
            return false
        }

        try {
            apiRef.current.initializeVideo(videoRef.current, canvasRef.current)

            const result = await apiRef.current.loadVideoFile(file)
            if (result.success) {
                setVideoInfo({
                    duration: result.duration,
                    dimensions: result.dimensions,
                    name: file.name,
                    size: file.size
                })
                setHasCompleted(false)
                setProgress(0)
                setError(null)
                console.log("✅ Video cargado - Duración:", result.duration, "segundos")
                return true
            } else {
                setError(result.error || "Error cargando video")
                return false
            }
        } catch (err) {
            setError(`Error cargando video: ${err.message}`)
            return false
        }
    }, [])

    const connect = useCallback(async (onMessage, onError, onClose) => {
        if (!apiRef.current || !videoRef.current) {
            setError("Video no cargado")
            return null
        }

        setHasCompleted(false)
        setProgress(0)

        const sessionId = apiRef.current.connectWebSocket(
            (data) => {
                console.log("📨 Mensaje WebSocket:", data)

                if (data.type === "prediction_update") {
                    const newPrediction = {
                        prediction: data.prediction,
                        confidence: data.confidence,
                        allPredictions: data.all_predictions,
                        hasHandDetection: data.has_hand_detection,
                        sequenceReady: data.sequence_ready,
                        timestamp: data.timestamp
                    }

                    setPrediction(newPrediction)
                    setError(null)

                    // ✅ LÓGICA SIMPLE - DETENER CON CUALQUIER PREDICCIÓN VÁLIDA
                    if (data.prediction &&
                        data.prediction !== "---" &&
                        data.confidence > 0.3) { // 30% de confianza mínima

                        console.log(`🎯 Deteniendo por predicción: "${data.prediction}" (${(data.confidence * 100).toFixed(1)}%)`)

                        // Detener después de un breve delay
                        setTimeout(() => {
                            handlePredictionDetected()
                        }, 1000) // 1 segundo de delay para ver la predicción
                    }

                } else if (data.type === "error") {
                    setError(data.message)
                } else if (data.type === "video_ended") {
                    console.log("✅ Procesamiento completado (video terminado)")
                    setHasCompleted(true)
                    setIsProcessing(false)
                    setProgress(100)
                }

                if (onMessage) onMessage(data)
            },
            (error) => {
                console.error("❌ Error de conexión:", error)
                setError(`Error de conexión: ${error.message}`)
                setIsProcessing(false)
                if (onError) onError(error)
            },
            (event) => {
                console.log("🔌 WebSocket cerrado")
                setIsConnected(false)
                setIsProcessing(false)
                if (onClose) onClose(event)
            }
        )

        let connectionAttempts = 0
        const maxAttempts = 30

        await new Promise((resolve, reject) => {
            const checkConnection = setInterval(() => {
                connectionAttempts++

                if (apiRef.current.ws && apiRef.current.ws.readyState === WebSocket.OPEN) {
                    clearInterval(checkConnection)
                    resolve(true)
                } else if (connectionAttempts >= maxAttempts) {
                    clearInterval(checkConnection)
                    reject(new Error("Timeout conectando WebSocket"))
                }
            }, 100)
        })

        setIsConnected(true)
        console.log("✅ WebSocket conectado, iniciando procesamiento...")

        try {
            const processingStarted = await apiRef.current.startProcessing(updateProgress, handlePredictionDetected)
            if (processingStarted) {
                setIsProcessing(true)
                setHasCompleted(false)
                setProgress(0)
                setError(null)
                console.log("✅ Procesamiento iniciado - Se detendrá automáticamente al detectar palabra")
            } else {
                throw new Error("No se pudo iniciar el procesamiento")
            }
        } catch (err) {
            setError(`Error iniciando procesamiento: ${err.message}`)
            setIsProcessing(false)
        }

        return sessionId
    }, [updateProgress, handlePredictionDetected])

    const disconnect = useCallback(async () => {
        if (apiRef.current) {
            await apiRef.current.close()
            setIsConnected(false)
            setIsProcessing(false)
            setProgress(0)
            setHasCompleted(false)
            setError(null)
        }
    }, [])

    const reprocess = useCallback(async () => {
        if (!apiRef.current) return

        console.log("🔄 Reiniciando procesamiento...")
        setHasCompleted(false)
        setProgress(0)
        setPrediction(null)
        setError(null)

        try {
            const processingStarted = await apiRef.current.restartProcessing(updateProgress, handlePredictionDetected)
            if (processingStarted) {
                setIsProcessing(true)
                console.log("✅ Reprocesamiento iniciado")
            } else {
                setError("No se pudo reiniciar el procesamiento")
            }
        } catch (err) {
            setError(`Error reiniciando procesamiento: ${err.message}`)
        }
    }, [updateProgress, handlePredictionDetected])

    const togglePause = useCallback(() => {
        if (!videoRef.current) return

        if (videoRef.current.paused) {
            videoRef.current.play().catch(err => {
                console.error("Error reproduciendo video:", err)
                setError("Error reproduciendo video")
            })
        } else {
            videoRef.current.pause()
        }
    }, [])

    return {
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
        togglePause,
        api: apiRef.current,
    }
}