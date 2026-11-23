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
import { GripVertical, Plus, Edit3, Trash2, Eye, EyeOff, Upload, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import type { Category } from '../../types';

function SortableCategoryRow({
  cat,
  onEdit,
  onToggleVisible,
  onDelete,
}: {
  cat: Category;
  onEdit: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cat.id,
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
      className={`bg-white border border-[#e5e7eb] rounded-[10px] p-3.5 flex items-center gap-3.5 ${
        !cat.isVisible ? 'opacity-60' : ''
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1.5 rounded hover:bg-[#f1f5f9] text-[#94a3b8] hover:text-[#17263b] cursor-grab active:cursor-grabbing"
        title="拖拽调整分类展示顺序"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <img
        src={cat.imageUrl || '/uploads/seed/prod-us-flag-roll.png'}
        alt={cat.name}
        className="w-12 h-12 rounded-[8px] bg-[#f5f5f5] object-cover border border-[#ececec] shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[14.5px] font-semibold text-[#17263b]">{cat.name}</h3>
          <span className="text-[11px] font-mono text-[#888]">/{cat.slug}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#475569] font-medium">
            {cat.productCount} 件商品
          </span>
        </div>
        <p className="text-[12.5px] text-[#666] truncate mt-0.5">{cat.description || '无描述'}</p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleVisible}
          title={cat.isVisible ? '前台显示中（点击隐藏）' : '已隐藏（点击显示）'}
          className={`p-2 rounded-[6px] cursor-pointer ${
            cat.isVisible
              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              : 'text-[#888] bg-[#f5f5f5] hover:bg-[#e5e7eb]'
          }`}
        >
          {cat.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="p-2 rounded-[6px] hover:bg-[#f1f5f9] text-[#17263b] cursor-pointer"
          title="编辑分类"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 rounded-[6px] hover:bg-red-50 text-[#888] hover:text-[#db1215] cursor-pointer"
          title="删除分类"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function CategoriesPage() {
  const { refreshBootstrap } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    isVisible: true,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadCategories = async () => {
    const res = await apiRequest<{ items: Category[] }>('/api/admin/categories', {}, true);
    setCategories(res.items);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = categories.findIndex((c) => c.id === active.id);
      const newIdx = categories.findIndex((c) => c.id === over.id);
      const reordered = arrayMove(categories, oldIdx, newIdx);
      setCategories(reordered);
      await apiRequest(
        '/api/admin/categories/reorder',
        { method: 'PUT', body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }) },
        true
      );
      refreshBootstrap();
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', slug: '', description: '', imageUrl: '', isVisible: true });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      isVisible: cat.isVisible !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await apiRequest(`/api/admin/categories/${editingId}`, { method: 'PUT', body: JSON.stringify(form) }, true);
    } else {
      await apiRequest('/api/admin/categories', { method: 'POST', body: JSON.stringify(form) }, true);
    }
    setModalOpen(false);
    await loadCategories();
    refreshBootstrap();
  };

  const handleToggleVisible = async (cat: Category) => {
    await apiRequest(
      `/api/admin/categories/${cat.id}`,
      { method: 'PUT', body: JSON.stringify({ isVisible: !cat.isVisible }) },
      true
    );
    await loadCategories();
    refreshBootstrap();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该分类吗？（其下商品不会删除，将变为未分类）')) return;
    await apiRequest(`/api/admin/categories/${id}`, { method: 'DELETE' }, true);
    await loadCategories();
    refreshBootstrap();
  };

  const handleUploadCover = async (file: File | undefined) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiRequest<{ url: string }>('/api/admin/media/upload', { method: 'POST', body: fd }, true);
    setForm((prev) => ({ ...prev, imageUrl: res.url }));
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#17263b]">分类管理 Categories</h1>
          <p className="text-[13px] text-[#666]">
            拖拽手柄调整排序，实时同步至首页「Shop by Category」、筛选胶囊、顶部导航与页脚
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2.5 rounded-[8px] bg-[#1a44c2] hover:bg-[#14369e] text-white text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>新增分类</span>
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2.5">
            {categories.map((cat) => (
              <SortableCategoryRow
                key={cat.id}
                cat={cat}
                onEdit={() => openEdit(cat)}
                onToggleVisible={() => handleToggleVisible(cat)}
                onDelete={() => handleDelete(cat.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 bg-white rounded-[12px] max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-semibold text-[#17263b]">
                {editingId ? '编辑分类' : '新增分类'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-[13.5px]">
              <div>
                <label className="block text-[12px] font-semibold text-[#444] mb-1">分类名称 *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
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
              <div>
                <label className="block text-[12px] font-semibold text-[#444] mb-1">分类简介</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#444] mb-1">封面图</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="/uploads/..."
                    className="flex-1 border border-[#dcdcdc] rounded-[6px] px-3 py-2 text-[12.5px]"
                  />
                  <label className="px-3 py-2 rounded-[6px] border border-[#dcdcdc] hover:border-[#17263b] cursor-pointer inline-flex items-center gap-1 text-[12px] font-medium">
                    <Upload className="w-3.5 h-3.5" />
                    <span>上传</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadCover(e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isVisible}
                  onChange={(e) => setForm({ ...form, isVisible: e.target.checked })}
                />
                <span>在前台导航与首页分类宫格显示</span>
              </label>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-[6px] border border-[#dcdcdc] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[6px] bg-[#1a44c2] text-white font-semibold cursor-pointer"
                >
                  保存分类
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
