export type Brick = {
  color: string
  position: [number, number, number] // x, y, z
  width: number
  depth: number
  nftGroupId?: string // Groups bricks that belong to the same placed NFT
}

export type Build = {
  id: string
  name: string
  creator: string
  bricks: Brick[]
  mass: number // total number of bricks
  colors: number // unique colors used
  bw_score: number // builder weight score
  created: string // ISO date string
  buildHash?: string // SHA-256 hash of build geometry for NFT minting
  tokenId?: string // NFT token ID after minting
  txHash?: string // Transaction hash of the mint
  mintedAt?: string // ISO date string when NFT was minted
  composition?: NftComposition // NFT builds used in this build
}

export type BuildMetadata = {
  id: string
  name: string
  creator: string
  mass: number
  colors: number
  bw_score: number
  created: string
  buildHash?: string
  tokenId?: string
  mintedAt?: string
}

export type NftComposition = {
  [tokenId: string]: {
    count: number
    name: string
  }
}
