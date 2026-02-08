import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import type { Build } from "@/lib/types"

// POST /api/builds/mint - Save build with tokenId after successful mint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { buildId, tokenId, buildHash, txHash, walletAddress, buildName, bricks, baseWidth, baseDepth } = body

    if (!tokenId || !buildHash || !walletAddress) {
      return NextResponse.json({ error: "Missing required fields: tokenId, buildHash, walletAddress" }, { status: 400 })
    }

    if (bricks && bricks.length > 0) {
      const yValues = [...new Set(bricks.map((b: any) => b.position[1]))].sort((a: number, b: number) => a - b)
      console.log(`[v0] MINT SAVE - Token ${tokenId}: ${bricks.length} bricks, Y values:`, yValues)
      console.log(`[v0] MINT SAVE - Layer count: ${yValues.length}`)
      console.log(`[v0] MINT SAVE - Sample brick:`, JSON.stringify(bricks[0]))
    }

    const uniqueBuildId = `${tokenId}_${Date.now()}_${buildHash.slice(0, 8)}`

    const mintedBuild: Build = {
      id: uniqueBuildId,
      name: buildName || "Untitled Build",
      bricks: bricks || [],
      timestamp: Date.now(),
      creator: walletAddress.toLowerCase(),
      baseWidth: baseWidth || 16,
      baseDepth: baseDepth || 16,
      tokenId,
      buildHash,
      txHash,
      mintedAt: new Date().toISOString(),
    }

    // Save build to Redis with unique key
    await redis.set(`build:${mintedBuild.id}`, mintedBuild)

    const savedBuild = (await redis.get(`build:${mintedBuild.id}`)) as Build | null
    if (savedBuild && savedBuild.bricks) {
      const savedYValues = [...new Set(savedBuild.bricks.map((b: any) => b.position[1]))].sort(
        (a: number, b: number) => a - b,
      )
      console.log(`[v0] MINT VERIFY - After save, Y values:`, savedYValues)
      console.log(`[v0] MINT VERIFY - After save, layer count: ${savedYValues.length}`)
    }

    // Create reverse lookup from tokenId to buildId
    await redis.set(`token:${tokenId}`, mintedBuild.id)

    // Create reverse lookup from buildHash to buildId (this may point to the most recent mint)
    await redis.set(`hash:${buildHash}`, mintedBuild.id)

    // Add to minted_tokens set
    await redis.sadd("minted_tokens", tokenId)

    console.log(`[v0] Build ${mintedBuild.id} minted as token ${tokenId} and saved to Redis`)

    return NextResponse.json({ success: true, build: mintedBuild })
  } catch (error) {
    console.error("[v0] Error saving mint data:", error)
    return NextResponse.json({ error: "Failed to save mint data" }, { status: 500 })
  }
}
