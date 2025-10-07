"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#0a0a1f] px-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="stars-small"></div>
        <div className="stars-medium"></div>
        <div className="stars-large"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-16">
        {/* Logo */}
        <div className="flex items-center justify-center">
          <img src="/logo.png" alt="Logo" className="h-48 w-48 object-contain" />
        </div>

        {/* Buttons */}
        <div className="flex w-full max-w-[280px] flex-col gap-4">
          <Button
            onClick={() => router.push("/menu")}
            className="h-14 w-full rounded-lg bg-white text-lg font-bold text-[#8b5cf6] hover:bg-white/90"
          >
            INGRESAR
          </Button>

          <Button
            onClick={() => router.push("/menu")}
            variant="outline"
            className="h-14 w-full rounded-lg border-2 border-white bg-transparent text-lg font-bold text-white hover:bg-white/10"
          >
            REGISTRAR
          </Button>
        </div>
      </div>
    </div>
  )
}
