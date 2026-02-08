import BuildClient from "@/components/build/BuildClient"
import { SiteHeader } from "@/components/site-header"

export default function BuildPage() {
  return (
    <div className="h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 min-h-0">
        <BuildClient />
      </div>
    </div>
  )
}
