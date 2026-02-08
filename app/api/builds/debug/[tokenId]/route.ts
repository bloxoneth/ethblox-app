import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"

// GET /api/builds/debug/[tokenId] - Debug endpoint to see raw NFT data
export async function GET(request: NextRequest, { params }: { params: Promise<{ tokenId: string }> }) {
  try {
    const { tokenId } = await params

    // Get the buildId from token lookup
    const buildId = await redis.get(`token:${tokenId}`)
    console.log(`[v0] Debug: Token ${tokenId} -> buildId: ${buildId}`)

    if (!buildId) {
      return NextResponse.json({
        error: "Token not found",
        tokenId,
        lookupKey: `token:${tokenId}`,
      })
    }

    // Get the full build data
    const buildData = await redis.get(`build:${buildId}`)
    console.log(`[v0] Debug: Build data type:`, typeof buildData)

    if (!buildData) {
      return NextResponse.json({
        error: "Build data not found",
        tokenId,
        buildId,
        buildKey: `build:${buildId}`,
      })
    }

    // Analyze the bricks
    const build = typeof buildData === "string" ? JSON.parse(buildData) : buildData
    const bricks = build.bricks || []

    // Get unique Y values to see layer structure
    const yValues = bricks.map((b: any) => b.position?.[1]).filter((y: any) => y !== undefined)
    const uniqueYValues = [...new Set(yValues)].sort((a: number, b: number) => a - b)

    // Sample of first 10 bricks with their positions
    const sampleBricks = bricks.slice(0, 10).map((b: any) => ({
      position: b.position,
      width: b.width,
      depth: b.depth,
      color: b.color,
    }))

    return NextResponse.json({
      tokenId,
      buildId,
      buildName: build.name,
      totalBricks: bricks.length,
      uniqueYValues,
      layerCount: uniqueYValues.length,
      yRange: {
        min: Math.min(...yValues),
        max: Math.max(...yValues),
      },
      sampleBricks,
      rawBuildKeys: Object.keys(build),
    })
  } catch (error) {
    console.error("[v0] Debug endpoint error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
