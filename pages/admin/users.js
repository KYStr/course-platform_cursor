import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../context/auth-context';
import { getUsers, updateUserRole } from '../../api/admin';

export default function AdminUsers() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  // 檢查用戶是否有管理員權限
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/admin/users');
        return;
      }
      
      if (user && user.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  // 獲取所有用戶
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersData = await getUsers();
        setUsers(usersData);
        setError(null);
      } catch (error) {
        console.error('獲取用戶失敗:', error);
        setError('無法載入用戶，請稍後再試');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAuthenticated, user]);

  // 過濾用戶
  const filteredUsers = users.filter(u => {
    // 排除當前用戶自己
    if (user && u.id === user.uid) return false;
    
    const matchesSearch = 
      (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // 處理更改用戶角色
  const handleChangeRole = async () => {
    if (!selectedUser || !selectedRole) return;
    
    try {
      setActionLoading(true);
      await updateUserRole(selectedUser.id, selectedRole);
      
      // 更新用戶列表
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, role: selectedRole }
          : u
      ));
      
      setShowRoleModal(false);
      setSelectedUser(null);
      setSelectedRole('');
      setError(null);
    } catch (error) {
      console.error('更改用戶角色失敗:', error);
      setError('更改用戶角色失敗，請稍後再試');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout title="用戶管理">
      <div className="admin-header">
        <h1>用戶管理</h1>
        <p>管理系統用戶</p>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="ri-error-warning-line"></i>
          <span>{error}</span>
        </div>
      )}

      <div className="admin-toolbar">
        <div className="search-filter">
          <div className="admin-search">
            <i className="ri-search-line"></i>
            <input 
              type="text" 
              placeholder="搜索用戶..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="admin-filter">
            <select 
              value={filterRole} 
              onChange={(e) => setFilterRole(e.target.value)}
              disabled={loading}
            >
              <option value="all">所有角色</option>
              <option value="student">學生</option>
              <option value="instructor">講師</option>
              <option value="admin">管理員</option>
            </select>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="card-body">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>載入用戶中...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>用戶</th>
                  <th>電子郵件</th>
                  <th>角色</th>
                  <th>註冊日期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-info-cell">
                        <div className="user-avatar-small">
                          <img src={u.photoURL || '/images/avatar-placeholder.webp'} alt={u.displayName || u.email} />
                        </div>
                        <span>{u.displayName || u.email}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role || 'student'}`}>
                        {u.role === 'admin' ? '管理員' : 
                         u.role === 'instructor' ? '講師' : '學生'}
                      </span>
                    </td>
                    <td>{u.createdAt}</td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn-icon" 
                          onClick={() => {
                            setSelectedUser(u);
                            setSelectedRole(u.role || 'student');
                            setShowRoleModal(true);
                          }}
                          disabled={actionLoading}
                          title="更改角色"
                        >
                          <i className="ri-user-settings-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <i className="ri-user-line"></i>
              <p>沒有找到符合條件的用戶</p>
            </div>
          )}
        </div>
      </div>

      {showRoleModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>更改用戶角色</h3>
              <button 
                className="btn-close"
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setSelectedRole('');
                }}
                disabled={actionLoading}
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger">
                  <i className="ri-error-warning-line"></i>
                  <span>{error}</span>
                </div>
              )}
              <p>
                您正在更改 <strong>{selectedUser.displayName || selectedUser.email}</strong> 的角色。
              </p>
              <div className="form-group">
                <label htmlFor="userRole">選擇角色</label>
                <select
                  id="userRole"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={actionLoading}
                >
                  <option value="student">學生</option>
                  <option value="instructor">講師</option>
                  <option value="admin">管理員</option>
                </select>
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUser(null);
                    setSelectedRole('');
                  }}
                  disabled={actionLoading}
                >
                  取消
                </button>
                <button 
                  type="button" 
                  className="btn-primary"
                  onClick={handleChangeRole}
                  disabled={actionLoading || selectedRole === selectedUser.role}
                >
                  {actionLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm"></span>
                      更改中...
                    </>
                  ) : '確認更改'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 