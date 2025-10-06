"use client"

import { Wifi, WifiOff, AlertCircle, X } from "lucide-react"

interface ConnectionStatusProps {
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  cameraError: string | null
  isRecording: boolean
  isProcessing: boolean
  onConnect: () => void
  onDisconnect: () => void
  onClearErrors: () => void
}

export function ConnectionStatus({
  isConnected,
  isConnecting,
  connectionError,
  cameraError,
  isRecording,
  isProcessing,
  onConnect,
  onDisconnect,
  onClearErrors,
}: ConnectionStatusProps) {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={isConnected ? onDisconnect : onConnect}
          disabled={isConnecting}
          className={`p-2 rounded-full transition-all duration-200 ${
            isConnecting
              ? "bg-purple-500/30 scale-95"
              : isConnected
                ? "bg-green-500/20 hover:bg-green-500/30 active:scale-90"
                : "bg-purple-500/20 hover:bg-purple-500/30 active:scale-90"
          }`}
        >
          {isConnecting ? (
            <Wifi className="h-6 w-6 text-yellow-400 animate-pulse" strokeWidth={2.5} />
          ) : isConnected ? (
            <Wifi className="h-6 w-6 text-green-400" strokeWidth={2.5} />
          ) : (
            <WifiOff className="h-6 w-6 text-purple-400" strokeWidth={2.5} />
          )}
        </button>

        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-1 bg-red-500/20 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-xs text-red-400">GRABANDO</span>
            </div>
          )}
          {isProcessing && (
            <div className="flex items-center gap-1 bg-blue-500/20 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-xs text-blue-400">PROCESANDO</span>
            </div>
          )}
        </div>

        <div
          className={`h-10 w-10 rounded-full transition-all duration-300 ${
            isConnecting
              ? "bg-gradient-to-br from-yellow-400 to-orange-400 animate-pulse"
              : isConnected
                ? "bg-gradient-to-br from-green-400 to-emerald-400"
                : connectionError
                  ? "bg-gradient-to-br from-red-400 to-rose-400"
                  : "bg-gradient-to-br from-purple-400 to-pink-400"
          }`}
        />
      </div>

      {(connectionError || cameraError) && (
        <div className="px-6 pb-2 shrink-0">
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {connectionError && (
                <div className="mb-1">
                  <p className="text-xs font-semibold text-red-400">WebSocket:</p>
                  <p className="text-xs text-red-300">{connectionError}</p>
                </div>
              )}
              {cameraError && (
                <div>
                  <p className="text-xs font-semibold text-red-400">Cámara:</p>
                  <p className="text-xs text-red-300">{cameraError}</p>
                </div>
              )}
            </div>
            <button onClick={onClearErrors} className="shrink-0 p-1 rounded hover:bg-red-500/20 transition-colors">
              <X className="h-4 w-4 text-red-400" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
