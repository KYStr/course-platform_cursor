import { useState } from 'react';
import { FiKey, FiX, FiCopy, FiCheck, FiSearch } from 'react-icons/fi';

export default function AccountLookup({ courseId, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const [queryKey, setQueryKey] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const handleSearch = async () => {
    if (!queryKey.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const res = await fetch(`/api/courses/${courseId}/account-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryKey: queryKey.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '查詢失敗');
        return;
      }

      setResult(data);
    } catch (err) {
      setError('查詢失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleCopy = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  return (
    <>
      {/* 悬浮按钮 */}
      {!isOpen && (
        <button
          className="account-fab"
          onClick={() => setIsOpen(true)}
          title="帳號查詢"
        >
          <FiKey />
        </button>
      )}

      {/* 查询面板 */}
      {isOpen && (
        <div className="account-panel">
          <div className="account-panel-header">
            <h4>帳號查詢</h4>
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              <FiX />
            </button>
          </div>

          <div className="account-panel-body">
            <label className="search-label">{label || '請輸入查詢資訊'}</label>
            <div className="search-row">
              <input
                type="text"
                value={queryKey}
                onChange={(e) => setQueryKey(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={label || '請輸入查詢資訊'}
                autoFocus
              />
              <button
                className="search-btn"
                onClick={handleSearch}
                disabled={loading || !queryKey.trim()}
              >
                {loading ? (
                  <span className="spinner-small" />
                ) : (
                  <FiSearch />
                )}
              </button>
            </div>

            {error && (
              <div className="lookup-error">{error}</div>
            )}

            {result && (
              <div className="lookup-result">
                <div className="result-row">
                  <span className="result-label">帳號</span>
                  <span className="result-value">{result.account}</span>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(result.account, 'account')}
                    title="複製帳號"
                  >
                    {copiedField === 'account' ? <FiCheck /> : <FiCopy />}
                  </button>
                </div>
                <div className="result-row">
                  <span className="result-label">密碼</span>
                  <span className="result-value mono">{result.password}</span>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(result.password, 'password')}
                    title="複製密碼"
                  >
                    {copiedField === 'password' ? <FiCheck /> : <FiCopy />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .account-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #2563eb;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
          transition: transform 0.2s, box-shadow 0.2s;
          z-index: 1000;
        }
        .account-fab:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
        }

        .account-panel {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 340px;
          max-width: calc(100vw - 32px);
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          overflow: hidden;
          animation: slideUp 0.25s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .account-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: #2563eb;
          color: white;
        }
        .account-panel-header h4 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
        }
        .close-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          font-size: 18px;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .close-btn:hover {
          opacity: 1;
        }

        .account-panel-body {
          padding: 16px;
        }

        .search-label {
          display: block;
          font-size: 13px;
          color: #64748b;
          margin-bottom: 8px;
        }

        .search-row {
          display: flex;
          gap: 8px;
        }
        .search-row input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-row input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .search-btn {
          padding: 10px 14px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          font-size: 16px;
          transition: background 0.2s;
        }
        .search-btn:hover:not(:disabled) {
          background: #1d4ed8;
        }
        .search-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner-small {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .lookup-error {
          margin-top: 12px;
          padding: 10px 12px;
          background: #fef2f2;
          color: #991b1b;
          border-radius: 8px;
          font-size: 13px;
          border: 1px solid #fecaca;
        }

        .lookup-result {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .result-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .result-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          min-width: 36px;
        }
        .result-value {
          flex: 1;
          font-size: 14px;
          color: #1e293b;
          word-break: break-all;
        }
        .result-value.mono {
          font-family: 'Courier New', monospace;
        }
        .copy-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          font-size: 14px;
          transition: color 0.2s;
          flex-shrink: 0;
        }
        .copy-btn:hover {
          color: #2563eb;
        }

        @media (max-width: 480px) {
          .account-panel {
            bottom: 16px;
            right: 16px;
            width: calc(100vw - 32px);
          }
          .account-fab {
            bottom: 16px;
            right: 16px;
          }
        }
      `}</style>
    </>
  );
}
