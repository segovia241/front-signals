"use client"

import { useCallback } from "react"
import { useEffect } from "react"
import { useRef } from "react"
import { useState } from "react"

// Cliente API para Sign Language
export class SignLanguageAPI {
  constructor(baseURL = "https://supersafe-jeanna-spinulose.ngrok-free.dev") {
    this.baseURL = baseURL
    this.ws = null
    this.sessionId = null
    this.stream = null
    this.mediaRecorder = null
    this.frameInterval = null
    this.canvas = null
    this.video = null
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

  // Obtener clases disponibles
  async getClasses() {
    try {
      const response = await fetch(`${this.baseURL}/api/classes`)
      return await response.json()
    } catch (error) {
      console.error("Error getting classes:", error)
      return { classes: [] }
    }
  }

  // Predecir desde un frame (base64)
  async predictFromFrame(frameData) {
    try {
      const response = await fetch(`${this.baseURL}/api/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ frame: frameData }),
      })
      return await response.json()
    } catch (error) {
      console.error("Error predicting from frame:", error)
      return { success: false, error: error.message }
    }
  }

  // Inicializar cámara y elementos de video
  async initializeCamera(videoElement, canvasElement) {
    try {
      this.video = videoElement
      this.canvas = canvasElement
      
      // Obtener acceso a la cámara
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      })
      
      if (this.video) {
        this.video.srcObject = this.stream
        await this.video.play()
      }
      
      return { success: true }
    } catch (error) {
      console.error("Error initializing camera:", error)
      return { success: false, error: error.message }
    }
  }

  // Capturar frame del video y convertirlo a base64
  captureFrame() {
    if (!this.canvas || !this.video) return null
    
    const context = this.canvas.getContext('2d')
    
    // Dibujar frame en canvas
    context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height)
    
    // Convertir a base64 con calidad reducida para mejor performance
    return this.canvas.toDataURL('image/jpeg', 0.7)
  }

  // Conectar WebSocket para transmisión en tiempo real
  connectWebSocket(onMessage, onError, onClose) {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    this.ws = new WebSocket(`wss://supersafe-jeanna-spinulose.ngrok-free.dev/ws/${this.sessionId}`)

    this.ws.onopen = () => {
      console.log("WebSocket connected")
      // No enviamos "start_camera" porque ahora el servidor espera frames del cliente
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
      this.stopSendingFrames()
      if (onClose) onClose(event)
    }

    return this.sessionId
  }

  // Iniciar envío de frames
  startSendingFrames() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected")
      return
    }

    // Enviar frames cada 100ms (10 FPS para mejor performance)
    this.frameInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const frameData = this.captureFrame()
        if (frameData) {
          this.ws.send(JSON.stringify({
            type: "video_frame",
            frame: frameData
          }))
        }
      }
    }, 100) // 10 FPS
  }

  // Detener envío de frames
  stopSendingFrames() {
    if (this.frameInterval) {
      clearInterval(this.frameInterval)
      this.frameInterval = null
    }
  }

  // Detener cámara y conexión
  async stopCamera() {
    // Detener envío de frames
    this.stopSendingFrames()

    // Cerrar WebSocket
    if (this.ws) {
      this.ws.send(JSON.stringify({ action: "stop_video" }))
      this.ws.close()
      this.ws = null
    }

    // Detener stream de cámara
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    // Limpiar elementos de video
    if (this.video) {
      this.video.srcObject = null
      this.video = null
    }

    this.canvas = null

    // Llamar al endpoint de stop si es necesario
    if (this.sessionId) {
      try {
        await fetch(`${this.baseURL}/api/camera/${this.sessionId}/stop`, {
          method: "POST",
        })
      } catch (error) {
        console.error("Error stopping camera:", error)
      }
      this.sessionId = null
    }
  }
}

// Hook de React para usar la API
export const useSignLanguage = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [prediction, setPrediction] = useState(null)
  const [error, setError] = useState(null)
  const [isCameraInitialized, setIsCameraInitialized] = useState(false)
  const apiRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    apiRef.current = new SignLanguageAPI()
    return () => {
      if (apiRef.current) {
        apiRef.current.stopCamera()
      }
    }
  }, [])

  const initializeCamera = useCallback(async () => {
    if (!apiRef.current || !videoRef.current || !canvasRef.current) {
      setError("Elementos de video no disponibles")
      return false
    }

    try {
      const result = await apiRef.current.initializeCamera(videoRef.current, canvasRef.current)
      if (result.success) {
        setIsCameraInitialized(true)
        setError(null)
        return true
      } else {
        setError(result.error || "Error inicializando cámara")
        return false
      }
    } catch (err) {
      setError(`Error inicializando cámara: ${err.message}`)
      return false
    }
  }, [])

  const connect = useCallback(async (onMessage, onError, onClose) => {
    if (!apiRef.current) {
      setError("API no inicializada")
      return null
    }

    // Primero inicializar la cámara
    const cameraInitialized = await initializeCamera()
    if (!cameraInitialized) {
      return null
    }

    // Luego conectar WebSocket
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
        
        if (onMessage) onMessage(data)
      },
      (error) => {
        setError(`Error de conexión: ${error.message}`)
        if (onError) onError(error)
      },
      (event) => {
        setIsConnected(false)
        setIsCameraInitialized(false)
        setPrediction(null)
        if (onClose) onClose(event)
      }
    )

    // Iniciar envío de frames una vez conectado
    const checkConnection = setInterval(() => {
      if (apiRef.current.ws && apiRef.current.ws.readyState === WebSocket.OPEN) {
        clearInterval(checkConnection)
        apiRef.current.startSendingFrames()
        setIsConnected(true)
        setError(null)
      }
    }, 100)

    return sessionId
  }, [initializeCamera])

  const disconnect = useCallback(async () => {
    if (apiRef.current) {
      await apiRef.current.stopCamera()
      setIsConnected(false)
      setIsCameraInitialized(false)
      setPrediction(null)
      setError(null)
    }
  }, [])

  const captureSingleFrame = useCallback(async () => {
    if (!apiRef.current) {
      return { success: false, error: "API no inicializada" }
    }

    const frameData = apiRef.current.captureFrame()
    if (!frameData) {
      return { success: false, error: "No se pudo capturar el frame" }
    }

    try {
      const result = await apiRef.current.predictFromFrame(frameData)
      return result
    } catch (error) {
      return { success: false, error: error.message }
    }
  }, [])

  return {
    isConnected,
    isCameraInitialized,
    prediction,
    error,
    videoRef,
    canvasRef,
    initializeCamera,
    connect,
    disconnect,
    captureSingleFrame,
    api: apiRef.current,
  }
}
