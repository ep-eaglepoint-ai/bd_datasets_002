/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    hashSalt: 'some-random-hash-salt-value',
  },
}

module.exports = nextConfig
