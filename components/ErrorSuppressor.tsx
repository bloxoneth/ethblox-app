"use client"

import { useEffect } from "react"

export function ErrorSuppressor() {
  useEffect(() => {
    const originalError = console.error
    console.error = (...args) => {
      if (
        args[0]?.toString().includes("Cannot redefine property: ethereum") ||
        args[0]?.message?.includes("Cannot redefine property: ethereum")
      ) {
        return
      }
      // Log all other errors normally
      originalError.apply(console, args)
    }

    // Suppress uncaught errors for this specific case
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes("Cannot redefine property: ethereum")) {
        event.preventDefault()
        return
      }
      console.error("[ErrorSuppressor] Uncaught error:", event.message, event.error)
    }

    window.addEventListener("error", handleError)

    return () => {
      console.error = originalError
      window.removeEventListener("error", handleError)
    }
  }, [])

  return null
}
