import { Helmet } from "react-helmet-async";

const SITE_URL = "https://cbgrupbarna-3x3timechamber.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

type Props = {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  ogType?: "website" | "article";
  noindex?: boolean;
  jsonLd?: object | object[];
  articleMeta?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
};

export default function SEO({
  title,
  description,
  path,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noindex = false,
  jsonLd,
  articleMeta,
}: Props) {
  const canonical = `${SITE_URL}${path === "/" ? "/" : path.replace(/\/$/, "")}`;
  const absoluteImage = ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage}`;
  const jsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:image:secure_url" content={absoluteImage} />
      <meta property="og:image:alt" content={title} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />

      {articleMeta?.publishedTime && (
        <meta property="article:published_time" content={articleMeta.publishedTime} />
      )}
      {articleMeta?.modifiedTime && (
        <meta property="article:modified_time" content={articleMeta.modifiedTime} />
      )}
      {articleMeta?.author && <meta property="article:author" content={articleMeta.author} />}
      {articleMeta?.section && <meta property="article:section" content={articleMeta.section} />}
      {articleMeta?.tags?.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}

      {jsonLdArray.map((item, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
}
