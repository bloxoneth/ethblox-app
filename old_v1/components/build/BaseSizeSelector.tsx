"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { Grid3x3, ArrowRight, FolderOpen, Clock } from "lucide-react"
import { useMetaMask } from "@/contexts/metamask-context"
import { loadBuild, type SavedBuild } from "@/lib/storage"

interface BaseSizeSelectorProps {
  onSelect: (width: number, depth: number) => void
  onLoadBuild?: (build: SavedBuild) => void
  onBrowseBuilds?: () => void
}

export default function BaseSizeSelector({ onSelect, onLoadBuild, onBrowseBuilds }: BaseSizeSelectorProps) {
  const [width, setWidth] = useState(20)
  const [depth, setDepth] = useState(20)
  const [recentBuild, setRecentBuild] = useState<SavedBuild | null>(null)
  const { address, isConnected } = useMetaMask()

  const presets = [
    { label: "Small", width: 10, depth: 10 },
    { label: "Medium", width: 16, depth: 16 },
    { label: "Large", width: 20, depth: 20 },
  ]

  useEffect(() => {
    if (isConnected && address) {
      const builds = loadBuild(address)
      if (builds.length > 0) {
        // Sort by timestamp descending and get the most recent
        const sorted = builds.sort((a, b) => b.timestamp - a.timestamp)
        setRecentBuild(sorted[0])
      }
    } else {
      setRecentBuild(null)
    }
  }, [isConnected, address])

  const handleLoadRecent = () => {
    if (recentBuild && onLoadBuild) {
      onLoadBuild(recentBuild)
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Grid3x3 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Choose Your Base Size</h1>
          <p className="text-muted-foreground">
            Select the dimensions for your building platform. You can't change this later, and clearing the build will
            also remove the base.
          </p>
        </div>

        {recentBuild && onLoadBuild && (
          <div className="p-4 border rounded-lg bg-card space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>Recent Build</span>
            </div>
            <button
              onClick={handleLoadRecent}
              className="w-full p-4 rounded-md border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-semibold">{recentBuild.name || "Untitled Build"}</p>
                  <p className="text-sm text-muted-foreground">
                    {recentBuild.bricks.length} bricks • {new Date(recentBuild.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
          </div>
        )}

        <div className="space-y-4">
          {/* Preset options */}
          <div className="grid grid-cols-3 gap-3">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant={width === preset.width && depth === preset.depth ? "default" : "outline"}
                onClick={() => {
                  setWidth(preset.width)
                  setDepth(preset.depth)
                }}
                className="h-20 flex-col gap-1"
              >
                <span className="font-semibold">{preset.label}</span>
                <span className="text-xs opacity-70">
                  {preset.width}×{preset.depth}
                </span>
              </Button>
            ))}
          </div>

          {/* Custom size inputs */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium">Width</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={width}
                  onChange={(e) => setWidth(Math.max(1, Math.min(20, Number.parseInt(e.target.value) || 1)))}
                  className="text-center"
                />
              </div>
              <span className="text-2xl text-muted-foreground pt-6">×</span>
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium">Depth</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={depth}
                  onChange={(e) => setDepth(Math.max(1, Math.min(20, Number.parseInt(e.target.value) || 1)))}
                  className="text-center"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Maximum dimensions: 20×20</p>
          </div>

          {isConnected && onBrowseBuilds && (
            <Button onClick={onBrowseBuilds} variant="outline" size="lg" className="w-full gap-2 bg-transparent">
              <FolderOpen className="w-4 h-4" />
              Browse All Saved Builds
            </Button>
          )}

          {/* Start building button */}
          <Button onClick={() => onSelect(width, depth)} size="lg" className="w-full gap-2">
            Start Building
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="pt-4 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Note:</strong> The base size is permanent for this build session.
            </p>
            <p>Use the Clear Build button to start over with a new base size.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
