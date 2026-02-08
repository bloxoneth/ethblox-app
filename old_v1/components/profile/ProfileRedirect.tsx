"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMetaMask } from "@/contexts/metamask-context"
import ConnectPrompt from "./ConnectPrompt"

export default function ProfileRedirect() {
  const router = useRouter()
  const { account, isConnected } = useMetaMask()

  useEffect(() => {
    if (isConnected && account) {
      router.replace(`/u/${account}`)
    }
  }, [isConnected, account, router])

  // Show connect prompt if not connected
  if (!isConnected) {
    return <ConnectPrompt />
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Redirecting to your profile...</p>
      </div>
    </div>
  )
}
