"use client"

import { useCallback, useRef, useState, useEffect } from "react"

// Cliente API para procesamiento de videos pre-grabados
export class VideoUploadAPI {
  constructor(baseURL = "https://supersafe-jeanna-spinulose.ngrok-free.dev") {
    this.baseURL = baseURL
    this.ws = null
    this.sessionId = null
    this.video = null
    this.canvas = null
    this.frameInterval = null
    this.isProcessing = false
  }

  // Verificar salud del servidor
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/api/health`)
      return await response.json()
    } catch (error) {
      console.error("Error checking health:", error)
      return { status: "unreachable" }
    }
  }

  // Inicializar elementos de video
  initializeVideo(videoElement, canvasElement) {
    this.video = videoElement
    this.canvas = canvasElement
    return { success: true }
  }

  // Cargar archivo de video
  async loadVideoFile(file) {
    if (!this.video) {
      return { success: false, error: "Elemento de video no inicializado" }
    }

    try {
      const url = URL.createObjectURL(file)
      this.video.src = url
      this.video.muted = true
      this.video.playsInline = true
      
      await this.video.load()
      
      return { 
        success: true, 
        duration: this.video.duration,
        dimensions: {
          width: this.video.videoWidth,
          height: this.video.videoHeight
        }
      }
    } catch (error) {
      console.error("Error loading video file:", error)
      return { success: false, error: error.message }
    }
  }

  // Capturar frame del video actual
  captureFrame() {
    if (!this.canvas || !this.video || this.video.paused || this.video.ended) {
      return null
    }
    
    const context = this.canvas.getContext('2d')
    
    // Dibujar frame en canvas
    context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height)
    
    // Convertir a base64 con calidad reducida para mejor performance
    return this.canvas.toDataURL('image/jpeg', 0.7)
  }

  // Conectar WebSocket para transmisión de frames del video
  connectWebSocket(onMessage, onError, onClose) {
    this.sessionId = `video_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    this.ws = new WebSocket(`wss://supersafe-jeanna-spinulose.ngrok-free.dev/ws/${this.sessionId}`)

    this.ws.onopen = () => {
      console.log("WebSocket connected for video upload")
      // Enviar metadata del video
      if (this.video) {
        this.ws.send(JSON.stringify({
          type: "video_metadata",
          duration: this.video.duration,
          dimensions: {
            width: this.video.videoWidth,
            height: this.video.videoHeight
          },
          session_type: "video_upload"
        }))
      }
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

  // Iniciar procesamiento del video
  startProcessing() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected")
      return false
    }

    if (!this.video) {
      console.error("Video not loaded")
      return false
    }

    this.isProcessing = true

    // Reiniciar el video al inicio
    this.video.currentTime = 0

    // Iniciar reproducción
    this.video.play().catch(error => {
      console.error("Error playing video:", error)
      return false
    })

    // Enviar frames mientras el video se reproduce
    this.frameInterval = setInterval(() => {
      if (this.isProcessing && this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Verificar si el video sigue reproduciéndose
        if (this.video.paused || this.video.ended) {
          if (this.video.ended) {
            // Video terminado, reiniciar
            this.video.currentTime = 0
            this.video.play().catch(console.error)
          }
          return
        }

        const frameData = this.captureFrame()
        if (frameData) {
          this.ws.send(JSON.stringify({
            type: "video_frame",
            frame: frameData,
            current_time: this.video.currentTime,
            session_type: "video_upload"
          }))
        }
      }
    }, 100) // 10 FPS

    return true
  }

  // Detener procesamiento
  stopProcessing() {
    this.isProcessing = false

    if (this.frameInterval) {
      clearInterval(this.frameInterval)
      this.frameInterval = null
    }

    if (this.video) {
      this.video.pause()
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: "processing_stopped",
        session_type: "video_upload"
      }))
    }
  }

  // Cerrar conexión completamente
  async close() {
    this.stopProcessing()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    if (this.video) {
      this.video.src = ""
    }

    this.sessionId = null
  }
}

// Hook de React para procesar videos subidos
export const useVideoUpload = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [error, setError] = useState(null)
  const [videoInfo, setVideoInfo] = useState(null)
  const [progress, setProgress] = useState(0)
  
  const apiRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    apiRef.current = new VideoUploadAPI()
    return () => {
      if (apiRef.current) {
        apiRef.current.close()
      }
    }
  }, [])

  // Inicializar elementos de video
  const initializeVideo = useCallback(() => {
    if (!apiRef.current || !videoRef.current || !canvasRef.current) {
      setError("Elementos de video no disponibles")
      return false
    }

    try {
      const result = apiRef.current.initializeVideo(videoRef.current, canvasRef.current)
      setError(null)
      return result.success
    } catch (err) {
      setError(`Error inicializando video: ${err.message}`)
      return false
    }
  }, [])

  // Cargar archivo de video
  const loadVideoFile = useCallback(async (file) => {
    if (!apiRef.current) {
      setError("API no inicializada")
      return false
    }

    try {
      const result = await apiRef.current.loadVideoFile(file)
      if (result.success) {
        setVideoInfo({
          duration: result.duration,
          dimensions: result.dimensions,
          name: file.name,
          size: file.size
        })
        setError(null)
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

  // Conectar y procesar video
  const connect = useCallback(async (onMessage, onError, onClose) => {
    if (!apiRef.current) {
      setError("API no inicializada")
      return null
    }

    // Inicializar elementos de video si no está hecho
    if (!videoRef.current || !canvasRef.current) {
      setError("Elementos de video no inicializados")
      return null
    }

    initializeVideo()

    // Conectar WebSocket
    const sessionId = apiRef.current.connectWebSocket(
      (data) => {
        if (data.type === "prediction_update") {
          setPrediction({
            prediction: data.prediction,
            confidence: data.confidence,
            allPredictions: data.all_predictions,
            hasHandDetection: data.has_hand_detection,
            sequenceReady: data.sequence_ready,
            timestamp: data.timestamp
          })
          setError(null)
        } else if (data.type === "error") {
          setError(data.message)
        }
        
        // Actualizar progreso basado en el tiempo actual del video
        if (videoRef.current && data.current_time !== undefined) {
          const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100
          setProgress(progress)
        }
        
        if (onMessage) onMessage(data)
      },
      (error) => {
        setError(`Error de conexión: ${error.message}`)
        setIsProcessing(false)
        if (onError) onError(error)
      },
      (event) => {
        setIsConnected(false)
        setIsProcessing(false)
        if (onClose) onClose(event)
      }
    )

    // Esperar a que WebSocket esté conectado
    const checkConnection = setInterval(() => {
      if (apiRef.current.ws && apiRef.current.ws.readyState === WebSocket.OPEN) {
        clearInterval(checkConnection)
        setIsConnected(true)
        
        // Iniciar procesamiento una vez conectado
        const processingStarted = apiRef.current.startProcessing()
        if (processingStarted) {
          setIsProcessing(true)
          setError(null)
        } else {
          setError("No se pudo iniciar el procesamiento del video")
        }
      }
    }, 100)

    return sessionId
  }, [initializeVideo])

  // Desconectar y detener procesamiento
  const disconnect = useCallback(async () => {
    if (apiRef.current) {
      apiRef.current.stopProcessing()
      await apiRef.current.close()
      setIsConnected(false)
      setIsProcessing(false)
      setProgress(0)
      setError(null)
    }
  }, [])

  // Pausar/reanudar procesamiento
  const togglePause = useCallback(() => {
    if (!videoRef.current) return

    if (videoRef.current.paused) {
      videoRef.current.play().catch(console.error)
      if (apiRef.current) {
        apiRef.current.isProcessing = true
      }
    } else {
      videoRef.current.pause()
      if (apiRef.current) {
        apiRef.current.isProcessing = false
      }
    }
  }, [])

  // Saltar a tiempo específico en el video
  const seekTo = useCallback((time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
  }, [])

  return {
    // Estados
    isConnected,
    isProcessing,
    prediction,
    error,
    videoInfo,
    progress,
    
    // Referencias
    videoRef,
    canvasRef,
    
    // Métodos
    initializeVideo,
    loadVideoFile,
    connect,
    disconnect,
    togglePause,
    seekTo,
    
    // API instance
    api: apiRef.current,
  }
}