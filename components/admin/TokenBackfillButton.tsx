"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function TokenBackfillButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleBackfill = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/builds/backfill-tokens", {
        method: "POST",
      })
      const data = await response.json()
      setResult(data)

      if (data.success) {
        alert(
          `Backfill complete!\nScanned: ${data.results.scanned}\nAdded: ${data.results.added}\nBurned: ${data.results.burned}\nAlready exists: ${data.results.alreadyExists}`,
        )
        window.location.reload()
      }
    } catch (error) {
      console.error("[v0] Backfill failed:", error)
      alert("Backfill failed: " + error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleBackfill} disabled={loading} variant="outline" size="sm">
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Scanning..." : "Backfill Tokens"}
      </Button>
      {result && result.results && (
        <span className="text-sm text-muted-foreground">Added {result.results.added} tokens</span>
      )}
    </div>
  )
}
