'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

interface GoogleStatus {
  ical_connected: boolean;
  ical_url_set: boolean;
  api_configured: boolean;
  api_connected: boolean;
  connected_email: string;
}

export default function GoogleSettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#C9A96E] rounded-full" />
      </div>
    }>
      <GoogleSettingsPageInner />
    </Suspense>
  );
}

function GoogleSettingsPageInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/google-calendar/status');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({
        ical_connected: false, ical_url_set: false,
        api_configured: false, api_connected: false, connected_email: '',
      });
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    if (success === 'connected') {
      toast.success('Googleカレンダーと接続しました');
      fetchStatus();
    }
    if (error === 'access_denied') toast.error('Googleアカウントへのアクセスが拒否されました');
    if (error === 'no_code') toast.error('認証コードが取得できませんでした');
    if (error === 'token_exchange_failed') toast.error('トークンの取得に失敗しました');
  }, [searchParams, fetchStatus]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/google-calendar?date=${today}`);
      const data = await res.json();
      if (res.ok) {
        setTestResult({
          ok: true,
          message: `接続成功！本日の予定: ${data.events?.length ?? 0}件`,
        });
      } else {
        setTestResult({ ok: false, message: data.error || '接続テストに失敗しました' });
      }
    } catch {
      setTestResult({ ok: false, message: '接続テストに失敗しました' });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch('/api/auth/google');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'OAuth URLの生成に失敗しました');
        setConnecting(false);
      }
    } catch {
      toast.error('接続処理でエラーが発生しました');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Googleカレンダーとの接続を解除しますか？\n予約の自動追加が停止します。')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/google-calendar/status', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Googleカレンダーとの接続を解除しました');
        fetchStatus();
      }
    } catch {
      toast.error('接続解除に失敗しました');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          <a href="/admin" className="hover:text-gray-700">管理トップ</a>
          <span className="mx-2">/</span>
          <a href="/admin/settings" className="hover:text-gray-700">設定</a>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Google連携</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Google連携設定</h1>
      </div>

      <div className="space-y-6">
        {/* Google Calendar API連携（読み書き） */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Google Calendar API連携（読み書き）</h3>
              <p className="text-sm text-gray-500 mb-4">
                API連携を設定すると、予約作成時にGoogleカレンダーへ自動でイベントが追加されます。
                キャンセル時にはカレンダーからも自動削除されます。
              </p>
            </div>

            {/* 接続状態 */}
            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${
                status?.api_connected ? 'bg-green-500 animate-pulse' : status?.api_configured ? 'bg-yellow-500' : 'bg-gray-300'
              }`} />
              <span className={`text-sm font-medium ${
                status?.api_connected ? 'text-green-700' : status?.api_configured ? 'text-yellow-700' : 'text-gray-500'
              }`}>
                {status?.api_connected
                  ? `API接続済み${status.connected_email ? ` (${status.connected_email})` : ''}`
                  : status?.api_configured
                  ? 'クレデンシャル設定済み — Googleアカウントを接続してください'
                  : 'API未設定'}
              </span>
            </div>

            {/* 接続 / 切断ボタン */}
            {status?.api_configured && (
              <div className="flex items-center gap-3">
                {status.api_connected ? (
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {disconnecting ? '解除中...' : '接続を解除'}
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {connecting ? '接続中...' : 'Googleアカウントを接続'}
                  </button>
                )}
              </div>
            )}

            {/* 未設定時の案内 */}
            {!status?.api_configured && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">API設定手順</h4>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>
                    <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Google Cloud Console
                    </a>
                    でプロジェクトを作成
                  </li>
                  <li>「APIとサービス」→「ライブラリ」から <strong>Google Calendar API</strong> を有効化</li>
                  <li>「APIとサービス」→「認証情報」→「OAuth 2.0 クライアント ID」を作成
                    <ul className="ml-4 mt-1 text-gray-500 space-y-1">
                      <li>・アプリケーションの種類: <strong>ウェブアプリケーション</strong></li>
                      <li>・承認済みリダイレクト URI: <code className="bg-gray-200 px-1 rounded text-xs">http://localhost:3000/api/auth/callback/google</code></li>
                    </ul>
                  </li>
                  <li>「OAuth同意画面」を設定（テストユーザーに自分のGmailを追加）</li>
                  <li><code className="bg-gray-200 px-1 rounded text-xs">.env.local</code> に以下を設定:
                    <pre className="mt-1 bg-gray-200 p-2 rounded text-xs overflow-x-auto">
{`GOOGLE_CLIENT_ID=取得したクライアントID
GOOGLE_CLIENT_SECRET=取得したクライアントシークレット`}
                    </pre>
                  </li>
                  <li>サーバーを再起動（<code className="bg-gray-200 px-1 rounded text-xs">npm run dev</code>）</li>
                  <li>この画面に戻り「Googleアカウントを接続」ボタンをクリック</li>
                </ol>
              </div>
            )}

            {/* 接続済みの場合の説明 */}
            {status?.api_connected && (
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <p className="text-xs text-green-700">
                  予約作成時 → Googleカレンダーにイベント自動追加<br/>
                  予約キャンセル時 → Googleカレンダーからイベント自動削除
                </p>
              </div>
            )}
          </div>
        </div>

        {/* iCalフィード連携 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">iCalフィード連携（読み取り専用）</h3>
              <p className="text-sm text-gray-500 mb-4">
                GoogleカレンダーのiCalフィードURLを設定すると、既存の予定を考慮して空き枠を自動計算します。
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${
                status?.ical_url_set ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <span className={`text-sm ${status?.ical_url_set ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                {status?.ical_url_set ? 'iCalフィード設定済み' : 'iCalフィード未設定'}
              </span>
            </div>

            {status?.ical_url_set && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="px-4 py-2 bg-[#C9A96E] text-white rounded-lg text-sm font-medium hover:bg-[#A07840] transition-colors disabled:opacity-50"
                >
                  {testing ? 'テスト中...' : '接続テスト'}
                </button>
                {testResult && (
                  <span className={`text-sm ${testResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                    {testResult.message}
                  </span>
                )}
              </div>
            )}

            {!status?.ical_url_set && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-700">iCalフィードURL取得手順</h4>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>Googleカレンダーの設定を開く</li>
                  <li>対象カレンダーの「カレンダーの統合」セクションへ</li>
                  <li>「限定公開URLのiCal形式」のURLをコピー</li>
                  <li>.env.local の GOOGLE_ICAL_URL に設定</li>
                  <li>サーバーを再起動</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
