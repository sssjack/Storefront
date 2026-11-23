import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Award,
} from 'lucide-react';
import type { PageBlock, Category, Product, Article, HeroSlide } from '../../types';
import { ProductCard } from './ProductCard';

interface BlockRendererProps {
  blocks: PageBlock[];
  categories: Category[];
  products: Product[];
  articles: Article[];
}

export function BlockRenderer({ blocks, categories, products, articles }: BlockRendererProps) {
  return (
    <div className="space-y-12 md:space-y-16">
      {blocks
        .filter((b) => b.visible !== false)
        .map((block) => {
          switch (block.type) {
            case 'hero_slider':
              return <HeroSliderBlock key={block.id} props={block.props} />;
            case 'category_grid':
              return <CategoryGridBlock key={block.id} props={block.props} categories={categories} />;
            case 'product_showcase':
              return (
                <ProductShowcaseBlock
                  key={block.id}
                  props={block.props}
                  categories={categories}
                  products={products}
                />
              );
            case 'promo_banner':
              return <PromoBannerBlock key={block.id} props={block.props} />;
            case 'editorial_grid':
              return <EditorialGridBlock key={block.id} props={block.props} articles={articles} />;
            case 'brand_story':
              return <BrandStoryBlock key={block.id} props={block.props} />;
            case 'trust_badges':
              return <TrustBadgesBlock key={block.id} props={block.props} />;
            default:
              return null;
          }
        })}
    </div>
  );
}

/* 1. Featured Collection Split-Card Hero (Exact StampsBox #17263b Editorial Rail) */
function HeroSliderBlock({ props }: { props: Record<string, any> }) {
  const slides: HeroSlide[] =
    Array.isArray(props.slides) && props.slides.length
      ? props.slides
      : [
          {
            id: 'default-1',
            tabLabel: 'US Flag Stamps',
            title: 'US FLAG STAMPS',
            subtitle: 'Authentic USPS First-Class Forever® coils & booklets.',
            ctaText: 'Shop collection',
            ctaLink: '/shop',
            imageUrl: '/uploads/seed/hero-flag.png',
          },
        ];

  const [activeIdx, setActiveIdx] = useState(0);
  const autoplayMs = Number(props.autoplayMs || 6500);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((i) => (i + 1) % slides.length);
    }, autoplayMs);
    return () => clearInterval(timer);
  }, [slides.length, autoplayMs]);

  const current = slides[activeIdx % slides.length];

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-6 pt-5">
      <div className="rounded-[10px] overflow-hidden shadow-xs border border-[#ebebeb]">
        {/* Top Photography Stage */}
        <div className="relative h-[280px] sm:h-[340px] md:h-[410px] bg-[#edf0f2] overflow-hidden">
          {slides.map((s, idx) => (
            <img
              key={s.id || idx}
              src={s.imageUrl || '/uploads/seed/hero-flag.png'}
              alt={s.title}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
                idx === activeIdx
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-105 pointer-events-none'
              }`}
            />
          ))}
        </div>

        {/* Bottom Deep Navy Editorial Rail (#17263b) */}
        <div className="bg-[#17263b] text-white px-6 md:px-10 py-6 md:py-7 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_auto] gap-6 items-center">
          {/* Kicker + Georgia Serif H1 + Subtitle + Shop Link */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f18585]">
              {props.kicker || 'FEATURED COLLECTION'}
            </p>
            <h1 className="font-editorial text-[28px] md:text-[38px] font-normal tracking-[-0.03em] leading-[1.08] mt-1.5">
              {current.title}
            </h1>
            <p className="text-[13.5px] text-white/70 mt-2 max-w-xl leading-relaxed">
              {current.subtitle}
            </p>
            <Link
              to={current.ctaLink || '/shop'}
              className="inline-flex items-center gap-2 text-[13.5px] font-medium text-white hover:text-[#f18585] mt-3.5 transition-colors"
            >
              <span>{current.ctaText || 'Shop collection'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Interactive Collection Tabs with bottom progress bar */}
          <div className="flex flex-wrap lg:flex-nowrap gap-4 lg:gap-6">
            {slides.map((s, idx) => {
              const isActive = idx === activeIdx;
              return (
                <button
                  key={s.id || idx}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className="text-left group cursor-pointer flex-1 min-w-[100px]"
                >
                  <span
                    className={`block text-[12.5px] font-medium pb-2 transition-colors ${
                      isActive ? 'text-white' : 'text-white/55 group-hover:text-white/85'
                    }`}
                  >
                    {s.tabLabel || s.title}
                  </span>
                  <div className="h-[2px] w-full bg-white/20 overflow-hidden rounded-full">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isActive ? 'w-full bg-[#f18585]' : 'w-0 bg-white'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Prev / Next square outline buttons */}
          {slides.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveIdx((i) => (i - 1 + slides.length) % slides.length)}
                className="w-10 h-10 rounded-[6px] border border-white/25 hover:border-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Previous slide"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveIdx((i) => (i + 1) % slides.length)}
                className="w-10 h-10 rounded-[6px] border border-white/25 hover:border-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Next slide"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* 2. Shop by Category Grid */
function CategoryGridBlock({
  props,
  categories,
}: {
  props: Record<string, any>;
  categories: Category[];
}) {
  const maxItems = Number(props.maxItems || 8);
  const cols = Number(props.columns || 4);
  const items = categories.slice(0, maxItems);

  const gridClass =
    cols === 3
      ? 'grid-cols-2 md:grid-cols-3'
      : cols === 5
        ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
        : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <section className="max-w-[1240px] mx-auto px-4 md:px-6">
      <div className="text-center mb-8">
        <h2 className="text-[24px] md:text-[26px] font-medium text-[#1a1a1a]">
          {props.heading || 'Shop by Category'}
        </h2>
        {props.subheading && (
          <p className="text-[14px] text-[#666] mt-1.5">{props.subheading}</p>
        )}
      </div>

      <div className={`grid ${gridClass} gap-5 md:gap-7`}>
        {items.map((cat) => (
          <Link
            key={cat.id}
            to={`/collections/${cat.slug}`}
            className="group flex flex-col items-center text-center"
          >
            <div className="w-[88%] aspect-square rounded-[12px] overflow-hidden bg-[#f5f5f5] border border-[#ededed]">
              <img
                src={cat.imageUrl || '/uploads/seed/prod-us-flag-roll.png'}
                alt={cat.name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <h3 className="mt-3 text-[14.5px] md:text-[15px] font-semibold text-[#1a1a1a] group-hover:text-[#db1215] transition-colors">
              {cat.name}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* 3. Interactive Filterable Product Showcase */
function ProductShowcaseBlock({
  props,
  categories,
  products,
}: {
  props: Record<string, any>;
  categories: Category[];
  products: Product[];
}) {
  const [activeFilter, setActiveFilter] = useState<string>(props.defaultFilter || 'bestseller');
  const maxItems = Number(props.maxItems || 10);
  const cols = Number(props.columns || 5);

  const filtered = products
    .filter((p) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'bestseller') return p.isBestseller;
      return p.categorySlug === activeFilter;
    })
    .slice(0, maxItems);

  const gridColsClass =
    cols === 4
      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
      : cols === 3
        ? 'grid-cols-2 md:grid-cols-3'
        : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

  return (
    <section className="max-w-[1320px] mx-auto px-4 md:px-6">
      {props.heading && (
        <h2 className="text-[24px] md:text-[26px] font-medium text-[#1a1a1a] text-center mb-6">
          {props.heading}
        </h2>
      )}

      {/* Pill Filter Row */}
      {props.showFilterPills !== false && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-7">
          {[
            { key: 'all', label: 'All' },
            { key: 'bestseller', label: 'Best Seller' },
            ...categories.map((c) => ({ key: c.slug, label: c.name })),
          ].map((pill) => {
            const active = activeFilter === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setActiveFilter(pill.key)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium border transition-colors cursor-pointer ${
                  active
                    ? 'border-[#f04444] text-[#f04444] bg-[#fff5f5]'
                    : 'border-[#e5e5e5] text-[#444] bg-white hover:border-[#f04444] hover:text-[#f04444]'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[#888] text-[14px] border border-dashed border-[#e5e5e5] rounded-[10px]">
          No published stamps in this filter yet.
        </div>
      ) : (
        <div className={`grid ${gridColsClass} gap-3 md:gap-4`}>
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {/* Centered VIEW ALL CTA */}
      {props.ctaText && (
        <div className="text-center mt-9">
          <Link
            to={props.ctaLink || '/shop'}
            className="inline-block bg-[#1a1a1a] hover:bg-[#f04444] text-white text-[13px] font-semibold uppercase tracking-[0.06em] px-10 py-3 rounded-[6px] transition-all hover:-translate-y-0.5"
          >
            {props.ctaText}
          </Link>
        </div>
      )}
    </section>
  );
}

/* 4. Promotional Banner Block (Addable in Drag-and-Drop Builder) */
function PromoBannerBlock({ props }: { props: Record<string, any> }) {
  const bg = props.bgColor || '#17263b';
  const accent = props.accentColor || '#f04444';

  return (
    <section className="max-w-[1280px] mx-auto px-4 md:px-6">
      <div
        style={{ backgroundColor: bg }}
        className="rounded-[12px] px-7 py-9 md:px-12 md:py-11 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="max-w-2xl">
          {props.badge && (
            <span
              style={{ backgroundColor: accent }}
              className="inline-block text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3"
            >
              {props.badge}
            </span>
          )}
          <h2 className="font-editorial text-[26px] md:text-[32px] leading-tight">
            {props.title || 'Save More on Bulk Coil Rolls & Office Orders'}
          </h2>
          {props.subtitle && (
            <p className="text-[14px] text-white/75 mt-2 leading-relaxed">{props.subtitle}</p>
          )}
        </div>
        <Link
          to={props.ctaLink || '/shop'}
          className="px-7 py-3 rounded-[6px] bg-white text-[#17263b] hover:bg-[#f04444] hover:text-white text-[13px] font-semibold uppercase tracking-wider transition-colors shrink-0"
        >
          {props.ctaText || 'Shop Bulk Deals'}
        </Link>
      </div>
    </section>
  );
}

/* 5. Editorial / Stamp Guide Grid */
function EditorialGridBlock({
  props,
  articles,
}: {
  props: Record<string, any>;
  articles: Article[];
}) {
  const maxItems = Number(props.maxItems || 3);
  const shown = articles.slice(0, maxItems);
  if (shown.length === 0) return null;

  return (
    <section className="max-w-[1240px] mx-auto px-4 md:px-6">
      <h2 className="text-[24px] md:text-[26px] font-medium text-[#1a1a1a] text-center mb-8">
        {props.heading || 'Order Postage Stamps Online with Ease'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {shown.map((art) => (
          <Link key={art.id} to={`/blog/${art.slug}`} className="group block">
            <div className="aspect-[3/2] rounded-[8px] overflow-hidden bg-[#f5f5f5] border border-[#ededed]">
              <img
                src={art.cover_image || '/uploads/seed/hero-flag.png'}
                alt={art.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <h3 className="mt-3.5 text-[16px] font-medium text-[#1a1a1a] group-hover:text-[#db1215] leading-snug transition-colors">
              {art.title}
            </h3>
            <p className="text-[13px] text-[#666] mt-1.5 line-clamp-2 leading-relaxed">
              {art.excerpt}
            </p>
            <span className="inline-flex items-center gap-1 mt-2.5 text-[13px] font-medium text-[#1a1a1a] underline underline-offset-4 group-hover:text-[#db1215]">
              {props.ctaText || 'Read more'}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* 6. Brand Story / Trust SEO Block (820px centered) */
function BrandStoryBlock({ props }: { props: Record<string, any> }) {
  const paragraphs: string[] = Array.isArray(props.paragraphs)
    ? props.paragraphs
    : [String(props.body || '')].filter(Boolean);

  return (
    <section className="max-w-[820px] mx-auto px-5 text-center pt-2">
      <h2 className="text-[24px] md:text-[26px] font-medium text-[#1a1a1a]">
        {props.heading || 'Buy Stamps Online from a Trusted US Stamp Store'}
      </h2>
      <div className="mt-5 space-y-4 text-[14.5px] md:text-[15px] text-[#666666] leading-[1.8]">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {props.ctaText && (
        <div className="mt-7">
          <Link
            to={props.ctaLink || '/about'}
            className="inline-block bg-[#1a1a1a] hover:bg-[#f04444] text-white text-[13px] font-semibold uppercase tracking-[0.06em] px-8 py-2.5 rounded-[6px] transition-colors"
          >
            {props.ctaText}
          </Link>
        </div>
      )}
    </section>
  );
}

/* 7. Trust Badges / Value Props Row (Addable in Drag-and-Drop Builder) */
function TrustBadgesBlock({ props }: { props: Record<string, any> }) {
  const items = props.items || [
    { icon: 'truck', title: 'Fast US Delivery', desc: '1–5 business days via First-Class Mail' },
    { icon: 'shield', title: '100% Authentic Postage', desc: 'Genuine USPS Forever® valid stamps' },
    { icon: 'return', title: '30-Day Returns', desc: 'Hassle-free returns in original condition' },
    { icon: 'award', title: 'Trusted by 12,000+', desc: 'Homes, weddings & small businesses' },
  ];

  const getIcon = (name: string) => {
    if (name === 'truck') return <Truck className="w-6 h-6 text-[#17263b]" />;
    if (name === 'return') return <RotateCcw className="w-6 h-6 text-[#17263b]" />;
    if (name === 'award') return <Award className="w-6 h-6 text-[#17263b]" />;
    return <ShieldCheck className="w-6 h-6 text-[#17263b]" />;
  };

  return (
    <section className="max-w-[1240px] mx-auto px-4 md:px-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((it: any, idx: number) => (
          <div
            key={idx}
            className="border border-[#e8e8e8] rounded-[10px] p-5 bg-white flex items-start gap-3.5"
          >
            <div className="w-11 h-11 rounded-[8px] bg-[#f5f7fa] flex items-center justify-center shrink-0">
              {getIcon(it.icon)}
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-[#1a1a1a]">{it.title}</h3>
              <p className="text-[12.5px] text-[#666] mt-0.5 leading-snug">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
