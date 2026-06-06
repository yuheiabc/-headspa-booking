'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { TicketPlan, CustomerTicket, Service, Customer } from '@/types';

export default function TicketsPage() {
  const [tab, setTab] = useState<'plans' | 'issued'>('issued');
  const [plans, setPlans] = useState<TicketPlan[]>([]);
  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Plan form
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', service_id: '', service_name: '', total_count: 5, price: 0 });
  const [planSaving, setPlanSaving] = useState(false);

  // Issue form
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueForm, setIssueForm] = useState({ customer_id: '', customer_name: '', plan_id: '', plan_name: '', service_name: '', total_count: 5, expires_at: '', memo: '' });
  const [issueSaving, setIssueSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [plansRes, ticketsRes, svcRes, custRes] = await Promise.all([
        fetch('/api/tickets/plans', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/tickets', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/settings/services', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/customers?limit=200', { cache: 'no-store' }).then(r => r.json()),
      ]);
      setPlans(Array.isArray(plansRes) ? plansRes : []);
      setTickets(Array.isArray(ticketsRes) ? ticketsRes : []);
      setServices(Array.isArray(svcRes) ? svcRes.filter((s: Service) => s.is_active) : []);
      setCustomers(custRes.customers || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSavePlan = async () => {
    if (!planForm.name) { toast.error('プラン名を入力してください'); return; }
    setPlanSaving(true);
    try {
      const svc = services.find(s => s.id === planForm.service_id);
      const res = await fetch('/api/tickets/plans', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...planForm, service_name: svc?.name || planForm.service_name }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '作成に失敗しました');
      toast.success('プランを作成しました');
      setShowPlanForm(false);
      setPlanForm({ name: '', service_id: '', service_name: '', total_count: 5, price: 0 });
      await fetchData();
    } catch (err) { toast.error(err instanceof Error ? err.message : '作成に失敗しました'); }
    finally { setPlanSaving(false); }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('このプランを削除しますか？')) return;
    await fetch(`/api/tickets/plans/${id}`, { method: 'DELETE' });
    toast.success('削除しました');
    fetchData();
  };

  const handleIssue = async () => {
    if (!issueForm.customer_id || !issueForm.plan_name) { toast.error('顧客とプランを選択してください'); return; }
    setIssueSaving(true);
    try {
      const cust = customers.find(c => c.id === issueForm.customer_id);
      const res = await fetch('/api/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: issueForm.customer_id,
          customer_name: cust?.name || issueForm.customer_name,
          ticket_plan_id: issueForm.plan_id,
          plan_name: issueForm.plan_name,
          service_name: issueForm.service_name,
          total_count: issueForm.total_count,
          expires_at: issueForm.expires_at,
          memo: issueForm.memo,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '発行に失敗しました');
      toast.success('回数券を発行しました');
      setShowIssueForm(false);
      setIssueForm({ customer_id: '', customer_name: '', plan_id: '', plan_name: '', service_name: '', total_count: 5, expires_at: '', memo: '' });
      await fetchData();
    } catch (err) { toast.error(err instanceof Error ? err.message : '発行に失敗しました'); }
    finally { setIssueSaving(false); }
  };

  const handleUseTicket = async (id: number) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'use' }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '消化に失敗しました');
      toast.success('1回消化しました');
      fetchData();
    } catch (err) { toast.error(err instanceof Error ? err.message : '消化に失敗しました'); }
  };

  const handleUndoTicket = async (id: number) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'undo' }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '取消に失敗しました');
      toast.success('消化を取り消しました');
      fetchData();
    } catch (err) { toast.error(err instanceof Error ? err.message : '取消に失敗しました'); }
  };

  const selectPlan = (plan: TicketPlan) => {
    setIssueForm({
      ...issueForm,
      plan_id: plan.id,
      plan_name: plan.name,
      service_name: plan.service_name,
      total_count: plan.total_count,
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#C9A96E] rounded-full" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">回数券管理</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[{ key: 'issued', label: `発行済み (${tickets.length})` }, { key: 'plans', label: 'プラン設定' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as 'plans' | 'issued')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Issued tickets */}
      {tab === 'issued' && (
        <div>
          <button onClick={() => setShowIssueForm(true)}
            className="mb-4 px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm hover:bg-[#B89555]">
            + 回数券を発行
          </button>

          {tickets.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-500">発行済みの回数券がありません</div>
          ) : (
            <div className="space-y-3">
              {tickets.map(t => (
                <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-medium text-gray-900">{t.customer_name}</span>
                      <span className="text-sm text-gray-500 ml-2">{t.plan_name}</span>
                    </div>
                    <div className={`text-sm font-bold px-3 py-1 rounded-full ${t.remaining_count > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      残り {t.remaining_count} / {t.total_count} 回
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                    <div className="bg-[#C9A96E] rounded-full h-2 transition-all" style={{ width: `${(t.used_count / t.total_count) * 100}%` }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      {t.service_name && <span className="mr-3">{t.service_name}</span>}
                      購入: {t.purchased_at?.split('T')[0]}
                      {t.expires_at && <span className="ml-2">期限: {t.expires_at}</span>}
                    </div>
                    <div className="flex gap-2">
                      {t.remaining_count > 0 && (
                        <button onClick={() => handleUseTicket(t.id)}
                          className="text-xs px-3 py-1.5 bg-[#C9A96E] text-white rounded-md hover:bg-[#B89555]">
                          1回消化
                        </button>
                      )}
                      {t.used_count > 0 && (
                        <button onClick={() => handleUndoTicket(t.id)}
                          className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200">
                          取消
                        </button>
                      )}
                    </div>
                  </div>
                  {t.memo && <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-50">{t.memo}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Issue modal */}
          {showIssueForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowIssueForm(false)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto animate-fadeIn" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">回数券を発行</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">顧客 *</label>
                    <select value={issueForm.customer_id} onChange={e => setIssueForm({...issueForm, customer_id: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">選択してください</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}（{c.phone}）</option>)}
                    </select>
                  </div>
                  {plans.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">プランから選択</label>
                      <div className="flex flex-wrap gap-2">
                        {plans.filter(p => p.is_active).map(p => (
                          <button key={p.id} onClick={() => selectPlan(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${issueForm.plan_id === p.id ? 'bg-[#C9A96E] text-white border-[#C9A96E]' : 'border-gray-200 hover:bg-gray-50'}`}>
                            {p.name}（{p.total_count}回）
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">プラン名 *</label>
                    <input type="text" value={issueForm.plan_name} onChange={e => setIssueForm({...issueForm, plan_name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="例: ヘッドスパ5回券" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">回数</label>
                      <input type="number" value={issueForm.total_count} onChange={e => setIssueForm({...issueForm, total_count: Number(e.target.value)})}
                        min={1} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">有効期限</label>
                      <input type="date" value={issueForm.expires_at} onChange={e => setIssueForm({...issueForm, expires_at: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                    <input type="text" value={issueForm.memo} onChange={e => setIssueForm({...issueForm, memo: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowIssueForm(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">キャンセル</button>
                  <button onClick={handleIssue} disabled={issueSaving} className="flex-1 px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm disabled:opacity-50">
                    {issueSaving ? '発行中...' : '発行する'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plans tab */}
      {tab === 'plans' && (
        <div>
          <button onClick={() => setShowPlanForm(true)}
            className="mb-4 px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm hover:bg-[#B89555]">
            + プラン追加
          </button>

          {plans.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-500">プランが登録されていません</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">プラン名</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">対象メニュー</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">回数</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">価格</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{p.service_name || '全メニュー'}</td>
                      <td className="px-4 py-3 text-center text-sm">{p.total_count}回</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">¥{p.price.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeletePlan(p.id)} className="text-xs text-red-500 hover:underline">削除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Plan form modal */}
          {showPlanForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPlanForm(false)}>
              <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 animate-fadeIn" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">回数券プラン追加</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">プラン名 *</label>
                    <input type="text" value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="例: ヘッドスパ5回券" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">対象メニュー</label>
                    <select value={planForm.service_id} onChange={e => {
                      const svc = services.find(s => s.id === e.target.value);
                      setPlanForm({...planForm, service_id: e.target.value, service_name: svc?.name || ''});
                    }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">全メニュー共通</option>
                      {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">回数</label>
                      <input type="number" value={planForm.total_count} onChange={e => setPlanForm({...planForm, total_count: Number(e.target.value)})}
                        min={1} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">販売価格</label>
                      <input type="number" value={planForm.price} onChange={e => setPlanForm({...planForm, price: Number(e.target.value)})}
                        min={0} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowPlanForm(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">キャンセル</button>
                  <button onClick={handleSavePlan} disabled={planSaving} className="flex-1 px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm disabled:opacity-50">
                    {planSaving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
