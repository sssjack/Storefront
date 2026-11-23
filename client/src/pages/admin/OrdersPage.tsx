import React, { useEffect, useState } from 'react';
import { Search, Eye, X, Truck, CreditCard } from 'lucide-react';
import { apiRequest } from '../../lib/api';

const ORDER_STATUSES = ['all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    status: 'paid',
    paymentStatus: 'paid',
    trackingCarrier: '',
    trackingNumber: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const loadOrders = async () => {
    const qs = new URLSearchParams();
    if (status !== 'all') qs.set('status', status);
    if (search.trim()) qs.set('search', search.trim());
    const res = await apiRequest<{ items: any[] }>(`/api/admin/orders?${qs.toString()}`, {}, true);
    setOrders(res.items);
  };

  useEffect(() => {
    loadOrders();
  }, [status]);

  const openDetail = (o: any) => {
    setSelected(o);
    setEditForm({
      status: o.status,
      paymentStatus: o.paymentStatus,
      trackingCarrier: o.trackingCarrier || 'USPS First-Class',
      trackingNumber: o.trackingNumber || '',
      notes: o.notes || '',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await apiRequest(
        `/api/admin/orders/${selected.id}`,
        { method: 'PUT', body: JSON.stringify(editForm) },
        true
      );
      setSelected(null);
      await loadOrders();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-[#17263b]">订单管理 Orders</h1>
        <p className="text-[13px] text-[#666]">查看 PayPal 收款流水、更新履约状态与录入 USPS 物流单号</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {ORDER_STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatus(st)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold capitalize cursor-pointer ${
                status === st
                  ? 'bg-[#17263b] text-white'
                  : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[#888] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
              placeholder="搜索订单号/客户/邮箱..."
              className="pl-9 pr-3 py-1.5 border border-[#dcdcdc] rounded-[6px] text-[13px]"
            />
          </div>
          <button
            type="button"
            onClick={loadOrders}
            className="px-3.5 py-1.5 rounded-[6px] bg-[#17263b] text-white text-[13px] cursor-pointer"
          >
            查询
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#f8fafc] text-[#64748b] text-[12px] uppercase">
              <tr>
                <th className="px-5 py-3">订单号</th>
                <th className="px-5 py-3">客户信息</th>
                <th className="px-5 py-3">商品数</th>
                <th className="px-5 py-3">实付金额</th>
                <th className="px-5 py-3">PayPal 支付</th>
                <th className="px-5 py-3">履约状态</th>
                <th className="px-5 py-3">物流单号</th>
                <th className="px-5 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-[#fafafa]">
                  <td className="px-5 py-3 font-mono font-semibold text-[#17263b]">{o.orderNumber}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{o.customerName}</div>
                    <div className="text-[11.5px] text-[#888]">{o.customerEmail}</div>
                  </td>
                  <td className="px-5 py-3">{o.items.length} 项</td>
                  <td className="px-5 py-3 font-semibold">${Number(o.total).toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                        o.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {o.paymentStatus} · {o.paypalMode}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-slate-100 text-[#17263b] capitalize">
                      {o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] text-[#555]">
                    {o.trackingNumber || '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(o)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[6px] border border-[#dcdcdc] hover:border-[#17263b] text-[12px] font-semibold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>详情 / 发货</span>
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#888]">
                    暂无订单数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/45" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full max-w-xl bg-white h-full overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#efefef] pb-4">
              <div>
                <h2 className="text-[19px] font-bold text-[#17263b]">{selected.orderNumber}</h2>
                <p className="text-[12px] text-[#888]">{selected.createdAt}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
              <div className="p-3.5 rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0]">
                <p className="font-semibold text-[#17263b] mb-1">收货人信息</p>
                <p>{selected.customerName}</p>
                <p className="text-[#666]">{selected.customerEmail}</p>
                {selected.customerPhone && <p className="text-[#666]">{selected.customerPhone}</p>}
                <p className="text-[#555] mt-1.5">
                  {selected.shippingAddress.line1} {selected.shippingAddress.line2}
                  <br />
                  {selected.shippingAddress.city}, {selected.shippingAddress.state}{' '}
                  {selected.shippingAddress.postalCode}
                </p>
              </div>
              <div className="p-3.5 rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0]">
                <p className="font-semibold text-[#17263b] mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" /> PayPal 交易详情
                </p>
                <p>模式：{selected.paypalMode?.toUpperCase()}</p>
                <p>状态：{selected.paymentStatus}</p>
                <p className="font-mono text-[11.5px] break-all mt-1">
                  Order: {selected.paypalOrderId || '—'}
                </p>
                <p className="font-mono text-[11.5px] break-all">
                  Capture: {selected.paypalCaptureId || '—'}
                </p>
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-[#e8e8e8] rounded-[8px] divide-y divide-[#efefef] text-[13px]">
              {selected.items.map((it: any, idx: number) => (
                <div key={idx} className="p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{it.title}</p>
                    <p className="text-[11.5px] text-[#777]">
                      {it.variantName} × {it.quantity}
                    </p>
                  </div>
                  <span className="font-semibold">${(it.unitPrice * it.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="p-3 bg-[#fafafa] space-y-1 text-right">
                <p className="text-[#666]">小计：${Number(selected.subtotal).toFixed(2)}</p>
                {selected.discountAmount > 0 && (
                  <p className="text-emerald-700">
                    优惠 ({selected.couponCode})：-${Number(selected.discountAmount).toFixed(2)}
                  </p>
                )}
                <p className="text-[#666]">运费：${Number(selected.shippingFee).toFixed(2)}</p>
                <p className="text-[16px] font-bold text-[#17263b]">
                  合计：${Number(selected.total).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Update Fulfillment Form */}
            <form onSubmit={handleUpdate} className="space-y-4 text-[13.5px] pt-2 border-t border-[#efefef]">
              <h3 className="font-semibold text-[#17263b] flex items-center gap-1.5">
                <Truck className="w-4 h-4" /> 更新订单状态与物流单号
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#555] mb-1">履约状态</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                  >
                    {ORDER_STATUSES.filter((s) => s !== 'all').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#555] mb-1">支付状态</label>
                  <select
                    value={editForm.paymentStatus}
                    onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                  >
                    <option value="unpaid">unpaid</option>
                    <option value="paid">paid</option>
                    <option value="refunded">refunded</option>
                    <option value="failed">failed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#555] mb-1">承运商 Carrier</label>
                  <input
                    type="text"
                    value={editForm.trackingCarrier}
                    onChange={(e) => setEditForm({ ...editForm, trackingCarrier: e.target.value })}
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#555] mb-1">物流单号 Tracking #</label>
                  <input
                    type="text"
                    value={editForm.trackingNumber}
                    onChange={(e) => setEditForm({ ...editForm, trackingNumber: e.target.value })}
                    placeholder="94001118..."
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2 font-mono text-[12.5px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#555] mb-1">内部备注</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-[8px] bg-[#1a44c2] hover:bg-[#14369e] text-white font-semibold cursor-pointer"
              >
                {saving ? '保存中...' : '保存订单更新'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
