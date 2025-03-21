// Vimeo API 集成
const VIMEO_ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN;

// 獲取視頻信息
export const getVimeoVideoInfo = async (vimeoId) => {
  try {
    const response = await fetch(`https://api.vimeo.com/videos/${vimeoId}`, {
      headers: {
        'Authorization': `Bearer ${VIMEO_ACCESS_TOKEN}`
      }
    });
    
    if (!response.ok) {
      throw new Error('獲取Vimeo視頻信息失敗');
    }
    
    const data = await response.json();
    return {
      title: data.name,
      description: data.description,
      duration: formatDuration(data.duration),
      thumbnail: data.pictures.sizes[3].link,
      width: data.width,
      height: data.height
    };
  } catch (error) {
    console.error('Vimeo API 錯誤:', error);
    throw error;
  }
};

// 獲取播放器嵌入代碼
export const getVimeoEmbedCode = (vimeoId, options = {}) => {
  const defaultOptions = {
    autoplay: false,
    muted: false,
    loop: false,
    controls: true,
    portrait: false,
    title: false,
    byline: false
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  const queryParams = Object.entries(mergedOptions)
    .map(([key, value]) => `${key}=${value ? '1' : '0'}`)
    .join('&');
  
  return `https://player.vimeo.com/video/${vimeoId}?${queryParams}`;
};

// 格式化時間
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// 初始化Vimeo播放器
export const initVimeoPlayer = (elementId, vimeoId, options = {}) => {
  // 確保Vimeo Player SDK已加載
  if (typeof Vimeo === 'undefined') {
    console.error('Vimeo Player SDK未加載');
    return null;
  }
  
  const defaultOptions = {
    id: vimeoId,
    width: '100%',
    height: '100%',
    controls: true
  };
  
  const playerOptions = { ...defaultOptions, ...options };
  return new Vimeo.Player(elementId, playerOptions);
}; 