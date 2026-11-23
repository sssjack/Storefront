import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch, Truck, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useStore } from '../../context/StoreContext';

const STATUS_STEPS = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

export function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const { store } = useStore();
  const currency = store?.currencySymbol || '$';

  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const performLookup = async (num: string, em: string) => {
    if (!num.trim() || !em.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ order: any }>(
        `/api/orders/track?orderNumber=${encodeURIComponent(num.trim())}&email=${encodeURIComponent(em.trim())}`
      );
      setOrder(res.order);
    } catch (err: any) {
      setOrder(null);
      setError(err.message || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const qNum = searchParams.get('orderNumber');
    const qEm = searchParams.get('email');
    if (qNum && qEm) performLookup(qNum, qEm);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(orderNumber, email);
  };

  const currentStepIdx = order ? STATUS_STEPS.indexOf(order.status) : -1;

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <div className="text-center mb-8">
        <PackageSearch className="w-10 h-10 mx-auto text-[#17263b] mb-3" />
        <h1 className="text-[30px] font-medium text-[#1a1a1a]">Track Your Order</h1>
        <p className="text-[14px] text-[#666] mt-1.5">
          Enter your order number and email address to see real-time fulfillment and shipping status.
        </p>
        <p className="text-[12px] text-[#888] mt-1">
          Demo lookup: <strong>SB-2026-1042</strong> / <strong>emily.carter@example.com</strong>
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border border-[#e8e8e8] rounded-[10px] p-6 bg-[#fafafa] grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3"
      >
        <input
          type="text"
          required
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="Order Number (e.g. SB-2026-1042)"
          className="bg-white border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          className="bg-white border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-[6px] bg-[#1a1a1a] hover:bg-[#f04444] text-white text-[13.5px] font-semibold cursor-pointer"
        >
          {loading ? 'Checking...' : 'Track'}
        </button>
      </form>

      {error && (
        <div className="mt-5 p-4 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13.5px] text-center">
          {error}
        </div>
      )}

      {order && (
        <div className="mt-8 border border-[#e8e8e8] rounded-[10px] p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#efefef]">
            <div>
              <p className="text-[12px] text-[#888]">Order Number</p>
              <h2 className="text-[20px] font-bold text-[#17263b]">{order.orderNumber}</h2>
            </div>
            <span className="px-3.5 py-1 rounded-full text-[12px] font-semibold uppercase tracking-wider bg-blue-50 text-[#1a44c2]">
              {order.status}
            </span>
          </div>

          {/* Stepper */}
          {currentStepIdx >= 0 && (
            <div className="grid grid-cols-5 gap-2 text-center">
              {STATUS_STEPS.map((st, idx) => {
                const done = idx <= currentStepIdx;
                return (
                  <div key={st} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        done ? 'bg-[#17263b] text-white' : 'bg-[#f0f0f0] text-[#999]'
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className="text-[11px] capitalize font-medium text-[#444]">{st}</span>
                  </div>
                );
              })}
            </div>
          )}

          {order.trackingNumber && (
            <div className="p-4 rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0] flex items-center gap-3">
              <Truck className="w-5 h-5 text-[#17263b]" />
              <div className="text-[13.5px]">
                <span className="font-semibold">{order.trackingCarrier || 'USPS'}:</span>{' '}
                <span className="font-mono">{order.trackingNumber}</span>
              </div>
            </div>
          )}

          <div className="divide-y divide-[#efefef]">
            {order.items.map((it: any, idx: number) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-medium">{it.title}</p>
                  <p className="text-[12px] text-[#777]">
                    {it.variantName} × {it.quantity}
                  </p>
                </div>
                <span className="text-[14px] font-semibold">
                  {currency}
                  {(it.unitPrice * it.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#efefef] flex justify-between font-bold text-[16px]">
            <span>Total Paid</span>
            <span>
              {currency}
              {Number(order.total).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
