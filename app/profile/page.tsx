import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import ProfileRedirect from "@/components/profile/ProfileRedirect"

export const metadata = {
  title: "Profile | ETHBLOX",
  description: "View and manage your ETHBLOX builder profile",
}

export default function ProfilePage() {
  return (
    <>
      <SiteHeader />
      <main className="pt-16">
        <ProfileRedirect />
      </main>
      <SiteFooter />
    </>
  )
}
