import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../../context/auth-context';
import { getAllCourses, deleteCourse } from '../../../api/courses';
import AdminLayout from '../../../components/AdminLayout';

export default function AdminCourses() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingCourseId, setDeletingCourseId] = useState(null);

  // 檢查用戶是否有管理員權限
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/admin/courses');
        return;
      }
      
      if (user && user.role !== 'admin' && user.role !== 'instructor') {
        router.push('/dashboard');
        return;
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  // 獲取所有課程
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchCourses = async () => {
      try {
        setLoading(true);
        const coursesData = await getAllCourses();
        setCourses(coursesData);
        setError(null);
      } catch (error) {
        console.error('獲取課程失敗:', error);
        setError('無法載入課程，請稍後再試');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [isAuthenticated, user]);

  // 過濾課程
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || course.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // 處理刪除課程
  const handleDeleteCourse = async (courseId) => {
    try {
      setActionLoading(true);
      setDeletingCourseId(courseId);
      
      // 確保 deleteCourse 函數存在
      if (typeof deleteCourse !== 'function') {
        console.error('deleteCourse 不是一個函數');
        throw new Error('刪除功能暫時不可用');
      }
      
      await deleteCourse(courseId);
      
      // 更新課程列表
      setCourses(prevCourses => prevCourses.filter(course => course.id !== courseId));
      setDeleteConfirm(null);
      setError(null);
    } catch (error) {
      console.error('刪除課程失敗:', error);
      setError('刪除課程失敗，請稍後再試');
    } finally {
      setActionLoading(false);
      setDeletingCourseId(null);
    }
  };

  // 處理搜索
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // 處理過濾
  const handleFilter = (e) => {
    setFilterStatus(e.target.value);
  };

  return (
    <AdminLayout title="課程管理">
      <div className="admin-container">
        <div className="admin-header">
          <h1>課程管理</h1>
          <Link href="/admin/courses/create" className="btn-primary">
            <i className="ri-add-line"></i> 新增課程
          </Link>
        </div>

        {error && (
          <div className="alert alert-danger">
            <i className="ri-error-warning-line"></i>
            {error}
          </div>
        )}

        <div className="admin-filters">
          <div className="search-box">
            <i className="ri-search-line"></i>
            <input
              type="text"
              placeholder="搜尋課程..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          <div className="filter-box">
            <select value={filterStatus} onChange={handleFilter}>
              <option value="all">所有狀態</option>
              <option value="draft">草稿</option>
              <option value="published">已發布</option>
              <option value="archived">已封存</option>
            </select>
          </div>
        </div>

        <div className="admin-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>載入課程中...</p>
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="courses-grid">
              {filteredCourses.map(course => (
                <div key={course.id} className="course-card">
                  <div className="course-thumbnail">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} />
                    ) : (
                      <div className="thumbnail-placeholder">
                        <i className="ri-image-line"></i>
                      </div>
                    )}
                    <div className="course-status">
                      <span className={`status-badge ${course.status}`}>
                        {course.status === 'published' ? '已發布' : 
                         course.status === 'archived' ? '已封存' : '草稿'}
                      </span>
                    </div>
                  </div>
                  <div className="course-info">
                    <h3 className="course-title">{course.title}</h3>
                    <div className="course-meta">
                      <span className="course-instructor">
                        <i className="ri-user-line"></i>
                        {course.instructor?.name || '未知講師'}
                      </span>
                      <span className="course-lessons">
                        <i className="ri-video-line"></i>
                        {course.lessonsCount || 0} 課時
                      </span>
                    </div>
                    <div className="course-price">
                      {course.price ? `NT$ ${course.price}` : '免費'}
                    </div>
                  </div>
                  <div className="course-actions">
                    <button
                      className="btn-icon"
                      onClick={() => router.push(`/admin/courses/content?id=${course.id}`)}
                      title="管理課程內容"
                    >
                      <i className="ri-file-list-line"></i>
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => router.push(`/admin/courses/edit/${course.id}`)}
                      title="編輯課程資訊"
                    >
                      <i className="ri-edit-line"></i>
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => setDeleteConfirm(course.id)}
                      title="刪除課程"
                      disabled={actionLoading && deletingCourseId === course.id}
                    >
                      {actionLoading && deletingCourseId === course.id ? (
                        <span className="spinner-border spinner-border-sm"></span>
                      ) : (
                        <i className="ri-delete-bin-line"></i>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <i className="ri-book-open-line"></i>
              <p>暫無課程</p>
              <Link href="/admin/courses/create" className="btn-primary">
                創建課程
              </Link>
            </div>
          )}
        </div>
      </div>

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>確認刪除</h3>
              <button 
                className="btn-close" 
                onClick={() => setDeleteConfirm(null)}
                disabled={actionLoading}
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>確定要刪除這個課程嗎？此操作無法撤銷。</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setDeleteConfirm(null)}
                disabled={actionLoading}
              >
                取消
              </button>
              <button 
                className="btn-danger" 
                onClick={() => handleDeleteCourse(deleteConfirm)}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm"></span>
                    刪除中...
                  </>
                ) : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 