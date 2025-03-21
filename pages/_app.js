import { useEffect } from 'react';
import Head from 'next/head';
import { AuthProvider } from '../context/auth-context';
import '../styles/globals.css';
import '../styles/admin.css';
import '../styles/course-detail.css';

// 全局應用組件
function MyApp({ Component, pageProps }) {
  // 在客戶端加載Vimeo Player SDK和Remix Icon
  useEffect(() => {
    // 加載 Vimeo Player SDK
    const vimeoScript = document.createElement('script');
    vimeoScript.src = 'https://player.vimeo.com/api/player.js';
    vimeoScript.async = true;
    document.body.appendChild(vimeoScript);

    // 加載 Remix Icon
    const remixiconLink = document.createElement('link');
    remixiconLink.href = 'https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css';
    remixiconLink.rel = 'stylesheet';
    document.head.appendChild(remixiconLink);

    return () => {
      if (document.body.contains(vimeoScript)) {
        document.body.removeChild(vimeoScript);
      }
      if (document.head.contains(remixiconLink)) {
        document.head.removeChild(remixiconLink);
      }
    };
  }, []);

  // 獲取頁面佈局或使用默認佈局
  const getLayout = Component.getLayout || ((page) => page);

  return (
    <AuthProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>知識課堂 - 高品質線上學習平台</title>
      </Head>
      {getLayout(<Component {...pageProps} />)}
    </AuthProvider>
  );
}

export default MyApp; 