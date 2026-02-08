import { ethers } from "ethers"

// Constants
export const FEE_PER_MINT = ethers.parseEther("0.01") // 0.01 ETH mint fee
export const BLOX_DECIMALS = 18n

// Build kinds
export const BUILD_KIND = {
  BRICK: 0, // kind=0 for individual bricks
  BUILD: 1, // kind>0 for composite builds
} as const

// Contract addresses on Base Sepolia (Fresh deployment - Feb 2026)
export const CONTRACTS = {
  MOCK_BLOX: "0x6578d53995FEB0e486135b893B8bC16AE1a5Ec52", // Unchanged - BLOX token
  BUILD_NFT: "0x6Da8ABFeCfd468E6CfCc551E014388f7B279f1A3",
  LICENSE_REGISTRY: "0x6Fe315D0CA4EB570dC96d2b1C7E2a287d492Cc5A",
  LICENSE_NFT: "0xfEb8dCa56E849E91E7D3B4a2Ba2673Bb5FDf080E",
  DISTRIBUTOR: "0xf9b225DAbD233a28da36C3379197bD165759E865",
  BASE_SEPOLIA_CHAIN_ID: "0x14a34", // 84532
}

// Minimal ABIs
export const MOCK_BLOX_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]

// BuildNFT ABI - extended with kind, brickSpec, and state reading
export const BUILD_NFT_ABI = [
  // Minting - new format per contract spec
  "function mint(bytes32 geometryHash, uint256 mass, string uri, uint256[] componentBuildIds, uint256[] componentCounts, uint8 kind, uint8 width, uint8 depth, uint8 density) payable",
  // Legacy minting functions (may still exist)
  "function mintBrick(bytes32 geometryHash, uint8 width, uint8 depth, uint8 density)",
  "function mintBuild(bytes32 geometryHash, uint256 mass, uint8 kind, uint256[] calldata componentTokenIds)",
  // State reading
  "function kind(uint256 tokenId) view returns (uint8)",
  "function geometryHash(uint256 tokenId) view returns (bytes32)",
  "function brickSpec(uint256 tokenId) view returns (uint8 width, uint8 depth, uint8 density)",
  "function lockedBlox(uint256 tokenId) view returns (uint256)",
  "function escrowedLicenses(uint256 tokenId, uint256 licenseId) view returns (uint256)",
  "function maxMass() view returns (uint256)",
  "function nextTokenId() view returns (uint256)",
  // ERC721 standard
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  // Burn (only for builds, not bricks)
  "function burn(uint256 tokenId)",
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]

// LicenseRegistry ABI - maps component tokenIds to license IDs
export const LICENSE_REGISTRY_ABI = [
  "function getLicenseId(uint256 componentTokenId) view returns (uint256)",
  "function getLicenseIds(uint256[] calldata componentTokenIds) view returns (uint256[])",
  "function isLicenseRequired(uint256 componentTokenId) view returns (bool)",
]

// LicenseNFT ABI - ERC1155 for license ownership
export const LICENSE_NFT_ABI = [
  // ERC1155 standard
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) view returns (uint256[])",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  // License-specific
  "function licensePrice(uint256 id) view returns (uint256)",
  "function purchaseLicense(uint256 id) payable",
]

// Distributor ABI - handles rewards distribution
export const DISTRIBUTOR_ABI = [
  "function claimRewards(uint256 tokenId)",
  "function pendingRewards(uint256 tokenId) view returns (uint256)",
  "function totalDistributed() view returns (uint256)",
]

// Local storage registry for minted hashes
const MINTED_HASHES_KEY = "ethblox_minted_hashes"

export function getMintedHashes(): Set<string> {
  if (typeof window === "undefined") return new Set()
  const stored = localStorage.getItem(MINTED_HASHES_KEY)
  return new Set(stored ? JSON.parse(stored) : [])
}

export function addMintedHash(hash: string) {
  const hashes = getMintedHashes()
  hashes.add(hash.toLowerCase())
  localStorage.setItem(MINTED_HASHES_KEY, JSON.stringify(Array.from(hashes)))
}

export function isHashMinted(hash: string): boolean {
  return getMintedHashes().has(hash.toLowerCase())
}

// Contract interaction helpers
export async function getBloxBalance(provider: ethers.BrowserProvider, address: string): Promise<bigint> {
  const contract = new ethers.Contract(CONTRACTS.MOCK_BLOX, MOCK_BLOX_ABI, provider)
  return await contract.balanceOf(address)
}

export async function getBloxAllowance(
  provider: ethers.BrowserProvider,
  owner: string,
  spender: string,
): Promise<bigint> {
  const contract = new ethers.Contract(CONTRACTS.MOCK_BLOX, MOCK_BLOX_ABI, provider)
  return await contract.allowance(owner, spender)
}

export async function approveBlox(
  provider: ethers.BrowserProvider,
  amount: bigint,
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(CONTRACTS.MOCK_BLOX, MOCK_BLOX_ABI, signer)
  return await contract.approve(CONTRACTS.BUILD_NFT, amount)
}

export async function getMaxMass(provider: ethers.BrowserProvider): Promise<bigint> {
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)
  return await contract.maxMass()
}

export async function getNextTokenId(provider: ethers.BrowserProvider): Promise<bigint> {
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)
  return await contract.nextTokenId()
}

export async function mintBuildNFT(
  provider: ethers.BrowserProvider,
  geometryHash: string,
  mass: number,
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, signer)
  return await contract.mint(geometryHash, mass)
}

// New mint function with correct payload format
export interface MintParams {
  geometryHash: string
  mass: number
  uri: string
  componentBuildIds: bigint[]
  componentCounts: bigint[]
  kind: number
  width: number
  depth: number
  density: number
}

export async function mintBuildNFTWithParams(
  provider: ethers.BrowserProvider,
  params: MintParams,
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, signer)
  return await contract.mint(
    params.geometryHash,
    BigInt(params.mass),
    params.uri,
    params.componentBuildIds,
    params.componentCounts,
    params.kind,
    params.width,
    params.depth,
    params.density,
    { value: FEE_PER_MINT }
  )
}

export async function burnBuildNFT(
  provider: ethers.BrowserProvider,
  tokenId: string,
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, signer)
  // Convert tokenId string to BigInt for contract call
  return await contract.burn(BigInt(tokenId))
}

// ========== NEW: Brick Minting ==========

export interface BrickSpec {
  width: number
  depth: number
  density: number
}

export async function mintBrick(
  provider: ethers.BrowserProvider,
  geometryHash: string,
  spec: BrickSpec,
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, signer)
  return await contract.mintBrick(geometryHash, spec.width, spec.depth, spec.density, {
    value: FEE_PER_MINT,
  })
}

// ========== NEW: Build Minting with Components ==========

export async function mintBuild(
  provider: ethers.BrowserProvider,
  geometryHash: string,
  mass: number,
  kind: number,
  componentTokenIds: bigint[],
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, signer)
  return await contract.mintBuild(geometryHash, mass, kind, componentTokenIds, {
    value: FEE_PER_MINT,
  })
}

// ========== NEW: License Registry Functions ==========

export async function getLicenseIds(
  provider: ethers.BrowserProvider,
  componentTokenIds: bigint[],
): Promise<bigint[]> {
  if (CONTRACTS.LICENSE_REGISTRY === "0x0000000000000000000000000000000000000000") {
    // Contract not deployed yet - return empty array
    return []
  }
  const contract = new ethers.Contract(CONTRACTS.LICENSE_REGISTRY, LICENSE_REGISTRY_ABI, provider)
  return await contract.getLicenseIds(componentTokenIds)
}

export async function isLicenseRequired(
  provider: ethers.BrowserProvider,
  componentTokenId: bigint,
): Promise<boolean> {
  if (CONTRACTS.LICENSE_REGISTRY === "0x0000000000000000000000000000000000000000") {
    return false
  }
  const contract = new ethers.Contract(CONTRACTS.LICENSE_REGISTRY, LICENSE_REGISTRY_ABI, provider)
  return await contract.isLicenseRequired(componentTokenId)
}

// ========== NEW: License NFT Functions ==========

export async function getLicenseBalance(
  provider: ethers.BrowserProvider,
  account: string,
  licenseId: bigint,
): Promise<bigint> {
  if (CONTRACTS.LICENSE_NFT === "0x0000000000000000000000000000000000000000") {
    return 0n
  }
  const contract = new ethers.Contract(CONTRACTS.LICENSE_NFT, LICENSE_NFT_ABI, provider)
  return await contract.balanceOf(account, licenseId)
}

export async function getLicenseBalances(
  provider: ethers.BrowserProvider,
  account: string,
  licenseIds: bigint[],
): Promise<bigint[]> {
  if (CONTRACTS.LICENSE_NFT === "0x0000000000000000000000000000000000000000") {
    return licenseIds.map(() => 0n)
  }
  const contract = new ethers.Contract(CONTRACTS.LICENSE_NFT, LICENSE_NFT_ABI, provider)
  const accounts = licenseIds.map(() => account)
  return await contract.balanceOfBatch(accounts, licenseIds)
}

export async function approveLicenseNFT(
  provider: ethers.BrowserProvider,
  operator: string,
  approved: boolean,
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(CONTRACTS.LICENSE_NFT, LICENSE_NFT_ABI, signer)
  return await contract.setApprovalForAll(operator, approved)
}

export async function isLicenseApproved(
  provider: ethers.BrowserProvider,
  account: string,
  operator: string,
): Promise<boolean> {
  if (CONTRACTS.LICENSE_NFT === "0x0000000000000000000000000000000000000000") {
    return true // No license contract = no approval needed
  }
  const contract = new ethers.Contract(CONTRACTS.LICENSE_NFT, LICENSE_NFT_ABI, provider)
  return await contract.isApprovedForAll(account, operator)
}

// ========== NEW: Build State Reading ==========

export interface BuildState {
  kind: number
  geometryHash: string
  lockedBlox: bigint
  brickSpec?: BrickSpec
}

export async function getBuildState(
  provider: ethers.BrowserProvider,
  tokenId: bigint,
): Promise<BuildState> {
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)
  
  const [kind, geometryHash, lockedBlox] = await Promise.all([
    contract.kind(tokenId),
    contract.geometryHash(tokenId),
    contract.lockedBlox(tokenId),
  ])

  const state: BuildState = {
    kind: Number(kind),
    geometryHash,
    lockedBlox,
  }

  // If it's a brick (kind=0), fetch brick spec
  if (state.kind === BUILD_KIND.BRICK) {
    const [width, depth, density] = await contract.brickSpec(tokenId)
    state.brickSpec = {
      width: Number(width),
      depth: Number(depth),
      density: Number(density),
    }
  }

  return state
}

export async function getEscrowedLicenses(
  provider: ethers.BrowserProvider,
  tokenId: bigint,
  licenseIds: bigint[],
): Promise<Map<bigint, bigint>> {
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)
  const result = new Map<bigint, bigint>()
  
  for (const licenseId of licenseIds) {
    const amount = await contract.escrowedLicenses(tokenId, licenseId)
    if (amount > 0n) {
      result.set(licenseId, amount)
    }
  }
  
  return result
}

// ========== NEW: Distributor Functions ==========

export async function getPendingRewards(
  provider: ethers.BrowserProvider,
  tokenId: bigint,
): Promise<bigint> {
  if (CONTRACTS.DISTRIBUTOR === "0x0000000000000000000000000000000000000000") {
    return 0n
  }
  const contract = new ethers.Contract(CONTRACTS.DISTRIBUTOR, DISTRIBUTOR_ABI, provider)
  return await contract.pendingRewards(tokenId)
}

export async function claimRewards(
  provider: ethers.BrowserProvider,
  tokenId: bigint,
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(CONTRACTS.DISTRIBUTOR, DISTRIBUTOR_ABI, signer)
  return await contract.claimRewards(tokenId)
}

// ========== NEW: Validation Helpers ==========

export function calculateBloxLock(mass: number): bigint {
  return BigInt(mass) * 10n ** BLOX_DECIMALS
}

export function canBurn(kind: number): boolean {
  // Only builds (kind > 0) can be burned, not bricks (kind = 0)
  return kind > BUILD_KIND.BRICK
}

export async function getUserMintedBuilds(
  provider: ethers.BrowserProvider,
  address: string,
): Promise<Array<{ tokenId: string; tokenURI: string }>> {
  try {
    console.log("[v0] Fetching minted builds for address:", address)
    const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)

    // Query Transfer events where 'to' is the user's address
    const filter = contract.filters.Transfer(null, address)
    const currentBlock = await provider.getBlockNumber()
    const fromBlock = Math.max(0, currentBlock - 10000) // Last ~10k blocks (adjust if needed)

    console.log("[v0] Querying Transfer events from block", fromBlock, "to", currentBlock)
    const events = await contract.queryFilter(filter, fromBlock, currentBlock)
    console.log("[v0] Found", events.length, "Transfer events")

    // Collect unique token IDs and verify current ownership
    const tokenIds = new Set<bigint>()
    for (const event of events) {
      if (event.args && event.args.tokenId) {
        tokenIds.add(event.args.tokenId)
      }
    }

    console.log(
      "[v0] Unique token IDs from events:",
      Array.from(tokenIds).map((id) => id.toString()),
    )

    // Verify ownership and fetch metadata
    const builds = []
    for (const tokenId of tokenIds) {
      try {
        const owner = await contract.ownerOf(tokenId)
        if (owner.toLowerCase() === address.toLowerCase()) {
          const tokenURI = await contract.tokenURI(tokenId)
          builds.push({
            tokenId: tokenId.toString(),
            tokenURI,
          })
          console.log("[v0] Confirmed ownership of token", tokenId.toString())
        } else {
          console.log("[v0] Token", tokenId.toString(), "no longer owned by user")
        }
      } catch (error) {
        console.log("[v0] Token", tokenId.toString(), "may not exist or is not accessible")
      }
    }

    console.log("[v0] Final builds owned by user:", builds.length)
    return builds
  } catch (error) {
    console.error("[v0] Error fetching minted builds:", error)
    return []
  }
}

export async function getAllMintedBuilds(
  provider: ethers.BrowserProvider,
): Promise<Array<{ tokenId: string; owner: string; tokenURI: string }>> {
  try {
    console.log("[v0] Fetching all minted builds for gallery")
    const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, provider)

    const currentBlock = await provider.getBlockNumber()
    const CHUNK_SIZE = 50000 // Safe chunk size under 100k limit
    const allEvents: ethers.EventLog[] = []

    // Query from contract deployment or recent history
    // For Base Sepolia, we'll query from a reasonable starting point
    const deploymentBlock = 0 // You can set this to the actual deployment block if known

    console.log("[v0] Querying mint events in chunks from block", deploymentBlock, "to", currentBlock)

    for (let fromBlock = deploymentBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock)
      console.log(`[v0] Querying chunk: blocks ${fromBlock} to ${toBlock}`)

      try {
        const filter = contract.filters.Transfer(ethers.ZeroAddress, null)
        const events = await contract.queryFilter(filter, fromBlock, toBlock)
        allEvents.push(...(events as ethers.EventLog[]))
        console.log(`[v0] Found ${events.length} events in this chunk`)
      } catch (chunkError) {
        console.error(`[v0] Error querying chunk ${fromBlock}-${toBlock}:`, chunkError)
        // Continue with next chunk even if one fails
      }
    }

    console.log("[v0] Found", allEvents.length, "total mint events")

    // Collect token data with ownership verification
    const builds = []
    const processedTokens = new Set<string>()

    for (const event of allEvents) {
      if (event.args && event.args.tokenId) {
        const tokenId = event.args.tokenId.toString()

        // Skip if already processed
        if (processedTokens.has(tokenId)) continue
        processedTokens.add(tokenId)

        try {
          // Verify token still exists and get current owner
          const owner = await contract.ownerOf(tokenId)
          const tokenURI = await contract.tokenURI(tokenId)

          builds.push({
            tokenId,
            owner,
            tokenURI,
          })
          console.log("[v0] Added token", tokenId, "owned by", owner)
        } catch (error) {
          console.log("[v0] Token", tokenId, "may have been burned or is not accessible")
        }
      }
    }

    console.log("[v0] Total minted builds in gallery:", builds.length)
    // Sort by tokenId descending (newest first)
    return builds.sort((a, b) => Number(b.tokenId) - Number(a.tokenId))
  } catch (error) {
    console.error("[v0] Error fetching all minted builds:", error)
    return []
  }
}
