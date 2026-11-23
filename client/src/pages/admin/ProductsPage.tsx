import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Star,
  Upload,
  X,
  CheckCircle2,
  EyeOff,
  FileEdit,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import type { Product, ProductVariant, Category } from '../../types';

const EMPTY_PRODUCT = {
  title: '',
  slug: '',
  sku: '',
  categoryId: '' as string | number,
  status: 'published' as 'published' | 'draft' | 'archived',
  isBestseller: false,
  isFeatured: false,
  basePrice: 12.99,
  compareAtPrice: '' as string | number,
  shortDescription: '',
  description: '',
  issuanceInfo: '',
  originInfo: 'Made in the USA',
  seoTitle: '',
  seoDescription: '',
  images: [] as string[],
  variants: [
    { id: 'v-1', name: 'Book of 20', sku: 'SB-NEW-20', price: 12.99, compareAtPrice: 15.99, stock: 100 },
  ] as ProductVariant[],
};

export function ProductsPage() {
  const { refreshBootstrap } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (catFilter !== 'all') qs.set('categoryId', catFilter);
      const [pRes, cRes] = await Promise.all([
        apiRequest<{ items: Product[] }>(`/api/admin/products?${qs.toString()}`, {}, true),
        apiRequest<{ items: Category[] }>('/api/admin/categories', {}, true),
      ]);
      setProducts(pRes.items);
      setCategories(cRes.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, catFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_PRODUCT,
      categoryId: categories[0]?.id || '',
      variants: [
        {
          id: `v-${Date.now()}`,
          name: 'Book of 20',
          sku: `SB-${Date.now().toString().slice(-4)}`,
          price: 12.99,
          compareAtPrice: 15.99,
          stock: 100,
        },
      ],
    });
    setEditorOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      slug: p.slug,
      sku: p.sku || '',
      categoryId: p.categoryId || '',
      status: p.status,
      isBestseller: p.isBestseller,
      isFeatured: p.isFeatured,
      basePrice: p.basePrice,
      compareAtPrice: p.compareAtPrice ?? '',
      shortDescription: p.shortDescription || '',
      description: p.description || '',
      issuanceInfo: p.issuanceInfo || '',
      originInfo: p.originInfo || 'Made in the USA',
      seoTitle: p.seoTitle || '',
      seoDescription: p.seoDescription || '',
      images: p.images || [],
      variants: p.variants?.length
        ? p.variants
        : [{ id: 'v-1', name: 'Book of 20', sku: p.sku || '', price: p.basePrice, stock: 50 }],
    });
    setEditorOpen(true);
  };

  const toggleStatus = async (p: Product) => {
    const nextStatus = p.status === 'published' ? 'archived' : 'published';
    await apiRequest(
      `/api/admin/products/${p.id}/status`,
      { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) },
      true
    );
    await loadData();
    refreshBootstrap();
  };

  const toggleBestseller = async (p: Product) => {
    await apiRequest(
      `/api/admin/products/${p.id}/status`,
      { method: 'PATCH', body: JSON.stringify({ isBestseller: !p.isBestseller }) },
      true
    );
    await loadData();
  };

  const handleBulk = async (action: 'publish' | 'archive' | 'delete') => {
    if (selectedIds.length === 0) return;
    if (action === 'delete' && !confirm(`确定删除选中的 ${selectedIds.length} 个商品吗？`)) return;
    await apiRequest(
      '/api/admin/products/bulk',
      { method: 'POST', body: JSON.stringify({ ids: selectedIds, action }) },
      true
    );
    setSelectedIds([]);
    await loadData();
    refreshBootstrap();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要永久删除该商品吗？')) return;
    await apiRequest(`/api/admin/products/${id}`, { method: 'DELETE' }, true);
    await loadData();
    refreshBootstrap();
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImg(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await apiRequest<{ url: string }>(
          '/api/admin/media/upload',
          { method: 'POST', body: fd },
          true
        );
        uploadedUrls.push(res.url);
      }
      setForm((prev) => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
    } catch (err: any) {
      alert(err.message || '图片上传失败');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        basePrice: form.variants.length
          ? Math.min(...form.variants.map((v) => Number(v.price) || 0))
          : Number(form.basePrice),
        compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
      };
      if (editingId) {
        await apiRequest(`/api/admin/products/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) }, true);
      } else {
        await apiRequest('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) }, true);
      }
      setEditorOpen(false);
      await loadData();
      refreshBootstrap();
    } catch (err: any) {
      alert(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#17263b]">商品管理 Products</h1>
          <p className="text-[13px] text-[#666]">上传新商品、一键上下架、配置多规格价格库存与图库</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2.5 rounded-[8px] bg-[#1a44c2] hover:bg-[#14369e] text-white text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>上传新商品</span>
        </button>
      </div>

      {/* Filters & Bulk Bar */}
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-[#888] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              placeholder="搜索商品标题、SKU..."
              className="w-full pl-9 pr-3 py-2 border border-[#dcdcdc] rounded-[6px] text-[13px] outline-none focus:border-[#17263b]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-[#dcdcdc] rounded-[6px] px-3 py-2 text-[13px]"
          >
            <option value="all">全部状态</option>
            <option value="published">已上架 Published</option>
            <option value="draft">草稿 Draft</option>
            <option value="archived">已下架 Archived</option>
          </select>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="border border-[#dcdcdc] rounded-[6px] px-3 py-2 text-[13px]"
          >
            <option value="all">全部分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadData}
            className="px-3.5 py-2 rounded-[6px] bg-[#17263b] text-white text-[13px] font-medium cursor-pointer"
          >
            筛选
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 text-[12.5px]">
            <span className="text-[#666]">已选 {selectedIds.length} 项：</span>
            <button
              type="button"
              onClick={() => handleBulk('publish')}
              className="px-2.5 py-1.5 rounded bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 cursor-pointer"
            >
              批量上架
            </button>
            <button
              type="button"
              onClick={() => handleBulk('archive')}
              className="px-2.5 py-1.5 rounded bg-amber-50 text-amber-800 font-semibold hover:bg-amber-100 cursor-pointer"
            >
              批量下架
            </button>
            <button
              type="button"
              onClick={() => handleBulk('delete')}
              className="px-2.5 py-1.5 rounded bg-red-50 text-[#db1215] font-semibold hover:bg-red-100 cursor-pointer"
            >
              批量删除
            </button>
          </div>
        )}
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#f8fafc] text-[#64748b] text-[12px] uppercase">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedIds.length === products.length}
                    onChange={(e) =>
                      setSelectedIds(e.target.checked ? products.map((p) => p.id) : [])
                    }
                  />
                </th>
                <th className="px-4 py-3">商品信息</th>
                <th className="px-4 py-3">所属分类</th>
                <th className="px-4 py-3">起步价 / 规格</th>
                <th className="px-4 py-3">总库存</th>
                <th className="px-4 py-3">状态（点击上下架）</th>
                <th className="px-4 py-3 text-center">热销</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#888]">
                    加载中...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#888]">
                    暂无符合条件的商品
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const totalStock = p.variants.reduce((acc, v) => acc + Number(v.stock || 0), 0);
                  return (
                    <tr key={p.id} className="hover:bg-[#fafafa]">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.images[0] || '/uploads/seed/prod-us-flag-roll.png'}
                            alt=""
                            className="w-11 h-11 rounded-[6px] bg-[#f5f5f5] object-cover border border-[#ececec] shrink-0"
                          />
                          <div className="min-w-0 max-w-[260px]">
                            <p className="font-medium text-[#1a1a1a] truncate">{p.title}</p>
                            <p className="text-[11.5px] text-[#888] font-mono">{p.sku || p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#555]">{p.categoryName}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#17263b]">
                          ${Number(p.basePrice).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-[#888]">{p.variants.length} 个规格</div>
                      </td>
                      <td className="px-4 py-3 font-medium">{totalStock}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleStatus(p)}
                          title="点击切换上架/下架"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold cursor-pointer transition-colors ${
                            p.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : p.status === 'draft'
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-red-50 text-[#db1215] hover:bg-red-100'
                          }`}
                        >
                          {p.status === 'published' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> 已上架
                            </>
                          ) : p.status === 'draft' ? (
                            <>
                              <FileEdit className="w-3.5 h-3.5" /> 草稿
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" /> 已下架
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleBestseller(p)}
                          className="p-1 cursor-pointer"
                          title="标记为 Best Seller"
                        >
                          <Star
                            className={`w-4 h-4 mx-auto ${
                              p.isBestseller
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-[#cbd5e1] hover:text-amber-400'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded hover:bg-[#f1f5f9] text-[#17263b] cursor-pointer"
                          title="编辑商品"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-[#888] hover:text-[#db1215] cursor-pointer"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Create / Edit Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditorOpen(false)} />
          <div className="relative z-10 bg-white rounded-[12px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#ebebeb] flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-[#17263b]">
                {editingId ? '编辑商品' : '上传新商品'}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-6 text-[13.5px]">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[12px] font-semibold text-[#444] mb-1">商品标题 *</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. U.S. Flag 2025 Forever Stamps (Rolls)"
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2 outline-none focus:border-[#1a44c2]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#444] mb-1">所属分类</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                  >
                    <option value="">未分类</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#444] mb-1">上架状态</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                  >
                    <option value="published">已上架 Published（前台可见）</option>
                    <option value="draft">草稿 Draft（暂不展示）</option>
                    <option value="archived">已下架 Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#444] mb-1">SKU 编码</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#444] mb-1">URL Slug（留空自动生成）</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isBestseller}
                    onChange={(e) => setForm({ ...form, isBestseller: e.target.checked })}
                  />
                  <span>标记为 Best Seller（首页热销筛选默认展示）</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  />
                  <span>首页推荐 Featured</span>
                </label>
              </div>

              {/* Product Images */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12.5px] font-semibold text-[#17263b]">商品图片集（首图作为封面）</label>
                  <label className="px-3 py-1.5 rounded-[6px] bg-[#f5f7fa] border border-[#dcdcdc] hover:border-[#17263b] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingImg ? '上传中...' : '上传图片文件'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files)}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  {form.images.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-20 rounded-[8px] border border-[#e5e7eb] bg-[#f5f5f5] overflow-hidden group"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, images: form.images.filter((_, i) => i !== idx) })
                        }
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {form.images.length === 0 && (
                    <p className="text-[12px] text-[#888]">暂未上传图片，可点击右上角上传或粘贴图片 URL</p>
                  )}
                </div>
              </div>

              {/* Multi-Variant Pricing & Inventory */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[12.5px] font-semibold text-[#17263b]">
                    规格 / 包装选项（如 Book of 20、1 Roll / 100 Pcs）
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        variants: [
                          ...form.variants,
                          {
                            id: `v-${Date.now()}`,
                            name: '5 Rolls / 500 Pcs',
                            sku: '',
                            price: 49.99,
                            compareAtPrice: null,
                            stock: 50,
                          },
                        ],
                      })
                    }
                    className="text-[12px] font-semibold text-[#1a44c2] hover:underline cursor-pointer"
                  >
                    + 添加规格选项
                  </button>
                </div>

                <div className="space-y-2">
                  {form.variants.map((v, idx) => (
                    <div
                      key={v.id || idx}
                      className="grid grid-cols-2 sm:grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_auto] gap-2 items-center p-2.5 rounded-[8px] bg-[#fafafa] border border-[#ebebeb]"
                    >
                      <input
                        type="text"
                        placeholder="规格名 (如 Book of 20)"
                        value={v.name}
                        onChange={(e) => {
                          const next = [...form.variants];
                          next[idx] = { ...v, name: e.target.value };
                          setForm({ ...form, variants: next });
                        }}
                        className="bg-white border border-[#dcdcdc] rounded px-2.5 py-1.5 text-[12.5px]"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="售价 $"
                        value={v.price}
                        onChange={(e) => {
                          const next = [...form.variants];
                          next[idx] = { ...v, price: Number(e.target.value) };
                          setForm({ ...form, variants: next });
                        }}
                        className="bg-white border border-[#dcdcdc] rounded px-2.5 py-1.5 text-[12.5px]"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="划线原价"
                        value={v.compareAtPrice ?? ''}
                        onChange={(e) => {
                          const next = [...form.variants];
                          next[idx] = {
                            ...v,
                            compareAtPrice: e.target.value === '' ? null : Number(e.target.value),
                          };
                          setForm({ ...form, variants: next });
                        }}
                        className="bg-white border border-[#dcdcdc] rounded px-2.5 py-1.5 text-[12.5px]"
                      />
                      <input
                        type="number"
                        placeholder="库存"
                        value={v.stock}
                        onChange={(e) => {
                          const next = [...form.variants];
                          next[idx] = { ...v, stock: Number(e.target.value) };
                          setForm({ ...form, variants: next });
                        }}
                        className="bg-white border border-[#dcdcdc] rounded px-2.5 py-1.5 text-[12.5px]"
                      />
                      <input
                        type="text"
                        placeholder="SKU"
                        value={v.sku}
                        onChange={(e) => {
                          const next = [...form.variants];
                          next[idx] = { ...v, sku: e.target.value };
                          setForm({ ...form, variants: next });
                        }}
                        className="bg-white border border-[#dcdcdc] rounded px-2.5 py-1.5 text-[12.5px]"
                      />
                      <button
                        type="button"
                        disabled={form.variants.length <= 1}
                        onClick={() =>
                          setForm({ ...form, variants: form.variants.filter((_, i) => i !== idx) })
                        }
                        className="p-1.5 text-[#888] hover:text-[#db1215] disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Descriptions & Metadata */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#444] mb-1">简短卖点描述</label>
                  <input
                    type="text"
                    value={form.shortDescription}
                    onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#444] mb-1">商品详情正文</label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="发行信息 (e.g. Issued: Jan 2024 · Washington, DC)"
                    value={form.issuanceInfo}
                    onChange={(e) => setForm({ ...form, issuanceInfo: e.target.value })}
                    className="border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
                  />
                  <input
                    type="text"
                    placeholder="产地信息 (e.g. Made in the USA)"
                    value={form.originInfo}
                    onChange={(e) => setForm({ ...form, originInfo: e.target.value })}
                    className="border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#ebebeb] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-5 py-2 rounded-[6px] border border-[#dcdcdc] text-[13.5px] font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-[6px] bg-[#1a44c2] hover:bg-[#14369e] text-white text-[13.5px] font-semibold cursor-pointer"
                >
                  {saving ? '保存中...' : editingId ? '保存修改' : '发布商品'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
