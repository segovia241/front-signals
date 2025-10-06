"use client"

interface RecordingStatusProps {
  isProcessing: boolean
  detectedWord: string
  detectionConfidence: number
  isRecording: boolean
  recordedFrames: number
  isConnected: boolean
  isCameraOn: boolean
}

export function RecordingStatus({
  isProcessing,
  detectedWord,
  detectionConfidence,
  isRecording,
  recordedFrames,
  isConnected,
  isCameraOn,
}: RecordingStatusProps) {
  return (
    <div className="px-6 py-2 shrink-0">
      <div className="text-center">
        {isProcessing ? (
          <div className="space-y-1">
            <div className="text-lg text-blue-400 animate-pulse">Analizando grabación...</div>
            <div className="text-xs text-zinc-400">{recordedFrames} frames capturados</div>
          </div>
        ) : detectedWord ? (
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-400">
              {detectedWord}
              <span className="text-lg text-green-300 ml-2">({Math.round(detectionConfidence * 100)}%)</span>
            </div>
            <div className="text-xs text-zinc-400">Palabra detectada</div>
          </div>
        ) : isRecording ? (
          <div className="space-y-1">
            <div className="text-lg text-red-400">Grabando... {recordedFrames} frames</div>
            <div className="text-xs text-zinc-400">Haz tu seña completa</div>
          </div>
        ) : (
          <div className="text-lg text-zinc-500">
            {isConnected && isCameraOn ? "Listo para grabar" : "Conecta y activa la cámara"}
          </div>
        )}
      </div>
    </div>
  )
}
