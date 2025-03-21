import { db, storage } from '../lib/firebase';
import { 
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, setDoc, serverTimestamp, deleteObject
} from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { getVimeoVideoInfo } from '../lib/vimeo';

// 獲取推薦課程
export const getFeaturedCourses = async () => {
  const q = query(
    collection(db, 'courses'),
    where('featured', '==', true),
    limit(6)
  );
  
  const snapshot = await getDocs(q);
  return Promise.all(snapshot.docs.map(async (docSnapshot) => {
    const data = docSnapshot.data();
    // 獲取講師信息
    const instructorDoc = await getDoc(doc(db, 'users', data.instructorId));
    
    return {
      id: docSnapshot.id,
      ...data,
      instructor: instructorDoc.exists() ? {
        id: instructorDoc.id,
        name: instructorDoc.data().displayName,
        avatar: instructorDoc.data().photoURL
      } : {
        name: '未知講師',
        avatar: '/images/avatar-placeholder.webp'
      }
    };
  }));
};

// 獲取所有課程 (優化版本，減少數據量)
export const getAllCourses = async () => {
  try {
    const coursesQuery = query(
      collection(db, 'courses'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(coursesQuery);
    
    return Promise.all(snapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      
      // 只獲取必要的課程數據
      const courseData = {
        id: docSnapshot.id,
        title: data.title,
        description: data.description?.substring(0, 150) || '', // 限制描述長度
        thumbnail: data.thumbnail,
        price: data.price,
        originalPrice: data.originalPrice,
        rating: data.rating || 0,
        studentsCount: data.studentsCount || 0,
        categoryId: data.categoryId,
        level: data.level,
        featured: data.featured,
        slug: data.slug || docSnapshot.id // 確保有 slug，如果沒有則使用 id
      };
      
      // 獲取講師信息
      let instructorData = { name: '未知講師', avatar: '/images/avatar-placeholder.webp' };
      if (data.instructorId) {
        const instructorDoc = await getDoc(doc(db, 'users', data.instructorId));
        if (instructorDoc.exists()) {
          instructorData = {
            id: instructorDoc.id,
            name: instructorDoc.data().displayName || '未知講師',
            avatar: instructorDoc.data().photoURL || '/images/avatar-placeholder.webp'
          };
        }
      }
      
      // 獲取課程的章節和視頻數量 (簡化版本)
      let lessonsCount = 0;
      try {
        const sectionsQuery = query(collection(db, 'courses', docSnapshot.id, 'sections'));
        const sectionsSnapshot = await getDocs(sectionsQuery);
        
        const countPromises = sectionsSnapshot.docs.map(async (sectionDoc) => {
          const videosQuery = query(collection(db, 'courses', docSnapshot.id, 'sections', sectionDoc.id, 'videos'));
          const videosSnapshot = await getDocs(videosQuery);
          return videosSnapshot.size;
        });
        
        const counts = await Promise.all(countPromises);
        lessonsCount = counts.reduce((total, count) => total + count, 0);
      } catch (err) {
        console.error('獲取課時數量失敗:', err);
      }
      
      return {
        ...courseData,
        instructor: instructorData,
        lessonsCount
      };
    }));
  } catch (error) {
    console.error('獲取所有課程失敗:', error);
    throw error;
  }
};

// 獲取課程詳情
export const getCourseById = async (courseId) => {
  try {
    const courseDoc = await getDoc(doc(db, 'courses', courseId));
    
    if (!courseDoc.exists()) {
      throw new Error('課程不存在');
    }
    
    const courseData = courseDoc.data();
    
    // 獲取講師信息
    let instructorData = { name: '未知講師', avatar: '/images/avatar-placeholder.webp' };
    if (courseData.instructorId) {
      const instructorDoc = await getDoc(doc(db, 'users', courseData.instructorId));
      if (instructorDoc.exists()) {
        instructorData = {
          id: instructorDoc.id,
          ...instructorDoc.data(),
          name: instructorDoc.data().displayName || '未知講師',
          avatar: instructorDoc.data().photoURL || '/images/avatar-placeholder.webp'
        };
      }
    }
    
    // 獲取課程章節和視頻 (使用子集合)
    const sectionsQuery = query(
      collection(db, 'courses', courseId, 'sections'),
      orderBy('order', 'asc')
    );
    const sectionsSnapshot = await getDocs(sectionsQuery);
    
    const sectionsPromises = sectionsSnapshot.docs.map(async (sectionDoc) => {
      const sectionData = sectionDoc.data();
      
      // 獲取章節下的視頻
      const videosQuery = query(
        collection(db, 'courses', courseId, 'sections', sectionDoc.id, 'videos'),
        orderBy('order', 'asc')
      );
      const videosSnapshot = await getDocs(videosQuery);
      
      const videos = videosSnapshot.docs.map(videoDoc => ({
        id: videoDoc.id,
        ...videoDoc.data()
      }));
      
      return {
        id: sectionDoc.id,
        ...sectionData,
        videos
      };
    });
    
    const sections = await Promise.all(sectionsPromises);
    
    // 計算總課時數
    const lessonsCount = sections.reduce((total, section) => total + section.videos.length, 0);
    
    return {
      id: courseDoc.id,
      ...courseData,
      instructor: instructorData,
      sections,
      lessonsCount
    };
  } catch (error) {
    console.error('獲取課程詳情失敗:', error);
    throw error;
  }
};

// 獲取視頻詳情
export const getVideoById = async (videoId) => {
  try {
    const videoDoc = await getDoc(doc(db, 'videos', videoId));
    
    if (!videoDoc.exists()) {
      throw new Error('視頻不存在');
    }
    
    const videoData = videoDoc.data();
    
    // 獲取視頻所屬的章節信息
    let sectionData = null;
    if (videoData.sectionId) {
      try {
        const sectionDoc = await getDoc(doc(db, 'sections', videoData.sectionId));
        if (sectionDoc.exists()) {
          sectionData = {
            id: sectionDoc.id,
            title: sectionDoc.data().title || '未知章節'
          };
        }
      } catch (error) {
        console.error('獲取章節信息失敗:', error);
      }
    }
    
    // 如果沒有 vimeoId，添加一個默認值或錯誤信息
    if (!videoData.vimeoId) {
      console.warn('視頻缺少 vimeoId:', videoId);
      videoData.vimeoId = '76979871'; // 使用一個默認的 Vimeo 視頻 ID
    }
    
    return {
      id: videoDoc.id,
      ...videoData,
      section: sectionData || { title: '未知章節' },
      // 確保有默認值
      title: videoData.title || '未命名視頻',
      description: videoData.description || '',
      duration: videoData.duration || '00:00'
    };
  } catch (error) {
    console.error('獲取視頻失敗:', error);
    throw error;
  }
};

// 更新用戶課程進度
export const updateCourseProgress = async (userId, courseId) => {
  // 獲取用戶在該課程的所有進度記錄
  const progressQuery = query(
    collection(db, 'progress'),
    where('userId', '==', userId),
    where('courseId', '==', courseId)
  );
  
  const progressSnapshot = await getDocs(progressQuery);
  const completedVideoIds = progressSnapshot.docs
    .filter(doc => doc.data().completed)
    .map(doc => doc.data().videoId);
  
  // 獲取課程信息
  const course = await getCourseById(courseId);
  
  // 更新每個視頻的完成狀態
  course.sections.forEach(section => {
    section.videos.forEach(video => {
      video.completed = completedVideoIds.includes(video.id);
    });
  });
  
  // 更新完成視頻數量
  course.completedVideos = completedVideoIds.length;
  
  return course;
};

// 搜索課程
export const searchCourses = async (query) => {
  if (!query || query.trim() === '') {
    return [];
  }
  
  const q = query.toLowerCase();
  
  // 由於Firestore不支持全文搜索，這裡我們獲取所有課程然後在客戶端過濾
  // 在實際應用中，應考慮使用專門的搜索服務如Algolia
  const coursesSnapshot = await getDocs(collection(db, 'courses'));
  
  const matchedCourses = [];
  
  for (const doc of coursesSnapshot.docs) {
    const data = doc.data();
    
    // 檢查標題、描述和標籤是否包含搜索詞
    if (
      data.title.toLowerCase().includes(q) ||
      data.description.toLowerCase().includes(q) ||
      (data.tags && data.tags.some(tag => tag.toLowerCase().includes(q)))
    ) {
      // 獲取講師信息
      const instructorDoc = await getDoc(doc(db, 'users', data.instructorId));
      
      matchedCourses.push({
        id: doc.id,
        ...data,
        instructor: instructorDoc.exists() ? {
          id: instructorDoc.id,
          name: instructorDoc.data().displayName,
          avatar: instructorDoc.data().photoURL
        } : {
          name: '未知講師',
          avatar: '/images/avatar-placeholder.png'
        }
      });
    }
  }
  
  return matchedCourses;
};

// 獲取用戶已購課程
export const getUserCourses = async (userId) => {
  const enrollmentsQuery = query(
    collection(db, 'enrollments'),
    where('userId', '==', userId)
  );
  
  const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
  
  return Promise.all(enrollmentsSnapshot.docs.map(async (doc) => {
    const data = doc.data();
    const courseDoc = await getDoc(doc(db, 'courses', data.courseId));
    
    if (!courseDoc.exists()) {
      return null;
    }
    
    const courseData = courseDoc.data();
    
    // 獲取講師信息
    const instructorDoc = await getDoc(doc(db, 'users', courseData.instructorId));
    
    // 獲取用戶進度
    const progressQuery = query(
      collection(db, 'progress'),
      where('userId', '==', userId),
      where('courseId', '==', data.courseId),
      where('completed', '==', true)
    );
    
    const progressSnapshot = await getDocs(progressQuery);
    const completedCount = progressSnapshot.size;
    
    return {
      id: courseDoc.id,
      ...courseData,
      enrolledAt: data.enrolledAt,
      instructor: instructorDoc.exists() ? {
        id: instructorDoc.id,
        name: instructorDoc.data().displayName,
        avatar: instructorDoc.data().photoURL
      } : {
        name: '未知講師',
        avatar: '/images/avatar-placeholder.png'
      },
      progress: {
        completedVideos: completedCount,
        totalVideos: courseData.totalVideos || 0,
        percentage: courseData.totalVideos ? Math.floor((completedCount / courseData.totalVideos) * 100) : 0
      }
    };
  })).then(courses => courses.filter(Boolean)); // 過濾掉不存在的課程
};

// 獲取所有課程
export const getCourses = async (filters = {}) => {
  let q = collection(db, 'courses');
  
  // 應用過濾條件
  if (filters.category) {
    q = query(q, where('categoryId', '==', filters.category));
  }
  
  if (filters.level) {
    q = query(q, where('level', '==', filters.level));
  }
  
  // 應用排序
  if (filters.sort) {
    switch (filters.sort) {
      case 'newest':
        q = query(q, orderBy('createdAt', 'desc'));
        break;
      case 'price-low':
        q = query(q, orderBy('price', 'asc'));
        break;
      case 'price-high':
        q = query(q, orderBy('price', 'desc'));
        break;
      case 'rating':
        q = query(q, orderBy('rating', 'desc'));
        break;
      default:
        q = query(q, orderBy('createdAt', 'desc'));
    }
  } else {
    q = query(q, orderBy('createdAt', 'desc'));
  }
  
  const snapshot = await getDocs(q);
  return Promise.all(snapshot.docs.map(async (docSnapshot) => {
    const data = docSnapshot.data();
    // 獲取講師信息
    const instructorDoc = await getDoc(doc(db, 'users', data.instructorId));
    
    return {
      id: docSnapshot.id,
      ...data,
      instructor: instructorDoc.exists() ? {
        id: instructorDoc.id,
        name: instructorDoc.data().displayName,
        avatar: instructorDoc.data().photoURL
      } : {
        name: '未知講師',
        avatar: '/images/avatar-placeholder.webp'
      }
    };
  }));
};

// 根據 slug 獲取課程
export const getCourseBySlug = async (slug) => {
  try {
    const coursesRef = collection(db, 'courses');
    const q = query(coursesRef, where('slug', '==', slug));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error('課程不存在');
    }
    
    const courseDoc = snapshot.docs[0];
    const courseData = {
      id: courseDoc.id,
      ...courseDoc.data()
    };
    
    return courseData;
  } catch (error) {
    console.error('獲取課程失敗:', error);
    throw error;
  }
};

// 報名課程
export const enrollCourse = async (userId, courseId) => {
  try {
    // 檢查用戶是否已經報名
    const enrollmentQuery = query(
      collection(db, 'enrollments'),
      where('userId', '==', userId),
      where('courseId', '==', courseId)
    );
    
    const enrollmentSnapshot = await getDocs(enrollmentQuery);
    
    // 如果用戶已經報名，直接返回
    if (!enrollmentSnapshot.empty) {
      return { success: true, message: '您已經報名過此課程' };
    }
    
    // 創建新的報名記錄
    const enrollmentRef = doc(collection(db, 'enrollments'));
    await setDoc(enrollmentRef, {
      id: enrollmentRef.id,
      userId,
      courseId,
      enrolledAt: new Date().toISOString(),
      progress: 0,
      completedVideos: [],
      lastAccessedAt: new Date().toISOString()
    });
    
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

// 檢查用戶是否已報名課程
export const checkEnrollment = async (userId, courseId) => {
  try {
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

// 獲取熱門課程
export const getPopularCourses = async (limit = 6) => {
  try {
    const coursesQuery = query(
      collection(db, 'courses'),
      orderBy('studentsCount', 'desc'),
      limit(limit)
    );
    
    const snapshot = await getDocs(coursesQuery);
    
    return Promise.all(snapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      
      // 獲取講師信息
      let instructorData = { name: '未知講師', avatar: '/images/avatar-placeholder.webp' };
      if (data.instructorId) {
        const instructorDoc = await getDoc(doc(db, 'users', data.instructorId));
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
        ...data,
        instructor: instructorData
      };
    }));
  } catch (error) {
    console.error('獲取熱門課程失敗:', error);
    throw error;
  }
};

// 獲取最新課程 (已優化版本)
export const getLatestCourses = async (limit = 6) => {
  try {
    const coursesQuery = query(
      collection(db, 'courses'),
      orderBy('createdAt', 'desc'),
      limit(limit)
    );
    
    const snapshot = await getDocs(coursesQuery);
    
    return Promise.all(snapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      
      // 獲取講師信息
      let instructorData = { name: '未知講師', avatar: '/images/avatar-placeholder.webp' };
      if (data.instructorId) {
        const instructorDoc = await getDoc(doc(db, 'users', data.instructorId));
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
        ...data,
        instructor: instructorData
      };
    }));
  } catch (error) {
    console.error('獲取最新課程失敗:', error);
    throw error;
  }
};

// 獲取課程分類
export const getCategories = async () => {
  try {
    const categoriesQuery = query(
      collection(db, 'categories'),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(categoriesQuery);
    
    // 獲取每個分類下的課程數量
    return Promise.all(snapshot.docs.map(async (docSnapshot) => {
      const categoryId = docSnapshot.id;
      const categoryData = docSnapshot.data();
      
      // 計算該分類下的課程數量
      const coursesQuery = query(
        collection(db, 'courses'),
        where('categoryId', '==', categoryId)
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      
      return {
        id: categoryId,
        ...categoryData,
        courseCount: coursesSnapshot.size
      };
    }));
  } catch (error) {
    console.error('獲取課程分類失敗:', error);
    throw error;
  }
};

// 創建新課程
export const createCourse = async (courseData) => {
  try {
    // 添加時間戳
    const dataWithTimestamps = {
      ...courseData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // 創建課程文檔
    const courseRef = await addDoc(collection(db, 'courses'), dataWithTimestamps);
    
    return {
      id: courseRef.id,
      ...dataWithTimestamps
    };
  } catch (error) {
    console.error('創建課程失敗:', error);
    throw error;
  }
};

// 更新課程
export const updateCourse = async (courseId, courseData) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    
    // 添加更新時間戳
    const dataWithTimestamps = {
      ...courseData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(courseRef, dataWithTimestamps);
    
    return {
      id: courseId,
      ...dataWithTimestamps
    };
  } catch (error) {
    console.error('更新課程失敗:', error);
    throw error;
  }
};

// 創建章節（作為課程的子集合）
export const createSection = async (courseId, sectionData) => {
  try {
    console.log(`創建章節，課程ID: ${courseId}`, sectionData);
    
    // 確保我們使用正確的路徑創建子集合
    const sectionsCollectionRef = collection(db, 'courses', courseId, 'sections');
    
    // 添加文檔到子集合
    const newSectionRef = await addDoc(sectionsCollectionRef, {
      ...sectionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`章節創建成功，ID: ${newSectionRef.id}`);
    
    return newSectionRef.id;
  } catch (error) {
    console.error('創建章節失敗:', error);
    throw error;
  }
};

// 更新章節
export const updateSection = async (courseId, sectionId, sectionData) => {
  try {
    const sectionRef = doc(db, 'courses', courseId, 'sections', sectionId);
    await updateDoc(sectionRef, {
      ...sectionData,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('更新章節失敗:', error);
    throw error;
  }
};

// 刪除章節
export const deleteSection = async (courseId, sectionId) => {
  try {
    console.log(`刪除章節，課程ID: ${courseId}, 章節ID: ${sectionId}`);
    
    // 首先獲取並刪除該章節下的所有視頻
    const videosRef = collection(db, 'courses', courseId, 'sections', sectionId, 'videos');
    const videosSnapshot = await getDocs(videosRef);
    
    console.log(`找到 ${videosSnapshot.size} 個視頻需要刪除`);
    
    // 批量刪除視頻
    const deletePromises = videosSnapshot.docs.map(videoDoc => {
      console.log(`刪除視頻: ${videoDoc.id}`);
      return deleteDoc(doc(db, 'courses', courseId, 'sections', sectionId, 'videos', videoDoc.id));
    });
    
    await Promise.all(deletePromises);
    console.log('所有視頻已刪除');
    
    // 然後刪除章節本身
    const sectionRef = doc(db, 'courses', courseId, 'sections', sectionId);
    await deleteDoc(sectionRef);
    console.log('章節已刪除');
    
    return true;
  } catch (error) {
    console.error('刪除章節失敗:', error);
    throw error;
  }
};

// 創建視頻（作為章節的子集合）
export const createVideo = async (courseId, sectionId, videoData) => {
  try {
    // 使用 collection() 函數指向子集合的子集合路徑
    const videoRef = collection(db, 'courses', courseId, 'sections', sectionId, 'videos');
    
    // 添加新文檔到子集合
    const docRef = await addDoc(videoRef, {
      ...videoData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('創建視頻失敗:', error);
    throw error;
  }
};

// 更新視頻
export const updateVideo = async (courseId, sectionId, videoId, videoData) => {
  try {
    await updateDoc(doc(db, 'courses', courseId, 'sections', sectionId, 'videos', videoId), {
      ...videoData,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('更新視頻失敗:', error);
    throw error;
  }
};

// 刪除視頻
export const deleteVideo = async (courseId, sectionId, videoId) => {
  try {
    await deleteDoc(doc(db, 'courses', courseId, 'sections', sectionId, 'videos', videoId));
    
    return true;
  } catch (error) {
    console.error('刪除視頻失敗:', error);
    throw error;
  }
};

// 獲取前置知識列表
export const getPrerequisites = async () => {
  try {
    const prerequisitesQuery = query(
      collection(db, 'prerequisites'),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(prerequisitesQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('獲取前置知識列表失敗:', error);
    throw error;
  }
};

// 創建前置知識
export const createPrerequisite = async (name) => {
  try {
    const prerequisiteRef = await addDoc(collection(db, 'prerequisites'), {
      name,
      createdAt: serverTimestamp()
    });
    
    return {
      id: prerequisiteRef.id,
      name
    };
  } catch (error) {
    console.error('創建前置知識失敗:', error);
    throw error;
  }
};

// 刪除課程
export const deleteCourse = async (courseId) => {
  try {
    // 獲取課程下的所有章節
    const sectionsQuery = query(
      collection(db, 'courses', courseId, 'sections')
    );
    
    const sectionsSnapshot = await getDocs(sectionsQuery);
    
    // 刪除每個章節及其視頻
    for (const sectionDoc of sectionsSnapshot.docs) {
      const sectionId = sectionDoc.id;
      
      // 獲取章節下的所有視頻
      const videosQuery = query(
        collection(db, 'courses', courseId, 'sections', sectionId, 'videos')
      );
      
      const videosSnapshot = await getDocs(videosQuery);
      
      // 刪除所有視頻
      for (const videoDoc of videosSnapshot.docs) {
        await deleteDoc(doc(db, 'courses', courseId, 'sections', sectionId, 'videos', videoDoc.id));
      }
      
      // 刪除章節
      await deleteDoc(doc(db, 'courses', courseId, 'sections', sectionId));
    }
    
    // 刪除課程縮略圖
    try {
      const thumbnailRef = ref(storage, `courses/${courseId}/thumbnail`);
      await deleteObject(thumbnailRef);
    } catch (thumbnailError) {
      // 如果縮略圖不存在，忽略錯誤
      console.log('縮略圖可能不存在，繼續刪除課程');
    }
    
    // 刪除課程
    await deleteDoc(doc(db, 'courses', courseId));
    
    return { success: true };
  } catch (error) {
    console.error('刪除課程失敗:', error);
    throw error;
  }
};

// 獲取課程的所有章節
export const getSections = async (courseId) => {
  try {
    console.log(`獲取章節，課程ID: ${courseId}`);
    
    // 明確指定子集合路徑
    const sectionsCollectionRef = collection(db, 'courses', courseId, 'sections');
    const q = query(sectionsCollectionRef, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    const sections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`獲取到 ${sections.length} 個章節`);
    return sections;
  } catch (error) {
    console.error('獲取章節失敗:', error);
    throw error;
  }
};

// 獲取章節的所有視頻
export const getVideos = async (courseId, sectionId) => {
  try {
    const videosQuery = query(
      collection(db, 'courses', courseId, 'sections', sectionId, 'videos'),
      orderBy('order', 'asc')
    );
    
    const videosSnapshot = await getDocs(videosQuery);
    const videos = [];
    
    videosSnapshot.forEach(doc => {
      const videoData = doc.data();
      console.log('Video data from DB:', videoData); // 打印視頻數據
      videos.push({
        id: doc.id,
        ...videoData
      });
    });
    
    return videos;
  } catch (error) {
    console.error('獲取視頻失敗:', error);
    throw error;
  }
}; 