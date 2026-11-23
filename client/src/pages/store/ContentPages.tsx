import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, Mail, MapPin, Phone } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import type { Article, FAQItem, CustomPage } from '../../types';

export function BlogPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  useEffect(() => {
    apiRequest<{ items: Article[] }>('/api/articles?limit=30')
      .then((d) => setArticles(d.items))
      .catch(console.error);
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-[32px] font-medium text-[#1a1a1a]">Stamp Guide & Mailing Tips</h1>
        <p className="text-[14px] text-[#666] mt-2">
          Helpful guides on USPS Forever® postage rates, wedding invitation stationery, and bulk
          business mailings.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
        {articles.map((art) => (
          <Link key={art.id} to={`/blog/${art.slug}`} className="group block">
            <div className="aspect-[3/2] rounded-[8px] overflow-hidden bg-[#f5f5f5] border border-[#ededed]">
              <img
                src={art.cover_image || '/uploads/seed/hero-flag.png'}
                alt={art.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[#db1215] mt-3">
              {art.category_tag}
            </p>
            <h2 className="text-[17px] font-medium text-[#1a1a1a] group-hover:text-[#db1215] mt-1 leading-snug">
              {art.title}
            </h2>
            <p className="text-[13.5px] text-[#666] mt-1.5 line-clamp-2">{art.excerpt}</p>
            <span className="inline-flex items-center gap-1 mt-2.5 text-[13px] font-medium underline underline-offset-4">
              Read more <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ArticleDetailPage() {
  const { slug } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  useEffect(() => {
    apiRequest<{ article: Article }>(`/api/articles/${slug}`)
      .then((d) => setArticle(d.article))
      .catch(() => setArticle(null));
  }, [slug]);

  if (!article) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-20 text-center">
        <h1 className="text-2xl font-medium">Article not found</h1>
        <Link to="/blog" className="inline-block mt-4 underline text-sm">
          Back to Stamp Guide
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-5 py-12">
      <Link to="/blog" className="text-[13px] text-[#888] hover:text-[#1a1a1a]">
        ← Back to Stamp Guide
      </Link>
      <p className="text-[11.5px] font-semibold uppercase tracking-widest text-[#db1215] mt-4">
        {article.category_tag}
      </p>
      <h1 className="font-editorial text-[32px] md:text-[38px] text-[#1a1a1a] mt-2 leading-tight">
        {article.title}
      </h1>
      {article.cover_image && (
        <img
          src={article.cover_image}
          alt={article.title}
          className="w-full aspect-[16/9] object-cover rounded-[10px] my-7 border border-[#ededed]"
        />
      )}
      <div className="space-y-5 text-[15.5px] text-[#444] leading-[1.9]">
        {article.content.split('\n\n').map((p, idx) => (
          <p key={idx}>{p}</p>
        ))}
      </div>
    </article>
  );
}

export function FaqPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    apiRequest<{ items: FAQItem[] }>('/api/faqs')
      .then((d) => {
        setFaqs(d.items);
        if (d.items[0]) setOpenId(d.items[0].id);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <div className="text-center mb-10">
        <h1 className="text-[32px] font-medium text-[#1a1a1a]">Frequently Asked Questions</h1>
        <p className="text-[14px] text-[#666] mt-2">
          Everything you need to know about our Forever® stamps, shipping, and PayPal checkout.
        </p>
      </div>
      <div className="divide-y divide-[#e8e8e8] border-y border-[#e8e8e8]">
        {faqs.map((f) => {
          const isOpen = openId === f.id;
          return (
            <div key={f.id} className="py-4">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : f.id)}
                className="w-full flex items-center justify-between gap-4 text-left cursor-pointer"
              >
                <span className="text-[15.5px] font-medium text-[#1a1a1a]">{f.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-[#666] shrink-0 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <p className="mt-3 text-[14px] text-[#666] leading-relaxed pr-6">{f.answer}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CustomPageView({ defaultSlug }: { defaultSlug?: string }) {
  const params = useParams();
  const slug = defaultSlug || params.slug || '';
  const [page, setPage] = useState<CustomPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest<{ page: CustomPage }>(`/api/pages/${encodeURIComponent(slug)}`)
      .then((d) => {
        if (active) setPage(d.page);
      })
      .catch(() => {
        if (active) setPage(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 space-y-4 animate-pulse">
        <div className="h-8 bg-[#f5f5f5] rounded w-2/3 mx-auto" />
        <div className="h-4 bg-[#f5f5f5] rounded w-full" />
        <div className="h-4 bg-[#f5f5f5] rounded w-5/6" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-20 text-center">
        <h1 className="text-2xl font-medium text-[#1a1a1a]">Page Not Found</h1>
        <p className="text-[14px] text-[#666] mt-2">This page is unpublished or does not exist.</p>
        <Link
          to="/"
          className="inline-block mt-5 px-6 py-2.5 rounded-[6px] bg-[#1a1a1a] text-white text-[13px] font-semibold"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const blocks = (page.content || '').split(/\n\s*\n/).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto px-5 py-14 space-y-6">
      <div className="text-center space-y-2.5">
        {page.kicker && (
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#db1215]">
            {page.kicker}
          </p>
        )}
        <h1 className="font-editorial text-[32px] md:text-[38px] text-[#1a1a1a] leading-tight">
          {page.title}
        </h1>
        {page.subtitle && (
          <p className="text-[15px] text-[#666] max-w-2xl mx-auto leading-relaxed">
            {page.subtitle}
          </p>
        )}
      </div>

      {page.coverImage && (
        <img
          src={page.coverImage}
          alt={page.title}
          className="w-full aspect-[16/9] object-cover rounded-[10px] border border-[#ededed]"
        />
      )}

      <div className="space-y-4 text-[15px] text-[#444] leading-[1.9] pt-2">
        {blocks.map((block, idx) => {
          const trimmed = block.trim();
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-[20px] font-semibold text-[#17263b] pt-3">
                {trimmed.slice(3)}
              </h2>
            );
          }
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-[17px] font-semibold text-[#1a1a1a] pt-2">
                {trimmed.slice(4)}
              </h3>
            );
          }
          return (
            <p key={idx} className="whitespace-pre-line">
              {trimmed}
            </p>
          );
        })}
      </div>

      {page.ctaText && (
        <div className="pt-5 text-center">
          <Link
            to={page.ctaLink || '/shop'}
            className="inline-block px-8 py-3 rounded-[6px] bg-[#1a1a1a] hover:bg-[#f04444] text-white text-[13px] font-semibold uppercase tracking-wider transition-colors"
          >
            {page.ctaText}
          </Link>
        </div>
      )}
    </div>
  );
}

export function AboutPage() {
  return <CustomPageView defaultSlug="about" />;
}

export function ContactPage() {
  const { store, showToast } = useStore();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/inquiries', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm({ name: '', email: '', subject: '', message: '' });
      showToast(res.message);
    } catch (err: any) {
      showToast(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-5 py-12 grid grid-cols-1 md:grid-cols-2 gap-10">
      <div>
        <h1 className="text-[30px] font-medium text-[#1a1a1a]">Contact Us</h1>
        <p className="text-[14px] text-[#666] mt-2 leading-relaxed">
          Have questions about bulk coil roll orders, shipping status, or stamp availability? Send us
          a message and our support team will reply within 1 business day.
        </p>
        <div className="mt-7 space-y-4 text-[14px] text-[#333]">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#17263b] shrink-0 mt-0.5" />
            <span>{store?.address}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-[#17263b] shrink-0" />
            <span>{store?.email}</span>
          </div>
          {store?.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-[#17263b] shrink-0" />
              <span>{store.phone}</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border border-[#e8e8e8] rounded-[10px] p-6 space-y-4">
        <input
          type="text"
          required
          placeholder="Your Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
        />
        <input
          type="email"
          required
          placeholder="Email Address"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
        />
        <input
          type="text"
          placeholder="Subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
        />
        <textarea
          required
          rows={4}
          placeholder="How can we help?"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
        />
        <button
          type="submit"
          disabled={sending}
          className="w-full py-3 rounded-[6px] bg-[#1a1a1a] hover:bg-[#f04444] text-white text-[14px] font-semibold cursor-pointer"
        >
          {sending ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
}

export function PoliciesPage() {
  return <CustomPageView defaultSlug="policies" />;
}
