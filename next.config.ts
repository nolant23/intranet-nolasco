import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Aumentiamo il limite predefinito di 1MB per permettere
      // foto (compresse) e firme in base64 negli interventi/manutenzioni
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
