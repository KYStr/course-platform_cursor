import { getVimeoVideoInfo } from '../../../api/admin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只允許 GET 請求' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: '缺少視頻 ID 參數' });
  }

  try {
    // 使用 getVimeoVideoInfo 函數獲取視頻信息
    const videoInfo = await getVimeoVideoInfo(id);
    
    // 檢查視頻是否已處理完成
    const isReady = videoInfo && 
                    videoInfo.status === 'available' && 
                    videoInfo.transcode && 
                    videoInfo.transcode.status === 'complete';
    
    return res.status(200).json({ 
      isReady,
      status: videoInfo?.status || 'unknown',
      transcodeStatus: videoInfo?.transcode?.status || 'unknown'
    });
  } catch (error) {
    console.error('獲取 Vimeo 視頻狀態失敗:', error);
    return res.status(500).json({ 
      error: '獲取視頻狀態失敗', 
      message: error.message 
    });
  }
} 