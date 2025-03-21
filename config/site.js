// 簡化版網站配置
const siteConfig = {
  siteName: '學習平台',
  siteDescription: '專業的線上學習平台，提供高質量的課程和學習資源',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com',
  contactEmail: 'contact@your-domain.com',
  copyright: `© ${new Date().getFullYear()} 學習平台. 保留所有權利.`
};

export default siteConfig; 