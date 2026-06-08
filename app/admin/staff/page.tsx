'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Staff, StaffShift } from '@/types';
import { format, startOfWeek, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';

const COLORS = ['#C9A96E', '#6E9FC9', '#C96E6E', '#6EC96E', '#9F6EC9', '#C9966E', '#6EC9C9', '#C96EB0'];

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<(StaffShift & { staff_name?: string; staff_color?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState({ name: '', role: '', color: '#C9A96E' });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'list' | 'shift'>('list');
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [shiftSaving, setShiftSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/staff', { cache: 'no-store' });
      const data = await res.json();
      setStaff(data);
    } catch { /* ignore */ }
  }, []);

  const fetchShifts = useCallback(async () => {
    const start = format(weekStart, 'yyyy-MM-dd');
    const end = format(addDays(weekStart, 6), 'yyyy-MM-dd');
    try {
      const res = await fetch(`/api/staff/shifts?start_date=${start}&end_date=${end}`, { cache: 'no-store' });
      const data = await res.json();
      setShifts(data);
    } catch { /* ignore */ }
  }, [weekStart]);

  useEffect(() => {
    Promise.all([fetchStaff(), fetchShifts()]).then(() => setLoading(false));
  }, [fetchStaff, fetchShifts]);

  const handleSaveStaff = async () => {
    setSaving(true);
    try {
      const url = editingStaff ? `/api/staff/${editingStaff.id}` : '/api/staff';
      const method = editingStaff ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setShowForm(false);
      setEditingStaff(null);
      setForm({ name: '', role: '', color: '#C9A96E' });
      await fetchStaff();
      showMessage('保存しました');
    } catch (err) {
      showMessage(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('このスタッフを削除しますか？')) return;
    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.deactivated) {
        showMessage('既存の予約があるため、非アクティブにしました');
      } else {
        showMessage('削除しました');
      }
      await fetchStaff();
    } catch {
      showMessage('削除に失敗しました');
    }
  };

  const handleToggleActive = async (s: Staff) => {
    try {
      await fetch(`/api/staff/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !s.is_active }),
      });
      await fetchStaff();
    } catch { /* ignore */ }
  };

  const handleShiftToggle = async (staffId: string, date: string, currentShift?: typeof shifts[0]) => {
    setShiftSaving(true);
    try {
      if (currentShift && !currentShift.is_off) {
        // Currently working → mark as off
        await fetch('/api/staff/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staff_id: staffId, date, is_off: true }),
        });
      } else if (currentShift && currentShift.is_off) {
        // Currently off → remove shift (back to default)
        await fetch(`/api/staff/shifts?staff_id=${staffId}&date=${date}`, { method: 'DELETE' });
      } else {
        // No shift → add working shift
        await fetch('/api/staff/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staff_id: staffId, date, start_time: '10:00', end_time: '20:00', is_off: false }),
        });
      }
      await fetchShifts();
    } catch { /* ignore */ } finally {
      setShiftSaving(false);
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const activeStaff = staff.filter((s) => s.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#C9A96E] rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">スタッフ・シフト管理</h1>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{message}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('list')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          スタッフ一覧
        </button>
        <button
          onClick={() => setTab('shift')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'shift' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          シフト管理
        </button>
      </div>

      {tab === 'list' && (
        <div>
          <button
            onClick={() => {
              setEditingStaff(null);
              setForm({ name: '', role: '', color: COLORS[staff.length % COLORS.length] });
              setShowForm(true);
            }}
            className="mb-4 px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm hover:bg-[#B89555] transition-colors"
          >
            + スタッフ追加
          </button>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {staff.length === 0 ? (
              <p className="p-8 text-center text-gray-500">スタッフが登録されていません</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">カラー</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">名前</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">役職</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">状態</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: s.color }} />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.role || '-'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(s)}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            s.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {s.is_active ? 'アクティブ' : '非アクティブ'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditingStaff(s);
                            setForm({ name: s.name, role: s.role, color: s.color });
                            setShowForm(true);
                          }}
                          className="text-sm text-[#C9A96E] hover:underline mr-3"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(s.id)}
                          className="text-sm text-red-500 hover:underline"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Staff Form Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">{editingStaff ? 'スタッフ編集' : 'スタッフ追加'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名前 *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="例: 山田 花子"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">役職</label>
                    <input
                      type="text"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="例: スパニスト"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">カラー</label>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setForm({ ...form, color: c })}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
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
                    onClick={handleSaveStaff}
                    disabled={saving || !form.name}
                    className="flex-1 px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm hover:bg-[#B89555] disabled:opacity-50"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'shift' && (
        <div>
          {/* Week navigation */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              ← 前週
            </button>
            <span className="text-sm font-medium text-gray-700">
              {format(weekStart, 'yyyy年M月d日', { locale: ja })} 〜 {format(addDays(weekStart, 6), 'M月d日', { locale: ja })}
            </span>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              翌週 →
            </button>
          </div>

          {activeStaff.length === 0 ? (
            <p className="p-8 text-center text-gray-500 bg-white rounded-xl border">先にスタッフを登録してください</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-32">スタッフ</th>
                    {weekDays.map((d) => (
                      <th key={d.toISOString()} className="text-center px-2 py-3 text-xs font-medium text-gray-500">
                        <div>{format(d, 'E', { locale: ja })}</div>
                        <div className="text-sm">{format(d, 'M/d')}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeStaff.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-sm font-medium">{s.name}</span>
                        </div>
                      </td>
                      {weekDays.map((d) => {
                        const dateStr = format(d, 'yyyy-MM-dd');
                        const shift = shifts.find(
                          (sh) => sh.staff_id === s.id && sh.date === dateStr
                        );
                        return (
                          <td key={dateStr} className="px-2 py-3 text-center">
                            <button
                              onClick={() => handleShiftToggle(s.id, dateStr, shift)}
                              disabled={shiftSaving}
                              className={`w-full px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                                shift?.is_off
                                  ? 'bg-red-50 text-red-600'
                                  : shift
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                              }`}
                            >
                              {shift?.is_off ? '休み' : shift ? `${shift.start_time}-${shift.end_time}` : '未設定'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t bg-gray-50 text-xs text-gray-500">
                クリックで切り替え: 未設定 → 出勤 → 休み → 未設定
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
