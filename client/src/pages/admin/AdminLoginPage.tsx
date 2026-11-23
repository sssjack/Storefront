import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import { apiRequest, setAdminToken } from '../../lib/api';
import { BrandLogo } from '../../components/store/BrandLogo';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@stampsbox.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string }>('/api/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAdminToken(res.token);
      navigate('/admin', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#e5e7eb] rounded-[14px] shadow-sm p-8">
        <div className="flex flex-col items-center text-center mb-7">
          <BrandLogo name="StampsBox" compact />
          <h1 className="text-[20px] font-semibold text-[#17263b] mt-4">
            独立站管理后台登录
          </h1>
          <p className="text-[13px] text-[#666] mt-1">
            Sign in to manage layout, products, categories, orders & PayPal settings
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700 text-[13px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12.5px] font-medium text-[#333] mb-1">
              管理员邮箱 / Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#dcdcdc] rounded-[8px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-[#333] mb-1">
              密码 / Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#dcdcdc] rounded-[8px] px-3.5 py-2.5 text-[14px] outline-none focus:border-[#17263b]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-[8px] bg-[#17263b] hover:bg-[#1a44c2] text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>{loading ? '正在登录...' : '登录后台'}</span>
          </button>
        </form>

        <div className="mt-5 p-3 rounded-[8px] bg-[#f8fafc] border border-[#e2e8f0] text-[12px] text-[#475569]">
          <p className="font-semibold text-[#17263b]">默认测试账号：</p>
          <p className="mt-0.5 font-mono">admin@stampsbox.local / admin123</p>
        </div>

        <div className="mt-5 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#17263b]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>返回前台商城</span>
          </a>
        </div>
      </div>
    </div>
  );
}
