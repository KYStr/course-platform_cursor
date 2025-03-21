import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../../components/AdminLayout';
import { useAuth } from '../../../context/auth-context';
import { 
  getCourseById, 
  createSection, 
  updateSection, 
  deleteSection,
  createVideo,
  updateVideo,
  deleteVideo,
  getSections,
  getVideos
} from '../../../api/courses';
import { 
  uploadVideo,
  uploadAttachment,
  deleteAttachment,
  uploadCaption,
  getCaptions,
  deleteCaption,
  getVimeoVideoInfo
} from '../../../api/admin';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function CourseContent() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [sectionForm, setSectionForm] = useState({ title: '', description: '' });
  const [videoForm, setVideoForm] = useState({ 
    title: '', 
    description: '', 
    vimeoId: '',
    duration: {
      hours: '0',
      minutes: '0',
      seconds: '0'
    },
    isFree: false
  });
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentName, setAttachmentName] = useState('');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const videoFileRef = useRef(null);
  const attachmentFileRef = useRef(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedVideos, setExpandedVideos] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [previewVideo, setPreviewVideo] = useState(false);
  const [previewVimeoId, setPreviewVimeoId] = useState('');
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [captions, setCaptions] = useState([]);
  const [uploadingCaption, setUploadingCaption] = useState(false);
  const captionFileRef = useRef(null);
  const [captionForm, setCaptionForm] = useState({
    language: 'zh-TW',
    name: '中文字幕'
  });
  const [sections, setSections] = useState([]);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [isAddingSectionMode, setIsAddingSectionMode] = useState(false);
  const [success, setSuccess] = useState(null);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoDescription, setNewVideoDescription] = useState('');
  const [newVideoVimeoId, setNewVideoVimeoId] = useState('');
  const [newVideoIsFree, setNewVideoIsFree] = useState(false);
  const [vimeoInfo, setVimeoInfo] = useState(null);
  const [isAddingVideoMode, setIsAddingVideoMode] = useState(false);
  const [isEditingSectionMode, setIsEditingSectionMode] = useState(false);
  const [isEditingVideoMode, setIsEditingVideoMode] = useState(false);
  const [vimeoLoading, setVimeoLoading] = useState(false);
  const [vimeoError, setVimeoError] = useState(null);

  // 檢查用戶是否有管理員權限
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/admin/courses');
        return;
      }
      
      if (user && user.role !== 'admin' && user.role !== 'instructor') {
        router.push('/dashboard');
        return;
      }
    }
  }, [authLoading, isAuthenticated, user, router]);

  // 獲取課程數據
  useEffect(() => {
    if (!id) return;
    
    const fetchCourse = async () => {
      try {
        setLoading(true);
        
        // 獲取課程信息
        const courseData = await getCourseById(id);
        setCourse(courseData);
        
        // 獲取課程的所有章節
        const sectionsData = await getSections(id);
        
        // 對於每個章節，獲取其視頻
        const sectionsWithVideos = await Promise.all(
          sectionsData.map(async (section) => {
            const videos = await getVideos(id, section.id);
            console.log(`章節 ${section.id} 的視頻:`, videos);
            return {
              ...section,
              videos: videos.sort((a, b) => a.order - b.order)
            };
          })
        );
        
        setSections(sectionsWithVideos.sort((a, b) => a.order - b.order));
        setLoading(false);
      } catch (error) {
        console.error('獲取課程數據失敗:', error);
        setError('獲取課程數據失敗，請稍後再試');
        setLoading(false);
      }
    };
    
    fetchCourse();
  }, [id]);

  // 初始化展開狀態
  useEffect(() => {
    if (sections.length > 0) {
      // 默認展開所有章節
      const initialExpandState = {};
      sections.forEach(section => {
        initialExpandState[section.id] = true;
      });
      setExpandedSections(initialExpandState);
      
      console.log('初始化章節展開狀態:', initialExpandState);
    }
  }, [sections]);

  // 切換章節展開/收起
  const toggleSectionExpand = (sectionId) => {
    try {
      console.log('切換章節展開狀態:', sectionId);
      setExpandedSections(prev => {
        const newState = { ...prev };
        newState[sectionId] = !prev[sectionId];
        console.log('新的展開狀態:', newState);
        return newState;
      });
    } catch (error) {
      console.error('切換章節展開狀態時出錯:', error);
    }
  };

  // 修改添加章節函數
  const handleAddSection = async () => {
    console.log('添加章節按鈕被點擊');
    if (!newSectionTitle.trim()) {
      setError('請輸入章節標題');
      return;
    }
    
    try {
      console.log('開始添加章節:', { id, title: newSectionTitle });
      setLoading(true);
      
      // 獲取當前最大的順序值
      const maxOrder = sections.length > 0 
        ? Math.max(...sections.map(s => s.order || 0)) 
        : 0;
      
      // 創建新章節
      const sectionData = {
        title: newSectionTitle,
        order: maxOrder + 1,
        createdAt: new Date().toISOString()
      };
      
      console.log('章節數據:', sectionData);
      const sectionId = await createSection(id, sectionData);
      console.log('章節創建成功，ID:', sectionId);
      
      // 重新獲取章節列表
      await fetchSections();
      
      // 清空輸入框
      setNewSectionTitle('');
      setLoading(false);
    } catch (error) {
      console.error('添加章節失敗:', error);
      setError('添加章節失敗: ' + error.message);
      setLoading(false);
    }
  };

  // 修改編輯章節提交函數
  const handleEditSectionSubmit = async (e) => {
    e.preventDefault();
    
    if (!sectionForm.title.trim()) {
      setError('請輸入章節標題');
      return;
    }
    
    try {
      console.log('開始更新章節:', { id, sectionId: editingSectionId, data: sectionForm });
      setLoading(true);
      
      // 更新章節
      await updateSection(id, editingSectionId, {
        title: sectionForm.title.trim(),
        description: sectionForm.description.trim()
      });
      
      console.log('章節更新成功');
      
      // 重新獲取章節列表
      await fetchSections();
      
      // 重置表單
      setSectionForm({ title: '', description: '' });
      setEditingSectionId(null);
      setShowSectionForm(false);
      setLoading(false);
    } catch (error) {
      console.error('更新章節失敗:', error);
      setError('更新章節失敗: ' + error.message);
      setLoading(false);
    }
  };

  // 修改刪除章節函數
  const handleDeleteSection = async (sectionId) => {
    console.log('刪除章節按鈕被點擊:', sectionId);
    if (window.confirm('確定要刪除此章節嗎？所有相關視頻也將被刪除。')) {
      try {
        console.log('開始刪除章節:', { id, sectionId });
        setLoading(true);
        await deleteSection(id, sectionId);
        console.log('章節刪除成功');
        
        // 重新獲取章節列表
        await fetchSections();
        setLoading(false);
      } catch (error) {
        console.error('刪除章節失敗:', error);
        setError('刪除章節失敗: ' + error.message);
        setLoading(false);
      }
    }
  };

  // 修改添加視頻函數
  const handleAddVideo = async (sectionId) => {
    console.log('添加視頻按鈕被點擊:', sectionId);
    // 檢查視頻表單是否有效
    if (!videoForm.title.trim()) {
      setError('請輸入視頻標題');
      return;
    }
    
    try {
      console.log('開始添加視頻:', { id, sectionId, videoForm });
      setLoading(true);
      
      // 獲取當前章節的視頻列表
      const currentSection = sections.find(s => s.id === sectionId);
      const videos = currentSection.videos || [];
      
      // 獲取最大的順序值
      const maxOrder = videos.length > 0 
        ? Math.max(...videos.map(v => v.order || 0)) 
        : 0;
      
      // 格式化時長
      const formattedDuration = formatDuration(videoForm.duration);
      
      // 創建視頻數據
      const videoData = {
        ...videoForm,
        duration: formattedDuration, // 使用格式化後的時長字符串
        order: maxOrder + 1,
        createdAt: new Date().toISOString()
      };
      
      console.log('視頻數據:', videoData);
      await createVideo(id, sectionId, videoData);
      console.log('視頻創建成功');
      
      // 重新獲取章節列表
      await fetchSections();
      
      // 重置表單
      setVideoForm({
        title: '',
        description: '',
        vimeoId: '',
        duration: {
          hours: '0',
          minutes: '0',
          seconds: '0'
        },
        isFree: false
      });
      
      // 關閉模態框
      setShowVideoForm(false);
      setActiveSection(null);
      setLoading(false);
    } catch (error) {
      console.error('添加視頻失敗:', error);
      setError('添加視頻失敗: ' + error.message);
      setLoading(false);
    }
  };

  // 修改編輯視頻提交函數
  const handleEditVideoSubmit = async (e) => {
    e.preventDefault();
    
    if (!videoForm.title.trim()) {
      setError('請輸入視頻標題');
      return;
    }
    
    if (!videoForm.vimeoId.trim()) {
      setError('請輸入 Vimeo 視頻 ID');
      return;
    }
    
    try {
      setActionLoading(true);
      
      // 格式化時長
      const formattedDuration = formatDuration(videoForm.duration);
      
      // 更新視頻
      await updateVideo(id, activeSection, editingVideoId, {
        title: videoForm.title.trim(),
        description: videoForm.description.trim(),
        vimeoId: videoForm.vimeoId.trim(),
        duration: formattedDuration,
        isFree: videoForm.isFree
      });
      
      // 更新章節列表
      setSections(sections.map(section => 
        section.id === activeSection 
          ? { 
              ...section, 
              videos: section.videos.map(video => 
                video.id === editingVideoId 
                  ? { 
                      ...video, 
                      title: videoForm.title.trim(), 
                      description: videoForm.description.trim(),
                      vimeoId: videoForm.vimeoId.trim(),
                      duration: formattedDuration,
                      isFree: videoForm.isFree
                    } 
                  : video
              ) 
            } 
          : section
      ));
      
      // 重置表單
      setVideoForm({
        title: '',
        description: '',
        vimeoId: '',
        duration: {
          hours: '0',
          minutes: '0',
          seconds: '0'
        },
        isFree: false
      });
      setEditingVideoId(null);
      setShowVideoForm(false);
      setActiveSection(null);
      setError(null);
      setSuccess('視頻已更新');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('更新視頻失敗:', error);
      setError('更新視頻失敗，請稍後再試');
    } finally {
      setActionLoading(false);
    }
  };

  // 修改刪除視頻函數
  const handleDeleteVideo = async (sectionId, videoId) => {
    if (!confirm('確定要刪除這個視頻嗎？此操作無法撤銷。')) {
      return;
    }
    
    try {
      setActionLoading(true);
      
      // 刪除視頻
      await deleteVideo(id, sectionId, videoId);
      
      // 更新章節列表
      const updatedSections = sections.map(section => {
        if (section.id !== sectionId) return section;
        
        // 過濾掉被刪除的視頻
        const updatedVideos = section.videos.filter(video => video.id !== videoId);
        
        // 重新排序視頻
        const reorderedVideos = updatedVideos.map((video, index) => ({
          ...video,
          order: index
        }));
        
        // 更新數據庫中的視頻順序
        reorderedVideos.forEach(async (video) => {
          await updateVideo(id, sectionId, video.id, { order: video.order });
        });
        
        return {
          ...section,
          videos: reorderedVideos
        };
      });
      
      setSections(updatedSections);
      setSuccess('視頻已刪除');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('刪除視頻失敗:', error);
      setError('刪除視頻失敗，請稍後再試');
    } finally {
      setActionLoading(false);
    }
  };

  // 處理上傳視頻
  const handleUploadVideo = async () => {
    const file = videoFileRef.current.files[0];
    if (!file) {
      alert('請選擇視頻文件');
      return;
    }
    
    try {
      setUploadingVideo(true);
      setUploadProgress(0);
      
      // 創建進度更新函數
      const updateProgress = (progress) => {
        setUploadProgress(Math.round(progress));
      };
      
      // 上傳視頻到 Vimeo
      const result = await uploadVideo(
        file, 
        id, 
        videoForm.title, 
        videoForm.description, 
        updateProgress
      );
      
      // 如果上傳成功，設置 Vimeo ID 和時長
      if (result && result.vimeoId) {
      setVideoForm(prev => ({
        ...prev,
          vimeoId: result.vimeoId,
          duration: result.durationObject || {
            hours: '0',
            minutes: '0',
            seconds: '0'
          }
        }));
        
        // 顯示上傳成功提示，而不是自動打開預覽
        alert(`視頻上傳成功！Vimeo ID: ${result.vimeoId}\n視頻正在處理中，稍後可以點擊預覽按鈕查看。`);
      }
      
    } catch (error) {
      console.error('上傳視頻失敗:', error);
      alert('上傳視頻失敗: ' + (error.message || '未知錯誤') + '\n請確保您的 Vimeo 帳戶有足夠的上傳權限。');
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  // 獲取視頻時長
  const fetchVideoDuration = async (vimeoId) => {
    if (!vimeoId) return;
    
    try {
      const response = await fetch(`/api/videos/${vimeoId}/duration`);
      if (!response.ok) {
        throw new Error('獲取視頻時長失敗');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setVideoForm(prev => ({
          ...prev,
          duration: data.durationObject || {
            hours: '0',
            minutes: '0',
            seconds: '0'
          }
        }));
      }
    } catch (error) {
      console.error('獲取視頻時長失敗:', error);
    }
  };

  // 處理上傳附件
  const handleUploadAttachment = async () => {
    const file = attachmentFileRef.current.files[0];
    if (!file || !attachmentName || !activeVideo) {
      setError('請選擇要上傳的附件文件並輸入名稱');
      return;
    }
    
    try {
      setUploadingAttachment(true);
      
      // 上傳附件
      const attachmentUrl = await uploadAttachment(id, activeVideo, file, attachmentName);
      
      // 獲取當前視頻的附件列表
      const currentVideo = course.sections
        .flatMap(s => s.videos)
        .find(v => v.id === activeVideo);
      
      // 更新視頻附件
      await updateVideo(activeVideo, {
        attachments: [
          ...(currentVideo?.attachments || []),
          {
            name: attachmentName,
            url: attachmentUrl,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString()
          }
        ]
      });
      
      // 更新課程數據
      setCourse(prev => ({
        ...prev,
        sections: prev.sections.map(section => ({
          ...section,
          videos: section.videos.map(video => 
            video.id === activeVideo 
              ? { 
                  ...video, 
                  attachments: [
                    ...(video.attachments || []),
                    {
                      name: attachmentName,
                      url: attachmentUrl,
                      type: file.type,
                      size: file.size,
                      uploadedAt: new Date().toISOString()
                    }
                  ]
                } 
              : video
          )
        }))
      }));
      
      // 重置表單
      setAttachmentFile(null);
      setAttachmentName('');
      if (attachmentFileRef.current) {
      attachmentFileRef.current.value = '';
      }
      
      setUploadingAttachment(false);
      
    } catch (error) {
      console.error('上傳附件失敗:', error);
      setError('上傳附件失敗，請稍後再試');
      setUploadingAttachment(false);
    }
  };

  // 處理刪除附件
  const handleDeleteAttachment = async (videoId, attachmentIndex) => {
    if (!confirm('確定要刪除這個附件嗎？此操作無法撤銷。')) {
      return;
    }
    
    try {
      // 獲取當前視頻
      const currentVideo = course.sections
        .flatMap(s => s.videos)
        .find(v => v.id === videoId);
      
      if (!currentVideo || !currentVideo.attachments) {
        setError('找不到附件信息');
        return;
      }
      
      // 獲取要刪除的附件
      const attachmentToDelete = currentVideo.attachments[attachmentIndex];
      
      // 刪除附件
      await deleteAttachment(videoId, attachmentToDelete.url);
      
      // 更新視頻附件列表
      const updatedAttachments = [...currentVideo.attachments];
      updatedAttachments.splice(attachmentIndex, 1);
      
      await updateVideo(videoId, { attachments: updatedAttachments });
      
      // 更新課程數據
      setCourse(prev => ({
        ...prev,
        sections: prev.sections.map(section => ({
          ...section,
          videos: section.videos.map(video => 
            video.id === videoId 
              ? { 
                  ...video, 
                  attachments: updatedAttachments
                } 
              : video
          )
        }))
      }));
      
    } catch (error) {
      console.error('刪除附件失敗:', error);
      setError('刪除附件失敗，請稍後再試');
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 獲取文件圖標
  const getFileIcon = (fileType) => {
    if (fileType.includes('image')) return 'ri-image-line';
    if (fileType.includes('pdf')) return 'ri-file-pdf-line';
    if (fileType.includes('word') || fileType.includes('document')) return 'ri-file-word-line';
    if (fileType.includes('excel') || fileType.includes('sheet')) return 'ri-file-excel-line';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'ri-file-ppt-line';
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return 'ri-file-zip-line';
    if (fileType.includes('text')) return 'ri-file-text-line';
    return 'ri-file-line';
  };

  // 修改時長格式化函數
  const formatDuration = (duration) => {
    if (!duration) return '00:00:00';
    
    if (typeof duration === 'object') {
      const hours = String(duration.hours || 0).padStart(2, '0');
      const minutes = String(duration.minutes || 0).padStart(2, '0');
      const seconds = String(duration.seconds || 0).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    
    return duration;
  };

  // 解析時長字符串為對象
  const parseDuration = (durationString) => {
    if (!durationString) {
      return { hours: '0', minutes: '0', seconds: '0' };
    }
    
    // 如果 durationString 是對象，直接返回
    if (typeof durationString === 'object' && durationString !== null) {
      return {
        hours: String(durationString.hours || '0'),
        minutes: String(durationString.minutes || '0'),
        seconds: String(durationString.seconds || '0')
      };
    }
    
    const parts = String(durationString).split(':');
    if (parts.length === 3) {
      return {
        hours: parts[0],
        minutes: parts[1],
        seconds: parts[2]
      };
    } else if (parts.length === 2) {
      return {
        hours: '0',
        minutes: parts[0],
        seconds: parts[1]
      };
    } else {
      return {
        hours: '0',
        minutes: '0',
        seconds: parts[0] || '0'
      };
    }
  };

  // 預覽視頻
  const handlePreviewVideo = (videoUrlOrId) => {
    console.log('預覽視頻:', videoUrlOrId);
    
    if (!videoUrlOrId) {
      setError('沒有可預覽的視頻');
      return;
    }
    
    // 提取 Vimeo ID
    let vimeoId = videoUrlOrId;
    
    // 如果是完整的 URL，提取 ID
    if (videoUrlOrId.includes('vimeo.com')) {
      const match = videoUrlOrId.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/|vimeo\.com\/video\/)(\d+)/);
      if (match && match[1]) {
        vimeoId = match[1];
      }
    }
    
    setPreviewVimeoId(vimeoId);
    setPreviewVideo(true);
    
    // 檢查視頻是否正在處理中
    checkVideoStatus(vimeoId).then(isReady => {
      setVideoProcessing(!isReady);
    });
  };

  // 關閉預覽
  const closePreview = () => {
    setPreviewVideo(false);
    setPreviewVimeoId('');
    setVideoProcessing(false);
  };

  // 檢查視頻狀態
  const checkVideoStatus = async (vimeoId) => {
    console.log('檢查視頻狀態:', vimeoId);
    // 簡單起見，假設視頻已經處理完成
    return true;
  };

  // 獲取字幕列表
  const fetchCaptions = async (vimeoId) => {
    if (!vimeoId) return;
    
    try {
      const captionsList = await getCaptions(vimeoId);
      setCaptions(captionsList);
    } catch (error) {
      console.error('獲取字幕列表失敗:', error);
    }
  };

  // 當 vimeoId 變化時獲取字幕列表
  useEffect(() => {
    if (videoForm.vimeoId && !videoForm.vimeoId.startsWith('vimeo_')) {
      fetchCaptions(videoForm.vimeoId);
    }
  }, [videoForm.vimeoId]);

  // 處理上傳字幕
  const handleUploadCaption = async () => {
    const file = captionFileRef.current.files[0];
    if (!file) {
      setError('請選擇字幕文件');
      return;
    }
    
    if (!videoForm.vimeoId || videoForm.vimeoId.startsWith('vimeo_')) {
      setError('請先上傳視頻或輸入有效的 Vimeo ID');
      return;
    }
    
    try {
      setUploadingCaption(true);
      
      await uploadCaption(
        videoForm.vimeoId,
        file,
        captionForm.language, 
        captionForm.name
      );
      
      // 重新獲取字幕列表
      await fetchCaptions(videoForm.vimeoId);
      
      // 重置表單
      captionFileRef.current.value = '';
      
      setSuccess('字幕已上傳');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('上傳字幕失敗:', error);
      setError('上傳字幕失敗，請稍後再試');
    } finally {
      setUploadingCaption(false);
    }
  };

  // 刪除字幕
  const handleDeleteCaption = async (captionId) => {
    if (!confirm('確定要刪除這個字幕嗎？此操作無法撤銷。')) {
      return;
    }
    
    if (!activeVideo || !activeVideo.vimeoId) {
      setError('請先選擇視頻');
      return;
    }
    
    try {
      setActionLoading(true);
      
      await deleteCaption(activeVideo.vimeoId, captionId);
      
      // 重新獲取字幕列表
      await fetchCaptions(activeVideo.vimeoId);
      
      setSuccess('字幕已刪除');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('刪除字幕失敗:', error);
      setError('刪除字幕失敗，請稍後再試');
    } finally {
      setActionLoading(false);
    }
  };

  // 開始添加視頻
  const startAddVideo = (section) => {
    handleAddVideoClick(section.id);
  };

  // 開始編輯章節
  const startEditSection = (section) => {
    handleEditSection(section);
  };

  // 開始編輯視頻
  const startEditVideo = (section, video) => {
    handleEditVideoClick(section.id, video);
  };

  // 取消操作
  const handleCancel = () => {
    // 重置表單
    setNewSectionTitle('');
    setNewSectionDescription('');
    setSectionForm({ title: '', description: '' });
    setVideoForm({
      title: '', 
      description: '', 
      vimeoId: '',
      duration: {
        hours: '0',
        minutes: '0',
        seconds: '0'
      },
      isFree: false
    });
    
    // 關閉模態框
    setShowSectionForm(false);
    setShowVideoForm(false);
    
    // 重置編輯狀態
    setEditingSectionId(null);
    setEditingVideoId(null);
    setActiveSection(null);
    
    // 清除錯誤
    setError(null);
  };

  // 獲取 Vimeo 視頻信息
  const fetchVimeoInfo = async () => {
    if (!newVideoVimeoId.trim()) {
      setError('請輸入 Vimeo 視頻 ID');
      return;
    }
    
    try {
      setVimeoLoading(true);
      setVimeoError(null);
      
      const info = await getVimeoVideoInfo(newVideoVimeoId.trim());
      setVimeoInfo(info);
      
    } catch (error) {
      console.error('獲取 Vimeo 視頻信息失敗:', error);
      setVimeoError('無法獲取視頻信息，請確認 ID 是否正確');
    } finally {
      setVimeoLoading(false);
    }
  };

  // 處理視頻表單提交
  const handleVideoSubmit = async (e) => {
    e.preventDefault();
    
    if (editingVideoId) {
      await handleEditVideoSubmit(e);
    } else {
      await handleAddVideo(activeSection);
    }
  };

  // 1. 修改添加章節按鈕的點擊處理函數
  const handleAddSectionClick = () => {
    console.log('添加章節按鈕被點擊');
    // 重置表單
    setNewSectionTitle('');
    setNewSectionDescription('');
    setEditingSectionId(null);
    // 顯示添加章節表單
    setShowSectionForm(true);
  };

  // 添加視頻按鈕點擊處理函數
  const handleAddVideoClick = (sectionId) => {
    setActiveSection(sectionId);
    setEditingVideoId(null);
    setVideoForm({
      title: '',
      description: '',
      vimeoId: '',
      duration: {
        hours: '0',
        minutes: '0',
        seconds: '0'
      },
      isFree: false
    });
    setShowVideoForm(true);
  };

  // 編輯章節按鈕點擊處理函數
  const handleEditSection = (section) => {
    console.log('編輯章節:', section);
    // 設置編輯模式
    setEditingSectionId(section.id);
    // 填充表單數據
    setSectionForm({
      title: section.title,
      description: section.description || ''
    });
    // 顯示編輯表單
    setShowSectionForm(true);
  };

  // 編輯視頻按鈕點擊處理函數
  const handleEditVideoClick = (sectionId, video) => {
    setActiveSection(sectionId);
    setEditingVideoId(video.id);
    
    // 解析時長
    const durationParts = (video.duration || '00:00:00').split(':');
    const hours = durationParts.length === 3 ? durationParts[0] : '0';
    const minutes = durationParts.length === 3 ? durationParts[1] : durationParts[0];
    const seconds = durationParts.length === 3 ? durationParts[2] : durationParts[1];
    
    setVideoForm({
      title: video.title,
      description: video.description || '',
      vimeoId: video.vimeoId,
      duration: {
        hours,
        minutes,
        seconds
      },
      isFree: video.isFree
    });
    
    setShowVideoForm(true);
  };

  // 獲取章節列表
  const fetchSections = async () => {
    try {
      console.log('開始獲取章節列表:', id);
      const sectionsData = await getSections(id);
      console.log('獲取到的章節數據:', sectionsData);
      
      // 對於每個章節，獲取其視頻
      const sectionsWithVideos = await Promise.all(
        sectionsData.map(async (section) => {
          const videos = await getVideos(id, section.id);
          console.log(`章節 ${section.id} 的視頻:`, videos);
          return {
            ...section,
            videos: videos.sort((a, b) => a.order - b.order)
          };
        })
      );
      
      const sortedSections = sectionsWithVideos.sort((a, b) => a.order - b.order);
      console.log('處理後的章節數據:', sortedSections);
      setSections(sortedSections);
      
      // 初始化展開狀態
      const initialExpandState = {};
      sortedSections.forEach(section => {
        initialExpandState[section.id] = true;
      });
      setExpandedSections(initialExpandState);
    } catch (error) {
      console.error('獲取章節失敗:', error);
      setError('獲取章節失敗');
    }
  };

  // 在組件加載時獲取章節列表
  useEffect(() => {
    if (id) {
      console.log('組件加載，獲取章節列表');
      fetchSections();
    }
  }, [id]);

  // 修改章節表單提交處理
  const handleSectionFormSubmit = async (e) => {
    e.preventDefault();
    
    if (editingSectionId) {
      // 如果是編輯現有章節
      await handleEditSectionSubmit(e);
    } else {
      // 如果是添加新章節
      if (!newSectionTitle.trim()) {
        setError('請輸入章節標題');
        return;
      }
      
      try {
        console.log('開始添加章節:', { id, title: newSectionTitle, description: newSectionDescription });
        setLoading(true);
        
        // 獲取當前最大的順序值
        const maxOrder = sections.length > 0 
          ? Math.max(...sections.map(s => s.order || 0)) 
          : 0;
        
        // 創建新章節
        const sectionData = {
          title: newSectionTitle.trim(),
          description: newSectionDescription.trim(),
          order: maxOrder + 1,
          createdAt: new Date().toISOString()
        };
        
        console.log('章節數據:', sectionData);
        const sectionId = await createSection(id, sectionData);
        console.log('章節創建成功，ID:', sectionId);
        
        // 重新獲取章節列表
        await fetchSections();
        
        // 清空輸入框並關閉模態框
        setNewSectionTitle('');
        setNewSectionDescription('');
        setShowSectionForm(false);
        setLoading(false);
      } catch (error) {
        console.error('添加章節失敗:', error);
        setError('添加章節失敗: ' + error.message);
        setLoading(false);
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon"><i className="ri-error-warning-line"></i></div>
        <h2>出錯了</h2>
        <p>{error}</p>
        <Link href="/admin/courses">
          <button className="btn-primary">返回課程列表</button>
        </Link>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="error-container">
        <div className="error-icon"><i className="ri-file-search-line"></i></div>
        <h2>找不到課程</h2>
        <p>該課程可能不存在或已被刪除</p>
        <Link href="/admin/courses">
          <button className="btn-primary">返回課程列表</button>
        </Link>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>課程內容管理 | 學習平台</title>
      </Head>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>載入課程內容中...</p>
          </div>
      ) : error ? (
        <div className="alert alert-danger">
          <i className="ri-error-warning-line"></i>
          <span>{error}</span>
        </div>
      ) : course ? (
          <div className="admin-content">
          {/* 頁面標題 */}
          <div className="admin-content-header">
              <h1>課程內容管理</h1>
            <div className="breadcrumb">
              <Link href="/admin">儀表板</Link> / 
              <Link href="/admin/courses" className="breadcrumb-item">課程管理</Link> / 
              <span>{course.title}</span>
              </div>
            </div>

          {/* 課程信息 */}
          <div className="course-info-card">
            <div className="course-info-header">
              <h2>{course.title}</h2>
              <div className="course-status">
                <span className={`status-badge ${course.status}`}>
                  {course.status === 'published' ? '已發布' : 
                   course.status === 'draft' ? '草稿' : '審核中'}
                </span>
              </div>
            </div>
            <div className="course-info-meta">
              <div className="instructor-info">
                <img src={course.instructor.avatar} alt={course.instructor.name} />
                <span>{course.instructor.name}</span>
              </div>
              <div className="course-stats">
                <div className="stat-item">
                  <i className="ri-user-line"></i>
                  <span>{course.studentsCount || 0} 學生</span>
                </div>
                <div className="stat-item">
                  <i className="ri-video-line"></i>
                  <span>
                    {course.sections 
                      ? course.sections.reduce(
                          (total, section) => total + (section.videos ? section.videos.length : 0), 
                          0
                        )
                      : 0
                    } 視頻
                  </span>
                </div>
              </div>
            </div>
                </div>

          {/* 可折疊說明 */}
          <div className="content-instructions">
            <div 
              className="instruction-header"
              onClick={() => setShowInstructions(!showInstructions)}
            >
              <h3>
                <i className="ri-information-line"></i> 
                如何管理課程內容
                <i className={`ri-arrow-${showInstructions ? 'up' : 'down'}-s-line`}></i>
              </h3>
                    </div>
            {showInstructions && (
              <div className="instruction-content">
                <ol>
                  <li><strong>添加章節：</strong> 點擊「添加章節」按鈕，填寫章節標題和描述，然後點擊「添加章節」。</li>
                  <li><strong>添加視頻：</strong> 展開章節後，點擊「添加視頻」按鈕，填寫視頻信息，上傳視頻或輸入 Vimeo ID，然後點擊「添加視頻」。</li>
                  <li><strong>編輯內容：</strong> 點擊章節或視頻旁的編輯圖標可以修改內容。</li>
                  <li><strong>刪除內容：</strong> 點擊章節或視頻旁的刪除圖標可以刪除內容（刪除章節會同時刪除其下的所有視頻）。</li>
                </ol>
                      </div>
            )}
                      </div>
          
          {/* 章節列表 */}
          <div className="sections-container">
            <div className="sections-header">
              <h3>課程章節</h3>
                        <div className="add-section-container">
                          <button 
                            className="btn-primary add-section-btn"
                            onClick={handleAddSectionClick}
                            disabled={loading}
                          >
                            <i className="ri-add-line"></i> 添加章節
                          </button>
                        </div>
                      </div>

            {!loading && sections.length > 0 ? (
                  <div className="sections-list">
                {sections.map((section, index) => (
                  <div key={section.id} className="section-item">
                    <div className="section-header">
                      <div className="section-info">
                        <span className="section-number">{index + 1}.</span>
                        <h3 className="section-title">{section.title}</h3>
                        <span className="video-count">
                          {section.videos?.length || 0} 個視頻
                        </span>
                      </div>
                      <div className="section-actions">
                        <button 
                          className="btn-edit-section" 
                          onClick={() => handleEditSection(section)}
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button 
                          className="btn-delete-section" 
                          onClick={() => handleDeleteSection(section.id)}
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                        <button 
                          className="btn-add-video" 
                          onClick={() => handleAddVideoClick(section.id)}
                        >
                          <i className="ri-video-add-line"></i> 添加視頻
                        </button>
                        <button 
                          className="btn-toggle-section" 
                          onClick={(e) => {
                            e.stopPropagation(); // 防止事件冒泡
                            toggleSectionExpand(section.id);
                          }}
                        >
                          <i className={`ri-arrow-${expandedSections[section.id] ? 'up' : 'down'}-s-line`}></i>
                        </button>
                      </div>
                    </div>
                    
                    {(expandedSections && expandedSections[section.id]) ? (
                      <div className={`section-content ${expandedSections[section.id] ? 'expanded' : 'collapsed'}`}>
                        {section.videos && section.videos.length > 0 ? (
                          <div className="videos-list">
                            {section.videos.map((video, videoIndex) => (
                              <div key={video.id} className="video-item">
                                <div className="video-info">
                                  <span className="video-number">{videoIndex + 1}.</span>
                                  <div className="video-title-wrapper">
                                    <h4 className="video-title">{video.title}</h4>
                                    {video.duration && (
                                      <span className="video-duration">
                                        <i className="ri-time-line"></i> {formatDuration(video.duration)}
                                      </span>
                                    )}
                                    {video.isFree && (
                                      <span className="video-free-badge">免費預覽</span>
                                    )}
                                  </div>
                                </div>
                                <div className="video-actions">
                                  <button 
                                    className="btn-preview-video" 
                                    onClick={() => handlePreviewVideo(video.videoUrl || video.vimeoId)}
                                  >
                                    <i className="ri-play-circle-line"></i>
                                  </button>
                                  <button 
                                    className="btn-edit-video" 
                                    onClick={() => handleEditVideoClick(section.id, video)}
                                  >
                                    <i className="ri-edit-line"></i>
                                  </button>
                                  <button 
                                    className="btn-delete-video" 
                                    onClick={() => handleDeleteVideo(section.id, video.id)}
                                  >
                                    <i className="ri-delete-bin-line"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="no-videos">
                            <p>此章節還沒有視頻</p>
                            <button 
                              className="btn-add-first-video" 
                              onClick={() => handleAddVideoClick(section.id)}
                            >
                              <i className="ri-video-add-line"></i> 添加第一個視頻
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <i className="ri-file-list-line"></i>
                <p>這個課程還沒有章節</p>
                <div className="add-section-container">
                  <button 
                    className="btn-primary add-section-btn"
                    onClick={handleAddSectionClick}
                    disabled={loading}
                  >
                    <i className="ri-add-line"></i> 添加章節
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
      
      {/* 添加章節模態框 */}
      <div className="modal-overlay" style={{ display: showSectionForm ? 'flex' : 'none' }}>
        <div className="modal">
          <div className="modal-header">
            <h3>{editingSectionId ? '編輯章節' : '添加章節'}</h3>
            <button className="btn-close" onClick={handleCancel}>
              <i className="ri-close-line"></i>
            </button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSectionFormSubmit}>
              <div className="form-group">
                <label htmlFor="sectionTitle">章節標題 *</label>
                <input
                  type="text"
                  id="sectionTitle"
                  value={editingSectionId ? sectionForm.title : newSectionTitle}
                  onChange={(e) => {
                    if (editingSectionId) {
                      setSectionForm({...sectionForm, title: e.target.value});
                    } else {
                      setNewSectionTitle(e.target.value);
                    }
                  }}
                  placeholder="輸入章節標題"
                  autoFocus
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="sectionDescription">章節描述</label>
                <textarea
                  id="sectionDescription"
                  value={editingSectionId ? sectionForm.description : newSectionDescription}
                  onChange={(e) => {
                    if (editingSectionId) {
                      setSectionForm({...sectionForm, description: e.target.value});
                    } else {
                      setNewSectionDescription(e.target.value);
                    }
                  }}
                  placeholder="輸入章節描述"
                  rows="3"
                ></textarea>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={handleCancel}
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm"></span>
                      {editingSectionId ? '保存中...' : '添加中...'}
                    </>
                  ) : (
                    editingSectionId ? '保存修改' : '添加章節'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      {/* 視頻表單模態框 */}
      {showVideoForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingVideoId ? '編輯視頻' : '添加視頻'}</h3>
              <button 
                className="btn-close" 
                onClick={handleCancel}
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleVideoSubmit}>
                <div className="form-group">
                  <label htmlFor="videoTitle">視頻標題 *</label>
                  <input
                    type="text"
                    id="videoTitle"
                    value={videoForm.title}
                    onChange={(e) => setVideoForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="輸入視頻標題"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="videoDescription">視頻描述</label>
                  <textarea
                    id="videoDescription"
                    value={videoForm.description}
                    onChange={(e) => setVideoForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="輸入視頻描述"
                    rows="3"
                  ></textarea>
                </div>
                
                <div className="form-group">
                  <label htmlFor="videoVimeoId">Vimeo ID</label>
                  <div className="vimeo-input-group">
                    <input
                      type="text"
                      id="videoVimeoId"
                      value={videoForm.vimeoId}
                      onChange={(e) => setVideoForm(prev => ({ ...prev, vimeoId: e.target.value }))}
                      placeholder="輸入Vimeo視頻ID"
                    />
                    <button 
                      type="button" 
                      className="btn-preview"
                      onClick={() => handlePreviewVideo(videoForm.vimeoId)}
                      disabled={!videoForm.vimeoId}
                    >
                      <i className="ri-play-circle-line"></i> 預覽
                    </button>
                    <button 
                      type="button" 
                      className="btn-fetch-duration"
                      onClick={() => fetchVideoDuration(videoForm.vimeoId)}
                      disabled={!videoForm.vimeoId}
                    >
                      <i className="ri-time-line"></i> 獲取時長
                    </button>
                  </div>
                  <p className="vimeo-id-note">
                    <i className="ri-information-line"></i>
                    上傳後的視頻需要一些時間處理，您可以稍後點擊預覽按鈕查看。
                  </p>
                </div>
                
                <div className="form-group">
                  <label htmlFor="videoDuration">視頻時長</label>
                  <div className="duration-inputs">
                    <div className="duration-input">
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={videoForm.duration.hours}
                        onChange={(e) => setVideoForm(prev => ({
                          ...prev,
                          duration: {
                            ...prev.duration,
                            hours: e.target.value
                          }
                        }))}
                        placeholder="時"
                      />
                      <span>時</span>
                    </div>
                    <div className="duration-input">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={videoForm.duration.minutes}
                        onChange={(e) => setVideoForm(prev => ({
                          ...prev,
                          duration: {
                            ...prev.duration,
                            minutes: e.target.value
                          }
                        }))}
                        placeholder="分"
                      />
                      <span>分</span>
                    </div>
                    <div className="duration-input">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={videoForm.duration.seconds}
                        onChange={(e) => setVideoForm(prev => ({
                          ...prev,
                          duration: {
                            ...prev.duration,
                            seconds: e.target.value
                          }
                        }))}
                        placeholder="秒"
                      />
                      <span>秒</span>
                    </div>
                  </div>
                </div>
                
                <div className="form-group checkbox">
                  <label htmlFor="videoIsFree">
                    <input
                      type="checkbox"
                      id="videoIsFree"
                      checked={videoForm.isFree}
                      onChange={(e) => setVideoForm(prev => ({ ...prev, isFree: e.target.checked }))}
                    />
                    <span>設為免費預覽</span>
                  </label>
                </div>
                
                <div className="video-upload-section">
                  <h4>上傳視頻</h4>
                  <p className="upload-info">
                    <i className="ri-information-line"></i> 
                    您可以直接上傳視頻文件，或者手動輸入已有的 Vimeo ID。上傳後的視頻將託管在 Vimeo 平台上。
                  </p>
                  <div className="upload-container">
                    <input
                      type="file"
                      ref={videoFileRef}
                      accept="video/*"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          console.log('選擇了視頻文件:', e.target.files[0].name);
                        }
                      }}
                    />
                    <button 
                      type="button"
                      className="btn-secondary"
                      onClick={handleUploadVideo}
                      disabled={uploadingVideo}
                    >
                      {uploadingVideo ? '上傳中...' : '上傳視頻'}
                    </button>
                  </div>
                  
                  {uploadingVideo && (
                    <div className="upload-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-inner" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <span>{uploadProgress}%</span>
                    </div>
                  )}
                  
                  <p className="upload-note">
                    <i className="ri-alert-line"></i>
                    視頻上傳可能需要一些時間，請耐心等待。上傳完成後，您可以預覽視頻。
                  </p>
                </div>
                
                {/* 字幕上傳區域 */}
                <div className="caption-upload-section">
                  <h4>上傳字幕</h4>
                  <p className="upload-info">
                    <i className="ri-information-line"></i> 
                    您可以上傳 SRT 或 VTT 格式的字幕文件，幫助學生更好地理解課程內容。
                  </p>
                  
                  {videoForm.vimeoId ? (
                    <>
                      <div className="caption-form">
                        <div className="form-group">
                          <label htmlFor="captionLanguage">字幕語言</label>
                          <select
                            id="captionLanguage"
                            value={captionForm.language}
                            onChange={(e) => setCaptionForm(prev => ({ ...prev, language: e.target.value }))}
                          >
                            <option value="zh-TW">繁體中文</option>
                            <option value="zh-CN">簡體中文</option>
                            <option value="en">英文</option>
                            <option value="ja">日文</option>
                            <option value="ko">韓文</option>
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="captionName">字幕名稱</label>
                          <input
                            type="text"
                            id="captionName"
                            value={captionForm.name}
                            onChange={(e) => setCaptionForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="例如：中文字幕"
                          />
                        </div>
                        
                        <div className="upload-container">
                          <input
                            type="file"
                            ref={captionFileRef}
                            accept=".srt,.vtt"
                            onChange={(e) => {
                              if (e.target.files[0]) {
                                console.log('選擇了字幕文件:', e.target.files[0].name);
                              }
                            }}
                          />
                          <button 
                            type="button"
                            className="btn-upload-caption"
                            onClick={handleUploadCaption}
                            disabled={uploadingCaption}
                          >
                            {uploadingCaption ? '上傳中...' : '上傳字幕'}
                          </button>
                        </div>
                      </div>
                      
                      {/* 已上傳的字幕列表 */}
                      {captions.length > 0 && (
                        <div className="captions-list">
                          <h5>已上傳的字幕</h5>
                          <ul>
                            {captions.map(caption => (
                              <li key={caption.uri}>
                                <div className="caption-info">
                                  <span className="caption-name">{caption.name}</span>
                                  <span className="caption-language">({caption.language})</span>
                                </div>
                                <button 
                                  type="button" 
                                  className="btn-delete-caption"
                                  onClick={() => handleDeleteCaption(caption.uri.split('/').pop())}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="caption-note">
                      <i className="ri-information-line"></i>
                      請先上傳視頻或輸入 Vimeo ID，然後才能上傳字幕。
                    </p>
                  )}
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={handleCancel}
                    disabled={actionLoading || uploadingVideo}
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={actionLoading || uploadingVideo}
                  >
                    {actionLoading ? (
                      <>
                        <span className="spinner-border-sm"></span>
                        {editingVideoId ? '保存中...' : '添加中...'}
                      </>
                    ) : (
                      editingVideoId ? '保存修改' : '添加視頻'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 視頻預覽模態框 */}
      {previewVideo && (
        <div className="modal-overlay">
          <div className="modal-container video-preview-modal">
            <div className="modal-header">
              <h3>視頻預覽</h3>
              <button 
                className="btn-close"
                onClick={closePreview}
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="video-preview-container">
                {!previewVimeoId ? (
                  <div className="upload-info-message">
                    <i className="ri-information-line"></i>
                    <p>請先選擇要預覽的視頻</p>
                  </div>
                ) : videoProcessing ? (
                  <div className="video-processing">
                    <i className="ri-loader-4-line spinning"></i>
                    <h3>視頻處理中</h3>
                    <p>Vimeo 正在處理您的視頻，這可能需要幾分鐘時間。</p>
                    <button 
                      type="button" 
                      className="btn-check-status"
                      onClick={async () => {
                        const isReady = await checkVideoStatus(previewVimeoId);
                        setVideoProcessing(!isReady);
                      }}
                    >
                      <i className="ri-refresh-line"></i> 檢查視頻狀態
                    </button>
                  </div>
                ) : (
                  <iframe 
                    src={`https://player.vimeo.com/video/${previewVimeoId}`} 
                    width="100%" 
                    height="360" 
                    frameBorder="0" 
                    allow="autoplay; fullscreen" 
                    allowFullScreen
                  ></iframe>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-primary"
                onClick={closePreview}
              >
                關閉預覽
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 添加樣式 */}
      <style jsx>{`
        .section-item {
          margin-bottom: 20px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background-color: #f5f5f5;
          cursor: pointer;
        }
        
        .section-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .section-number {
          font-weight: bold;
          color: #666;
        }
        
        .section-title {
          margin: 0;
          font-size: 18px;
        }
        
        .video-count {
          font-size: 14px;
          color: #666;
          margin-left: 10px;
        }
        
        .section-actions {
          display: flex;
          gap: 10px;
        }
        
        .section-content {
          padding: 15px;
          background-color: #fff;
          border-top: 1px solid #e0e0e0;
          max-height: 1000px; /* 設置一個較大的最大高度 */
          overflow-y: auto; /* 如果內容過多，添加滾動條 */
          transition: max-height 0.3s ease;
        }
        
        /* 確保章節內容在展開時可見 */
        .section-content.expanded {
          display: block;
          max-height: 1000px;
        }
        
        /* 確保章節內容在收起時隱藏 */
        .section-content.collapsed {
          display: none;
          max-height: 0;
        }
        
        .videos-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .video-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          background-color: #fff;
        }
        
        .video-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .video-number {
          font-weight: bold;
          color: #666;
        }
        
        .video-title-wrapper {
          display: flex;
          flex-direction: column;
        }
        
        .video-title {
          margin: 0;
          font-size: 16px;
        }
        
        .video-duration {
          font-size: 14px;
          color: #666;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .video-free-badge {
          font-size: 12px;
          color: #fff;
          background-color: #4caf50;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 10px;
        }
        
        .video-actions {
          display: flex;
          gap: 5px;
        }
        
        .no-videos {
          text-align: center;
          padding: 20px;
          color: #666;
        }
        
        .btn-add-first-video {
          margin-top: 10px;
          padding: 8px 16px;
          background-color: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }
        
        .btn-add-first-video:hover {
          background-color: #1976d2;
        }
      `}</style>
    </AdminLayout>
  );
}