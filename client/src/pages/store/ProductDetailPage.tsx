import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  HelpCircle,
  Share2,
  Truck,
  RotateCcw,
  X,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import { ProductCard } from '../../components/store/ProductCard';
import { PaymentBadges } from '../../components/store/BrandLogo';
import type { Product } from '../../types';

export function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, store, showToast } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'returns'>('description');
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Ask a Question modal state
  const [askOpen, setAskOpen] = useState(false);
  const [askForm, setAskForm] = useState({ name: '', email: '', message: '' });
  const [askSending, setAskSending] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await apiRequest<{ product: Product; related: Product[] }>(
          `/api/products/${slug}`
        );
        if (active) {
          setProduct(data.product);
          setRelated(data.related);
          setActiveImageIdx(0);
          setSelectedVariantIdx(0);
          setQty(1);
        }
      } catch {
        if (active) setProduct(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 560);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (loading) {
    return (
      <div className="max-w-[1240px] mx-auto px-5 py-12 grid grid-cols-1 md:grid-cols-2 gap-10 animate-pulse">
        <div className="aspect-square bg-[#f5f5f5] rounded-[10px]" />
        <div className="space-y-4">
          <div className="h-9 bg-[#f5f5f5] rounded w-3/4" />
          <div className="h-7 bg-[#f5f5f5] rounded w-1/3" />
          <div className="h-24 bg-[#f5f5f5] rounded" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h1 className="text-2xl font-semibold">Product Not Found</h1>
        <p className="text-[#666] mt-2 text-sm">
          This stamp may have been archived or removed from the catalog.
        </p>
        <Link
          to="/shop"
          className="inline-block mt-6 px-6 py-2.5 bg-[#1a1a1a] text-white rounded-[6px] text-sm font-semibold"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  const currency = store?.currencySymbol || '$';
  const images = product.images.length ? product.images : ['/uploads/seed/prod-us-flag-roll.png'];
  const variants = product.variants || [];
  const activeVariant = variants[selectedVariantIdx] || variants[0];
  const price = activeVariant ? Number(activeVariant.price) : Number(product.basePrice);
  const compareAt = activeVariant?.compareAtPrice ?? product.compareAtPrice;
  const stock = activeVariant?.stock ?? 99;

  const handleAddToCart = (buyNow = false) => {
    addToCart(
      {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        variantId: activeVariant?.id || '',
        variantName: activeVariant?.name || 'Standard',
        unitPrice: price,
        quantity: qty,
        image: images[0],
      },
      !buyNow
    );
    if (buyNow) navigate('/checkout');
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Product link copied to clipboard!');
    } catch {
      showToast('Link ready to share.');
    }
  };

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAskSending(true);
    try {
      await apiRequest('/api/inquiries', {
        method: 'POST',
        body: JSON.stringify({
          ...askForm,
          subject: `Question about ${product.title}`,
          productId: product.id,
        }),
      });
      setAskOpen(false);
      setAskForm({ name: '', email: '', message: '' });
      showToast('Your question has been sent to our support team!');
    } catch (err: any) {
      showToast(err.message || 'Failed to send');
    } finally {
      setAskSending(false);
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-6 pt-6 pb-14">
      {/* Breadcrumb */}
      <nav className="text-[12.5px] text-[#888] mb-6 flex items-center flex-wrap gap-1.5">
        <Link to="/" className="hover:text-[#1a1a1a]">
          Home
        </Link>
        <span>/</span>
        {product.categorySlug && (
          <>
            <Link to={`/collections/${product.categorySlug}`} className="hover:text-[#1a1a1a]">
              {product.categoryName}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-[#1a1a1a]">{product.title}</span>
      </nav>

      {/* 2-Column Main Buy Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Left: Vertical Thumbnail Strip + Large 1:1 Image */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          {images.length > 1 && (
            <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:w-[76px] shrink-0">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-[68px] h-[68px] rounded-[6px] overflow-hidden bg-[#f5f5f5] border shrink-0 cursor-pointer ${
                    idx === activeImageIdx ? 'border-[#1a1a1a] ring-1 ring-[#1a1a1a]' : 'border-[#e5e5e5]'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="relative flex-1 aspect-square bg-[#f3f3f3] rounded-[8px] overflow-hidden border border-[#ececec]">
            <img
              src={images[activeImageIdx % images.length]}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImageIdx((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImageIdx((i) => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Product Info & Buy Box (StampsBox Royal Blue Action Pills) */}
        <div>
          <h1 className="text-[26px] md:text-[34px] font-medium text-[#1a1a1a] leading-tight">
            {product.title}
          </h1>

          {/* Price */}
          <div className="flex items-baseline gap-3 mt-3">
            {compareAt != null && Number(compareAt) > price && (
              <del className="text-[20px] text-[#aaaaaa] font-normal">
                {currency}
                {Number(compareAt).toFixed(2)}
              </del>
            )}
            <span className="text-[28px] font-semibold text-[#db1215]">
              {currency}
              {price.toFixed(2)}
            </span>
          </div>

          {product.shortDescription && (
            <p className="text-[14px] text-[#666] mt-3 leading-relaxed">
              {product.shortDescription}
            </p>
          )}

          {/* Variant / Format Pill Swatches */}
          {variants.length > 0 && (
            <div className="mt-6">
              <p className="text-[13.5px] font-semibold text-[#1a1a1a] mb-2.5">
                Choose a Format:{' '}
                <span className="font-normal text-[#444]">{activeVariant?.name}</span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {variants.map((v, idx) => {
                  const active = idx === selectedVariantIdx;
                  return (
                    <button
                      key={v.id || v.name}
                      type="button"
                      onClick={() => setSelectedVariantIdx(idx)}
                      className={`px-4 py-2 rounded-full text-[13px] font-medium border transition-all cursor-pointer ${
                        active
                          ? 'bg-[#1a44c2] text-white border-[#1a44c2] shadow-xs'
                          : 'bg-white text-[#222] border-[#dcdcdc] hover:border-[#1a44c2]'
                      }`}
                    >
                      {v.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-[12px] text-[#777] mt-2">
                {stock > 0 ? (
                  <span className="text-emerald-700 font-medium">In stock ({stock} available)</span>
                ) : (
                  <span className="text-[#db1215] font-medium">Out of stock</span>
                )}
                {activeVariant?.sku && <span className="ml-3">SKU: {activeVariant.sku}</span>}
              </p>
            </div>
          )}

          {/* Quantity Stepper */}
          <div className="mt-5">
            <p className="text-[13.5px] font-semibold text-[#1a1a1a] mb-2">Quantity</p>
            <div className="inline-flex items-center bg-[#f5f5f5] rounded-full px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 flex items-center justify-center text-[#222] hover:text-[#db1215] cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center text-[14.5px] font-semibold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(Math.max(1, stock), q + 1))}
                className="w-8 h-8 flex items-center justify-center text-[#222] hover:text-[#db1215] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stacked Full-Width Royal Blue Pill Buttons */}
          <div className="mt-5 space-y-3">
            <button
              type="button"
              disabled={stock <= 0}
              onClick={() => handleAddToCart(false)}
              className="w-full py-3.5 rounded-full bg-[#1a44c2] hover:bg-[#14369e] disabled:bg-neutral-300 text-white text-[14.5px] font-semibold transition-colors cursor-pointer"
            >
              Add to cart – {currency}
              {(price * qty).toFixed(2)}
            </button>
            <button
              type="button"
              disabled={stock <= 0}
              onClick={() => handleAddToCart(true)}
              className="w-full py-3.5 rounded-full bg-[#17263b] hover:bg-[#1a44c2] disabled:bg-neutral-300 text-white text-[14.5px] font-semibold transition-colors cursor-pointer"
            >
              Buy Now with PayPal
            </button>
          </div>

          {/* Utility Row: Ask a question & Share */}
          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-[#efefef] text-[13px] font-medium text-[#333]">
            <button
              type="button"
              onClick={() => setAskOpen(true)}
              className="inline-flex items-center gap-1.5 hover:text-[#db1215] cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Ask a question</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 hover:text-[#db1215] cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>

          {/* Two Bordered Trust Boxes (Exact StampsBox PDP style) */}
          <div className="mt-5 space-y-3">
            <div className="border border-[#e5e5e5] rounded-[8px] px-5 py-4 text-center">
              <Truck className="w-5 h-5 mx-auto text-[#1a1a1a] mb-1.5" />
              <p className="text-[13px] text-[#333]">
                Estimate delivery times: <strong>1-5 days (First-Class Mail)</strong>
              </p>
            </div>
            <div className="border border-[#e5e5e5] rounded-[8px] px-5 py-4 text-center">
              <RotateCcw className="w-5 h-5 mx-auto text-[#1a1a1a] mb-1.5" />
              <p className="text-[13px] text-[#333]">
                Return <strong>30 days</strong> from the purchase date (Must be returned in original condition)
              </p>
            </div>
          </div>

          {/* Guaranteed Safe Checkout */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
            <span className="text-[12.5px] font-semibold text-[#333]">
              Guaranteed Safe Checkout
            </span>
            <PaymentBadges />
          </div>
        </div>
      </div>

      {/* Below the Fold: Description & Return Policies Tabs */}
      <div className="mt-14 border-t border-[#ebebeb]">
        <div className="flex items-center gap-8 border-b border-[#ebebeb]">
          <button
            type="button"
            onClick={() => setActiveTab('description')}
            className={`py-4 text-[14.5px] font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'description'
                ? 'border-[#1a1a1a] text-[#1a1a1a]'
                : 'border-transparent text-[#888] hover:text-[#1a1a1a]'
            }`}
          >
            Description
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('returns')}
            className={`py-4 text-[14.5px] font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'returns'
                ? 'border-[#1a1a1a] text-[#1a1a1a]'
                : 'border-transparent text-[#888] hover:text-[#1a1a1a]'
            }`}
          >
            Return Policies
          </button>
        </div>

        <div className="py-7 max-w-3xl text-[14.5px] text-[#555] leading-[1.85] space-y-4">
          {activeTab === 'description' ? (
            <>
              {(product.description || product.shortDescription).split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              {(product.issuanceInfo || product.originInfo) && (
                <div className="pt-3 border-t border-[#f0f0f0] text-[13.5px] space-y-1 text-[#333]">
                  {product.issuanceInfo && (
                    <p>
                      <strong>Stamp Issuance:</strong> {product.issuanceInfo}
                    </p>
                  )}
                  {product.originInfo && (
                    <p>
                      <strong>Origin:</strong> {product.originInfo}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p>
                <strong>30-Day Hassle-Free Return Window:</strong> Unopened booklets, panes, and
                coil rolls in their original condition may be returned within 30 calendar days of
                delivery for a full refund or replacement.
              </p>
              <p>
                <strong>Fast Processing:</strong> Refunds are issued back to your original PayPal
                account or payment method within 2–3 business days after inspection.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-10 pt-10 border-t border-[#ebebeb]">
          <h2 className="text-[22px] font-medium text-[#1a1a1a] text-center mb-7">
            Related Products
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((rp) => (
              <ProductCard key={rp.id} product={rp} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky Bottom Add-to-Cart Bar */}
      {showStickyBar && (
        <div className="hidden md:block fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-[#e5e5e5] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="max-w-[1240px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={images[0]}
                alt=""
                className="w-11 h-11 rounded-[6px] bg-[#f5f5f5] object-cover border border-[#e5e5e5]"
              />
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[#1a1a1a] truncate">{product.title}</p>
                <p className="text-[12.5px] text-[#db1215] font-semibold">
                  {activeVariant?.name} · {currency}
                  {price.toFixed(2)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleAddToCart(false)}
              className="px-7 py-2.5 rounded-full bg-[#1a44c2] hover:bg-[#14369e] text-white text-[13.5px] font-semibold shrink-0 cursor-pointer"
            >
              Add to cart
            </button>
          </div>
        </div>
      )}

      {/* Ask a Question Modal */}
      {askOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setAskOpen(false)} />
          <div className="relative z-10 bg-white rounded-[12px] max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-semibold">Ask a Question</h3>
              <button
                type="button"
                onClick={() => setAskOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[12.5px] text-[#666] mb-4">Regarding: {product.title}</p>
            <form onSubmit={handleAskSubmit} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Your Name"
                value={askForm.name}
                onChange={(e) => setAskForm({ ...askForm, name: e.target.value })}
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#17263b]"
              />
              <input
                type="email"
                required
                placeholder="Your Email"
                value={askForm.email}
                onChange={(e) => setAskForm({ ...askForm, email: e.target.value })}
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#17263b]"
              />
              <textarea
                required
                rows={4}
                placeholder="How can we help you with this stamp?"
                value={askForm.message}
                onChange={(e) => setAskForm({ ...askForm, message: e.target.value })}
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#17263b]"
              />
              <button
                type="submit"
                disabled={askSending}
                className="w-full py-2.5 rounded-[6px] bg-[#1a1a1a] hover:bg-[#f04444] text-white text-[13.5px] font-semibold cursor-pointer"
              >
                {askSending ? 'Sending...' : 'Send Question'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
