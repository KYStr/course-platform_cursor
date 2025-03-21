import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CourseContentRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    if (!router.isReady) return;
    
    const { id } = router.query;
    if (id) {
      router.replace(`/admin/courses/content?id=${id}`);
    } else {
      router.replace('/admin/courses');
    }
  }, [router.isReady, router.query]);
  
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>重定向中...</p>
    </div>
  );
} 