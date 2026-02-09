// Script to register externally-minted token #1 in Redis
// TX: https://sepolia.basescan.org/tx/0x37c60c0d2c07569044fb94840a6f93bedb1907e19acc7e699a5ddac93fdaf652
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

async function seedToken1() {
  const tokenId = "1"
  const buildHash = "0xeb38ea055d70d348cf22350be92b9fd5bd2e313dc6f092d109a07a405aac1a35"
  const txHash = "0x37c60c0d2c07569044fb94840a6f93bedb1907e19acc7e699a5ddac93fdaf652"
  const walletAddress = "0xe258b3c38cc85e251a1bdb3e60a8a85a071090b7"
  const buildId = tokenId + "_" + Date.now() + "_" + buildHash.slice(0, 10)

  const mintedBuild = {
    id: buildId,
    name: "1x1-D1",
    kind: 0,
    bricks: [{ id: "1", position: [0, 0.5, 0], color: "#e8d44d", width: 1, depth: 1 }],
    timestamp: Date.now(),
    creator: walletAddress.toLowerCase(),
    baseWidth: 1,
    baseDepth: 1,
    tokenId: tokenId,
    buildHash: buildHash,
    txHash: txHash,
    mintedAt: new Date().toISOString(),
    mass: 1,
    density: 1,
    brickWidth: 1,
    brickDepth: 1,
    colors: 1,
    bw_score: 0,
    created: new Date().toISOString(),
  }

  // Save build data
  await redis.set("build:" + buildId, mintedBuild)
  
  // Create reverse lookups
  await redis.set("token:" + tokenId, buildId)
  await redis.set("hash:" + buildHash, buildId)
  
  // Add to minted_tokens set
  await redis.sadd("minted_tokens", tokenId)

  console.log("Token #" + tokenId + " registered in Redis with buildId: " + buildId)
  
  // Verify
  const members = await redis.smembers("minted_tokens")
  console.log("minted_tokens set:", members)
  
  const savedBuild = await redis.get("build:" + buildId)
  console.log("Saved build:", savedBuild ? "OK" : "MISSING")
}

seedToken1().catch(console.error)
