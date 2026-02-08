import { NextResponse } from "next/server"
import { ethers } from "ethers"
import { redis } from "@/lib/redis"

const CONTRACT_ADDRESS = "0x574Ab3248841C7F3b46dcDEfF074ACCef96AE132"
const CONTRACT_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
]

export async function POST() {
  try {
    console.log("[v0] Starting token backfill...")

    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org")
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)

    const filter = contract.filters.Transfer(ethers.ZeroAddress, null, null)
    const events = await contract.queryFilter(filter, 0, "latest")

    console.log(`[v0] Found ${events.length} mint events`)

    const results = {
      scanned: 0,
      added: 0,
      burned: 0,
      alreadyExists: 0,
      errors: [] as string[],
    }

    for (const event of events) {
      if (!event.args) continue

      const tokenId = event.args.tokenId.toString()
      results.scanned++

      try {
        const owner = await contract.ownerOf(tokenId)
        console.log(`[v0] Token ${tokenId} owned by ${owner}`)

        const existing = await redis.sismember("minted_tokens", tokenId)
        if (existing) {
          console.log(`[v0] Token ${tokenId} already in Redis`)
          results.alreadyExists++
          continue
        }

        await redis.sadd("minted_tokens", tokenId)

        const buildId = `build_backfilled_${Date.now()}_${tokenId}`
        await redis.set(`token:${tokenId}`, buildId)

        // You'll need to manually add the build data if you have it

        console.log(`[v0] Added token ${tokenId} to Redis`)
        results.added++
      } catch (error: any) {
        if (error.message?.includes("owner query for nonexistent token")) {
          console.log(`[v0] Token ${tokenId} was burned`)
          results.burned++
        } else {
          console.error(`[v0] Error processing token ${tokenId}:`, error)
          results.errors.push(`Token ${tokenId}: ${error.message}`)
        }
      }
    }

    console.log("[v0] Backfill complete:", results)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error: any) {
    console.error("[v0] Backfill error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
