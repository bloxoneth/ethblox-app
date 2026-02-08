"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  MINTED_BUILDS, 
  BUILD_TAGS, 
  type BuildNFT, 
  type BuildTag,
  getBuildsByTag,
  sortByNewest,
  sortByOldest,
  sortByBrickCount,
} from "@/data/builds"
import { AlertTriangle, Box, Filter, Layers } from "lucide-react"
import Link from "next/link"

type SortOption = "newest" | "oldest" | "bricks"

export function ExploreClient() {
  const [selectedTags, setSelectedTags] = useState<BuildTag[]>([])
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  
  // Filter and sort builds
  const filteredBuilds = useMemo(() => {
    let builds = [...MINTED_BUILDS]
    
    // Filter by tags
    if (selectedTags.length > 0) {
      builds = builds.filter(b => 
        selectedTags.some(tag => b.tags?.includes(tag))
      )
    }
    
    // Sort
    switch (sortBy) {
      case "newest":
        builds = sortByNewest(builds)
        break
      case "oldest":
        builds = sortByOldest(builds)
        break
      case "bricks":
        builds = sortByBrickCount(builds)
        break
    }
    
    return builds
  }, [selectedTags, sortBy])
  
  const toggleTag = (tag: BuildTag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }
  
  const clearFilters = () => {
    setSelectedTags([])
    setSortBy("newest")
  }
  
  return (
    <div className="container mx-auto px-6 max-w-[1800px]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-2">
          Explore Builds
        </h1>
        <p className="text-[hsl(var(--ethblox-text-secondary))]">
          Discover minted builds in the ETHBLOX ecosystem
        </p>
        
        {/* Fresh Start Banner */}
        <div className="mt-4 p-4 bg-[hsl(var(--ethblox-yellow)/0.1)] rounded-lg border border-[hsl(var(--ethblox-yellow)/0.3)]">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-[hsl(var(--ethblox-yellow))] flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[hsl(var(--ethblox-yellow))]">
                Fresh Start - New Contracts Deployed
              </p>
              <p className="text-xs text-[hsl(var(--ethblox-text-secondary))] mt-1">
                Start by minting 1x1 bricks and building up from there. All builds shown here are minted on-chain.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="mb-6 p-4 bg-[hsl(var(--ethblox-surface))] rounded-lg border border-[hsl(var(--ethblox-border))]">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-[hsl(var(--ethblox-text-tertiary))]" />
          <span className="text-sm font-medium text-[hsl(var(--ethblox-text-primary))]">Filters</span>
          {selectedTags.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="ml-auto text-xs text-[hsl(var(--ethblox-text-tertiary))] hover:text-[hsl(var(--ethblox-text-primary))]"
            >
              Clear All
            </Button>
          )}
        </div>
        
        {/* Tags */}
        <div className="mb-4">
          <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {BUILD_TAGS.map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-[hsl(var(--ethblox-green))] text-black hover:bg-[hsl(var(--ethblox-green)/0.9)]"
                    : "border-[hsl(var(--ethblox-border))] text-[hsl(var(--ethblox-text-secondary))] hover:border-[hsl(var(--ethblox-green))] hover:text-[hsl(var(--ethblox-green))]"
                }`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Sort */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[150px] max-w-[200px]">
            <p className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mb-2">Sort by</p>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="bg-[hsl(var(--ethblox-bg))] border-[hsl(var(--ethblox-border))]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="bricks">Most Bricks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Results count */}
      <p className="text-sm text-[hsl(var(--ethblox-text-tertiary))] mb-4">
        {filteredBuilds.length === 0 
          ? "No builds minted yet - be the first!"
          : `Showing ${filteredBuilds.length} builds`
        }
      </p>
      
      {/* Build Grid or Empty State */}
      {filteredBuilds.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredBuilds.map(build => (
            <BuildCard key={build.id} build={build} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Box className="h-16 w-16 mx-auto mb-6 text-[hsl(var(--ethblox-text-tertiary))]" />
          <h3 className="text-xl font-semibold text-[hsl(var(--ethblox-text-primary))] mb-2">
            No Builds Yet
          </h3>
          <p className="text-[hsl(var(--ethblox-text-secondary))] mb-6 max-w-md mx-auto">
            Fresh contracts have been deployed. Start by minting 1x1 bricks in the builder, then create and mint your first build!
          </p>
          <Link href="/buildv2">
            <Button className="bg-[hsl(var(--ethblox-green))] text-black hover:bg-[hsl(var(--ethblox-green)/0.9)] font-semibold">
              Start Building
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}

function BuildCard({ build }: { build: BuildNFT }) {
  const daysAgo = Math.floor((Date.now() - build.createdAt) / (1000 * 60 * 60 * 24))
  
  return (
    <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] hover:border-[hsl(var(--ethblox-green)/0.5)] transition-colors cursor-pointer group">
      <CardContent className="p-3">
        {/* Placeholder Preview - will be replaced with 3D preview */}
        <div className="aspect-square mb-3 rounded-lg bg-[hsl(var(--ethblox-bg))] flex items-center justify-center overflow-hidden">
          <div className="text-center">
            <Box className="h-8 w-8 mx-auto mb-2 text-[hsl(var(--ethblox-text-tertiary))] group-hover:text-[hsl(var(--ethblox-green))] transition-colors" />
            <span className="text-xs text-[hsl(var(--ethblox-text-tertiary))]">
              #{build.tokenId}
            </span>
          </div>
        </div>
        
        {/* Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[hsl(var(--ethblox-text-primary))] truncate">
              {build.name || `Build #${build.tokenId}`}
            </span>
          </div>
          
          {/* Tags */}
          {build.tags && build.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {build.tags.slice(0, 2).map(tag => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0 border-[hsl(var(--ethblox-border))] text-[hsl(var(--ethblox-text-tertiary))]"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-[hsl(var(--ethblox-text-tertiary))]">
            <div className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <span>{build.brickCount} bricks</span>
            </div>
            <span>{daysAgo === 0 ? "Today" : `${daysAgo}d ago`}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
