"use client"

import { useRef, useState, useCallback } from "react"

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const connect = useCallback(() => {
    setIsConnecting(true)
    setConnectionError(null)

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://56.124.87.123:8000/ws"
      console.log("[v0] Intentando conectar a WebSocket:", wsUrl)

      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log("[v0] WebSocket conectado exitosamente")
        setIsConnected(true)
        setConnectionError(null)
        setIsConnecting(false)
      }

      ws.onerror = (error) => {
        console.error("[v0] Error en WebSocket:", error)
        setIsConnected(false)
        setIsConnecting(false)
        setConnectionError("Conexión bloqueada por seguridad. Usa wss:// o despliega con HTTP")
      }

      ws.onclose = () => {
        setIsConnected(false)
        setIsConnecting(false)
      }

      wsRef.current = ws
    } catch (error) {
      console.error("[v0] Error creando WebSocket:", error)
      if (error instanceof DOMException && error.message.includes("insecure")) {
        setConnectionError("HTTPS requiere wss:// - Configura SSL en tu servidor Python")
      } else {
        setConnectionError("No se puede conectar al servidor")
      }
      setIsConnected(false)
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
    setConnectionError(null)
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    }
    return false
  }, [])

  const onMessage = useCallback((callback: (data: any) => void) => {
    if (wsRef.current) {
      wsRef.current.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data)
          callback(response)
        } catch (err) {
          console.error("[v0] Error parseando respuesta:", err)
        }
      }
    }
  }, [])

  return {
    wsRef,
    isConnected,
    connectionError,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
    onMessage,
  }
}
