import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../../components/AdminLayout';
import { useAuth } from '../../../context/auth-context';
import { getCategories, getPrerequisites, createPrerequisite } from '../../../api/courses';
import { createCourse, uploadCourseThumbnail } from '../../../api/admin';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import dynamic from 'next/dynamic';

// 動態導入 Markdown 編輯器，避免 SSR 問題
const MarkdownEditor = dynamic(() => import('../../../components/MarkdownEditor'), {
  ssr: false,
  loading: () => <p>載入編輯器中...</p>
});

export default function CreateCourse() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState([]);
  const [prerequisites, setPrerequisites] = useState([]);
  const [newPrerequisite, setNewPrerequisite] = useState('');
  const [courseData, setCourseData] = useState({
    title: '',
    slug: '',
    description: '',
    categoryId: '',
    price: 0,
    originalPrice: 0,
    level: 'beginner',
    status: 'draft',
    featured: false,
    prerequisites: [],
    whyTakeThisCourse: '',
    difficulty: 3,
    language: '中文'
  });
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const fileInputRef = useRef(null);

  // 檢查用戶是否有管理員權限
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/admin/courses/create');
        return;
      }
      
      if (user && user.role !== 'admin' && user.role !== 'instructor') {
        router.push('/dashboard');
        return;
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  // 獲取分類和前置知識
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesData, prerequisitesData] = await Promise.all([
          getCategories(),
          getPrerequisites()
        ]);
        setCategories(categoriesData);
        setPrerequisites(prerequisitesData);
      } catch (error) {
        console.error('獲取數據失敗:', error);
        setError('無法載入必要數據，請稍後再試');
      }
    };

    fetchData();
  }, []);

  // 處理表單輸入變化
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCourseData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 自動生成 slug
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // 處理標題變更時自動生成 slug
  const handleTitleChange = (e) => {
    const title = e.target.value;
    setCourseData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }));
  };

  // 處理縮略圖選擇
  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnail(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 處理前置知識變更
  const handlePrerequisiteChange = (prerequisiteId) => {
    setCourseData(prev => {
      // 確保 prerequisites 是一個數組
      const currentPrerequisites = Array.isArray(prev.prerequisites) ? prev.prerequisites : [];
      const isSelected = currentPrerequisites.includes(prerequisiteId);
      
      if (isSelected) {
        return {
          ...prev,
          prerequisites: currentPrerequisites.filter(id => id !== prerequisiteId)
        };
      } else {
        return {
          ...prev,
          prerequisites: [...currentPrerequisites, prerequisiteId]
        };
      }
    });
  };

  // 添加前置知識
  const handleAddPrerequisite = async () => {
    if (!newPrerequisite.trim()) return;
    
    try {
      const newItem = await createPrerequisite(newPrerequisite.trim());
      setPrerequisites(prev => [...prev, newItem]);
      setCourseData(prev => {
        // 確保 prerequisites 是一個數組
        const currentPrerequisites = Array.isArray(prev.prerequisites) ? prev.prerequisites : [];
        return {
          ...prev,
          prerequisites: [...currentPrerequisites, newItem.id]
        };
      });
      setNewPrerequisite('');
    } catch (error) {
      console.error('添加前置知識失敗:', error);
      alert('添加前置知識失敗，請稍後再試');
    }
  };

  // 處理表單提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!courseData.title) {
      setError('請輸入課程標題');
      return;
    }
    
    if (!courseData.description) {
      setError('請輸入課程描述');
      return;
    }
    
    if (!courseData.categoryId) {
      setError('請選擇課程分類');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 準備課程數據，確保所有字段都有有效值
      const coursePayload = {
        title: courseData.title,
        slug: courseData.slug || generateSlug(courseData.title),
        description: courseData.description,
        categoryId: courseData.categoryId,
        level: courseData.level || 'beginner',
        difficulty: Number(courseData.difficulty) || 3,
        language: courseData.language || '中文',
        price: Number(courseData.price) || 0,
        originalPrice: Number(courseData.originalPrice) || 0,
        status: courseData.status || 'draft',
        featured: Boolean(courseData.featured),
        whyTakeThisCourse: courseData.whyTakeThisCourse || '',
        prerequisites: Array.isArray(courseData.prerequisites) ? courseData.prerequisites : [],
        instructorId: user.uid
      };
      
      // 創建課程
      const newCourse = await createCourse(coursePayload);
      
      // 如果有縮略圖，上傳縮略圖
      if (thumbnail) {
        const thumbnailUrl = await uploadCourseThumbnail(newCourse.id, thumbnail);
        
        // 更新課程縮略圖
        await updateDoc(doc(db, 'courses', newCourse.id), {
          thumbnail: thumbnailUrl
        });
      }
      
      setSuccess(true);
      
      // 跳轉到課程內容管理頁面
      router.push(`/admin/courses/content?id=${newCourse.id}`);
    } catch (error) {
      console.error('創建課程失敗:', error);
      setError('創建課程失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <AdminLayout title="創建課程">
      <div className="admin-header">
        <h1>創建新課程</h1>
        <p>填寫以下信息創建新課程</p>
      </div>
      
      <div className="admin-card">
        <form onSubmit={handleSubmit} className="course-form">
          {error && (
            <div className="error-message">
              <i className="ri-error-warning-line"></i>
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="success-message">
              <i className="ri-check-line"></i>
              <span>課程創建成功！正在跳轉到課程內容管理頁面...</span>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="title">課程標題 *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={courseData.title}
              onChange={handleTitleChange}
              placeholder="輸入課程標題"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="slug">課程 Slug *</label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={courseData.slug}
              onChange={handleInputChange}
              placeholder="輸入課程 Slug (URL 友好名稱)"
              required
            />
            <small>用於 URL，只能包含小寫字母、數字和連字符</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="description">課程描述 *</label>
            <textarea
              id="description"
              name="description"
              value={courseData.description}
              onChange={handleInputChange}
              placeholder="輸入課程描述"
              rows="5"
              required
            ></textarea>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="categoryId">課程分類 *</label>
              <select
                id="categoryId"
                name="categoryId"
                value={courseData.categoryId}
                onChange={handleInputChange}
                required
              >
                <option value="">選擇分類</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="level">難度等級</label>
              <select
                id="level"
                name="level"
                value={courseData.level}
                onChange={handleInputChange}
              >
                <option value="beginner">初學者</option>
                <option value="intermediate">中級</option>
                <option value="advanced">高級</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">價格</label>
              <input
                type="number"
                id="price"
                name="price"
                value={courseData.price}
                onChange={handleInputChange}
                min="0"
                step="1"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="originalPrice">原價</label>
              <input
                type="number"
                id="originalPrice"
                name="originalPrice"
                value={courseData.originalPrice}
                onChange={handleInputChange}
                min="0"
                step="1"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">狀態</label>
              <select
                id="status"
                name="status"
                value={courseData.status}
                onChange={handleInputChange}
              >
                <option value="draft">草稿</option>
                <option value="published">已發布</option>
                <option value="review">審核中</option>
              </select>
            </div>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="featured"
                  checked={courseData.featured}
                  onChange={handleInputChange}
                />
                <span>設為推薦課程</span>
              </label>
            </div>
          </div>
          
          <div className="form-group">
            <label>課程縮略圖</label>
            <div className="thumbnail-upload">
              <div 
                className="thumbnail-preview"
                onClick={() => fileInputRef.current.click()}
              >
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="課程縮略圖預覽" />
                ) : (
                  <div className="upload-placeholder">
                    <i className="ri-image-add-line"></i>
                    <span>點擊上傳縮略圖</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleThumbnailChange}
                style={{ display: 'none' }}
              />
              <div className="thumbnail-info">
                <p>推薦尺寸: 1280 x 720 像素</p>
                <p>最大文件大小: 2MB</p>
                <p>支持格式: JPG, PNG</p>
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label>前置知識</label>
            <div className="prerequisites-container">
              <div className="prerequisites-list">
                {prerequisites.map(item => (
                  <div key={item.id} className="prerequisite-item">
                    <input
                      type="checkbox"
                      id={`prerequisite-${item.id}`}
                      checked={Array.isArray(courseData.prerequisites) && courseData.prerequisites.includes(item.id)}
                      onChange={() => handlePrerequisiteChange(item.id)}
                    />
                    <label htmlFor={`prerequisite-${item.id}`}>{item.name}</label>
                  </div>
                ))}
              </div>
              
              <div className="add-prerequisite">
                <input
                  type="text"
                  value={newPrerequisite}
                  onChange={(e) => setNewPrerequisite(e.target.value)}
                  placeholder="新增前置知識"
                />
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={handleAddPrerequisite}
                >
                  新增
                </button>
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label>為什麼要上這門課？</label>
            <MarkdownEditor
              value={courseData.whyTakeThisCourse}
              onChange={(value) => handleInputChange({ target: { name: 'whyTakeThisCourse', value } })}
              placeholder="使用 Markdown 格式描述學生為什麼應該選擇這門課程"
            />
            <small>支持 Markdown 格式，可以添加標題、列表、引用等</small>
          </div>
          
          <div className="form-actions">
            <Link href="/admin/courses" className="btn-secondary">
              取消
            </Link>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? '創建中...' : '創建課程'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
} 