import { Vimeo } from 'vimeo';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 請求' });
  }

  try {
    // 解析表單數據
    const form = new formidable.IncomingForm({
      keepExtensions: true,
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    // 獲取語言代碼
    const language = fields.language[0] || 'zh-TW';
    const name = fields.name[0] || '中文字幕';

    // 獲取字幕文件路徑
    const captionFile = files.file[0];
    const filePath = captionFile.filepath;

    // 初始化 Vimeo 客戶端
    const client = new Vimeo(
      process.env.VIMEO_CLIENT_ID,
      process.env.VIMEO_CLIENT_SECRET,
      process.env.VIMEO_ACCESS_TOKEN
    );

    // 讀取字幕文件內容
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // 上傳字幕到 Vimeo
    client.request({
      method: 'POST',
      path: `/videos/${id}/texttracks`,
      query: {
        type: 'subtitles',
        language: language,
        name: name,
      },
      body: {
        active: true,
        type: 'subtitles',
        language: language,
        name: name,
      }
    }, function(error, body, status_code, headers) {
      if (error) {
        console.error('創建字幕軌道失敗:', error);
        return res.status(500).json({ error: error.message || '創建字幕軌道失敗' });
      }

      // 獲取上傳 URI
      const uploadLink = headers.location;

      // 上傳字幕文件內容
      client.request({
        method: 'PUT',
        path: uploadLink,
        headers: {
          'Content-Type': 'text/plain'
        },
        body: fileContent
      }, function(uploadError, uploadBody, uploadStatus, uploadHeaders) {
        // 清理臨時文件
        try {
          fs.unlinkSync(filePath);
        } catch (fsError) {
          console.error('清理臨時文件失敗:', fsError);
        }

        if (uploadError) {
          console.error('上傳字幕內容失敗:', uploadError);
          return res.status(500).json({ error: uploadError.message || '上傳字幕內容失敗' });
        }

        res.status(200).json({
          success: true,
          message: '字幕上傳成功',
          language: language,
          name: name
        });
      });
    });
  } catch (error) {
    console.error('處理字幕上傳請求失敗:', error);
    res.status(500).json({
      success: false,
      error: error.message || '處理字幕上傳請求失敗'
    });
  }
} 