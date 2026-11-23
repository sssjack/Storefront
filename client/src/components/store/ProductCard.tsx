import React from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import type { Product } from '../../types';
import { useStore } from '../../context/StoreContext';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, setQuickViewProduct, store } = useStore();
  const currency = store?.currencySymbol || '$';
  const coverImage = product.images[0] || '/uploads/seed/prod-us-flag-roll.png';

  const defaultVariant = product.variants[0];
  const minPrice =
    product.minPrice ??
    (product.variants.length
      ? Math.min(...product.variants.map((v) => Number(v.price)))
      : Number(product.basePrice));
  const hasMultiple = product.variants.length > 1;
  const compareAt =
    !hasMultiple && defaultVariant?.compareAtPrice
      ? defaultVariant.compareAtPrice
      : product.compareAtPrice;
  const isOnSale = compareAt != null && compareAt > minPrice;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const v = product.variants[0];
    addToCart({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      variantId: v?.id || '',
      variantName: v?.name || 'Standard',
      unitPrice: v ? Number(v.price) : Number(product.basePrice),
      quantity: 1,
      image: coverImage,
    });
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  return (
    <div className="sb-pcard group bg-white border border-[#ededed] rounded-[10px] overflow-hidden flex flex-col">
      <Link to={`/product/${product.slug}`} className="block relative p-2.5 pb-0">
        <div className="relative aspect-square bg-[#f5f5f5] rounded-[8px] overflow-hidden">
          <img
            src={coverImage}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Desktop Quick View circular icon */}
          <button
            type="button"
            onClick={handleQuickView}
            title="Quick view"
            aria-label="Quick view"
            className="sb-quick-view hidden md:flex items-center justify-center absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white text-[#1a1a1a] shadow-sm hover:bg-[#1a1a1a] hover:text-white cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Desktop Quick Add slide-up bar */}
          <button
            type="button"
            onClick={handleQuickAdd}
            className="sb-quick-add hidden md:block absolute inset-x-0 bottom-0 bg-[#1a1a1a] hover:bg-[#f04444] text-white text-[11px] font-semibold uppercase tracking-[0.08em] py-2.5 text-center cursor-pointer"
          >
            Quick Add
          </button>
        </div>
      </Link>

      <Link
        to={`/product/${product.slug}`}
        className="px-3 pt-3 pb-4 text-center flex-1 flex flex-col justify-between"
      >
        <h3 className="text-[12.5px] md:text-[13px] font-normal leading-[1.4] text-[#1a1a1a] line-clamp-2 min-h-[36px] group-hover:text-[#db1215] transition-colors">
          {product.title}
        </h3>
        <div className="mt-2 text-[14px] font-medium flex items-center justify-center gap-1.5 flex-wrap">
          {hasMultiple ? (
            <>
              <span className="text-[12px] font-normal text-[#888888]">From</span>
              <span className="text-[#1a1a1a]">
                {currency}
                {minPrice.toFixed(2)}
              </span>
            </>
          ) : isOnSale ? (
            <>
              <del className="text-[12.5px] font-normal text-[#aaaaaa]">
                {currency}
                {Number(compareAt).toFixed(2)}
              </del>
              <span className="text-[#f04444]">
                {currency}
                {minPrice.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="text-[#1a1a1a]">
              {currency}
              {minPrice.toFixed(2)}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
