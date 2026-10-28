import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { ARCHETYPES } from "@/data/archetypes";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticPaths = ["/", "/archetypes", "/quiz", "/teams", "/methodology", "/pricing", "/about", "/research"];
        const dynamicPaths = ARCHETYPES.map((a) => `/archetypes/${a.slug}`);
        const paths = [...staticPaths, ...dynamicPaths];

        const urls = paths
          .map(
            (p) =>
              `  <url><loc>${BASE_URL}${p}</loc><changefreq>weekly</changefreq></url>`,
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
