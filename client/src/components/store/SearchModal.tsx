import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../lib/api';
import type { Product } from '../../types';

export function SearchModal() {
  const { searchOpen, setSearchOpen, store } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchOpen) return;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const params = query.trim()
          ? `?search=${encodeURIComponent(query.trim())}&limit=8`
          : `?bestseller=true&limit=6`;
        const data = await apiRequest<{ items: Product[] }>(`/api/products${params}`);
        setResults(data.items);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [query, searchOpen]);

  if (!searchOpen) return null;
  const currency = store?.currencySymbol || '$';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="fixed inset-0 bg-black/50" onClick={() => setSearchOpen(false)} />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-[12px] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#ebebeb]">
          <Search className="w-5 h-5 text-[#888]" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Forever stamps, flag rolls, flower sheets..."
            className="flex-1 text-[15px] outline-none placeholder:text-[#999]"
          />
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[65vh] overflow-y-auto">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888] mb-3">
            {query.trim() ? `Results for "${query}"` : 'Popular Stamps'}
          </p>
          {loading ? (
            <p className="text-[13px] text-[#888] py-8 text-center">Searching catalog...</p>
          ) : results.length === 0 ? (
            <p className="text-[13px] text-[#888] py-8 text-center">
              No matching stamps found. Try another keyword.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.slug}`}
                  onClick={() => setSearchOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-[8px] border border-[#efefef] hover:border-[#db1215] transition-colors"
                >
                  <img
                    src={p.images[0] || '/uploads/seed/prod-us-flag-roll.png'}
                    alt={p.title}
                    className="w-14 h-14 rounded-[6px] bg-[#f5f5f5] object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#1a1a1a] truncate">{p.title}</p>
                    <p className="text-[12px] text-[#db1215] font-semibold mt-0.5">
                      {p.variants.length > 1 ? 'From ' : ''}
                      {currency}
                      {(p.minPrice ?? p.basePrice).toFixed(2)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
