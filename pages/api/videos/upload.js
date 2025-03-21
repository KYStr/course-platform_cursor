import { IncomingForm } from 'formidable';
import { Vimeo } from 'vimeo';
// 只在服務器端導入 fs
import fs from 'fs';

// 禁用 Next.js 的默認 body 解析
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 請求' });
  }

  try {
    // 解析表單數據
    const form = new IncomingForm({
      keepExtensions: true,
      maxFileSize: 500 * 1024 * 1024, // 500MB 限制
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    // 獲取課程 ID 和視頻標題
    const courseId = fields.courseId[0];
    const title = fields.title[0] || '未命名視頻';
    const description = fields.description[0] || '';

    // 添加 Vimeo 客戶端初始化的日誌
    console.log('Vimeo 配置:', {
      clientId: process.env.VIMEO_CLIENT_ID ? '已設置' : '未設置',
      clientSecret: process.env.VIMEO_CLIENT_SECRET ? '已設置' : '未設置',
      accessToken: process.env.VIMEO_ACCESS_TOKEN ? '已設置' : '未設置'
    });

    // 初始化 Vimeo 客戶端
    const client = new Vimeo(
      process.env.VIMEO_CLIENT_ID,
      process.env.VIMEO_CLIENT_SECRET,
      process.env.VIMEO_ACCESS_TOKEN
    );

    // 上傳視頻到 Vimeo
    const videoFile = files.file[0];
    const filePath = videoFile.filepath;
    const fileSize = videoFile.size;

    // 創建上傳參數
    const params = {
      name: title,
      description: description,
      privacy: {
        view: 'anybody',
        embed: 'public',
        comments: 'nobody'
      },
      embed: {
        buttons: {
          like: false,
          watchlater: false,
          share: false,
          embed: false,
        },
        logos: {
          vimeo: false,
        },
        title: {
          name: 'hide',
          owner: 'hide',
          portrait: 'hide',
        },
      },
    };

    // 執行上傳
    client.upload(
      filePath,
      params,
      function (uri) {
        // 上傳成功
        // 從 URI 中提取 Vimeo ID
        const vimeoId = uri.split('/').pop();
        
        // 清理臨時文件
        fs.unlinkSync(filePath);
        
        // 返回 Vimeo ID 和其他信息
        res.status(200).json({
          success: true,
          vimeoId: vimeoId,
          uri: uri
        });
      },
      function (bytesUploaded, bytesTotal) {
        // 上傳進度
        const percentage = (bytesUploaded / bytesTotal * 100).toFixed(2);
        console.log(bytesUploaded, bytesTotal, percentage + '%');
      },
      function (error) {
        // 上傳失敗
        console.error('上傳到 Vimeo 失敗:', error);
        
        // 清理臨時文件
        try {
          fs.unlinkSync(filePath);
        } catch (fsError) {
          console.error('清理臨時文件失敗:', fsError);
        }
        
        // 返回詳細錯誤信息
        res.status(500).json({
          success: false,
          error: error.message || '上傳視頻失敗',
          details: error.toString(),
          vimeoError: true
        });
      }
    );
  } catch (error) {
    console.error('處理上傳請求失敗:', error);
    // 返回更詳細的錯誤信息
    res.status(500).json({
      success: false,
      error: error.message || '處理上傳請求失敗',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 