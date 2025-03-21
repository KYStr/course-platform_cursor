import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/auth-context';

export default function MainLayout({ children }) {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // 處理點擊事件
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('登出失敗:', error);
    }
  };
  
  return (
    <div className="layout">
      <header className="main-header">
        <div className="container">
          <div className="logo">
            <Link href="/">
              <h1>知識課堂</h1>
            </Link>
          </div>
          <nav className="main-nav">
            <ul>
              <li>
                <Link href="/" className={router.pathname === '/' ? 'active' : ''}>
                  <i className="ri-home-line"></i> 首頁
                </Link>
              </li>
              <li>
                <Link href="/courses" className={router.pathname.startsWith('/courses') ? 'active' : ''}>
                  <i className="ri-book-open-line"></i> 全部課程
                </Link>
              </li>
              {isAuthenticated && (
                <li>
                  <Link href="/dashboard" className={router.pathname.startsWith('/dashboard') ? 'active' : ''}>
                    <i className="ri-user-line"></i> 我的學習
                  </Link>
                </li>
              )}
            </ul>
          </nav>
          <div className="search-box">
            <input type="text" placeholder="搜尋課程..." />
            <button><i className="ri-search-line"></i></button>
          </div>
          <div className="user-actions">
            {loading ? (
              <div className="loading-spinner small"></div>
            ) : isAuthenticated ? (
              <div className="user-menu" ref={dropdownRef}>
                <div 
                  className="user-avatar"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <img src={user.photoURL || '/images/avatar-placeholder.webp'} alt={user.displayName} />
                </div>
                {dropdownOpen && (
                  <div className="dropdown-menu">
                    <Link href="/dashboard">
                      <i className="ri-dashboard-line"></i> 我的儀表板
                    </Link>
                    <Link href="/profile">
                      <i className="ri-user-settings-line"></i> 個人資料
                    </Link>
                    <button onClick={handleLogout}>
                      <i className="ri-logout-box-line"></i> 登出
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login">
                  <button className="btn-login">登入</button>
                </Link>
                <Link href="/register">
                  <button className="btn-signup">註冊</button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      
      <main>{children}</main>
      
      <footer className="main-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <h2>知識課堂</h2>
              <p>提供高品質的線上學習體驗</p>
            </div>
            <div className="footer-links">
              <div className="link-group">
                <h3>關於我們</h3>
                <ul>
                  <li><Link href="/about">平台介紹</Link></li>
                  <li><Link href="/contact">聯絡我們</Link></li>
                  <li><Link href="/instructors">講師招募</Link></li>
                </ul>
              </div>
              <div className="link-group">
                <h3>學習資源</h3>
                <ul>
                  <li><Link href="/paths">學習路徑</Link></li>
                  <li><Link href="/faq">常見問題</Link></li>
                  <li><Link href="/blog">學習方法</Link></li>
                </ul>
              </div>
              <div className="link-group">
                <h3>關注我們</h3>
                <div className="social-icons">
                  <a href="#"><i className="ri-wechat-line"></i></a>
                  <a href="#"><i className="ri-weibo-line"></i></a>
                  <a href="#"><i className="ri-bilibili-line"></i></a>
                </div>
              </div>
            </div>
          </div>
          <div className="copyright">
            <p>© 2023 知識課堂. 保留所有權利</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 