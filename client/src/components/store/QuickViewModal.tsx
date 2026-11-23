import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Minus, Plus, ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export function QuickViewModal() {
  const { quickViewProduct, setQuickViewProduct, addToCart, store } = useStore();
  const navigate = useNavigate();
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setSelectedVariantIdx(0);
    setQty(1);
  }, [quickViewProduct?.id]);

  if (!quickViewProduct) return null;

  const currency = store?.currencySymbol || '$';
  const variants = quickViewProduct.variants || [];
  const activeVariant = variants[selectedVariantIdx] || variants[0];
  const price = activeVariant ? Number(activeVariant.price) : Number(quickViewProduct.basePrice);
  const compareAt = activeVariant?.compareAtPrice ?? quickViewProduct.compareAtPrice;
  const cover = quickViewProduct.images[0] || '/uploads/seed/prod-us-flag-roll.png';

  const handleAdd = (buyNow = false) => {
    addToCart(
      {
        productId: quickViewProduct.id,
        slug: quickViewProduct.slug,
        title: quickViewProduct.title,
        variantId: activeVariant?.id || '',
        variantName: activeVariant?.name || 'Standard',
        unitPrice: price,
        quantity: qty,
        image: cover,
      },
      !buyNow
    );
    setQuickViewProduct(null);
    if (buyNow) navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setQuickViewProduct(null)}
      />
      <div className="relative z-10 bg-white rounded-[12px] max-w-3xl w-full overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-[#1a1a1a] hover:text-white flex items-center justify-center shadow-sm cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="bg-[#f5f5f5] p-6 flex items-center justify-center">
          <img
            src={cover}
            alt={quickViewProduct.title}
            className="w-full max-w-[320px] aspect-square object-cover rounded-[8px]"
          />
        </div>

        <div className="p-6 flex flex-col justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[#888] font-semibold">
              {quickViewProduct.categoryName || 'Forever Stamps'}
            </p>
            <h3 className="text-[20px] font-semibold text-[#1a1a1a] mt-1 leading-snug">
              {quickViewProduct.title}
            </h3>
            <div className="flex items-baseline gap-2.5 mt-2.5">
              {compareAt && compareAt > price && (
                <del className="text-[15px] text-[#aaa]">
                  {currency}
                  {Number(compareAt).toFixed(2)}
                </del>
              )}
              <span className="text-[22px] font-semibold text-[#db1215]">
                {currency}
                {price.toFixed(2)}
              </span>
            </div>

            {quickViewProduct.shortDescription && (
              <p className="text-[13px] text-[#666] mt-3 leading-relaxed">
                {quickViewProduct.shortDescription}
              </p>
            )}

            {variants.length > 0 && (
              <div className="mt-4">
                <p className="text-[12.5px] font-semibold text-[#1a1a1a] mb-2">
                  Choose a Format:{' '}
                  <span className="font-normal text-[#555]">{activeVariant?.name}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v, idx) => {
                    const active = idx === selectedVariantIdx;
                    return (
                      <button
                        key={v.id || v.name}
                        type="button"
                        onClick={() => setSelectedVariantIdx(idx)}
                        className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#1a44c2] text-white border-[#1a44c2]'
                            : 'bg-white text-[#222] border-[#d8d8d8] hover:border-[#1a44c2]'
                        }`}
                      >
                        {v.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <span className="text-[12.5px] font-semibold text-[#1a1a1a]">Quantity</span>
              <div className="inline-flex items-center bg-[#f5f5f5] rounded-full px-2 py-1">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 flex items-center justify-center hover:text-[#db1215] cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-[13px] font-semibold">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="w-7 h-7 flex items-center justify-center hover:text-[#db1215] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              onClick={() => handleAdd(false)}
              className="w-full py-2.5 rounded-full bg-[#1a44c2] hover:bg-[#14369e] text-white text-[13.5px] font-semibold transition-colors cursor-pointer"
            >
              Add to cart – {currency}
              {(price * qty).toFixed(2)}
            </button>
            <button
              type="button"
              onClick={() => handleAdd(true)}
              className="w-full py-2.5 rounded-full border border-[#1a44c2] text-[#1a44c2] hover:bg-[#1a44c2] hover:text-white text-[13.5px] font-semibold transition-colors cursor-pointer"
            >
              Buy Now
            </button>
            <Link
              to={`/product/${quickViewProduct.slug}`}
              onClick={() => setQuickViewProduct(null)}
              className="inline-flex items-center gap-1 text-[12.5px] text-[#555] hover:text-[#db1215] pt-1"
            >
              View full details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
