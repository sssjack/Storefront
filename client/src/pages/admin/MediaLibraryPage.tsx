import React, { useEffect, useState } from 'react';
import { Upload, Copy, Trash2, Check } from 'lucide-react';
import { apiRequest } from '../../lib/api';

export function MediaLibraryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const loadMedia = async () => {
    const res = await apiRequest<{ items: any[] }>('/api/admin/media', {}, true);
    setItems(res.items);
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', f);
        await apiRequest('/api/admin/media/upload', { method: 'POST', body: fd }, true);
      }
      await loadMedia();
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#17263b]">媒体素材库 Media Library</h1>
          <p className="text-[13px] text-[#666]">上传商品图、分类封面与首页 Banner，点击即可复制路径复用</p>
        </div>
        <label className="px-4 py-2.5 rounded-[8px] bg-[#1a44c2] hover:bg-[#14369e] text-white text-[13.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer">
          <Upload className="w-4 h-4" />
          <span>{uploading ? '上传中...' : '上传新图片'}</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((it) => (
          <div
            key={it.id}
            className="bg-white rounded-[10px] border border-[#e5e7eb] overflow-hidden flex flex-col"
          >
            <div className="aspect-square bg-[#f5f5f5] overflow-hidden">
              <img src={it.url} alt={it.original_name} className="w-full h-full object-cover" />
            </div>
            <div className="p-2.5 flex items-center justify-between gap-1 text-[11.5px]">
              <span className="truncate text-[#555]" title={it.original_name}>
                {it.original_name}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => copyUrl(it.url)}
                  title="复制图片路径"
                  className="p-1 rounded hover:bg-[#f1f5f9] text-[#17263b] cursor-pointer"
                >
                  {copiedUrl === it.url ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                {!it.isSeed && (
                  <button
                    type="button"
                    onClick={async () => {
                      await apiRequest(`/api/admin/media/${it.id}`, { method: 'DELETE' }, true);
                      loadMedia();
                    }}
                    className="p-1 rounded hover:bg-red-50 text-[#888] hover:text-[#db1215] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
