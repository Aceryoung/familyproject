import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'grhztxlllhbbwjsaobhe.supabase.co',
        port: '',
        pathname: '/storage/v1/object/sign/archive_images/**',
      },
      {
          protocol: 'https',
          hostname: 'grhztxlllhbbwjsaobhe.supabase.co',
          port: '',
          pathname: '/storage/v1/object/public/archive_images/**',
      },
    ],
  },
};

export default nextConfig;
