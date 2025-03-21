import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../components/AdminLayout';
import { getAllCourses } from '../../api/admin';
import { useAuth } from '../../context/auth-context';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    totalStudents: 0
  });

  // 獲取所有課程
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const coursesData = await getAllCourses();
        setCourses(coursesData);
        
        // 計算統計數據
        const totalCourses = coursesData.length;
        const publishedCourses = coursesData.filter(course => course.status === 'published').length;
        const draftCourses = coursesData.filter(course => course.status === 'draft').length;
        const totalStudents = coursesData.reduce((sum, course) => sum + (course.studentsCount || 0), 0);
        
        setStats({
          totalCourses,
          publishedCourses,
          draftCourses,
          totalStudents
        });
        
        setLoading(false);
      } catch (error) {
        console.error('獲取課程失敗:', error);
        setError('無法載入課程，請稍後再試');
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <AdminLayout title="儀表板">
      <div className="admin-header">
        <h1>儀表板</h1>
        <p>歡迎回來，{user?.displayName || '用戶'}！</p>
      </div>
      
      <div className="stats-container">
        <div className="stats-card">
          <div className="stats-icon">
            <i className="ri-book-open-line"></i>
          </div>
          <div className="stats-info">
            <h3>{stats.totalCourses}</h3>
            <p>總課程數</p>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="stats-icon">
            <i className="ri-check-line"></i>
          </div>
          <div className="stats-info">
            <h3>{stats.publishedCourses}</h3>
            <p>已發布課程</p>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="stats-icon">
            <i className="ri-draft-line"></i>
          </div>
          <div className="stats-info">
            <h3>{stats.draftCourses}</h3>
            <p>草稿課程</p>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="stats-icon">
            <i className="ri-user-line"></i>
          </div>
          <div className="stats-info">
            <h3>{stats.totalStudents}</h3>
            <p>總學生數</p>
          </div>
        </div>
      </div>
      
      <div className="admin-row">
        <div className="admin-col">
          <div className="admin-card">
            <div className="card-header">
              <h2>最近課程</h2>
              <Link href="/admin/courses" className="view-all">
                查看全部
              </Link>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="loading-spinner"></div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : courses.length > 0 ? (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>課程名稱</th>
                      <th>講師</th>
                      <th>學生數</th>
                      <th>狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.slice(0, 5).map(course => (
                      <tr key={course.id}>
                        <td>
                          <Link href={`/admin/courses/edit/${course.id}`} className="course-link">
                            {course.title}
                          </Link>
                        </td>
                        <td>{course.instructor.name}</td>
                        <td>{course.studentsCount || 0}</td>
                        <td>
                          <span className={`status-badge ${course.status}`}>
                            {course.status === 'published' ? '已發布' : 
                             course.status === 'draft' ? '草稿' : '審核中'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <p>暫無課程</p>
                  <Link href="/admin/courses/create" className="btn-primary">
                    創建課程
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 