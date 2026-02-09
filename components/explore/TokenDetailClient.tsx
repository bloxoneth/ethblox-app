"use client"

import React, { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  Box,
  FileText,
  Link2,
  AlertCircle,
  Database,
  Globe,
  Server,
  Link as LinkIcon,
  Upload,
  Loader2,
} from "lucide-react"
import { CONTRACTS, resolveIPFS, tokenImageGatewayURL } from "@/lib/contracts/ethblox-contracts"

type DataMode = "onchain" | "app"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function shortenAddress(addr: string) {
  if (!addr) return ""
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="text-[hsl(var(--ethblox-text-tertiary))] hover:text-[hsl(var(--ethblox-text-primary))] transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-[hsl(var(--ethblox-text-primary))]">
            {title}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-[hsl(var(--ethblox-text-tertiary))] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <CardContent className="pt-0 pb-4 px-4 border-t border-[hsl(var(--ethblox-border))]">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

/* ────────── Main component ────────── */

export function TokenDetailClient({ tokenId }: { tokenId: string }) {
  const [mode, setMode] = useState<DataMode>("onchain")

  // Always fetch both so switching is instant
  const { data: onchainData, isLoading: onchainLoading } = useSWR(
    `/api/builds/onchain/${tokenId}`,
    fetcher,
    { revalidateOnFocus: false }
  )
  const { data: appData, isLoading: appLoading } = useSWR(
    `/api/builds/token/${tokenId}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const isLoading = mode === "onchain" ? onchainLoading : appLoading
  const basescanURL = `https://sepolia.basescan.org/token/${CONTRACTS.BUILD_NFT}?a=${tokenId}`
  const image = tokenImageGatewayURL(tokenId)

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 max-w-[1200px]">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-[480px] flex-shrink-0">
            <div className="aspect-square rounded-xl bg-[hsl(var(--ethblox-surface))] animate-pulse" />
          </div>
          <div className="flex-1 space-y-4">
            <div className="h-8 w-48 rounded bg-[hsl(var(--ethblox-surface))] animate-pulse" />
            <div className="h-6 w-32 rounded bg-[hsl(var(--ethblox-surface))] animate-pulse" />
            <div className="h-40 rounded-xl bg-[hsl(var(--ethblox-surface))] animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  // Derive display data from whichever mode is active
  const onchain = onchainData?.onchain
  const ipfsMetadata = onchainData?.ipfsMetadata
  const ipfsURL = onchainData?.ipfsURL
  const errors = onchainData?.errors

  const name =
    mode === "onchain"
      ? ipfsMetadata?.name || onchain?.name || `Build #${tokenId}`
      : appData?.name || `Build #${tokenId}`
  const description =
    mode === "onchain"
      ? ipfsMetadata?.description || null
      : null
  const kindRaw = mode === "onchain" ? onchain?.kind : appData?.kind
  const kindLabel = kindRaw === 0 ? "Brick" : kindRaw > 0 ? "Build" : "--"

  return (
    <div className="container mx-auto px-6 max-w-[1200px]">
      {/* Back + toggle row */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/explore">
          <Button variant="ghost" className="text-[hsl(var(--ethblox-text-secondary))] bg-transparent hover:text-[hsl(var(--ethblox-text-primary))]">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        {/* Data source toggle */}
        <div className="flex items-center rounded-lg border border-[hsl(var(--ethblox-border))] bg-[hsl(var(--ethblox-surface))] p-0.5">
          <button
            type="button"
            onClick={() => setMode("onchain")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === "onchain"
                ? "bg-[hsl(var(--ethblox-green))] text-black"
                : "text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-text-primary))]"
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            On-chain
          </button>
          <button
            type="button"
            onClick={() => setMode("app")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === "app"
                ? "bg-[hsl(var(--ethblox-green))] text-black"
                : "text-[hsl(var(--ethblox-text-secondary))] hover:text-[hsl(var(--ethblox-text-primary))]"
            }`}
          >
            <Server className="h-3.5 w-3.5" />
            App Data
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Image */}
        <div className="lg:w-[480px] flex-shrink-0">
          <div className="sticky top-24 space-y-4">
            <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] overflow-hidden">
              <div className="aspect-square flex items-center justify-center bg-[hsl(var(--ethblox-bg))]">
                {image ? (
                  <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <Box className="h-16 w-16 mx-auto mb-3 text-[hsl(var(--ethblox-text-tertiary))]" />
                    <p className="text-sm text-[hsl(var(--ethblox-text-tertiary))]">No image</p>
                  </div>
                )}
              </div>
            </Card>

            {description && (
              <CollapsibleSection
                title="Description"
                icon={<FileText className="h-4 w-4 text-[hsl(var(--ethblox-text-tertiary))]" />}
                defaultOpen
              >
                <p className="text-sm text-[hsl(var(--ethblox-text-secondary))] leading-relaxed mt-3">
                  {description}
                </p>
              </CollapsibleSection>
            )}
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header */}
          <div>
            <Link
              href={`https://sepolia.basescan.org/address/${CONTRACTS.BUILD_NFT}`}
              target="_blank"
              className="text-sm text-[hsl(var(--ethblox-accent-cyan))] hover:underline flex items-center gap-1"
            >
              ETHBLOX BuildNFT
              <ExternalLink className="h-3 w-3" />
            </Link>
            <h1 className="text-2xl font-bold text-[hsl(var(--ethblox-text-primary))] mt-1">
              {name}
            </h1>
            <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1 font-mono">
              {mode === "onchain" ? "Data from chain + IPFS" : "Data from app (Redis)"}
            </p>
          </div>

          {/* Owner */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[hsl(var(--ethblox-text-tertiary))]">Owned by</span>
            {mode === "onchain" && onchain?.owner ? (
              <Link
                href={`https://sepolia.basescan.org/address/${onchain.owner}`}
                target="_blank"
                className="text-[hsl(var(--ethblox-accent-cyan))] hover:underline flex items-center gap-1"
              >
                {shortenAddress(onchain.owner)}
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : mode === "app" && appData?.creator ? (
              <Link
                href={`https://sepolia.basescan.org/address/${appData.creator}`}
                target="_blank"
                className="text-[hsl(var(--ethblox-accent-cyan))] hover:underline flex items-center gap-1"
              >
                {shortenAddress(appData.creator)}
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <span className="text-[hsl(var(--ethblox-text-secondary))]">Unknown</span>
            )}
          </div>

          {/* ─── ON-CHAIN VIEW ─── */}
          {mode === "onchain" && (
            <>
              {/* Properties from chain + IPFS */}
              {(onchain?.brickSpec || (ipfsMetadata?.attributes?.length > 0)) && (
                <CollapsibleSection
                  title="Properties"
                  icon={<Box className="h-4 w-4 text-[hsl(var(--ethblox-text-tertiary))]" />}
                  defaultOpen
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                    <TraitCard label="Kind" value={kindLabel} />
                    {onchain?.brickSpec && (
                      <>
                        <TraitCard label="Width" value={onchain.brickSpec.width} />
                        <TraitCard label="Depth" value={onchain.brickSpec.depth} />
                        <TraitCard label="Density" value={onchain.brickSpec.density} />
                      </>
                    )}
                    {onchain?.lockedBlox && onchain.lockedBlox !== "0" && (
                      <TraitCard label="Locked BLOX" value={onchain.lockedBlox} />
                    )}
                    {(ipfsMetadata?.attributes || []).map((attr: any) => (
                      <TraitCard key={attr.trait_type} label={attr.trait_type} value={attr.value} />
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Contract details */}
              <CollapsibleSection
                title="Details"
                icon={<Database className="h-4 w-4 text-[hsl(var(--ethblox-text-tertiary))]" />}
                defaultOpen
              >
                <div className="space-y-3 mt-3">
                  <DetailRow label="Contract Address">
                    <Link href={`https://sepolia.basescan.org/address/${CONTRACTS.BUILD_NFT}`} target="_blank"
                      className="text-[hsl(var(--ethblox-accent-cyan))] hover:underline text-xs font-mono flex items-center gap-1">
                      {shortenAddress(CONTRACTS.BUILD_NFT)}<ExternalLink className="h-3 w-3" />
                    </Link>
                  </DetailRow>
                  <DetailRow label="Token ID">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-[hsl(var(--ethblox-text-primary))]">{tokenId}</span>
                      <CopyButton text={tokenId} />
                    </div>
                  </DetailRow>
                  <DetailRow label="Chain"><span className="text-xs text-[hsl(var(--ethblox-text-primary))]">Base Sepolia</span></DetailRow>
                  <DetailRow label="Token Standard"><span className="text-xs text-[hsl(var(--ethblox-text-primary))]">ERC-721</span></DetailRow>
                  {onchain?.geometryHash && (
                    <DetailRow label="Geometry Hash">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-[hsl(var(--ethblox-text-primary))] truncate max-w-[200px]">{onchain.geometryHash}</span>
                        <CopyButton text={onchain.geometryHash} />
                      </div>
                    </DetailRow>
                  )}
                  {onchain?.tokenURI && (
                    <DetailRow label="Token URI">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-[hsl(var(--ethblox-text-primary))] truncate max-w-[200px]">{onchain.tokenURI}</span>
                        <CopyButton text={onchain.tokenURI} />
                      </div>
                    </DetailRow>
                  )}
                </div>
              </CollapsibleSection>

              {/* Data Sources */}
              <CollapsibleSection title="Data Sources" icon={<Globe className="h-4 w-4 text-[hsl(var(--ethblox-text-tertiary))]" />}>
                <div className="space-y-3 mt-3">
                  <DetailRow label="On-chain RPC"><span className="text-xs font-mono text-[hsl(var(--ethblox-text-secondary))]">sepolia.base.org</span></DetailRow>
                  {ipfsURL && (
                    <DetailRow label="IPFS Metadata">
                      <Link href={ipfsURL} target="_blank" className="text-xs font-mono text-[hsl(var(--ethblox-accent-cyan))] hover:underline flex items-center gap-1">
                        View JSON<ExternalLink className="h-3 w-3" />
                      </Link>
                    </DetailRow>
                  )}
                  <DetailRow label="BaseScan">
                    <Link href={basescanURL} target="_blank" className="text-xs text-[hsl(var(--ethblox-accent-cyan))] hover:underline flex items-center gap-1">
                      View on BaseScan<ExternalLink className="h-3 w-3" />
                    </Link>
                  </DetailRow>
                </div>
              </CollapsibleSection>

              {/* Warnings */}
              {errors && errors.length > 0 && (
                <CollapsibleSection title={`Warnings (${errors.length})`} icon={<AlertCircle className="h-4 w-4 text-[hsl(var(--ethblox-yellow))]" />}>
                  <ul className="space-y-1.5 mt-3">
                    {errors.map((err: string, i: number) => (
                      <li key={i} className="text-xs font-mono text-[hsl(var(--ethblox-yellow))] bg-[hsl(var(--ethblox-yellow)/0.1)] px-3 py-2 rounded">{err}</li>
                    ))}
                  </ul>
                </CollapsibleSection>
              )}

              {/* Raw JSON */}
              <CollapsibleSection title="Raw On-chain Data" icon={<Link2 className="h-4 w-4 text-[hsl(var(--ethblox-text-tertiary))]" />}>
                <pre className="mt-3 text-xs font-mono text-[hsl(var(--ethblox-text-secondary))] bg-[hsl(var(--ethblox-bg))] p-4 rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
                  {JSON.stringify(onchain, null, 2)}
                </pre>
              </CollapsibleSection>

              {ipfsMetadata && (
                <CollapsibleSection title="Raw IPFS Metadata" icon={<Link2 className="h-4 w-4 text-[hsl(var(--ethblox-text-tertiary))]" />}>
                  <pre className="mt-3 text-xs font-mono text-[hsl(var(--ethblox-text-secondary))] bg-[hsl(var(--ethblox-bg))] p-4 rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
                    {JSON.stringify(ipfsMetadata, null, 2)}
                  </pre>
                </CollapsibleSection>
              )}
            </>
          )}

          {/* ─── IPFS PUSH ─── */}
          <IPFSPushSection tokenId={tokenId} />

          {/* ─── APP DATA VIEW ─── */}
          {mode === "app" && (
            <>
              {appData?.error ? (
                <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
                  <CardContent className="p-6 text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-3 text-[hsl(var(--ethblox-text-tertiary))]" />
                    <p className="text-sm text-[hsl(var(--ethblox-text-secondary))]">No app data found for this token in Redis.</p>
                  </CardContent>
                </Card>
              ) : appData ? (
                <>
                  {/* App properties */}
                  <CollapsibleSection title="Properties" icon={<Box className="h-4 w-4 text-[hsl(var(--ethblox-text-tertiary))]" />} defaultOpen>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                      <TraitCard label="Kind" value={kindLabel} />
                      {appData.brickWidth && <TraitCard label="Width" value={appData.brickWidth} />}
                      {appData.brickDepth && <TraitCard label="Depth" value={appData.brickDepth} />}
                      {appData.density && <TraitCard label="Density" value={appData.density} />}
                      {appData.mass && <TraitCard label="Mass" value={appData.mass} />}
                      {appData.colors && <TraitCard label="Colors" value={appData.colors} />}
                      {appData.bw_score && <TraitCard label="BW Score" value={appData.bw_score} />}
                      {appData.bricks && <TraitCard label="Bricks" value={appData.bricks.length} />}
                    </div>
                  </CollapsibleSection>

                  {/* App details */}
                  <CollapsibleSection title="Details" icon={<Database className="h-4 w-4 text-[hsl(var(--ethblox-text-tertiary))]" />} defaultOpen>
                    <div className="space-y-3 mt-3">
                      <DetailRow label="Build ID">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono text-[hsl(var(--ethblox-text-primary))] truncate max-w-[200px]">{appData.buildId || appData.id}</span>
                          <CopyButton text={appData.buildId || appData.id || ""} />
                        </div>
                      </DetailRow>
                      <DetailRow label="Token ID">
                        <span className="text-xs font-mono text-[hsl(var(--ethblox-text-primary))]">{tokenId}</span>
                      </DetailRow>
                      {appData.buildHash && (
                        <DetailRow label="Build Hash">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-[hsl(var(--ethblox-text-primary))] truncate max-w-[200px]">{appData.buildHash}</span>
                            <CopyButton text={appData.buildHash} />
                          </div>
                        </DetailRow>
                      )}
                      {appData.geometryHash && (
                        <DetailRow label="Geometry Hash">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-[hsl(var(--ethblox-text-primary))] truncate max-w-[200px]">{appData.geometryHash}</span>
                            <CopyButton text={appData.geometryHash} />
                          </div>
                        </DetailRow>
                      )}
                      {appData.specKey && (
                        <DetailRow label="Spec Key">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-[hsl(var(--ethblox-text-primary))] truncate max-w-[200px]">{appData.specKey}</span>
                            <CopyButton text={appData.specKey} />
                          </div>
                        </DetailRow>
                      )}
                      {appData.txHash && (
                        <DetailRow label="Tx Hash">
                          <Link href={`https://sepolia.basescan.org/tx/${appData.txHash}`} target="_blank"
                            className="text-xs font-mono text-[hsl(var(--ethblox-accent-cyan))] hover:underline flex items-center gap-1">
                            {shortenAddress(appData.txHash)}<ExternalLink className="h-3 w-3" />
                          </Link>
                        </DetailRow>
                      )}
                      {appData.created && <DetailRow label="Created"><span className="text-xs text-[hsl(var(--ethblox-text-primary))]">{new Date(appData.created).toLocaleString()}</span></DetailRow>}
                      {appData.mintedAt && <DetailRow label="Minted"><span className="text-xs text-[hsl(var(--ethblox-text-primary))]">{new Date(appData.mintedAt).toLocaleString()}</span></DetailRow>}
                    </div>
                  </CollapsibleSection>

                  {/* Composition / provenance */}
                  {appData.composition && Object.keys(appData.composition).length > 0 && (
                    <CollapsibleSection title="Composition (Provenance)" icon={<Link2 className="h-4 w-4 text-[hsl(var(--ethblox-text-tertiary))]" />} defaultOpen>
                      <div className="space-y-2 mt-3">
                        {Object.entries(appData.composition).map(([tid, info]: [string, any]) => (
                          <div key={tid} className="flex items-center justify-between text-xs">
                            <Link href={`/explore/${tid}`} className="text-[hsl(var(--ethblox-accent-cyan))] hover:underline font-mono">
                              Token #{tid} - {info.name}
                            </Link>
                            <span className="text-[hsl(var(--ethblox-text-secondary))]">x{info.count}</span>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Raw JSON */}
                  <CollapsibleSection title="Raw App Data" icon={<Link2 className="h-4 w-4 text-[hsl(var(--ethblox-text-tertiary))]" />}>
                    <pre className="mt-3 text-xs font-mono text-[hsl(var(--ethblox-text-secondary))] bg-[hsl(var(--ethblox-bg))] p-4 rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
                      {JSON.stringify(appData, null, 2)}
                    </pre>
                  </CollapsibleSection>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ────────── IPFS Push Section ────────── */

function IPFSPushSection({ tokenId }: { tokenId: string }) {
  const [pushing, setPushing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<any>(null)

  const handlePreview = async () => {
    setError(null)
    try {
      const res = await fetch(`/api/builds/ipfs-push/${tokenId}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setPreview(data)
      }
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handlePush = async () => {
    setPushing(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/builds/ipfs-push/${tokenId}`, { method: "POST" })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setPushing(false)
    }
  }

  return (
    <CollapsibleSection
      title="IPFS Metadata"
      icon={<Upload className="h-4 w-4 text-[hsl(var(--ethblox-text-tertiary))]" />}
    >
      <div className="space-y-3 mt-3">
        <p className="text-xs text-[hsl(var(--ethblox-text-secondary))]">
          Generate and push ERC-721 metadata JSON to IPFS via Lighthouse for this token.
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            className="text-xs bg-transparent"
          >
            Preview Metadata
          </Button>
          <Button
            size="sm"
            onClick={handlePush}
            disabled={pushing}
            className="text-xs bg-[hsl(var(--ethblox-green))] text-black hover:bg-[hsl(var(--ethblox-green)/0.9)]"
          >
            {pushing ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                Pushing...
              </>
            ) : (
              <>
                <Upload className="h-3 w-3 mr-1.5" />
                Push to IPFS
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="text-xs font-mono text-red-400 bg-red-400/10 px-3 py-2 rounded">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="text-xs font-mono text-[hsl(var(--ethblox-green))] bg-[hsl(var(--ethblox-green)/0.1)] px-3 py-2 rounded">
              Pushed successfully!
            </div>
            <DetailRow label="CID">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-[hsl(var(--ethblox-text-primary))] truncate max-w-[200px]">{result.cid}</span>
                <CopyButton text={result.cid} />
              </div>
            </DetailRow>
            <DetailRow label="Gateway">
              <a
                href={result.gatewayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-[hsl(var(--ethblox-accent-cyan))] hover:underline flex items-center gap-1"
              >
                View on IPFS<ExternalLink className="h-3 w-3" />
              </a>
            </DetailRow>
          </div>
        )}

        {preview && (
          <pre className="text-xs font-mono text-[hsl(var(--ethblox-text-secondary))] bg-[hsl(var(--ethblox-bg))] p-4 rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto">
            {JSON.stringify(preview.metadata, null, 2)}
          </pre>
        )}
      </div>
    </CollapsibleSection>
  )
}

function TraitCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg border border-[hsl(var(--ethblox-accent-cyan)/0.3)] bg-[hsl(var(--ethblox-accent-cyan)/0.05)]">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ethblox-accent-cyan))]">{label}</p>
      <p className="text-sm font-medium text-[hsl(var(--ethblox-text-primary))] mt-0.5 truncate">{String(value)}</p>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">{label}</span>
      {children}
    </div>
  )
}
