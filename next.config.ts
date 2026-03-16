import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    serverActions: {
      // Aumentiamo il limite predefinito di 1MB per permettere
      // foto (compresse) e firme in base64 negli interventi/manutenzioni
      bodySizeLimit: "20mb",
    },
    // Evita di includere Prisma nel bundle delle serverless function (supera 2GB su Vercel)
    serverComponentsExternalPackages: ["prisma", "@prisma/client"],
  },
  // Escludi dal trace delle function: file .db e cartella public (evita bundle da 2GB+)
  outputFileTracingExcludes: {
    "*": [
      "./prisma/*.db",
      "./prisma/*.db-journal",
      "./**/*.db",
      "./**/*.db-journal",
      "./public/**",
    ],
  },
} as NextConfig;

export default nextConfig;
