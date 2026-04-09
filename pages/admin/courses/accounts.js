import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../../components/AdminLayout';
import { useAuth } from '../../../context/auth-context';
import { getCourseById } from '../../../api/courses';
import {
  getAccountEntries,
  createAccountEntry,
  updateAccountEntry,
  deleteAccountEntry,
  batchCreateAccountEntries,
  deleteAllAccountEntries
} from '../../../api/courses';

export default function CourseAccounts() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [newEntry, setNewEntry] = useState({ queryKey: '', account: '', password: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ queryKey: '', account: '', password: '' });

  const [batchText, setBatchText] = useState('');
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/admin/courses');
        return;
      }
      if (user && user.role !== 'admin' && user.role !== 'instructor') {
        router.push('/dashboard');
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [courseData, entriesData] = await Promise.all([
          getCourseById(id),
          getAccountEntries(id)
        ]);
        setCourse(courseData);
        setEntries(entriesData);
      } catch (err) {
        console.error('載入失敗:', err);
        setError('無法載入資料，請稍後再試');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isAuthenticated]);

  const showMessage = (msg, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    setTimeout(() => { setError(null); setSuccess(null); }, 3000);
  };

  const handleAdd = async () => {
    if (!newEntry.queryKey.trim() || !newEntry.account.trim()) {
      showMessage('查詢鍵和帳號為必填', true);
      return;
    }
    try {
      const created = await createAccountEntry(id, newEntry);
      setEntries(prev => [...prev, created]);
      setNewEntry({ queryKey: '', account: '', password: '' });
      showMessage('新增成功');
    } catch (err) {
      showMessage('新增失敗: ' + err.message, true);
    }
  };

  const handleUpdate = async (entryId) => {
    if (!editForm.queryKey.trim() || !editForm.account.trim()) {
      showMessage('查詢鍵和帳號為必填', true);
      return;
    }
    try {
      const updated = await updateAccountEntry(id, entryId, editForm);
      setEntries(prev => prev.map(e => e.id === entryId ? updated : e));
      setEditingId(null);
      showMessage('更新成功');
    } catch (err) {
      showMessage('更新失敗: ' + err.message, true);
    }
  };

  const handleDelete = async (entryId) => {
    if (!confirm('確定要刪除這條帳號資料嗎？')) return;
    try {
      await deleteAccountEntry(id, entryId);
      setEntries(prev => prev.filter(e => e.id !== entryId));
      showMessage('刪除成功');
    } catch (err) {
      showMessage('刪除失敗: ' + err.message, true);
    }
  };

  const handleBatchImport = async () => {
    const lines = batchText.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) {
      showMessage('請輸入至少一條資料', true);
      return;
    }

    const parsed = [];
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(/[,\t]/).map(s => s.trim());
      if (parts.length < 2) {
        showMessage(`第 ${i + 1} 行格式錯誤，至少需要「查詢鍵」和「帳號」`, true);
        return;
      }
      parsed.push({
        queryKey: parts[0],
        account: parts[1],
        password: parts[2] || ''
      });
    }

    try {
      setBatchLoading(true);
      const created = await batchCreateAccountEntries(id, parsed);
      setEntries(prev => [...prev, ...created]);
      setBatchText('');
      setShowBatchImport(false);
      showMessage(`成功匯入 ${created.length} 條資料`);
    } catch (err) {
      showMessage('批量匯入失敗: ' + err.message, true);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleClearAll = async () => {
    try {
      await deleteAllAccountEntries(id);
      setEntries([]);
      setShowConfirmClear(false);
      showMessage('已清空所有帳號資料');
    } catch (err) {
      showMessage('清空失敗: ' + err.message, true);
    }
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditForm({ queryKey: entry.queryKey, account: entry.account, password: entry.password });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>載入中...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>帳號查詢管理 | 管理後台</title>
      </Head>

      <div className="admin-content">
        <div className="admin-content-header">
          <h1>帳號查詢管理</h1>
          <div className="breadcrumb">
            <Link href="/admin">儀表板</Link> /
            <Link href="/admin/courses">課程管理</Link> /
            <Link href={`/admin/courses/content?id=${id}`}>{course?.title || '課程'}</Link> /
            <span>帳號查詢</span>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            <i className="ri-error-warning-line"></i>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <i className="ri-check-line"></i>
            <span>{success}</span>
          </div>
        )}

        {!course?.accountLookupEnabled && (
          <div className="alert alert-warning">
            <i className="ri-information-line"></i>
            <span>此課程尚未啟用帳號查詢功能。請先到
              <Link href={`/admin/courses/edit/${id}`}> 課程編輯頁面 </Link>
              開啟「啟用帳號查詢」選項。
            </span>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="actions-bar">
          <button
            className="btn-primary"
            onClick={() => setShowBatchImport(!showBatchImport)}
          >
            <i className="ri-file-upload-line"></i>
            {showBatchImport ? '關閉批量匯入' : '批量匯入'}
          </button>
          {entries.length > 0 && (
            <button
              className="btn-danger"
              onClick={() => setShowConfirmClear(true)}
            >
              <i className="ri-delete-bin-line"></i>
              清空全部 ({entries.length})
            </button>
          )}
        </div>

        {/* 清空确认 */}
        {showConfirmClear && (
          <div className="confirm-box">
            <p>確定要清空全部 <strong>{entries.length}</strong> 條帳號資料嗎？此操作不可復原。</p>
            <div className="confirm-actions">
              <button className="btn-danger" onClick={handleClearAll}>確認清空</button>
              <button className="btn-secondary" onClick={() => setShowConfirmClear(false)}>取消</button>
            </div>
          </div>
        )}

        {/* 批量导入 */}
        {showBatchImport && (
          <div className="batch-import-card">
            <h3>批量匯入</h3>
            <p className="hint">每行一條，使用逗號或 Tab 分隔：<code>查詢鍵,帳號,密碼</code></p>
            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={`30101,user01@example.com,password123\n30102,user02@example.com,password456`}
              rows="8"
            />
            <div className="batch-actions">
              <button
                className="btn-primary"
                onClick={handleBatchImport}
                disabled={batchLoading || !batchText.trim()}
              >
                {batchLoading ? '匯入中...' : '確認匯入'}
              </button>
              <span className="batch-count">
                {batchText.trim() ? `${batchText.trim().split('\n').filter(l => l.trim()).length} 條待匯入` : ''}
              </span>
            </div>
          </div>
        )}

        {/* 新增单条 */}
        <div className="add-entry-card">
          <h3>新增帳號條目</h3>
          <div className="entry-form">
            <input
              type="text"
              placeholder="查詢鍵（如班級座號）"
              value={newEntry.queryKey}
              onChange={(e) => setNewEntry(prev => ({ ...prev, queryKey: e.target.value }))}
            />
            <input
              type="text"
              placeholder="帳號"
              value={newEntry.account}
              onChange={(e) => setNewEntry(prev => ({ ...prev, account: e.target.value }))}
            />
            <input
              type="text"
              placeholder="密碼"
              value={newEntry.password}
              onChange={(e) => setNewEntry(prev => ({ ...prev, password: e.target.value }))}
            />
            <button className="btn-primary" onClick={handleAdd}>新增</button>
          </div>
        </div>

        {/* 条目列表 */}
        <div className="entries-card">
          <h3>帳號列表 ({entries.length})</h3>
          {entries.length === 0 ? (
            <div className="empty-state">
              <i className="ri-database-2-line"></i>
              <p>尚無帳號資料，請新增或批量匯入</p>
            </div>
          ) : (
            <div className="entries-table-wrapper">
              <table className="entries-table">
                <thead>
                  <tr>
                    <th>查詢鍵</th>
                    <th>帳號</th>
                    <th>密碼</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id}>
                      {editingId === entry.id ? (
                        <>
                          <td>
                            <input
                              type="text"
                              value={editForm.queryKey}
                              onChange={(e) => setEditForm(prev => ({ ...prev, queryKey: e.target.value }))}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={editForm.account}
                              onChange={(e) => setEditForm(prev => ({ ...prev, account: e.target.value }))}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={editForm.password}
                              onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                            />
                          </td>
                          <td className="actions-cell">
                            <button className="btn-sm btn-primary" onClick={() => handleUpdate(entry.id)}>儲存</button>
                            <button className="btn-sm btn-secondary" onClick={() => setEditingId(null)}>取消</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{entry.queryKey}</td>
                          <td>{entry.account}</td>
                          <td className="password-cell">{entry.password}</td>
                          <td className="actions-cell">
                            <button className="btn-sm btn-secondary" onClick={() => startEdit(entry)}>
                              <i className="ri-edit-line"></i>
                            </button>
                            <button className="btn-sm btn-danger" onClick={() => handleDelete(entry.id)}>
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .admin-content {
          padding: 20px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .admin-content-header {
          margin-bottom: 24px;
        }
        .admin-content-header h1 {
          font-size: 24px;
          margin: 0 0 8px;
        }
        .breadcrumb {
          color: #666;
          font-size: 14px;
        }
        .breadcrumb a,
        .breadcrumb :global(a) {
          color: #4a90d9;
          text-decoration: none;
        }
        .breadcrumb a:hover,
        .breadcrumb :global(a:hover) {
          text-decoration: underline;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }
        .alert-danger { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .alert-success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .alert-warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
        .alert-warning :global(a) { color: #2563eb; font-weight: 600; }

        .actions-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .confirm-box {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .confirm-box p { margin: 0 0 12px; color: #991b1b; }
        .confirm-actions { display: flex; gap: 8px; }

        .batch-import-card,
        .add-entry-card,
        .entries-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          padding: 20px;
          margin-bottom: 20px;
        }
        .batch-import-card h3,
        .add-entry-card h3,
        .entries-card h3 {
          font-size: 16px;
          margin: 0 0 12px;
        }
        .hint {
          font-size: 13px;
          color: #666;
          margin: 0 0 10px;
        }
        .hint code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
        }
        .batch-import-card textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-family: monospace;
          font-size: 13px;
          resize: vertical;
          box-sizing: border-box;
        }
        .batch-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
        }
        .batch-count {
          font-size: 13px;
          color: #666;
        }

        .entry-form {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .entry-form input {
          flex: 1;
          min-width: 140px;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #999;
        }
        .empty-state i {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }

        .entries-table-wrapper {
          overflow-x: auto;
        }
        .entries-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .entries-table th,
        .entries-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
        }
        .entries-table th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .entries-table tbody tr:hover {
          background: #f9fafb;
        }
        .entries-table td input {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }
        .password-cell {
          font-family: monospace;
        }
        .actions-cell {
          white-space: nowrap;
          display: flex;
          gap: 6px;
        }

        .btn-primary, .btn-secondary, .btn-danger {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: opacity 0.2s;
        }
        .btn-primary { background: #2563eb; color: white; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { background: #f3f4f6; color: #374151; }
        .btn-secondary:hover { background: #e5e7eb; }
        .btn-danger { background: #ef4444; color: white; }
        .btn-danger:hover { background: #dc2626; }

        .btn-sm {
          padding: 4px 10px;
          font-size: 13px;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
        }
        .loading-spinner {
          border: 4px solid rgba(0,0,0,0.1);
          border-radius: 50%;
          border-top: 4px solid #2563eb;
          width: 36px;
          height: 36px;
          animation: spin 0.8s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </AdminLayout>
  );
}
