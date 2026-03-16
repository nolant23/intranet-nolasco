import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Aumentiamo il limite predefinito di 1MB per permettere
      // foto (compresse) e firme in base64 negli interventi/manutenzioni
      bodySizeLimit: "20mb",
    },
    // Evita di includere Prisma nel bundle delle serverless function (supera 2GB su Vercel)
    serverComponentsExternalPackages: ["prisma", "@prisma/client"],
  },
};

export default nextConfig;
