'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { ja } from 'date-fns/locale';
// types used inline via Record<string, unknown>

type ReportType = 'daily' | 'monthly' | 'service' | 'staff';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalBookings: 0, avgPrice: 0, otherIncome: 0 });

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports?type=${reportType}&start_date=${startDate}&end_date=${endDate}`,
        { cache: 'no-store' }
      );
      const result = await res.json();
      const rows = result.data || (Array.isArray(result) ? result : []);
      const otherIncomeTotal = result.other_income_total || 0;
      setData(rows);

      // Calculate summary
      if (Array.isArray(rows)) {
        const totalRevenue = rows.reduce((sum: number, r: Record<string, unknown>) => sum + (Number(r.revenue) || 0), 0);
        const totalBookings = rows.reduce((sum: number, r: Record<string, unknown>) => sum + (Number(r.booking_count) || 0), 0);
        setSummary({
          totalRevenue,
          totalBookings,
          avgPrice: totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0,
          otherIncome: otherIncomeTotal,
        });
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [reportType, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const setPreset = (preset: string) => {
    const now = new Date();
    if (preset === 'thisMonth') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (preset === 'lastMonth') {
      const last = subMonths(now, 1);
      setStartDate(format(startOfMonth(last), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(last), 'yyyy-MM-dd'));
    } else if (preset === 'last3Months') {
      setStartDate(format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (preset === 'thisYear') {
      setStartDate(format(startOfYear(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfYear(now), 'yyyy-MM-dd'));
    }
  };

  const maxRevenue = data.length > 0
    ? Math.max(...data.map((d) => Number(d.revenue) || 0))
    : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">売上レポート</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#C9A96E]/10 rounded-xl p-5">
          <p className="text-sm text-[#8B6914]">施術売上</p>
          <p className="text-2xl font-bold text-[#A07840] mt-1">¥{summary.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-5">
          <p className="text-sm text-purple-600">その他収入</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">¥{summary.otherIncome.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-5">
          <p className="text-sm text-green-600">総売上</p>
          <p className="text-2xl font-bold text-green-700 mt-1">¥{(summary.totalRevenue + summary.otherIncome).toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-5">
          <p className="text-sm text-blue-600">予約{summary.totalBookings}件</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">平均 ¥{summary.avgPrice.toLocaleString()}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Report Type */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'daily', label: '日別' },
              { key: 'monthly', label: '月別' },
              { key: 'service', label: 'メニュー別' },
              { key: 'staff', label: 'スタッフ別' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setReportType(t.key as ReportType);
                  if (t.key === 'monthly') {
                    setStartDate(format(startOfYear(new Date()), 'yyyy-MM-dd'));
                    setEndDate(format(endOfYear(new Date()), 'yyyy-MM-dd'));
                  }
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  reportType === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Date Range */}
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

          {/* Presets */}
          <div className="flex gap-1">
            {[
              { key: 'thisMonth', label: '今月' },
              { key: 'lastMonth', label: '先月' },
              { key: 'last3Months', label: '3ヶ月' },
              { key: 'thisYear', label: '今年' },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart & Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-[#C9A96E] rounded-full" />
          </div>
        ) : data.length === 0 ? (
          <p className="p-8 text-center text-gray-500">データがありません</p>
        ) : (
          <>
            {/* Simple bar chart */}
            {(reportType === 'daily' || reportType === 'monthly') && (
              <div className="p-6 border-b">
                <h3 className="text-sm font-medium text-gray-700 mb-4">売上推移</h3>
                <div className="flex items-end gap-1 h-40">
                  {data.map((d, i) => {
                    const revenue = Number(d.revenue) || 0;
                    const height = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                    const label = reportType === 'daily'
                      ? format(new Date(String(d.date) + 'T00:00:00'), 'M/d')
                      : String(d.month).slice(5);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                        <div className="w-full max-w-[30px] relative group">
                          <div
                            className="w-full bg-[#C9A96E] rounded-t transition-all hover:bg-[#B89555]"
                            style={{ height: `${Math.max(height, 2)}%` }}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block">
                            <div className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                              ¥{revenue.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        {data.length <= 31 && (
                          <span className="text-[10px] text-gray-400 truncate w-full text-center">{label}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Horizontal bars for service/staff */}
            {(reportType === 'service' || reportType === 'staff') && (
              <div className="p-6 border-b">
                <h3 className="text-sm font-medium text-gray-700 mb-4">
                  {reportType === 'service' ? 'メニュー別売上' : 'スタッフ別売上'}
                </h3>
                <div className="space-y-3">
                  {data.map((d, i) => {
                    const revenue = Number(d.revenue) || 0;
                    const width = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                    const name = reportType === 'service'
                      ? String(d.service_name)
                      : String(d.staff_name);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700 font-medium truncate">{name}</span>
                          <span className="text-gray-500 flex-shrink-0 ml-2">¥{revenue.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-4">
                          <div
                            className="bg-[#C9A96E] rounded-full h-4 transition-all"
                            style={{ width: `${Math.max(width, 1)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Data table */}
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    {reportType === 'daily' ? '日付' :
                     reportType === 'monthly' ? '月' :
                     reportType === 'service' ? 'メニュー' : 'スタッフ'}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">予約件数</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">施術売上</th>
                  {(reportType === 'daily' || reportType === 'monthly') && (
                    <>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">その他</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">キャンセル</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => {
                  const label = reportType === 'daily'
                    ? format(new Date(String(d.date) + 'T00:00:00'), 'M月d日（E）', { locale: ja })
                    : reportType === 'monthly'
                    ? String(d.month)
                    : reportType === 'service'
                    ? String(d.service_name)
                    : String(d.staff_name);
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{label}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{String(d.booking_count)}件</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">¥{Number(d.revenue).toLocaleString()}</td>
                      {(reportType === 'daily' || reportType === 'monthly') && (
                        <>
                          <td className="px-4 py-3 text-sm text-right text-purple-600">
                            {Number(d.other_income) > 0 ? `¥${Number(d.other_income).toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-red-500">{String(d.cancelled_count)}件</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">合計</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">{summary.totalBookings}件</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-[#A07840]">¥{summary.totalRevenue.toLocaleString()}</td>
                  {(reportType === 'daily' || reportType === 'monthly') && (
                    <>
                      <td className="px-4 py-3 text-sm text-right font-bold text-purple-600">
                        ¥{summary.otherIncome.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-500">
                        {data.reduce((sum, d) => sum + (Number(d.cancelled_count) || 0), 0)}件
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
