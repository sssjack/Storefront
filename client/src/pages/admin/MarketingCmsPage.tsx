import React, { useEffect, useState } from 'react';
import { Tag, FileText, HelpCircle, Mail, Users, Plus, Trash2, Check, Download } from 'lucide-react';
import { apiRequest } from '../../lib/api';

type Tab = 'coupons' | 'articles' | 'faqs' | 'inquiries' | 'subscribers';

export function MarketingCmsPage() {
  const [tab, setTab] = useState<Tab>('coupons');
  const [coupons, setCoupons] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);

  const [newCoupon, setNewCoupon] = useState({ code: '', type: 'percentage', value: 10, minOrderAmount: 0 });
  const [newArticle, setNewArticle] = useState({
    title: '',
    categoryTag: 'Stamp Guide',
    excerpt: '',
    content: '',
    coverImage: '/uploads/seed/hero-flag.png',
  });
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: 'General' });

  const loadAll = async () => {
    const [c, a, f, i, s] = await Promise.all([
      apiRequest<{ items: any[] }>('/api/admin/coupons', {}, true),
      apiRequest<{ items: any[] }>('/api/admin/articles', {}, true),
      apiRequest<{ items: any[] }>('/api/admin/faqs', {}, true),
      apiRequest<{ items: any[] }>('/api/admin/inquiries', {}, true),
      apiRequest<{ items: any[] }>('/api/admin/subscribers', {}, true),
    ]);
    setCoupons(c.items);
    setArticles(a.items);
    setFaqs(f.items);
    setInquiries(i.items);
    setSubscribers(s.items);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const exportSubscribersCsv = () => {
    const csv = ['email,subscribed_at', ...subscribers.map((s) => `${s.email},${s.created_at}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stampsbox-subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-[#17263b]">营销与内容管理 Marketing & CMS</h1>
        <p className="text-[13px] text-[#666]">管理折扣优惠券、Stamp Guide 博客资讯、FAQ 问答、客户咨询与邮件订阅名单</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'coupons', label: `优惠券 (${coupons.length})`, icon: Tag },
          { id: 'articles', label: `资讯文章 (${articles.length})`, icon: FileText },
          { id: 'faqs', label: `FAQ 问答 (${faqs.length})`, icon: HelpCircle },
          { id: 'inquiries', label: `客户咨询 (${inquiries.filter((x) => x.status === 'unread').length} 未读)`, icon: Mail },
          { id: 'subscribers', label: `邮件订阅 (${subscribers.length})`, icon: Users },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as Tab)}
              className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                tab === t.id
                  ? 'bg-[#17263b] text-white'
                  : 'bg-white border border-[#e5e7eb] text-[#444] hover:border-[#17263b]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* COUPONS TAB */}
      {tab === 'coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 items-start">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await apiRequest('/api/admin/coupons', { method: 'POST', body: JSON.stringify(newCoupon) }, true);
              setNewCoupon({ code: '', type: 'percentage', value: 10, minOrderAmount: 0 });
              loadAll();
            }}
            className="bg-white rounded-[10px] border border-[#e5e7eb] p-5 space-y-3 text-[13px]"
          >
            <h2 className="font-semibold text-[15px] text-[#17263b]">新建优惠码</h2>
            <input
              type="text"
              required
              placeholder="优惠码 (如 SPRING15)"
              value={newCoupon.code}
              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
              className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2 uppercase font-mono"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <select
                value={newCoupon.type}
                onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })}
                className="border border-[#dcdcdc] rounded-[6px] px-2.5 py-2"
              >
                <option value="percentage">百分比折扣 %</option>
                <option value="fixed">满减金额 $</option>
              </select>
              <input
                type="number"
                step="0.01"
                required
                value={newCoupon.value}
                onChange={(e) => setNewCoupon({ ...newCoupon, value: Number(e.target.value) })}
                placeholder="折扣值"
                className="border border-[#dcdcdc] rounded-[6px] px-3 py-2"
              />
            </div>
            <div>
              <label className="text-[11.5px] text-[#666]">最低订单金额门槛 ($)</label>
              <input
                type="number"
                step="0.01"
                value={newCoupon.minOrderAmount}
                onChange={(e) => setNewCoupon({ ...newCoupon, minOrderAmount: Number(e.target.value) })}
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2 mt-1"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-[6px] bg-[#1a44c2] text-white font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> 创建优惠码
            </button>
          </form>

          <div className="bg-white rounded-[10px] border border-[#e5e7eb] divide-y divide-[#f1f5f9]">
            {coupons.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-3 text-[13px]">
                <div>
                  <span className="font-mono font-bold text-[15px] text-[#17263b]">{c.code}</span>
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-[#1a44c2] font-semibold">
                    {c.type === 'percentage' ? `${c.value}% OFF` : `$${c.value} OFF`}
                  </span>
                  <p className="text-[12px] text-[#777] mt-0.5">
                    满 ${c.min_order_amount} 可用 · 已使用 {c.used_count} 次
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await apiRequest(
                        `/api/admin/coupons/${c.id}`,
                        { method: 'PUT', body: JSON.stringify({ isActive: !c.is_active }) },
                        true
                      );
                      loadAll();
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold cursor-pointer ${
                      c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {c.is_active ? '启用中' : '已停用'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiRequest(`/api/admin/coupons/${c.id}`, { method: 'DELETE' }, true);
                      loadAll();
                    }}
                    className="p-1.5 text-[#888] hover:text-[#db1215] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ARTICLES TAB */}
      {tab === 'articles' && (
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5 items-start">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await apiRequest('/api/admin/articles', { method: 'POST', body: JSON.stringify(newArticle) }, true);
              setNewArticle({
                title: '',
                categoryTag: 'Stamp Guide',
                excerpt: '',
                content: '',
                coverImage: '/uploads/seed/hero-flag.png',
              });
              loadAll();
            }}
            className="bg-white rounded-[10px] border border-[#e5e7eb] p-5 space-y-3 text-[13px]"
          >
            <h2 className="font-semibold text-[15px] text-[#17263b]">发布新文章</h2>
            <input
              type="text"
              required
              placeholder="文章标题"
              value={newArticle.title}
              onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
              className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
            />
            <input
              type="text"
              placeholder="标签 (如 Stamp Guide)"
              value={newArticle.categoryTag}
              onChange={(e) => setNewArticle({ ...newArticle, categoryTag: e.target.value })}
              className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
            />
            <input
              type="text"
              placeholder="封面图 URL"
              value={newArticle.coverImage}
              onChange={(e) => setNewArticle({ ...newArticle, coverImage: e.target.value })}
              className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
            />
            <input
              type="text"
              placeholder="摘要 Excerpt"
              value={newArticle.excerpt}
              onChange={(e) => setNewArticle({ ...newArticle, excerpt: e.target.value })}
              className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
            />
            <textarea
              rows={5}
              required
              placeholder="正文内容（空行分段）"
              value={newArticle.content}
              onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
              className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-[6px] bg-[#1a44c2] text-white font-semibold cursor-pointer"
            >
              发布文章
            </button>
          </form>

          <div className="bg-white rounded-[10px] border border-[#e5e7eb] divide-y divide-[#f1f5f9]">
            {articles.map((a) => (
              <div key={a.id} className="p-4 flex items-start justify-between gap-4 text-[13px]">
                <div className="flex gap-3">
                  <img
                    src={a.cover_image || '/uploads/seed/hero-flag.png'}
                    alt=""
                    className="w-20 h-14 rounded-[6px] object-cover bg-[#f5f5f5] shrink-0"
                  />
                  <div>
                    <h3 className="font-semibold text-[#17263b]">{a.title}</h3>
                    <p className="text-[12px] text-[#777] line-clamp-2 mt-0.5">{a.excerpt}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await apiRequest(`/api/admin/articles/${a.id}`, { method: 'DELETE' }, true);
                    loadAll();
                  }}
                  className="p-1.5 text-[#888] hover:text-[#db1215] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQS TAB */}
      {tab === 'faqs' && (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5 items-start">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await apiRequest('/api/admin/faqs', { method: 'POST', body: JSON.stringify(newFaq) }, true);
              setNewFaq({ question: '', answer: '', category: 'General' });
              loadAll();
            }}
            className="bg-white rounded-[10px] border border-[#e5e7eb] p-5 space-y-3 text-[13px]"
          >
            <h2 className="font-semibold text-[15px] text-[#17263b]">新增 FAQ</h2>
            <input
              type="text"
              required
              placeholder="常见问题"
              value={newFaq.question}
              onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
              className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
            />
            <textarea
              rows={4}
              required
              placeholder="官方解答"
              value={newFaq.answer}
              onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
              className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-[6px] bg-[#1a44c2] text-white font-semibold cursor-pointer"
            >
              添加问答
            </button>
          </form>

          <div className="bg-white rounded-[10px] border border-[#e5e7eb] divide-y divide-[#f1f5f9]">
            {faqs.map((f) => (
              <div key={f.id} className="p-4 flex items-start justify-between gap-3 text-[13px]">
                <div>
                  <p className="font-semibold text-[#17263b]">{f.question}</p>
                  <p className="text-[#666] mt-1">{f.answer}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await apiRequest(`/api/admin/faqs/${f.id}`, { method: 'DELETE' }, true);
                    loadAll();
                  }}
                  className="p-1.5 text-[#888] hover:text-[#db1215] cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INQUIRIES TAB */}
      {tab === 'inquiries' && (
        <div className="bg-white rounded-[10px] border border-[#e5e7eb] divide-y divide-[#f1f5f9]">
          {inquiries.map((inq) => (
            <div key={inq.id} className="p-4 flex items-start justify-between gap-4 text-[13px]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#17263b]">{inq.subject || 'Customer Inquiry'}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      inq.status === 'unread'
                        ? 'bg-red-50 text-[#db1215]'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {inq.status === 'unread' ? '未读' : '已处理'}
                  </span>
                </div>
                <p className="text-[12px] text-[#777] mt-0.5">
                  {inq.name} ({inq.email}) · {inq.created_at}
                </p>
                <p className="text-[#333] mt-2">{inq.message}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {inq.status === 'unread' && (
                  <button
                    type="button"
                    onClick={async () => {
                      await apiRequest(
                        `/api/admin/inquiries/${inq.id}`,
                        { method: 'PATCH', body: JSON.stringify({ status: 'replied' }) },
                        true
                      );
                      loadAll();
                    }}
                    className="px-2.5 py-1.5 rounded bg-emerald-50 text-emerald-700 text-[12px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> 标记已处理
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await apiRequest(`/api/admin/inquiries/${inq.id}`, { method: 'DELETE' }, true);
                    loadAll();
                  }}
                  className="p-1.5 text-[#888] hover:text-[#db1215] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {inquiries.length === 0 && <p className="py-10 text-center text-sm text-[#888]">暂无客户留言</p>}
        </div>
      )}

      {/* SUBSCRIBERS TAB */}
      {tab === 'subscribers' && (
        <div className="bg-white rounded-[10px] border border-[#e5e7eb] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#f0f0f0] flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#17263b]">
              邮件订阅用户 ({subscribers.length})
            </span>
            <button
              type="button"
              onClick={exportSubscribersCsv}
              className="px-3 py-1.5 rounded-[6px] border border-[#dcdcdc] hover:border-[#17263b] text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> 导出 CSV
            </button>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            {subscribers.map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between text-[13px]">
                <span>{s.email}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-[#888]">{s.created_at}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiRequest(`/api/admin/subscribers/${s.id}`, { method: 'DELETE' }, true);
                      loadAll();
                    }}
                    className="text-[#888] hover:text-[#db1215] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
