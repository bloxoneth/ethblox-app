// Migration: Canonicalize Kind 0 brick geometry in Redis
// A minted brick IS a single brick at origin - component pieces are provenance only
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

async function fixBrickGeometry() {
  const keys = await redis.keys("build:*")
  console.log(`Found ${keys.length} build keys`)

  let fixed = 0
  for (const key of keys) {
    const build = await redis.get(key)
    if (!build) continue

    // Only fix Kind 0 bricks that have multiple sub-bricks
    if (build.kind !== 0) continue
    if (!build.bricks || build.bricks.length <= 1) continue

    const brickW = build.brickWidth ?? build.baseWidth ?? 1
    const brickD = build.brickDepth ?? build.baseDepth ?? 1
    const defaultColor = build.bricks[0]?.color ?? "#e8d44d"

    console.log(`Fixing token ${build.tokenId} (${build.name}): ${build.bricks.length} sub-bricks -> 1x ${brickW}x${brickD} canonical brick`)

    // Replace with canonical single brick at origin
    build.bricks = [{
      id: "1",
      position: [0, 0.5, 0],
      color: defaultColor,
      width: brickW,
      depth: brickD,
    }]
    build.baseWidth = brickW
    build.baseDepth = brickD

    await redis.set(key, build)
    fixed++
  }

  console.log(`Fixed ${fixed} Kind 0 bricks with composite geometry`)
}

fixBrickGeometry().catch(console.error)
