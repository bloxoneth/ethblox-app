"use client"

import { useMetaMask } from "@/contexts/metamask-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, Blocks, Shield } from "lucide-react"
import Link from "next/link"

const ADMIN_ADDRESS = "0xe258B3C38CC85e251a1bdB3E60A8A85a071090b7"

export function AdminClient() {
  const { account, isConnected, connect } = useMetaMask()

  // Check if current user is admin
  const isAdmin = account?.toLowerCase() === ADMIN_ADDRESS.toLowerCase()

  if (!isConnected) {
    return (
      <div className="container mx-auto px-6 py-20 max-w-2xl">
        <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))]">
          <CardHeader>
            <CardTitle className="text-[hsl(var(--ethblox-text-primary))] flex items-center gap-2">
              <Shield className="h-5 w-5 text-[hsl(var(--ethblox-yellow))]" />
              Admin Access Required
            </CardTitle>
            <CardDescription className="text-[hsl(var(--ethblox-text-secondary))]">
              Connect your wallet to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={connect} className="w-full bg-[hsl(var(--ethblox-green))] text-black font-semibold">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-6 py-20 max-w-2xl">
        <Card className="bg-[hsl(var(--ethblox-surface))] border-red-500/50">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription className="text-[hsl(var(--ethblox-text-secondary))]">
              You do not have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-[hsl(var(--ethblox-text-tertiary))]">
              Connected address: <span className="font-mono">{account}</span>
            </p>
            <p className="text-sm text-[hsl(var(--ethblox-text-tertiary))]">
              Required address: <span className="font-mono">{ADMIN_ADDRESS}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-20 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-2">
          Admin Dashboard
        </h1>
        <p className="text-[hsl(var(--ethblox-text-secondary))]">System administration and debugging tools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] hover:border-[hsl(var(--ethblox-accent-cyan))] transition-colors">
          <CardHeader>
            <CardTitle className="text-[hsl(var(--ethblox-text-primary))] flex items-center gap-2">
              <Blocks className="h-5 w-5 text-[hsl(var(--ethblox-accent-cyan))]" />
              Studio
            </CardTitle>
            <CardDescription className="text-[hsl(var(--ethblox-text-secondary))]">
              Build with minted Build NFTs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              className="w-full bg-[hsl(var(--ethblox-accent-cyan))] hover:bg-[hsl(var(--ethblox-accent-cyan))]/90 text-black font-semibold"
            >
              <Link href="/studio">Open Studio</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] hover:border-[hsl(var(--ethblox-yellow))] transition-colors">
          <CardHeader>
            <CardTitle className="text-[hsl(var(--ethblox-text-primary))] flex items-center gap-2">
              <Database className="h-5 w-5 text-[hsl(var(--ethblox-yellow))]" />
              Build Data Table
            </CardTitle>
            <CardDescription className="text-[hsl(var(--ethblox-text-secondary))]">
              View all builds in a formatted table
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              className="w-full bg-[hsl(var(--ethblox-yellow))] hover:bg-[hsl(var(--ethblox-yellow))]/90 text-black font-semibold"
            >
              <Link href="/admin/build-data">View Table</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] hover:border-[hsl(var(--ethblox-green))] transition-colors">
          <CardHeader>
            <CardTitle className="text-[hsl(var(--ethblox-text-primary))] flex items-center gap-2">
              <Database className="h-5 w-5 text-[hsl(var(--ethblox-green))]" />
              Redis Data Dump
            </CardTitle>
            <CardDescription className="text-[hsl(var(--ethblox-text-secondary))]">
              View all build data stored in Redis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              variant="outline"
              className="w-full border-[hsl(var(--ethblox-border))] text-[hsl(var(--ethblox-text-primary))] hover:border-[hsl(var(--ethblox-green))] hover:text-[hsl(var(--ethblox-green))] bg-transparent"
            >
              <Link href="/api/admin/redis-dump" target="_blank">
                View Data
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-4 bg-[hsl(var(--ethblox-surface-elevated))] border border-[hsl(var(--ethblox-border))] rounded-lg">
        <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">
          Logged in as: <span className="font-mono text-[hsl(var(--ethblox-green))]">{account}</span>
        </p>
      </div>
    </div>
  )
}
