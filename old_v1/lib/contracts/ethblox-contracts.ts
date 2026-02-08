import { ethers } from "ethers"

// Contract addresses on Base Sepolia
export const CONTRACTS = {
  MOCK_BLOX: "0x6578d53995FEB0e486135b893B8bC16AE1a5Ec52",
  BUILD_NFT: "0xF6a03E3b35faCAEd79E5935bb67bb11E9342049b",
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

export const BUILD_NFT_ABI = [
  "function mint(bytes32 geometryHash, uint256 mass)",
  "function maxMass() view returns (uint256)",
  "function nextTokenId() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function burn(uint256 tokenId)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
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

export async function burnBuildNFT(
  provider: ethers.BrowserProvider,
  tokenId: string,
): Promise<ethers.ContractTransactionResponse> {
  const signer = await provider.getSigner()
  const contract = new ethers.Contract(CONTRACTS.BUILD_NFT, BUILD_NFT_ABI, signer)
  // Convert tokenId string to BigInt for contract call
  return await contract.burn(BigInt(tokenId))
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
