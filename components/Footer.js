import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-left">
            <div className="footer-logo">
              <Link href="/">
                <img src="/images/logo-white.svg" alt="學習平台" />
              </Link>
            </div>
            <p className="footer-description">
              我們致力於提供高質量的線上學習體驗，幫助您掌握新技能，實現職業目標。
            </p>
            <div className="social-links">
              <a href="#" target="_blank" rel="noopener noreferrer">
                <i className="ri-facebook-fill"></i>
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <i className="ri-twitter-fill"></i>
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <i className="ri-instagram-line"></i>
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer">
                <i className="ri-linkedin-fill"></i>
              </a>
            </div>
          </div>
          
          <div className="footer-right">
            <div className="footer-links">
              <div className="footer-links-column">
                <h3>平台</h3>
                <ul>
                  <li><Link href="/about">關於我們</Link></li>
                  <li><Link href="/courses">所有課程</Link></li>
                  <li><Link href="/instructors">講師團隊</Link></li>
                  <li><Link href="/pricing">價格方案</Link></li>
                </ul>
              </div>
              
              <div className="footer-links-column">
                <h3>支援</h3>
                <ul>
                  <li><Link href="/faq">常見問題</Link></li>
                  <li><Link href="/contact">聯絡我們</Link></li>
                  <li><Link href="/help">幫助中心</Link></li>
                  <li><Link href="/feedback">意見反饋</Link></li>
                </ul>
              </div>
              
              <div className="footer-links-column">
                <h3>法律</h3>
                <ul>
                  <li><Link href="/terms">服務條款</Link></li>
                  <li><Link href="/privacy">隱私政策</Link></li>
                  <li><Link href="/cookies">Cookie 政策</Link></li>
                  <li><Link href="/copyright">版權聲明</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {currentYear} 學習平台. 保留所有權利.</p>
        </div>
      </div>
    </footer>
  );
} 