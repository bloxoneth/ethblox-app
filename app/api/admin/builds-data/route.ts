import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function GET() {
  try {
    console.log("[v0] Starting Redis scan...")
    const startTime = Date.now()

    let cursor = "0"
    const allKeys: string[] = []

    // Scan iteratively
    do {
      const result: any = await redis.scan(cursor, { match: "build:*", count: 100 })
      cursor = result[0].toString()
      if (result[1] && result[1].length > 0) {
        allKeys.push(...result[1])
      }
    } while (cursor !== "0")

    console.log("[v0] Found build keys:", allKeys.length)

    const [mintedTokens, ...buildDataArray] = await Promise.all([
      redis.smembers("minted_tokens"),
      ...allKeys.map((key) => redis.get(key)),
    ])

    console.log("[v0] Minted tokens:", mintedTokens)

    const tokenMappings = await Promise.all(
      (mintedTokens as string[]).map(async (tokenId) => {
        const buildId = await redis.get<string>(`token:${tokenId}`)
        return { tokenId, buildId }
      }),
    )

    // Create reverse lookup from buildId to ALL tokenIds that reference it
    const buildIdToTokenIds = new Map<string, string[]>()
    for (const { tokenId, buildId } of tokenMappings) {
      if (buildId) {
        const existing = buildIdToTokenIds.get(buildId) || []
        existing.push(tokenId)
        buildIdToTokenIds.set(buildId, existing)
      }
    }

    const buildResults: any[] = []

    // Process all builds with their fetched data
    for (let i = 0; i < allKeys.length; i++) {
      const key = allKeys[i]
      const data = buildDataArray[i]

      if (!data) {
        buildResults.push({ key, error: "No data found" })
        continue
      }

      try {
        // Parse the JSON if it's a string
        const parsed = typeof data === "string" ? JSON.parse(data) : data
        const buildId = key.replace("build:", "")

        const tokenIds = buildIdToTokenIds.get(buildId)

        if (tokenIds && tokenIds.length > 0) {
          // Create a separate entry for each token that references this build
          for (const tokenId of tokenIds) {
            buildResults.push({
              key,
              buildId,
              tokenId,
              ...parsed,
            })
          }
        } else {
          // No tokens reference this build, add it once without tokenId
          buildResults.push({
            key,
            buildId,
            ...parsed,
          })
        }
      } catch (error) {
        console.error(`[v0] Error parsing ${key}:`, error)
        buildResults.push({ key, error: "Failed to parse" })
      }
    }

    const elapsed = Date.now() - startTime
    console.log(`[v0] Returning ${buildResults.length} build entries in ${elapsed}ms`)

    return NextResponse.json({ builds: buildResults, count: buildResults.length })
  } catch (error) {
    console.error("[v0] Error scanning Redis:", error)
    return NextResponse.json({ error: "Failed to fetch builds", builds: [] }, { status: 500 })
  }
}
