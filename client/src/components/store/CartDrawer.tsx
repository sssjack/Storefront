import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Minus, Plus, ShoppingBag, Truck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export function CartDrawer() {
  const {
    cart,
    cartCount,
    cartSubtotal,
    cartOpen,
    setCartOpen,
    updateCartQty,
    removeFromCart,
    store,
  } = useStore();
  const navigate = useNavigate();

  if (!cartOpen) return null;

  const currency = store?.currencySymbol || '$';
  const threshold = Number(store?.freeShippingThreshold ?? 49.99);
  const remaining = Math.max(0, threshold - cartSubtotal);
  const progress = Math.min(100, (cartSubtotal / threshold) * 100);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 transition-opacity"
        onClick={() => setCartOpen(false)}
      />

      {/* Drawer panel */}
      <aside className="relative z-10 w-full max-w-[420px] bg-white h-full flex flex-col shadow-[-6px_0_30px_rgba(0,0,0,0.18)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#ebebeb]">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Your Cart</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f5f5f5] text-[#666]">
              {cartCount}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f5f5f5] text-[#1a1a1a] cursor-pointer"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free shipping meter */}
        <div className="px-5 py-3 bg-[#fafafa] border-b border-[#efefef]">
          <div className="flex items-center gap-2 text-[12.5px] text-[#333] mb-1.5">
            <Truck className="w-4 h-4 text-[#17263b] shrink-0" />
            {remaining > 0 ? (
              <span>
                Add{' '}
                <strong className="text-[#db1215]">
                  {currency}
                  {remaining.toFixed(2)}
                </strong>{' '}
                more for <strong>Free Shipping</strong>
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">
                You unlocked Free First-Class Shipping!
              </span>
            )}
          </div>
          <div className="h-1.5 w-full bg-[#e6e6e6] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                backgroundColor: remaining === 0 ? '#16a34a' : '#17263b',
              }}
            />
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 divide-y divide-[#efefef]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <div className="w-14 h-14 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-3 text-[#888]">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-[15px] font-medium text-[#1a1a1a]">Your cart is empty</p>
              <p className="text-[13px] text-[#888] mt-1 max-w-[240px]">
                Explore authentic US Forever® stamps in booklets and bulk coil rolls.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/shop');
                }}
                className="mt-5 px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#f04444] text-white text-xs font-semibold uppercase tracking-wider rounded-[6px] transition-colors cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.key} className="py-4 first:pt-1 flex gap-3.5">
                <Link
                  to={`/product/${item.slug}`}
                  onClick={() => setCartOpen(false)}
                  className="w-20 h-20 rounded-[8px] bg-[#f5f5f5] border border-[#ededed] overflow-hidden shrink-0"
                >
                  <img
                    src={item.image || '/uploads/seed/prod-us-flag-roll.png'}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/product/${item.slug}`}
                      onClick={() => setCartOpen(false)}
                      className="text-[13.5px] font-medium text-[#1a1a1a] hover:text-[#db1215] line-clamp-2 leading-snug"
                    >
                      {item.title}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.key)}
                      className="w-6 h-6 rounded-full border border-[#e5e5e5] flex items-center justify-center text-[#777] hover:text-[#db1215] hover:border-[#db1215] shrink-0 cursor-pointer"
                      aria-label="Remove item"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[12px] text-[#777] mt-0.5">{item.variantName}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="inline-flex items-center bg-[#f5f5f5] rounded-full px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.key, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-[#333] hover:text-[#db1215] cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-[12.5px] font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.key, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-[#333] hover:text-[#db1215] cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-[14px] font-semibold text-[#1a1a1a]">
                      {currency}
                      {(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-[#ebebeb] p-5 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-[#666]">Subtotal</span>
              <span className="text-[18px] font-semibold text-[#1a1a1a]">
                {currency}
                {cartSubtotal.toFixed(2)}
              </span>
            </div>
            <p className="text-[11.5px] text-[#888]">
              Taxes, promo codes, and shipping calculated at checkout.
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/cart');
                }}
                className="py-2.5 px-4 rounded-[6px] border border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#f5f5f5] text-[13px] font-semibold transition-colors cursor-pointer"
              >
                View Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/checkout');
                }}
                className="py-2.5 px-4 rounded-[6px] bg-[#1a1a1a] hover:bg-[#f04444] text-white text-[13px] font-semibold transition-colors cursor-pointer"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
