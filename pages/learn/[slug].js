import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Layout from '../../components/Layout';
import { getCourseBySlug, getSections, getVideos } from '../../api/courses';
import { useAuth } from '../../context/auth-context';
import { checkEnrollment } from '../../api/enrollments';
import siteConfig from '../../config/site';
import { FiClock, FiCheck, FiLock, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

export default function LearnPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [completedVideos, setCompletedVideos] = useState([]);
  const [progress, setProgress] = useState(0);

  // 在組件頂部添加一個輔助函數來處理視頻 URL
  const getVideoEmbedUrl = (video) => {
    if (!video) return null;
    
    // 檢查是否有 videoUrl
    if (video.videoUrl) {
      // 如果是完整的 Vimeo URL，提取 ID
      if (video.videoUrl.includes('vimeo.com')) {
        const match = video.videoUrl.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/|vimeo\.com\/video\/)(\d+)/);
        if (match && match[1]) {
          return `https://player.vimeo.com/video/${match[1]}?title=0&byline=0&portrait=0`;
        }
      }
      return `https://player.vimeo.com/video/${video.videoUrl}?title=0&byline=0&portrait=0`;
    }
    
    // 檢查是否有 vimeoId
    if (video.vimeoId) {
      return `https://player.vimeo.com/video/${video.vimeoId}?title=0&byline=0&portrait=0`;
    }
    
    return null;
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
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      } else {
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
    }
    
    // 如果 duration 是字符串格式
    return duration;
  };

  // 切換章節展開/收起
  const toggleSectionExpand = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // 獲取課程數據
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true);
        
        // 獲取課程信息
        const courseData = await getCourseBySlug(slug);
        setCourse(courseData);
        
        // 獲取課程的所有章節
        const sectionsData = await getSections(courseData.id);
        
        // 對於每個章節，獲取其視頻
        const sectionsWithVideos = await Promise.all(
          sectionsData.map(async (section) => {
            const videos = await getVideos(courseData.id, section.id);
            console.log(`章節 ${section.id} 的視頻:`, videos);
            return {
              ...section,
              videos: videos.sort((a, b) => a.order - b.order)
            };
          })
        );
        
        const sortedSections = sectionsWithVideos.sort((a, b) => a.order - b.order);
        setSections(sortedSections);
        
        // 如果有章節和視頻，默認選擇第一個視頻
        if (sortedSections.length > 0 && sortedSections[0].videos && sortedSections[0].videos.length > 0) {
          const firstVideo = sortedSections[0].videos[0];
          console.log('默認選擇第一個視頻:', firstVideo);
          setCurrentVideo(firstVideo);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('獲取課程數據失敗:', error);
        setError('獲取課程數據失敗，請稍後再試');
        setLoading(false);
      }
    };
    
    if (slug) {
      fetchCourseData();
    }
  }, [slug]);

  // 選擇視頻
  const handleSelectVideo = (video) => {
    console.log('選擇視頻:', video);
    setCurrentVideo(video);
    // TODO: 更新用戶的學習進度
  };

  // 標記視頻為已完成
  const handleCompleteVideo = (videoId) => {
    if (!completedVideos.includes(videoId)) {
      const newCompletedVideos = [...completedVideos, videoId];
      setCompletedVideos(newCompletedVideos);
      
      // 計算新的進度
      const totalVideos = sections.reduce((total, section) => total + section.videos.length, 0);
      const newProgress = Math.round((newCompletedVideos.length / totalVideos) * 100);
      setProgress(newProgress);
      
      // TODO: 將進度保存到數據庫
    }
  };

  return (
    <Layout>
      <Head>
        <title>{`${course?.title || '課程學習'} | ${siteConfig?.siteName || '學習平台'}`}</title>
      </Head>

      {loading ? (
        <div className="learn-loading">
          <div className="spinner"></div>
          <p>正在加載課程內容...</p>
        </div>
      ) : error ? (
        <div className="learn-error">
          <h2>出錯了</h2>
          <p>{error}</p>
          <Link href="/dashboard" legacyBehavior>
            <a className="btn-primary">返回儀表板</a>
          </Link>
        </div>
      ) : course ? (
        <div className="learn-container">
          {/* 課程標題和進度 */}
          <div className="learn-header">
            <div className="container">
              <div className="learn-header-content">
                <Link href={`/course/${slug}`} legacyBehavior>
                  <a className="back-link">
                    <i className="ri-arrow-left-line"></i> 返回課程詳情
                  </a>
                </Link>
                <h1 className="course-title">{course.title}</h1>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{progress}% 完成</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="learn-content">
            <div className="container">
              <div className="learn-grid">
                {/* 視頻播放區域 */}
                <div className="video-container">
                  {currentVideo ? (
                    <>
                      <div className="video-player">
                        {getVideoEmbedUrl(currentVideo) ? (
                          <div className="responsive-video">
                            {console.log('Video URL:', getVideoEmbedUrl(currentVideo))}
                            <iframe 
                              src={getVideoEmbedUrl(currentVideo)} 
                              frameBorder="0" 
                              allow="autoplay; fullscreen" 
                              allowFullScreen
                            ></iframe>
                          </div>
                        ) : (
                          <div className="video-placeholder">
                            <p>視頻尚未上傳</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="video-info">
                        <div className="video-header">
                          <h2 className="video-title">{currentVideo.title}</h2>
                          <button 
                            className={`btn-complete ${completedVideos.includes(currentVideo.id) ? 'completed' : ''}`}
                            onClick={() => handleCompleteVideo(currentVideo.id)}
                          >
                            <FiCheck className="icon" />
                            {completedVideos.includes(currentVideo.id) ? '已完成' : '標記為已完成'}
                          </button>
                        </div>
                        <div className="video-description-container">
                          <div className="video-description">
                            <ReactMarkdown>{currentVideo.description || ''}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="no-video-selected">
                      <p>請從右側選擇一個視頻開始學習</p>
                    </div>
                  )}
                </div>
                
                {/* 課程大綱 */}
                <div className="course-outline">
                  <h3 className="outline-title">課程大綱</h3>
                  
                  <div className="sections-list">
                    {sections.map(section => (
                      <div key={section.id} className="section-item">
                        <div 
                          className="section-header"
                          onClick={() => toggleSectionExpand(section.id)}
                        >
                          <div className="section-title-wrapper">
                            <h4 className="section-title">{section.title}</h4>
                          </div>
                          <div className="toggle-icon">
                            {expandedSections[section.id] ? (
                              <FiChevronUp />
                            ) : (
                              <FiChevronDown />
                            )}
                          </div>
                        </div>
                        
                        {expandedSections[section.id] && (
                          <div className="section-videos">
                            <ul className="videos-list">
                              {section.videos.map(video => (
                                <li 
                                  key={video.id} 
                                  className={`video-item ${currentVideo?.id === video.id ? 'active' : ''} ${completedVideos.includes(video.id) ? 'completed' : ''}`}
                                  onClick={() => handleSelectVideo(video)}
                                >
                                  <div className="video-status">
                                    {completedVideos.includes(video.id) ? (
                                      <FiCheck className="status-icon completed" />
                                    ) : (
                                      <div className="status-icon"></div>
                                    )}
                                  </div>
                                  <div className="video-info">
                                    <span className="video-title">{video.title}</span>
                                    {video.duration && (
                                      <span className="video-duration">
                                        <FiClock className="icon" />
                                        {formatDuration(video.duration)}
                                      </span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      
      <style jsx>{`
        .learn-loading, .learn-error, .learn-not-enrolled {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          min-height: 400px;
        }
        
        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top: 4px solid #3498db;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .learn-header {
          background-color: #2a3f54;
          color: white;
          padding: 20px 0;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }
        
        .back-link {
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .back-link:hover {
          color: white;
        }
        
        .course-title {
          font-size: 24px;
          margin-bottom: 15px;
        }
        
        .progress-container {
          display: flex;
          align-items: center;
        }
        
        .progress-bar {
          flex-grow: 1;
          height: 8px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          overflow: hidden;
          margin-right: 10px;
        }
        
        .progress-fill {
          height: 100%;
          background-color: #4CAF50;
          transition: width 0.3s;
        }
        
        .progress-text {
          font-weight: 600;
          min-width: 60px;
        }
        
        .learn-content {
          padding: 30px 0;
        }
        
        .learn-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 30px;
        }
        
        @media (max-width: 768px) {
          .learn-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .video-container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .responsive-video {
          position: relative;
          padding-bottom: 56.25%; /* 16:9 比例 */
          height: 0;
          overflow: hidden;
        }
        
        .responsive-video iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        
        .video-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 300px;
          background-color: #f5f5f5;
          color: #666;
        }
        
        .video-info {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .video-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 15px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .video-title {
          margin: 0;
          font-size: 24px;
          color: #333;
        }
        
        .video-description-container {
          width: 100%;
        }
        
        .video-description {
          color: #666;
          line-height: 1.6;
          width: 100%;
        }
        
        .btn-complete {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          background-color: #f0f0f0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
          color: #666;
          white-space: nowrap;
        }
        
        .btn-complete:hover {
          background-color: #e0e0e0;
        }
        
        .btn-complete.completed {
          background-color: #e8f5e9;
          color: #388e3c;
        }
        
        .btn-complete .icon {
          margin-right: 6px;
        }
        
        .video-actions {
          display: flex;
          gap: 10px;
        }
        
        .no-video-selected {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 300px;
          background-color: #f5f5f5;
          color: #666;
        }
        
        .course-outline {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .outline-title {
          padding: 15px 20px;
          margin: 0;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .section-item {
          border-bottom: 1px solid #e0e0e0;
        }
        
        .section-item:last-child {
          border-bottom: none;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .section-header:hover {
          background-color: #f5f5f5;
        }
        
        .section-title {
          margin: 0;
          font-size: 16px;
        }
        
        .toggle-icon {
          color: #666;
        }
        
        .section-videos {
          background-color: #f9f9f9;
        }
        
        .videos-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .video-item {
          display: flex;
          align-items: center;
          padding: 12px 20px;
          border-bottom: 1px solid #e0e0e0;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .video-item:last-child {
          border-bottom: none;
        }
        
        .video-item:hover {
          background-color: #f0f0f0;
        }
        
        .video-item.active {
          background-color: #e3f2fd;
        }
        
        .video-item.completed {
          background-color: #f1f8e9;
        }
        
        .video-status {
          margin-right: 10px;
        }
        
        .status-icon {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .status-icon.completed {
          color: #4CAF50;
          border-color: #4CAF50;
        }
        
        .video-info {
          flex-grow: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .video-duration {
          font-size: 14px;
          color: #666;
          display: flex;
          align-items: center;
        }
      `}</style>
    </Layout>
  );
} 