import { db } from '../../../../lib/firebase';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只允許 POST 請求' });
  }

  const { id } = req.query;
  const { queryKey } = req.body;

  if (!id || !queryKey) {
    return res.status(400).json({ error: '缺少必要參數' });
  }

  try {
    const courseDoc = await getDoc(doc(db, 'courses', id));
    if (!courseDoc.exists() || !courseDoc.data().accountLookupEnabled) {
      return res.status(404).json({ error: '此課程未啟用帳號查詢功能' });
    }

    const q = query(
      collection(db, 'courses', id, 'accountEntries'),
      where('queryKey', '==', queryKey.trim())
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return res.status(404).json({ error: '未找到對應的帳號，請確認輸入是否正確' });
    }

    const entry = snapshot.docs[0].data();
    return res.status(200).json({
      account: entry.account,
      password: entry.password
    });
  } catch (error) {
    console.error('帳號查詢失敗:', error);
    return res.status(500).json({ error: '查詢失敗，請稍後再試' });
  }
}
