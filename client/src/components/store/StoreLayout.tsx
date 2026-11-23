import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Package,
  Store,
  ArrowUp,
  Settings2,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../lib/api';
import { BrandLogo, PaymentBadges } from './BrandLogo';
import { CartDrawer } from './CartDrawer';
import { SearchModal } from './SearchModal';
import { QuickViewModal } from './QuickViewModal';

export function StoreLayout() {
  const { store, categories, cartCount, setCartOpen, setSearchOpen, toast, showToast } = useStore();
  const location = useLocation();
  const [announceIdx, setAnnounceIdx] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [submittingNews, setSubmittingNews] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);

  const announcements = store?.announcements?.length
    ? store.announcements
    : ['Free shipping on orders of $49.99 or more'];

  const navItems = (
    store?.navItems?.length
      ? store.navItems
      : [
          { id: 'nav-home', label: 'Home', url: '/', type: 'link' as const, visible: true },
          { id: 'nav-best', label: 'Best Seller', url: '/shop?bestseller=true', type: 'link' as const, visible: true },
          { id: 'nav-cats', label: 'Forever Stamps', url: '/shop', type: 'categories_dropdown' as const, visible: true },
          { id: 'nav-blog', label: 'Stamp Guide', url: '/blog', type: 'link' as const, visible: true },
          { id: 'nav-about', label: 'About Us', url: '/page/about', type: 'page' as const, visible: true },
          { id: 'nav-faq', label: 'FAQ', url: '/faq', type: 'link' as const, visible: true },
        ]
  ).filter((item) => item.visible !== false);

  const isExternalUrl = (url: string) => /^https?:\/\//i.test(url);

  const socialLinks = [
    { label: 'FB', href: store?.social?.facebook || '' },
    { label: 'X', href: store?.social?.twitter || '' },
    { label: 'IG', href: store?.social?.instagram || '' },
    { label: 'TH', href: store?.social?.threads || '' },
  ].filter((s) => s.href.trim() !== '');

  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 420);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const t = setInterval(() => {
      setAnnounceIdx((i) => (i + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(t);
  }, [announcements.length]);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubmittingNews(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: newsletterEmail }),
      });
      setNewsletterEmail('');
      showToast(res.message);
    } catch (err: any) {
      showToast(err.message || 'Subscription failed');
    } finally {
      setSubmittingNews(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white pb-16 md:pb-0">
      {/* Top Announcement Bar (#232323) */}
      <div className="bg-[#232323] text-white font-albert">
        <div className="max-w-[1400px] mx-auto px-4 h-9 flex items-center justify-center gap-4 text-[12px] md:text-[13.5px] font-medium tracking-[0.02em]">
          <button
            type="button"
            onClick={() =>
              setAnnounceIdx((i) => (i - 1 + announcements.length) % announcements.length)
            }
            className="text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Previous announcement"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-center truncate">{announcements[announceIdx % announcements.length]}</span>
          <button
            type="button"
            onClick={() => setAnnounceIdx((i) => (i + 1) % announcements.length)}
            className="text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Next announcement"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/98 backdrop-blur-sm border-b border-[#ebebeb]">
        <div className="max-w-[1360px] mx-auto px-4 md:px-6 h-[74px] flex items-center justify-between gap-4">
          {/* Left: Mobile menu button + Desktop Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-[#1a1a1a]"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="shrink-0">
              <BrandLogo name={store?.name} logoUrl={store?.logoUrl} />
            </Link>
          </div>

          {/* Center: Desktop Navigation (Dynamic from Admin Settings) */}
          <nav className="hidden lg:flex items-center gap-7 font-albert text-[14.5px] font-medium tracking-[0.4px] uppercase text-[#1a1a1a]">
            {navItems.map((item) => {
              if (item.type === 'categories_dropdown') {
                return (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => setDropdownOpen(true)}
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    <Link
                      to={item.url || '/shop'}
                      className="inline-flex items-center gap-1 hover:text-[#db1215] transition-colors py-2"
                    >
                      {item.label}
                      <ChevronDown className="w-3.5 h-3.5" />
                    </Link>
                    {dropdownOpen && (
                      <div className="absolute left-0 top-full pt-1 w-60 z-50">
                        <div className="bg-white border border-[#e8e8e8] rounded-[10px] shadow-lg py-2 normal-case tracking-normal">
                          <Link
                            to="/shop"
                            className="block px-4 py-2 text-[13.5px] font-medium text-[#1a1a1a] hover:bg-[#fff5f5] hover:text-[#db1215]"
                          >
                            All Stamps
                          </Link>
                          <div className="my-1 border-t border-[#f0f0f0]" />
                          {categories.map((cat) => (
                            <Link
                              key={cat.id}
                              to={`/collections/${cat.slug}`}
                              className="flex items-center justify-between px-4 py-2 text-[13.5px] text-[#333] hover:bg-[#fff5f5] hover:text-[#db1215]"
                            >
                              <span>{cat.name}</span>
                              <span className="text-[11px] text-[#999]">{cat.productCount}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (isExternalUrl(item.url)) {
                return (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#db1215] transition-colors py-1"
                  >
                    {item.label}
                  </a>
                );
              }

              const active =
                item.url === '/'
                  ? location.pathname === '/'
                  : location.pathname === item.url ||
                    (item.url === '/page/about' && location.pathname === '/about');

              return (
                <Link
                  key={item.id}
                  to={item.url || '/'}
                  className={`hover:text-[#db1215] transition-colors py-1 ${
                    active ? 'text-[#db1215]' : ''
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Utility Icons */}
          <div className="flex items-center gap-1.5 md:gap-2.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#1a1a1a] hover:text-[#db1215] hover:bg-[#f7f7f7] transition-colors cursor-pointer"
              aria-label="Search"
              title="Search"
            >
              <Search className="w-[19px] h-[19px]" />
            </button>

            <Link
              to="/track-order"
              className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center text-[#1a1a1a] hover:text-[#db1215] hover:bg-[#f7f7f7] transition-colors"
              aria-label="Track Order"
              title="Track Order"
            >
              <Package className="w-[19px] h-[19px]" />
            </Link>

            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[#e5e5e5] hover:border-[#17263b] text-[11.5px] font-semibold text-[#17263b] hover:bg-[#f5f7fa] transition-colors"
              title="Open Store Admin Panel"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative w-9 h-9 rounded-full flex items-center justify-center text-[#1a1a1a] hover:text-[#db1215] hover:bg-[#f7f7f7] transition-colors cursor-pointer"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-[20px] h-[20px]" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#db1215] text-white text-[10.5px] font-bold flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-In Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/45" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 w-[300px] max-w-[85vw] bg-white h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#ebebeb]">
              <BrandLogo name={store?.name} logoUrl={store?.logoUrl} compact />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-1 text-[14.5px] font-medium">
              {navItems.map((item) => (
                <React.Fragment key={item.id}>
                  {isExternalUrl(item.url) ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block py-2.5 border-b border-[#f3f3f3]"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link to={item.url || '/'} className="block py-2.5 border-b border-[#f3f3f3]">
                      {item.label}
                    </Link>
                  )}
                  {item.type === 'categories_dropdown' && (
                    <div className="pl-3 py-1 space-y-1 text-[13.5px] font-normal text-[#555]">
                      {categories.map((c) => (
                        <Link key={c.id} to={`/collections/${c.slug}`} className="block py-1.5">
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              ))}
              <Link to="/contact" className="block py-2.5 border-b border-[#f3f3f3]">
                Contact Us
              </Link>
              <Link to="/track-order" className="block py-2.5 border-b border-[#f3f3f3]">
                Track Order
              </Link>
              <Link to="/admin" className="block py-2.5 text-[#17263b] font-semibold">
                Admin Dashboard →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* StampsBox Signature Dark Footer (#111111) */}
      <footer className="bg-[#111111] text-[#cccccc] mt-16">
        <div className="max-w-[1280px] mx-auto px-5 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Brand & Address */}
          <div>
            <BrandLogo name={store?.name} logoUrl={store?.logoUrl} dark compact />
            <p className="text-[13px] leading-relaxed text-[#aaaaaa] mt-4">
              {store?.address || '1014 Mission St, South Pasadena, CA 91030, USA'}
            </p>
            <p className="text-[13px] text-white mt-2 font-medium">
              {store?.email || 'service@stampsbox.com'}
            </p>
            {store?.phone && <p className="text-[12.5px] text-[#999] mt-1">{store.phone}</p>}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2.5 mt-5">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-full border border-[#3a3a3a] hover:border-white hover:text-white flex items-center justify-center text-[11px] font-semibold transition-colors"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Categories */}
          <div>
            <h4 className="text-white text-[14px] font-semibold uppercase tracking-wider mb-4">
              Categories
            </h4>
            <ul className="space-y-2 text-[13px]">
              {categories.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/collections/${c.slug}`}
                    className="hover:text-white transition-colors"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Useful Links */}
          <div>
            <h4 className="text-white text-[14px] font-semibold uppercase tracking-wider mb-4">
              Useful Links
            </h4>
            <ul className="space-y-2 text-[13px]">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-white transition-colors">
                  Stamp Guide
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="hover:text-white transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link to="/policies" className="hover:text-white transition-colors">
                  Shipping & Return Policy
                </Link>
              </li>
              <li>
                <Link to="/admin" className="text-[#f18585] hover:text-white transition-colors">
                  Merchant Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Mailing List & Payments */}
          <div>
            <h4 className="text-white text-[14px] font-semibold uppercase tracking-wider mb-4">
              Join Our Mailing List!
            </h4>
            <p className="text-[13px] text-[#aaaaaa] leading-relaxed">
              Get early access to new commemorative stamp releases, seasonal collections, and exclusive subscriber discounts.
            </p>
            <form onSubmit={handleNewsletter} className="mt-4 flex gap-2">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 min-w-0 bg-white text-[#1a1a1a] px-3.5 py-2.5 rounded-[6px] text-[13px] outline-none"
              />
              <button
                type="submit"
                disabled={submittingNews}
                className="px-4 py-2.5 rounded-[6px] bg-[#db1215] hover:bg-[#f04444] text-white text-[13px] font-semibold shrink-0 transition-colors cursor-pointer"
              >
                {submittingNews ? '...' : 'Subscribe'}
              </button>
            </form>
            <div className="mt-5">
              <p className="text-[11px] uppercase tracking-wider text-[#888] mb-2">
                Guaranteed Safe Checkout
              </p>
              <PaymentBadges />
            </div>
          </div>
        </div>

        <div className="border-t border-[#242424]">
          <div className="max-w-[1280px] mx-auto px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] text-[#888]">
            <span>{store?.footerCopyright || '© 2026 STAMPSBOX . ALL RIGHTS RESERVED.'}</span>
            <span>Secured by PayPal Checkout & SSL Encryption</span>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Tab Bar (matching StampsBox <=900px UX) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#eeeeee] grid grid-cols-4 h-15">
        <Link
          to="/shop"
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-[#333]"
        >
          <Store className="w-5 h-5" />
          <span>Shop</span>
        </Link>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative flex flex-col items-center justify-center gap-0.5 text-[11px] text-[#333]"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[#db1215] text-white text-[9.5px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          <span>Cart</span>
        </button>
        <Link
          to="/track-order"
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-[#333]"
        >
          <Package className="w-5 h-5" />
          <span>Orders</span>
        </Link>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-[#333]"
        >
          <Search className="w-5 h-5" />
          <span>Search</span>
        </button>
      </nav>

      {/* Back to top button */}
      {showBackTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="hidden md:flex fixed bottom-6 right-6 z-30 w-11 h-11 rounded-full bg-white text-[#1a1a1a] border border-[#e5e5e5] shadow-[0_2px_12px_rgba(0,0,0,0.12)] hover:bg-[#1a1a1a] hover:text-white items-center justify-center transition-colors cursor-pointer"
          aria-label="Back to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* Global Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#17263b] text-white text-[13px] font-medium px-5 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      {/* Modals & Drawers */}
      <CartDrawer />
      <SearchModal />
      <QuickViewModal />
    </div>
  );
}
