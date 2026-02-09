// Script to register externally-minted token #2 (1x2-D1 brick) in Redis
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

async function seedToken2() {
  const tokenId = "2"
  const walletAddress = "0xe258b3c38cc85e251a1bdb3e60a8a85a071090b7"
  const buildId = tokenId + "_" + Date.now() + "_seed"

  const mintedBuild = {
    id: buildId,
    name: "1x2-D1",
    kind: 0,
    bricks: [{ id: "1", position: [0, 0.5, 0], color: "#e8d44d", width: 1, depth: 2 }],
    timestamp: Date.now(),
    creator: walletAddress.toLowerCase(),
    baseWidth: 1,
    baseDepth: 2,
    tokenId: tokenId,
    buildHash: "",
    txHash: "",
    mintedAt: new Date().toISOString(),
    mass: 2,
    density: 1,
    brickWidth: 1,
    brickDepth: 2,
    colors: 1,
    bw_score: 0,
    created: new Date().toISOString(),
  }

  await redis.set("build:" + buildId, mintedBuild)
  await redis.set("token:" + tokenId, buildId)
  await redis.sadd("minted_tokens", tokenId)

  console.log("Token #" + tokenId + " registered in Redis with buildId: " + buildId)
  
  const members = await redis.smembers("minted_tokens")
  console.log("minted_tokens set:", members)
}

seedToken2().catch(console.error)
