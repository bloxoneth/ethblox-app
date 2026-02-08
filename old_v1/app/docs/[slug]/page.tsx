import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { DocsNav } from "@/components/docs-nav"
import { notFound } from "next/navigation"
import { getDocContent } from "@/lib/docs"

export async function generateStaticParams() {
  return [
    { slug: "overview" },
    { slug: "protocol" },
    { slug: "building" },
    { slug: "tokenomics" },
    { slug: "gameplay" },
    { slug: "smart-contracts" },
    { slug: "api" },
    { slug: "faq" },
    { slug: "changelog" },
  ]
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const content = getDocContent(slug)

  if (!content) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--ethblox-bg))]">
      <SiteHeader />

      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-12">
            <DocsNav />

            <article className="max-w-3xl prose prose-invert prose-headings:font-heading prose-headings:text-[hsl(var(--ethblox-accent-yellow))] prose-p:text-[hsl(var(--ethblox-text-secondary))] prose-a:text-[hsl(var(--ethblox-accent-cyan))] prose-a:no-underline hover:prose-a:underline prose-code:text-[hsl(var(--ethblox-accent-green))] prose-pre:bg-[hsl(var(--ethblox-surface))] prose-pre:border prose-pre:border-[hsl(var(--ethblox-border))]">
              {content}
            </article>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
