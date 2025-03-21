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

      // 格式化時長
      const durationInSeconds = body.duration;
      const hours = Math.floor(durationInSeconds / 3600);
      const minutes = Math.floor((durationInSeconds % 3600) / 60);
      const seconds = Math.floor(durationInSeconds % 60);
      
      const formattedDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      res.status(200).json({
        success: true,
        duration: formattedDuration,
        durationObject: {
          hours: hours,
          minutes: minutes,
          seconds: seconds
        },
        rawDuration: durationInSeconds
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