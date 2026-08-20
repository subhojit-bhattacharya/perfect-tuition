// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// `trailingSlash: 'always'` with `format: 'directory'` matches what GitHub Pages
// serves natively, so no page ever 301s to itself. Canonicals are absolute at
// the apex; `www` -> apex is a 301 issued by GitHub Pages (the repo's custom
// domain is set to the apex), not by Cloudflare — Redirect Rules would need a
// proxied record and both host records are deliberately grey-clouded.
export default defineConfig({
  site: "https://perfect-tuition.co.in",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
