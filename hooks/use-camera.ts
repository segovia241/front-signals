"use client"

import { useRef, useState, useCallback, useEffect } from "react"

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const startCamera = useCallback(
    async (mode: "user" | "environment" = facingMode) => {
      try {
        setCameraError(null)

        if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Tu navegador no soporta acceso a la cámara. Usa Chrome, Firefox o Safari.")
          setIsCameraOn(false)
          return
        }

        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        setStream(mediaStream)

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }

        setIsCameraOn(true)
      } catch (err) {
        console.error("[v0] Error accessing camera:", err)
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError") {
            setCameraError("Permiso de cámara denegado. Permite el acceso en tu navegador.")
          } else if (err.name === "NotFoundError") {
            setCameraError("No se encontró ninguna cámara en tu dispositivo.")
          } else if (err.name === "NotReadableError") {
            setCameraError("La cámara está siendo usada por otra aplicación.")
          } else {
            setCameraError("No se puede acceder a la cámara. Intenta recargar la página.")
          }
        } else {
          setCameraError("Error desconocido al acceder a la cámara.")
        }
        setIsCameraOn(false)
      }
    },
    [facingMode, stream],
  )

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
    setIsCameraOn(false)
  }, [stream])

  const toggleCamera = useCallback(() => {
    const newMode = facingMode === "user" ? "environment" : "user"
    setFacingMode(newMode)
    if (isCameraOn) {
      startCamera(newMode)
    }
  }, [facingMode, isCameraOn, startCamera])

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  return {
    videoRef,
    stream,
    facingMode,
    isCameraOn,
    cameraError,
    startCamera,
    stopCamera,
    toggleCamera,
    setCameraError,
  }
}
