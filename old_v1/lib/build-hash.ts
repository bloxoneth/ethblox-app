/**
 * Generate a deterministic hash for a build's geometry
 * This hash represents the unique structure of the build and will be used for NFT minting
 */

export interface BuildGeometry {
  bricks: Array<{
    position: [number, number, number]
    color: string
    width: number
    depth: number
  }>
  baseWidth: number
  baseDepth: number
}

/**
 * Generate a deterministic SHA-256 hash from build geometry
 * The hash is based on sorted brick data to ensure consistency
 */
export async function generateBuildHash(geometry: BuildGeometry): Promise<string> {
  // Sort bricks by position to ensure deterministic ordering
  const sortedBricks = [...geometry.bricks].sort((a, b) => {
    // Sort by Y (height) first, then X, then Z
    if (a.position[1] !== b.position[1]) return a.position[1] - b.position[1]
    if (a.position[0] !== b.position[0]) return a.position[0] - b.position[0]
    return a.position[2] - b.position[2]
  })

  // Create a deterministic string representation
  const geoJsonString = JSON.stringify({
    version: "1.0",
    baseWidth: geometry.baseWidth,
    baseDepth: geometry.baseDepth,
    bricks: sortedBricks.map((brick) => ({
      p: brick.position, // position
      c: brick.color, // color
      w: brick.width, // width
      d: brick.depth, // depth
    })),
  })

  // Generate SHA-256 hash
  const encoder = new TextEncoder()
  const data = encoder.encode(geoJsonString)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

  return `0x${hashHex}`
}

/**
 * Validate a build hash format
 */
export function isValidBuildHash(hash: string): boolean {
  return /^0x[a-f0-9]{64}$/i.test(hash)
}
