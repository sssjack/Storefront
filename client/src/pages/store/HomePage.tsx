import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../lib/api';
import { BlockRenderer } from '../../components/store/BlockRenderer';
import type { Product, Article } from '../../types';

export function HomePage() {
  const { homeLayout, categories, loading: bootLoading } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [prodRes, artRes] = await Promise.all([
          apiRequest<{ items: Product[] }>('/api/products?limit=60'),
          apiRequest<{ items: Article[] }>('/api/articles?limit=6'),
        ]);
        if (active) {
          setProducts(prodRes.items);
          setArticles(artRes.items);
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
  }, []);

  if (bootLoading && loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-16 space-y-8 animate-pulse">
        <div className="h-[420px] bg-[#f5f5f5] rounded-[10px]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square bg-[#f5f5f5] rounded-[12px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <BlockRenderer
      blocks={homeLayout}
      categories={categories}
      products={products}
      articles={articles}
    />
  );
}
