import Link from 'next/link';

export default function CourseCard({ course }) {
  // 確保所有必要的屬性都存在
  const {
    id,
    slug,
    title = '未命名課程',
    thumbnail = '/images/course-placeholder.jpg',
    instructor = { name: '未知講師' },
    rating = 0,
    studentsCount = 0,
    lessonsCount = 0,
    price,
    originalPrice
  } = course;

  return (
    <div className="course-card">
      <div className="course-image">
        <Link href={`/course/${slug || id}`}>
          <img 
            src={thumbnail || '/images/course-placeholder.jpg'} 
            alt={title} 
            loading="lazy"
          />
        </Link>
      </div>
      <div className="course-content">
        <h3 className="course-title">
          <Link href={`/course/${slug || id}`}>
            {title}
          </Link>
        </h3>
        <p className="course-instructor">
          {instructor?.name || '未知講師'}
        </p>
        <div className="course-meta">
          <span className="course-rating">
            <i className="ri-star-fill"></i>
            {rating.toFixed(1)}
          </span>
          <span className="course-students">
            <i className="ri-user-line"></i>
            {studentsCount} 學生
          </span>
          <span className="course-lessons">
            <i className="ri-video-line"></i>
            {lessonsCount} 課時
          </span>
        </div>
        <div className="course-price">
          {price ? (
            <>
              <span className="price">NT$ {price}</span>
              {originalPrice && (
                <span className="original-price">NT$ {originalPrice}</span>
              )}
            </>
          ) : (
            <span className="price free">免費</span>
          )}
        </div>
      </div>
    </div>
  );
} 