import BuildClientV2 from "@/components/buildv2/BuildClientV2"
import { SiteHeader } from "@/components/site-header"

export default async function BuildV2Page({
  searchParams,
}: {
  searchParams: Promise<{ load?: string }>
}) {
  const params = await searchParams
  const loadBuildId = params.load || null

  return (
    <div className="h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 min-h-0">
        <BuildClientV2 loadBuildId={loadBuildId} />
      </div>
    </div>
  )
}
