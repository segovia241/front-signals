"use client"

import { useRef, useState, useCallback } from "react"

export function useRecording(captureFrame: () => string | null, onStopRecording?: () => void) {
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedFrames, setRecordedFrames] = useState<string[]>([])
  const [detectedWord, setDetectedWord] = useState("")
  const [detectionConfidence, setDetectionConfidence] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const startRecording = useCallback(() => {
    setIsRecording(true)
    setRecordedFrames([])
    setDetectedWord("")
    setDetectionConfidence(0)

    frameIntervalRef.current = setInterval(() => {
      const frame = captureFrame()
      if (frame) {
        setRecordedFrames((prev) => [...prev, frame])
      }
    }, 100)

    console.log("[v0] Iniciando grabación...")
  }, [captureFrame])

  const stopRecording = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }

    if (isRecording) {
      console.log("[v0] Grabación terminada. Frames capturados:", recordedFrames.length)
      onStopRecording?.()
    }

    setIsRecording(false)
  }, [isRecording, recordedFrames.length, onStopRecording])

  const resetRecording = useCallback(() => {
    stopRecording()
    setRecordedFrames([])
    setDetectedWord("")
    setDetectionConfidence(0)
    setIsProcessing(false)
  }, [stopRecording])

  const setAnalysisResult = useCallback((word: string, confidence: number) => {
    setDetectedWord(word)
    setDetectionConfidence(confidence)
    setIsProcessing(false)
  }, [])

  return {
    isRecording,
    recordedFrames,
    detectedWord,
    detectionConfidence,
    isProcessing,
    startRecording,
    stopRecording,
    resetRecording,
    setIsProcessing,
    setAnalysisResult,
  }
}
