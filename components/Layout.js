import Head from 'next/head';
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children, title }) {
  return (
    <>
      <Head>
        <title>{title ? `${title} | 學習平台` : '學習平台'}</title>
        <meta name="description" content="高質量的線上學習平台，提供各種專業課程" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="site-wrapper">
        <Header />
        <main className="main-content">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
} 