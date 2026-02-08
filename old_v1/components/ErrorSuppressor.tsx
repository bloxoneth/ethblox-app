"use client"

import { useEffect } from "react"

export function ErrorSuppressor() {
  useEffect(() => {
    const originalError =
      typeof console !== "undefined" && typeof console.error === "function"
        ? console.error.bind(console)
        : null
    console.error = (...args) => {
      if (
        args[0]?.toString().includes("Cannot redefine property: ethereum") ||
        args[0]?.message?.includes("Cannot redefine property: ethereum")
      ) {
        return
      }
      // Log all other errors normally
      if (originalError) {
        originalError(...args)
      }
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
      if (originalError) {
        console.error = originalError
      }
      window.removeEventListener("error", handleError)
    }
  }, [])

  return null
}
