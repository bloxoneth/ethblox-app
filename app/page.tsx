import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Box, Layers, Sparkles, Lock } from "lucide-react"
import { HeroVideo } from "@/components/hero-video"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="pt-16">
        {/* Hero Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-heading font-bold text-[hsl(var(--ethblox-yellow))] mb-6 text-balance">
                ETHBLOX
              </h1>
              <p className="text-2xl md:text-3xl text-[hsl(var(--ethblox-text-primary))] mb-6 text-balance leading-relaxed">
                Programmable matter for Ethereum's next cultural era.
              </p>
              <p className="text-base md:text-lg text-[hsl(var(--ethblox-text-secondary))] mb-8 leading-relaxed">
                3D on-chain art, programmable matter, AI-native agents & a circular economy for Ethereum's evolving
                creative frontier.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  className="bg-[hsl(var(--ethblox-green))] text-[hsl(var(--ethblox-bg))] hover:bg-[hsl(var(--ethblox-green))]/90 font-heading text-base"
                  size="lg"
                >
                  <Link href="/whitepaper">READ THE PAPER</Link>
                </Button>
                <Button
                  asChild
                  className="bg-[hsl(var(--ethblox-yellow))] text-[hsl(var(--ethblox-bg))] hover:bg-[hsl(var(--ethblox-yellow))]/90 font-heading text-base"
                  size="lg"
                >
                  <Link href="/build">BUILD NOW</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-[hsl(var(--ethblox-border))] text-[hsl(var(--ethblox-text-primary))] hover:bg-[hsl(var(--ethblox-surface))] hover:border-[hsl(var(--ethblox-green))] font-heading text-base bg-transparent"
                  size="lg"
                >
                  <Link href="#">JOIN BUILDERS CIRCLE</Link>
                </Button>
              </div>
            </div>

            {/* Right: Video Player Placeholder */}
            <div className="relative aspect-video bg-[hsl(var(--ethblox-surface))] rounded-lg border border-[hsl(var(--ethblox-border))] overflow-hidden">
              <HeroVideo />
            </div>
          </div>

          {/* Physics Engine Tagline */}
          <div className="mt-16 text-center">
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed max-w-4xl mx-auto">
              ETHBLOX is a physics-driven creative substrate for Ethereum — a place where matter, shape, and reputation
              converge into a living cultural economy.
            </p>
          </div>
        </section>

        {/* Three Primitives Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-center text-[hsl(var(--ethblox-text-primary))] mb-4">
            A Universe Made of Three Primitives
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {/* BLOX Card */}
            <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-8 hover:border-[hsl(var(--ethblox-green))] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg">
                  <Box className="h-6 w-6 text-[hsl(var(--ethblox-yellow))]" />
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-1">BLOX</h3>
                  <span className="text-xs text-[hsl(var(--ethblox-text-tertiary))] font-mono">
                    ERC20 · Digital Matter
                  </span>
                </div>
              </div>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                Scarce, conserved, valuable. Everything is built from BLOX. Lock BLOX into BUILDS → destroy → recover
                80%. Matter becomes a cultural resource shaped by human imagination.
              </p>
            </Card>

            {/* BRICKS Card */}
            <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-8 hover:border-[hsl(var(--ethblox-green))] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg">
                  <Layers className="h-6 w-6 text-[hsl(var(--ethblox-green))]" />
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-1">
                    BRICKS
                  </h3>
                  <span className="text-xs text-[hsl(var(--ethblox-text-tertiary))] font-mono">
                    ERC721 Moulds · Geometry
                  </span>
                </div>
              </div>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                The canonical shape vocabulary. Each mould has a usage curve; higher demand → higher licence cost. ETH
                licence fees split: 50% creator / 30% protocol-owned liquidity / 20% treasury.
              </p>
            </Card>

            {/* BUILDS Card */}
            <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-8 hover:border-[hsl(var(--ethblox-green))] transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg">
                  <Sparkles className="h-6 w-6 text-[hsl(var(--ethblox-blue))]" />
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-1">
                    BUILDS
                  </h3>
                  <span className="text-xs text-[hsl(var(--ethblox-text-tertiary))] font-mono">
                    ERC721/1155 · Artifacts
                  </span>
                </div>
              </div>
              <p className="text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
                Voxel sculptures made of actual BLOX. Each BUILD stores mass, mould lineage, provenance & Builder
                Weight. The whole system is simply: BLOX + BRICKS → BUILDS.
              </p>
            </Card>
          </div>
        </section>

        {/* Not a Metaverse Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-6">
              Not a Metaverse — A New On-Chain Art Primitive
            </h2>
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed">
              No land sales. No avatars. No VR. ETHBLOX is a cultural physics engine disguised as a toy — a way to
              sculpt 3D artifacts on-chain with real constraints, real economics, and real history.
            </p>
          </div>
        </section>

        {/* Genesis BRICKS Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-4">
              Genesis BRICKS: Ethereum's First Shapes
            </h2>
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed max-w-3xl mx-auto">
              210 foundational moulds form the base vocabulary of a new creative era. From these emerge the early
              monuments — fossils of a future medium
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[
              "ETHBLOX DOGE",
              "ETHBLOX PEPE",
              "ETHBLOX PUNKS",
              "First 67-BLOX statue",
              "Tony Hawk skateboard",
              "Beeple x ETHBLOX installation",
            ].map((name) => (
              <Card
                key={name}
                className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-6 hover:border-[hsl(var(--ethblox-green))] transition-all"
              >
                <div className="aspect-square bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg mb-4 flex items-center justify-center">
                  <Lock className="h-12 w-12 text-[hsl(var(--ethblox-text-tertiary))]" />
                </div>
                <h3 className="font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-2">{name}</h3>
                <p className="text-sm text-[hsl(var(--ethblox-text-secondary))]">Coming Soon</p>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              asChild
              className="bg-[hsl(var(--ethblox-green))] text-[hsl(var(--ethblox-bg))] hover:bg-[hsl(var(--ethblox-green))]/90 font-heading"
              size="lg"
            >
              <Link href="/bricks">EXPLORE GENESIS BRICKS</Link>
            </Button>
          </div>
        </section>

        {/* Builder Weight Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-center text-[hsl(var(--ethblox-text-primary))] mb-12">
              Builder Weight
            </h2>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Formula & Example */}
              <div>
                <div className="bg-[hsl(var(--ethblox-surface))] border border-[hsl(var(--ethblox-border))] rounded-lg p-8 mb-6">
                  <p className="text-[hsl(var(--ethblox-text-secondary))] mb-4">
                    Builder Weight measures creative complexity:
                  </p>
                  <div className="bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg p-6 mb-6 text-center">
                    <code className="text-xl text-[hsl(var(--ethblox-yellow))]">
                      BW = log(1 + mass) × log(2 + mouldDiversity)
                    </code>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg p-4">
                      <div className="text-3xl font-heading font-bold text-[hsl(var(--ethblox-green))]">42.7</div>
                      <div className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1">Example BW</div>
                    </div>
                    <div className="bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg p-4">
                      <div className="text-3xl font-heading font-bold text-[hsl(var(--ethblox-blue))]">127</div>
                      <div className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1">BLOX Mass</div>
                    </div>
                    <div className="bg-[hsl(var(--ethblox-surface-elevated))] rounded-lg p-4">
                      <div className="text-3xl font-heading font-bold text-[hsl(var(--ethblox-yellow))]">8</div>
                      <div className="text-xs text-[hsl(var(--ethblox-text-tertiary))] mt-1">Mould Types</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Benefits List */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--ethblox-green))]/20 flex items-center justify-center">
                    <span className="text-[hsl(var(--ethblox-green))]">✓</span>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--ethblox-text-primary))] leading-relaxed">
                      Higher BW → larger share of ETH rewards
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--ethblox-green))]/20 flex items-center justify-center">
                    <span className="text-[hsl(var(--ethblox-green))]">✓</span>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--ethblox-text-primary))] leading-relaxed">
                      Rewards come from mould licence revenue
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--ethblox-green))]/20 flex items-center justify-center">
                    <span className="text-[hsl(var(--ethblox-green))]">✓</span>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--ethblox-text-primary))] leading-relaxed">
                      No token staking — only creativity is staked
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--ethblox-green))]/20 flex items-center justify-center">
                    <span className="text-[hsl(var(--ethblox-green))]">✓</span>
                  </div>
                  <div>
                    <p className="text-[hsl(var(--ethblox-text-primary))] leading-relaxed">
                      Artistic depth becomes economically meaningful
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Circular Economy Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-4">
              Circular Economy — Zero Emissions, Pure Usage
            </h2>
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed max-w-3xl mx-auto">
              Usage generates ETH fees → routed through the Liquidity Engine → deepens liquidity → drives more usage.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-8 text-center hover:border-[hsl(var(--ethblox-green))] transition-all">
              <div className="text-6xl font-heading font-bold text-[hsl(var(--ethblox-green))] mb-2">50%</div>
              <h3 className="font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-2">Mould Creator</h3>
              <p className="text-sm text-[hsl(var(--ethblox-text-secondary))]">Perpetual royalties</p>
            </Card>

            <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-8 text-center hover:border-[hsl(var(--ethblox-green))] transition-all">
              <div className="text-6xl font-heading font-bold text-[hsl(var(--ethblox-blue))] mb-2">30%</div>
              <h3 className="font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-2">
                Protocol Liquidity
              </h3>
              <p className="text-sm text-[hsl(var(--ethblox-text-secondary))]">Owned by protocol</p>
            </Card>

            <Card className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-8 text-center hover:border-[hsl(var(--ethblox-green))] transition-all">
              <div className="text-6xl font-heading font-bold text-[hsl(var(--ethblox-yellow))] mb-2">20%</div>
              <h3 className="font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-2">Treasury</h3>
              <p className="text-sm text-[hsl(var(--ethblox-text-secondary))]">Growth & grants</p>
            </Card>
          </div>

          <p className="text-center text-lg text-[hsl(var(--ethblox-text-secondary))]">
            No inflation. No farming. Culture powers the economy.
          </p>
        </section>

        {/* AI-Native Builders Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-4">
              AI-Native Builders: Legoman Agents Arrive
            </h2>
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed max-w-3xl mx-auto">
              ETHBLOX becomes a collaborative sculpting field where intelligent agents co-create with humans in real
              time.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              "Generate builds",
              "Remix human creations",
              "Optimize Builder Weight",
              "Arbitrage mould curves",
              "Execute creative jobs",
              "Co-create with humans",
            ].map((capability) => (
              <Card
                key={capability}
                className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-6 hover:border-[hsl(var(--ethblox-green))] transition-all"
              >
                <p className="text-[hsl(var(--ethblox-text-primary))]">{capability}</p>
              </Card>
            ))}
          </div>

          <p className="text-center text-lg text-[hsl(var(--ethblox-text-secondary))] mt-12">
            A living ecology of human + AI creativity.
          </p>
        </section>

        {/* API Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-4">
              ETHBLOX API — A Playground for Quantitative Creativity
            </h2>
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed max-w-3xl mx-auto">
              Where DeFi sensibilities meet digital craftsmanship.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              "Mould & licence arbitrage",
              "Discovering undervalued BUILDS",
              "Build-based trading strategies",
              "AI-driven creative jobs",
              "Simulation-based workflows",
              "Real-time market analysis",
            ].map((feature) => (
              <Card
                key={feature}
                className="bg-[hsl(var(--ethblox-surface))] border-[hsl(var(--ethblox-border))] p-6 hover:border-[hsl(var(--ethblox-green))] transition-all"
              >
                <p className="text-[hsl(var(--ethblox-text-primary))]">{feature}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="container mx-auto px-6 max-w-[1800px] py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-[hsl(var(--ethblox-text-primary))] mb-6">
              Why Now?
            </h2>
            <p className="text-lg text-[hsl(var(--ethblox-text-secondary))] leading-relaxed mb-8">
              Ethereum needs a new artistic language — simple, expressive, economically alive. A toy with gravitas. A
              protocol with delight. ETHBLOX becomes the creative furnace of Ethereum's next cultural cycle.
            </p>
            <Button
              asChild
              className="bg-[hsl(var(--ethblox-yellow))] text-[hsl(var(--ethblox-bg))] hover:bg-[hsl(var(--ethblox-yellow))]/90 font-heading text-lg"
              size="lg"
            >
              <Link href="/build">START BUILDING</Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
