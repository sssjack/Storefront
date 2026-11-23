import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Store,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useStore } from '../../context/StoreContext';
import { BrandLogo } from '../../components/store/BrandLogo';
import type { AdminPayPalConfig, StoreSettings } from '../../types';

export function SettingsPage() {
  const { refreshBootstrap } = useStore();
  const [tab, setTab] = useState<'paypal' | 'store' | 'security'>('paypal');

  const [storeForm, setStoreForm] = useState<StoreSettings | null>(null);
  const [paypalForm, setPaypalForm] = useState<AdminPayPalConfig | null>(null);
  const [newSecret, setNewSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' });

  const loadSettings = async () => {
    const res = await apiRequest<{ store: StoreSettings; paypal: AdminPayPalConfig }>(
      '/api/admin/settings',
      {},
      true
    );
    setStoreForm(res.store);
    setPaypalForm(res.paypal);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const showMsg = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4500);
  };

  const handleSavePayPal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paypalForm) return;
    setSaving(true);
    try {
      const res = await apiRequest<{ paypal: AdminPayPalConfig }>(
        '/api/admin/settings/paypal',
        {
          method: 'PUT',
          body: JSON.stringify({
            mode: paypalForm.mode,
            clientId: paypalForm.clientId,
            clientSecret: newSecret,
            webhookId: paypalForm.webhookId,
            currency: paypalForm.currency,
            enabled: paypalForm.enabled,
            expressCheckoutEnabled: paypalForm.expressCheckoutEnabled,
            brandName: paypalForm.brandName,
          }),
        },
        true
      );
      setPaypalForm(res.paypal);
      setNewSecret('');
      await refreshBootstrap();
      showMsg(true, 'PayPal 支付配置已保存！');
    } catch (err: any) {
      showMsg(false, err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTestPayPal = async () => {
    setTesting(true);
    try {
      const res = await apiRequest<{ ok: boolean; message: string }>(
        '/api/admin/settings/paypal/test',
        { method: 'POST' },
        true
      );
      showMsg(res.ok, res.message);
    } catch (err: any) {
      showMsg(false, err.message || '测试请求失败');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm) return;
    setSaving(true);
    try {
      await apiRequest(
        '/api/admin/settings/store',
        { method: 'PUT', body: JSON.stringify(storeForm) },
        true
      );
      await refreshBootstrap();
      showMsg(true, '站点全局设置已保存并同步前台！');
    } catch (err: any) {
      showMsg(false, err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiRequest<{ message: string }>(
        '/api/admin/auth/change-password',
        { method: 'POST', body: JSON.stringify(pwdForm) },
        true
      );
      setPwdForm({ currentPassword: '', newPassword: '' });
      showMsg(true, res.message);
    } catch (err: any) {
      showMsg(false, err.message || '密码修改失败');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadBrandAsset = async (field: 'logoUrl' | 'faviconUrl', file: File | undefined) => {
    if (!file || !storeForm) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await apiRequest<{ url: string }>('/api/admin/media/upload', { method: 'POST', body: fd }, true);
      setStoreForm({ ...storeForm, [field]: res.url });
      showMsg(true, field === 'logoUrl' ? '左上角 Logo 已上传，请点击下方「保存站点设置」生效！' : 'Favicon 已上传，请点击保存生效！');
    } catch (err: any) {
      showMsg(false, err.message || '图片上传失败');
    }
  };

  if (!storeForm || !paypalForm) {
    return <div className="py-12 text-center text-sm text-[#888]">加载配置中...</div>;
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-[22px] font-semibold text-[#17263b]">支付与站点设置 Settings</h1>
        <p className="text-[13px] text-[#666]">配置 PayPal REST v2 收款凭证、站点公告栏、运费规则与安全密码</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('paypal')}
          className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
            tab === 'paypal'
              ? 'bg-[#17263b] text-white'
              : 'bg-white border border-[#e5e7eb] text-[#444]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>PayPal 支付对接（预留）</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('store')}
          className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
            tab === 'store'
              ? 'bg-[#17263b] text-white'
              : 'bg-white border border-[#e5e7eb] text-[#444]'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>站点与物流设置</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('security')}
          className={`px-4 py-2 rounded-[8px] text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
            tab === 'security'
              ? 'bg-[#17263b] text-white'
              : 'bg-white border border-[#e5e7eb] text-[#444]'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>管理员安全</span>
        </button>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-[8px] border text-[13.5px] flex items-center gap-2 ${
            msg.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {msg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* PAYPAL TAB */}
      {tab === 'paypal' && (
        <form
          onSubmit={handleSavePayPal}
          className="bg-white rounded-[10px] border border-[#e5e7eb] p-6 space-y-5 text-[13.5px]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#efefef]">
            <div>
              <h2 className="text-[17px] font-semibold text-[#003087]">PayPal REST API v2 对接配置</h2>
              <p className="text-[12.5px] text-[#666] mt-0.5">
                后端已完整实现 OAuth2 鉴权、创建订单、扣款捕获与 Webhook 回调；填入真实凭证即可自动激活官方 PayPal 按钮。
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-[11.5px] font-semibold ${
                paypalForm.isConfigured
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              {paypalForm.isConfigured ? `已就绪 (${paypalForm.mode.toUpperCase()})` : '未配置凭证 · 演示模式'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#444] mb-1">运行环境 Mode</label>
              <select
                value={paypalForm.mode}
                onChange={(e) => setPaypalForm({ ...paypalForm, mode: e.target.value as any })}
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
              >
                <option value="demo">Demo 模拟模式（无真实凭证时测试完整流程）</option>
                <option value="sandbox">Sandbox 沙盒测试（PayPal Developer 测试账号）</option>
                <option value="live">Live 正式生产收款</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#444] mb-1">结算币种 Currency</label>
              <select
                value={paypalForm.currency}
                onChange={(e) => setPaypalForm({ ...paypalForm, currency: e.target.value })}
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3 py-2"
              >
                <option value="USD">USD ($ 美元)</option>
                <option value="EUR">EUR (€ 欧元)</option>
                <option value="GBP">GBP (£ 英镑)</option>
                <option value="CAD">CAD (C$ 加元)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#444] mb-1">
              PayPal Client ID（预留字段）
            </label>
            <input
              type="text"
              value={paypalForm.clientId}
              onChange={(e) => setPaypalForm({ ...paypalForm, clientId: e.target.value })}
              placeholder="从 PayPal Developer Dashboard -> Apps & Credentials 复制 Client ID"
              className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2 font-mono text-[13px]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#444] mb-1">
              PayPal Client Secret（预留字段，安全存储于后端）
            </label>
            <input
              type="password"
              value={newSecret}
              onChange={(e) => setNewSecret(e.target.value)}
              placeholder={
                paypalForm.hasClientSecret
                  ? `已保存密钥 (${paypalForm.clientSecretMasked})，留空则保持不变`
                  : '请输入 PayPal Client Secret'
              }
              className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2 font-mono text-[13px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#444] mb-1">
                Webhook ID（选填）
              </label>
              <input
                type="text"
                value={paypalForm.webhookId}
                onChange={(e) => setPaypalForm({ ...paypalForm, webhookId: e.target.value })}
                placeholder="WH-..."
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2 font-mono text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#444] mb-1">
                Webhook 回调地址（在 PayPal 后台填写）
              </label>
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/api/payments/paypal/webhook`}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-[6px] px-3.5 py-2 font-mono text-[12px] text-[#475569]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={paypalForm.enabled}
                onChange={(e) => setPaypalForm({ ...paypalForm, enabled: e.target.checked })}
              />
              <span>启用 PayPal 结账支付</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={paypalForm.expressCheckoutEnabled}
                onChange={(e) =>
                  setPaypalForm({ ...paypalForm, expressCheckoutEnabled: e.target.checked })
                }
              />
              <span>商品详情页显示 Buy Now with PayPal 快捷按钮</span>
            </label>
          </div>

          <div className="p-4 rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0] text-[12.5px] text-[#475569] space-y-1">
            <p className="font-semibold text-[#17263b]">后续接入真实 PayPal 步骤指引：</p>
            <p>1. 登录 developer.paypal.com → Apps & Credentials 创建 REST API App 获取 Client ID 与 Secret；</p>
            <p>2. 将凭证粘贴至上方输入框（或填入 server/.env），将运行环境切换为 Sandbox 或 Live 并保存；</p>
            <p>3. 点击“检测凭证连通性”验证 OAuth2 令牌，前台结账页将自动加载官方 PayPal SDK 按钮。</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-[8px] bg-[#1a44c2] hover:bg-[#14369e] text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? '保存中...' : '保存 PayPal 配置'}</span>
            </button>
            <button
              type="button"
              disabled={testing}
              onClick={handleTestPayPal}
              className="px-4 py-2.5 rounded-[8px] border border-[#17263b] text-[#17263b] hover:bg-[#f5f7fa] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Wifi className="w-4 h-4" />
              <span>{testing ? '检测中...' : '检测凭证连通性'}</span>
            </button>
          </div>
        </form>
      )}

      {/* STORE SETTINGS TAB */}
      {tab === 'store' && (
        <form
          onSubmit={handleSaveStore}
          className="bg-white rounded-[10px] border border-[#e5e7eb] p-6 space-y-5 text-[13.5px]"
        >
          {/* Logo & Favicon Branding Section */}
          <div className="p-4 rounded-[10px] bg-[#f8fafc] border border-[#e2e8f0] space-y-4">
            <h3 className="text-[14.5px] font-semibold text-[#17263b]">
              品牌标识与图标设置（左上角网站 Logo & 浏览器标签 Favicon）
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left-top Logo */}
              <div className="space-y-2.5">
                <label className="block text-[12px] font-semibold text-[#444]">
                  左上角网站 Logo（留空则显示默认徽章）
                </label>
                <div className="h-16 px-4 rounded-[8px] bg-white border border-[#e5e7eb] flex items-center justify-between">
                  <BrandLogo name={storeForm.name} logoUrl={storeForm.logoUrl} compact />
                  {storeForm.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setStoreForm({ ...storeForm, logoUrl: '' })}
                      className="text-[11.5px] text-[#db1215] hover:underline cursor-pointer"
                    >
                      恢复默认徽章
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={storeForm.logoUrl || ''}
                    onChange={(e) => setStoreForm({ ...storeForm, logoUrl: e.target.value })}
                    placeholder="输入图片 URL 或点击右侧上传"
                    className="flex-1 bg-white border border-[#dcdcdc] rounded-[6px] px-3 py-1.5 text-[12.5px]"
                  />
                  <label className="px-3 py-1.5 rounded-[6px] bg-white border border-[#17263b] text-[#17263b] hover:bg-[#17263b] hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 text-[12px] font-semibold shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>上传 Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadBrandAsset('logoUrl', e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>

              {/* Browser Favicon */}
              <div className="space-y-2.5">
                <label className="block text-[12px] font-semibold text-[#444]">
                  浏览器标签页图标 Favicon（建议正方形 PNG/ICO/SVG）
                </label>
                <div className="h-16 px-4 rounded-[8px] bg-white border border-[#e5e7eb] flex items-center justify-between">
                  {storeForm.faviconUrl ? (
                    <div className="flex items-center gap-2.5">
                      <img
                        src={storeForm.faviconUrl}
                        alt="Favicon"
                        className="w-8 h-8 rounded object-contain border border-[#efefef]"
                      />
                      <span className="text-[12px] text-[#555] truncate max-w-[180px]">
                        已设置自定义图标
                      </span>
                    </div>
                  ) : (
                    <span className="text-[12px] text-[#888]">暂未上传自定义 Favicon</span>
                  )}
                  {storeForm.faviconUrl && (
                    <button
                      type="button"
                      onClick={() => setStoreForm({ ...storeForm, faviconUrl: '' })}
                      className="text-[11.5px] text-[#db1215] hover:underline cursor-pointer"
                    >
                      清除
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={storeForm.faviconUrl || ''}
                    onChange={(e) => setStoreForm({ ...storeForm, faviconUrl: e.target.value })}
                    placeholder="输入图标 URL 或点击右侧上传"
                    className="flex-1 bg-white border border-[#dcdcdc] rounded-[6px] px-3 py-1.5 text-[12.5px]"
                  />
                  <label className="px-3 py-1.5 rounded-[6px] bg-white border border-[#dcdcdc] hover:border-[#17263b] text-[#17263b] cursor-pointer inline-flex items-center gap-1 text-[12px] font-semibold shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>上传图标</span>
                    <input
                      type="file"
                      accept="image/*,.ico"
                      className="hidden"
                      onChange={(e) => handleUploadBrandAsset('faviconUrl', e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#444] mb-1">站点品牌名称</label>
              <input
                type="text"
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#444] mb-1">站点副标题 Tagline（浏览器标题）</label>
              <input
                type="text"
                value={storeForm.tagline || ''}
                onChange={(e) => setStoreForm({ ...storeForm, tagline: e.target.value })}
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#444] mb-1">底部客服邮箱</label>
              <input
                type="email"
                value={storeForm.email}
                onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#444] mb-1">底部联系电话</label>
              <input
                type="text"
                value={storeForm.phone}
                onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[12px] font-semibold text-[#444] mb-1">底部公司地址</label>
              <input
                type="text"
                value={storeForm.address}
                onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
              />
            </div>
          </div>

          {/* Footer Social Links */}
          <div className="space-y-2.5 pt-2 border-t border-[#efefef]">
            <label className="block text-[12.5px] font-semibold text-[#17263b]">
              底部社交媒体链接（留空则自动隐藏对应图标）
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Facebook URL (https://facebook.com/...)"
                value={storeForm.social?.facebook || ''}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, social: { ...storeForm.social, facebook: e.target.value } })
                }
                className="border border-[#dcdcdc] rounded-[6px] px-3 py-2 text-[13px]"
              />
              <input
                type="text"
                placeholder="X / Twitter URL (https://x.com/...)"
                value={storeForm.social?.twitter || ''}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, social: { ...storeForm.social, twitter: e.target.value } })
                }
                className="border border-[#dcdcdc] rounded-[6px] px-3 py-2 text-[13px]"
              />
              <input
                type="text"
                placeholder="Instagram URL (https://instagram.com/...)"
                value={storeForm.social?.instagram || ''}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, social: { ...storeForm.social, instagram: e.target.value } })
                }
                className="border border-[#dcdcdc] rounded-[6px] px-3 py-2 text-[13px]"
              />
              <input
                type="text"
                placeholder="Threads URL (https://threads.net/...)"
                value={storeForm.social?.threads || ''}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, social: { ...storeForm.social, threads: e.target.value } })
                }
                className="border border-[#dcdcdc] rounded-[6px] px-3 py-2 text-[13px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#efefef]">
            <div>
              <label className="block text-[12px] font-semibold text-[#444] mb-1">包邮门槛 ($)</label>
              <input
                type="number"
                step="0.01"
                value={storeForm.freeShippingThreshold}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, freeShippingThreshold: Number(e.target.value) })
                }
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#444] mb-1">标准运费 ($)</label>
              <input
                type="number"
                step="0.01"
                value={storeForm.standardShippingFee}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, standardShippingFee: Number(e.target.value) })
                }
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#444] mb-1">加急运费 ($)</label>
              <input
                type="number"
                step="0.01"
                value={storeForm.expressShippingFee}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, expressShippingFee: Number(e.target.value) })
                }
                className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
              />
            </div>
          </div>

          {/* Announcement bar items */}
          <div className="space-y-2.5 pt-2 border-t border-[#efefef]">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-semibold text-[#17263b]">
                顶部深色公告栏轮播文案
              </label>
              <button
                type="button"
                onClick={() =>
                  setStoreForm({
                    ...storeForm,
                    announcements: [...(storeForm.announcements || []), 'New promo announcement'],
                  })
                }
                className="text-[12px] text-[#1a44c2] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> 添加一条
              </button>
            </div>
            {(storeForm.announcements || []).map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={line}
                  onChange={(e) => {
                    const next = [...storeForm.announcements];
                    next[idx] = e.target.value;
                    setStoreForm({ ...storeForm, announcements: next });
                  }}
                  className="flex-1 border border-[#dcdcdc] rounded-[6px] px-3 py-2 text-[13px]"
                />
                <button
                  type="button"
                  onClick={() =>
                    setStoreForm({
                      ...storeForm,
                      announcements: storeForm.announcements.filter((_, i) => i !== idx),
                    })
                  }
                  className="p-2 text-[#888] hover:text-[#db1215] cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#444] mb-1">页脚版权声明</label>
            <input
              type="text"
              value={storeForm.footerCopyright}
              onChange={(e) => setStoreForm({ ...storeForm, footerCopyright: e.target.value })}
              className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-[8px] bg-[#1a44c2] hover:bg-[#14369e] text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? '保存中...' : '保存站点设置'}</span>
          </button>
        </form>
      )}

      {/* SECURITY TAB */}
      {tab === 'security' && (
        <form
          onSubmit={handleChangePassword}
          className="bg-white rounded-[10px] border border-[#e5e7eb] p-6 space-y-4 max-w-md text-[13.5px]"
        >
          <h2 className="text-[16px] font-semibold text-[#17263b]">修改管理员密码</h2>
          <div>
            <label className="block text-[12px] font-semibold text-[#444] mb-1">当前密码</label>
            <input
              type="password"
              required
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
              className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#444] mb-1">新密码（至少 6 位）</label>
            <input
              type="password"
              required
              minLength={6}
              value={pwdForm.newPassword}
              onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
              className="w-full border border-[#dcdcdc] rounded-[6px] px-3.5 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-[8px] bg-[#17263b] text-white font-semibold cursor-pointer"
          >
            {saving ? '更新中...' : '更新密码'}
          </button>
        </form>
      )}
    </div>
  );
}
