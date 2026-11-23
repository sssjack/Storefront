import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Package,
  FolderTree,
  ShoppingCart,
  Megaphone,
  Image as ImageIcon,
  Settings,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { apiRequest, clearAdminToken, getAdminToken } from '../../lib/api';

const NAV_ITEMS = [
  { to: '/admin', end: true, label: '数据概览', sub: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/builder', end: false, label: '拖拽布局装修', sub: 'Page Builder', icon: Layers },
  { to: '/admin/products', end: false, label: '商品管理', sub: 'Products', icon: Package },
  { to: '/admin/categories', end: false, label: '分类管理', sub: 'Categories', icon: FolderTree },
  { to: '/admin/orders', end: false, label: '订单管理', sub: 'Orders', icon: ShoppingCart },
  { to: '/admin/marketing', end: false, label: '营销与内容', sub: 'Coupons & CMS', icon: Megaphone },
  { to: '/admin/media', end: false, label: '媒体素材库', sub: 'Media Library', icon: ImageIcon },
  { to: '/admin/settings', end: false, label: '支付与站点设置', sub: 'PayPal & Store', icon: Settings },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    apiRequest<{ admin: { name: string; email: string } }>('/api/admin/auth/me', {}, true)
      .then((d) => {
        setAdmin(d.admin);
        setChecking(false);
      })
      .catch(() => {
        clearAdminToken();
        navigate('/admin/login', { replace: true });
      });
  }, [navigate]);

  const handleLogout = () => {
    clearAdminToken();
    navigate('/admin/login');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9] text-[#555] text-sm">
        Loading Admin Console...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex text-[#1a1a1a]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (#17263b matching StampsBox heritage navy) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[250px] bg-[#17263b] text-white flex flex-col shrink-0 transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="font-editorial text-[20px] font-bold tracking-tight leading-none">
              StampsBox
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#f18585] mt-1 font-semibold">
              ADMIN CONSOLE
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-[8px] transition-colors ${
                    isActive
                      ? 'bg-white text-[#17263b] font-semibold shadow-xs'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <div className="leading-tight">
                  <div className="text-[13.5px]">{item.label}</div>
                  <div className="text-[10.5px] opacity-65">{item.sub}</div>
                </div>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1.5">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-[8px] bg-white/10 hover:bg-white/20 text-[12.5px] font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>访问前台独立站</span>
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-[8px] text-white/70 hover:text-white hover:bg-white/10 text-[12.5px] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-15 bg-white border-b border-[#e5e7eb] px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-[6px] hover:bg-[#f5f5f5]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-[13.5px] font-medium text-[#555]">
              欢迎回来，<strong className="text-[#17263b]">{admin?.name}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[12px] text-[#888]">{admin?.email}</span>
            <a
              href="/"
              className="text-[12.5px] font-semibold px-3 py-1.5 rounded-[6px] border border-[#e0e0e0] hover:border-[#17263b] text-[#17263b] inline-flex items-center gap-1.5"
            >
              <span>预览前台</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
