import { createContext, useContext, useState, useEffect } from 'react';
import { auth, getUserProfile, logout as firebaseLogout, db, doc, setDoc } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 用戶已登入，獲取用戶資料
        try {
          const userProfile = await getUserProfile(firebaseUser.uid);
          
          if (!userProfile) {
            // 如果用戶文檔不存在，創建一個基本文檔
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              role: 'student',
              createdAt: new Date().toISOString()
            });
          }
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || userProfile?.displayName || '',
            photoURL: firebaseUser.photoURL || userProfile?.photoURL || '',
            ...userProfile
          });
        } catch (error) {
          console.error('獲取用戶資料失敗:', error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || ''
          });
        }
      } else {
        // 用戶未登入
        setUser(null);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  // 添加登出函數
  const logout = async () => {
    try {
      await firebaseLogout();
      setUser(null);
    } catch (error) {
      console.error('登出失敗:', error);
      throw error;
    }
  };
  
  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    logout // 添加到 context 值中
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 