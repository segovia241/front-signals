"use client"

import { useCallback } from "react"
import { useEffect } from "react"
import { useRef } from "react"
import { useState } from "react"

// Ejemplo de cómo conectar desde Next.js
export class SignLanguageAPI {
  constructor(baseURL = "https://eldspathic-marya-prismatically.ngrok-free.dev") {
    this.baseURL = baseURL
    this.ws = null
    this.sessionId = null
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

  // Conectar WebSocket para transmisión en tiempo real
  connectWebSocket(onMessage, onError, onClose) {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    this.ws = new WebSocket(`wss://eldspathic-marya-prismatically.ngrok-free.dev/ws/${this.sessionId}`)

    this.ws.onopen = () => {
      console.log("WebSocket connected")
      // Iniciar cámara
      this.ws.send(JSON.stringify({ action: "start_camera" }))
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
      if (onClose) onClose(event)
    }

    return this.sessionId
  }

  // Detener cámara
  async stopCamera() {
    if (this.ws) {
      this.ws.send(JSON.stringify({ action: "stop_camera" }))
      this.ws.close()
      this.ws = null
    }

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
  const [frame, setFrame] = useState(null)
  const apiRef = useRef(null)

  useEffect(() => {
    apiRef.current = new SignLanguageAPI()
    return () => {
      if (apiRef.current) {
        apiRef.current.stopCamera()
      }
    }
  }, [])

  const connect = useCallback((onMessage, onError, onClose) => {
    if (apiRef.current) {
      const sessionId = apiRef.current.connectWebSocket(
        (data) => {
          if (data.type === "prediction_update") {
            setPrediction({
              prediction: data.prediction,
              confidence: data.confidence,
              allPredictions: data.all_predictions,
              hasHandDetection: data.has_hand_detection,
            })
            setFrame(data.frame)
          }
          if (onMessage) onMessage(data)
        },
        onError,
        onClose,
      )
      setIsConnected(true)
      return sessionId
    }
  }, [])

  const disconnect = useCallback(async () => {
    if (apiRef.current) {
      await apiRef.current.stopCamera()
      setIsConnected(false)
      setPrediction(null)
      setFrame(null)
    }
  }, [])

  return {
    isConnected,
    prediction,
    frame,
    connect,
    disconnect,
    api: apiRef.current,
  }
}
