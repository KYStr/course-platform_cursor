import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getFeaturedCourses, getLatestCourses, getCategories } from '../api/courses';
import MainLayout from '../components/layout/MainLayout';

// 首頁組件
export default function HomePage() {
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [latestCourses, setLatestCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 獲取首頁所需數據
    const fetchData = async () => {
      try {
        const [featuredData, latestData, categoriesData] = await Promise.all([
          getFeaturedCourses(),
          getLatestCourses(),
          getCategories()
        ]);
        
        setFeaturedCourses(featuredData);
        setLatestCourses(latestData);
        setCategories(categoriesData);
        setLoading(false);
      } catch (error) {
        console.error('獲取首頁數據失敗:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      <Head>
        <title>知識課堂 - 高品質線上學習平台</title>
        <meta name="description" content="提供專業的線上課程，隨時隨地學習新技能" />
      </Head>

      {/* 英雄區塊 */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h2>提升你的技能，開啟新的可能</h2>
            <p>高品質視頻課程，隨時隨地學習</p>
            <Link href="/courses">
              <button className="btn-primary">開始學習</button>
            </Link>
          </div>
          <div className="hero-image">
            {/* 主視覺圖片 */}
            <img src="/images/hero-image.svg" alt="線上學習" />
          </div>
        </div>
      </section>

      {/* 推薦課程區塊 */}
      <section className="featured-courses">
        <div className="container">
          <h2 className="section-title">推薦課程</h2>
          <div className="course-cards">
            {loading ? (
              <p>載入中...</p>
            ) : (
              featuredCourses.map(course => (
                <CourseCard key={course.id} course={course} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* 課程分類區塊 */}
      <section className="categories">
        <div className="container">
          <h2 className="section-title">課程分類</h2>
          <div className="category-grid">
            {loading ? (
              <p>載入中...</p>
            ) : (
              categories.map(category => (
                <CategoryCard key={category.id} category={category} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* 最新上線區塊 */}
      <section className="latest-courses">
        <div className="container">
          <h2 className="section-title">最新上線</h2>
          <div className="course-cards">
            {loading ? (
              <p>載入中...</p>
            ) : (
              latestCourses.map(course => (
                <CourseCard key={course.id} course={course} />
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}

// 課程卡片組件
function CourseCard({ course }) {
  return (
    <div className="course-card">
      <div className="course-image">
        <img src={course.thumbnail} alt={course.title} />
      </div>
      <div className="course-info">
        <div className="course-category">{course.category}</div>
        <h3 className="course-title">{course.title}</h3>
        <div className="course-instructor">
          <img src={course.instructor.avatar} alt={course.instructor.name} />
          <span>{course.instructor.name}</span>
        </div>
        <div className="course-meta">
          <div className="course-rating">
            <i className="ri-star-fill"></i>
            <span>{course.rating}</span>
          </div>
          <div className="course-duration">
            <i className="ri-time-line"></i>
            <span>{course.duration}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 分類卡片組件
function CategoryCard({ category }) {
  return (
    <Link href={`/courses?category=${category.slug}`}>
      <div className="category-card">
        <div className="category-icon">
          <i className={category.icon}></i>
        </div>
        <h3 className="category-name">{category.name}</h3>
        <div className="category-count">{category.courseCount} 門課程</div>
      </div>
    </Link>
  );
}

// 重要：添加這個 getLayout 函數
HomePage.getLayout = function getLayout(page) {
  return <MainLayout>{page}</MainLayout>;
}; 