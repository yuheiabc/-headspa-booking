'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Customer, CustomerNote, Booking, Staff } from '@/types';
import { format } from 'date-fns';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    staff_id: '',
    staff_name: '',
    service_name: '',
    content: '',
    scalp_condition: '',
    treatment_detail: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'info' | 'notes' | 'history'>('info');

  const fetchData = useCallback(async () => {
    try {
      const [customerRes, staffRes] = await Promise.all([
        fetch(`/api/customers/${id}`, { cache: 'no-store' }),
        fetch('/api/staff', { cache: 'no-store' }),
      ]);
      const customerData = await customerRes.json();
      const staffData = await staffRes.json();

      if (customerData.error) {
        router.push('/admin/customers');
        return;
      }

      setCustomer(customerData.customer);
      setBookings(customerData.bookings || []);
      setNotes(customerData.notes || []);
      setStaffList(staffData.filter((s: Staff) => s.is_active));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveCustomer = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('更新に失敗しました');
      const data = await res.json();
      setCustomer(data);
      setEditing(false);
      showMsg('保存しました');
    } catch (err) {
      showMsg(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNote = async () => {
    setSaving(true);
    try {
      const staffName = staffList.find((s) => s.id === noteForm.staff_id)?.name || '';
      const res = await fetch(`/api/customers/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...noteForm, staff_name: staffName }),
      });
      if (!res.ok) throw new Error('保存に失敗しました');
      setShowNoteForm(false);
      setNoteForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        staff_id: '',
        staff_name: '',
        service_name: '',
        content: '',
        scalp_condition: '',
        treatment_detail: '',
      });
      await fetchData();
      showMsg('カルテを保存しました');
    } catch (err) {
      showMsg(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading || !customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#C9A96E] rounded-full" />
      </div>
    );
  }

  const genderLabel = { male: '男性', female: '女性', other: 'その他' }[customer.gender] || '';

  return (
    <div>
      <button
        onClick={() => router.push('/admin/customers')}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
      >
        ← 顧客一覧に戻る
      </button>

      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{message}</div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span>{customer.phone}</span>
              {customer.email && <span>{customer.email}</span>}
              {genderLabel && <span>{genderLabel}</span>}
            </div>
          </div>
          <div className="flex items-center gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-[#C9A96E]">{customer.visit_count}</p>
              <p className="text-xs text-gray-500">来店回数</p>
            </div>
            {customer.last_visit && (
              <div>
                <p className="text-sm font-medium text-gray-700">{customer.last_visit}</p>
                <p className="text-xs text-gray-500">最終来店</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'info', label: '顧客情報' },
          { key: 'notes', label: `施術カルテ (${notes.length})` },
          { key: 'history', label: `来店履歴 (${bookings.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {tab === 'info' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {editing ? (
            <div className="space-y-4">
              {[
                { label: '名前', key: 'name', type: 'text' },
                { label: '電話番号', key: 'phone', type: 'tel' },
                { label: 'メール', key: 'email', type: 'email' },
                { label: '誕生日', key: 'birthday', type: 'date' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={(editForm[field.key as keyof Customer] as string) || ''}
                    onChange={(e) => setEditForm({ ...editForm, [field.key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">性別</label>
                <select
                  value={editForm.gender || ''}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">未選択</option>
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">流入経路</label>
                <select
                  value={editForm.referral_source || ''}
                  onChange={(e) => setEditForm({ ...editForm, referral_source: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">未選択</option>
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
                  value={editForm.memo || ''}
                  onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="アレルギー、髪質、好みなど"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditing(false)} className="px-4 py-2 border rounded-lg text-sm">キャンセル</button>
                <button onClick={handleSaveCustomer} disabled={saving} className="px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm disabled:opacity-50">
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    setEditForm({
                      name: customer.name,
                      phone: customer.phone,
                      email: customer.email,
                      gender: customer.gender,
                      birthday: customer.birthday,
                      memo: customer.memo,
                      referral_source: customer.referral_source,
                    });
                    setEditing(true);
                  }}
                  className="text-sm text-[#C9A96E] hover:underline"
                >
                  編集
                </button>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: '電話番号', value: customer.phone },
                  { label: 'メール', value: customer.email || '-' },
                  { label: '性別', value: genderLabel || '-' },
                  { label: '誕生日', value: customer.birthday || '-' },
                  { label: '流入経路', value: customer.referral_source || '-' },
                  { label: '登録日', value: customer.created_at?.split('T')[0] || '-' },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs text-gray-500">{item.label}</dt>
                    <dd className="text-sm text-gray-900 mt-0.5">{item.value}</dd>
                  </div>
                ))}
              </dl>
              {customer.memo && (
                <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium mb-1">メモ</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{customer.memo}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {tab === 'notes' && (
        <div>
          <button
            onClick={() => setShowNoteForm(true)}
            className="mb-4 px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm hover:bg-[#B89555]"
          >
            + 施術カルテ追加
          </button>

          {notes.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-500">施術カルテがありません</div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">{note.date}</span>
                      {note.service_name && (
                        <span className="px-2 py-0.5 bg-[#C9A96E]/10 text-[#A07840] rounded text-xs">{note.service_name}</span>
                      )}
                    </div>
                    {note.staff_name && (
                      <span className="text-xs text-gray-500">担当: {note.staff_name}</span>
                    )}
                  </div>
                  {note.scalp_condition && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-500">頭皮状態: </span>
                      <span className="text-sm text-gray-700">{note.scalp_condition}</span>
                    </div>
                  )}
                  {note.treatment_detail && (
                    <div className="mb-2">
                      <span className="text-xs text-gray-500">施術内容: </span>
                      <span className="text-sm text-gray-700">{note.treatment_detail}</span>
                    </div>
                  )}
                  {note.content && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2 pt-2 border-t border-gray-100">{note.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Note Form Modal */}
          {showNoteForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowNoteForm(false)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">施術カルテ追加</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">施術日</label>
                      <input
                        type="date"
                        value={noteForm.date}
                        onChange={(e) => setNoteForm({ ...noteForm, date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">担当スタッフ</label>
                      <select
                        value={noteForm.staff_id}
                        onChange={(e) => setNoteForm({ ...noteForm, staff_id: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">選択してください</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">施術メニュー</label>
                    <input
                      type="text"
                      value={noteForm.service_name}
                      onChange={(e) => setNoteForm({ ...noteForm, service_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="例: ヘッドスパ 60分"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">頭皮状態</label>
                    <input
                      type="text"
                      value={noteForm.scalp_condition}
                      onChange={(e) => setNoteForm({ ...noteForm, scalp_condition: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="例: やや乾燥、フケあり"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">施術内容</label>
                    <textarea
                      value={noteForm.treatment_detail}
                      onChange={(e) => setNoteForm({ ...noteForm, treatment_detail: e.target.value })}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="使用した製品、施術手順など"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">メモ・所見</label>
                    <textarea
                      value={noteForm.content}
                      onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="次回への引き継ぎ事項など"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowNoteForm(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">キャンセル</button>
                  <button
                    onClick={handleSaveNote}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {bookings.length === 0 ? (
            <p className="p-8 text-center text-gray-500">来店履歴がありません</p>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">日時</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">メニュー</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">担当</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">料金</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">状態</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm">{b.date} {b.time}</td>
                    <td className="px-4 py-3 text-sm">{b.service_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{b.staff_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">¥{b.price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        b.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                        b.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {b.status === 'confirmed' ? '確定' : b.status === 'cancelled' ? 'キャンセル' : '完了'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
