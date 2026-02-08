"use client"

import dynamic from "next/dynamic"
import { useEffect, useState, useCallback } from "react"
import BaseSizeSelector from "../build/BaseSizeSelector"
import type { SavedBuild } from "@/lib/storage"
import type { Brick } from "@/lib/types"

const V0BlocksV2 = dynamic(() => import("./V0BlocksV2"), { ssr: false })

const SESSION_KEY = "ethblox-buildv2-session"

interface SessionState {
  baseSize: { width: number; depth: number }
  bricks: Brick[]
  timestamp: number
}

export default function BuildClientV2() {
  const [mounted, setMounted] = useState(false)
  const [baseSize, setBaseSize] = useState<{ width: number; depth: number } | null>(null)
  const [loadedBuild, setLoadedBuild] = useState<SavedBuild | null>(null)
  const [showLoadDialogOnly, setShowLoadDialogOnly] = useState(false)
  const [sessionBricks, setSessionBricks] = useState<Brick[] | null>(null)

  // Restore session on mount
  useEffect(() => {
    setMounted(true)
    
    // Try to restore session
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)
      if (saved) {
        const session: SessionState = JSON.parse(saved)
        // Only restore if less than 2 hours old
        const twoHours = 2 * 60 * 60 * 1000
        if (Date.now() - session.timestamp < twoHours) {
          console.log("[v0] Restoring build session:", session.bricks?.length || 0, "bricks")
          setBaseSize(session.baseSize)
          setSessionBricks(session.bricks || [])
        } else {
          sessionStorage.removeItem(SESSION_KEY)
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, [])

  // Auto-save callback for V0BlocksV2
  const handleAutoSave = useCallback((bricks: Brick[]) => {
    if (!baseSize) return
    try {
      const session: SessionState = {
        baseSize,
        bricks,
        timestamp: Date.now()
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch (e) {
      // Ignore storage errors
    }
  }, [baseSize])

  // Clear session when explicitly resetting
  const handleResetBase = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setBaseSize(null)
    setLoadedBuild(null)
    setSessionBricks(null)
    setShowLoadDialogOnly(false)
  }, [])

  const handleLoadBuild = (build: SavedBuild | null) => {
    if (!build) {
      setBaseSize({ width: 20, depth: 20 })
      setLoadedBuild(null)
      return
    }

    if (build.baseWidth && build.baseDepth) {
      console.log("[v0] Restoring base size from saved build:", {
        baseWidth: build.baseWidth,
        baseDepth: build.baseDepth,
      })
      setBaseSize({ width: build.baseWidth, depth: build.baseDepth })
    } else {
      const bricks = build.bricks || []
      if (bricks.length > 0) {
        let maxX = 10
        let maxZ = 10
        bricks.forEach((brick: any) => {
          const halfW = (brick.width - 1) / 2
          const halfD = (brick.depth - 1) / 2
          maxX = Math.max(maxX, Math.abs(brick.position[0] + halfW), Math.abs(brick.position[0] - halfW))
          maxZ = Math.max(maxZ, Math.abs(brick.position[2] + halfD), Math.abs(brick.position[2] - halfD))
        })
        const width = Math.ceil(maxX) * 2 + 2
        const depth = Math.ceil(maxZ) * 2 + 2
        setBaseSize({ width: Math.min(20, width), depth: Math.min(20, depth) })
      } else {
        setBaseSize({ width: 20, depth: 20 })
      }
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

  if (!baseSize && !showLoadDialogOnly) {
    return (
      <BaseSizeSelector
        onSelect={(width, depth) => {
          setBaseSize({ width, depth })
          setLoadedBuild(null)
          setShowLoadDialogOnly(false)
        }}
        onLoadBuild={handleLoadBuild}
        onBrowseBuilds={() => {
          setShowLoadDialogOnly(true)
        }}
      />
    )
  }

  // Determine initial bricks: session > loaded build > empty
  const initialBricks = sessionBricks || loadedBuild?.bricks || undefined

  return (
    <div className="h-full">
      <V0BlocksV2
        initialBaseWidth={baseSize?.width || 20}
        initialBaseDepth={baseSize?.depth || 20}
        onResetBase={handleResetBase}
        initialLoadedBuild={loadedBuild}
        showLoadDialogImmediately={showLoadDialogOnly}
        initialBricks={initialBricks}
        onAutoSave={handleAutoSave}
      />
    </div>
  )
}
