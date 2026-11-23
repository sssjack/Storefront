import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export function CartPage() {
  const { cart, cartSubtotal, updateCartQty, removeFromCart, store } = useStore();
  const navigate = useNavigate();
  const currency = store?.currencySymbol || '$';
  const threshold = Number(store?.freeShippingThreshold ?? 49.99);
  const standardFee = Number(store?.standardShippingFee ?? 4.95);
  const estShipping = cartSubtotal >= threshold || cartSubtotal === 0 ? 0 : standardFee;

  if (cart.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-5 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-[#f5f5f5] flex items-center justify-center mx-auto text-[#888] mb-4">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Your Shopping Cart is Empty</h1>
        <p className="text-[14px] text-[#666] mt-2">
          Add authentic US Forever® stamps to your cart to get started.
        </p>
        <Link
          to="/shop"
          className="inline-block mt-6 px-8 py-3 rounded-[6px] bg-[#1a1a1a] hover:bg-[#f04444] text-white text-[13px] font-semibold uppercase tracking-wider transition-colors"
        >
          Browse Stamps
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1160px] mx-auto px-4 md:px-6 py-10">
      <h1 className="text-[28px] font-medium text-[#1a1a1a] mb-7">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="border border-[#e8e8e8] rounded-[10px] overflow-hidden divide-y divide-[#efefef]">
          {cart.map((item) => (
            <div key={item.key} className="p-4 sm:p-5 flex gap-4 items-center">
              <Link
                to={`/product/${item.slug}`}
                className="w-20 h-20 rounded-[8px] bg-[#f5f5f5] border border-[#ededed] overflow-hidden shrink-0"
              >
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/product/${item.slug}`}
                  className="text-[14.5px] font-medium text-[#1a1a1a] hover:text-[#db1215]"
                >
                  {item.title}
                </Link>
                <p className="text-[12.5px] text-[#777] mt-0.5">{item.variantName}</p>
                <p className="text-[13.5px] font-semibold text-[#1a1a1a] mt-1">
                  {currency}
                  {item.unitPrice.toFixed(2)} each
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                <div className="inline-flex items-center bg-[#f5f5f5] rounded-full px-1.5 py-1">
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.key, item.quantity - 1)}
                    className="w-7 h-7 flex items-center justify-center hover:text-[#db1215] cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-[13px] font-semibold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.key, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center hover:text-[#db1215] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="w-20 text-right text-[15px] font-semibold">
                  {currency}
                  {(item.unitPrice * item.quantity).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.key)}
                  className="text-[#999] hover:text-[#db1215] p-1 cursor-pointer"
                  aria-label="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Card */}
        <div className="border border-[#e8e8e8] rounded-[10px] p-6 bg-[#fafafa] space-y-4">
          <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Order Summary</h2>
          <div className="space-y-2.5 text-[14px]">
            <div className="flex justify-between">
              <span className="text-[#666]">Subtotal</span>
              <span className="font-medium">
                {currency}
                {cartSubtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666]">Estimated Shipping</span>
              <span className={estShipping === 0 ? 'text-emerald-700 font-medium' : 'font-medium'}>
                {estShipping === 0 ? 'FREE' : `${currency}${estShipping.toFixed(2)}`}
              </span>
            </div>
          </div>
          <div className="border-t border-[#e5e5e5] pt-3 flex justify-between items-baseline">
            <span className="text-[15px] font-semibold">Estimated Total</span>
            <span className="text-[20px] font-bold text-[#1a1a1a]">
              {currency}
              {(cartSubtotal + estShipping).toFixed(2)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/checkout')}
            className="w-full py-3 rounded-[6px] bg-[#1a1a1a] hover:bg-[#f04444] text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[11.5px] text-[#777] text-center">
            Promo codes (e.g. <strong>WELCOME10</strong>) can be entered on the checkout page.
          </p>
        </div>
      </div>
    </div>
  );
}
