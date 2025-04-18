import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "m.media-amazon.com",
      "image.tmdb.org",
      "www.themoviedb.org",
      "ia.media-imdb.com",
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
