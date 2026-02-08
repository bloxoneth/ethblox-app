import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"

// POST /api/admin/clear-gallery - Clear all minted NFT data from Redis
// This is for fresh contract deployments
export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const authHeader = request.headers.get("x-admin-token")
    const adminToken = process.env.ADMIN_RESET_TOKEN
    
    if (!adminToken || authHeader !== adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results: Record<string, number | string> = {}
    
    // Clear minted_tokens set
    try {
      const deleted = await redis.del("minted_tokens")
      results["minted_tokens"] = deleted ? "deleted" : "not found"
    } catch (e) {
      results["minted_tokens"] = "error"
    }
    
    // Clear builds:public sorted set
    try {
      const deleted = await redis.del("builds:public")
      results["builds:public"] = deleted ? "deleted" : "not found"
    } catch (e) {
      results["builds:public"] = "error"
    }
    
    // Clear all token:* keys
    try {
      const tokenKeys = await redis.keys("token:*")
      if (tokenKeys.length > 0) {
        await Promise.all(tokenKeys.map(key => redis.del(key)))
      }
      results["token:*"] = tokenKeys.length
    } catch (e) {
      results["token:*"] = "error"
    }
    
    // Clear all build:* keys
    try {
      const buildKeys = await redis.keys("build:*")
      if (buildKeys.length > 0) {
        await Promise.all(buildKeys.map(key => redis.del(key)))
      }
      results["build:*"] = buildKeys.length
    } catch (e) {
      results["build:*"] = "error"
    }
    
    // Clear all hash:* keys
    try {
      const hashKeys = await redis.keys("hash:*")
      if (hashKeys.length > 0) {
        await Promise.all(hashKeys.map(key => redis.del(key)))
      }
      results["hash:*"] = hashKeys.length
    } catch (e) {
      results["hash:*"] = "error"
    }

    console.log("[ADMIN] Gallery data cleared:", results)

    return NextResponse.json({ 
      success: true, 
      message: "Gallery data cleared for fresh contract deployment",
      results 
    })
  } catch (error) {
    console.error("[ADMIN] Error clearing gallery:", error)
    return NextResponse.json({ error: "Failed to clear gallery data" }, { status: 500 })
  }
}
