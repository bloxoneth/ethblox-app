import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { normalizeBrickKey } from "@/data/bricks"

// Returns a set of all minted brick specs (kind=0) from Redis
// Format: ["1x2-D1", "2x2-D1", ...] always normalized (min x max)
// This is called once on page load to cache all minted bricks client-side
export async function GET() {
  try {
    const tokenIds = await redis.smembers("minted_tokens")
    
    if (!tokenIds || tokenIds.length === 0) {
      return NextResponse.json({ mintedBricks: [] })
    }
    
    const mintedSet = new Set<string>()
    
    await Promise.all(
      tokenIds.map(async (tokenId) => {
        try {
          const buildId = await redis.get<string>(`token:${tokenId}`)
          if (!buildId) return
          
          const build = await redis.get<Record<string, unknown>>(`build:${buildId}`)
          if (!build) return
          
          // Only include kind=0 (brick NFTs)
          if (build.kind === 0 || build.kind === "0") {
            const w = Number(build.brickWidth || build.baseWidth || 1)
            const d = Number(build.brickDepth || build.baseDepth || 1)
            const dens = Number(build.density || 1)
            mintedSet.add(normalizeBrickKey(w, d, dens))
          }
        } catch {
          // skip this token
        }
      })
    )
    
    return NextResponse.json({ mintedBricks: [...mintedSet] })
  } catch (error) {
    console.error("Failed to check minted bricks:", error)
    return NextResponse.json({ mintedBricks: [] })
  }
}
