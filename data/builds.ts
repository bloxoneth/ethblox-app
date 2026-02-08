// Build NFT data - minted builds on-chain
// Fresh start - no dummy data, builds are minted on-chain via BuildNFT contract

export interface BuildNFT {
  id: string
  tokenId: number
  name: string
  geometryHash: string
  brickCount: number
  owner: string
  createdAt: number
  tags?: string[]
}

// Fixed tag taxonomy for future use
export const BUILD_TAGS = [
  "art",
  "pet",
  "pfp",
  "building",
  "vehicle",
  "abstract",
  "toy",
  "creature",
  "sculpture",
  "terrain",
] as const

export type BuildTag = (typeof BUILD_TAGS)[number]

// Empty builds array - will be populated from blockchain
// In production, this would be fetched from an indexer or subgraph
export const MINTED_BUILDS: BuildNFT[] = []

// Helper functions - will work with blockchain data when available
export function getBuildById(id: string): BuildNFT | undefined {
  return MINTED_BUILDS.find(b => b.id === id)
}

export function getBuildByTokenId(tokenId: number): BuildNFT | undefined {
  return MINTED_BUILDS.find(b => b.tokenId === tokenId)
}

export function getBuildsByOwner(owner: string): BuildNFT[] {
  return MINTED_BUILDS.filter(b => b.owner.toLowerCase() === owner.toLowerCase())
}

export function getBuildsByTag(tag: BuildTag): BuildNFT[] {
  return MINTED_BUILDS.filter(b => b.tags?.includes(tag))
}

// Sorting functions
export function sortByNewest(builds: BuildNFT[]): BuildNFT[] {
  return [...builds].sort((a, b) => b.createdAt - a.createdAt)
}

export function sortByOldest(builds: BuildNFT[]): BuildNFT[] {
  return [...builds].sort((a, b) => a.createdAt - b.createdAt)
}

export function sortByBrickCount(builds: BuildNFT[]): BuildNFT[] {
  return [...builds].sort((a, b) => b.brickCount - a.brickCount)
}
