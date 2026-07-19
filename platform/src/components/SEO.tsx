import { Helmet } from "react-helmet-async";

const SITE = "https://www.agentbloodstockai.com";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article" | "product";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function SEO({ title, description, path, type = "website", jsonLd }: SEOProps) {
  const url = `${SITE}${path}`;
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="icon" type="image/png" sizes="512x512" href="/favicon.png?v=7" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=7" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=7" />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>
      ))}
    </Helmet>
  );
}