/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
              "media-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
              "connect-src 'self' blob:",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
            ].join("; "),
          },
        ],
      },
    ]
  },
}

export default nextConfig
