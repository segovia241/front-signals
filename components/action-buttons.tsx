"use client"

import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"

interface ActionButtonsProps {
  recordedFrames: number
  isProcessing: boolean
  isRecording: boolean
  onReset: () => void
  onAnalyze: () => void
}

export function ActionButtons({ recordedFrames, isProcessing, isRecording, onReset, onAnalyze }: ActionButtonsProps) {
  return (
    <>
      <div className="flex gap-3 px-6 pb-4 shrink-0">
        <Button
          onClick={onReset}
          variant="outline"
          className="flex-1 border-2 border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 text-base font-semibold py-4"
        >
          REINICIAR
        </Button>

        <Button
          onClick={onAnalyze}
          disabled={!recordedFrames || isProcessing || isRecording}
          variant="outline"
          className="flex-1 border-2 border-green-500 bg-transparent text-green-500 hover:bg-green-500/10 disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-400 text-base font-semibold py-4"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              ANALIZANDO
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              ANALIZAR GRABACIÓN
            </div>
          )}
        </Button>
      </div>

      <div className="px-6 pb-3 shrink-0">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
          <div className="text-xs text-zinc-400 text-center">
            {recordedFrames > 0
              ? `📹 ${recordedFrames} frames grabados - Listos para analizar`
              : "🎥 Graba una seña completa y luego analízala"}
          </div>
        </div>
      </div>
    </>
  )
}
