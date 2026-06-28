/** @type {import('next').NextConfig} */

// Security headers — فاز ۱۵
const securityHeaders = [
  // XSS Protection
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Prevent MIME type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer policy
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Permissions policy
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  // Strict Transport Security (فقط production)
  ...(process.env.NODE_ENV === 'production'
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig = {
  reactStrictMode: true,

  // ⛔ مرحله‌ی «Linting and checking validity of types» داخل `next build` روی
  // builder محدود Liara بیش از ۲۰ دقیقه طول می‌کشد و timeout می‌شود.
  // این چک‌ها در GitHub Actions (قبل از deploy) با `tsc --noEmit` + `vitest`
  // اجرا می‌شوند — پس داخل build تکراری و حذف‌شدنی هستند.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Security headers روی همه routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  experimental: {
    serverComponentsExternalPackages: ['postgres', 'bcryptjs'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
