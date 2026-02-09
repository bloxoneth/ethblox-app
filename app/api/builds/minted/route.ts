import { NextResponse } from "next/server"
import { ethers } from "ethers"
import { redis } from "@/lib/redis"
import { CONTRACTS, BUILD_NFT_ABI, RPC_URL } from "@/lib/contracts/ethblox-contracts"
import type { Build } from "@/lib/types"

// GET /api/builds/minted - Chain is truth, Redis is cache
export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)

    let nextTokenId = 1n
    try {
      nextTokenId = await contract.nextTokenId()
    } catch {
      // if nextTokenId not available, fall back to Redis-only
    }

    const chainTokenIds: number[] = []
    const owners = new Map<number, string>()

    for (let id = 1n; id < nextTokenId; id++) {
      try {
        const owner = await contract.ownerOf(id)
        const tokenId = Number(id)
        chainTokenIds.push(tokenId)
        owners.set(tokenId, owner)
      } catch {
        // burned/nonexistent
      }
    }

    // Sync Redis minted_tokens with chain truth (best effort)
    if (chainTokenIds.length > 0) {
      await Promise.all(chainTokenIds.map((id) => redis.sadd("minted_tokens", String(id))))
    }

    const mintedSet = new Set(chainTokenIds.map(String))
    const cachedTokenIds = await redis.smembers("minted_tokens")
    if (cachedTokenIds?.length) {
      const stale = cachedTokenIds.filter((id) => !mintedSet.has(id))
      if (stale.length > 0) {
        await Promise.all(stale.map((id) => redis.srem("minted_tokens", id)))
      }
    }

    const builds: Build[] = []

    for (const tokenId of chainTokenIds) {
      try {
        const buildId = await redis.get<string>(`token:${tokenId}`)
        if (buildId) {
          const build = await redis.get<Build>(`build:${buildId}`)
          if (build) {
            builds.push({ ...build, tokenId: String(tokenId), buildId })
            continue
          }
        }

        // Fallback: minimal build from chain
        let kind: number | undefined
        try {
          const k = await contract.kind(tokenId)
          kind = Number(k)
        } catch {
          // ignore
        }

        const owner = owners.get(tokenId) ?? "0x0000000000000000000000000000000000000000"

        builds.push({
          id: `chain_${tokenId}`,
          name: `ETHBLOX #${tokenId}`,
          creator: owner.toLowerCase(),
          bricks: [],
          tokenId: String(tokenId),
          kind,
        })
      } catch {
        // skip token on error
      }
    }

    builds.sort((a, b) => Number(b.tokenId) - Number(a.tokenId))
    return NextResponse.json({ builds })
  } catch (error) {
    console.error("Failed to fetch minted builds:", error)
    return NextResponse.json({ builds: [] })
  }
}
