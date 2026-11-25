import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Stop `next dev` writing AGENTS.md into the project.
  agentRules: false,
};

export default nextConfig;
