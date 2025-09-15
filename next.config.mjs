/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production-ready configuration
  typescript: {
    // Enable TypeScript error checking during build
    ignoreBuildErrors: false,
  },
  eslint: {
    // Enable ESLint during build for code quality
    ignoreDuringBuilds: false,
  },
  experimental: {
    // Use recommended settings for better performance
    esmExternals: false,
    serverComponentsExternalPackages: ['supabase']
  },
  // Enable additional optimizations
  poweredByHeader: false,
  reactStrictMode: true,
}

export default nextConfig