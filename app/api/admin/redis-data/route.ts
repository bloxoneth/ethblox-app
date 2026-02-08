import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function GET() {
  try {
    console.log("[v0] Starting Redis data fetch...")

    const keys = await redis.keys("build:*")
    console.log(`[v0] Found ${keys.length} Redis keys`)

    const builds = []

    for (const key of keys) {
      const type = await redis.type(key)
      const data = await redis.get(key)

      if (data) {
        const buildData = typeof data === "string" ? JSON.parse(data) : data

        builds.push({
          key,
          type,
          buildId: buildData.id || key.split(":").pop() || "",
          name: buildData.name || "",
          tokenId: buildData.tokenId || "",
          geoHash: buildData.geoHash || "",
          bloxCount: Array.isArray(buildData.bricks) ? buildData.bricks.length : 0,
          owner: buildData.owner || "",
          createdAt: buildData.createdAt ? new Date(buildData.createdAt).toLocaleString() : "",
          bricks: buildData.bricks || [],
        })
      }
    }

    console.log(`[v0] Processed ${builds.length} builds`)

    return NextResponse.json({ builds })
  } catch (error) {
    console.error("[v0] Error fetching Redis data:", error)
    return NextResponse.json({ error: "Failed to fetch Redis data", builds: [] }, { status: 500 })
  }
}
