import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://www.agentbloodstockai.com";

const entries = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/pricing", changefreq: "monthly", priority: "0.9" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/reports", changefreq: "weekly", priority: "0.8" },
  { path: "/report-templates", changefreq: "monthly", priority: "0.5" },
  { path: "/market-update", changefreq: "weekly", priority: "0.8" },
  { path: "/horses-for-sale", changefreq: "daily", priority: "0.9" },
  { path: "/sales-catalogs", changefreq: "weekly", priority: "0.8" },
  { path: "/advisory", changefreq: "monthly", priority: "0.8" },
  { path: "/services", changefreq: "monthly", priority: "0.6" },
  { path: "/ebook", changefreq: "monthly", priority: "0.6" },
  { path: "/terms", changefreq: "yearly", priority: "0.2" },
  { path: "/privacy", changefreq: "yearly", priority: "0.2" },
];

const urls = entries.map((entry) =>
  [
    "  <url>",
    `    <loc>${BASE_URL}${entry.path}</loc>`,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    "  </url>",
  ].join("\n"),
);

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls,
  "</urlset>",
].join("\n");

writeFileSync(resolve("public/sitemap.xml"), sitemap);
console.log(`sitemap.xml written (${entries.length} entries)`);
