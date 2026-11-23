import React, { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Check,
  FileText,
  Compass,
  Edit3,
  Upload,
  X,
  ExternalLink,
  ArrowUpRight,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import type { NavItem, CustomPage, StoreSettings, Category } from '../../types';

function SortableNavRow({
  item,
  quickTargets,
  onChange,
  onDelete,
}: {
  item: NavItem;
  quickTargets: { label: string; url: string; type: NavItem['type'] }[];
  onChange: (patch: Partial<NavItem>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-[#e5e7eb] rounded-[10px] p-3.5 flex flex-col lg:flex-row lg:items-center gap-3 ${
        item.visible === false ? 'opacity-55 bg-[#fafafa]' : ''
      }`}
    >
      <div className="flex items-center gap-2.5 flex-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1.5 rounded hover:bg-[#f1f5f9] text-[#94a3b8] hover:text-[#17263b] cursor-grab active:cursor-grabbing shrink-0"
          title="按住拖拽调整栏目顺序"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={item.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="栏目名称 (如 About Us)"
          className="w-40 sm:w-44 border border-[#dcdcdc] rounded-[6px] px-3 py-1.5 text-[13px] font-medium outline-none focus:border-[#1a44c2]"
        />

        <select
          value={item.type}
          onChange={(e) => onChange({ type: e.target.value as NavItem['type'] })}
          className="border border-[#dcdcdc] rounded-[6px] px-2.5 py-1.5 text-[12.5px] bg-white"
        >
          <option value="link">普通页面 / 外链</option>
          <option value="page">自定义栏目页</option>
          <option value="categories_dropdown">自动展开商品分类下拉</option>
        </select>

        <input
          type="text"
          value={item.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="/shop 或 /page/about"
          className="flex-1 min-w-[140px] border border-[#dcdcdc] rounded-[6px] px-3 py-1.5 text-[12.5px] font-mono outline-none focus:border-[#1a44c2]"
        />
      </div>

      <div className="flex items-center gap-2 pl-9 lg:pl-0">
        <select
          value=""
          onChange={(e) => {
            const chosen = quickTargets.find((t) => t.url === e.target.value);
            if (chosen) {
              onChange({ url: chosen.url, type: chosen.type });
            }
          }}
          className="border border-[#e2e8f0] bg-[#f8fafc] rounded-[6px] px-2.5 py-1.5 text-[12px] text-[#475569] max-w-[175px]"
        >
          <option value="">快速指向页面...</option>
          {quickTargets.map((t) => (
            <option key={t.url + t.label} value={t.url}>
              {t.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onChange({ visible: item.visible === false ? true : false })}
          title={item.visible === false ? '已隐藏（点击显示）' : '显示中（点击隐藏）'}
          className={`p-1.5 rounded-[6px] cursor-pointer ${
            item.visible === false
              ? 'bg-[#f1f5f9] text-[#888]'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {item.visible === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onDelete}
          title="删除栏目"
          className="p-1.5 rounded-[6px] text-[#888] hover:text-[#db1215] hover:bg-red-50 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const EMPTY_PAGE = {
  title: '',
  slug: '',
  kicker: '',
  subtitle: '',
  coverImage: '',
  content: '',
  ctaText: 'Browse All Stamps',
  ctaLink: '/shop',
  status: 'published' as 'published' | 'draft',
};

export function NavigationPagesPage() {
  const { refreshBootstrap } = useStore();
  const [tab, setTab] = useState<'nav' | 'pages'>('nav');

  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [savingNav, setSavingNav] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

  // Page Editor Modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [pageForm, setPageForm] = useState(EMPTY_PAGE);
  const [savingPage, setSavingPage] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadAll = async () => {
    const [settingsRes, pagesRes, catsRes] = await Promise.all([
      apiRequest<{ store: StoreSettings }>('/api/admin/settings', {}, true),
      apiRequest<{ items: CustomPage[] }>('/api/admin/pages', {}, true),
      apiRequest<{ items: Category[] }>('/api/admin/categories', {}, true),
    ]);
    setStoreSettings(settingsRes.store);
    setNavItems(settingsRes.store.navItems || []);
    setPages(pagesRes.items);
    setCategories(catsRes.items);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const flashNotice = (text: string) => {
    setSavedNotice(text);
    setTimeout(() => setSavedNotice(''), 2800);
  };

  const quickTargets: { label: string; url: string; type: NavItem['type'] }[] = [
    { label: '内置：首页 (/)', url: '/', type: 'link' },
    { label: '内置：全部商品 (/shop)', url: '/shop', type: 'link' },
    { label: '内置：热销榜 (Best Seller)', url: '/shop?bestseller=true', type: 'link' },
    { label: '内置：分类下拉菜单', url: '/shop', type: 'categories_dropdown' },
    { label: '内置：邮票指南博客 (/blog)', url: '/blog', type: 'link' },
    { label: '内置：常见问题 (/faq)', url: '/faq', type: 'link' },
    { label: '内置：联系我们 (/contact)', url: '/contact', type: 'link' },
    { label: '内置：订单追踪 (/track-order)', url: '/track-order', type: 'link' },
    ...pages.map((p) => ({
      label: `自定义页：${p.title.slice(0, 18)} (/page/${p.slug})`,
      url: `/page/${p.slug}`,
      type: 'page' as const,
    })),
    ...categories.map((c) => ({
      label: `商品分类：${c.name}`,
      url: `/collections/${c.slug}`,
      type: 'link' as const,
    })),
  ];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setNavItems((prev) => {
        const oldIdx = prev.findIndex((i) => i.id === active.id);
        const newIdx = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const saveNavItems = async (nextItems = navItems) => {
    if (!storeSettings) return;
    setSavingNav(true);
    try {
      await apiRequest(
        '/api/admin/settings/store',
        { method: 'PUT', body: JSON.stringify({ ...storeSettings, navItems: nextItems }) },
        true
      );
      await refreshBootstrap();
      flashNotice('顶部导航栏目已保存并同步到前台！');
    } finally {
      setSavingNav(false);
    }
  };

  const addNavItem = () => {
    setNavItems((prev) => [
      ...prev,
      {
        id: `nav-${Date.now()}`,
        label: 'New Link',
        url: '/shop',
        type: 'link',
        visible: true,
      },
    ]);
  };

  const addPageToTopNav = async (page: CustomPage) => {
    const exists = navItems.some((n) => n.url === `/page/${page.slug}`);
    if (exists) {
      flashNotice(`顶部栏目中已包含 /page/${page.slug}`);
      return;
    }
    const next: NavItem[] = [
      ...navItems,
      {
        id: `nav-${Date.now()}`,
        label: page.title.slice(0, 20),
        url: `/page/${page.slug}`,
        type: 'page',
        visible: true,
      },
    ];
    setNavItems(next);
    await saveNavItems(next);
  };

  const openCreatePage = () => {
    setEditingPageId(null);
    setPageForm(EMPTY_PAGE);
    setEditorOpen(true);
  };

  const openEditPage = (p: CustomPage) => {
    setEditingPageId(p.id);
    setPageForm({
      title: p.title,
      slug: p.slug,
      kicker: p.kicker || '',
      subtitle: p.subtitle || '',
      coverImage: p.coverImage || '',
      content: p.content || '',
      ctaText: p.ctaText || '',
      ctaLink: p.ctaLink || '',
      status: p.status,
    });
    setEditorOpen(true);
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPage(true);
    try {
      if (editingPageId) {
        await apiRequest(`/api/admin/pages/${editingPageId}`, { method: 'PUT', body: JSON.stringify(pageForm) }, true);
      } else {
        await apiRequest('/api/admin/pages', { method: 'POST', body: JSON.stringify(pageForm) }, true);
      }
      setEditorOpen(false);
      await loadAll();
      await refreshBootstrap();
      flashNotice('自定义页面内容已发布！');
    } finally {
      setSavingPage(false);
    }
  };

  const handleDeletePage = async (p: CustomPage) => {
    if (!confirm(`确定删除页面 "${p.title}" 吗？`)) return;
    await apiRequest(`/api/admin/pages/${p.id}`, { method: 'DELETE' }, true);
    await loadAll();
    refreshBootstrap();
  };

  const handleUploadCover = async (file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiRequest<{ url: string }>('/api/admin/media/upload', { method: 'POST', body: fd }, true);
    setPageForm((prev) => ({ ...prev, coverImage: res.url }));
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#17263b]">导航栏目与页面内容 Navigation & Pages</h1>
          <p className="text-[13px] text-[#666]">
            自定义顶部导航栏菜单（支持拖拽排序与分类下拉），以及编辑 About Us、政策页或新建任意独立栏目页面
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="px-3.5 py-2 rounded-[8px] border border-[#dcdcdc] bg-white hover:border-[#17263b] text-[12.5px] font-semibold inline-flex items-center gap-1.5"
        >
          <span>查看前台效果</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('nav')}
            className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              tab === 'nav'
                ? 'bg-[#17263b] text-white'
                : 'bg-white border border-[#e5e7eb] text-[#444]'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>顶部网站栏目 ({navItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('pages')}
            className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              tab === 'pages'
                ? 'bg-[#17263b] text-white'
                : 'bg-white border border-[#e5e7eb] text-[#444]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>栏目页面内容 ({pages.length})</span>
          </button>
        </div>

        {savedNotice && (
          <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12.5px] font-semibold inline-flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            {savedNotice}
          </span>
        )}
      </div>

      {/* TAB 1: TOP NAVIGATION BUILDER */}
      {tab === 'nav' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-[#555]">
              按住每行左侧 <strong>⠿</strong> 手柄即可拖拽调整顶部导航顺序；可将某一项设为「自动展开商品分类下拉」。
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addNavItem}
                className="px-3.5 py-2 rounded-[8px] border border-[#17263b] text-[#17263b] hover:bg-[#f5f7fa] text-[13px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>新增顶部栏目</span>
              </button>
              <button
                type="button"
                disabled={savingNav}
                onClick={() => saveNavItems()}
                className="px-4 py-2 rounded-[8px] bg-[#1a44c2] hover:bg-[#14369e] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingNav ? '保存中...' : '保存并发布导航'}</span>
              </button>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={navItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2.5">
                {navItems.map((item) => (
                  <SortableNavRow
                    key={item.id}
                    item={item}
                    quickTargets={quickTargets}
                    onChange={(patch) =>
                      setNavItems((prev) =>
                        prev.map((n) => (n.id === item.id ? { ...n, ...patch } : n))
                      )
                    }
                    onDelete={() => setNavItems((prev) => prev.filter((n) => n.id !== item.id))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* TAB 2: CUSTOM PAGES CMS */}
      {tab === 'pages' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-[#555]">
              管理 <strong>About Us</strong>、<strong>政策页</strong> 或新建自定义栏目页面（如批量批发说明、品牌故事），支持一键挂到顶部导航栏。
            </p>
            <button
              type="button"
              onClick={openCreatePage}
              className="px-4 py-2 rounded-[8px] bg-[#1a44c2] hover:bg-[#14369e] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新建栏目页面</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pages.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-[10px] border border-[#e5e7eb] p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#f1f5f9] text-[#475569]">
                      /page/{p.slug}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        p.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#17263b] mt-2.5 leading-snug">
                    {p.title}
                  </h3>
                  {p.subtitle && (
                    <p className="text-[12.5px] text-[#666] mt-1 line-clamp-2">{p.subtitle}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#f1f5f9] text-[12px]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditPage(p)}
                      className="px-3 py-1.5 rounded-[6px] bg-[#17263b] text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>编辑内容</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addPageToTopNav(p)}
                      className="px-3 py-1.5 rounded-[6px] border border-[#dcdcdc] hover:border-[#1a44c2] text-[#1a44c2] font-semibold cursor-pointer"
                    >
                      + 加入顶部栏目
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`/page/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded hover:bg-[#f1f5f9] text-[#555]"
                      title="在前台打开此页"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                    {p.slug !== 'about' && p.slug !== 'policies' && (
                      <button
                        type="button"
                        onClick={() => handleDeletePage(p)}
                        className="p-1.5 rounded hover:bg-red-50 text-[#888] hover:text-[#db1215] cursor-pointer"
                        title="删除页面"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Page Editor Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditorOpen(false)} />
          <div className="relative z-10 bg-white rounded-[12px] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#ebebeb] flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-[#17263b]">
                {editingPageId ? '编辑栏目页面内容' : '新建自定义栏目页面'}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePage} className="flex-1 overflow-y-auto p-6 space-y-4 text-[13.5px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[12px] font-semibold text-[#444] mb-1">页面主标题 *</label>
                  <input
                    type="text"
                    required
                    value={pageForm.title}
                    onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                    placeholder="e.g. Bulk & Wholesale Orders"
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#444] mb-1">
                    页面路径 Slug（访问地址为 /page/xxx）
                  </label>
                  <input
                    type="text"
                    value={pageForm.slug}
                    onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })}
                    placeholder="wholesale"
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2 font-mono text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#444] mb-1">发布状态</label>
                  <select
                    value={pageForm.status}
                    onChange={(e) => setPageForm({ ...pageForm, status: e.target.value as any })}
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                  >
                    <option value="published">已发布（前台可访问）</option>
                    <option value="draft">草稿（暂不公开）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#444] mb-1">顶部小标签 Kicker（选填）</label>
                  <input
                    type="text"
                    value={pageForm.kicker}
                    onChange={(e) => setPageForm({ ...pageForm, kicker: e.target.value })}
                    placeholder="ABOUT STAMPSBOX"
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#444] mb-1">副标题简介（选填）</label>
                  <input
                    type="text"
                    value={pageForm.subtitle}
                    onChange={(e) => setPageForm({ ...pageForm, subtitle: e.target.value })}
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#444] mb-1">顶部配图（选填）</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pageForm.coverImage}
                    onChange={(e) => setPageForm({ ...pageForm, coverImage: e.target.value })}
                    placeholder="/uploads/..."
                    className="flex-1 border border-[#dcdcdc] rounded-[6px] px-3 py-2 text-[12.5px]"
                  />
                  <label className="px-3 py-2 rounded-[6px] border border-[#dcdcdc] hover:border-[#17263b] cursor-pointer inline-flex items-center gap-1 text-[12px] font-semibold">
                    <Upload className="w-3.5 h-3.5" />
                    <span>上传图片</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadCover(e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#444] mb-1">
                  正文内容（支持用 <code>## 小标题</code> 写分节标题，空行自动分段）
                </label>
                <textarea
                  rows={9}
                  required
                  value={pageForm.content}
                  onChange={(e) => setPageForm({ ...pageForm, content: e.target.value })}
                  className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#444] mb-1">底部按钮文字（选填）</label>
                  <input
                    type="text"
                    value={pageForm.ctaText}
                    onChange={(e) => setPageForm({ ...pageForm, ctaText: e.target.value })}
                    placeholder="Explore Our Collection"
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#444] mb-1">底部按钮跳转路径</label>
                  <input
                    type="text"
                    value={pageForm.ctaLink}
                    onChange={(e) => setPageForm({ ...pageForm, ctaLink: e.target.value })}
                    placeholder="/shop"
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2 font-mono text-[13px]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#ebebeb] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 rounded-[6px] border border-[#dcdcdc] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={savingPage}
                  className="px-6 py-2 rounded-[6px] bg-[#1a44c2] hover:bg-[#14369e] text-white font-semibold cursor-pointer"
                >
                  {savingPage ? '保存中...' : '保存页面'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
