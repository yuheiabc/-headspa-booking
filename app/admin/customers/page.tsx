'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Customer } from '@/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', gender: '', birthday: '', memo: '', referral_source: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const limit = 20;

  const fetchCustomers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/customers?${params}`, { cache: 'no-store' });
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    setLoading(true);
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setShowForm(false);
      setForm({ name: '', phone: '', email: '', gender: '', birthday: '', memo: '', referral_source: '' });
      setMessage('顧客を登録しました');
      setTimeout(() => setMessage(''), 3000);
      await fetchCustomers();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '登録に失敗しました');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">顧客管理（カルテ）</h1>
          <p className="text-sm text-gray-500 mt-1">全{total}件</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm hover:bg-[#B89555] transition-colors"
        >
          + 新規顧客
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{message}</div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・電話番号・メールで検索..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#C9A96E] focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700"
          >
            検索
          </button>
        </div>
      </form>

      {/* Customer List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-[#C9A96E] rounded-full" />
          </div>
        ) : customers.length === 0 ? (
          <p className="p-8 text-center text-gray-500">
            {search ? '該当する顧客が見つかりません' : '顧客が登録されていません'}
          </p>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">名前</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">電話番号</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">メール</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">流入経路</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">来店回数</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">最終来店</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.email || '-'}</td>
                      <td className="px-4 py-3">
                        {c.referral_source ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{c.referral_source}</span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-[#C9A96E]/10 text-[#A07840] rounded-full text-sm font-medium">
                          {c.visit_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{c.last_visit || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="text-sm text-[#C9A96E] hover:underline"
                        >
                          カルテ →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {customers.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/customers/${c.id}`}
                  className="block p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-sm text-gray-500">{c.phone}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-[#A07840] font-medium">{c.visit_count}回来店</span>
                      {c.last_visit && (
                        <p className="text-xs text-gray-400">{c.last_visit}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
          >
            ←
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
          >
            →
          </button>
        </div>
      )}

      {/* New Customer Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">新規顧客登録</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">お名前 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話番号 *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メール</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">性別</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">未選択</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">誕生日</label>
                  <input
                    type="date"
                    value={form.birthday}
                    onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">流入経路</label>
                <select
                  value={form.referral_source}
                  onChange={(e) => setForm({ ...form, referral_source: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">選択してください</option>
                  <option value="Instagram">Instagram</option>
                  <option value="LINE">LINE</option>
                  <option value="ホットペッパー">ホットペッパー</option>
                  <option value="Google検索">Google検索</option>
                  <option value="紹介">紹介</option>
                  <option value="チラシ・広告">チラシ・広告</option>
                  <option value="ウェブサイト">ウェブサイト</option>
                  <option value="その他">その他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                <textarea
                  value={form.memo}
                  onChange={(e) => setForm({ ...form, memo: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="アレルギー、髪質、好みなど"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.name || !form.phone}
                className="flex-1 px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm hover:bg-[#B89555] disabled:opacity-50"
              >
                {saving ? '登録中...' : '登録'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
