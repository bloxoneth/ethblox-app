import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

async function clearGalleryData() {
  console.log("Starting gallery data clear...")
  
  const keysToDelete = [
    "minted_tokens",
    "builds:public",
  ]
  
  const patterns = [
    "token:*",
    "build:*",
    "hash:*",
    "minted:*",
  ]
  
  let totalDeleted = 0
  
  // Delete specific keys
  for (const key of keysToDelete) {
    try {
      const result = await redis.del(key)
      if (result) {
        console.log(`Deleted key: ${key}`)
        totalDeleted++
      }
    } catch (err) {
      console.log(`Key not found or error: ${key}`)
    }
  }
  
  // Delete pattern-based keys
  for (const pattern of patterns) {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        for (const key of keys) {
          await redis.del(key)
        }
        console.log(`Deleted ${keys.length} keys matching: ${pattern}`)
        totalDeleted += keys.length
      }
    } catch (err) {
      console.log(`Error with pattern: ${pattern}`)
    }
  }
  
  console.log(`\nTotal keys deleted: ${totalDeleted}`)
  console.log("Gallery data cleared successfully!")
}

clearGalleryData()
