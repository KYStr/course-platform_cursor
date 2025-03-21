import { Vimeo } from 'vimeo';

export default async function handler(req, res) {
  const { id, captionId } = req.query;

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: '只支持 DELETE 請求' });
  }

  try {
    // 初始化 Vimeo 客戶端
    const client = new Vimeo(
      process.env.VIMEO_CLIENT_ID,
      process.env.VIMEO_CLIENT_SECRET,
      process.env.VIMEO_ACCESS_TOKEN
    );

    // 刪除字幕
    client.request({
      method: 'DELETE',
      path: `/videos/${id}/texttracks/${captionId}`
    }, function(error, body, status_code, headers) {
      if (error) {
        console.error('刪除字幕失敗:', error);
        return res.status(500).json({ error: error.message || '刪除字幕失敗' });
      }

      res.status(200).json({
        success: true,
        message: '字幕刪除成功'
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