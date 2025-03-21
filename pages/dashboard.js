import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getUserCourses, getUserNotes, getUserProgress } from '../api/courses';
import { useAuth } from '../context/auth-context';
import MainLayout from '../components/layout/MainLayout';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [learningStats, setLearningStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalHours: 0,
    totalCertificates: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');

  // 如果未登入，重定向到登入頁面
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  // 獲取用戶數據
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        // 獲取用戶已購課程
        const courses = await getUserCourses(user.uid);
        setEnrolledCourses(courses);

        // 計算學習統計數據
        const completedCourses = courses.filter(course => 
          course.progress && course.progress.percentage === 100
        ).length;
        
        const totalHours = courses.reduce((total, course) => {
          // 假設課程時長格式為 "X小時Y分鐘"
          const hourMatch = course.duration.match(/(\d+)小時/);
          const minuteMatch = course.duration.match(/(\d+)分鐘/);
          
          const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
          const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
          
          return total + hours + (minutes / 60);
        }, 0);

        // 獲取最近的筆記
        const allNotes = [];
        for (const course of courses) {
          const notes = await getUserNotes(user.uid, course.id);
          allNotes.push(...notes.map(note => ({
            ...note,
            courseName: course.title
          })));
        }
        
        // 按時間排序並取最近的5條
        const sortedNotes = allNotes.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        ).slice(0, 5);
        
        setRecentNotes(sortedNotes);
        setLearningStats({
          totalCourses: courses.length,
          completedCourses,
          totalHours: Math.round(totalHours * 10) / 10, // 四捨五入到小數點後一位
          totalCertificates: completedCourses // 假設完成課程就獲得證書
        });
        
        setLoading(false);
      } catch (error) {
        console.error('獲取用戶數據失敗:', error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  if (authLoading || (loading && isAuthenticated)) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  return (
    <>
      <Head>
        <title>我的學習 - 知識課堂</title>
        <meta name="description" content="查看您的學習進度和已購課程" />
      </Head>

      <div className="dashboard-page">
        <div className="dashboard-header">
          <div className="container">
            <div className="user-welcome">
              <div className="user-avatar">
                <img src={user.photoURL || '/images/avatar-placeholder.webp'} alt={user.displayName} />
              </div>
              <div className="welcome-text">
                <h2>歡迎回來，{user.displayName}</h2>
                <p>繼續您的學習之旅</p>
              </div>
            </div>
            
            <div className="stats-cards">
              <div className="stat-card">
                <div className="stat-icon courses">
                  <i className="ri-book-open-line"></i>
                </div>
                <div className="stat-info">
                  <h3>{learningStats.totalCourses}</h3>
                  <p>已購課程</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon completed">
                  <i className="ri-check-line"></i>
                </div>
                <div className="stat-info">
                  <h3>{learningStats.completedCourses}</h3>
                  <p>已完成課程</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon hours">
                  <i className="ri-time-line"></i>
                </div>
                <div className="stat-info">
                  <h3>{learningStats.totalHours}</h3>
                  <p>學習小時數</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon certificates">
                  <i className="ri-award-line"></i>
                </div>
                <div className="stat-info">
                  <h3>{learningStats.totalCertificates}</h3>
                  <p>獲得證書</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="dashboard-content">
          <div className="container">
            <div className="dashboard-tabs">
              <button 
                className={activeTab === 'courses' ? 'active' : ''}
                onClick={() => setActiveTab('courses')}
              >
                <i className="ri-book-open-line"></i> 我的課程
              </button>
              <button 
                className={activeTab === 'notes' ? 'active' : ''}
                onClick={() => setActiveTab('notes')}
              >
                <i className="ri-sticky-note-line"></i> 學習筆記
              </button>
              <button 
                className={activeTab === 'certificates' ? 'active' : ''}
                onClick={() => setActiveTab('certificates')}
              >
                <i className="ri-award-line"></i> 我的證書
              </button>
              <button 
                className={activeTab === 'profile' ? 'active' : ''}
                onClick={() => setActiveTab('profile')}
              >
                <i className="ri-user-settings-line"></i> 個人資料
              </button>
            </div>
            
            <div className="dashboard-tab-content">
              {activeTab === 'courses' && (
                <div className="courses-tab">
                  <div className="tab-header">
                    <h2>我的課程</h2>
                    <Link href="/courses">
                      <button className="btn-outline">瀏覽更多課程</button>
                    </Link>
                  </div>
                  
                  {enrolledCourses.length > 0 ? (
                    <div className="enrolled-courses">
                      {enrolledCourses.map(course => (
                        <div key={course.id} className="enrolled-course-card">
                          <div className="course-image">
                            <img src={course.thumbnail} alt={course.title} />
                            <div className="progress-overlay">
                              <div className="progress-circle">
                                <svg viewBox="0 0 36 36">
                                  <path
                                    className="progress-circle-bg"
                                    d="M18 2.0845
                                      a 15.9155 15.9155 0 0 1 0 31.831
                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                  <path
                                    className="progress-circle-fill"
                                    strokeDasharray={`${course.progress.percentage}, 100`}
                                    d="M18 2.0845
                                      a 15.9155 15.9155 0 0 1 0 31.831
                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                  />
                                </svg>
                                <div className="progress-text">{course.progress.percentage}%</div>
                              </div>
                            </div>
                          </div>
                          <div className="course-info">
                            <h3>{course.title}</h3>
                            <div className="course-meta">
                              <div className="instructor">
                                <img src={course.instructor.avatar} alt={course.instructor.name} />
                                <span>{course.instructor.name}</span>
                              </div>
                              <div className="progress-info">
                                <span>{course.progress.completedVideos}/{course.progress.totalVideos} 課時完成</span>
                              </div>
                            </div>
                            <div className="course-actions">
                              <Link href={`/player/${course.id}`}>
                                <button className="btn-continue">
                                  {course.progress.percentage > 0 ? '繼續學習' : '開始學習'}
                                </button>
                              </Link>
                              <Link href={`/course/${course.slug}`}>
                                <button className="btn-view">
                                  <i className="ri-information-line"></i>
                                </button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <i className="ri-book-open-line"></i>
                      </div>
                      <h3>您還沒有購買任何課程</h3>
                      <p>瀏覽我們的課程目錄，開始您的學習之旅</p>
                      <Link href="/courses">
                        <button className="btn-primary">瀏覽課程</button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'notes' && (
                <div className="notes-tab">
                  <div className="tab-header">
                    <h2>學習筆記</h2>
                  </div>
                  
                  {recentNotes.length > 0 ? (
                    <div className="notes-list">
                      {recentNotes.map(note => (
                        <div key={note.id} className="note-card">
                          <div className="note-header">
                            <div className="note-course">{note.courseName}</div>
                            <div className="note-date">
                              {new Date(note.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="note-content">
                            <p>{note.text}</p>
                          </div>
                          <div className="note-footer">
                            <div className="note-timestamp">
                              <i className="ri-time-line"></i>
                              <span>{formatTime(note.timestamp)}</span>
                            </div>
                            <div className="note-actions">
                              <button className="btn-edit">
                                <i className="ri-edit-line"></i>
                              </button>
                              <button className="btn-delete">
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <i className="ri-sticky-note-line"></i>
                      </div>
                      <h3>您還沒有任何筆記</h3>
                      <p>在學習課程時記錄筆記，幫助您更好地理解和記憶內容</p>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'certificates' && (
                <div className="certificates-tab">
                  <div className="tab-header">
                    <h2>我的證書</h2>
                  </div>
                  
                  {learningStats.totalCertificates > 0 ? (
                    <div className="certificates-grid">
                      {enrolledCourses
                        .filter(course => course.progress && course.progress.percentage === 100)
                        .map(course => (
                          <div key={course.id} className="certificate-card">
                            <div className="certificate-preview">
                              <div className="certificate-icon">
                                <i className="ri-award-line"></i>
                              </div>
                              <h3>{course.title}</h3>
                              <p>完成日期: {new Date().toLocaleDateString()}</p>
                            </div>
                            <div className="certificate-actions">
                              <button className="btn-download">
                                <i className="ri-download-line"></i> 下載證書
                              </button>
                              <button className="btn-share">
                                <i className="ri-share-line"></i> 分享
                              </button>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <i className="ri-award-line"></i>
                      </div>
                      <h3>您還沒有獲得任何證書</h3>
                      <p>完成課程後，您將獲得相應的證書</p>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'profile' && (
                <div className="profile-tab">
                  <div className="tab-header">
                    <h2>個人資料</h2>
                    <Link href="/profile">
                      <button className="btn-outline">編輯資料</button>
                    </Link>
                  </div>
                  
                  <div className="profile-info">
                    <div className="profile-avatar">
                      <img src={user.photoURL || '/images/avatar-placeholder.webp'} alt={user.displayName} />
                    </div>
                    <div className="profile-details">
                      <div className="profile-field">
                        <label>姓名</label>
                        <p>{user.displayName}</p>
                      </div>
                      <div className="profile-field">
                        <label>電子郵件</label>
                        <p>{user.email}</p>
                      </div>
                      <div className="profile-field">
                        <label>會員類型</label>
                        <p>{user.role === 'student' ? '學生會員' : '講師'}</p>
                      </div>
                      <div className="profile-field">
                        <label>註冊日期</label>
                        <p>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// 格式化時間工具函數
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 使用主佈局
DashboardPage.getLayout = function getLayout(page) {
  return <MainLayout>{page}</MainLayout>;
}; 