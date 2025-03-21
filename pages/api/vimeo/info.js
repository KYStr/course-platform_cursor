import { Vimeo } from 'vimeo';

// 初始化 Vimeo 客戶端
const client = new Vimeo(
  process.env.VIMEO_CLIENT_ID,
  process.env.VIMEO_CLIENT_SECRET,
  process.env.VIMEO_ACCESS_TOKEN
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只允許 GET 請求' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: '缺少視頻 ID 參數' });
  }

  try {
    // 使用 Vimeo API 獲取視頻信息
    const videoInfo = await new Promise((resolve, reject) => {
      client.request({
        method: 'GET',
        path: `/videos/${id}`
      }, (error, body, statusCode) => {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
    
    return res.status(200).json(videoInfo);
  } catch (error) {
    console.error('獲取 Vimeo 視頻信息失敗:', error);
    return res.status(500).json({ 
      error: '獲取視頻信息失敗', 
      message: error.message 
    });
  }
} 