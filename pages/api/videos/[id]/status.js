import { Vimeo } from 'vimeo';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持 GET 請求' });
  }

  try {
    // 初始化 Vimeo 客戶端
    const client = new Vimeo(
      process.env.VIMEO_CLIENT_ID,
      process.env.VIMEO_CLIENT_SECRET,
      process.env.VIMEO_ACCESS_TOKEN
    );

    // 獲取視頻信息
    client.request({
      method: 'GET',
      path: `/videos/${id}`
    }, function(error, body, status_code, headers) {
      if (error) {
        console.error('獲取視頻信息失敗:', error);
        return res.status(500).json({ error: error.message || '獲取視頻信息失敗' });
      }

      // 檢查視頻狀態
      const status = body.status;
      const isReady = status === 'available';
      const isProcessing = status === 'transcoding' || status === 'uploading';
      
      res.status(200).json({
        success: true,
        status: status,
        isReady: isReady,
        isProcessing: isProcessing,
        thumbnailUrl: body.pictures?.base_link || null
      });
    });
  } catch (error) {
    console.error('處理請求失敗:', error);
    res.status(500).json({
      success: false,
      error: error.message || '處理請求失敗'
    });
  }
} 