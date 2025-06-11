import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.themoviedb.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ia.media-imdb.com",
        pathname: "/**",
      },
    ],
  },
  // Chrome uzantılarından kaynaklanan hydration sorunlarını çözer
  compiler: {
    // suppressHydrationWarnings eklenerek öznitelik eşleşmemesi sorunlarını çözer
    styledComponents: true,
    // DOM'daki ek öznitelikleri görmezden gelir
    reactRemoveProperties: true,
  },
  /* config options here */
};

export default nextConfig;
