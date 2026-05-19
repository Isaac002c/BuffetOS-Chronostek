/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        // Proxy para o backend local (porta 5000)
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5000/api/:path*',
      },
      {
        // Proxy para o backend de autenticação (porta 5000)
        source: '/auth/:path*',
        destination: 'http://127.0.0.1:5000/auth/:path*',
      },
      {
        // Proxy para o backend em produção (Render)
        source: '/api-backend/:path*',
        destination: 'https://chronostechcrm.onrender.com/:path*',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              // Adicionado localhost:5000 (porta real do backend)
              "connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 http://localhost:3001 http://127.0.0.1:3001 http://localhost:5000 http://127.0.0.1:5000 https://*.app.github.dev https://crm.chronostek.com.br https://chronostechcrm.onrender.com",
              "frame-ancestors 'none'",
              "object-src 'none'",
            ].join('; '),
          },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;