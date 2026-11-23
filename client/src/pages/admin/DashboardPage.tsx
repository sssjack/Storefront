import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  Mail,
  CreditCard,
  Layers,
  ArrowRight,
  Users,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';

export function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/admin/dashboard', {}, true)
      .then((res) => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="py-16 text-center text-sm text-[#888]">正在加载数据概览...</div>;
  }

  const { kpis, recentOrders, dailySeries, lowStock, paypalStatus } = data;
  const maxRev = Math.max(1, ...dailySeries.map((d: any) => Number(d.revenue || 0)));

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#17263b]">站点数据概览 Dashboard</h1>
          <p className="text-[13px] text-[#666]">实时监控销售额、订单履约、商品库存与支付接口状态</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/builder"
            className="px-4 py-2 rounded-[8px] bg-[#17263b] hover:bg-[#1a44c2] text-white text-[13px] font-semibold inline-flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4" />
            <span>拖拽装修主页</span>
          </Link>
          <Link
            to="/admin/products"
            className="px-4 py-2 rounded-[8px] bg-white border border-[#dcdcdc] hover:border-[#17263b] text-[#17263b] text-[13px] font-semibold"
          >
            + 上传新商品
          </Link>
        </div>
      </div>

      {/* PayPal Reserved Notice Banner */}
      <div
        className={`rounded-[10px] p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          paypalStatus.isConfigured
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-[13px]">
            <p className="font-semibold">
              PayPal 支付状态：
              {paypalStatus.isConfigured
                ? `已配置真实凭证 (${paypalStatus.mode.toUpperCase()} 模式)`
                : '接口已预留（当前处于演示模拟模式）'}
            </p>
            <p className="opacity-85 mt-0.5">
              {paypalStatus.isConfigured
                ? '前台结账页已自动启用官方 PayPal Smart Payment Buttons。'
                : '获取 PayPal Developer Client ID 与 Secret 后，在支付设置中填写即可一键上线真实收款。'}
            </p>
          </div>
        </div>
        <Link
          to="/admin/settings"
          className="px-3.5 py-1.5 rounded-[6px] bg-white border border-current/20 text-[12.5px] font-semibold shrink-0 inline-flex items-center gap-1 hover:opacity-80"
        >
          <span>前往 PayPal 设置</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-[#666] font-medium">已收款总营收</span>
            <span className="w-9 h-9 rounded-[8px] bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>
          <p className="text-[26px] font-bold text-[#17263b] mt-2">
            ${kpis.totalRevenue.toFixed(2)}
          </p>
          <p className="text-[12px] text-[#888] mt-1">来自 {kpis.totalOrders} 笔订单</p>
        </div>

        <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-[#666] font-medium">待处理 / 待发货订单</span>
            <span className="w-9 h-9 rounded-[8px] bg-blue-50 text-[#1a44c2] flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </span>
          </div>
          <p className="text-[26px] font-bold text-[#17263b] mt-2">{kpis.pendingFulfillment}</p>
          <p className="text-[12px] text-[#888] mt-1">订单总数：{kpis.totalOrders}</p>
        </div>

        <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-[#666] font-medium">在售商品 / 分类</span>
            <span className="w-9 h-9 rounded-[8px] bg-red-50 text-[#db1215] flex items-center justify-center">
              <Package className="w-5 h-5" />
            </span>
          </div>
          <p className="text-[26px] font-bold text-[#17263b] mt-2">
            {kpis.publishedProducts}{' '}
            <span className="text-[14px] font-normal text-[#888]">/ {kpis.totalProducts}</span>
          </p>
          <p className="text-[12px] text-[#888] mt-1">
            草稿 {kpis.draftProducts} · 已下架 {kpis.archivedProducts} · {kpis.categoryCount} 个分类
          </p>
        </div>

        <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-[#666] font-medium">订阅与客户咨询</span>
            <span className="w-9 h-9 rounded-[8px] bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <p className="text-[26px] font-bold text-[#17263b] mt-2">{kpis.subscriberCount}</p>
          <p className="text-[12px] text-[#888] mt-1 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-[#db1215]" />
            <span>{kpis.unreadInquiries} 条未读客户留言</span>
          </p>
        </div>
      </div>

      {/* Charts & Low Stock Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 7-day Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-[10px] border border-[#e5e7eb] p-5">
          <h2 className="text-[15.5px] font-semibold text-[#17263b] mb-4">近 7 天营收趋势</h2>
          {dailySeries.length === 0 ? (
            <p className="text-sm text-[#888] py-12 text-center">暂无近期交易数据</p>
          ) : (
            <div className="h-[200px] flex items-end gap-4 pt-6 px-2">
              {dailySeries.map((pt: any) => {
                const pct = Math.max(8, (Number(pt.revenue) / maxRev) * 100);
                return (
                  <div key={pt.day} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-[#17263b]">
                      ${Number(pt.revenue).toFixed(0)}
                    </span>
                    <div className="w-full max-w-[46px] bg-[#f1f5f9] rounded-t-[6px] h-[140px] flex items-end overflow-hidden">
                      <div
                        style={{ height: `${pct}%` }}
                        className="w-full bg-[#17263b] hover:bg-[#1a44c2] transition-all rounded-t-[6px]"
                      />
                    </div>
                    <span className="text-[11px] text-[#777]">{String(pt.day).slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-[10px] border border-[#e5e7eb] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15.5px] font-semibold text-[#17263b] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>库存预警 (≤25)</span>
            </h2>
            <Link to="/admin/products" className="text-[12px] text-[#1a44c2] hover:underline">
              管理库存
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-[13px] text-[#888] py-10 text-center">所有规格库存充足</p>
          ) : (
            <div className="divide-y divide-[#f1f5f9]">
              {lowStock.map((ls: any, i: number) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-2 text-[13px]">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1a1a1a] truncate">{ls.title}</p>
                    <p className="text-[11.5px] text-[#888]">{ls.variantName}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11.5px] font-semibold bg-amber-50 text-amber-700 shrink-0">
                    剩 {ls.stock}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f0f0f0] flex items-center justify-between">
          <h2 className="text-[15.5px] font-semibold text-[#17263b]">最新订单 Recent Orders</h2>
          <Link to="/admin/orders" className="text-[12.5px] text-[#1a44c2] hover:underline font-medium">
            查看全部订单 →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#f8fafc] text-[#64748b] text-[12px] uppercase">
              <tr>
                <th className="px-5 py-3">订单号</th>
                <th className="px-5 py-3">客户</th>
                <th className="px-5 py-3">金额</th>
                <th className="px-5 py-3">PayPal 状态</th>
                <th className="px-5 py-3">履约状态</th>
                <th className="px-5 py-3">下单时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {recentOrders.map((o: any) => (
                <tr key={o.id} className="hover:bg-[#fafafa]">
                  <td className="px-5 py-3 font-mono font-semibold text-[#17263b]">
                    {o.order_number}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{o.customer_name}</div>
                    <div className="text-[11.5px] text-[#888]">{o.customer_email}</div>
                  </td>
                  <td className="px-5 py-3 font-semibold">${Number(o.total).toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 uppercase">
                      {o.payment_status} ({o.paypal_mode})
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-slate-100 text-[#17263b] capitalize">
                      {o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#777]">{String(o.created_at).slice(0, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
