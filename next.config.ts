import type { NextConfig } from 'next'

const remotePatterns: NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> = [
  { protocol: 'https', hostname: '*.supabase.co' },
  { protocol: 'https', hostname: 'images.unsplash.com' },
]

// Product images uploaded via the admin panel — only added once the bucket is configured.
if (process.env.AWS_S3_BUCKET && process.env.AWS_REGION) {
  remotePatterns.push({
    protocol: 'https',
    hostname: `${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`,
  })
}

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns,
  },
}

export default nextConfig
