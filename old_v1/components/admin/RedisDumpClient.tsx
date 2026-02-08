"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface BuildData {
  key: string
  type: string
  buildId: string
  name: string
  tokenId: string
  geoHash: string
  bloxCount: number
  owner: string
  createdAt: string
  bricks: any[]
}

export function RedisDumpClient() {
  const [builds, setBuilds] = useState<BuildData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/redis-data")
      .then((res) => res.json())
      .then((data) => {
        setBuilds(data.builds || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error("[v0] Error fetching Redis data:", err)
        setLoading(false)
      })
  }, [])

  const downloadJSON = (buildId: string, bricks: any[]) => {
    const blob = new Blob([JSON.stringify(bricks, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${buildId}-geometry.json`
    a.click()
  }

  if (loading) {
    return <div className="p-8">Loading Redis data...</div>
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Redis Build Database</h1>
        <p className="text-muted-foreground mb-8">Complete data dump of all builds in Redis</p>

        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Build ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">NFT ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Creator</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">BLOX</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Geo Hash</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Geometry</th>
                </tr>
              </thead>
              <tbody>
                {builds.map((build, index) => (
                  <tr key={build.key} className="border-t hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-mono">{build.buildId}</td>
                    <td className="px-4 py-3 text-sm">{build.name || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      {build.tokenId ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          #{build.tokenId}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {build.owner ? `${build.owner.slice(0, 6)}...${build.owner.slice(-4)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">{build.bloxCount}</td>
                    <td className="px-4 py-3 text-sm font-mono text-xs">
                      {build.geoHash ? `${build.geoHash.slice(0, 8)}...` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">{build.createdAt || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <Button size="sm" variant="outline" onClick={() => downloadJSON(build.buildId, build.bricks)}>
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
