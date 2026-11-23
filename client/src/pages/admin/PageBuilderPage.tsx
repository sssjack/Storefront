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
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Plus,
  Save,
  RotateCcw,
  Monitor,
  Smartphone,
  Upload,
  Sparkles,
  Check,
  ExternalLink,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import { BlockRenderer } from '../../components/store/BlockRenderer';
import type { PageBlock, BlockType, Product, Article, HeroSlide } from '../../types';

const BLOCK_CATALOG: { type: BlockType; label: string; desc: string; defaultProps: Record<string, any> }[] = [
  {
    type: 'hero_slider',
    label: '焦点图轮播 Hero',
    desc: 'StampsBox 标志性分屏大图 + 深蓝底部控制台',
    defaultProps: {
      kicker: 'FEATURED COLLECTION',
      autoplayMs: 6500,
      slides: [
        {
          id: `s-${Date.now()}`,
          tabLabel: 'New Collection',
          title: 'CLASSIC FOREVER STAMPS',
          subtitle: 'Authentic USPS First-Class postage delivered nationwide.',
          ctaText: 'Shop collection',
          ctaLink: '/shop',
          imageUrl: '/uploads/seed/hero-flag.png',
        },
      ],
    },
  },
  {
    type: 'category_grid',
    label: '分类宫格 Category Grid',
    desc: '展示前台可见的商品分类卡片（自动同步分类排序）',
    defaultProps: { heading: 'Shop by Category', subheading: '', columns: 4, maxItems: 8 },
  },
  {
    type: 'product_showcase',
    label: '商品筛选陈列 Product Grid',
    desc: '带胶囊分类筛选按钮的商品网格与 View All 按钮',
    defaultProps: {
      heading: '',
      defaultFilter: 'bestseller',
      showFilterPills: true,
      columns: 5,
      maxItems: 10,
      ctaText: 'VIEW ALL STAMPS',
      ctaLink: '/shop',
    },
  },
  {
    type: 'promo_banner',
    label: '活动横幅 Promo Banner',
    desc: '高转化促销横幅，支持自定义背景色、角标与跳转链接',
    defaultProps: {
      badge: 'LIMITED OFFER · CODE WELCOME10',
      title: 'Save 10% on Bulk Coil Rolls & First Orders',
      subtitle: 'Free USPS First-Class shipping on orders over $49.99.',
      ctaText: 'Shop Bulk Deals',
      ctaLink: '/collections/patriotic',
      bgColor: '#17263b',
      accentColor: '#f04444',
    },
  },
  {
    type: 'editorial_grid',
    label: '资讯指南 Stamp Guide',
    desc: '3 列图文文章卡片模块，自动读取已发布文章',
    defaultProps: { heading: 'Order Postage Stamps Online with Ease', maxItems: 3, ctaText: 'Read more' },
  },
  {
    type: 'brand_story',
    label: '品牌故事 Brand Story',
    desc: '居中信任背书文案区块，提升独立站转化率与 SEO',
    defaultProps: {
      heading: 'Buy Stamps Online from a Trusted US Stamp Store',
      paragraphs: [
        'We inspect and pack every Forever stamp booklet and coil roll carefully from our US fulfillment center.',
      ],
      ctaText: 'READ MORE',
      ctaLink: '/about',
    },
  },
  {
    type: 'trust_badges',
    label: '信任保障条 Trust Badges',
    desc: '4 列物流时效、正品保障、30 天退换与客户信赖徽章',
    defaultProps: {
      items: [
        { icon: 'truck', title: 'Fast US Delivery', desc: '1–5 business days via First-Class Mail' },
        { icon: 'shield', title: '100% Authentic Postage', desc: 'Genuine USPS Forever® valid stamps' },
        { icon: 'return', title: '30-Day Returns', desc: 'Hassle-free returns in original condition' },
        { icon: 'award', title: 'Trusted by 12,000+', desc: 'Homes, weddings & small businesses' },
      ],
    },
  },
];

function SortableBlockRow({
  block,
  selected,
  onSelect,
  onToggleVisible,
  onDuplicate,
  onDelete,
}: {
  block: PageBlock;
  selected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group rounded-[10px] border p-3.5 bg-white flex items-center gap-3 cursor-pointer transition-all ${
        selected
          ? 'border-[#1a44c2] ring-2 ring-[#1a44c2]/15 shadow-xs'
          : 'border-[#e5e7eb] hover:border-[#cbd5e1]'
      } ${!block.visible ? 'opacity-55 bg-[#fafafa]' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="p-1.5 rounded hover:bg-[#f1f5f9] text-[#94a3b8] hover:text-[#17263b] cursor-grab active:cursor-grabbing"
        title="按住拖拽排序"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold text-[#17263b] truncate">{block.label}</span>
          <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#64748b]">
            {block.type}
          </span>
        </div>
        <p className="text-[11.5px] text-[#888] truncate mt-0.5">
          {block.props.heading || block.props.title || block.props.kicker || '点击右侧编辑组件属性'}
        </p>
      </div>

      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onToggleVisible}
          title={block.visible ? '隐藏模块' : '显示模块'}
          className="p-1.5 rounded hover:bg-[#f1f5f9] text-[#64748b] hover:text-[#17263b] cursor-pointer"
        >
          {block.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          title="复制模块"
          className="p-1.5 rounded hover:bg-[#f1f5f9] text-[#64748b] hover:text-[#17263b] cursor-pointer"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="删除模块"
          className="p-1.5 rounded hover:bg-red-50 text-[#64748b] hover:text-[#db1215] cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function PageBuilderPage() {
  const { categories, refreshBootstrap } = useStore();
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewProducts, setPreviewProducts] = useState<Product[]>([]);
  const [previewArticles, setPreviewArticles] = useState<Article[]>([]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    apiRequest<{ blocks: PageBlock[] }>('/api/admin/layout/home', {}, true).then((res) => {
      setBlocks(res.blocks);
      if (res.blocks[0]) setSelectedId(res.blocks[0].id);
    });
    apiRequest<{ items: Product[] }>('/api/products?limit=20').then((r) => setPreviewProducts(r.items));
    apiRequest<{ items: Article[] }>('/api/articles?limit=6').then((r) => setPreviewArticles(r.items));
  }, []);

  const selectedBlock = blocks.find((b) => b.id === selectedId) || null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((prev) => {
        const oldIdx = prev.findIndex((i) => i.id === active.id);
        const newIdx = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const addBlock = (tpl: (typeof BLOCK_CATALOG)[number]) => {
    const newBlock: PageBlock = {
      id: `blk-${tpl.type}-${Date.now()}`,
      type: tpl.type,
      label: tpl.label,
      visible: true,
      props: JSON.parse(JSON.stringify(tpl.defaultProps)),
    };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  };

  const updateBlockProps = (patch: Record<string, any>) => {
    if (!selectedId) return;
    setBlocks((prev) =>
      prev.map((b) => (b.id === selectedId ? { ...b, props: { ...b.props, ...patch } } : b))
    );
  };

  const updateBlockLabel = (label: string) => {
    if (!selectedId) return;
    setBlocks((prev) => prev.map((b) => (b.id === selectedId ? { ...b, label } : b)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest(
        '/api/admin/layout/home',
        { method: 'PUT', body: JSON.stringify({ blocks }) },
        true
      );
      await refreshBootstrap();
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2600);
    } catch (err: any) {
      alert(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('确定要将主页恢复为 StampsBox 默认布局吗？')) return;
    const res = await apiRequest<{ blocks: PageBlock[] }>(
      '/api/admin/layout/home/reset',
      { method: 'POST' },
      true
    );
    setBlocks(res.blocks);
    setSelectedId(res.blocks[0]?.id || null);
    await refreshBootstrap();
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiRequest<{ url: string }>('/api/admin/media/upload', { method: 'POST', body: fd }, true);
    return res.url;
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-semibold text-[#17263b] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#db1215]" />
            <span>主页拖拽布局装修器 Visual Page Builder</span>
          </h1>
          <p className="text-[12.5px] text-[#666]">
            直接拖动左侧模块手柄调整首页展示顺序，支持实时预览与一键发布到前台
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-[8px] border border-[#e2e8f0] p-0.5 bg-[#f8fafc]">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 rounded-[6px] text-[12.5px] font-semibold cursor-pointer ${
                viewMode === 'edit' ? 'bg-white text-[#17263b] shadow-xs' : 'text-[#64748b]'
              }`}
            >
              拖拽编排
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-[6px] text-[12.5px] font-semibold cursor-pointer ${
                viewMode === 'preview' ? 'bg-white text-[#17263b] shadow-xs' : 'text-[#64748b]'
              }`}
            >
              实时预览
            </button>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-[8px] border border-[#dcdcdc] hover:border-[#17263b] text-[12.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>恢复默认</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 rounded-[8px] bg-[#1a44c2] hover:bg-[#14369e] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            {savedNotice ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saving ? '发布中...' : savedNotice ? '已发布生效!' : '保存并发布'}</span>
          </button>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-[8px] bg-[#17263b] text-white text-[12.5px] font-medium inline-flex items-center gap-1.5"
          >
            <span>打开前台</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {viewMode === 'preview' ? (
        <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#efefef] pb-3">
            <span className="text-[13px] font-semibold text-[#17263b]">
              实时渲染预览（点击“保存并发布”同步给所有访客）
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-2 rounded-[6px] border cursor-pointer ${
                  previewDevice === 'desktop'
                    ? 'border-[#17263b] bg-[#17263b] text-white'
                    : 'border-[#e5e7eb] text-[#666]'
                }`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-2 rounded-[6px] border cursor-pointer ${
                  previewDevice === 'mobile'
                    ? 'border-[#17263b] bg-[#17263b] text-white'
                    : 'border-[#e5e7eb] text-[#666]'
                }`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            className={`mx-auto border border-[#e5e7eb] rounded-[10px] bg-white overflow-y-auto max-h-[72vh] pb-10 transition-all ${
              previewDevice === 'mobile' ? 'max-w-[400px]' : 'w-full'
            }`}
          >
            <BlockRenderer
              blocks={blocks}
              categories={categories}
              products={previewProducts}
              articles={previewArticles}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_370px] gap-4 items-start">
          {/* Column 1: Component Library */}
          <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 space-y-3">
            <h2 className="text-[14px] font-semibold text-[#17263b]">可添加组件库</h2>
            <p className="text-[11.5px] text-[#777]">点击任意模块即可添加到首页画布</p>
            <div className="space-y-2">
              {BLOCK_CATALOG.map((tpl) => (
                <button
                  key={tpl.type}
                  type="button"
                  onClick={() => addBlock(tpl)}
                  className="w-full text-left p-3 rounded-[8px] border border-[#e8e8e8] hover:border-[#1a44c2] hover:bg-blue-50/30 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#1a1a1a] group-hover:text-[#1a44c2]">
                      {tpl.label}
                    </span>
                    <Plus className="w-4 h-4 text-[#999] group-hover:text-[#1a44c2]" />
                  </div>
                  <p className="text-[11.5px] text-[#777] mt-1 leading-snug">{tpl.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Column 2: Draggable Sortable Canvas */}
          <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-[#17263b]">
                当前首页布局画布 ({blocks.length} 个模块)
              </h2>
              <span className="text-[11.5px] text-[#888]">按住 ⠿ 手柄上下拖拽</span>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5">
                  {blocks.map((block) => (
                    <SortableBlockRow
                      key={block.id}
                      block={block}
                      selected={block.id === selectedId}
                      onSelect={() => setSelectedId(block.id)}
                      onToggleVisible={() =>
                        setBlocks((prev) =>
                          prev.map((b) => (b.id === block.id ? { ...b, visible: !b.visible } : b))
                        )
                      }
                      onDuplicate={() => {
                        const copy: PageBlock = {
                          ...JSON.parse(JSON.stringify(block)),
                          id: `blk-${block.type}-${Date.now()}`,
                          label: `${block.label} (副本)`,
                        };
                        const idx = blocks.findIndex((b) => b.id === block.id);
                        const next = [...blocks];
                        next.splice(idx + 1, 0, copy);
                        setBlocks(next);
                        setSelectedId(copy.id);
                      }}
                      onDelete={() => {
                        setBlocks((prev) => prev.filter((b) => b.id !== block.id));
                        if (selectedId === block.id) setSelectedId(null);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {blocks.length === 0 && (
              <div className="py-16 text-center text-sm text-[#888] border border-dashed border-[#dcdcdc] rounded-[10px]">
                画布为空，请从左侧组件库点击添加模块
              </div>
            )}
          </div>

          {/* Column 3: Property Inspector */}
          <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 space-y-4 lg:sticky lg:top-20 max-h-[82vh] overflow-y-auto">
            <h2 className="text-[14px] font-semibold text-[#17263b] border-b border-[#efefef] pb-2.5">
              模块属性编辑 Inspector
            </h2>

            {!selectedBlock ? (
              <p className="text-[13px] text-[#888] py-10 text-center">
                请在中间画布点击选择一个模块进行编辑
              </p>
            ) : (
              <div className="space-y-4 text-[13px]">
                <div>
                  <label className="block text-[12px] font-medium text-[#555] mb-1">
                    模块内部名称
                  </label>
                  <input
                    type="text"
                    value={selectedBlock.label}
                    onChange={(e) => updateBlockLabel(e.target.value)}
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2 outline-none focus:border-[#1a44c2]"
                  />
                </div>

                {/* HERO SLIDER INSPECTOR */}
                {selectedBlock.type === 'hero_slider' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-medium text-[#555] mb-1">
                        顶部小标签 Kicker
                      </label>
                      <input
                        type="text"
                        value={selectedBlock.props.kicker || ''}
                        onChange={(e) => updateBlockProps({ kicker: e.target.value })}
                        className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#17263b]">轮播幻灯片列表</span>
                        <button
                          type="button"
                          onClick={() => {
                            const slides = [...(selectedBlock.props.slides || [])];
                            slides.push({
                              id: `s-${Date.now()}`,
                              tabLabel: 'New Slide',
                              title: 'NEW COLLECTION',
                              subtitle: 'Describe this featured stamp collection.',
                              ctaText: 'Shop collection',
                              ctaLink: '/shop',
                              imageUrl: '/uploads/seed/hero-flag.png',
                            });
                            updateBlockProps({ slides });
                          }}
                          className="text-[12px] text-[#1a44c2] font-semibold hover:underline cursor-pointer"
                        >
                          + 添加幻灯片
                        </button>
                      </div>

                      {(selectedBlock.props.slides || []).map((slide: HeroSlide, sIdx: number) => {
                        const updateSlide = (patch: Partial<HeroSlide>) => {
                          const slides = [...(selectedBlock.props.slides || [])];
                          slides[sIdx] = { ...slides[sIdx], ...patch };
                          updateBlockProps({ slides });
                        };
                        return (
                          <div
                            key={slide.id || sIdx}
                            className="p-3 rounded-[8px] border border-[#e5e7eb] bg-[#fafafa] space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-bold text-[#17263b]">
                                Slide #{sIdx + 1}
                              </span>
                              {(selectedBlock.props.slides || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const slides = (selectedBlock.props.slides || []).filter(
                                      (_: any, idx: number) => idx !== sIdx
                                    );
                                    updateBlockProps({ slides });
                                  }}
                                  className="text-[11.5px] text-[#db1215] hover:underline cursor-pointer"
                                >
                                  删除
                                </button>
                              )}
                            </div>

                            <input
                              type="text"
                              placeholder="底部切换 Tab 名称"
                              value={slide.tabLabel}
                              onChange={(e) => updateSlide({ tabLabel: e.target.value })}
                              className="w-full bg-white border border-[#dcdcdc] rounded px-2.5 py-1.5 text-[12.5px]"
                            />
                            <input
                              type="text"
                              placeholder="主标题 H1"
                              value={slide.title}
                              onChange={(e) => updateSlide({ title: e.target.value })}
                              className="w-full bg-white border border-[#dcdcdc] rounded px-2.5 py-1.5 text-[12.5px]"
                            />
                            <textarea
                              rows={2}
                              placeholder="副标题文案"
                              value={slide.subtitle}
                              onChange={(e) => updateSlide({ subtitle: e.target.value })}
                              className="w-full bg-white border border-[#dcdcdc] rounded px-2.5 py-1.5 text-[12.5px]"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="按钮文字"
                                value={slide.ctaText}
                                onChange={(e) => updateSlide({ ctaText: e.target.value })}
                                className="bg-white border border-[#dcdcdc] rounded px-2.5 py-1.5 text-[12px]"
                              />
                              <input
                                type="text"
                                placeholder="跳转链接"
                                value={slide.ctaLink}
                                onChange={(e) => updateSlide({ ctaLink: e.target.value })}
                                className="bg-white border border-[#dcdcdc] rounded px-2.5 py-1.5 text-[12px]"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="图片 URL"
                                value={slide.imageUrl}
                                onChange={(e) => updateSlide({ imageUrl: e.target.value })}
                                className="flex-1 bg-white border border-[#dcdcdc] rounded px-2.5 py-1.5 text-[12px]"
                              />
                              <label className="px-2.5 py-1.5 rounded bg-white border border-[#dcdcdc] hover:border-[#17263b] cursor-pointer inline-flex items-center gap-1 text-[11.5px]">
                                <Upload className="w-3.5 h-3.5" />
                                <span>上传</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    const url = await uploadImage(f);
                                    updateSlide({ imageUrl: url });
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* CATEGORY GRID INSPECTOR */}
                {selectedBlock.type === 'category_grid' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#555] mb-1">区块标题</label>
                      <input
                        type="text"
                        value={selectedBlock.props.heading || ''}
                        onChange={(e) => updateBlockProps({ heading: e.target.value })}
                        className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#555] mb-1">副标题（选填）</label>
                      <input
                        type="text"
                        value={selectedBlock.props.subheading || ''}
                        onChange={(e) => updateBlockProps({ subheading: e.target.value })}
                        className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium text-[#555] mb-1">桌面端列数</label>
                        <select
                          value={selectedBlock.props.columns || 4}
                          onChange={(e) => updateBlockProps({ columns: Number(e.target.value) })}
                          className="w-full border border-[#dcdcdc] rounded-[6px] px-2.5 py-2"
                        >
                          <option value={3}>3 列</option>
                          <option value={4}>4 列</option>
                          <option value={5}>5 列</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#555] mb-1">最多显示数量</label>
                        <input
                          type="number"
                          min={2}
                          max={16}
                          value={selectedBlock.props.maxItems || 8}
                          onChange={(e) => updateBlockProps({ maxItems: Number(e.target.value) })}
                          className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PRODUCT SHOWCASE INSPECTOR */}
                {selectedBlock.type === 'product_showcase' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#555] mb-1">区块标题（留空即隐藏）</label>
                      <input
                        type="text"
                        value={selectedBlock.props.heading || ''}
                        onChange={(e) => updateBlockProps({ heading: e.target.value })}
                        className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBlock.props.showFilterPills !== false}
                        onChange={(e) => updateBlockProps({ showFilterPills: e.target.checked })}
                      />
                      <span>显示分类筛选胶囊栏</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium text-[#555] mb-1">默认选中筛选</label>
                        <select
                          value={selectedBlock.props.defaultFilter || 'bestseller'}
                          onChange={(e) => updateBlockProps({ defaultFilter: e.target.value })}
                          className="w-full border border-[#dcdcdc] rounded-[6px] px-2.5 py-2"
                        >
                          <option value="all">All</option>
                          <option value="bestseller">Best Seller</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.slug}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#555] mb-1">桌面端列数</label>
                        <select
                          value={selectedBlock.props.columns || 5}
                          onChange={(e) => updateBlockProps({ columns: Number(e.target.value) })}
                          className="w-full border border-[#dcdcdc] rounded-[6px] px-2.5 py-2"
                        >
                          <option value={3}>3 列</option>
                          <option value={4}>4 列</option>
                          <option value={5}>5 列</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium text-[#555] mb-1">展示商品上限</label>
                        <input
                          type="number"
                          min={2}
                          max={30}
                          value={selectedBlock.props.maxItems || 10}
                          onChange={(e) => updateBlockProps({ maxItems: Number(e.target.value) })}
                          className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#555] mb-1">底部按钮文字</label>
                        <input
                          type="text"
                          value={selectedBlock.props.ctaText || ''}
                          onChange={(e) => updateBlockProps({ ctaText: e.target.value })}
                          className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* PROMO BANNER INSPECTOR */}
                {selectedBlock.type === 'promo_banner' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#555] mb-1">顶部角标文字</label>
                      <input
                        type="text"
                        value={selectedBlock.props.badge || ''}
                        onChange={(e) => updateBlockProps({ badge: e.target.value })}
                        className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#555] mb-1">主标题</label>
                      <input
                        type="text"
                        value={selectedBlock.props.title || ''}
                        onChange={(e) => updateBlockProps({ title: e.target.value })}
                        className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#555] mb-1">副标题</label>
                      <textarea
                        rows={2}
                        value={selectedBlock.props.subtitle || ''}
                        onChange={(e) => updateBlockProps({ subtitle: e.target.value })}
                        className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] font-medium text-[#555] mb-1">背景色</label>
                        <input
                          type="color"
                          value={selectedBlock.props.bgColor || '#17263b'}
                          onChange={(e) => updateBlockProps({ bgColor: e.target.value })}
                          className="w-full h-9 rounded border border-[#dcdcdc]"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-[#555] mb-1">角标强调色</label>
                        <input
                          type="color"
                          value={selectedBlock.props.accentColor || '#f04444'}
                          onChange={(e) => updateBlockProps({ accentColor: e.target.value })}
                          className="w-full h-9 rounded border border-[#dcdcdc]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="按钮文字"
                        value={selectedBlock.props.ctaText || ''}
                        onChange={(e) => updateBlockProps({ ctaText: e.target.value })}
                        className="border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="跳转路径"
                        value={selectedBlock.props.ctaLink || ''}
                        onChange={(e) => updateBlockProps({ ctaLink: e.target.value })}
                        className="border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                    </div>
                  </div>
                )}

                {/* EDITORIAL GRID INSPECTOR */}
                {selectedBlock.type === 'editorial_grid' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#555] mb-1">区块标题</label>
                      <input
                        type="text"
                        value={selectedBlock.props.heading || ''}
                        onChange={(e) => updateBlockProps({ heading: e.target.value })}
                        className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#555] mb-1">显示文章数量</label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={selectedBlock.props.maxItems || 3}
                        onChange={(e) => updateBlockProps({ maxItems: Number(e.target.value) })}
                        className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                    </div>
                  </div>
                )}

                {/* BRAND STORY INSPECTOR */}
                {selectedBlock.type === 'brand_story' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#555] mb-1">标题</label>
                      <input
                        type="text"
                        value={selectedBlock.props.heading || ''}
                        onChange={(e) => updateBlockProps({ heading: e.target.value })}
                        className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-[#555] mb-1">
                        正文段落（空行分段）
                      </label>
                      <textarea
                        rows={6}
                        value={(selectedBlock.props.paragraphs || []).join('\n\n')}
                        onChange={(e) =>
                          updateBlockProps({
                            paragraphs: e.target.value.split(/\n\s*\n/).filter(Boolean),
                          })
                        }
                        className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="按钮文字"
                        value={selectedBlock.props.ctaText || ''}
                        onChange={(e) => updateBlockProps({ ctaText: e.target.value })}
                        className="border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="跳转路径"
                        value={selectedBlock.props.ctaLink || ''}
                        onChange={(e) => updateBlockProps({ ctaLink: e.target.value })}
                        className="border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                      />
                    </div>
                  </div>
                )}

                {/* TRUST BADGES INSPECTOR */}
                {selectedBlock.type === 'trust_badges' && (
                  <div className="space-y-2.5">
                    <p className="text-[12px] text-[#666]">编辑 4 项信任保障卡片文案：</p>
                    {(selectedBlock.props.items || []).map((it: any, idx: number) => (
                      <div key={idx} className="p-2.5 border border-[#e5e7eb] rounded-[6px] space-y-1.5">
                        <input
                          type="text"
                          value={it.title}
                          onChange={(e) => {
                            const items = [...selectedBlock.props.items];
                            items[idx] = { ...items[idx], title: e.target.value };
                            updateBlockProps({ items });
                          }}
                          className="w-full border border-[#dcdcdc] rounded px-2.5 py-1 text-[12.5px] font-medium"
                        />
                        <input
                          type="text"
                          value={it.desc}
                          onChange={(e) => {
                            const items = [...selectedBlock.props.items];
                            items[idx] = { ...items[idx], desc: e.target.value };
                            updateBlockProps({ items });
                          }}
                          className="w-full border border-[#dcdcdc] rounded px-2.5 py-1 text-[12px]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
