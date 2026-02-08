import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

async function dumpRedisToCSV() {
  console.log("[v0] Starting Redis data dump...")

  // Get all keys
  const keys = await redis.keys("*")
  console.log(`[v0] Found ${keys.length} keys in Redis`)

  const csvRows: string[] = []

  // CSV Header
  csvRows.push(
    "Key,Type,TokenId,BuildId,Name,Creator,BuildHash,GeoHash,TxHash,MintedAt,BricksCount,BricksData,BaseWidth,BaseDepth,Timestamp",
  )

  // Process each key
  for (const key of keys) {
    try {
      const data = await redis.get(key)

      if (!data) {
        csvRows.push(`${key},EMPTY,,,,,,,,,,,,,,`)
        continue
      }

      // Determine key type
      let keyType = "UNKNOWN"
      if (key.includes("token:")) keyType = "TOKEN_MAPPING"
      else if (key.includes("build:")) keyType = "BUILD_DATA"
      else if (key.includes("minted:")) keyType = "MINTED_SET"

      // Parse data
      const dataObj = typeof data === "string" ? JSON.parse(data) : data

      // Extract fields
      const tokenId = dataObj.tokenId || ""
      const buildId = dataObj.id || dataObj.buildId || key.replace("build:", "")
      const name = dataObj.name || ""
      const creator = dataObj.creator || ""
      const buildHash = dataObj.buildHash || ""
      const geoHash = dataObj.geoHash || ""
      const txHash = dataObj.txHash || ""
      const mintedAt = dataObj.mintedAt || ""
      const bricks = dataObj.bricks || []
      const bricksCount = Array.isArray(bricks) ? bricks.length : typeof bricks === "string" ? "STORED_AS_STRING" : 0
      const bricksData = Array.isArray(bricks)
        ? JSON.stringify(bricks).replace(/,/g, ";")
        : typeof bricks === "string"
          ? `STRING:${bricks.substring(0, 50)}...`
          : ""
      const baseWidth = dataObj.baseWidth || ""
      const baseDepth = dataObj.baseDepth || ""
      const timestamp = dataObj.timestamp || ""

      csvRows.push(
        `"${key}","${keyType}","${tokenId}","${buildId}","${name}","${creator}","${buildHash}","${geoHash}","${txHash}","${mintedAt}","${bricksCount}","${bricksData}","${baseWidth}","${baseDepth}","${timestamp}"`,
      )
    } catch (error) {
      console.error(`[v0] Error processing key ${key}:`, error)
      csvRows.push(`"${key}","ERROR",,,,,,,,,,,,,,`)
    }
  }

  const csvContent = csvRows.join("\n")
  console.log("\n=== REDIS DATA DUMP CSV ===\n")
  console.log(csvContent)
  console.log("\n=== END OF DUMP ===\n")

  return csvContent
}

dumpRedisToCSV().catch(console.error)
