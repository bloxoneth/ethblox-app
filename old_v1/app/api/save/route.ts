import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, name, bricks, creator, baseWidth, baseDepth, timestamp, composition } = body

    console.log("[v0] Save API received:", { id, name, bricksCount: bricks?.length, creator, composition })

    const brickData = bricks || body.blocks

    if (!brickData || !Array.isArray(brickData)) {
      return NextResponse.json({ error: "Invalid brick data" }, { status: 400 })
    }

    const buildId = id || `${timestamp || Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const buildData = {
      id: buildId,
      name: name || "Untitled Build",
      bricks: JSON.stringify(brickData),
      creator: creator || "unknown",
      baseWidth: baseWidth || 16,
      baseDepth: baseDepth || 16,
      timestamp: timestamp || Date.now(),
      composition: composition ? JSON.stringify(composition) : undefined,
    }

    // Save to Redis
    await redis.set(`build:${buildId}`, JSON.stringify(buildData))

    console.log("[v0] Build saved to Redis:", buildId, "with composition:", composition)

    return NextResponse.json({ buildId, success: true })
  } catch (error) {
    console.error("[v0] Save error:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
