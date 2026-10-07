import { defineConfig } from "@playwright/test";

// Suite SEO on-page (oct. 2026) : crawl du build de production local, servi
// en memoire (tests/seo/in-process-server.ts), sans ouvrir de port.
// Prerequis : un build de production a jour (pnpm build ou
// npx next build --webpack).
export default defineConfig({
  testDir: ".",
  testMatch: /(seo-onpage|redirects|robots|budget|listing-seo|blog-covers)\.spec\.ts$/,
  timeout: 30 * 60 * 1000,
  workers: 1,
  reporter: [["list"]],
  outputDir: "../../qa-reports/seo-onpage/artifacts",
});
