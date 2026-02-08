import { type NextRequest, NextResponse } from "next/server"
import { getRedis } from "@/lib/redis"

export async function POST(request: NextRequest) {
  try {
    const redis = getRedis()

    console.log("[v0] Starting duplicate build fix migration...")

    // Get all minted tokens
    const mintedTokens = await redis.smembers("minted_tokens")
    console.log("[v0] Minted tokens:", mintedTokens)

    // Build a map of buildId -> tokenIds
    const buildIdToTokens = new Map<string, string[]>()

    for (const tokenId of mintedTokens) {
      const buildId = await redis.get(`token:${tokenId}`)
      if (buildId) {
        if (!buildIdToTokens.has(buildId)) {
          buildIdToTokens.set(buildId, [])
        }
        buildIdToTokens.get(buildId)!.push(tokenId)
      }
    }

    console.log("[v0] BuildId to tokens mapping:", Object.fromEntries(buildIdToTokens))

    // Find duplicates
    const duplicates: Array<{ buildId: string; tokens: string[] }> = []
    for (const [buildId, tokens] of buildIdToTokens.entries()) {
      if (tokens.length > 1) {
        duplicates.push({ buildId, tokens })
        console.log(`[v0] Found duplicate: buildId ${buildId} used by tokens ${tokens.join(", ")}`)
      }
    }

    if (duplicates.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No duplicates found",
        fixed: [],
      })
    }

    // Fix each duplicate by creating new buildIds for all but the first token
    const fixed: Array<{ tokenId: string; oldBuildId: string; newBuildId: string }> = []

    for (const { buildId, tokens } of duplicates) {
      // Keep the first token with the original buildId, fix the rest
      const [keepToken, ...fixTokens] = tokens.sort((a, b) => Number.parseInt(a) - Number.parseInt(b))

      console.log(`[v0] Keeping token ${keepToken} with buildId ${buildId}`)

      const originalBuildData = await redis.get(`build:${buildId}`)
      if (!originalBuildData) {
        console.error(`[v0] Build data not found for ${buildId}`)
        continue
      }

      // Handle both string and object responses from Redis
      const buildData = typeof originalBuildData === "string" ? JSON.parse(originalBuildData) : originalBuildData

      for (const tokenId of fixTokens) {
        // Generate new unique buildId for this token
        const newBuildId = `${buildId}-token${tokenId}`

        console.log(`[v0] Creating new buildId ${newBuildId} for token ${tokenId}`)

        // Update the build name to indicate it's a variant
        const newBuildData = {
          ...buildData,
          id: newBuildId,
          name: buildData.name ? `${buildData.name}-NFT${tokenId}` : `Build-NFT${tokenId}`,
        }

        // Store the new build data
        await redis.set(`build:${newBuildId}`, JSON.stringify(newBuildData))

        // Update the token mapping
        await redis.set(`token:${tokenId}`, newBuildId)

        fixed.push({
          tokenId,
          oldBuildId: buildId,
          newBuildId,
        })

        console.log(`[v0] Fixed token ${tokenId}: ${buildId} -> ${newBuildId}`)
      }
    }

    console.log(`[v0] Migration complete. Fixed ${fixed.length} duplicate mappings.`)

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed.length} duplicate build mappings`,
      fixed,
    })
  } catch (error) {
    console.error("[v0] Error fixing duplicate builds:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
