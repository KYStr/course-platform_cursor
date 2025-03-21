import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase 配置
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// 初始化 Analytics (僅在瀏覽器環境中)
let analytics = null;
if (typeof window !== 'undefined') {
  // 檢查是否支持 Analytics
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  });
}

// Google 登入函數
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // 檢查用戶是否已存在於 Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    // 如果用戶不存在，創建新用戶文檔
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        role: 'student',
        createdAt: new Date().toISOString()
      });
    }
    
    return user;
  } catch (error) {
    console.error('Google 登入失敗:', error);
    throw error;
  }
};

// 身份驗證函數
export const loginWithEmail = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = async (email, password, userData) => {
  // 創建認證用戶
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // 在 Firestore 中創建用戶文檔
  const userRef = doc(db, 'users', user.uid);
  
  // 使用 setDoc 而不是 updateDoc，因為文檔可能不存在
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    displayName: userData?.displayName || '',
    photoURL: userData?.photoURL || '',
    role: 'student',
    createdAt: new Date().toISOString(),
    ...userData
  });
  
  return user;
};
 
export const logout = () => {
  return signOut(auth);
};

// 用戶數據函數
export const getUserProfile = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error('獲取用戶資料失敗:', error);
    return null;
  }
};

export const updateUserProfile = async (userId, data) => {
  await updateDoc(doc(db, 'users', userId), data);
};

// 課程數據函數
export const getCourses = async () => {
  const coursesSnapshot = await getDocs(collection(db, 'courses'));
  return coursesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const getCourseById = async (courseId) => {
  const courseDoc = await getDoc(doc(db, 'courses', courseId));
  if (!courseDoc.exists()) {
    throw new Error('課程不存在');
  }
  return {
    id: courseDoc.id,
    ...courseDoc.data()
  };
};

// 學習進度函數
export const getUserProgress = async (userId, courseId) => {
  const progressQuery = query(
    collection(db, 'progress'),
    where('userId', '==', userId),
    where('courseId', '==', courseId)
  );
  
  const progressSnapshot = await getDocs(progressQuery);
  return progressSnapshot.docs.map(doc => doc.data());
};

export const markVideoComplete = async (userId, courseId, videoId) => {
  const progressRef = doc(db, 'progress', `${userId}_${courseId}_${videoId}`);
  await setDoc(progressRef, {
    userId,
    courseId,
    videoId,
    completed: true,
    completedAt: new Date().toISOString()
  });
};

// 筆記函數
export const getUserNotes = async (userId, courseId) => {
  const notesQuery = query(
    collection(db, 'notes'),
    where('userId', '==', userId),
    where('courseId', '==', courseId)
  );
  
  const notesSnapshot = await getDocs(notesQuery);
  return notesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const saveNote = async (noteData) => {
  const noteRef = doc(collection(db, 'notes'));
  await setDoc(noteRef, {
    ...noteData,
    createdAt: new Date().toISOString()
  });
  
  return {
    id: noteRef.id,
    ...noteData,
    createdAt: new Date().toISOString()
  };
};

// 文件上傳函數
export const uploadFile = async (file, path) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export { db, storage, auth, analytics }; 