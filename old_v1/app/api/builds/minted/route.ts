import { type NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"
import { CONTRACTS, BUILD_NFT_ABI } from "@/lib/contracts/ethblox-contracts"
import { redis } from "@/lib/redis"
import type { Build } from "@/lib/types"

// GET /api/builds/minted - Fetch all minted builds from blockchain or Redis
export async function GET(request: NextRequest) {
  try {
    console.log("[v0 PRODUCTION DEBUG] /api/builds/minted called")
    console.log("[v0 PRODUCTION DEBUG] Environment check:", {
      hasRedisUrl: !!process.env.KV_REST_API_URL,
      hasRedisToken: !!process.env.KV_REST_API_TOKEN,
      hasRpcUrl: !!process.env.BASE_SEPOLIA_RPC_URL,
    })

    const redisWithTimeout = async <T,>(operation: Promise<T>, timeoutMs = 5000): Promise<T | null> => {
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
      return (await Promise.race([operation, timeoutPromise])) as T | null
    }

    // First, try to fetch from Redis with timeout
    console.log("[v0 PRODUCTION DEBUG] Attempting to fetch from Redis...")
    const tokenIds = await redisWithTimeout(redis.smembers("minted_tokens"))
    console.log("[v0 PRODUCTION DEBUG] Redis smembers result:", {
      success: !!tokenIds,
      count: tokenIds?.length || 0,
      tokenIds: tokenIds,
      type: Array.isArray(tokenIds) ? "array" : typeof tokenIds,
    })

    if (tokenIds && tokenIds.length > 0) {
      console.log("[v0 PRODUCTION DEBUG] Processing", tokenIds.length, "tokens from Redis")
      const builds = []

      const buildPromises = tokenIds.map(async (tokenId) => {
        try {
          console.log("[v0 PRODUCTION DEBUG] Fetching token:", tokenId)

          // Get buildId from token lookup
          const buildId = await redis.get<string>(`token:${tokenId}`)
          console.log("[v0 PRODUCTION DEBUG] Token lookup result:", { tokenId, buildId })

          if (!buildId) {
            console.log("[v0 PRODUCTION DEBUG] No buildId found, trying alt key for token", tokenId)
            const altBuildId = await redis.get<string>(`build:token:${tokenId}`)
            console.log("[v0 PRODUCTION DEBUG] Alt lookup result:", { tokenId, altBuildId })

            if (!altBuildId) {
              return null
            }
            const altBuild = await redis.get<Build>(`build:${altBuildId}`)
            console.log("[v0 PRODUCTION DEBUG] Alt build data:", {
              tokenId,
              altBuildId,
              hasBuild: !!altBuild,
              hasBricks: !!altBuild?.bricks,
              bricksType: Array.isArray(altBuild?.bricks) ? "array" : typeof altBuild?.bricks,
              bricksCount: Array.isArray(altBuild?.bricks) ? altBuild.bricks.length : 0,
            })

            if (altBuild) {
              return {
                ...altBuild,
                tokenId,
                buildId: altBuildId,
              }
            }
            return null
          }

          // Fetch the full build data
          const build = await redis.get<Build>(`build:${buildId}`)
          console.log("[v0 PRODUCTION DEBUG] Build data fetched:", {
            tokenId,
            buildId,
            hasBuild: !!build,
            buildKeys: build ? Object.keys(build) : [],
            hasBricks: !!build?.bricks,
            bricksType: build?.bricks ? (Array.isArray(build.bricks) ? "array" : typeof build.bricks) : "undefined",
          })

          if (!build) {
            console.log("[v0 PRODUCTION DEBUG] No build data found for buildId", buildId)
            return null
          }

          let bricks = build.bricks
          if (typeof bricks === "string") {
            console.log("[v0 PRODUCTION DEBUG] Parsing bricks string for", buildId)
            try {
              bricks = JSON.parse(bricks)
              console.log("[v0 PRODUCTION DEBUG] Successfully parsed bricks:", {
                buildId,
                bricksCount: Array.isArray(bricks) ? bricks.length : 0,
              })
            } catch (e) {
              console.error("[v0 PRODUCTION DEBUG] Failed to parse bricks for build", buildId, e)
            }
          }

          const result = {
            ...build,
            bricks,
            tokenId,
            buildId,
          }

          console.log("[v0 PRODUCTION DEBUG] Returning build:", {
            tokenId,
            buildId,
            name: build.name,
            hasBricks: !!result.bricks,
            bricksIsArray: Array.isArray(result.bricks),
            bricksCount: Array.isArray(result.bricks) ? result.bricks.length : 0,
          })

          return result
        } catch (error) {
          console.error("[v0 PRODUCTION DEBUG] Error fetching build for token", tokenId, {
            error,
            message: error instanceof Error ? error.message : String(error),
          })
          return null
        }
      })

      // Wait for all build fetches to complete
      const buildResults = await Promise.all(buildPromises)
      console.log("[v0 PRODUCTION DEBUG] All builds fetched:", {
        total: buildResults.length,
        nonNull: buildResults.filter((b) => b !== null).length,
      })

      // Filter out null results and add to builds array
      for (const build of buildResults) {
        if (build) {
          builds.push(build)
        }
      }

      console.log("[v0 PRODUCTION DEBUG] Successfully fetched", builds.length, "builds from Redis")
      console.log(
        "[v0 PRODUCTION DEBUG] First build sample:",
        builds[0]
          ? {
              tokenId: builds[0].tokenId,
              name: builds[0].name,
              hasBricks: !!builds[0].bricks,
              bricksCount: Array.isArray(builds[0].bricks) ? builds[0].bricks.length : 0,
            }
          : null,
      )

      const sortedBuilds = builds.sort((a, b) => Number(b.tokenId) - Number(a.tokenId))

      return NextResponse.json({ builds: sortedBuilds })
    }

    // If Redis fails or has no data, fetch from blockchain
    console.log("[v0 PRODUCTION DEBUG] Redis returned no data, falling back to blockchain")
    console.log("[v0 PRODUCTION DEBUG] Note: Blockchain fallback will NOT have bricks data embedded")

    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"
    console.log("[v0 PRODUCTION DEBUG] Using RPC URL:", rpcUrl.substring(0, 30) + "...")

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)

    const currentBlock = await provider.getBlockNumber()
    const CHUNK_SIZE = 10000 // Smaller chunk size for reliability
    const allTransfers: Array<{ tokenId: string; to: string }> = []

    // Start from recent blocks (last ~20k blocks)
    const fromBlock = Math.max(0, currentBlock - 20000)

    console.log("[v0] Querying Transfer events from block", fromBlock, "to", currentBlock)

    for (let start = fromBlock; start <= currentBlock; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, currentBlock)

      try {
        // Query all Transfer events (including mints from zero address)
        const filter = contract.filters.Transfer(null, null)
        const events = await contract.queryFilter(filter, start, end)

        for (const event of events) {
          const log = event as ethers.EventLog
          if (log.args) {
            allTransfers.push({
              tokenId: log.args.tokenId.toString(),
              to: log.args.to,
            })
          }
        }
        console.log(`[v0] Found ${events.length} events in blocks ${start}-${end}`)
      } catch (chunkError) {
        console.error(`[v0] Error in chunk ${start}-${end}:`, chunkError)
      }
    }

    console.log("[v0] Processing", allTransfers.length, "transfer events")

    const builds = []

    for (const tokenId of allTransfers.map((t) => t.tokenId)) {
      try {
        // Verify token exists (will throw if burned)
        const owner = await contract.ownerOf(tokenId)

        builds.push({
          tokenId,
          buildId: `build_${tokenId}`,
          name: `Build #${tokenId}`,
          mass: 0,
          creator: owner,
        })
      } catch (error) {
        // Token was burned, skip it
        console.log("[v0] Token", tokenId, "does not exist (burned)")
      }
    }

    console.log("[v0] Found", builds.length, "valid builds")

    // Sort by tokenId descending
    const sortedBuilds = builds.sort((a, b) => Number(b.tokenId) - Number(a.tokenId))

    return NextResponse.json({ builds: sortedBuilds })
  } catch (error) {
    console.error("[v0 PRODUCTION DEBUG] Top-level error in /api/builds/minted:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: "Failed to fetch minted builds", details: String(error) }, { status: 500 })
  }
}
