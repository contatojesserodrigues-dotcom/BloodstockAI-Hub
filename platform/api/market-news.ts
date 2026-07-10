import { fetchMarketNews } from "../server/market-news.js";

export default async function handler(_req: unknown, res: {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
}) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Cache-Control", "public, max-age=600");

  try {
    const payload = await fetchMarketNews(process.env.TAVILY_API_KEY);
    return res.status(200).json(payload);
  } catch (error) {
    console.error("[api/market-news]", error);
    return res.status(500).json({
      articles: [],
      error: "Service temporarily unavailable.",
    });
  }
}
