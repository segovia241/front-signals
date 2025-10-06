"use client"

import { RotateCw, Play, Square, Edit3 } from "lucide-react"

interface RecordingControlsProps {
  isRecording: boolean
  isConnected: boolean
  isCameraOn: boolean
  isEditing: boolean
  onToggleCamera: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onToggleEditing: () => void
}

export function RecordingControls({
  isRecording,
  isConnected,
  isCameraOn,
  isEditing,
  onToggleCamera,
  onStartRecording,
  onStopRecording,
  onToggleEditing,
}: RecordingControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 px-4 py-3 shrink-0">
      <button onClick={onToggleCamera} className="rounded-full p-2 hover:bg-zinc-800 transition-colors">
        <RotateCw className="h-6 w-6 text-zinc-400" />
      </button>

      {!isRecording ? (
        <button
          onClick={onStartRecording}
          disabled={!isConnected}
          className="rounded-full p-4 bg-red-500 hover:bg-red-600 disabled:bg-zinc-700 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="h-8 w-8 text-white" />
        </button>
      ) : (
        <button onClick={onStopRecording} className="rounded-full p-4 bg-red-500 hover:bg-red-600 transition-colors">
          <Square className="h-8 w-8 text-white" />
        </button>
      )}

      <button onClick={onToggleEditing} className="rounded-full p-2 hover:bg-zinc-800 transition-colors">
        <Edit3 className={`h-6 w-6 ${isEditing ? "text-purple-400" : "text-zinc-400"}`} />
      </button>
    </div>
  )
}
