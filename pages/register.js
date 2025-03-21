import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { registerWithEmail, loginWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { redirect } = router.query;
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // 如果已經登入，重定向到首頁或指定頁面
  if (isAuthenticated) {
    router.push(redirect || '/dashboard');
    return null;
  }

  // 處理表單輸入變更
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 處理註冊
  const handleRegister = async (e) => {
    e.preventDefault();
    
    const { displayName, email, password, confirmPassword } = formData;
    
    // 表單驗證
    if (!displayName || !email || !password || !confirmPassword) {
      setError('請填寫所有必填欄位');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不一致');
      return;
    }
    
    if (password.length < 6) {
      setError('密碼長度至少為6個字符');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      await registerWithEmail(email, password, { displayName });
      
      // 註冊成功，重定向到首頁或指定頁面
      router.push(redirect || '/dashboard');
    } catch (error) {
      console.error('註冊失敗:', error);
      
      // 處理不同的錯誤類型
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('該電子郵件已被使用');
          break;
        case 'auth/invalid-email':
          setError('無效的電子郵件格式');
          break;
        case 'auth/weak-password':
          setError('密碼強度不足');
          break;
        default:
          setError('註冊失敗，請稍後再試');
      }
      
      setLoading(false);
    }
  };

  // 處理 Google 註冊/登入
  const handleGoogleRegister = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      
      await loginWithGoogle();
      
      // 註冊/登入成功，重定向到首頁或指定頁面
      router.push(redirect || '/dashboard');
    } catch (error) {
      console.error('Google 註冊失敗:', error);
      
      // 處理不同的錯誤類型
      if (error.code === 'auth/popup-closed-by-user') {
        setError('登入視窗被關閉，請重試');
      } else {
        setError('Google 註冊失敗，請稍後再試');
      }
      
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>註冊 - 知識課堂</title>
        <meta name="description" content="註冊知識課堂帳戶，開始您的學習之旅" />
      </Head>

      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <Link href="/">
              <div className="auth-logo">
                <h1>知識課堂</h1>
              </div>
            </Link>
            <h2>創建新帳戶</h2>
            <p>註冊一個帳戶，開始您的學習之旅</p>
          </div>
          
          {error && (
            <div className="auth-error">
              <i className="ri-error-warning-line"></i>
              <span>{error}</span>
            </div>
          )}
          
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="displayName">姓名</label>
              <div className="input-with-icon">
                <i className="ri-user-line"></i>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="請輸入您的姓名"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="email">電子郵件</label>
              <div className="input-with-icon">
                <i className="ri-mail-line"></i>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="請輸入您的電子郵件"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password">密碼</label>
              <div className="input-with-icon">
                <i className="ri-lock-line"></i>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="請設置密碼（至少6個字符）"
                  required
                  minLength={6}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">確認密碼</label>
              <div className="input-with-icon">
                <i className="ri-lock-line"></i>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="請再次輸入密碼"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <button 
                type="submit" 
                className="btn-auth"
                disabled={loading}
              >
                {loading ? '註冊中...' : '註冊'}
              </button>
            </div>
          </form>
          
          <div className="auth-divider">
            <span>或使用以下方式註冊</span>
          </div>
          
          <div className="social-auth">
            <button 
              className="btn-social google"
              onClick={handleGoogleRegister}
              disabled={googleLoading}
            >
              <i className="ri-google-fill"></i>
              <span>{googleLoading ? '處理中...' : 'Google 註冊'}</span>
            </button>
            <button className="btn-social facebook" disabled>
              <i className="ri-facebook-fill"></i>
              <span>Facebook 註冊</span>
            </button>
          </div>
          
          <div className="auth-footer">
            <p>已有帳戶？ <Link href="/login">立即登入</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}