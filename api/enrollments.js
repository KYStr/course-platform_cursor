import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  limit, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// 檢查用戶是否已報名課程
export const checkEnrollment = async (userId, courseId) => {
  try {
    if (!userId || !courseId) return false;
    
    const enrollmentQuery = query(
      collection(db, 'enrollments'),
      where('userId', '==', userId),
      where('courseId', '==', courseId),
      limit(1)
    );
    
    const enrollmentSnapshot = await getDocs(enrollmentQuery);
    return !enrollmentSnapshot.empty;
  } catch (error) {
    console.error('檢查報名狀態失敗:', error);
    return false;
  }
};

// 報名課程
export const enrollCourse = async (userId, courseId) => {
  try {
    if (!userId || !courseId) {
      throw new Error('用戶ID和課程ID不能為空');
    }
    
    // 檢查用戶是否已經報名
    const isEnrolled = await checkEnrollment(userId, courseId);
    
    // 如果用戶已經報名，直接返回
    if (isEnrolled) {
      return { success: true, message: '您已經報名過此課程' };
    }
    
    // 創建新的報名記錄
    const enrollmentData = {
      userId,
      courseId,
      enrolledAt: serverTimestamp(),
      progress: 0,
      completedVideos: [],
      lastAccessedAt: serverTimestamp()
    };
    
    const enrollmentRef = await addDoc(collection(db, 'enrollments'), enrollmentData);
    
    // 更新課程的學生數量
    const courseRef = doc(db, 'courses', courseId);
    const courseDoc = await getDoc(courseRef);
    
    if (courseDoc.exists()) {
      await updateDoc(courseRef, {
        studentsCount: (courseDoc.data().studentsCount || 0) + 1
      });
    }
    
    return { 
      success: true, 
      message: '報名成功',
      enrollmentId: enrollmentRef.id
    };
  } catch (error) {
    console.error('報名課程失敗:', error);
    throw error;
  }
};

// 獲取用戶已報名的所有課程
export const getUserEnrollments = async (userId) => {
  try {
    if (!userId) return [];
    
    const enrollmentsQuery = query(
      collection(db, 'enrollments'),
      where('userId', '==', userId),
      orderBy('enrolledAt', 'desc')
    );
    
    const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
    
    // 獲取每個報名對應的課程詳情
    const enrollments = await Promise.all(
      enrollmentsSnapshot.docs.map(async (docSnapshot) => {
        const enrollmentData = docSnapshot.data();
        
        // 獲取課程詳情
        const courseRef = doc(db, 'courses', enrollmentData.courseId);
        const courseDoc = await getDoc(courseRef);
        
        if (!courseDoc.exists()) {
          return null; // 課程不存在
        }
        
        const courseData = courseDoc.data();
        
        // 獲取講師信息
        let instructorData = { name: '未知講師', avatar: '/images/avatar-placeholder.webp' };
        if (courseData.instructorId) {
          const instructorDoc = await getDoc(doc(db, 'users', courseData.instructorId));
          if (instructorDoc.exists()) {
            instructorData = {
              id: instructorDoc.id,
              name: instructorDoc.data().displayName || '未知講師',
              avatar: instructorDoc.data().photoURL || '/images/avatar-placeholder.webp'
            };
          }
        }
        
        return {
          id: docSnapshot.id,
          ...enrollmentData,
          course: {
            id: courseDoc.id,
            ...courseData,
            instructor: instructorData
          }
        };
      })
    );
    
    // 過濾掉不存在的課程
    return enrollments.filter(enrollment => enrollment !== null);
  } catch (error) {
    console.error('獲取用戶報名課程失敗:', error);
    throw error;
  }
};

// 更新學習進度
export const updateProgress = async (enrollmentId, progress, completedVideoId = null) => {
  try {
    const enrollmentRef = doc(db, 'enrollments', enrollmentId);
    const enrollmentDoc = await getDoc(enrollmentRef);
    
    if (!enrollmentDoc.exists()) {
      throw new Error('報名記錄不存在');
    }
    
    const updateData = {
      progress,
      lastAccessedAt: serverTimestamp()
    };
    
    // 如果提供了完成的視頻ID，則添加到已完成視頻列表
    if (completedVideoId) {
      const currentData = enrollmentDoc.data();
      const completedVideos = currentData.completedVideos || [];
      
      if (!completedVideos.includes(completedVideoId)) {
        updateData.completedVideos = [...completedVideos, completedVideoId];
      }
    }
    
    await updateDoc(enrollmentRef, updateData);
    
    return { success: true };
  } catch (error) {
    console.error('更新學習進度失敗:', error);
    throw error;
  }
}; 