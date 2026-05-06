import { Link, Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Calendar, ArrowRight, Tag } from "lucide-react";
import { getPostBySlug, POSTS } from "@/lib/blog";
import SEO from "@/components/SEO";

/**
 * /blog/:slug — Pàgina d'article individual.
 * Renderitza el component associat al slug i injecta SEO + JSON-LD Article.
 */

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = getPostBySlug(slug);

  if (!post) return <Navigate to="/blog" replace />;

  const Article = post.Component;
  const others = POSTS.filter(p => p.slug !== post.slug);
  const postUrl = `https://cbgrupbarna-3x3timechamber.com/blog/${post.slug}`;
  const coverAbs = post.cover.startsWith("http") ? post.cover : `https://cbgrupbarna-3x3timechamber.com${post.cover}`;
  const publishedISO = new Date(post.date).toISOString();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": postUrl,
    },
    "headline": post.title,
    "description": post.excerpt,
    "image": coverAbs,
    "datePublished": post.date,
    "dateModified": post.date,
    "author": {
      "@type": "Organization",
      "name": "CB Grup Barna",
      "url": "https://cbgrupbarna-3x3timechamber.com/sobre-nosaltres",
    },
    "publisher": {
      "@type": "SportsOrganization",
      "name": "CB Grup Barna · Time Chamber · Eix Clot",
      "logo": {
        "@type": "ImageObject",
        "url": "https://cbgrupbarna-3x3timechamber.com/cb-grup-barna-logo-512.png",
      },
    },
    "keywords": post.tags.join(", "),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inici", "item": "https://cbgrupbarna-3x3timechamber.com/" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://cbgrupbarna-3x3timechamber.com/blog" },
      { "@type": "ListItem", "position": 3, "name": post.title, "item": postUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <SEO
        title={`${post.title} · Blog 3×3 Westfield Glòries`}
        description={post.excerpt}
        path={`/blog/${post.slug}`}
        ogImage={coverAbs}
        ogType="article"
        articleMeta={{
          publishedTime: publishedISO,
          modifiedTime: publishedISO,
          author: "CB Grup Barna · Time Chamber",
          section: "Bàsquet 3×3",
          tags: post.tags,
        }}
        jsonLd={[articleJsonLd, breadcrumbJsonLd]}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/10 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Header */}
      <div className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/blog" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Tots els articles</span>
          </Link>
          <span className="text-sm font-black font-mono text-red-500 tracking-widest hidden sm:block">BLOG</span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0">
          <img src={post.cover} alt="" loading="eager" decoding="async"
            className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40"/>
        </div>
        <div className="relative container mx-auto px-4 py-16 sm:py-24 max-w-3xl">
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-white/65 font-bold mb-4">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> {formatDate(post.date)}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {post.readingMinutes} min de lectura</span>
            </div>
            <h1 className="font-black text-3xl sm:text-5xl uppercase leading-tight mb-4" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
              {post.title}
            </h1>
            <p className="text-base sm:text-lg text-white/75 leading-relaxed max-w-2xl">{post.excerpt}</p>
            <div className="flex flex-wrap gap-1.5 mt-5">
              {post.tags.map(t => (
                <span key={t} className="text-[10px] uppercase tracking-wider font-bold bg-white/10 text-white/70 border border-white/15 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Tag className="w-3 h-3"/> {t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Body */}
      <article className="container mx-auto px-4 py-12 max-w-3xl relative">
        <div className="prose prose-invert prose-headings:font-black prose-headings:tracking-tight prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-2xl sm:prose-h2:text-3xl prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2 prose-p:text-white/75 prose-p:leading-relaxed prose-strong:text-white prose-li:text-white/75 prose-li:leading-relaxed prose-a:text-red-300 prose-a:no-underline hover:prose-a:underline max-w-none">
          <Article />
        </div>

        {/* Cross-links */}
        <div className="mt-16 pt-10 border-t border-white/10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-400 mb-5">Continua llegint</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {others.map(p => (
              <Link key={p.slug} to={`/blog/${p.slug}`}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/40 rounded-2xl p-4 transition-colors group">
                <p className="text-[10px] uppercase tracking-wider font-bold text-white/40 mb-1">Article relacionat</p>
                <p className="font-bold text-white group-hover:text-red-300 mb-1 leading-tight">{p.title}</p>
                <p className="text-xs text-white/55 line-clamp-2">{p.excerpt}</p>
                <span className="text-[11px] font-bold text-red-300 mt-2 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Llegir <ArrowRight className="w-3 h-3"/>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const meses = ["", "Gener","Febrer","Març","Abril","Maig","Juny","Juliol","Agost","Setembre","Octubre","Novembre","Desembre"];
  return `${parseInt(d, 10)} ${meses[parseInt(m, 10)]} ${y}`;
}
