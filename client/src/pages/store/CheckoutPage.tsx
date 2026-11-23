import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Tag,
  AlertCircle,
  ExternalLink,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../lib/api';

declare global {
  interface Window {
    paypal?: any;
  }
}

export function CheckoutPage() {
  const { cart, cartSubtotal, clearCart, store, paypal, showToast } = useStore();
  const currency = store?.currencySymbol || '$';

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    notes: '',
  });
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    message: string;
  } | null>(null);
  const [couponError, setCouponError] = useState('');

  // Order & PayPal state
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [demoModal, setDemoModal] = useState<{
    orderNumber: string;
    paypalOrderId: string;
    amount: number;
  } | null>(null);
  const [capturingDemo, setCapturingDemo] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{
    orderNumber: string;
    paypalOrderId: string;
    paypalCaptureId: string;
    mode: string;
    total: number;
    email: string;
  } | null>(null);

  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);

  const threshold = Number(store?.freeShippingThreshold ?? 49.99);
  const standardFee = Number(store?.standardShippingFee ?? 4.95);
  const expressFee = Number(store?.expressShippingFee ?? 14.95);
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const afterDiscount = Math.max(0, cartSubtotal - discount);
  const shippingFee =
    shippingMethod === 'express' ? expressFee : afterDiscount >= threshold ? 0 : standardFee;
  const grandTotal = Number((afterDiscount + shippingFee).toFixed(2));

  // Automatically load official PayPal JS SDK when real credentials are configured in Admin
  useEffect(() => {
    if (!paypal?.isConfigured || !paypal.clientId) return;
    const scriptId = 'paypal-sdk-script';
    if (document.getElementById(scriptId)) {
      if (window.paypal) setSdkReady(true);
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      paypal.clientId
    )}&currency=${encodeURIComponent(paypal.currency || 'USD')}&intent=capture`;
    script.async = true;
    script.onload = () => setSdkReady(true);
    document.body.appendChild(script);
  }, [paypal?.isConfigured, paypal?.clientId, paypal?.currency]);

  const validateAddress = () => {
    if (!form.customerName.trim() || !form.customerEmail.trim() || !form.line1.trim() || !form.city.trim()) {
      setCheckoutError('Please complete your Name, Email, Street Address, and City before paying.');
      return false;
    }
    setCheckoutError('');
    return true;
  };

  const createStoreOrder = async () => {
    const res = await apiRequest<{ order: { orderNumber: string; total: number } }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        shippingAddress: {
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
        },
        shippingMethod,
        items: cart.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          variantName: i.variantName,
          quantity: i.quantity,
        })),
        couponCode: appliedCoupon?.code || '',
        notes: form.notes,
      }),
    });
    return res.order;
  };

  // Mount live PayPal Smart Payment Buttons if real credentials are configured
  useEffect(() => {
    if (!sdkReady || !paypal?.isConfigured || !paypalContainerRef.current || !window.paypal) return;
    paypalContainerRef.current.innerHTML = '';
    let activeOrderNumber = '';

    window.paypal
      .Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'paypal' },
        createOrder: async () => {
          if (!validateAddress()) {
            throw new Error('Please fill in all required shipping fields.');
          }
          const created = await createStoreOrder();
          activeOrderNumber = created.orderNumber;
          const pp = await apiRequest<{ paypalOrderId: string }>('/api/payments/paypal/create-order', {
            method: 'POST',
            body: JSON.stringify({ orderNumber: created.orderNumber }),
          });
          return pp.paypalOrderId;
        },
        onApprove: async (data: any) => {
          const cap = await apiRequest<any>('/api/payments/paypal/capture-order', {
            method: 'POST',
            body: JSON.stringify({
              orderNumber: activeOrderNumber,
              paypalOrderId: data.orderID,
            }),
          });
          setCompletedOrder({
            orderNumber: cap.orderNumber,
            paypalOrderId: cap.paypalOrderId,
            paypalCaptureId: cap.paypalCaptureId,
            mode: cap.mode,
            total: grandTotal,
            email: form.customerEmail,
          });
          clearCart();
        },
        onError: (err: any) => {
          setCheckoutError(err?.message || 'PayPal checkout encountered an error.');
        },
      })
      .render(paypalContainerRef.current);
  }, [sdkReady, paypal?.isConfigured, form, shippingMethod, appliedCoupon, cart]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput.trim()) return;
    try {
      const res = await apiRequest<{ code: string; discount: number; message: string }>(
        '/api/coupons/validate',
        {
          method: 'POST',
          body: JSON.stringify({ code: couponInput.trim(), subtotal: cartSubtotal }),
        }
      );
      setAppliedCoupon(res);
      showToast(res.message);
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'Invalid coupon');
    }
  };

  // Reserved PayPal Demo Simulation trigger
  const handleDemoPayPalClick = async () => {
    if (!validateAddress()) return;
    setSubmitting(true);
    try {
      const created = await createStoreOrder();
      const pp = await apiRequest<{ paypalOrderId: string; amount: number }>(
        '/api/payments/paypal/create-order',
        {
          method: 'POST',
          body: JSON.stringify({ orderNumber: created.orderNumber }),
        }
      );
      setDemoModal({
        orderNumber: created.orderNumber,
        paypalOrderId: pp.paypalOrderId,
        amount: created.total,
      });
    } catch (err: any) {
      setCheckoutError(err.message || 'Could not start checkout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDemoPayPal = async () => {
    if (!demoModal) return;
    setCapturingDemo(true);
    try {
      const cap = await apiRequest<any>('/api/payments/paypal/capture-order', {
        method: 'POST',
        body: JSON.stringify({
          orderNumber: demoModal.orderNumber,
          paypalOrderId: demoModal.paypalOrderId,
        }),
      });
      setCompletedOrder({
        orderNumber: cap.orderNumber,
        paypalOrderId: cap.paypalOrderId,
        paypalCaptureId: cap.paypalCaptureId,
        mode: cap.mode,
        total: demoModal.amount,
        email: form.customerEmail,
      });
      setDemoModal(null);
      clearCart();
    } catch (err: any) {
      setCheckoutError(err.message || 'Capture failed');
      setDemoModal(null);
    } finally {
      setCapturingDemo(false);
    }
  };

  // Order Completed Confirmation Screen
  if (completedOrder) {
    return (
      <div className="max-w-xl mx-auto px-5 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h1 className="text-[28px] font-semibold text-[#1a1a1a]">Thank You for Your Order!</h1>
        <p className="text-[14px] text-[#666] mt-2">
          Your payment via PayPal ({completedOrder.mode.toUpperCase()}) has been confirmed.
        </p>

        <div className="mt-7 border border-[#e8e8e8] rounded-[10px] p-6 text-left space-y-2.5 text-[13.5px] bg-[#fafafa]">
          <div className="flex justify-between">
            <span className="text-[#666]">Order Number</span>
            <span className="font-bold text-[#17263b]">{completedOrder.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666]">Confirmation Email</span>
            <span className="font-medium">{completedOrder.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666]">PayPal Order ID</span>
            <span className="font-mono text-[12px]">{completedOrder.paypalOrderId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666]">PayPal Capture ID</span>
            <span className="font-mono text-[12px]">{completedOrder.paypalCaptureId}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[#e5e5e5]">
            <span className="font-semibold">Total Paid</span>
            <span className="font-bold text-[#db1215] text-[16px]">
              {currency}
              {completedOrder.total.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to={`/track-order?orderNumber=${encodeURIComponent(
              completedOrder.orderNumber
            )}&email=${encodeURIComponent(completedOrder.email)}`}
            className="px-6 py-2.5 rounded-[6px] bg-[#17263b] text-white text-[13.5px] font-semibold hover:bg-[#1a44c2]"
          >
            Track This Order
          </Link>
          <Link
            to="/shop"
            className="px-6 py-2.5 rounded-[6px] border border-[#dcdcdc] text-[#1a1a1a] text-[13.5px] font-semibold hover:bg-[#f5f5f5]"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-5 py-20 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Link
          to="/shop"
          className="inline-block mt-5 px-6 py-2.5 rounded-[6px] bg-[#1a1a1a] text-white text-sm font-semibold"
        >
          Shop Forever Stamps
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-10">
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-[28px] font-medium text-[#1a1a1a]">Secure Checkout</h1>
        <div className="flex items-center gap-1.5 text-[12.5px] text-emerald-700 font-medium">
          <Lock className="w-4 h-4" />
          <span>256-Bit SSL Encrypted</span>
        </div>
      </div>

      {checkoutError && (
        <div className="mb-6 p-4 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13.5px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-start">
        {/* Left: Shipping & Payment Form */}
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="border border-[#e8e8e8] rounded-[10px] p-6">
            <h2 className="text-[16px] font-semibold mb-4">1. Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[12.5px] font-medium text-[#444] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Jane Doe"
                  className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-[#444] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  placeholder="jane@example.com"
                  className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-[#444] mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                  placeholder="(626) 555-0194"
                  className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="border border-[#e8e8e8] rounded-[10px] p-6">
            <h2 className="text-[16px] font-semibold mb-4">2. Shipping Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[12.5px] font-medium text-[#444] mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={form.line1}
                  onChange={(e) => setForm({ ...form, line1: e.target.value })}
                  placeholder="1014 Mission St"
                  className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[12.5px] font-medium text-[#444] mb-1">
                  Apartment, Suite, Unit (Optional)
                </label>
                <input
                  type="text"
                  value={form.line2}
                  onChange={(e) => setForm({ ...form, line2: e.target.value })}
                  placeholder="Suite 200"
                  className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-medium text-[#444] mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="South Pasadena"
                  className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12.5px] font-medium text-[#444] mb-1">State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="CA"
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-medium text-[#444] mb-1">ZIP</label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    placeholder="91030"
                    className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Method */}
          <div className="border border-[#e8e8e8] rounded-[10px] p-6">
            <h2 className="text-[16px] font-semibold mb-4">3. Shipping Method</h2>
            <div className="space-y-3">
              <label
                className={`flex items-center justify-between p-3.5 rounded-[8px] border cursor-pointer ${
                  shippingMethod === 'standard'
                    ? 'border-[#1a44c2] bg-blue-50/40'
                    : 'border-[#e5e5e5]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === 'standard'}
                    onChange={() => setShippingMethod('standard')}
                  />
                  <div>
                    <p className="text-[14px] font-medium text-[#1a1a1a]">
                      USPS First-Class Mail (1–5 Business Days)
                    </p>
                    <p className="text-[12px] text-[#777]">
                      Free on orders over {currency}
                      {threshold.toFixed(2)}
                    </p>
                  </div>
                </div>
                <span className="text-[14px] font-semibold">
                  {afterDiscount >= threshold ? (
                    <span className="text-emerald-700">FREE</span>
                  ) : (
                    `${currency}${standardFee.toFixed(2)}`
                  )}
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-3.5 rounded-[8px] border cursor-pointer ${
                  shippingMethod === 'express'
                    ? 'border-[#1a44c2] bg-blue-50/40'
                    : 'border-[#e5e5e5]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === 'express'}
                    onChange={() => setShippingMethod('express')}
                  />
                  <div>
                    <p className="text-[14px] font-medium text-[#1a1a1a]">
                      USPS Priority Express (1–2 Business Days)
                    </p>
                    <p className="text-[12px] text-[#777]">Insured expedited handling & tracking</p>
                  </div>
                </div>
                <span className="text-[14px] font-semibold">
                  {currency}
                  {expressFee.toFixed(2)}
                </span>
              </label>
            </div>
          </div>

          {/* 4. PayPal Payment Section (Live SDK OR Reserved Demo Mode) */}
          <div className="border border-[#e8e8e8] rounded-[10px] p-6">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <h2 className="text-[16px] font-semibold">4. Payment via PayPal</h2>
              <span
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                  paypal?.isConfigured
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {paypal?.isConfigured
                  ? `PayPal ${paypal.mode.toUpperCase()} Active`
                  : 'PayPal Reserved · Demo Simulation Mode'}
              </span>
            </div>

            {paypal?.isConfigured ? (
              <div>
                <p className="text-[13px] text-[#666] mb-4">
                  Complete your purchase securely with your PayPal balance or Debit/Credit Card.
                </p>
                <div ref={paypalContainerRef} className="min-h-[52px]" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0] text-[13px] text-[#475569] leading-relaxed">
                  <p className="font-semibold text-[#17263b] mb-1">
                    PayPal 支付接口已完整预留（当前未配置商户凭证）
                  </p>
                  <p>
                    系统已内置完整的 PayPal REST API v2 创建订单、扣款捕获与 Webhook 回调接口。目前您可以通过下方模拟按钮测试完整下单支付流程；获得凭证后，前往{' '}
                    <Link to="/admin/settings" className="text-[#1a44c2] underline font-medium">
                      后台 → 支付设置
                    </Link>{' '}
                    填入 Client ID 与 Client Secret 即可一键切换为真实 PayPal 收款。
                  </p>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleDemoPayPalClick}
                  className="w-full py-3.5 rounded-full bg-[#ffc439] hover:bg-[#f4b828] text-[#003087] font-bold text-[15px] shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>
                    {submitting
                      ? 'Initializing PayPal Checkout...'
                      : `Pay ${currency}${grandTotal.toFixed(2)} with PayPal (Demo Mode)`}
                  </span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Summary + Coupon */}
        <aside className="border border-[#e8e8e8] rounded-[10px] p-6 bg-[#fafafa] lg:sticky lg:top-24 space-y-5">
          <h2 className="text-[17px] font-semibold">Order Summary ({cart.length})</h2>

          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-[6px] bg-white border border-[#e8e8e8] overflow-hidden shrink-0">
                  <img src={item.image} alt="" className="w-full h-full object-cover" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#17263b] text-white text-[10px] font-bold flex items-center justify-center">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#1a1a1a] truncate">{item.title}</p>
                  <p className="text-[11.5px] text-[#777]">{item.variantName}</p>
                </div>
                <span className="text-[13.5px] font-semibold">
                  {currency}
                  {(item.unitPrice * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Coupon Form */}
          <form onSubmit={handleApplyCoupon} className="pt-3 border-t border-[#e5e5e5]">
            <label className="text-[12px] font-medium text-[#555] flex items-center gap-1 mb-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Promo Code (Try WELCOME10 or SAVE5)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Enter code"
                className="flex-1 bg-white border border-[#dcdcdc] rounded-[6px] px-3 py-2 text-[13px] uppercase outline-none focus:border-[#17263b]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-[6px] bg-[#1a1a1a] hover:bg-[#333] text-white text-[13px] font-semibold cursor-pointer"
              >
                Apply
              </button>
            </div>
            {couponError && <p className="text-[12px] text-[#db1215] mt-1">{couponError}</p>}
            {appliedCoupon && (
              <p className="text-[12px] text-emerald-700 font-medium mt-1">
                {appliedCoupon.message} (-{currency}
                {appliedCoupon.discount.toFixed(2)})
              </p>
            )}
          </form>

          {/* Totals */}
          <div className="space-y-2 pt-3 border-t border-[#e5e5e5] text-[13.5px]">
            <div className="flex justify-between">
              <span className="text-[#666]">Subtotal</span>
              <span>
                {currency}
                {cartSubtotal.toFixed(2)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount ({appliedCoupon?.code})</span>
                <span>
                  -{currency}
                  {discount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#666]">Shipping</span>
              <span>{shippingFee === 0 ? 'FREE' : `${currency}${shippingFee.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-[#e5e5e5] text-[17px] font-bold text-[#1a1a1a]">
              <span>Total</span>
              <span>
                {currency}
                {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-[#666] pt-1">
            <ShieldCheck className="w-4 h-4 text-[#17263b] shrink-0" />
            <span>Protected by PayPal Buyer Protection & 30-Day Guarantee</span>
          </div>
        </aside>
      </div>

      {/* Simulated PayPal Checkout Modal (when PayPal credentials are reserved) */}
      {demoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/55" onClick={() => !capturingDemo && setDemoModal(null)} />
          <div className="relative z-10 bg-white rounded-[14px] max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-[#003087] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[19px] italic tracking-tight">PayPal</span>
                <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full">
                  Reserved Demo Window
                </span>
              </div>
              <button
                type="button"
                disabled={capturingDemo}
                onClick={() => setDemoModal(null)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#efefef]">
                <div>
                  <p className="text-[12px] text-[#666]">Merchant</p>
                  <p className="text-[15px] font-semibold text-[#1a1a1a]">{store?.name || 'StampsBox'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-[#666]">Amount</p>
                  <p className="text-[20px] font-bold text-[#003087]">
                    {currency}
                    {demoModal.amount.toFixed(2)} {paypal?.currency || 'USD'}
                  </p>
                </div>
              </div>

              <div className="text-[12.5px] text-[#555] space-y-1 bg-[#f8fafc] p-3.5 rounded-[8px]">
                <p>
                  <strong>Store Order:</strong> {demoModal.orderNumber}
                </p>
                <p>
                  <strong>PayPal Token:</strong>{' '}
                  <span className="font-mono">{demoModal.paypalOrderId}</span>
                </p>
                <p>
                  <strong>Ship To:</strong> {form.customerName}, {form.line1}, {form.city}
                </p>
              </div>

              <button
                type="button"
                disabled={capturingDemo}
                onClick={handleConfirmDemoPayPal}
                className="w-full py-3 rounded-full bg-[#0070ba] hover:bg-[#005ea6] text-white font-semibold text-[14.5px] transition-colors cursor-pointer"
              >
                {capturingDemo ? 'Capturing Payment...' : 'Approve & Pay Now (Simulate PayPal)'}
              </button>
              <button
                type="button"
                disabled={capturingDemo}
                onClick={() => setDemoModal(null)}
                className="w-full py-2 text-[13px] text-[#666] hover:text-[#1a1a1a] cursor-pointer"
              >
                Cancel and return to checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
