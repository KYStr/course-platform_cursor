import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import CourseCard from '../../components/CourseCard';
import { getAllCourses, getCategories } from '../../api/courses';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const router = useRouter();
  const { search, category } = router.query;
  
  // 獲取課程和分類
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [coursesData, categoriesData] = await Promise.all([
          getAllCourses(),
          getCategories()
        ]);
        
        setCourses(coursesData);
        setCategories(categoriesData);
        setError(null);
        
        // 如果URL中有分類參數，設置選中的分類
        if (category) {
          setSelectedCategory(category);
        }
      } catch (error) {
        console.error('獲取數據失敗:', error);
        setError('無法載入數據，請稍後再試');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [category]);
  
  // 過濾和排序課程
  useEffect(() => {
    if (!courses.length) return;
    
    let filtered = [...courses];
    
    // 按搜索詞過濾
    if (search) {
      const searchTerm = search.toLowerCase();
      filtered = filtered.filter(course => 
        course.title?.toLowerCase().includes(searchTerm) || 
        course.description?.toLowerCase().includes(searchTerm) ||
        (course.instructor && course.instructor.name?.toLowerCase().includes(searchTerm))
      );
    }
    
    // 按分類過濾
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(course => course.categoryId === selectedCategory);
    }
    
    // 排序
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'popular':
        filtered.sort((a, b) => (b.studentsCount || 0) - (a.studentsCount || 0));
        break;
      case 'price-low':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        break;
    }
    
    setFilteredCourses(filtered);
  }, [courses, search, selectedCategory, sortBy]);
  
  // 處理分類變更
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    
    // 更新URL，但不重新加載頁面
    const query = { ...router.query };
    if (categoryId === 'all') {
      delete query.category;
    } else {
      query.category = categoryId;
    }
    
    router.push({
      pathname: router.pathname,
      query
    }, undefined, { shallow: true });
  };
  
  // 處理排序變更
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };
  
  return (
    <Layout title="所有課程">
      <Head>
        <title>所有課程 | 學習平台</title>
      </Head>
      
      <div className="courses-header">
        <div className="container">
          <h1>探索課程</h1>
          {search && (
            <p className="search-results">
              搜尋「{search}」的結果：找到 {filteredCourses.length} 個課程
            </p>
          )}
        </div>
      </div>
      
      <div className="courses-container container">
        {/* 過濾和排序控件 */}
        <div className="courses-filters">
          <div className="categories-filter">
            <span className="filter-label">分類：</span>
            <div className="categories-buttons">
              <button 
                className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('all')}
              >
                全部
              </button>
              {categories.map(category => (
                <button 
                  key={category.id}
                  className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="sort-filter">
            <label htmlFor="sort-select" className="filter-label">排序：</label>
            <select 
              id="sort-select" 
              value={sortBy}
              onChange={handleSortChange}
              className="sort-select"
            >
              <option value="newest">最新上架</option>
              <option value="popular">最受歡迎</option>
              <option value="rating">評分最高</option>
              <option value="price-low">價格由低到高</option>
              <option value="price-high">價格由高到低</option>
            </select>
          </div>
        </div>
        
        {/* 課程列表 */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>載入課程中...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <i className="ri-error-warning-line"></i>
            <p>{error}</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="no-courses">
            {search || selectedCategory !== 'all' ? (
              <>
                <i className="ri-search-line"></i>
                <h2>沒有找到相關課程</h2>
                <p>嘗試使用不同的搜尋條件，或者瀏覽我們的所有課程</p>
                <Link href="/courses" className="btn-primary">
                  查看所有課程
                </Link>
              </>
            ) : (
              <>
                <i className="ri-book-line"></i>
                <h2>暫無課程</h2>
                <p>我們正在努力添加新課程，請稍後再來查看</p>
              </>
            )}
          </div>
        ) : (
          <div className="courses-grid">
            {filteredCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
} 