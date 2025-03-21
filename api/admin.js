import { db, storage } from '../firebase/config';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable
} from 'firebase/storage';

// 獲取所有課程
export const getAllCourses = async () => {
  try {
    const coursesQuery = query(
      collection(db, 'courses'),
      orderBy('createdAt', 'desc')
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
    console.error('獲取所有課程失敗:', error);
    throw error;
  }
};

// 創建課程
export const createCourse = async (courseData) => {
  try {
    // 確保所有必要字段都存在
    const coursePayload = {
      ...courseData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      studentsCount: 0,
      rating: 0,
      reviewsCount: 0
    };
    
    // 創建課程文檔
    const courseRef = await addDoc(collection(db, 'courses'), coursePayload);
    
    return {
      id: courseRef.id,
      ...coursePayload
    };
  } catch (error) {
    console.error('創建課程失敗:', error);
    throw error;
  }
};

// 上傳課程縮略圖
export const uploadCourseThumbnail = async (courseId, file) => {
  try {
    // 創建存儲引用
    const storageRef = ref(storage, `courses/${courseId}/thumbnail`);
    
    // 上傳文件
    const snapshot = await uploadBytes(storageRef, file);
    
    // 獲取下載 URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('上傳縮略圖失敗:', error);
    throw error;
  }
};

// 創建章節
export const createSection = async (sectionData) => {
  try {
    const sectionRef = await addDoc(collection(db, 'sections'), {
      ...sectionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return sectionRef.id;
  } catch (error) {
    console.error('創建章節失敗:', error);
    throw error;
  }
};

// 更新章節
export const updateSection = async (sectionId, sectionData) => {
  try {
    await updateDoc(doc(db, 'sections', sectionId), {
      ...sectionData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('更新章節失敗:', error);
    throw error;
  }
};

// 刪除章節
export const deleteSection = async (sectionId) => {
  try {
    // 獲取章節下的所有視頻
    const videosQuery = query(
      collection(db, 'videos'),
      where('sectionId', '==', sectionId)
    );
    
    const videosSnapshot = await getDocs(videosQuery);
    
    // 刪除所有視頻
    for (const videoDoc of videosSnapshot.docs) {
      await deleteVideo(videoDoc.id);
    }
    
    // 刪除章節
    await deleteDoc(doc(db, 'sections', sectionId));
  } catch (error) {
    console.error('刪除章節失敗:', error);
    throw error;
  }
};

// 創建視頻
export const createVideo = async (videoData) => {
  try {
    const videoRef = await addDoc(collection(db, 'videos'), {
      ...videoData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: []
    });
    
    return videoRef.id;
  } catch (error) {
    console.error('創建視頻失敗:', error);
    throw error;
  }
};

// 更新視頻
export const updateVideo = async (videoId, videoData) => {
  try {
    await updateDoc(doc(db, 'videos', videoId), {
      ...videoData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('更新視頻失敗:', error);
    throw error;
  }
};

// 刪除視頻
export const deleteVideo = async (videoId) => {
  try {
    // 獲取視頻數據
    const videoDoc = await getDoc(doc(db, 'videos', videoId));
    
    if (videoDoc.exists()) {
      const videoData = videoDoc.data();
      
      // 刪除視頻附件
      if (videoData.attachments && videoData.attachments.length > 0) {
        for (const attachment of videoData.attachments) {
          try {
            // 從 URL 中提取存儲路徑
            const storagePath = decodeURIComponent(attachment.url.split('/o/')[1].split('?')[0]);
            const attachmentRef = ref(storage, storagePath);
            await deleteObject(attachmentRef);
          } catch (attachmentError) {
            console.error('刪除附件失敗:', attachmentError);
          }
        }
      }
    }
    
    // 刪除視頻文檔
    await deleteDoc(doc(db, 'videos', videoId));
  } catch (error) {
    console.error('刪除視頻失敗:', error);
    throw error;
  }
};

// 上傳視頻到 Vimeo 並自動獲取時長
export const uploadVideo = async (file, courseId, title, description, progressCallback) => {
  try {
    // 創建 FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId);
    formData.append('title', title || '未命名視頻');
    formData.append('description', description || '');

    // 使用 fetch API 上傳
    const response = await fetch('/api/videos/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      // 如果上傳失敗，拋出錯誤
      throw new Error(data.error || '上傳視頻失敗');
    }
    
    // 獲取視頻時長
    try {
      const durationResponse = await fetch(`/api/videos/${data.vimeoId}/duration`);
      const durationData = await durationResponse.json();
      
      return {
        vimeoId: data.vimeoId,
        duration: durationData.duration || '00:00:00',
        durationObject: durationData.durationObject || { hours: 0, minutes: 0, seconds: 0 }
      };
    } catch (durationError) {
      console.error('獲取視頻時長失敗:', durationError);
      return {
        vimeoId: data.vimeoId,
        duration: '00:00:00',
        durationObject: { hours: 0, minutes: 0, seconds: 0 }
      };
    }
  } catch (error) {
    console.error('上傳視頻失敗:', error);
    throw error;
  }
};

// 上傳附件
export const uploadAttachment = async (courseId, videoId, file, name) => {
  try {
    const storageRef = ref(storage, `courses/${courseId}/videos/${videoId}/attachments/${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('上傳附件失敗:', error);
    throw error;
  }
};

// 刪除附件
export const deleteAttachment = async (videoId, attachmentUrl) => {
  try {
    // 從 URL 中提取存儲路徑
    const storagePath = decodeURIComponent(attachmentUrl.split('/o/')[1].split('?')[0]);
    const attachmentRef = ref(storage, storagePath);
    await deleteObject(attachmentRef);
  } catch (error) {
    console.error('刪除附件失敗:', error);
    throw error;
  }
};

// 刪除課程
export const deleteCourse = async (courseId) => {
  try {
    // 獲取課程下的所有章節
    const sectionsQuery = query(
      collection(db, 'sections'),
      where('courseId', '==', courseId)
    );
    
    const sectionsSnapshot = await getDocs(sectionsQuery);
    
    // 刪除所有章節
    for (const sectionDoc of sectionsSnapshot.docs) {
      await deleteSection(sectionDoc.id);
    }
    
    // 刪除課程縮略圖
    try {
      const thumbnailRef = ref(storage, `courses/${courseId}/thumbnail`);
      await deleteObject(thumbnailRef);
    } catch (thumbnailError) {
      console.error('刪除課程縮略圖失敗:', thumbnailError);
    }
    
    // 刪除課程
    await deleteDoc(doc(db, 'courses', courseId));
  } catch (error) {
    console.error('刪除課程失敗:', error);
    throw error;
  }
};

// 獲取所有分類
export async function getCategories() {
  try {
    const categoriesRef = collection(db, 'categories');
    const categoriesQuery = query(categoriesRef, orderBy('name'));
    const snapshot = await getDocs(categoriesQuery);
    
    const categories = [];
    for (const doc of snapshot.docs) {
      // 獲取每個分類下的課程數量
      const coursesQuery = query(
        collection(db, 'courses'),
        where('categoryId', '==', doc.id)
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      
      categories.push({
        id: doc.id,
        ...doc.data(),
        coursesCount: coursesSnapshot.size
      });
    }
    
    return categories;
  } catch (error) {
    console.error('獲取分類失敗:', error);
    throw error;
  }
}

// 創建分類
export async function createCategory(categoryData) {
  try {
    const categoriesRef = collection(db, 'categories');
    const docRef = await addDoc(categoriesRef, {
      name: categoryData.name,
      slug: categoryData.slug,
      createdAt: new Date().toISOString()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('創建分類失敗:', error);
    throw error;
  }
}

// 更新分類
export async function updateCategory(categoryId, categoryData) {
  try {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, {
      name: categoryData.name,
      slug: categoryData.slug,
      updatedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('更新分類失敗:', error);
    throw error;
  }
}

// 刪除分類
export async function deleteCategory(categoryId) {
  try {
    // 檢查是否有課程使用此分類
    const coursesQuery = query(
      collection(db, 'courses'),
      where('categoryId', '==', categoryId)
    );
    const coursesSnapshot = await getDocs(coursesQuery);
    
    if (coursesSnapshot.size > 0) {
      throw new Error('無法刪除分類，因為有課程正在使用此分類');
    }
    
    const categoryRef = doc(db, 'categories', categoryId);
    await deleteDoc(categoryRef);
    
    return true;
  } catch (error) {
    console.error('刪除分類失敗:', error);
    throw error;
  }
}

// 獲取所有用戶
export async function getUsers() {
  try {
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(usersQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt ? new Date(doc.data().createdAt).toISOString().split('T')[0] : '未知'
    }));
  } catch (error) {
    console.error('獲取用戶失敗:', error);
    throw error;
  }
}

// 更新用戶角色
export async function updateUserRole(userId, role) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: role,
      updatedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('更新用戶角色失敗:', error);
    throw error;
  }
}

// 獲取課程詳情
export const getCourseById = async (courseId) => {
  try {
    // 獲取課程基本信息
    const courseDoc = await getDoc(doc(db, 'courses', courseId));
    
    if (!courseDoc.exists()) {
      throw new Error('課程不存在');
    }
    
    const courseData = courseDoc.data();
    
    // 獲取課程章節
    const sectionsQuery = query(
      collection(db, 'sections'),
      where('courseId', '==', courseId),
      orderBy('order')
    );
    
    const sectionsSnapshot = await getDocs(sectionsQuery);
    const sections = [];
    
    for (const sectionDoc of sectionsSnapshot.docs) {
      const sectionData = sectionDoc.data();
      
      // 獲取章節視頻
      const videosQuery = query(
        collection(db, 'videos'),
        where('sectionId', '==', sectionDoc.id),
        orderBy('order')
      );
      
      const videosSnapshot = await getDocs(videosQuery);
      const videos = videosSnapshot.docs.map(videoDoc => ({
        id: videoDoc.id,
        ...videoDoc.data()
      }));
      
      sections.push({
        id: sectionDoc.id,
        ...sectionData,
        videos
      });
    }
    
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
      id: courseDoc.id,
      ...courseData,
      sections,
      instructor: instructorData
    };
  } catch (error) {
    console.error('獲取課程詳情失敗:', error);
    throw error;
  }
};

// 更新課程
export const updateCourse = async (courseId, courseData) => {
  try {
    await updateDoc(doc(db, 'courses', courseId), {
      ...courseData,
      updatedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('更新課程失敗:', error);
    throw error;
  }
};

// 上傳字幕到 Vimeo
export const uploadCaption = async (vimeoId, file, language, name) => {
  try {
    // 創建 FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    formData.append('name', name);

    // 使用 fetch API 上傳
    const response = await fetch(`/api/videos/${vimeoId}/captions`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '上傳字幕失敗');
    }
    
    return data;
  } catch (error) {
    console.error('上傳字幕失敗:', error);
    throw error;
  }
};

// 獲取字幕列表
export const getCaptions = async (vimeoId) => {
  try {
    const response = await fetch(`/api/videos/${vimeoId}/captions/list`);
    
    if (!response.ok) {
      throw new Error('獲取字幕列表失敗');
    }
    
    const data = await response.json();
    return data.captions;
  } catch (error) {
    console.error('獲取字幕列表失敗:', error);
    throw error;
  }
};

// 刪除字幕
export const deleteCaption = async (vimeoId, captionId) => {
  try {
    const response = await fetch(`/api/videos/${vimeoId}/captions/${captionId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('刪除字幕失敗');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('刪除字幕失敗:', error);
    throw error;
  }
};

// 獲取 Vimeo 視頻信息
export const getVimeoVideoInfo = async (videoId) => {
  try {
    // 使用 Vimeo API 獲取視頻信息
    const response = await fetch(`/api/vimeo/info?id=${videoId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('獲取 Vimeo 視頻信息失敗:', error);
    throw error;
  }
}; 