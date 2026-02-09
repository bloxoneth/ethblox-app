import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { validateBrickParams, computeSpecKey, VALID_DENSITIES } from "@/lib/brickSpec"
import { normalizeBrickKey } from "@/data/bricks"
import type { Build } from "@/lib/types"

// POST /api/builds/mint - Save full build data + mint info to Redis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { tokenId, buildHash, txHash, walletAddress } = body
    if (!tokenId || !buildHash || !walletAddress) {
      return NextResponse.json(
        { error: "Missing required fields: tokenId, buildHash, walletAddress" },
        { status: 400 },
      )
    }

    const rawBricks = body.bricks || []
    const kind = body.kind ?? 0
    const brickW = body.brickWidth ?? body.baseWidth ?? 1
    const brickD = body.brickDepth ?? body.baseDepth ?? 1
    const density = body.density

    // ── Kind 0 (Brick) validation ──
    if (kind === 0) {
      // Density is REQUIRED for bricks - never default to 1
      if (density === undefined || density === null) {
        return NextResponse.json(
          { error: "density is required for brick mints (kind=0). Must be one of: " + VALID_DENSITIES.join(", ") },
          { status: 400 },
        )
      }

      const validationError = validateBrickParams(brickW, brickD, density)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }

      // Duplicate check: has this spec already been minted?
      const specKey = computeSpecKey(brickW, brickD, density)
      const brickKey = normalizeBrickKey(brickW, brickD, density)
      const existingTokenId = await redis.get(`brick:spec:${brickKey}`)
      if (existingTokenId && String(existingTokenId) !== String(tokenId)) {
        return NextResponse.json(
          { error: `Brick ${brickKey} already minted as token #${existingTokenId}`, specKey },
          { status: 409 },
        )
      }
    }

    let bricks: any[]
    let baseWidth: number
    let baseDepth: number

    if (kind === 0 && brickW && brickD) {
      // Kind 0: canonical single brick at origin
      const defaultColor = rawBricks[0]?.color ?? "#e8d44d"
      bricks = [{
        id: "1",
        position: [0, 0.5, 0],
        color: defaultColor,
        width: brickW,
        depth: brickD,
      }]
      baseWidth = brickW
      baseDepth = brickD
    } else {
      // Kind 1+: preserve full composite geometry as-is
      bricks = rawBricks
      baseWidth = body.baseWidth ?? 16
      baseDepth = body.baseDepth ?? 16
    }

    const mass = body.mass ?? (kind === 0 ? brickW * brickD * density : bricks.length)
    const uniqueColors = body.colors ?? new Set(bricks.map((b: any) => b.color)).size
    const bw_score = body.bw_score ?? parseFloat((Math.log(1 + mass) * Math.log(2 + uniqueColors)).toFixed(2))

    const uniqueBuildId = `${tokenId}_${Date.now()}_${buildHash.slice(0, 8)}`

    const mintedBuild: Build = {
      // Identity
      id: uniqueBuildId,
      name: body.buildName || "Untitled Build",
      creator: walletAddress.toLowerCase(),

      // Canonical geometry
      bricks,
      baseWidth,
      baseDepth,

      // Scores
      mass,
      colors: uniqueColors,
      bw_score,

      // Chain data
      tokenId,
      buildHash,
      txHash,
      mintedAt: new Date().toISOString(),

      // Build type info
      kind: body.kind,
      density: body.density,
      brickWidth: body.brickWidth,
      brickDepth: body.brickDepth,

      // Composition (which NFTs are used inside this build)
      composition: body.composition,

      // Contract params (useful for verification / IPFS)
      geometryHash: body.geometryHash,
      specKey: body.specKey,
      componentBuildIds: body.componentBuildIds,
      componentCounts: body.componentCounts,

      // Metadata
      metadata: body.metadata,

      // Timestamps
      created: new Date().toISOString(),
      timestamp: Date.now(),
    }

    // Save full build data
    await redis.set(`build:${mintedBuild.id}`, mintedBuild)

    // Reverse lookups
    await redis.set(`token:${tokenId}`, mintedBuild.id)
    await redis.set(`hash:${buildHash}`, mintedBuild.id)

    // Brick spec reverse index (for duplicate detection)
    if (kind === 0) {
      const brickKey = normalizeBrickKey(brickW, brickD, density ?? 1)
      await redis.set(`brick:spec:${brickKey}`, tokenId)
    }

    // Add to global minted set
    await redis.sadd("minted_tokens", tokenId)

    return NextResponse.json({ success: true, build: mintedBuild })
  } catch (error) {
    console.error("Error saving mint data:", error)
    return NextResponse.json({ error: "Failed to save mint data" }, { status: 500 })
  }
}
