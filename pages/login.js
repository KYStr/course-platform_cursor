import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { loginWithEmail, loginWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { redirect } = router.query;
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // 如果已經登入，重定向到首頁或指定頁面
  if (isAuthenticated) {
    router.push(redirect || '/dashboard');
    return null;
  }

  // 處理登入
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('請填寫電子郵件和密碼');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      await loginWithEmail(email, password);
      
      // 登入成功，重定向到首頁或指定頁面
      router.push(redirect || '/dashboard');
    } catch (error) {
      console.error('登入失敗:', error);
      
      // 處理不同的錯誤類型
      switch (error.code) {
        case 'auth/user-not-found':
          setError('找不到該用戶，請檢查您的電子郵件');
          break;
        case 'auth/wrong-password':
          setError('密碼錯誤，請重試');
          break;
        case 'auth/invalid-email':
          setError('無效的電子郵件格式');
          break;
        case 'auth/too-many-requests':
          setError('登入嘗試次數過多，請稍後再試');
          break;
        default:
          setError('登入失敗，請稍後再試');
      }
      
      setLoading(false);
    }
  };

  // 處理 Google 登入
  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      await loginWithGoogle();
      
      // 登入成功，重定向到首頁或指定頁面
      router.push(redirect || '/dashboard');
    } catch (error) {
      console.error('Google 登入失敗:', error);
      
      // 處理不同的錯誤類型
      if (error.code === 'auth/popup-closed-by-user') {
        setError('登入視窗被關閉，請重試');
      } else {
        setError('Google 登入失敗，請稍後再試');
      }
      
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>登入 - 知識課堂</title>
        <meta name="description" content="登入您的知識課堂帳戶，開始學習之旅" />
      </Head>

      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <Link href="/">
              <div className="auth-logo">
                <h1>知識課堂</h1>
              </div>
            </Link>
            <h2>登入您的帳戶</h2>
            <p>歡迎回來！請登入您的帳戶繼續學習</p>
          </div>
          
          {error && (
            <div className="auth-error">
              <i className="ri-error-warning-line"></i>
              <span>{error}</span>
            </div>
          )}
          
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">電子郵件</label>
              <div className="input-with-icon">
                <i className="ri-mail-line"></i>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="請輸入您的電子郵件"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <div className="label-with-link">
                <label htmlFor="password">密碼</label>
                <Link href="/forgot-password">忘記密碼？</Link>
              </div>
              <div className="input-with-icon">
                <i className="ri-lock-line"></i>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="請輸入您的密碼"
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
                {loading ? '登入中...' : '登入'}
              </button>
            </div>
          </form>
          
          <div className="auth-divider">
            <span>或使用以下方式登入</span>
          </div>
          
          <div className="social-auth">
            <button 
              className="btn-social google"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              <i className="ri-google-fill"></i>
              <span>{googleLoading ? '處理中...' : 'Google 登入'}</span>
            </button>
            <button className="btn-social facebook" disabled>
              <i className="ri-facebook-fill"></i>
              <span>Facebook 登入</span>
            </button>
          </div>
          
          <div className="auth-footer">
            <p>還沒有帳戶？ <Link href="/register">立即註冊</Link></p>
          </div>
        </div>
      </div>
    </>
  );
} 