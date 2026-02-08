"use client"

export function HeroVideo() {
  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      className="w-full h-full object-cover"
      style={{ playbackRate: 2 }}
      onLoadedMetadata={(e) => {
        const video = e.currentTarget
        video.playbackRate = 2
      }}
    >
      <source src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/GM-TWKitANx14UZ0u5CBiC8sFkBNtQc0G.mp4" type="video/mp4" />
    </video>
  )
}
