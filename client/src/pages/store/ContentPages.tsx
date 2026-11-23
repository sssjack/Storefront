import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, Mail, MapPin, Phone } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import type { Article, FAQItem } from '../../types';

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

export function AboutPage() {
  const { store } = useStore();
  return (
    <div className="max-w-3xl mx-auto px-5 py-14 space-y-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#db1215] text-center">
        ABOUT {store?.name || 'STAMPSBOX'}
      </p>
      <h1 className="font-editorial text-[34px] text-center text-[#1a1a1a] leading-tight">
        Trusted Online Destination for Authentic US Forever® Stamps
      </h1>
      <p className="text-[15px] text-[#555] leading-[1.85]">
        Founded to make buying postage online fast, transparent, and enjoyable, {store?.name || 'StampsBox'}{' '}
        serves everyday senders, wedding stationers, collectors, and small businesses across the
        United States. Every booklet, commemorative sheet, and 100-stamp coil roll is carefully
        inspected and shipped directly from our California fulfillment studio.
      </p>
      <p className="text-[15px] text-[#555] leading-[1.85]">
        We back every order with prompt 1–5 day First-Class Mail delivery, free shipping on orders
        over ${Number(store?.freeShippingThreshold ?? 49.99).toFixed(2)}, secure PayPal Buyer
        Protection, and a straightforward 30-day return guarantee.
      </p>
      <div className="pt-4 text-center">
        <Link
          to="/shop"
          className="inline-block px-8 py-3 rounded-[6px] bg-[#1a1a1a] hover:bg-[#f04444] text-white text-[13px] font-semibold uppercase tracking-wider"
        >
          Explore Our Collection
        </Link>
      </div>
    </div>
  );
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
  const { store } = useStore();
  return (
    <div className="max-w-3xl mx-auto px-5 py-12 space-y-8 text-[14.5px] text-[#555] leading-[1.85]">
      <h1 className="text-[30px] font-medium text-[#1a1a1a]">Shipping, Returns & Privacy Policy</h1>
      <section>
        <h2 className="text-[18px] font-semibold text-[#1a1a1a] mb-2">Shipping Policy</h2>
        <p>
          Orders placed before 2:00 PM PST ship the same business day via USPS First-Class Mail
          (1–5 business days). Orders totaling ${Number(store?.freeShippingThreshold ?? 49.99).toFixed(2)}{' '}
          or more receive complimentary Standard Shipping.
        </p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold text-[#1a1a1a] mb-2">30-Day Return Policy</h2>
        <p>
          Unused stamps returned in original, unopened condition within 30 days of delivery qualify
          for a full refund to your original payment method.
        </p>
      </section>
      <section>
        <h2 className="text-[18px] font-semibold text-[#1a1a1a] mb-2">Privacy & Payment Security</h2>
        <p>
          All transactions are processed over encrypted HTTPS channels via PayPal Checkout. We never
          store raw payment card numbers on our servers.
        </p>
      </section>
    </div>
  );
}
