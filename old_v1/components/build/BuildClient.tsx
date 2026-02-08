"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import BaseSizeSelector from "./BaseSizeSelector"
import type { SavedBuild } from "@/lib/storage"

const V0Blocks = dynamic(() => import("./V0Blocks"), { ssr: false })

export default function BuildClient() {
  const [mounted, setMounted] = useState(false)
  const [baseSize, setBaseSize] = useState<{ width: number; depth: number } | null>(null)
  const [loadedBuild, setLoadedBuild] = useState<SavedBuild | null>(null)
  const [showLoadDialogOnly, setShowLoadDialogOnly] = useState(false)

  useEffect(() => {
    console.log("[v0] BuildClient mounted (client-only)")
    setMounted(true)
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
      // Fallback for old builds without base size saved
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

  return (
    <div className="h-full">
      <V0Blocks
        initialBaseWidth={baseSize?.width || 20}
        initialBaseDepth={baseSize?.depth || 20}
        onResetBase={() => {
          setBaseSize(null)
          setLoadedBuild(null)
          setShowLoadDialogOnly(false)
        }}
        initialLoadedBuild={loadedBuild}
        showLoadDialogImmediately={showLoadDialogOnly}
      />
    </div>
  )
}
