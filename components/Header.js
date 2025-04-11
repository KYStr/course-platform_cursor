import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../context/auth-context';

export default function Header() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // 處理點擊外部關閉下拉選單
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
  
  // 處理搜索提交
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/courses?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };
  
  // 切換移動端菜單
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // 處理登出
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('登出失敗:', error);
    }
  };
  
  return (
    <header className="site-header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <Link href="/">
              <img src="/images/logo.png" alt="學習平台" />
            </Link>
          </div>
          
          <div className="search-bar">
            <form onSubmit={handleSearch}>
              <input 
                type="text" 
                placeholder="搜尋課程..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit">
                <i className="ri-search-line"></i>
              </button>
            </form>
          </div>
          
          <nav className={`main-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <ul>
              <li>
                <Link href="/courses">
                  所有課程
                </Link>
              </li>
              {!loading && (
                <>
                  {isAuthenticated ? (
                    <>
                      <li>
                        <Link href="/dashboard">
                          我的學習
                        </Link>
                      </li>
                      <li className="dropdown" ref={dropdownRef}>
                        <button 
                          className="dropdown-toggle"
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                        >
                          <img 
                            src={user?.photoURL || "/images/avatar-placeholder.webp"} 
                            alt={user?.displayName || "用戶"} 
                            className="user-avatar"
                          />
                          <span>{user?.displayName || "用戶"}</span>
                          <i className={`ri-arrow-down-s-line ${dropdownOpen ? 'open' : ''}`}></i>
                        </button>
                        <div className={`dropdown-menu ${dropdownOpen ? 'show' : ''}`}>
                          <Link href="/profile">
                            <i className="ri-user-settings-line"></i>
                            個人資料
                          </Link>
                          {(user?.role === 'admin' || user?.role === 'instructor') && (
                            <Link href="/admin/dashboard">
                              <i className="ri-dashboard-line"></i>
                              管理後台
                            </Link>
                          )}
                          <button onClick={handleLogout}>
                            <i className="ri-logout-box-line"></i>
                            登出
                          </button>
                        </div>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <Link href="/login">
                          登入
                        </Link>
                      </li>
                      <li>
                        <Link href="/register" className="btn-primary">
                          註冊
                        </Link>
                      </li>
                    </>
                  )}
                </>
              )}
            </ul>
          </nav>
          
          <button 
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
          >
            <i className={`ri-${mobileMenuOpen ? 'close' : 'menu'}-line`}></i>
          </button>
        </div>
      </div>
    </header>
  );
} 