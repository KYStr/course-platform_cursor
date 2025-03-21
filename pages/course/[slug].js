import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/auth-context';
import { getCourseBySlug, getSections, getVideos } from '../../api/courses';
import { checkEnrollment, enrollCourse } from '../../api/enrollments';
import { FiClock, FiUser, FiVideo, FiCalendar, FiImage, FiPlay } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import siteConfig from '../../config/site';

// 如果 utils/date-utils.js 不存在，我們可以直接在文件中定義這個函數
const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export default function CoursePage() {
  const router = useRouter();
  const { slug } = router.query;
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [courseDuration, setCourseDuration] = useState('');
  const [expandedSections, setExpandedSections] = useState({});
  const [activeTab, setActiveTab] = useState('why'); // 默認顯示「為什麼要上這門課？」
  const [previewVideo, setPreviewVideo] = useState(null);

  // 計算課程總時長
  const calculateTotalDuration = (sections) => {
    let totalSeconds = 0;
    
    sections.forEach(section => {
      if (section.videos && section.videos.length > 0) {
        section.videos.forEach(video => {
          if (video.duration) {
            // 如果 duration 是對象格式
            if (typeof video.duration === 'object') {
              const hours = parseInt(video.duration.hours || 0);
              const minutes = parseInt(video.duration.minutes || 0);
              const seconds = parseInt(video.duration.seconds || 0);
              totalSeconds += hours * 3600 + minutes * 60 + seconds;
            } 
            // 如果 duration 是字符串格式 (HH:MM:SS)
            else if (typeof video.duration === 'string') {
              try {
                const parts = video.duration.split(':');
                if (parts.length === 3) {
                  const hours = parseInt(parts[0]);
                  const minutes = parseInt(parts[1]);
                  const seconds = parseInt(parts[2]);
                  totalSeconds += hours * 3600 + minutes * 60 + seconds;
                } else if (parts.length === 2) {
                  const minutes = parseInt(parts[0]);
                  const seconds = parseInt(parts[1]);
                  totalSeconds += minutes * 60 + seconds;
                }
              } catch (error) {
                console.warn('無法解析視頻時長:', video.duration, error);
              }
            }
          }
        });
      }
    });
    
    // 轉換為時分秒格式
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // 格式化為 HH:MM:SS
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // 添加一個格式化時長的輔助函數
  const formatDuration = (duration) => {
    if (!duration) return '00:00';
    
    // 如果 duration 是對象格式
    if (typeof duration === 'object') {
      const hours = parseInt(duration.hours || 0);
      const minutes = parseInt(duration.minutes || 0);
      const seconds = parseInt(duration.seconds || 0);
      
      if (hours > 0) {
        return `${hours}小時${minutes > 0 ? ` ${minutes}分鐘` : ''}`;
      } else if (minutes > 0) {
        return `${minutes}分鐘${seconds > 0 ? ` ${seconds}秒` : ''}`;
      } else {
        return `${seconds}秒`;
      }
    }
    
    // 如果 duration 是字符串格式 (HH:MM:SS)
    if (typeof duration === 'string') {
      try {
        const parts = duration.split(':');
        if (parts.length === 3) {
          const hours = parseInt(parts[0]);
          const minutes = parseInt(parts[1]);
          const seconds = parseInt(parts[2]);
          
          if (hours > 0) {
            return `${hours}小時${minutes > 0 ? ` ${minutes}分鐘` : ''}`;
          } else if (minutes > 0) {
            return `${minutes}分鐘${seconds > 0 ? ` ${seconds}秒` : ''}`;
          } else {
            return `${seconds}秒`;
          }
        }
      } catch (error) {
        console.warn('無法解析視頻時長:', duration, error);
      }
    }
    
    return duration;
  };

  // 獲取課程總視頻數
  const getTotalVideosCount = (sections) => {
    return sections.reduce((total, section) => total + section.videos.length, 0);
  };

  // 初始化展開狀態
  useEffect(() => {
    if (sections.length > 0) {
      const initialExpandState = {};
      sections.forEach(section => {
        initialExpandState[section.id] = false; // 默認收起
      });
      // 第一個章節默認展開
      if (sections[0] && sections[0].id) {
        initialExpandState[sections[0].id] = true;
      }
      setExpandedSections(initialExpandState);
    }
  }, [sections]);

  // 切換章節展開/收起
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // 獲取課程數據
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        
        // 獲取課程信息
        const courseData = await getCourseBySlug(slug);
        setCourse(courseData);
        
        // 檢查用戶是否已登錄和報名
        if (isAuthenticated && user) {
          const enrolled = await checkEnrollment(user.uid, courseData.id);
          setIsEnrolled(enrolled);
        }
        
        // 獲取課程的所有章節
        const sectionsData = await getSections(courseData.id);
        
        // 對於每個章節，獲取其視頻
        const sectionsWithVideos = await Promise.all(
          sectionsData.map(async (section) => {
            const videos = await getVideos(courseData.id, section.id);
            return {
              ...section,
              videos: videos.sort((a, b) => a.order - b.order)
            };
          })
        );
        
        const sortedSections = sectionsWithVideos.sort((a, b) => a.order - b.order);
        setSections(sortedSections);
        
        // 計算總時長
        const duration = calculateTotalDuration(sortedSections);
        setCourseDuration(duration);
        
        setLoading(false);
      } catch (error) {
        console.error('獲取課程數據失敗:', error);
        setError('獲取課程數據失敗，請稍後再試');
        setLoading(false);
      }
    };
    
    fetchCourseData();
  }, [slug, isAuthenticated, user]);

  // 報名課程
  const handleEnroll = async () => {
    if (!isAuthenticated) {
      // 如果用戶未登錄，重定向到登錄頁面
      router.push(`/login?redirect=/course/${slug}`);
      return;
    }
    
    try {
      setEnrolling(true);
      await enrollCourse(user.uid, course.id);
      setIsEnrolled(true);
      setEnrolling(false);
      
      // 報名成功後重定向到學習頁面
      router.push(`/learn/${slug}`);
    } catch (error) {
      console.error('報名課程失敗:', error);
      setEnrolling(false);
      alert('報名課程失敗，請稍後再試');
    }
  };

  // 添加切換標籤頁的函數
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // 處理視頻預覽
  const handlePreviewVideo = (video) => {
    setPreviewVideo(video);
  };

  // 關閉視頻預覽
  const closePreview = () => {
    setPreviewVideo(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>正在加載課程信息...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="error-container">
          <h2>出錯了</h2>
          <p>{error}</p>
          <Link href="/courses" legacyBehavior>
            <a className="btn-primary">返回課程列表</a>
          </Link>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="error-container">
          <h2>課程不存在</h2>
          <p>找不到該課程，可能已被刪除或地址錯誤</p>
          <Link href="/courses" legacyBehavior>
            <a className="btn-primary">返回課程列表</a>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{`${course.title} | ${siteConfig?.siteName || '線上學習平台'}`}</title>
        <meta name="description" content={course.description} />
      </Head>

      {/* 課程頭部信息 */}
      <div className="course-header">
        <div className="container">
          <div className="course-header-content">
            <div className="course-thumbnail">
              {course.thumbnail ? (
                <img 
                  src={course.thumbnail} 
                  alt={course.title} 
                  className="course-image"
                  loading="lazy"
                />
              ) : (
                <div className="course-image-placeholder">
                  <FiImage size={48} />
                </div>
              )}
            </div>
            
            <div className="course-info">
              <h1 className="course-title">{course.title}</h1>
              <p className="course-description">{course.description}</p>
              
              <div className="course-meta">
                <div className="meta-item">
                  <FiUser className="meta-icon" />
                  <span>{course.instructor || '未知講師'}</span>
                </div>
                <div className="meta-item">
                  <FiClock className="meta-icon" />
                  <span>{courseDuration}</span>
                </div>
                <div className="meta-item">
                  <FiVideo className="meta-icon" />
                  <span>{getTotalVideosCount(sections)} 個視頻</span>
                </div>
                <div className="meta-item">
                  <FiCalendar className="meta-icon" />
                  <span>最後更新: {formatDate(course.updatedAt)}</span>
                </div>
              </div>
              
              <div className="course-actions">
                {isEnrolled ? (
                  <Link href={`/learn/${course.slug}`} legacyBehavior>
                    <a className="btn-primary">繼續學習</a>
                  </Link>
                ) : (
                  <button 
                    className="btn-primary"
                    onClick={handleEnroll}
                    disabled={enrolling}
                  >
                    {enrolling ? '處理中...' : '報名課程'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 課程主要內容 */}
      <div className="course-main-content">
        <div className="container">
          <div className="content-grid">
            {/* 左側：課程內容和介紹 */}
            <div className="content-main">
              {/* 課程內容標籤頁 */}
              <div className="course-tabs">
                <button 
                  className={`tab-btn ${activeTab === 'why' ? 'active' : ''}`}
                  onClick={() => handleTabChange('why')}
                >
                  <i className="ri-question-line"></i> 為什麼要上這門課？
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'outline' ? 'active' : ''}`}
                  onClick={() => handleTabChange('outline')}
                >
                  <i className="ri-list-check"></i> 課程大綱
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
                  onClick={() => handleTabChange('description')}
                >
                  <i className="ri-information-line"></i> 課程介紹
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'instructor' ? 'active' : ''}`}
                  onClick={() => handleTabChange('instructor')}
                >
                  <i className="ri-user-line"></i> 講師資訊
                </button>
              </div>
              
              {/* 課程內容標籤頁內容 */}
              <div className="tab-content">
                {/* 為什麼要上這門課？ */}
                {activeTab === 'why' && (
                  <div className="course-why-tab">
                    <h2 className="content-title">為什麼要上這門課？</h2>
                    
                    {course.whyTakeThisCourse ? (
                      <div className="markdown-content">
                        <ReactMarkdown>
                          {course.whyTakeThisCourse}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="no-content">暫無相關內容</p>
                    )}
                  </div>
                )}
                
                {/* 課程大綱 */}
                {activeTab === 'outline' && (
                  <div className="course-outline-tab">
                    <h2 className="content-title">課程大綱</h2>
                    
                    {sections.length > 0 ? (
                      <div className="course-outline">
                        {sections.map((section, index) => (
                          <div key={section.id} className="outline-section">
                            <h3 className="outline-section-title">
                              <span className="section-number">第 {index + 1} 章</span>
                              <span className="section-title-text">{section.title}</span>
                            </h3>
                            {section.description && (
                              <p className="outline-section-description">{section.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-content">暫無課程大綱</p>
                    )}
                  </div>
                )}
                
                {/* 課程介紹 */}
                {activeTab === 'description' && (
                  <div className="course-description-tab">
                    <h2 className="content-title">課程介紹</h2>
                    
                    {course.longDescription ? (
                      <div className="description-content">
                        <ReactMarkdown>
                          {course.longDescription}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p>{course.description || '暫無詳細介紹'}</p>
                    )}
                    
                    {course.requirements && course.requirements.length > 0 && (
                      <div className="requirements-section">
                        <h3>課程要求</h3>
                        <ul className="requirements-list">
                          {course.requirements.map((req, index) => (
                            <li key={index}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {course.targetAudience && course.targetAudience.length > 0 && (
                      <div className="audience-section">
                        <h3>適合對象</h3>
                        <ul className="audience-list">
                          {course.targetAudience.map((audience, index) => (
                            <li key={index}>{audience}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 講師資訊 */}
                {activeTab === 'instructor' && (
                  <div className="instructor-tab">
                    <h2 className="content-title">講師資訊</h2>
                    
                    <div className="instructor-profile">
                      <div className="instructor-avatar">
                        {course.instructorAvatar ? (
                          <img 
                            src={course.instructorAvatar} 
                            alt={course.instructor} 
                            className="avatar-image"
                            loading="lazy"
                          />
                        ) : (
                          <div className="avatar-placeholder">
                            <i className="ri-user-line"></i>
                          </div>
                        )}
                      </div>
                      
                      <div className="instructor-info">
                        <h3 className="instructor-name">{course.instructor || '未知講師'}</h3>
                        <p className="instructor-title">{course.instructorTitle || '專業講師'}</p>
                        
                        {course.instructorBio ? (
                          <div className="instructor-bio">
                            <ReactMarkdown>
                              {course.instructorBio}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p>暫無講師介紹</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 右側：課程信息卡片 */}
            <div className="content-sidebar">
              <div className="course-card">
                <div className="card-header">
                  <h3 className="card-price">
                    {course.price ? `NT$ ${course.price}` : '免費'}
                  </h3>
                </div>
                
                <div className="card-body">
                  <ul className="course-features">
                    <li>
                      <i className="ri-video-line"></i>
                      <span>{getTotalVideosCount(sections)} 個視頻課程</span>
                    </li>
                    <li>
                      <i className="ri-time-line"></i>
                      <span>總時長: {courseDuration}</span>
                    </li>
                    <li>
                      <i className="ri-file-list-line"></i>
                      <span>{sections.length} 個章節</span>
                    </li>
                    <li>
                      <i className="ri-device-line"></i>
                      <span>隨時隨地學習</span>
                    </li>
                    {/* <li>
                      <i className="ri-trophy-line"></i>
                      <span>完成後獲得證書</span>
                    </li> */}
                    <li>
                      <i className="ri-calendar-line"></i>
                      <span>終身學習權限</span>
                    </li>
                  </ul>
                  
                  <div className="card-actions">
                    {isEnrolled ? (
                      <Link href={`/learn/${course.slug}`} legacyBehavior>
                        <a className="btn-primary btn-block">
                          <i className="ri-play-circle-line"></i> 繼續學習
                        </a>
                      </Link>
                    ) : (
                      <button 
                        className="btn-primary btn-block"
                        onClick={handleEnroll}
                        disabled={enrolling}
                      >
                        {enrolling ? (
                          <>
                            <span className="spinner"></span> 處理中...
                          </>
                        ) : (
                          <>
                            <i className="ri-shopping-cart-line"></i> 報名課程
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 視頻預覽模態框 */}
      {previewVideo && (
        <div className="video-preview-modal">
          <div className="modal-overlay" onClick={closePreview}></div>
          <div className="modal-content">
            <button className="close-btn" onClick={closePreview}>
              <i className="ri-close-line"></i>
            </button>
            <h3 className="preview-title">{previewVideo.title}</h3>
            <div className="preview-video">
              <iframe 
                src={`https://player.vimeo.com/video/${previewVideo.vimeoId}?title=0&byline=0&portrait=0`} 
                frameBorder="0" 
                allow="autoplay; fullscreen" 
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* 課程頭部樣式 */
        .course-header {
          background-color: #f8f9fa;
          padding: 40px 0;
          margin-bottom: 40px;
        }
        
        .course-header-content {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }
        
        @media (min-width: 768px) {
          .course-header-content {
            flex-direction: row;
            align-items: flex-start;
          }
        }
        
        .course-thumbnail {
          flex: 0 0 300px;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        
        .course-image {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
        }
        
        .course-image-placeholder {
          width: 100%;
          height: 200px;
          background-color: #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #adb5bd;
        }
        
        .course-info {
          flex: 1;
        }
        
        .course-title {
          font-size: 28px;
          margin-bottom: 15px;
          color: #333;
        }
        
        .course-description {
          font-size: 16px;
          line-height: 1.6;
          color: #666;
          margin-bottom: 20px;
        }
        
        .course-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 25px;
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 14px;
          color: #666;
        }
        
        .meta-icon {
          color: #4a6cf7;
        }
        
        .course-actions {
          margin-top: 20px;
        }
        
        .btn-primary {
          display: inline-block;
          padding: 10px 20px;
          background-color: #4a6cf7;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 0.3s;
        }
        
        .btn-primary:hover {
          background-color: #3a56d4;
        }
        
        .btn-primary:disabled {
          background-color: #a0aec0;
          cursor: not-allowed;
        }
        
        /* 課程主要內容區域 */
        .course-main-content {
          padding: 40px 0 60px;
          background-color: #fff;
          margin-bottom: 40px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .content-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 30px;
        }
        
        @media (min-width: 992px) {
          .content-grid {
            grid-template-columns: 2fr 1fr;
          }
        }
        
        /* 標籤頁 */
        .course-tabs {
          display: flex;
          border-bottom: 1px solid #e0e0e0;
          margin-bottom: 25px;
          overflow-x: auto;
        }
        
        .tab-btn {
          padding: 12px 20px;
          background: none;
          border: none;
          font-size: 16px;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          border-bottom: 2px solid transparent;
          transition: all 0.3s;
        }
        
        .tab-btn:hover {
          color: #4a6cf7;
        }
        
        .tab-btn.active {
          color: #4a6cf7;
          border-bottom-color: #4a6cf7;
        }
        
        /* 標籤頁內容 */
        .tab-content {
          padding: 20px 0;
        }
        
        .content-title {
          font-size: 24px;
          margin-bottom: 20px;
          color: #333;
        }
        
        /* Markdown 內容樣式 */
        .markdown-content {
          font-size: 16px;
          line-height: 1.7;
          color: #444;
        }
        
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          color: #333;
        }
        
        .markdown-content h1 {
          font-size: 2em;
        }
        
        .markdown-content h2 {
          font-size: 1.75em;
        }
        
        .markdown-content h3 {
          font-size: 1.5em;
        }
        
        .markdown-content h4 {
          font-size: 1.25em;
        }
        
        .markdown-content p {
          margin-bottom: 1em;
        }
        
        .markdown-content ul,
        .markdown-content ol {
          margin-bottom: 1em;
          padding-left: 2em;
        }
        
        .markdown-content li {
          margin-bottom: 0.5em;
        }
        
        .markdown-content a {
          color: #4a6cf7;
          text-decoration: none;
        }
        
        .markdown-content a:hover {
          text-decoration: underline;
        }
        
        .markdown-content blockquote {
          border-left: 4px solid #e0e0e0;
          padding-left: 1em;
          margin-left: 0;
          margin-right: 0;
          font-style: italic;
          color: #666;
        }
        
        .markdown-content code {
          background-color: #f5f5f5;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.9em;
        }
        
        .markdown-content pre {
          background-color: #f5f5f5;
          padding: 1em;
          border-radius: 5px;
          overflow-x: auto;
          margin-bottom: 1em;
        }
        
        .markdown-content pre code {
          background-color: transparent;
          padding: 0;
        }
        
        .markdown-content img {
          max-width: 100%;
          height: auto;
          border-radius: 5px;
          margin: 1em 0;
        }
        
        .markdown-content hr {
          border: none;
          border-top: 1px solid #e0e0e0;
          margin: 2em 0;
        }
        
        /* 課程介紹標籤頁 */
        .description-content {
          margin-bottom: 30px;
        }
        
        .requirements-section,
        .audience-section {
          margin-top: 30px;
        }
        
        .requirements-section h3,
        .audience-section h3 {
          font-size: 20px;
          margin-bottom: 15px;
          color: #333;
        }
        
        .requirements-list,
        .audience-list {
          list-style-type: disc;
          padding-left: 20px;
        }
        
        .requirements-list li,
        .audience-list li {
          margin-bottom: 10px;
          line-height: 1.6;
          color: #444;
        }
        
        /* 講師標籤頁 */
        .instructor-profile {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        @media (min-width: 768px) {
          .instructor-profile {
            flex-direction: row;
            align-items: flex-start;
          }
        }
        
        .instructor-avatar {
          flex: 0 0 120px;
          height: 120px;
          border-radius: 50%;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        
        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .avatar-placeholder {
          width: 100%;
          height: 100%;
          background-color: #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #adb5bd;
          font-size: 40px;
        }
        
        .instructor-info {
          flex: 1;
        }
        
        .instructor-name {
          font-size: 22px;
          margin: 0 0 5px;
          color: #333;
        }
        
        .instructor-title {
          font-size: 16px;
          color: #666;
          margin-bottom: 15px;
        }
        
        /* 側邊欄 */
        .content-sidebar {
          align-self: start;
        }
        
        .course-card {
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          background-color: #fff;
          position: sticky;
          top: 20px;
        }
        
        .card-header {
          padding: 20px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #eaeaea;
        }
        
        .card-price {
          font-size: 24px;
          margin: 0;
          color: #333;
          text-align: center;
        }
        
        .card-body {
          padding: 20px;
        }
        
        .course-features {
          list-style: none;
          padding: 0;
          margin: 0 0 25px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .course-features li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          color: #444;
        }
        
        .course-features li i {
          color: #4a6cf7;
          font-size: 18px;
        }
        
        .card-actions {
          margin-top: 20px;
        }
        
        .btn-block {
          display: flex;
          width: 100%;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          font-size: 16px;
        }
        
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .no-content {
          color: #666;
          font-style: italic;
        }
        
        /* 課程章節樣式 */
        .course-sections {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .course-section {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background-color: #f8f9fa;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .section-header:hover {
          background-color: #f1f3f5;
        }
        
        .section-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .section-number {
          font-size: 14px;
          color: #666;
        }
        
        .section-title {
          font-size: 18px;
          margin: 0;
          color: #333;
        }
        
        .video-count {
          font-size: 14px;
          color: #666;
        }
        
        .toggle-btn {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 20px;
        }
        
        .section-content {
          padding: 15px 20px;
          border-top: 1px solid #e0e0e0;
        }
        
        .section-description {
          margin-bottom: 15px;
          font-size: 15px;
          color: #666;
          line-height: 1.6;
        }
        
        .video-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .video-item {
          display: flex;
          align-items: center;
          padding: 10px;
          border-radius: 5px;
          transition: background-color 0.3s;
        }
        
        .video-item:hover {
          background-color: #f8f9fa;
        }
        
        .video-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }
        
        .video-icon {
          color: #4a6cf7;
          font-size: 20px;
        }
        
        .video-details {
          flex: 1;
        }
        
        .video-title {
          font-size: 16px;
          margin: 0 0 5px;
          color: #333;
        }
        
        .video-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: #666;
        }
        
        .video-duration {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .video-free-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #4a6cf7;
        }
        
        .preview-btn {
          background-color: transparent;
          border: 1px solid #4a6cf7;
          color: #4a6cf7;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .preview-btn:hover {
          background-color: #4a6cf7;
          color: white;
        }
        
        /* 視頻預覽模態框 */
        .video-preview-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.7);
        }
        
        .modal-content {
          position: relative;
          width: 90%;
          max-width: 900px;
          background-color: white;
          border-radius: 10px;
          padding: 20px;
          z-index: 1001;
        }
        
        .close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          color: #666;
          font-size: 24px;
          cursor: pointer;
        }
        
        .preview-title {
          font-size: 20px;
          margin-bottom: 15px;
          color: #333;
          padding-right: 30px;
        }
        
        .preview-video {
          position: relative;
          padding-bottom: 56.25%; /* 16:9 比例 */
          height: 0;
          overflow: hidden;
        }
        
        .preview-video iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 5px;
        }
        
        /* 課程大綱樣式 */
        .course-outline {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .outline-section {
          padding: 20px;
          border-radius: 8px;
          background-color: #f8f9fa;
          border-left: 4px solid #4a6cf7;
        }
        
        .outline-section-title {
          font-size: 18px;
          margin: 0 0 10px;
          color: #333;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .section-number {
          font-size: 14px;
          background-color: #4a6cf7;
          color: white;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
          min-width: 70px;
          text-align: center;
        }
        
        .section-title-text {
          font-weight: 500;
          flex: 1;
        }
        
        .outline-section-description {
          font-size: 15px;
          line-height: 1.6;
          color: #666;
          margin: 0;
        }
      `}</style>
    </Layout>
  );
} 