/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a second server (e.g. a production preview) use its own build folder
  // instead of fighting a running `next dev` over .next
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
