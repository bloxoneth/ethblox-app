"use client"

import dynamic from "next/dynamic"
import { useEffect, useState, useCallback } from "react"
import type { SavedBuild } from "@/lib/storage"
import { loadBuildById } from "@/lib/storage"
import type { Brick } from "@/lib/types"

const V0BlocksV2 = dynamic(() => import("./V0BlocksV2"), { ssr: false })

const SESSION_KEY = "ethblox-buildv2-session"

interface SessionState {
  bricks: Brick[]
  timestamp: number
}

export default function BuildClientV2({ loadBuildId }: { loadBuildId?: string | null }) {
  const [mounted, setMounted] = useState(false)
  const [loadedBuild, setLoadedBuild] = useState<SavedBuild | null>(null)
  const [sessionBricks, setSessionBricks] = useState<Brick[] | null>(null)

  // Restore session or load build by ID on mount
  useEffect(() => {
    setMounted(true)
    
    // If a build ID is provided, load that build instead of session
    if (loadBuildId) {
      const build = loadBuildById(loadBuildId)
      if (build) {
        setLoadedBuild(build)
        return // Don't restore session when loading a specific build
      }
    }
    
    // Try to restore session
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)
      if (saved) {
        const session: SessionState = JSON.parse(saved)
        // Only restore if less than 24 hours old
        const twentyFourHours = 24 * 60 * 60 * 1000
        if (Date.now() - session.timestamp < twentyFourHours) {
          setSessionBricks(session.bricks || [])
        } else {
          sessionStorage.removeItem(SESSION_KEY)
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, [loadBuildId])

  // Auto-save callback for V0BlocksV2
  const handleAutoSave = useCallback((bricks: Brick[]) => {
    try {
      const session: SessionState = {
        bricks,
        timestamp: Date.now()
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch (e) {
      // Ignore storage errors
    }
  }, [])

  // Clear session when explicitly resetting
  const handleClearSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setLoadedBuild(null)
    setSessionBricks(null)
  }, [])

  const handleLoadBuild = (build: SavedBuild | null) => {
    if (!build) {
      setLoadedBuild(null)
      return
    }
    setLoadedBuild(build)
  }

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading builder...</p>
        </div>
      </div>
    )
  }

  // Determine initial bricks: session > loaded build > empty
  const initialBricks = sessionBricks || loadedBuild?.bricks || undefined

  return (
    <div className="h-full">
      <V0BlocksV2
        onClearSession={handleClearSession}
        initialLoadedBuild={loadedBuild}
        initialBricks={initialBricks}
        onAutoSave={handleAutoSave}
        onLoadBuild={handleLoadBuild}
      />
    </div>
  )
}
