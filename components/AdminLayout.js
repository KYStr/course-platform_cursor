import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '../context/auth-context';

export default function AdminLayout({ children, title = '後台管理' }) {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [activeMenu, setActiveMenu] = useState('');

  // 檢查用戶是否有管理員權限
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=' + router.asPath);
        return;
      }
      
      if (user && user.role !== 'admin' && user.role !== 'instructor') {
        router.push('/dashboard');
        return;
      }
    }
  }, [loading, isAuthenticated, user, router]);

  // 設置當前活動菜單
  useEffect(() => {
    const path = router.pathname;
    if (path === '/admin/dashboard') {
      setActiveMenu('dashboard');
    } else if (path.startsWith('/admin/courses')) {
      setActiveMenu('courses');
    } else if (path.startsWith('/admin/users')) {
      setActiveMenu('users');
    } else if (path.startsWith('/admin/categories')) {
      setActiveMenu('categories');
    }
  }, [router.pathname]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'admin' && user.role !== 'instructor')) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{title} - 知識課堂後台</title>
      </Head>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-logo">
            <Link href="/" className="logo-link">
              <h1>知識課堂</h1>
              <span>後台管理</span>
            </Link>
          </div>
          
          <nav className="admin-nav">
            <Link 
              href="/admin/dashboard" 
              className={`admin-nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            >
              <i className="ri-dashboard-line"></i>
              <span>儀表板</span>
            </Link>
            <Link 
              href="/admin/courses" 
              className={`admin-nav-item ${activeMenu === 'courses' ? 'active' : ''}`}
            >
              <i className="ri-book-open-line"></i>
              <span>課程管理</span>
            </Link>
            <Link 
              href="/admin/users" 
              className={`admin-nav-item ${activeMenu === 'users' ? 'active' : ''}`}
            >
              <i className="ri-user-line"></i>
              <span>用戶管理</span>
            </Link>
            <Link 
              href="/admin/categories" 
              className={`admin-nav-item ${activeMenu === 'categories' ? 'active' : ''}`}
            >
              <i className="ri-folder-line"></i>
              <span>分類管理</span>
            </Link>
            <Link href="/" className="admin-nav-item">
              <i className="ri-arrow-left-line"></i>
              <span>返回前台</span>
            </Link>
          </nav>
          
          <div className="admin-user">
            <div className="user-avatar">
              <img src={user?.photoURL || '/images/avatar-placeholder.webp'} alt={user?.displayName} />
            </div>
            <div className="user-info">
              <p className="user-name">{user?.displayName || '用戶'}</p>
              <p className="user-role">{user?.role === 'admin' ? '管理員' : '講師'}</p>
            </div>
          </div>
        </aside>
        
        <main className="admin-main">
          {children}
        </main>
      </div>
    </>
  );
} 