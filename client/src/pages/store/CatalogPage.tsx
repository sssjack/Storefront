import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../lib/api';
import { ProductCard } from '../../components/store/ProductCard';
import type { Product } from '../../types';

export function CatalogPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const sort = searchParams.get('sort') || 'default';
  const bestseller = searchParams.get('bestseller') === 'true';
  const search = searchParams.get('search') || '';

  const currentCategory = slug ? categories.find((c) => c.slug === slug) : null;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (slug) qs.set('category', slug);
        if (bestseller) qs.set('bestseller', 'true');
        if (search) qs.set('search', search);
        if (sort) qs.set('sort', sort);
        qs.set('limit', '60');
        const data = await apiRequest<{ items: Product[]; total: number }>(
          `/api/products?${qs.toString()}`
        );
        if (active) {
          setProducts(data.items);
          setTotal(data.total);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [slug, bestseller, search, sort]);

  const pageTitle = currentCategory
    ? `${currentCategory.name} Stamps`
    : bestseller
      ? 'Best Seller Stamps'
      : 'All Forever Stamps';

  const handleSortChange = (nextSort: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('sort', nextSort);
    setSearchParams(next);
  };

  return (
    <div className="max-w-[1320px] mx-auto px-4 md:px-6 pt-8 pb-12">
      {/* Breadcrumb */}
      <div className="text-[12.5px] text-[#888] mb-3 flex items-center gap-1.5">
        <Link to="/" className="hover:text-[#1a1a1a]">
          Home
        </Link>
        <span>/</span>
        <span className="text-[#1a1a1a]">{pageTitle}</span>
      </div>

      {/* Centered Clean H1 (matching StampsBox collection header) */}
      <div className="text-center max-w-2xl mx-auto mb-7">
        <h1 className="text-[28px] md:text-[34px] font-medium text-[#1a1a1a]">{pageTitle}</h1>
        {currentCategory?.description && (
          <p className="text-[14px] text-[#666] mt-2 leading-relaxed">
            {currentCategory.description}
          </p>
        )}
      </div>

      {/* Category Pills Row */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        <Link
          to="/shop"
          className={`px-4 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
            !slug && !bestseller
              ? 'border-[#f04444] text-[#f04444] bg-[#fff5f5]'
              : 'border-[#e5e5e5] text-[#444] hover:border-[#f04444] hover:text-[#f04444]'
          }`}
        >
          All
        </Link>
        <Link
          to="/shop?bestseller=true"
          className={`px-4 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
            !slug && bestseller
              ? 'border-[#f04444] text-[#f04444] bg-[#fff5f5]'
              : 'border-[#e5e5e5] text-[#444] hover:border-[#f04444] hover:text-[#f04444]'
          }`}
        >
          Best Seller
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/collections/${cat.slug}`}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
              slug === cat.slug
                ? 'border-[#f04444] text-[#f04444] bg-[#fff5f5]'
                : 'border-[#e5e5e5] text-[#444] hover:border-[#f04444] hover:text-[#f04444]'
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {/* Horizontal Utility Bar bordered top & bottom */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3.5 border-y border-[#e8e8e8] mb-7">
        <p className="text-[13.5px] text-[#666]">
          {loading ? 'Loading stamps...' : `Showing all ${total} results`}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="catalog-sort" className="text-[13px] text-[#666]">
            Sort by:
          </label>
          <select
            id="catalog-sort"
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="border border-[#e0e0e0] rounded-[6px] px-3 py-1.5 text-[13px] text-[#1a1a1a] bg-white outline-none focus:border-[#17263b]"
          >
            <option value="default">Default sorting</option>
            <option value="popularity">Sort by popularity</option>
            <option value="latest">Sort by latest</option>
            <option value="price_asc">Sort by price: low to high</option>
            <option value="price_desc">Sort by price: high to low</option>
          </select>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-[3/4] bg-[#f5f5f5] rounded-[10px]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#e5e5e5] rounded-[10px]">
          <p className="text-[15px] text-[#555]">No stamps found in this category yet.</p>
          <Link
            to="/shop"
            className="inline-block mt-4 px-6 py-2.5 rounded-[6px] bg-[#1a1a1a] text-white text-[13px] font-semibold"
          >
            Browse All Stamps
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
