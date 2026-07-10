import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import { fetchMarketNews } from "./server/market-news";

function marketNewsDevApi(): Plugin {
  return {
    name: "market-news-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/market-news", async (_req, res) => {
        try {
          const payload = await fetchMarketNews(process.env.TAVILY_API_KEY);
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "public, max-age=600");
          res.end(JSON.stringify(payload));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ articles: [], error: "Service temporarily unavailable." }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "development" && marketNewsDevApi(),
    mcpPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query"],
  },
}));
