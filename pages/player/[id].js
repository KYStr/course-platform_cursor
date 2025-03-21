import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { getCourseById, getVideoById, saveNote, markVideoComplete, checkEnrollment } from '../../api/courses';
import { useAuth } from '../../context/auth-context';

export default function CoursePlayer() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState([]);
  const [progress, setProgress] = useState(0);
  const playerRef = useRef(null);
  const [error, setError] = useState(null);
  
  // 獲取課程和視頻數據
  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 檢查用戶是否已報名該課程
        if (user) {
          const isEnrolled = await checkEnrollment(user.uid, id);
          if (!isEnrolled) {
            // 如果未報名，重定向到課程詳情頁
            const courseData = await getCourseById(id);
            if (courseData && courseData.slug) {
              router.push(`/course/${courseData.slug}`);
            } else {
              setError('課程資料不完整，無法重定向');
            }
            return;
          }
        }
        
        const courseData = await getCourseById(id);
        console.log('課程數據:', courseData); // 添加日誌以檢查數據
        
        if (!courseData) {
          setError('找不到課程數據');
          setLoading(false);
          return;
        }
        
        setCourse(courseData);
        
        // 獲取當前視頻或默認第一個視頻
        let videoId;
        if (router.query.video) {
          videoId = router.query.video;
        } else if (courseData.sections && 
                  courseData.sections.length > 0 && 
                  courseData.sections[0].videos && 
                  courseData.sections[0].videos.length > 0) {
          videoId = courseData.sections[0].videos[0].id;
        } else {
          setError('課程沒有視頻內容');
          setLoading(false);
          return;
        }
        
        if (videoId) {
          try {
            const videoData = await getVideoById(videoId);
            console.log('視頻數據:', videoData); // 添加日誌以檢查數據
            setCurrentVideo(videoData);
          } catch (videoError) {
            console.error('獲取視頻失敗:', videoError);
            setError(`無法載入視頻: ${videoError.message}`);
            setLoading(false);
            return;
          }
        } else {
          setError('無法確定要播放的視頻');
          setLoading(false);
          return;
        }
        
        setLoading(false);
      } catch (error) {
        console.error('獲取課程數據失敗:', error);
        setError(`無法載入課程: ${error.message}`);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, router.query.video, user]);
  
  // 初始化Vimeo播放器
  useEffect(() => {
    if (!currentVideo || !playerRef.current) return;
    
    // Vimeo播放器初始化
    // 注意：這裡使用Vimeo API，需要引入Vimeo Player SDK
    const player = new Vimeo.Player(playerRef.current, {
      id: currentVideo.vimeoId,
      width: '100%',
      height: '100%',
      controls: false // 使用自定義控制
    });
    
    // 監聽播放進度
    player.on('timeupdate', function(data) {
      // 更新進度條
      const progressPercent = (data.percent * 100).toFixed(0);
      setProgress(progressPercent);
    });
    
    return () => {
      // 清理播放器
      player.destroy();
    };
  }, [currentVideo]);
  
  // 保存筆記
  const handleSaveNote = async () => {
    if (!noteText.trim() || !user) return;
    
    try {
      const timestamp = Math.floor(playerRef.current.getCurrentTime());
      const newNote = await saveNote({
        userId: user.uid,
        courseId: course.id,
        videoId: currentVideo.id,
        text: noteText,
        timestamp
      });
      
      setNotes(prev => [...prev, newNote]);
      setNoteText('');
    } catch (error) {
      console.error('保存筆記失敗:', error);
    }
  };
  
  // 標記視頻完成
  const handleMarkComplete = async () => {
    if (!user) return;
    
    try {
      await markVideoComplete(user.uid, course.id, currentVideo.id);
      // 更新UI顯示完成狀態
    } catch (error) {
      console.error('標記完成失敗:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>載入課程中...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon"><i className="ri-error-warning-line"></i></div>
        <h2>出錯了</h2>
        <p>{error}</p>
        <Link href="/courses">
          <button className="btn-primary">返回課程列表</button>
        </Link>
      </div>
    );
  }
  
  if (!course) {
    return (
      <div className="error-container">
        <div className="error-icon"><i className="ri-file-search-line"></i></div>
        <h2>找不到課程</h2>
        <p>該課程可能不存在或已被刪除</p>
        <Link href="/courses">
          <button className="btn-primary">瀏覽所有課程</button>
        </Link>
      </div>
    );
  }
  
  if (!currentVideo) {
    return (
      <div className="error-container">
        <div className="error-icon"><i className="ri-video-line"></i></div>
        <h2>找不到視頻</h2>
        <p>該課程沒有可播放的視頻內容</p>
        <Link href={`/course/${course.slug}`}>
          <button className="btn-primary">返回課程詳情</button>
        </Link>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>{currentVideo.title} - {course.title} | 知識課堂</title>
      </Head>
      
      <header className="player-header">
        <div className="container">
          <div className="course-title">
            <Link href={`/course/${course.slug}`}>
              <a className="back-button"><i className="ri-arrow-left-line"></i></a>
            </Link>
            <h1>{course.title}</h1>
          </div>
          <div className="player-actions">
            <button className="btn-notes"><i className="ri-sticky-note-line"></i> 我的筆記</button>
            <button className="btn-favorite"><i className="ri-heart-line"></i> 收藏</button>
            {user && (
              <div className="user-profile">
                <img src={user.photoURL || '/images/avatar-placeholder.webp'} alt={user.displayName} />
                <span>{user.displayName}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="course-player-container">
        <div className="video-container">
          {/* Vimeo視頻嵌入 */}
          <div className="vimeo-player" ref={playerRef}></div>
          
          <div className="player-controls">
            <div className="progress-bar">
              <div className="progress-inner" style={{ width: `${progress}%` }}></div>
              <div className="progress-handle" style={{ left: `${progress}%` }}></div>
            </div>
            <div className="control-buttons">
              <button className="btn-play"><i className="ri-play-fill"></i></button>
              <button className="btn-volume"><i className="ri-volume-up-line"></i></button>
              <div className="time-display">00:00 / {currentVideo.duration || '00:00'}</div>
              <div className="control-right">
                <button className="btn-speed">1.0x</button>
                <button className="btn-quality">1080p</button>
                <button className="btn-fullscreen"><i className="ri-fullscreen-line"></i></button>
              </div>
            </div>
          </div>
          
          <div className="video-info">
            <h2>{currentVideo.title}</h2>
            <p className="video-description">{currentVideo.description}</p>
          </div>
        </div>
        
        <CourseOutline 
          course={course} 
          currentVideoId={currentVideo.id} 
          onSelectVideo={(videoId) => router.push(`/player/${course.id}?video=${videoId}`)}
        />
      </div>
      
      <div className="player-footer">
        <div className="container">
          <div className="navigation-buttons">
            <button className="btn-prev"><i className="ri-arrow-left-line"></i> 上一課</button>
            <button className="btn-next">下一課 <i className="ri-arrow-right-line"></i></button>
          </div>
          <div className="lesson-completion">
            <button className="btn-complete" onClick={handleMarkComplete}>
              <i className="ri-check-line"></i> 標記為已完成
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// 課程大綱組件
function CourseOutline({ course, currentVideoId, onSelectVideo }) {
  const [activeTab, setActiveTab] = useState('content');
  
  return (
    <aside className="course-outline">
      <div className="outline-header">
        <div className="tab-buttons">
          <button 
            className={activeTab === 'content' ? 'active' : ''}
            onClick={() => setActiveTab('content')}
          >
            課程內容
          </button>
          <button 
            className={activeTab === 'notes' ? 'active' : ''}
            onClick={() => setActiveTab('notes')}
          >
            我的筆記
          </button>
        </div>
      </div>
      
      {activeTab === 'content' ? (
        <div className="course-content">
          {course.sections && course.sections.map(section => (
            <div key={section.id} className="course-section">
              <div className="section-header">
                <h3>{section.title}</h3>
                <div className="section-meta">
                  <span>{section.videos ? section.videos.length : 0} 個視頻</span>
                  <span>{section.duration || '0分鐘'}</span>
                </div>
              </div>
              
              <div className="section-videos">
                {section.videos && section.videos.map(video => (
                  <div 
                    key={video.id} 
                    className={`video-item ${video.id === currentVideoId ? 'active' : ''} ${video.completed ? 'completed' : ''}`}
                    onClick={() => onSelectVideo(video.id)}
                  >
                    <div className="video-icon">
                      {video.completed ? (
                        <i className="ri-checkbox-circle-fill"></i>
                      ) : video.id === currentVideoId ? (
                        <i className="ri-play-circle-fill"></i>
                      ) : (
                        <i className="ri-play-circle-line"></i>
                      )}
                    </div>
                    <div className="video-info">
                      <h4>{video.title}</h4>
                      <div className="video-meta">
                        <span>{video.duration || '0:00'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <NoteSection notes={[]} noteText="" onNoteChange={() => {}} onSaveNote={() => {}} />
      )}
      
      <div className="course-progress">
        <div className="progress-bar">
          <div className="progress-inner" style={{ width: `${course.progress || 0}%` }}></div>
        </div>
        <div className="progress-text">
          <p>課程進度</p>
          <p>{course.completedVideos || 0}/{course.totalVideos || 0} 視頻</p>
        </div>
      </div>
    </aside>
  );
}

// 筆記區域組件
function NoteSection({ notes, noteText, onNoteChange, onSaveNote }) {
  return (
    <div className="note-section">
      <div className="note-header">
        <h3>我的筆記</h3>
        <div className="note-actions">
          <button className="btn-add-note"><i className="ri-add-line"></i> 添加筆記</button>
          <button className="btn-export-notes"><i className="ri-download-line"></i> 導出</button>
        </div>
      </div>
      
      <div className="note-editor">
        <textarea 
          placeholder="在此記錄筆記..." 
          value={noteText}
          onChange={(e) => onNoteChange(e.target.value)}
        ></textarea>
        <div className="editor-tools">
          <button><i className="ri-bold"></i></button>
          <button><i className="ri-italic"></i></button>
          <button><i className="ri-list-check"></i></button>
          <button><i className="ri-links-line"></i></button>
        </div>
        <button className="btn-save-note" onClick={onSaveNote}>保存筆記</button>
      </div>
      
      <div className="saved-notes">
        {notes.map(note => (
          <div key={note.id} className="note-item">
            <div className="note-timestamp">{formatTime(note.timestamp)}</div>
            <div className="note-content">
              <p>{note.text}</p>
            </div>
            <div className="note-actions">
              <button><i className="ri-edit-line"></i></button>
              <button><i className="ri-delete-bin-line"></i></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 格式化時間工具函數
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
} 