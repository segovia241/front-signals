"use client"

import type { RefObject } from "react"
import { Play, AlertCircle } from "lucide-react"

interface VideoDisplayProps {
  videoRef: RefObject<HTMLVideoElement>
  isCameraOn: boolean
  cameraError: string | null
  facingMode: "user" | "environment"
}

export function VideoDisplay({ videoRef, isCameraOn, cameraError, facingMode }: VideoDisplayProps) {
  return (
    <div className="flex-1 px-6 py-3 min-h-0">
      <div className="relative mx-auto h-full max-w-sm overflow-hidden rounded-lg bg-pink-300">
        {!isCameraOn ? (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900">
            <div className="text-center">
              <Play className="h-12 w-12 text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">Presiona Play para activar la cámara</p>
            </div>
          </div>
        ) : cameraError ? (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">Cámara no disponible</p>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
          />
        )}
      </div>
    </div>
  )
}
