'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { OtherIncome, Staff } from '@/types';

const CATEGORIES = [
  '物販',
  'チップ',
  '出張費',
  '商品販売',
  'セミナー・講習',
  'その他',
];

export default function OtherIncomePage() {
  const [items, setItems] = useState<OtherIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<OtherIncome | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const emptyForm = {
    date: format(new Date(), 'yyyy-MM-dd'),
    category: '',
    description: '',
    amount: '',
    staff_id: '',
    staff_name: '',
    customer_name: '',
    memo: '',
  };
  const [form, setForm] = useState(emptyForm);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
      if (filterCategory) params.set('category', filterCategory);
      const res = await fetch(`/api/other-income?${params}`, { cache: 'no-store' });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterCategory]);

  useEffect(() => {
    fetchItems();
    fetch('/api/staff', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setStaffList(Array.isArray(data) ? data.filter((s: Staff) => s.is_active) : []))
      .catch(() => {});
  }, [fetchItems]);

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSave = async () => {
    if (!form.category) { showMsg('カテゴリを選択してください'); return; }
    if (!form.amount || Number(form.amount) <= 0) { showMsg('金額を入力してください'); return; }
    if (!form.date) { showMsg('日付を入力してください'); return; }

    setSaving(true);
    try {
      const staffName = staffList.find(s => s.id === form.staff_id)?.name || '';
      const payload = {
        date: form.date,
        category: form.category,
        description: form.description,
        amount: Number(form.amount),
        staff_id: form.staff_id,
        staff_name: staffName,
        customer_name: form.customer_name,
        memo: form.memo,
      };

      const url = editItem ? `/api/other-income/${editItem.id}` : '/api/other-income';
      const method = editItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '保存に失敗しました');
      }

      showMsg(editItem ? '更新しました' : '登録しました');
      setShowForm(false);
      setEditItem(null);
      setForm(emptyForm);
      await fetchItems();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('この収入データを削除しますか？')) return;
    try {
      const res = await fetch(`/api/other-income/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      showMsg('削除しました');
      await fetchItems();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  const openEdit = (item: OtherIncome) => {
    setForm({
      date: item.date,
      category: item.category,
      description: item.description,
      amount: String(item.amount),
      staff_id: item.staff_id,
      staff_name: item.staff_name,
      customer_name: item.customer_name,
      memo: item.memo,
    });
    setEditItem(item);
    setShowForm(true);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditItem(null);
    setShowForm(true);
  };

  const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
  const categoryTotals = items.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + i.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">その他収入</h1>
          <p className="text-sm text-gray-500 mt-1">物販・チップなど予約以外の売上を管理</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm font-medium hover:bg-[#B89555] transition-colors"
        >
          + 収入を登録
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm animate-fadeIn">{message}</div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#C9A96E]/10 rounded-xl p-4">
          <p className="text-xs text-[#8B6914]">期間合計</p>
          <p className="text-xl font-bold text-[#A07840] mt-1">¥{totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs text-blue-600">件数</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{items.length}件</p>
        </div>
        {Object.entries(categoryTotals).slice(0, 2).map(([cat, total]) => (
          <div key={cat} className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500">{cat}</p>
            <p className="text-xl font-bold text-gray-700 mt-1">¥{total.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            />
            <span className="text-gray-400">〜</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">全カテゴリ</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-[#C9A96E] rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-gray-500">データがありません</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">日付</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">カテゴリ</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">内容</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">担当</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">顧客</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">金額</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {format(new Date(item.date + 'T00:00:00'), 'M/d（E）', { locale: ja })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{item.category}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.staff_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.customer_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">¥{item.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="text-xs px-2 py-1 bg-[#C9A96E]/10 text-[#A07840] rounded hover:bg-[#C9A96E]/20"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-900">合計</td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-[#A07840]">¥{totalAmount.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {items.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {format(new Date(item.date + 'T00:00:00'), 'M/d', { locale: ja })}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{item.category}</span>
                    </div>
                    <span className="font-bold text-gray-900">¥{item.amount.toLocaleString()}</span>
                  </div>
                  {item.description && <p className="text-sm text-gray-700">{item.description}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-gray-400">
                      {item.staff_name && <span>担当: {item.staff_name}</span>}
                      {item.customer_name && <span className="ml-2">顧客: {item.customer_name}</span>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="text-xs text-[#C9A96E]">編集</button>
                      <button onClick={() => handleDelete(item.id)} className="text-xs text-red-500">削除</button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="p-4 bg-gray-50 font-bold text-right text-[#A07840]">
                合計: ¥{totalAmount.toLocaleString()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowForm(false); setEditItem(null); }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-fadeIn" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-5">{editItem ? '収入を編集' : '収入を登録'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">日付 *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({...form, date: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">選択してください</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">金額 *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm({...form, amount: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="1000"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容・商品名</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="例: シャンプー、トリートメント剤"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">担当スタッフ</label>
                  <select
                    value={form.staff_id}
                    onChange={e => setForm({...form, staff_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">指定なし</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">顧客名</label>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={e => setForm({...form, customer_name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="顧客名"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                <textarea
                  value={form.memo}
                  onChange={e => setForm({...form, memo: e.target.value})}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="備考があれば"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowForm(false); setEditItem(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm hover:bg-[#B89555] disabled:opacity-50"
              >
                {saving ? '保存中...' : editItem ? '更新する' : '登録する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
