import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../context/auth-context';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/admin';

export default function AdminCategories() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '' });
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  // 檢查用戶是否有管理員權限
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/admin/categories');
        return;
      }
      
      if (user && user.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  // 獲取所有分類
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const categoriesData = await getCategories();
        setCategories(categoriesData);
        setError(null);
      } catch (error) {
        console.error('獲取分類失敗:', error);
        setError('無法載入分類，請稍後再試');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [isAuthenticated, user]);

  // 處理添加分類
  const handleAddCategory = async (e) => {
    e.preventDefault();
    
    try {
      setActionLoading(true);
      const categoryId = await createCategory({
        name: categoryForm.name,
        slug: categoryForm.slug
      });
      
      // 更新分類列表
      setCategories([...categories, {
        id: categoryId,
        name: categoryForm.name,
        slug: categoryForm.slug,
        coursesCount: 0
      }]);
      
      setCategoryForm({ name: '', slug: '' });
      setShowForm(false);
      setError(null);
    } catch (error) {
      console.error('添加分類失敗:', error);
      setError('添加分類失敗，請稍後再試');
    } finally {
      setActionLoading(false);
    }
  };

  // 處理編輯分類
  const handleEditCategory = async (e) => {
    e.preventDefault();
    
    try {
      setActionLoading(true);
      await updateCategory(editingCategoryId, {
        name: categoryForm.name,
        slug: categoryForm.slug
      });
      
      // 更新分類列表
      setCategories(categories.map(category => 
        category.id === editingCategoryId 
          ? { ...category, name: categoryForm.name, slug: categoryForm.slug }
          : category
      ));
      
      setCategoryForm({ name: '', slug: '' });
      setEditingCategoryId(null);
      setShowForm(false);
      setError(null);
    } catch (error) {
      console.error('編輯分類失敗:', error);
      setError('編輯分類失敗，請稍後再試');
    } finally {
      setActionLoading(false);
    }
  };

  // 處理刪除分類
  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('確定要刪除這個分類嗎？此操作無法撤銷。')) {
      return;
    }
    
    try {
      setActionLoading(true);
      await deleteCategory(categoryId);
      
      // 更新分類列表
      setCategories(categories.filter(category => category.id !== categoryId));
      setError(null);
    } catch (error) {
      console.error('刪除分類失敗:', error);
      if (error.message.includes('無法刪除分類')) {
        setError(error.message);
      } else {
        setError('刪除分類失敗，請稍後再試');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // 處理編輯按鈕點擊
  const handleEditClick = (category) => {
    setCategoryForm({
      name: category.name,
      slug: category.slug
    });
    setEditingCategoryId(category.id);
    setShowForm(true);
  };

  // 自動生成 slug
  const handleNameChange = (e) => {
    const name = e.target.value;
    setCategoryForm(prev => ({
      ...prev,
      name,
      slug: name.toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }));
  };

  return (
    <AdminLayout title="分類管理">
      <div className="admin-header">
        <h1>分類管理</h1>
        <p>管理課程分類</p>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="ri-error-warning-line"></i>
          <span>{error}</span>
        </div>
      )}

      <div className="admin-toolbar">
        <div className="search-filter"></div>
        <button 
          className="btn-primary"
          onClick={() => {
            setCategoryForm({ name: '', slug: '' });
            setEditingCategoryId(null);
            setShowForm(true);
          }}
          disabled={loading || actionLoading}
        >
          <i className="ri-add-line"></i> 添加分類
        </button>
      </div>

      <div className="admin-card">
        <div className="card-body">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>載入分類中...</p>
            </div>
          ) : categories.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>分類名稱</th>
                  <th>Slug</th>
                  <th>課程數量</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(category => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td>{category.slug}</td>
                    <td>{category.coursesCount}</td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn-icon" 
                          onClick={() => handleEditClick(category)}
                          disabled={actionLoading}
                          title="編輯分類"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button 
                          className="btn-icon delete" 
                          onClick={() => handleDeleteCategory(category.id)}
                          disabled={actionLoading || category.coursesCount > 0}
                          title={category.coursesCount > 0 ? "無法刪除已使用的分類" : "刪除分類"}
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <i className="ri-folder-line"></i>
              <p>暫無分類</p>
              <button 
                className="btn-primary"
                onClick={() => {
                  setCategoryForm({ name: '', slug: '' });
                  setEditingCategoryId(null);
                  setShowForm(true);
                }}
              >
                添加分類
              </button>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{editingCategoryId ? '編輯分類' : '添加分類'}</h3>
              <button 
                className="btn-close"
                onClick={() => {
                  setShowForm(false);
                  setCategoryForm({ name: '', slug: '' });
                  setEditingCategoryId(null);
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
              <form onSubmit={editingCategoryId ? handleEditCategory : handleAddCategory}>
                <div className="form-group">
                  <label htmlFor="categoryName">分類名稱 *</label>
                  <input
                    type="text"
                    id="categoryName"
                    value={categoryForm.name}
                    onChange={handleNameChange}
                    placeholder="輸入分類名稱"
                    required
                    disabled={actionLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="categorySlug">Slug *</label>
                  <input
                    type="text"
                    id="categorySlug"
                    value={categoryForm.slug}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="輸入分類slug"
                    required
                    disabled={actionLoading}
                  />
                  <small>Slug用於URL，只能包含小寫字母、數字和連字符</small>
                </div>
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => {
                      setShowForm(false);
                      setCategoryForm({ name: '', slug: '' });
                      setEditingCategoryId(null);
                    }}
                    disabled={actionLoading}
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm"></span>
                        {editingCategoryId ? '保存中...' : '添加中...'}
                      </>
                    ) : (
                      editingCategoryId ? '保存修改' : '添加分類'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 