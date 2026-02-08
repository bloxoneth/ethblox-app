import BuildClientV2 from "@/components/buildv2/BuildClientV2"
import { SiteHeader } from "@/components/site-header"

export default function BuildV2Page() {
  return (
    <div className="h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 min-h-0">
        <BuildClientV2 />
      </div>
    </div>
  )
}
