'use client';

import { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import toast from 'react-hot-toast';
import type { Booking, Service, Staff } from '@/types';

interface BookingTableProps {
  bookings: Booking[];
  onUpdate: () => void;
}

interface BookingFormData {
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  service_id: string;
  service_name_custom: string;
  custom_price: string;
  custom_duration: string;
  staff_id: string;
  notes: string;
  referral_source: string;
}

const emptyForm: BookingFormData = {
  name: '', phone: '', email: '', date: '', time: '',
  service_id: '', service_name_custom: '', custom_price: '', custom_duration: '',
  staff_id: '', notes: '', referral_source: '',
};

export default function BookingTable({ bookings, onUpdate }: BookingTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<BookingFormData>(emptyForm);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  // メニュー・スタッフ一覧を取得
  useEffect(() => {
    Promise.all([
      fetch('/api/settings/services', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/staff', { cache: 'no-store' }).then(r => r.json()),
    ]).then(([svc, staff]) => {
      setServices(Array.isArray(svc) ? svc.filter((s: Service) => s.is_active) : []);
      setStaffList(Array.isArray(staff) ? staff.filter((s: Staff) => s.is_active) : []);
    }).catch(() => {});
  }, []);

  // bookings が変わったら選択をリセット
  useEffect(() => {
    setSelectedIds(new Set());
  }, [bookings]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === bookings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bookings.map(b => b.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}件の予約を削除しますか？\nこの操作は取り消せません。`)) return;
    setBatchDeleting(true);
    try {
      const res = await fetch('/api/bookings/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '削除に失敗しました');
      }
      toast.success(`${selectedIds.size}件の予約を削除しました`);
      setSelectedIds(new Set());
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (status === 'cancelled' && !confirm('この予約をキャンセルしますか？')) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        cache: 'no-store',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '更新に失敗しました');
      }
      toast.success(status === 'completed' ? '完了にしました' : status === 'cancelled' ? 'キャンセルしました' : '更新しました');
      onUpdate();
      if (detailBooking?.id === id) setDetailBooking(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreate = async () => {
    if (!form.name) {
      toast.error('名前は必須です');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_mode: true,
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
          date: form.date || undefined,
          time: form.time || undefined,
          service_id: form.service_id || undefined,
          service_name_custom: form.service_name_custom || undefined,
          custom_price: form.custom_price ? Number(form.custom_price) : undefined,
          custom_duration: form.custom_duration ? Number(form.custom_duration) : undefined,
          staff_id: form.staff_id || undefined,
          notes: form.notes || undefined,
          referral_source: form.referral_source || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '予約作成に失敗しました');
      }
      toast.success('予約を作成しました');
      setShowCreateForm(false);
      setForm(emptyForm);
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '予約作成に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editBooking) return;
    setSaving(true);
    try {
      const selectedService = services.find(s => s.id === form.service_id);
      const selectedStaff = staffList.find(s => s.id === form.staff_id);
      const res = await fetch(`/api/bookings/${editBooking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          date: form.date,
          time: form.time,
          service_id: form.service_id,
          service_name: form.service_name_custom || selectedService?.name || editBooking.service_name,
          duration: form.custom_duration ? Number(form.custom_duration) : (selectedService?.duration || editBooking.duration),
          price: form.custom_price ? Number(form.custom_price) : (selectedService?.price || editBooking.price),
          staff_id: form.staff_id,
          staff_name: selectedStaff?.name || '',
          notes: form.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '更新に失敗しました');
      }
      toast.success('予約を更新しました');
      setEditBooking(null);
      setForm(emptyForm);
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この予約を完全に削除しますか？この操作は取り消せません。')) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      toast.success('予約を削除しました');
      setDetailBooking(null);
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  const openEdit = (b: Booking) => {
    setForm({
      name: b.name,
      phone: b.phone,
      email: b.email || '',
      date: b.date,
      time: b.time,
      service_id: b.service_id,
      service_name_custom: '',
      custom_price: String(b.price || ''),
      custom_duration: String(b.duration || ''),
      staff_id: b.staff_id || '',
      notes: b.notes || '',
      referral_source: b.referral_source || '',
    });
    setEditBooking(b);
    setDetailBooking(null);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setShowCreateForm(true);
  };

  const isAllSelected = bookings.length > 0 && selectedIds.size === bookings.length;

  // フォームモーダル（新規・編集共用）
  const renderFormModal = (isEdit: boolean) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setShowCreateForm(false); setEditBooking(null); }}>
      <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-fadeIn" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-5">{isEdit ? '予約を編集' : '新規予約を作成'}</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">お名前 *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="山田 太郎" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
              <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="090-1234-5678" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メール</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">時間</label>
              <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メニュー</label>
            <select value={form.service_id} onChange={e => {
              const svc = services.find(s => s.id === e.target.value);
              setForm({
                ...form,
                service_id: e.target.value,
                service_name_custom: '',
                custom_price: svc ? String(svc.price) : form.custom_price,
                custom_duration: svc ? String(svc.duration) : form.custom_duration,
              });
            }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">選択してください</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}（{s.duration}分 / ¥{s.price.toLocaleString()}）</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メニュー名（カスタム）
              <span className="text-xs text-gray-400 ml-1">※上のメニューと別名にしたい場合</span>
            </label>
            <input type="text" value={form.service_name_custom} onChange={e => setForm({...form, service_name_custom: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="例: 初回限定ヘッドスパ" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">金額（円）</label>
              <input type="number" value={form.custom_price} onChange={e => setForm({...form, custom_price: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="8000" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所要時間（分）</label>
              <input type="number" value={form.custom_duration} onChange={e => setForm({...form, custom_duration: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="60" min="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">担当スタッフ</label>
            <select value={form.staff_id} onChange={e => setForm({...form, staff_id: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">指定なし</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">流入経路</label>
            <select value={form.referral_source} onChange={e => setForm({...form, referral_source: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">備考・メモ</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => { setShowCreateForm(false); setEditBooking(null); }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">キャンセル</button>
          <button onClick={isEdit ? handleEdit : handleCreate} disabled={saving}
            className="flex-1 px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm hover:bg-[#B89555] disabled:opacity-50">
            {saving ? '保存中...' : isEdit ? '更新する' : '予約を作成'}
          </button>
        </div>
      </div>
    </div>
  );

  // 詳細モーダル
  const renderDetailModal = (b: Booking) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetailBooking(null)}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto animate-fadeIn" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">予約詳細</h3>
          <StatusBadge status={b.status} />
        </div>

        <div className="space-y-3">
          {[
            { label: 'お名前', value: b.name },
            { label: '電話番号', value: b.phone },
            { label: 'メール', value: b.email || '-' },
            { label: '日時', value: `${b.date} ${b.time}〜` },
            { label: 'メニュー', value: `${b.service_name}（${b.duration}分）` },
            { label: '料金', value: `¥${b.price.toLocaleString()}` },
            { label: '担当', value: b.staff_name || '未指定' },
            { label: '備考', value: b.notes || '-' },
            { label: '予約日', value: b.created_at?.split('T')[0] || '-' },
          ].map(item => (
            <div key={item.label} className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">{item.label}</span>
              <span className="text-sm text-gray-900 text-right max-w-[60%]">{item.value}</span>
            </div>
          ))}
        </div>

        {b.customer_id && (
          <a href={`/admin/customers/${b.customer_id}`}
            className="block mt-4 text-center text-sm text-[#C9A96E] hover:underline">
            顧客カルテを見る →
          </a>
        )}

        <div className="flex gap-2 mt-6">
          <button onClick={() => setDetailBooking(null)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">閉じる</button>
          {b.status === 'confirmed' && (
            <>
              <button onClick={() => openEdit(b)}
                className="flex-1 px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm hover:bg-[#B89555]">編集</button>
              <button onClick={() => handleStatusChange(b.id, 'completed')}
                disabled={loadingId === b.id}
                className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 disabled:opacity-50">完了</button>
              <button onClick={() => handleStatusChange(b.id, 'cancelled')}
                disabled={loadingId === b.id}
                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 disabled:opacity-50">取消</button>
            </>
          )}
        </div>

        {b.status !== 'confirmed' && (
          <button onClick={() => handleDelete(b.id)}
            className="w-full mt-2 px-4 py-2 text-xs text-red-400 hover:text-red-600 transition-colors">
            予約を削除
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 新規予約ボタン */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={openCreate}
          className="px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm font-medium hover:bg-[#B89555] transition-colors">
          + 新規予約を作成
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between animate-fadeIn">
          <span className="text-sm text-red-700 font-medium">
            {selectedIds.size}件選択中
          </span>
          <button
            onClick={handleBatchDelete}
            disabled={batchDeleting}
            className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {batchDeleting ? '削除中...' : `${selectedIds.size}件を削除`}
          </button>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">予約がありません</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#C9A96E] focus:ring-[#C9A96E] cursor-pointer"
                  />
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">日時</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">お名前</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">メニュー</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">担当</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">料金</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">状態</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectedIds.has(booking.id) ? 'bg-red-50/50' : ''}`}
                  onClick={() => setDetailBooking(booking)}>
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(booking.id)}
                      onChange={() => toggleSelect(booking.id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#C9A96E] focus:ring-[#C9A96E] cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{booking.date}</div>
                    <div className="text-gray-500">{booking.time}〜</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{booking.name}</div>
                    <div className="text-xs text-gray-400">{booking.phone}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-gray-900">{booking.service_name}</div>
                    <div className="text-gray-500">{booking.duration}分</div>
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{booking.staff_name || '-'}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">¥{booking.price.toLocaleString()}</td>
                  <td className="py-3 px-4"><StatusBadge status={booking.status} /></td>
                  <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                    {booking.status === 'confirmed' && (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(booking)}
                          className="text-xs px-2 py-1.5 bg-[#C9A96E]/10 text-[#A07840] rounded-md hover:bg-[#C9A96E]/20 transition-colors">
                          編集
                        </button>
                        <button onClick={() => handleStatusChange(booking.id, 'completed')}
                          disabled={loadingId === booking.id}
                          className="text-xs px-2 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50">
                          完了
                        </button>
                        <button onClick={() => handleStatusChange(booking.id, 'cancelled')}
                          disabled={loadingId === booking.id}
                          className="text-xs px-2 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50">
                          取消
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCreateForm && renderFormModal(false)}
      {editBooking && renderFormModal(true)}
      {detailBooking && renderDetailModal(detailBooking)}
    </>
  );
}
