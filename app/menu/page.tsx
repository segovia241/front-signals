"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function MenuPage() {
  const router = useRouter()

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between px-6 pt-6">
        <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
        <div className="h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-purple-400 to-pink-400">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=user"
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="px-6 pt-8">
        <h1 className="text-center text-2xl font-bold text-black">¡HOLA DE NUEVO!</h1>
        <div className="mx-auto mt-4 h-0.5 w-full bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400"></div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-8">
        <Button
          onClick={() => router.push("/transcribe")}
          variant="outline"
          className="h-16 w-full max-w-[320px] rounded-xl border-2 border-[#e879f9] bg-transparent text-base font-bold text-[#e879f9] hover:bg-[#e879f9]/10"
        >
          TRANSCRIBIR EN
          <br />
          TIEMPO REAL
        </Button>

        <Button
          onClick={() => router.push("/upload_video")}
          variant="outline"
          className="h-16 w-full max-w-[320px] rounded-xl border-2 border-[#8b5cf6] bg-transparent text-base font-bold text-[#8b5cf6] hover:bg-[#8b5cf6]/10"
        >
          TRANSCRIBIR
          <br />
          VIDEO
        </Button>

        <Button className="h-16 w-full max-w-[320px] rounded-xl bg-[#e879f9] text-base font-bold text-white hover:bg-[#e879f9]/90">
          HISTORIAL DE
          <br />
          TRANSCRIPCIONES
        </Button>

        <Button className="h-16 w-full max-w-[320px] rounded-xl bg-[#8b5cf6] text-base font-bold text-white hover:bg-[#8b5cf6]/90">
          AYUDA
        </Button>

        <Button
          variant="outline"
          className="h-16 w-full max-w-[320px] rounded-xl border-2 border-red-500 bg-transparent text-base font-bold text-red-500 hover:bg-red-500/10"
        >
          ¡DÓNANOS!
        </Button>

        <Button
          onClick={() => router.push("/")}
          className="h-16 w-full max-w-[320px] rounded-xl bg-[#4a4a4a] text-base font-bold text-white hover:bg-[#4a4a4a]/90"
        >
          CERRAR SESIÓN
        </Button>
      </div>
    </div>
  )
}
