"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Copy,
  ExternalLink,
  RefreshCw
} from "lucide-react"
import { useMetaMask } from "@/contexts/metamask-context"
import { ethers } from "ethers"
import { Canvas, PerspectiveCamera, OrbitControls } from '@react-three/fiber'
import {
  CONTRACTS,
  FEE_PER_MINT,
  BUILD_KIND,
  getBloxBalance,
  getBloxAllowance,
  getMaxMass,
  getNextTokenId,
  getLicenseIds,
  getLicenseBalances,
  isLicenseApproved,
  approveBlox,
  mintBuildNFTWithParams,
  addMintedHash,
  type MintParams,
} from "@/lib/contracts/ethblox-contracts"
import { generateBuildHash } from "@/lib/build-hash"
import type { Brick } from "@/lib/types"
import { StandardBuildCapture } from "./StandardBuildCapture"

interface MintDebugData {
  buildId: string
  buildName: string
  buildHash: string | null
  bricks: Brick[]
  baseWidth: number
  baseDepth: number
  totalBloxMass: number
  uniqueColors: number
  composition?: Record<string, { count: number; name: string }>
  metadata?: {
    buildWidth: number
    buildDepth: number
    totalBricks: number
    totalInstances: number
    nftsUsed: number
  }
  account?: string
  timestamp: number
}

interface ContractState {
  bloxBalance: bigint | null
  bloxAllowance: bigint | null
  maxMass: bigint | null
  nextTokenId: bigint | null
  chainId: string | null
  isCorrectChain: boolean
  licenseIds: bigint[]
  licenseBalances: bigint[]
  licenseApproved: boolean
}

interface ValidationResult {
  passed: boolean
  message: string
  details?: string
}

// Generate specKey: keccak256(geometryHash, width, depth)
function generateSpecKey(geometryHash: string, width: number, depth: number): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "uint8", "uint8"],
    [geometryHash, width, depth]
  )
  return ethers.keccak256(encoded)
}

// Generate componentsHash: keccak256(abi.encodePacked(componentBuildIds))
function generateComponentsHash(componentIds: string[]): string {
  if (componentIds.length === 0) return ""
  const sorted = [...componentIds].sort((a, b) => Number(a) - Number(b))
  const encoded = ethers.solidityPacked(
    sorted.map(() => "uint256"),
    sorted.map(id => BigInt(id))
  )
  return ethers.keccak256(encoded)
}

export function MintDebugClient() {
  const router = useRouter()
  const { account, isConnected, connect, switchChain } = useMetaMask()
  
  const [debugData, setDebugData] = useState<MintDebugData | null>(null)
  const [contractState, setContractState] = useState<ContractState>({
    bloxBalance: null,
    bloxAllowance: null,
    maxMass: null,
    nextTokenId: null,
    chainId: null,
    isCorrectChain: false,
    licenseIds: [],
    licenseBalances: [],
    licenseApproved: true,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [generatedHash, setGeneratedHash] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [skipChecks, setSkipChecks] = useState(false)
  const [minting, setMinting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [mintTxHash, setMintTxHash] = useState<string | null>(null)
  const [mintError, setMintError] = useState<string | null>(null)

  // Load debug data from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("ethblox_mint_debug")
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setDebugData(data)
      } catch (e) {
        console.error("[v0] Failed to parse mint debug data:", e)
      }
    }
    setLoading(false)
  }, [])

  // Generate hash when data is loaded
  useEffect(() => {
    if (!debugData?.bricks || debugData.bricks.length === 0) return
    
    generateBuildHash({
      bricks: debugData.bricks.map((b) => ({
        position: b.position,
        color: b.color,
        width: b.width,
        depth: b.depth,
      })),
      baseWidth: debugData.baseWidth,
      baseDepth: debugData.baseDepth,
    }).then((hash) => {
      setGeneratedHash(hash)
    })
  }, [debugData])

  // Fetch contract state
  const fetchContractState = async () => {
    if (!isConnected || !account) return
    
    setRefreshing(true)
    try {
      const ethereum = (window as any).ethereum
      if (!ethereum) return

      const chainId = await ethereum.request({ method: "eth_chainId" })
      // Compare chain IDs by converting both to decimal numbers for accurate comparison
      // This handles cases where hex strings have different padding (0x14a34 vs 0x014a34)
      const currentChainDecimal = chainId ? parseInt(chainId, 16) : 0
      const expectedChainDecimal = parseInt(CONTRACTS.BASE_SEPOLIA_CHAIN_ID, 16) // 84532
      const isCorrectChain = currentChainDecimal === expectedChainDecimal
      
      

      const provider = new ethers.BrowserProvider(ethereum)

      const [balance, allowance, maxMass, nextId] = await Promise.all([
        getBloxBalance(provider, account).catch(() => null),
        getBloxAllowance(provider, account, CONTRACTS.BUILD_NFT).catch(() => null),
        getMaxMass(provider).catch(() => null),
        getNextTokenId(provider).catch(() => null),
      ])

      // Get component token IDs from composition
      const componentTokenIds = debugData?.composition 
        ? Object.keys(debugData.composition).map(id => BigInt(id))
        : []

      let licenseIds: bigint[] = []
      let licenseBalances: bigint[] = []
      let licenseApproved = true

      if (componentTokenIds.length > 0 && isCorrectChain) {
        try {
          licenseIds = await getLicenseIds(provider, componentTokenIds)
          if (licenseIds.length > 0) {
            licenseBalances = await getLicenseBalances(provider, account, licenseIds)
            licenseApproved = await isLicenseApproved(provider, account, CONTRACTS.BUILD_NFT)
          }
        } catch (e) {
          console.error("[v0] Failed to fetch license data:", e)
        }
      }

      setContractState({
        bloxBalance: balance,
        bloxAllowance: allowance,
        maxMass,
        nextTokenId: nextId,
        chainId,
        isCorrectChain,
        licenseIds,
        licenseBalances,
        licenseApproved,
      })
    } catch (error) {
      console.error("[v0] Failed to fetch contract state:", error)
    }
    setRefreshing(false)
  }

  useEffect(() => {
    fetchContractState()
  }, [isConnected, account, debugData])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  // Handle BLOX approval
  const handleApproveBlox = async () => {
    if (!isConnected || !account || !debugData) return
    setApproving(true)
    setMintError(null)
    
    try {
      const ethereum = (window as any).ethereum
      if (!ethereum) throw new Error("No wallet found")
      
      const provider = new ethers.BrowserProvider(ethereum)
      const requiredBlox = BigInt(debugData.totalBloxMass) * 10n ** 18n
      // Approve a large amount to avoid repeated approvals
      const approvalAmount = requiredBlox * 100n
      
      const tx = await approveBlox(provider, approvalAmount)
      await tx.wait()
      
      // Refresh state
      await fetchContractState()
    } catch (err: any) {
      console.error("[v0] Approval error:", err)
      setMintError(err.message || "Approval failed")
    }
    setApproving(false)
  }

  // Handle mint
  const handleMint = async () => {
    if (!isConnected || !account || !debugData || !generatedHash) return
    setMinting(true)
    setMintError(null)
    setMintTxHash(null)
    
    try {
      const ethereum = (window as any).ethereum
      if (!ethereum) throw new Error("No wallet found")
      
      // First verify we're on the right chain
      const currentChainId = await ethereum.request({ method: "eth_chainId" })
      const currentChainDecimal = parseInt(currentChainId, 16)
      const expectedChainDecimal = parseInt(CONTRACTS.BASE_SEPOLIA_CHAIN_ID, 16)
      
      if (currentChainDecimal !== expectedChainDecimal && !skipChecks) {
        throw new Error(`Wrong network! Current: ${currentChainDecimal}, Expected: ${expectedChainDecimal} (Base Sepolia). Please switch networks.`)
      }
      
      const provider = new ethers.BrowserProvider(ethereum)
      
      // Determine if this is a BUILD (has components) or BRICK (no components)
      const hasComponents = debugData.composition && Object.keys(debugData.composition).length > 0
      const kind = hasComponents ? BUILD_KIND.BUILD : BUILD_KIND.BRICK
      
      // CRITICAL: For bricks, arrays MUST be empty []. Contract requires:
      // - componentBuildIds[i] != 0
      // - componentCounts[i] > 0
      // So we cannot pass any values at all for bricks.
      let componentIds: bigint[] = []
      let componentCounts: bigint[] = []
      
      if (hasComponents && debugData.composition) {
        // Only populate for builds with actual components
        const validComponents = Object.entries(debugData.composition)
          .filter(([id, data]) => Number(id) > 0 && data.count > 0)
        componentIds = validComponents.map(([id]) => BigInt(id))
        componentCounts = validComponents.map(([, data]) => BigInt(data.count))
      }

      const mintParams: MintParams = {
        geometryHash: generatedHash,
        mass: debugData.totalBloxMass,
        uri: "", // URI is ignored on-chain now
        componentBuildIds: componentIds,
        componentCounts: componentCounts,
        kind,
        width: debugData.baseWidth,
        depth: debugData.baseDepth,
        density: 1,
      }

      const tx = await mintBuildNFTWithParams(provider, mintParams)
      setMintTxHash(tx.hash)
      
      const receipt = await tx.wait()
      
      // Add to local minted hashes
      addMintedHash(generatedHash)
      
      // Refresh state
      await fetchContractState()
    } catch (err: any) {
      console.error("[v0] Mint error:", err)
      // Parse more detailed error message
      let errorMessage = "Mint failed"
      if (err.reason) {
        errorMessage = err.reason
      } else if (err.message) {
        // Try to extract useful info from the message
        if (err.message.includes("require(false)")) {
          errorMessage = "Contract reverted - check contract requirements (BLOX approval, network, etc.)"
        } else if (err.message.includes("insufficient funds")) {
          errorMessage = "Insufficient ETH for gas + mint fee (0.01 ETH)"
        } else if (err.message.includes("user rejected")) {
          errorMessage = "Transaction rejected by user"
        } else {
          errorMessage = err.message
        }
      }
      setMintError(errorMessage)
    }
    setMinting(false)
  }

  // Handle chain switch with state refresh
  const handleSwitchChain = async () => {
    try {
      await switchChain(CONTRACTS.BASE_SEPOLIA_CHAIN_ID)
      // Wait a moment for the chain to actually switch
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Refresh contract state after switch
      await fetchContractState()
    } catch (err: any) {
      console.error("[v0] Switch chain error:", err)
      setMintError(err.message || "Failed to switch chain")
    }
  }

  // Calculate validation results
  const getValidations = (): ValidationResult[] => {
    if (!debugData) return []

    const validations: ValidationResult[] = []
    const requiredBlox = BigInt(debugData.totalBloxMass) * 10n ** 18n

    // Wallet connection
    validations.push({
      passed: isConnected && !!account,
      message: "Wallet Connected",
      details: account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Not connected",
    })

    // Correct chain - convert hex to decimal for display
    const currentChainDecimal = contractState.chainId ? parseInt(contractState.chainId, 16) : null
    const expectedChainDecimal = parseInt(CONTRACTS.BASE_SEPOLIA_CHAIN_ID, 16)
    validations.push({
      passed: contractState.isCorrectChain,
      message: "Correct Network (Base Sepolia)",
      details: currentChainDecimal 
        ? `Current: ${currentChainDecimal} (Expected: ${expectedChainDecimal})`
        : "Unknown",
    })

    // Build name (must be saved first)
    validations.push({
      passed: !!debugData.buildName && debugData.buildName.trim() !== "" && debugData.buildName !== "Untitled",
      message: "Build Saved with Name",
      details: debugData.buildName || "Not saved - please save your build first",
    })

    // Build hash valid
    validations.push({
      passed: !!generatedHash && /^0x[0-9a-fA-F]{64}$/.test(generatedHash),
      message: "Valid Geometry Hash",
      details: generatedHash || "Not generated",
    })

    // Bricks exist
    validations.push({
      passed: debugData.bricks.length > 0,
      message: "Build Has Bricks",
      details: `${debugData.bricks.length} bricks`,
    })

    // Mass > 0
    validations.push({
      passed: debugData.totalBloxMass > 0,
      message: "Mass > 0",
      details: `${debugData.totalBloxMass} BLOX`,
    })

    // Mass within limit
    if (contractState.maxMass !== null) {
      validations.push({
        passed: BigInt(debugData.totalBloxMass) <= contractState.maxMass,
        message: "Mass Within Contract Limit",
        details: `${debugData.totalBloxMass} <= ${contractState.maxMass.toString()}`,
      })
    }

    // BLOX balance sufficient
    if (contractState.bloxBalance !== null) {
      validations.push({
        passed: contractState.bloxBalance >= requiredBlox,
        message: "Sufficient BLOX Balance",
        details: `Have: ${ethers.formatEther(contractState.bloxBalance)} BLOX, Need: ${ethers.formatEther(requiredBlox)} BLOX`,
      })
    }

    // BLOX allowance
    if (contractState.bloxAllowance !== null) {
      validations.push({
        passed: contractState.bloxAllowance >= requiredBlox,
        message: "BLOX Approval",
        details: contractState.bloxAllowance >= requiredBlox 
          ? `Approved: ${ethers.formatEther(contractState.bloxAllowance)} BLOX`
          : `Need to approve ${ethers.formatEther(requiredBlox)} BLOX`,
      })
    }

    // Component licenses (if any)
    if (debugData.composition && Object.keys(debugData.composition).length > 0) {
      const hasAllLicenses = contractState.licenseBalances.every(b => b > 0n)
      validations.push({
        passed: hasAllLicenses,
        message: "Component Licenses Owned",
        details: `${contractState.licenseBalances.filter(b => b > 0n).length}/${contractState.licenseIds.length} licenses`,
      })

      validations.push({
        passed: contractState.licenseApproved,
        message: "License NFT Approval",
        details: contractState.licenseApproved ? "Approved for BuildNFT" : "Need to approve",
      })
    }

    return validations
  }

  const validations = getValidations()
  const allPassed = validations.length > 0 && validations.every(v => v.passed)
  const canMint = skipChecks || allPassed

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--ethblox-text-tertiary))]" />
      </div>
    )
  }

  if (!debugData) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-[hsl(var(--ethblox-text-tertiary))]" />
          <h1 className="text-2xl font-bold text-[hsl(var(--ethblox-text-primary))] mb-2">
            No Mint Data Found
          </h1>
          <p className="text-[hsl(var(--ethblox-text-secondary))] mb-6">
            Please go to the builder and click "Mint in Dev Mode" from the mint dialog.
          </p>
          <Button onClick={() => router.push("/buildv2")}>
            Go to Builder
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
          className="text-[hsl(var(--ethblox-text-secondary))]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[hsl(var(--ethblox-text-primary))]">
            Mint Debug Mode
          </h1>
          <p className="text-sm text-[hsl(var(--ethblox-text-secondary))]">
            Review all mint parameters before submitting transaction
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchContractState}
          disabled={refreshing}
          className="border-[hsl(var(--ethblox-border))] bg-transparent"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Save Warning Banner */}
      {(!debugData.buildName || debugData.buildName === "Untitled") && (
        <div className="mb-6 p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-400">
                Build Not Saved
              </p>
              <p className="text-xs text-[hsl(var(--ethblox-text-secondary))] mt-1">
                Please go back to the builder and save your build with a name before minting.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Build Data */}
        <div className="space-y-6">
          {/* Build Info */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                Build Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Name</span>
                <span className="text-[hsl(var(--ethblox-text-primary))] font-medium">
                  {debugData.buildName || "Untitled"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Build ID</span>
                <span className="text-[hsl(var(--ethblox-text-primary))] font-mono text-sm">
                  {debugData.buildId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Total Bricks</span>
                <span className="text-[hsl(var(--ethblox-text-primary))]">
                  {debugData.bricks.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Unique Colors</span>
                <span className="text-[hsl(var(--ethblox-text-primary))]">
                  {debugData.uniqueColors}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Dimensions</span>
                <span className="text-[hsl(var(--ethblox-text-primary))]">
                  {debugData.baseWidth} x {debugData.baseDepth}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* On-Chain Mint Parameters - JSON Format */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                  On-Chain Mint Parameters
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    const hasComponents = debugData.composition && Object.keys(debugData.composition).length > 0
                    const kind = hasComponents ? BUILD_KIND.BUILD : BUILD_KIND.BRICK
                    // For bricks: MUST be empty arrays. Contract reverts on any values.
                    let componentIds: string[] = []
                    let componentCounts: number[] = []
                    if (hasComponents && debugData.composition) {
                      const validComponents = Object.entries(debugData.composition)
                        .filter(([id, data]) => Number(id) > 0 && data.count > 0)
                      componentIds = validComponents.map(([id]) => id)
                      componentCounts = validComponents.map(([, data]) => data.count)
                    }
                    const mintParams = {
                      geometryHash: generatedHash || "",
                      mass: debugData.totalBloxMass,
                      kind,
                      density: 1,
                      width: debugData.baseWidth,
                      depth: debugData.baseDepth,
                      componentBuildIds: componentIds,
                      componentCounts: componentCounts,
                      payer: account?.toLowerCase() || "",
                      mintFeeWei: FEE_PER_MINT.toString()
                    }
                    copyToClipboard(JSON.stringify(mintParams, null, 2), 'mintParams')
                  }}
                  className="h-8"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copied === 'mintParams' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg text-xs font-mono text-[hsl(var(--ethblox-green))] overflow-auto max-h-80">
{(() => {
  const hasComponents = debugData.composition && Object.keys(debugData.composition).length > 0
  const kind = hasComponents ? BUILD_KIND.BUILD : BUILD_KIND.BRICK
  // For bricks: MUST be empty arrays
  let componentIds: string[] = []
  let componentCounts: number[] = []
  if (hasComponents && debugData.composition) {
    const validComponents = Object.entries(debugData.composition)
      .filter(([id, data]) => Number(id) > 0 && data.count > 0)
    componentIds = validComponents.map(([id]) => id)
    componentCounts = validComponents.map(([, data]) => data.count)
  }
  return JSON.stringify({
    geometryHash: generatedHash || "generating...",
    mass: debugData.totalBloxMass,
    kind,
    density: 1,
    width: debugData.baseWidth,
    depth: debugData.baseDepth,
    componentBuildIds: componentIds,
    componentCounts: componentCounts,
    payer: account?.toLowerCase() || "not connected",
    mintFeeWei: FEE_PER_MINT.toString()
  }, null, 2)
})()}
              </pre>
            </CardContent>
          </Card>

          {/* IPFS Metadata */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                  IPFS Metadata
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    const kind = debugData.composition && Object.keys(debugData.composition).length > 0 
                      ? BUILD_KIND.BUILD : BUILD_KIND.BRICK
                    const componentIds = debugData.composition 
                      ? Object.keys(debugData.composition) : []
                    const specKey = generatedHash 
                      ? generateSpecKey(generatedHash, debugData.baseWidth, debugData.baseDepth)
                      : ""
                    const componentsHash = generateComponentsHash(componentIds)
                    const metadata = {
                      name: debugData.buildName || `ETHBLOX #${contractState.nextTokenId?.toString() || "?"}`,
                      description: "ETHBLOX build/brick",
                      image: `ipfs://<CID>/images/${contractState.nextTokenId?.toString() || "?"}.png`,
                      external_url: "https://ethblox.xyz",
                      attributes: [
                        { trait_type: "kind", value: kind },
                        { trait_type: "mass", value: debugData.totalBloxMass },
                        { trait_type: "density", value: 1 },
                        { trait_type: "geometryHash", value: generatedHash || "" },
                        { trait_type: "specKey", value: specKey },
                        { trait_type: "componentsHash", value: componentsHash }
                      ]
                    }
                    copyToClipboard(JSON.stringify(metadata, null, 2), 'ipfsMetadata')
                  }}
                  className="h-8"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copied === 'ipfsMetadata' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg text-xs font-mono text-[hsl(var(--ethblox-accent-cyan))] overflow-auto max-h-96">
{(() => {
  const kind = debugData.composition && Object.keys(debugData.composition).length > 0 
    ? BUILD_KIND.BUILD : BUILD_KIND.BRICK
  const componentIds = debugData.composition 
    ? Object.keys(debugData.composition) : []
  const specKey = generatedHash 
    ? generateSpecKey(generatedHash, debugData.baseWidth, debugData.baseDepth)
    : "<pending geometryHash>"
  const componentsHash = generateComponentsHash(componentIds)
  return JSON.stringify({
    name: debugData.buildName || `ETHBLOX #${contractState.nextTokenId?.toString() || "?"}`,
    description: "ETHBLOX build/brick",
    image: `ipfs://<CID>/images/${contractState.nextTokenId?.toString() || "?"}.png`,
    external_url: "https://ethblox.xyz",
    attributes: [
      { trait_type: "kind", value: kind },
      { trait_type: "mass", value: debugData.totalBloxMass },
      { trait_type: "density", value: 1 },
      { trait_type: "geometryHash", value: generatedHash || "" },
      { trait_type: "specKey", value: specKey },
      { trait_type: "componentsHash", value: componentsHash }
    ]
  }, null, 2)
})()}
              </pre>
              <div className="mt-3 p-2 bg-[hsl(var(--ethblox-bg))] rounded text-xs text-[hsl(var(--ethblox-text-tertiary))]">
                <p><strong>Token URI:</strong> {"${baseUri}/${tokenId}.json"}</p>
                <p><strong>Base URI:</strong> ipns://{"<ipns-name>"} or ipfs://{"<folder-cid>"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contract Addresses */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                Contract Addresses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(CONTRACTS).filter(([key]) => key !== 'BASE_SEPOLIA_CHAIN_ID').map(([name, address]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--ethblox-text-secondary))]">{name}</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-[hsl(var(--ethblox-text-tertiary))]">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </code>
                    <a 
                      href={`https://sepolia.basescan.org/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[hsl(var(--ethblox-accent-cyan))]"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Validations & State */}
        <div className="space-y-6">
          {/* Validation Checklist */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                  Pre-Mint Checklist
                </CardTitle>
                <Badge 
                  variant={allPassed ? "default" : "destructive"}
                  className={allPassed 
                    ? "bg-[hsl(var(--ethblox-green))] text-black" 
                    : "bg-red-500 text-white"
                  }
                >
                  {validations.filter(v => v.passed).length}/{validations.length} Passed
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {validations.map((v, i) => (
                <div 
                  key={i} 
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    v.passed 
                      ? 'bg-green-500/10 border border-green-500/20' 
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}
                >
                  {v.passed 
                    ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      v.passed ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {v.message}
                    </p>
                    {v.details && (
                      <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-0.5 break-all">
                        {v.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Wallet State */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                Wallet State
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isConnected ? (
                <Button onClick={connect} className="w-full">
                  Connect Wallet
                </Button>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--ethblox-text-secondary))]">Address</span>
                    <code className="text-[hsl(var(--ethblox-text-primary))] font-mono text-sm">
                      {account?.slice(0, 6)}...{account?.slice(-4)}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--ethblox-text-secondary))]">BLOX Balance</span>
                    <span className="text-[hsl(var(--ethblox-text-primary))]">
                      {contractState.bloxBalance !== null 
                        ? `${ethers.formatEther(contractState.bloxBalance)} BLOX`
                        : "Loading..."}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--ethblox-text-secondary))]">BLOX Allowance</span>
                    <span className="text-[hsl(var(--ethblox-text-primary))]">
                      {contractState.bloxAllowance !== null 
                        ? `${ethers.formatEther(contractState.bloxAllowance)} BLOX`
                        : "Loading..."}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[hsl(var(--ethblox-text-secondary))]">Chain ID</span>
                    <span className={contractState.isCorrectChain 
                      ? "text-green-400" 
                      : "text-red-400"
                    }>
                      {contractState.chainId || "Unknown"}
                    </span>
                  </div>
                  {!contractState.isCorrectChain && (
                    <Button 
                      onClick={handleSwitchChain}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Switch to Base Sepolia (Chain ID: 84532)
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Contract State */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                Contract State
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Next Token ID</span>
                <code className="text-[hsl(var(--ethblox-text-primary))] font-mono">
                  {contractState.nextTokenId?.toString() ?? "?"}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Max Mass</span>
                <code className="text-[hsl(var(--ethblox-text-primary))] font-mono">
                  {contractState.maxMass?.toString() ?? "?"}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--ethblox-text-secondary))]">Mint Fee</span>
                <code className="text-[hsl(var(--ethblox-yellow))] font-mono">
                  {ethers.formatEther(FEE_PER_MINT)} ETH
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Mint Actions */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] border-2 border-[hsl(var(--ethblox-yellow)/0.5)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                Mint Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Skip Checks Toggle */}
              <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                <div>
                  <p className="text-sm font-medium text-orange-400">Skip Validation Checks</p>
                  <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">
                    Enable to bypass failed checks (use for testing)
                  </p>
                </div>
                <Button
                  variant={skipChecks ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSkipChecks(!skipChecks)}
                  className={skipChecks 
                    ? "bg-orange-500 hover:bg-orange-600 text-white" 
                    : "border-orange-500/50 text-orange-400 bg-transparent hover:bg-orange-500/10"
                  }
                >
                  {skipChecks ? "ON" : "OFF"}
                </Button>
              </div>

              {/* Approve BLOX Button */}
              {contractState.bloxAllowance !== null && 
               contractState.bloxAllowance < BigInt(debugData.totalBloxMass) * 10n ** 18n && (
                <Button
                  onClick={handleApproveBlox}
                  disabled={approving || !isConnected}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {approving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Approve BLOX
                </Button>
              )}

              {/* Mint Button */}
              <Button
                onClick={handleMint}
                disabled={minting || !isConnected || !generatedHash || (!canMint && !skipChecks)}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold"
              >
                {minting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {minting ? "Minting..." : `Mint NFT (${ethers.formatEther(FEE_PER_MINT)} ETH)`}
              </Button>

              {/* Mint Status */}
              {mintTxHash && (
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <p className="text-sm font-medium text-green-400 mb-1">Transaction Submitted!</p>
                  <a 
                    href={`https://sepolia.basescan.org/tx/${mintTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[hsl(var(--ethblox-accent-cyan))] flex items-center gap-1 hover:underline"
                  >
                    View on BaseScan <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {mintError && (
                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                  <p className="text-sm font-medium text-red-400 mb-1">Error</p>
                  <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] break-all">
                    {mintError}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Raw JSON Data */}
          <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                  Raw Build Data
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(JSON.stringify(debugData, null, 2), 'json')}
                  className="h-8"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copied === 'json' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg text-xs font-mono text-[hsl(var(--ethblox-text-tertiary))] overflow-auto max-h-64">
                {JSON.stringify({
                  ...debugData,
                  bricks: `[${debugData.bricks.length} bricks]`, // Truncate for display
                }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full Width Section - Build Preview & Screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* 3D Preview with Auto-Capture */}
        <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
              Build Preview (IPFS Image)
            </CardTitle>
            <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1">
              Standardized camera angle: 45° horizontal, 35° elevation. Auto-captures on load.
            </p>
          </CardHeader>
          <CardContent>
            <StandardBuildCapture
              bricks={debugData.bricks}
              buildName={debugData.buildName}
              buildId={debugData.buildId}
              autoCapture={true}
              onCapture={(dataUrl) => setScreenshotUrl(dataUrl)}
              showControls={true}
            />
          </CardContent>
        </Card>

        {/* Full Build Data (Geometry Hash Source) */}
        <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[hsl(var(--ethblox-text-primary))]">
                Full Build Data (Geometry Hash Source)
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  const fullData = {
                    buildId: debugData.buildId,
                    buildName: debugData.buildName,
                    baseWidth: debugData.baseWidth,
                    baseDepth: debugData.baseDepth,
                    bricks: debugData.bricks.map(b => ({
                      position: b.position,
                      color: b.color,
                      width: b.width,
                      depth: b.depth,
                    }))
                  }
                  copyToClipboard(JSON.stringify(fullData, null, 2), 'fullBuildData')
                }}
                className="h-8"
              >
                <Copy className="h-4 w-4 mr-1" />
                {copied === 'fullBuildData' ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mb-3">
              This is the normalized data used to generate the geometryHash. 
              The hash is deterministic based on brick positions, colors, and dimensions.
            </p>
            <pre className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg text-xs font-mono text-[hsl(var(--ethblox-text-secondary))] overflow-auto max-h-96">
{JSON.stringify({
  buildId: debugData.buildId,
  buildName: debugData.buildName,
  baseWidth: debugData.baseWidth,
  baseDepth: debugData.baseDepth,
  totalBricks: debugData.bricks.length,
  bricks: debugData.bricks.map(b => ({
    position: b.position,
    color: b.color,
    width: b.width,
    depth: b.depth,
  }))
}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
