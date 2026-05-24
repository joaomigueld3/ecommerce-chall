/** @type {import('next').NextConfig} */
const nextConfig = {
  // The repository root has its own package-lock.json (the backend); pin file
  // tracing to the frontend so Next does not treat the monorepo root as the app root.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
