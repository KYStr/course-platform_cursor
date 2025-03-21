import Link from 'next/link';

// 在用戶菜單中添加後台入口
{isAuthenticated && (user.role === 'admin' || user.role === 'instructor') && (
  <Link href="/admin" className="dropdown-item">
    <i className="ri-dashboard-line"></i> 後台管理
  </Link>
)} 