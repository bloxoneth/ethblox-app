"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { type BrickNFT, formatBrickName, getSuggestedMintPrice } from "@/data/bricks"
import { Box, Layers, Weight, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { useMintBuild } from "@/lib/web3/hooks/useMintBuild"
import { useMetaMask } from "@/contexts/metamask-context"
import { ethers } from "ethers"
import { FEE_PER_MINT } from "@/lib/contracts/ethblox-contracts"

interface BrickMintModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brick: BrickNFT | null
  onMintSuccess?: (brick: BrickNFT) => void
}

// Generate a proper geometry hash for the brick
function generateBrickGeometryHash(width: number, depth: number, density: number): string {
  // Create a deterministic hash from brick dimensions
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["string", "uint8", "uint8", "uint8"],
    ["ETHBLOX_BRICK", width, depth, density]
  )
  return ethers.keccak256(encoded)
}

export function BrickMintModal({ open, onOpenChange, brick, onMintSuccess }: BrickMintModalProps) {
  const { isConnected, connect } = useMetaMask()
  const { mintBrickNFT, step, error, isLoading, reset, txHash, tokenId, isCorrectChain } = useMintBuild({
    onSuccess: () => {
      if (brick) {
        onMintSuccess?.(brick)
      }
    },
  })

  if (!brick) return null

  const suggestedPrice = getSuggestedMintPrice(brick)
  const mintFeeETH = ethers.formatEther(FEE_PER_MINT)

  const handleMint = async () => {
    if (!isConnected) {
      await connect()
      return
    }

    const geometryHash = generateBrickGeometryHash(brick.width, brick.depth, brick.density)
    
    await mintBrickNFT({
      geometryHash,
      spec: {
        width: brick.width,
        depth: brick.depth,
        density: brick.density,
      },
    })
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet"
    if (!isCorrectChain) return "Switch to Base Sepolia"
    if (step === "checking") return "Checking..."
    if (step === "minting") return "Minting..."
    if (step === "success") return "Minted!"
    if (step === "error") return "Try Again"
    return `Mint for ${mintFeeETH} ETH`
  }

  const isButtonDisabled = isLoading || step === "success"
  
  // Allow placing without minting (for development/testing when contract isn't ready)
  const handlePlaceAnyway = () => {
    if (brick) {
      onMintSuccess?.(brick)
    }
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--ethblox-text-primary))] flex items-center gap-2">
            <Box className="h-5 w-5 text-[hsl(var(--ethblox-yellow))]" />
            {step === "success" ? "Brick Minted!" : "Mint This Brick"}
          </DialogTitle>
          <DialogDescription className="text-[hsl(var(--ethblox-text-secondary))]">
            {step === "success" 
              ? "You now own this brick NFT. You can use it in any build."
              : "Be the first to mint and own this brick. Once minted, you can use it in any build."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Brick Preview */}
          <div className="flex items-center justify-center p-6 bg-[hsl(var(--ethblox-bg))] rounded-lg border border-[hsl(var(--ethblox-border))]">
            <div className="text-center">
              <div 
                className="w-24 h-16 mx-auto mb-3 rounded-sm border-2 border-[hsl(var(--ethblox-yellow))]"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--ethblox-yellow)) 0%, hsl(var(--ethblox-yellow) / 0.7) 100%)`,
                  boxShadow: `0 4px 0 hsl(var(--ethblox-yellow) / 0.5), inset 0 2px 10px hsl(0 0% 100% / 0.3)`,
                  aspectRatio: `${brick.width}/${brick.depth}`,
                }}
              />
              <p className="text-lg font-bold text-[hsl(var(--ethblox-text-primary))]">
                {formatBrickName(brick)}
              </p>
            </div>
          </div>

          {/* Success state */}
          {step === "success" && (
            <div className="p-4 bg-[hsl(var(--ethblox-green)/0.1)] rounded-lg border border-[hsl(var(--ethblox-green)/0.3)]">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-[hsl(var(--ethblox-green))]" />
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--ethblox-green))]">
                    Successfully Minted!
                  </p>
                  <p className="text-xs text-[hsl(var(--ethblox-text-secondary))] mt-1">
                    Token ID: {tokenId?.toString()}
                  </p>
                  {txHash && (
                    <a 
                      href={`https://sepolia.basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[hsl(var(--ethblox-accent-cyan))] hover:underline"
                    >
                      View transaction
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {step === "error" && error && (
            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Brick Stats */}
          {step !== "success" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg text-center">
                  <Layers className="h-4 w-4 mx-auto mb-1 text-[hsl(var(--ethblox-text-tertiary))]" />
                  <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">Size</p>
                  <p className="text-sm font-semibold text-[hsl(var(--ethblox-text-primary))]">
                    {brick.width}x{brick.depth}
                  </p>
                </div>
                <div className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg text-center">
                  <Weight className="h-4 w-4 mx-auto mb-1 text-[hsl(var(--ethblox-text-tertiary))]" />
                  <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">Mass</p>
                  <p className="text-sm font-semibold text-[hsl(var(--ethblox-text-primary))]">
                    {brick.mass}
                  </p>
                </div>
                <div className="p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg text-center">
                  <Box className="h-4 w-4 mx-auto mb-1 text-[hsl(var(--ethblox-text-tertiary))]" />
                  <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">Density</p>
                  <p className="text-sm font-semibold text-[hsl(var(--ethblox-text-primary))]">
                    {brick.density}
                  </p>
                </div>
              </div>

              <Separator className="bg-[hsl(var(--ethblox-border))]" />

              {/* Scarcity Info */}
              <div className="p-3 bg-[hsl(var(--ethblox-yellow)/0.1)] rounded-lg border border-[hsl(var(--ethblox-yellow)/0.3)]">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-[hsl(var(--ethblox-yellow))] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--ethblox-yellow))]">
                      Unique Brick NFT
                    </p>
                    <p className="text-xs text-[hsl(var(--ethblox-text-secondary))] mt-1">
                      Only one {brick.width}x{brick.depth} brick with density {brick.density} can exist. 
                      As the owner, you earn fees when others use this brick in their builds.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mint Fee */}
              <div className="flex items-center justify-between p-3 bg-[hsl(var(--ethblox-bg))] rounded-lg">
                <span className="text-sm text-[hsl(var(--ethblox-text-secondary))]">Mint Fee</span>
                <span className="text-lg font-bold text-[hsl(var(--ethblox-green))]">
                  {mintFeeETH} ETH
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {/* Primary actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-[hsl(var(--ethblox-border))] text-[hsl(var(--ethblox-text-secondary))] bg-transparent hover:bg-[hsl(var(--ethblox-surface-elevated))]"
              onClick={handleClose}
            >
              {step === "success" ? "Done" : "Cancel"}
            </Button>
            {step !== "success" && (
              <Button
                className="flex-1 bg-[hsl(var(--ethblox-yellow))] text-black hover:bg-[hsl(var(--ethblox-yellow)/0.9)] font-semibold disabled:opacity-50"
                onClick={handleMint}
                disabled={isButtonDisabled}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {getButtonText()}
              </Button>
            )}
          </div>
          {/* Place anyway option - for development when minting isn't available */}
          {step !== "success" && !isLoading && (
            <Button
              variant="ghost"
              className="w-full text-xs text-[hsl(var(--ethblox-text-tertiary))] hover:text-[hsl(var(--ethblox-text-secondary))] hover:bg-transparent"
              onClick={handlePlaceAnyway}
            >
              Place anyway (skip minting)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
