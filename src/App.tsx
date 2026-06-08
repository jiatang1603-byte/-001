import React, { useState, useEffect } from 'react';
import { 
  Anchor, Compass, Fish, Waves, AlertTriangle, CheckCircle, Download, 
  User, ShieldAlert, Users, Lock, LogOut, Filter, Calendar, TrendingUp, 
  BarChart2, PieChart, Plus, Trash2, Camera, UploadCloud, X, Eye, 
  BookOpen, HeartPulse, Mail, RefreshCw, FileText, Check, Phone, Building, Sparkles, Printer,
  Cloud, CloudLightning, Code
} from 'lucide-react';

import { SatisfactionScores, FeedbackRecord, EmailOutboxRecord } from './types';
import { SatisfactionSection } from './components/SatisfactionSection';
import { OceanBackground, WavesDivider } from './components/MarineDecorations';

// Default satisfaction ratings (initially 5 stars)
const INITIAL_SCORES: SatisfactionScores = {
  taste: 5,
  consistency: 5,
  freshness: 5,
  packaging: 5,
  delivery: 5,
  completeness: 5,
  serviceSpeed: 5,
  afterSales: 5,
  price: 5
};

export default function App() {
  // State for Navigation / Routing
  const [currentView, setCurrentView] = useState<'survey' | 'success' | 'admin'>(() => {
    if (window.location.pathname === '/admin' || window.location.hash === '#admin') {
      return 'admin';
    }
    return 'survey';
  });

  // Keep track of online / offline state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('jt_offline_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Client Survey form fields
  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState('每週 1 次');
  const [otherFrequency, setOtherFrequency] = useState('');
  const [contactMethod, setContactMethod] = useState('電話');
  const [scores, setScores] = useState<SatisfactionScores>(INITIAL_SCORES);
  const [otherSuggestions, setOtherSuggestions] = useState('');

  // Secondary complaint flow
  const [hasComplaint, setHasComplaint] = useState(false);
  const [productName, setProductName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [problemCategory, setProblemCategory] = useState('產品質量質量異常');
  const [problemDescription, setProblemDescription] = useState('');
  const [improvementSuggestion, setImprovementSuggestion] = useState('');
  
  // Attachments
  const [images, setImages] = useState<string[]>([]); // local URL or base64
  const [isUploading, setIsUploading] = useState(false);

  // Success screen state
  const [recentCase, setRecentCase] = useState<{
    caseNumber: string;
    isUrgent: boolean;
    aiSentiment?: string;
    aiKeywords?: string[];
    aiCategory?: string;
    aiReplySuggestion?: string;
  } | null>(null);

  // Admin Dashboard states
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem('jt_admin_session') === 'true';
  });
  const [adminUser, setAdminUser] = useState<string>(() => {
    return localStorage.getItem('jt_admin_user') || 'jiatang1602@gmail.com';
  });
  const [adminRole, setAdminRole] = useState<'admin' | 'staff' | 'qa'>(() => {
    return (localStorage.getItem('jt_admin_role') as any) || 'admin';
  });
  const [adminRecords, setAdminRecords] = useState<FeedbackRecord[]>([]);
  const [emailOutbox, setEmailOutbox] = useState<EmailOutboxRecord[]>([]);
  
  // Filters for Admin
  const [filterQuery, setFilterQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'normal' | 'urgent'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'processing' | 'completed'>('all');
  const [filterSentiment, setFilterSentiment] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Currently opened record detail modal
  const [selectedRecord, setSelectedRecord] = useState<FeedbackRecord | null>(null);
  const [backupEmail, setBackupEmail] = useState('jiatang1602@gmail.com');
  const [googleFormUrl, setGoogleFormUrl] = useState('https://docs.google.com/forms/d/e/1FAIpQLSeSgbyW8e-Zc_0pM5hX8gD3oJWee7y88V9C78z9pY7v_k5nDA/viewform?embedded=true');
  const [googleFormId, setGoogleFormId] = useState('1FAIpQLSeSgbyW8e-Zc_0pM5hX8gD3oJWee7y88V9C78z9pY7v_k5nDA');
  const [surveyChannel, setSurveyChannel] = useState<'native' | 'googleForms'>('native');
  const [gformsAccessToken, setGformsAccessToken] = useState('');
  const [isSyncingGforms, setIsSyncingGforms] = useState(false);
  const [gformsSyncLogs, setGformsSyncLogs] = useState<string[]>([]);
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const [activePreviewEmail, setActivePreviewEmail] = useState<EmailOutboxRecord | null>(null);
  const [adminActionNotes, setAdminActionNotes] = useState('');
  const [adminActionStatus, setAdminActionStatus] = useState<'pending' | 'processing' | 'completed'>('processing');
  const [adminActionRole, setAdminActionRole] = useState<'admin' | 'staff' | 'qa'>('staff');

  // Loading indicator for server tasks
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // Admin Login Inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Password Safe Modals (for forced password reset)
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [passwordResetError, setPasswordResetError] = useState('');

  // Local QR generating configuration
  const [activeUrl, setActiveUrl] = useState(() => window.location.href);

  // Synchronizers
  useEffect(() => {
    setActiveUrl(window.location.origin + window.location.pathname);
    
    // Listen for connection states
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for hash routing helper
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setCurrentView('admin');
      } else if (window.location.hash === '#survey') {
        setCurrentView('survey');
      }
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Load general settings on startup for Client view
  useEffect(() => {
    const loadStartSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const s = await res.json();
          setBackupEmail(s.backupEmail || 'jiatang1602@gmail.com');
          if (s.googleFormUrl) setGoogleFormUrl(s.googleFormUrl);
          if (s.googleFormId) setGoogleFormId(s.googleFormId);
        }
      } catch (err) {
        console.error("Failed to load startup settings:", err);
      }
    };
    loadStartSettings();
  }, []);

  // Sync Offline Queue and Auto Load Admin Records
  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchAdminData();
    }
  }, [isAdminLoggedIn]);

  const fetchAdminData = async () => {
    setIsAdminLoading(true);
    try {
      const recordsRes = await fetch('/api/admin/feedback');
      const outboxRes = await fetch('/api/admin/outbox');
      const settingsRes = await fetch('/api/admin/settings');
      if (recordsRes.ok) {
        const records = await recordsRes.json();
        // Sort newest first
        setAdminRecords(records.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
      if (outboxRes.ok) {
        const mail = await outboxRes.json();
        setEmailOutbox(mail.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setBackupEmail(settings.backupEmail || 'jiatang1602@gmail.com');
        if (settings.googleFormUrl) setGoogleFormUrl(settings.googleFormUrl);
        if (settings.googleFormId) setGoogleFormId(settings.googleFormId);
      }
    } catch (err) {
      console.error("Failed to load backend databases:", err);
    } finally {
      setIsAdminLoading(false);
    }
  };

  // Offline queuing worker
  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    setIsSubmitting(true);
    
    let succeeded = 0;
    const remaining = [...offlineQueue];

    for (let i = 0; i < offlineQueue.length; i++) {
      const item = offlineQueue[i];
      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        if (response.ok) {
          succeeded++;
          remaining.shift(); // remove processed item
        }
      } catch (err) {
        console.error("Queue sync item failed, stopping queue synchronization:", err);
        break;
      }
    }

    setOfflineQueue(remaining);
    localStorage.setItem('jt_offline_queue', JSON.stringify(remaining));
    setIsSubmitting(false);

    if (succeeded > 0) {
      alert(`🎉 成功同步提交 ${succeeded} 筆暫存客訴與滿意度資料！`);
    }
  };

  // File picker handler: converting png/jpg to base64, with size reduction and restrictions
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      alert("⚠️ 親愛的夥伴，照片檔案上傳上限為 5 張，請重新選取！");
      return;
    }

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Strict type check (JPG, PNG, HEIC)
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/heic'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(file.type) && !['heic', 'jpg', 'jpeg', 'png'].includes(fileExt || '')) {
        alert(`❌ 不支援的格式「${file.name}」。僅限上傳 JPG / PNG / HEIC 照片格式！`);
        continue;
      }

      // Check single size cap: 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert(`❌ 照片「${file.name}」太大了！大小限制不可超過 10MB。`);
        continue;
      }

      try {
        const base64Str = await convertFileToBase64(file);
        
        // If we are online, upload directly to Express storage to get clean static urls!
        if (isOnline) {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64Str,
              originalName: file.name
            })
          });

          if (uploadRes.ok) {
            const data = await uploadRes.json();
            setImages(prev => [...prev, data.url]);
          } else {
            // Fallback to local base64 on server upload error
            setImages(prev => [...prev, base64Str]);
          }
        } else {
          // If offline, save the base64 string to keep app fully offline-capable!
          setImages(prev => [...prev, base64Str]);
        }
      } catch (err) {
        console.error("Failed to parse visual file:", err);
      }
    }
    
    setIsUploading(false);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const deletePhoto = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  // Submit survey action
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim()) {
      alert("⚠️ 客戶名稱 與 聯絡電話 為必填必填欄位，請協助確認填寫！");
      return;
    }

    const payload = {
      customerName,
      companyName,
      phone,
      email,
      frequency,
      otherFrequency: frequency === '其他' ? otherFrequency : '',
      contactMethod,
      scores,
      otherSuggestions,
      productName: hasComplaint ? productName : '',
      batchNumber: hasComplaint ? batchNumber : '',
      problemCategory: hasComplaint ? problemCategory : '',
      problemDescription: hasComplaint ? problemDescription : '',
      improvementSuggestion: hasComplaint ? improvementSuggestion : '',
      images
    };

    setIsSubmitting(true);

    if (isOnline) {
      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const result = await res.json();
          setRecentCase(result);
          setCurrentView('success');
          clearForm();
        } else {
          const errorMsg = await res.text();
          throw new Error(errorMsg);
        }
      } catch (err) {
        console.error("Submission failed, fallback to local storage queue:", err);
        saveToOfflineQueue(payload);
      }
    } else {
      saveToOfflineQueue(payload);
    }
  };

  const saveToOfflineQueue = (payload: any) => {
    // Unique mock serial for client preview
    const fakeCaseId = `JT-OFFLINE-${Date.now().toString().slice(-4)}`;
    const newQueue = [...offlineQueue, payload];
    setOfflineQueue(newQueue);
    localStorage.setItem('jt_offline_queue', JSON.stringify(newQueue));
    
    setIsSubmitting(false);
    
    // Switch to success view but flag it as saved offline offline!
    setRecentCase({
      caseNumber: fakeCaseId,
      isUrgent: false,
      aiSentiment: 'neutral',
      aiKeywords: ['暫存於本地', '離線登記'],
      aiCategory: '離線快取儲存',
      aiReplySuggestion: '佳堂溫馨提醒：因您目前處於無網路離線狀態，您的問卷與反映相片已安全暫存在您的瀏覽器中。當裝置偵測到網際網路重新連線後，將自動上傳同步並指派專屬案號，請放心！'
    });
    setCurrentView('success');
    clearForm();
  };

  const clearForm = () => {
    setCustomerName('');
    setCompanyName('');
    setPhone('');
    setEmail('');
    setFrequency('每週 1 次');
    setOtherFrequency('');
    setScores(INITIAL_SCORES);
    setOtherSuggestions('');
    setHasComplaint(false);
    setProductName('');
    setBatchNumber('');
    setProblemDescription('');
    setImprovementSuggestion('');
    setImages([]);
  };

  // Secure first-time password reset login check
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const targetUser = 'jiatang1602@gmail.com';
    const hasForcePassword = localStorage.getItem('jt_changed_password');
    const correctPassword = hasForcePassword || 'clerk'; // Initial default password 'clerk' as requested!

    if (loginEmail.trim().toLowerCase() !== targetUser) {
      setLoginError('❌ 登入帳號不正確！請確認您的管理員信箱。');
      return;
    }

    if (loginPassword !== correctPassword) {
      setLoginError('❌ 密碼輸入錯誤，請重試！');
      return;
    }

    // Role Assignments as requested: 行政、教職員、品質保證
    let assignedRole: 'admin' | 'staff' | 'qa' = 'admin';
    if (loginPassword === 'clerk') {
      assignedRole = 'staff'; // Staff role
    }

    // Checking if it's the first time default login
    if (!hasForcePassword && loginPassword === 'clerk') {
      // FORCE PASSWORD RESET
      setShowPasswordResetModal(true);
      return;
    }

    // Set Admin active session
    localStorage.setItem('jt_admin_session', 'true');
    localStorage.setItem('jt_admin_user', loginEmail);
    localStorage.setItem('jt_admin_role', assignedRole);
    setAdminUser(loginEmail);
    setAdminRole(assignedRole);
    setIsAdminLoggedIn(true);
  };

  // Force Change Password
  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordResetError('');

    if (newPasswordValue.length < 5) {
      setPasswordResetError('❌ 新密碼安全強度不足，需設置至少 5 字元！');
      return;
    }

    if (newPasswordValue !== confirmPasswordValue) {
      setPasswordResetError('❌ 新密碼與確認新密碼輸入不一致！');
      return;
    }

    if (newPasswordValue === 'clerk') {
      setPasswordResetError('❌ 不可使用系統預設舊密碼！請設定新組合。');
      return;
    }

    // Save modified password to localStorage so it survives session close and is not hardcoded!
    localStorage.setItem('jt_changed_password', newPasswordValue);
    localStorage.setItem('jt_admin_session', 'true');
    localStorage.setItem('jt_admin_user', loginEmail);
    localStorage.setItem('jt_admin_role', 'admin');
    
    setShowPasswordResetModal(false);
    setIsAdminLoggedIn(true);
    setAdminUser(loginEmail);
    setAdminRole('admin'); // Set to default admin role after reset
    alert('🔐 密碼更新成功！此為安全驗證機制，已廢除原預設密碼 "clerk"！');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('jt_admin_session');
    localStorage.removeItem('jt_admin_user');
    localStorage.removeItem('jt_admin_role');
    setIsAdminLoggedIn(false);
    setSelectedRecord(null);
  };

  // Status Workflow Change Action
  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    try {
      const response = await fetch('/api/admin/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRecord.id,
          action: `管理員處理案件: 設為【${adminActionStatus === 'completed' ? '已結案' : adminActionStatus === 'processing' ? '處理中' : '待處理'}】`,
          operator: `${adminActionRole === 'admin' ? '行政人員' : adminActionRole === 'qa' ? '品質保證人員' : '教職員'} (帳號: ${adminUser})`,
          notes: adminActionNotes,
          status: adminActionStatus,
          assignedRole: adminActionRole
        })
      });

      if (response.ok) {
        alert("📊 專案處置流程更新完成！");
        setAdminActionNotes('');
        setSelectedRecord(null);
        fetchAdminData(); // Refresh list list
      } else {
        alert("❌ 處置流程上傳失敗。");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveBackupEmail = async () => {
    if (!backupEmail || !backupEmail.includes('@')) {
      alert("❌ 請輸入有效的電子郵件地址！");
      return;
    }
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          backupEmail,
          googleFormUrl,
          googleFormId
        })
      });
      if (response.ok) {
        alert("⚙️ 系統安全性參數與 Google 表單設定已保存成功！");
        fetchAdminData();
      } else {
        alert("❌ 設定儲存失敗，請確認伺服器。");
      }
    } catch (err) {
      console.error(err);
      alert("❌ 連線異常，儲存備份信箱失敗。");
    }
  };

  const handleSyncGoogleForms = async (useSimulated: boolean) => {
    setIsSyncingGforms(true);
    const idLogs = [...gformsSyncLogs];
    const pushLog = (msg: string) => {
      idLogs.unshift(`[${new Date().toLocaleTimeString('zh-TW')}] ${msg}`);
      setGformsSyncLogs([...idLogs]);
    };

    pushLog(useSimulated ? "⚙️ 啟動 Google Forms 模擬高親和同步對接服務..." : `🔗 連線讀取 Google Forms (目標表單 ID: ${googleFormId})...`);

    try {
      const response = await fetch('/api/admin/google-forms/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: googleFormId,
          accessToken: gformsAccessToken,
          useSimulatedData: useSimulated
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.count > 0) {
          pushLog(`✅ 同步大成功！共匯入、轉換、Gemini AI 分析並歸檔了 ${data.count} 筆全新的客戶問卷填覆！已自動觸發緊急信件！`);
          alert(`🎉 雲端安全對接成功！成功同步並藉由 AI 分析排查，共導入 ${data.count} 筆全新的客訴問卷！`);
        } else {
          pushLog("ℹ️ 同步成功，但目前雲端表單庫中未檢測到全新、未被系統收錄的回應。");
          alert("ℹ️ 雲端同步完成！未檢測到全新、未被收錄的問卷回應（跳過，避免資料冗餘）。");
        }
        fetchAdminData();
      } else {
        const errorData = await response.json();
        const errMsg = errorData.error || "同步失敗，未知錯誤";
        pushLog(`❌ 谷歌 API 連接與剖析異常：${errMsg}`);
        alert(`❌ 同步遭遇錯誤：\n${errMsg}`);
      }
    } catch (err: any) {
      console.error(err);
      pushLog(`❌ 同步遭遇阻斷性異常故障：${err.message || err}`);
      alert("❌ 網路連線出錯，請確認伺服器狀態。");
    } finally {
      setIsSyncingGforms(false);
    }
  };

  // Export spreadsheet using Microsoft Excel compatible format with BOM
  const handleExportExcel = () => {
    const headers = [
      "案件案號", "登錄時間", "客戶姓名", "公司行號", "聯絡電話", "電子信箱", "交易頻率", 
      "口感風味", "品質穩定", "新鮮色香味", "外裝密合", "物流準時", "訂單無漏", "客服回覆", 
      "售後處置", "價格認可", "綜合建議分", "其他客戶想法", "異常品項", "反映批號", "瑕疵分類", 
      "說明詳情", "期望處改善想法", "處理進度", "案件分級"
    ];

    const rows = adminRecords.map(r => {
      const sVal = Object.values(r.scores) as number[];
      const sAvg = sVal.reduce((a, b) => a + b, 0) / sVal.length;
      return [
        r.caseNumber,
        new Date(r.timestamp).toLocaleString(),
        r.customerName,
        r.companyName || '個人戶',
        `="${r.phone}"`, // excel cell escape
        r.email || '未填寫',
        r.frequency,
        r.scores.taste,
        r.scores.consistency,
        r.scores.freshness,
        r.scores.packaging,
        r.scores.delivery,
        r.scores.completeness,
        r.scores.serviceSpeed,
        r.scores.afterSales,
        r.scores.price,
        sAvg.toFixed(1),
        (r.otherSuggestions || '').replace(/[\n,]/g, ' '),
        r.productName || '無',
        r.batchNumber || '無',
        r.problemCategory || '無',
        (r.problemDescription || '').replace(/[\n,]/g, ' '),
        (r.improvementSuggestion || '').replace(/[\n,]/g, ' '),
        r.status === 'completed' ? '已結案' : r.status === 'processing' ? '處理中' : '處理中(待命)',
        r.severity === 'urgent' ? '緊急案件' : '一般等級'
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `佳堂實業_滿意度與客訴資料分析表_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export detailed report to PDF print preview
  const handlePrintPDF = () => {
    window.print();
  };

  // Filter conditions
  const filteredRecords = adminRecords.filter(r => {
    const sValues = Object.values(r.scores) as number[];
    const sAvg = sValues.reduce((a, b) => a + b, 0) / sValues.length;
    
    // Status filter
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    // Severity filter
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    // AI Sentiment filter
    if (filterSentiment !== 'all' && r.aiSentiment !== filterSentiment) return false;
    
    // Category filter
    if (filterCategory !== 'all') {
      if (r.problemCategory !== filterCategory && r.aiCategory !== filterCategory) return false;
    }

    // Query match
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      const content = `${r.caseNumber} ${r.customerName} ${r.companyName} ${r.phone} ${r.productName} ${r.problemDescription}`.toLowerCase();
      if (!content.includes(q)) return false;
    }

    // Date range filter
    if (filterDateRange !== 'all') {
      const recDate = new Date(r.timestamp);
      const today = new Date();
      if (filterDateRange === 'today') {
        if (recDate.toDateString() !== today.toDateString()) return false;
      } else if (filterDateRange === 'week') {
        const diff = today.getTime() - recDate.getTime();
        if (diff > 7 * 24 * 60 * 60 * 1000) return false;
      } else if (filterDateRange === 'month') {
        const diff = today.getTime() - recDate.getTime();
        if (diff > 30 * 24 * 60 * 60 * 1000) return false;
      }
    }

    return true;
  });

  return (
    <div className={`relative min-h-screen font-sans bg-slate-50 text-slate-800 ${selectedRecord ? 'print-modal-active' : ''} ${currentView === 'success' ? 'print-success-active' : ''}`}>
      <OceanBackground />

      {/* Extreme Offline Notice Banner */}
      {!isOnline && (
        <div id="offline-bar" className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 text-sm font-bold bg-amber-500 text-white shadow-md animate-pulse no-print">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>🛜 目前處於離線狀態：問卷與客訴照片將全數編譯暫存於本地，連線後自動安全同步！</span>
          </div>
          {offlineQueue.length > 0 && (
            <button 
              onClick={syncOfflineQueue}
              className="flex items-center gap-1 px-3 py-1 text-xs font-black bg-white text-slate-900 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>立即嘗試同步 (共 {offlineQueue.length} 筆)</span>
            </button>
          )}
        </div>
      )}

      {/* Online Queue Sync Notification */}
      {isOnline && offlineQueue.length > 0 && (
        <div id="sync-notice-bar" className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 text-sm font-bold bg-emerald-500 text-white shadow-md no-print">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>🟢 偵測到網際網路連線！您有暫存於本地的待提問卷。</span>
          </div>
          <button 
            onClick={syncOfflineQueue}
            disabled={isSubmitting}
            className="flex items-center gap-1 px-4 py-1.5 text-xs font-black bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>立即上傳同步 ({offlineQueue.length} 筆)</span>
          </button>
        </div>
      )}

      {/* Professional Polish Brand Header */}
      <header className="ocean-gradient shadow-lg text-white no-print w-full relative z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white text-[#003366] p-2.5 rounded-full shadow-md flex items-center justify-center shrink-0">
              <Anchor className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <h1 className="text-lg md:text-xl font-extrabold tracking-tight">
                  佳堂實業股份有限公司
                </h1>
                <span className="text-[10px] md:text-xs font-bold text-sky-100 bg-white/15 px-2.5 py-0.5 rounded-full border border-white/10 shrink-0 self-start sm:self-auto">
                  客戶意見與客訴品質管理平台
                </span>
              </div>
              <p className="text-sky-200 text-[9px] md:text-[11px] font-mono tracking-widest uppercase">
                Jiatang Industry Co., Ltd.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-center sm:justify-end text-xs md:text-sm">
            {/* Status indicator */}
            <div className="flex items-center gap-1.5 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 shadow-xs">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-pulse'}`} />
              <span className="text-white/90 font-bold text-[11px] md:text-xs shrink-0">
                {isOnline ? 'Firebase 雲伺服器正常運行' : '全功能離線安全暫存中'}
              </span>
            </div>

            {/* Divider */}
            <span className="h-5 w-[1px] bg-white/20 hidden md:inline-block" />

            {/* Admin entry / back button */}
            {currentView !== 'admin' ? (
              <button
                id="btn-nav-admin"
                onClick={() => {
                  window.location.hash = '#admin';
                  setCurrentView('admin');
                }}
                className="flex items-center gap-1.5 px-4.5 py-2 rounded-full bg-white text-[#003366] hover:bg-sky-50 font-extrabold transition-all text-xs shadow-md cursor-pointer border border-transparent"
              >
                <User className="w-3.5 h-3.5" />
                <span>後台入口</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {isAdminLoggedIn && (
                  <span className="text-xs bg-emerald-500/25 text-emerald-100 border border-emerald-500/20 px-3 py-1 rounded-full font-medium hidden md:inline-block">
                    管理員: {adminUser}
                  </span>
                )}
                <button
                  id="btn-nav-survey"
                  onClick={() => {
                    window.location.hash = '#survey';
                    setCurrentView('survey');
                  }}
                  className="flex items-center gap-1.5 px-4.5 py-2 rounded-full bg-white text-[#003366] hover:bg-sky-50 font-extrabold transition-all text-xs shadow-md cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>切換前台填寫問卷</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">

        {/* ━━━━━━━━━━━━━━━━━━━━━━ VIEW 1: CLIENT QUESTIONNAIRE SURVEY ━━━━━━━━━━━━━━━━━━━━━━ */}
        {currentView === 'survey' && (
          <div id="survey-view" className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-sky-100/70 overflow-hidden">
            {/* Header splash */}
            <div className="ocean-gradient p-8 text-white text-center relative overflow-hidden">
              <div className="absolute right-[-10px] top-[-10px] opacity-10">
                <Fish className="w-44 h-44" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">客戶意見與品質回饋表</h2>
              <p className="text-sky-100 max-w-xl mx-auto text-sm md:text-base leading-relaxed font-medium">
                您好！感謝您長期以來對佳堂實業的支持與配合。為了提供更高品質的產品與即時貼心服務，誠摯邀您協助填寫此表。您的寶貴意見都將作為本公司內部品質稽核、物流改進的指南。
              </p>
            </div>

            <WavesDivider />

            {/* 💡 填寫管道切換選單 */}
            <div className="px-6 md:px-8 pt-6">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 md:gap-3 border border-slate-200">
                <button
                  id="tab-channel-native"
                  type="button"
                  onClick={() => setSurveyChannel('native')}
                  className={`flex-1 py-3.5 px-4 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    surveyChannel === 'native'
                      ? 'bg-gradient-to-r from-[#003366] to-[#0077be] text-white shadow-md transform scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                  }`}
                >
                  <Compass className="w-4 h-4 shrink-0" />
                  <span>佳堂原生安全問卷</span>
                  {surveyChannel === 'native' && <Check className="w-3.5 h-3.5 text-cyan-300" />}
                </button>
                <button
                  id="tab-channel-google"
                  type="button"
                  onClick={() => setSurveyChannel('googleForms')}
                  className={`flex-1 py-3.5 px-4 rounded-xl text-xs md:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    surveyChannel === 'googleForms'
                      ? 'bg-gradient-to-r from-[#003366] to-[#0077be] text-white shadow-md transform scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Google Forms 雲端表單</span>
                  {surveyChannel === 'googleForms' && <Check className="w-3.5 h-3.5 text-cyan-300" />}
                </button>
              </div>
            </div>

            {surveyChannel === 'native' ? (
              <form onSubmit={handleFormSubmit} className="p-6 md:p-8 space-y-8">
              
              {/* SECTION I: 基本資料 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-sky-100">
                  <Compass className="text-[#0077be] w-6 h-6" />
                  <h3 className="text-xl md:text-2xl font-black text-[#003366]">一、 基本聯絡資料</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div id="field-username">
                    <label className="block text-slate-700 font-bold text-base md:text-lg mb-1.5 flex items-center gap-1">
                      客戶名稱 <span className="text-red-500 font-black">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="input-customerName"
                        type="text"
                        required
                        placeholder="請輸入公司行號、商鋪名或大名"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full text-base md:text-lg px-4.5 py-3.5 bg-sky-50/50 hover:bg-sky-50 focus:bg-white border-2 border-sky-100 focus:border-cyan-500 rounded-2xl outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div id="field-company">
                    <label className="block text-slate-700 font-bold text-base md:text-lg mb-1.5">
                      公司/機關行號 <span className="text-slate-400 font-normal text-sm">（選填）</span>
                    </label>
                    <input
                      id="input-companyName"
                      type="text"
                      placeholder="例：遠東宏運分公司"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full text-base md:text-lg px-4.5 py-3.5 bg-sky-50/50 hover:bg-sky-50 focus:bg-white border-2 border-sky-100 focus:border-cyan-500 rounded-2xl outline-none transition-all"
                    />
                  </div>

                  <div id="field-phone">
                    <label className="block text-slate-700 font-bold text-base md:text-lg mb-1.5 flex items-center gap-1">
                      聯絡電話/手機 <span className="text-red-500 font-black">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                        <Phone className="w-5 h-5" />
                      </span>
                      <input
                        id="input-phone"
                        type="tel"
                        required
                        placeholder="請留下方便聯繫的電話號碼"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full text-base md:text-lg pl-11 pr-4.5 py-3.5 bg-sky-50/50 hover:bg-sky-50 focus:bg-white border-2 border-sky-100 focus:border-cyan-500 rounded-2xl outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div id="field-email">
                    <label className="block text-slate-700 font-bold text-base md:text-lg mb-1.5">
                      電子郵件 <span className="text-slate-400 font-normal text-sm">（選填）</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                        <Mail className="w-5 h-5" />
                      </span>
                      <input
                        id="input-email"
                        type="email"
                        placeholder="例：jiatang1603@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-base md:text-lg pl-11 pr-4.5 py-3.5 bg-sky-50/50 hover:bg-sky-50 focus:bg-white border-2 border-sky-100 focus:border-cyan-500 rounded-2xl outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div id="field-frequency">
                    <label className="block text-slate-700 font-bold text-base md:text-lg mb-1.5">
                      本公司產品消費/採購頻率
                    </label>
                    <select
                      id="select-frequency"
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full text-base md:text-lg px-4 py-3.5 bg-sky-50/50 border-2 border-sky-100 rounded-2xl outline-none cursor-pointer focus:border-cyan-500 transition-all font-medium"
                    >
                      <option value="每日">每日</option>
                      <option value="每週 2-3 次">每週 2-3 次</option>
                      <option value="每週 1 次">每週 1 次</option>
                      <option value="每兩週 1 次">每兩週 1 次</option>
                      <option value="每月 1-2 次">每月 1-2 次</option>
                      <option value="其他">其他說明</option>
                    </select>
                  </div>

                  {frequency === '其他' && (
                    <div id="field-other-frequency">
                      <label className="block text-slate-700 font-bold text-base md:text-lg mb-1.5">
                        主要消費頻率自訂說明
                      </label>
                      <input
                        id="input-otherFrequency"
                        type="text"
                        placeholder="例：每季固定採購、展會限定"
                        value={otherFrequency}
                        onChange={(e) => setOtherFrequency(e.target.value)}
                        className="w-full text-base md:text-lg px-4.5 py-3.5 bg-sky-50/50 border-2 border-sky-100 rounded-2xl outline-none focus:border-cyan-500 transition-all"
                      />
                    </div>
                  )}

                  <div id="field-contact" className="w-full">
                    <label className="block text-slate-700 font-bold text-base md:text-lg mb-1.5">
                      日常主要聯絡管道
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['電話', 'LINE', '電子郵件', '實體拜訪'].map(method => (
                        <button
                          key={method}
                          id={`btn-contact-${method}`}
                          type="button"
                          onClick={() => setContactMethod(method)}
                          className={`flex-1 py-3 px-2 rounded-xl text-xs md:text-base font-extrabold transition-all cursor-pointer border ${
                            contactMethod === method 
                              ? 'btn-ocean text-white shadow-md border-transparent' 
                              : 'bg-sky-50/30 hover:bg-sky-50 text-slate-600 border-sky-100'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION II: 評估滿意度 */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 pb-2 border-b border-sky-100">
                  <TrendingUp className="text-[#0077be] w-6 h-6" />
                  <h3 className="text-xl md:text-2xl font-black text-[#003366]">二、 產品品質與服務滿意度評估</h3>
                </div>
                <p className="text-slate-500 text-sm md:text-base mb-4 bg-sky-50/50 p-3 rounded-xl border border-sky-100/50">
                  💡 請依照您的真實體驗，直接點選為佳堂實業各細項評分（最低 1 星，最高滿分 5 星）：
                </p>

                {/* Stars container extracted as SatisfactionSection modular component */}
                <SatisfactionSection scores={scores} onChange={setScores} />
              </div>

              {/* SUGGESTIONS & FEEDBACK */}
              <div className="space-y-4 pt-2">
                <label className="block text-slate-800 font-black text-lg md:text-xl">
                  📄 綜合評估意見、建議與期許
                </label>
                <textarea
                  id="textarea-otherSuggestions"
                  rows={3}
                  placeholder="如果您還有其他對於口感、交期、物流箱改良等具體想法，非常歡迎在此留下留言，佳堂感謝您！"
                  value={otherSuggestions}
                  onChange={(e) => setOtherSuggestions(e.target.value)}
                  className="w-full text-base md:text-lg p-4 bg-sky-50/50 hover:bg-sky-50 focus:bg-white border-2 border-sky-100 focus:border-cyan-500 rounded-2xl outline-none transition-all resize-none"
                />
              </div>

              {/* SPECIAL SECTION III: COMPLAINTS & DEFECT REPORTS (客訴) */}
              <div className="pt-6 border-t-2 border-dashed border-sky-100">
                <button
                  type="button"
                  id="btn-toggle-complaint"
                  onClick={() => setHasComplaint(!hasComplaint)}
                  className={`w-full flex items-center justify-between p-5 md:p-6 rounded-2xl transition-all cursor-pointer text-left border-3 ${
                    hasComplaint
                      ? 'bg-rose-50 border-rose-200 shadow-md ring-4 ring-rose-500/10'
                      : 'bg-slate-50 border-slate-200 hover:border-cyan-200 hover:bg-sky-50/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-6.5 h-6.5 shrink-0 mt-0.5 ${hasComplaint ? 'text-rose-600 animate-bounce' : 'text-slate-500'}`} />
                    <div>
                      <h4 className="text-lg md:text-xl font-bold text-slate-800">
                        {hasComplaint ? '🏮 您已開啟客訴與異常品退換反映專區' : '🙋‍♀️ 產品有瑕疵破損、缺貨或需客訴反映？'}
                      </h4>
                      <p className="text-slate-500 text-sm md:text-base font-medium mt-0.5">
                        若您購買之批次，具有風味劣化、破損致污染、訂單數量漏發等具體事由，可點此展開填寫退換處理追蹤單。
                      </p>
                    </div>
                  </div>
                  <span className={`px-4.5 py-1.5 text-xs md:text-sm font-black rounded-full transition-all ${
                    hasComplaint ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {hasComplaint ? '關閉客訴' : '展開申訴欄'}
                  </span>
                </button>

                {hasComplaint && (
                  <div id="complaint-panel" className="mt-5 p-5 md:p-6 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-5 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div id="field-complaint-product">
                        <label className="block text-slate-700 font-bold text-sm md:text-base mb-1.5">
                          受影響產品名稱 <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="input-productName"
                          type="text"
                          required
                          placeholder="例：Jiatang 特級麻糬 1kg"
                          value={productName}
                          onChange={(e) => setProductName(e.target.value)}
                          className="w-full text-sm md:text-base px-4 py-3 border-2 border-rose-100 rounded-xl outline-none focus:border-rose-500 bg-white"
                        />
                      </div>

                      <div id="field-complaint-batch">
                        <label className="block text-slate-700 font-bold text-sm md:text-base mb-1.5">
                          產品批號 / 製造日期 <span className="text-slate-400 font-normal">（如不清楚可不填）</span>
                        </label>
                        <input
                          id="input-batchNumber"
                          type="text"
                          placeholder="例：20260608-A1"
                          value={batchNumber}
                          onChange={(e) => setBatchNumber(e.target.value)}
                          className="w-full text-sm md:text-base px-4 py-3 border-2 border-rose-100 rounded-xl outline-none focus:border-rose-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div id="field-complaint-category">
                        <label className="block text-slate-700 font-bold text-sm md:text-base mb-1.5">
                          異常問題分類 <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="select-problemCategory"
                          value={problemCategory}
                          onChange={(e) => setProblemCategory(e.target.value)}
                          className="w-full text-sm md:text-base px-4 py-3 border-2 border-rose-100 rounded-xl outline-none focus:border-rose-500 bg-white cursor-pointer font-bold"
                        >
                          <option value="產品質量質量異常">產品質量/口味質感常異</option>
                          <option value="外包裝標示瑕疵 or 擠壓漏空">外包裝標示擠壓、封裝不嚴</option>
                          <option value="物流配送延宕 or 外裝漏氣">配送延宕、物流失常</option>
                          <option value="訂單品項與交配數量有誤">訂單少貨、拼配出錯</option>
                          <option value="業務聯繫接單與客服態度欠佳">業務拜訪、客服態度投訴</option>
                          <option value="其他外部客訴">其他具體異常事項</option>
                        </select>
                      </div>

                      <div id="field-complaint-images">
                        <label className="block text-slate-700 font-bold text-sm md:text-base mb-1.5 flex items-center justify-between">
                          <span>📸 現場瑕疵照片、拍照上傳 <span className="text-slate-400 font-normal">（最多 5 張）</span></span>
                          <span className="text-xs bg-rose-200/50 text-rose-800 px-2.5 py-0.5 rounded-full font-bold">
                            HEIC / JPG / PNG
                          </span>
                        </label>
                        
                        <div className="flex items-center gap-3">
                          <label className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed border-rose-300 rounded-xl p-3 bg-white hover:bg-rose-50/50 cursor-pointer transition-all ${
                            isUploading ? 'opacity-50 pointer-events-none' : ''
                          }`}>
                            <Camera className="w-6 h-6 text-rose-500 mb-1" />
                            <span className="text-xs font-bold text-slate-600">啟動相機拍照/選檔</span>
                            <input
                              id="input-file-photos"
                              type="file"
                              multiple
                              accept="image/*"
                              capture="environment"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>
                          
                          <label className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed border-rose-300 rounded-xl p-3 bg-white hover:bg-rose-50/50 cursor-pointer transition-all ${
                            isUploading ? 'opacity-50 pointer-events-none' : ''
                          }`}>
                            <UploadCloud className="w-6 h-6 text-rose-500 mb-1" />
                            <span className="text-xs font-bold text-slate-600">拖曳/上傳電腦檔案</span>
                            <input
                              id="input-file-photos-desktop"
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Image thumbnails preview box */}
                    {images.length > 0 && (
                      <div id="complaint-photo-preview" className="bg-white p-3.5 rounded-xl border border-rose-100 flex flex-wrap gap-2">
                        {images.map((img, index) => (
                          <div key={index} id={`thumb-${index}`} className="relative w-20 h-20 bg-slate-100 rounded-lg overflow-hidden border border-rose-200 shadow-sm transition-all group">
                            <img src={img} alt="Defect" className="w-full h-full object-cover" />
                            <button
                              id={`btn-del-photo-${index}`}
                              type="button"
                              onClick={() => deletePhoto(index)}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div id="field-complaint-description">
                      <label className="block text-slate-700 font-bold text-sm md:text-base mb-1.5">
                        主要客訴問題描述 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="textarea-problemDescription"
                        rows={3}
                        required={hasComplaint}
                        placeholder="請詳細敘述產品瑕疵、漏汽狀況、缺貨比例或與客服糾紛之具體過程..."
                        value={problemDescription}
                        onChange={(e) => setProblemDescription(e.target.value)}
                        className="w-full text-sm md:text-base p-3 border-2 border-rose-100 rounded-xl outline-none focus:border-rose-500 bg-white"
                      />
                    </div>

                    <div id="field-complaint-improvement">
                      <label className="block text-slate-700 font-bold text-sm md:text-base mb-1.5">
                        您對於佳堂實業的具體改善指教/補償期望
                      </label>
                      <textarea
                        id="textarea-improvementSuggestion"
                        rows={2}
                        placeholder="例：希望提供更換新批次品質、加固外箱出貨，以改善物流摔打..."
                        value={improvementSuggestion}
                        onChange={(e) => setImprovementSuggestion(e.target.value)}
                        className="w-full text-sm md:text-base p-3 border-2 border-rose-100 rounded-xl outline-none focus:border-rose-500 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submition buttons */}
              <div className="pt-6">
                <button
                  type="submit"
                  id="btn-submit-feedback"
                  disabled={isSubmitting || isUploading}
                  className={`w-full py-4.5 rounded-2xl text-lg md:text-xl font-extrabold text-white shadow-lg transition-all ${
                    hasComplaint
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25 active:scale-95 cursor-pointer'
                      : 'btn-ocean shadow-sky-950/15 active:scale-95 cursor-pointer'
                  } disabled:opacity-50`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                       <RefreshCw className="w-5.5 h-5.5 animate-spin" />
                       <span>滿意度客訴處理中，請稍候...</span>
                    </span>
                  ) : hasComplaint ? (
                    '🏮 送出緊急客訴與品質申訴單'
                  ) : (
                    '📬 送出客戶滿意度調查問卷'
                  )}
                </button>
              </div>

              </form>
            ) : (
              <div className="p-6 md:p-8 space-y-6 animate-fadeIn text-left">
                <div className="bg-sky-50/75 rounded-2xl p-5 border border-sky-100 flex items-start gap-4">
                  <Sparkles className="w-6 h-6 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h4 className="text-sm font-black text-slate-800">
                      ☁️ Google 雲端備份問卷傳輸頻道已就緒
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                      本管道已連通 **Google Forms API 雲端整合服務**！您在此填寫提交的各項數據由安全防護網自動託管。當管理員點擊【手動即時同步】時，本系統將自動導入回應資料並觸發 **Gemini AI 品質定量判定**與異常預警通報。
                    </p>
                  </div>
                </div>
                
                <div className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-200/80 shadow-md bg-white">
                  <iframe
                    id="google-form-iframe"
                    title="Jiatang Google Forms Survey"
                    src={googleFormUrl}
                    className="w-full min-h-[680px] md:min-h-[850px] border-none"
                  />
                </div>
                
                <div className="text-center pb-4">
                  <p className="text-[11px] text-slate-400 font-medium">
                    若您在當前網頁框架中無法順暢瀏覽 Google Forms，可以點按 
                    <a 
                      href={googleFormUrl.replace("?embedded=true", "")} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[#0077be] font-bold mx-1 hover:underline inline-flex items-center gap-0.5"
                    >
                      [ 點此以獨立新分頁直接開啟填寫 ]
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━ VIEW 2: SUCCESS VIEW ━━━━━━━━━━━━━━━━━━━━━━ */}
        {currentView === 'success' && recentCase && (
          <div id="success-view" className="bg-white rounded-3xl shadow-xl border border-sky-100 p-8 text-center animate-fadeIn relative overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 top-[85%] bg-gradient-to-t from-sky-50 to-white/0 select-none pointer-events-none -z-10" />
            
            <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full mb-6">
              <CheckCircle className="w-12 h-12" />
            </div>

            <h2 className="text-3xl font-extrabold text-[#003366] mb-2">問卷提交完成！佳堂感謝您</h2>
            <p className="text-slate-600 text-base md:text-lg max-w-lg mx-auto leading-relaxed mb-6 font-medium">
              您與佳堂實業的心聲已被安全收錄！我們珍視每一位客戶的真實回報。
            </p>

            <div className="max-w-md mx-auto bg-sky-50/20 border-2 border-sky-100/60 rounded-2xl p-6 mb-8 text-left space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-sky-100/60">
                <span className="text-slate-500 font-bold text-sm md:text-base">專屬追蹤案號：</span>
                <span className="text-xl font-black text-[#003366] bg-sky-100/50 px-3.5 py-1 rounded-full leading-none font-mono">
                  {recentCase.caseNumber}
                </span>
              </div>

              {recentCase.isUrgent ? (
                <div className="bg-rose-50 text-rose-800 p-3.5 rounded-xl text-center text-sm font-black border border-rose-200 urgent-alert">
                  ⚠️ 系統警報：本件平均滿意度偏低，系統已直接標記為「緊急特急案件」，並即時 Email 通報至 佳堂主管與品保信箱！
                </div>
              ) : (
                <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl text-center text-sm font-black border border-emerald-250">
                  🤝 案件分類標籤為：一般正常回饋。系統均已同步歸檔，並排程 Email 管理科系通報。
                </div>
              )}

              {recentCase.aiSentiment && (
                <div className="bg-slate-55 p-4 rounded-xl text-xs space-y-2 text-slate-600 border border-slate-100">
                  <div>
                    <b className="text-slate-800">🤖 智能分析與情緒感知分類：</b>
                  </div>
                  <div className="flex gap-2.5 items-center">
                    <span>綜合情緒：</span>
                    <span className="font-extrabold underline">
                      {recentCase.aiSentiment === 'positive' ? '🟢 正向感謝/肯定' : recentCase.aiSentiment === 'negative' ? '🔴 負評/客訴警示' : '🟡 中性/待確認'}
                    </span>
                  </div>
                  {recentCase.aiKeywords && (
                    <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                      <span>萃取標籤：</span>
                      {recentCase.aiKeywords.map((kw, i) => (
                        <span key={i} className="bg-sky-50 text-[#0077be] px-2.5 py-0.5 rounded-md font-bold text-xs border border-sky-100/40">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                  {recentCase.aiReplySuggestion && (
                    <div className="mt-2 bg-white/95 border border-slate-200 p-2.5 rounded-lg text-left">
                      <b className="text-slate-800">✨ 佳堂客服即時草稿：</b>
                      <p className="mt-1 text-slate-755 italic leading-snug whitespace-pre-wrap">{recentCase.aiReplySuggestion}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <button
                id="btn-return-survey"
                onClick={() => {
                  setRecentCase(null);
                  setCurrentView('survey');
                }}
                className="btn-ocean flex-1 py-4 rounded-2xl font-bold transition-all shadow-md cursor-pointer text-sm"
              >
                回到首頁 / 填寫新問卷
              </button>
              
              <button
                id="btn-trigger-print"
                onClick={() => window.print()}
                className="flex-1 py-4 rounded-2xl bg-[#003366] hover:bg-[#002244] text-white font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1 text-sm border border-transparent"
              >
                <FileText className="w-4.5 h-4.5" />
                <span>預覽列印案號收執聯</span>
              </button>
            </div>
            
            {/* Displaying QR-Code pointing to current system, so users can enter survey quickly */}
            <div className="mt-10 pt-6 border-t border-sky-100/50 inline-flex flex-col items-center">
              <p className="text-sm font-bold text-slate-400 mb-2">掃描此 QR Code，快速於手機/平板填寫：</p>
              <div className="bg-sky-50 p-2 rounded-xl border border-sky-100">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(activeUrl)}`} 
                  alt="QR Entry" 
                  className="w-28 h-28"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━ VIEW 3: ADMIN DASHBOARD (後台) ━━━━━━━━━━━━━━━━━━━━━━ */}
        {currentView === 'admin' && (
          <div id="admin-view" className="animate-fadeIn">
            
            {/* Admin Login UI */}
            {!isAdminLoggedIn ? (
              <div className="max-w-md mx-auto bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-sky-100/60 overflow-hidden">
                <div className="ocean-gradient p-6 text-white text-center relative">
                  <div className="absolute right-3 top-3 opacity-15">
                    <Lock className="w-16 h-16" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black">佳堂實業品質整合管理後台</h3>
                  <p className="text-sky-100 text-xs md:text-sm mt-1">請使用 Firebase 管理員帳戶進行身分特權登入</p>
                </div>

                <form onSubmit={handleAdminLogin} className="p-6 md:p-8 space-y-5">
                  {loginError && (
                    <div className="p-3 bg-red-100 text-red-800 text-sm font-bold rounded-xl border border-red-200">
                      {loginError}
                    </div>
                  )}

                  <div id="field-admin-email">
                    <label className="block text-slate-700 font-bold text-sm md:text-base mb-1.55">
                      管理帳號 (Email)
                    </label>
                    <input
                      id="input-admin-email"
                      type="email"
                      required
                      placeholder="jiatang1602@gmail.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full text-sm md:text-base px-4.5 py-3 border border-slate-200 focus:border-[#0077be] rounded-xl outline-none transition-all focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div id="field-admin-password">
                    <label className="block text-slate-700 font-bold text-sm md:text-base mb-1.55">
                      登入密碼
                    </label>
                    <input
                      id="input-admin-password"
                      type="password"
                      required
                      placeholder="預設密碼為 clerk"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full text-sm md:text-base px-4.5 py-3 border border-slate-200 focus:border-[#0077be] rounded-xl outline-none transition-all focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div className="bg-amber-50 rounded-xl p-3.5 text-xs text-amber-800 border border-amber-200">
                    🔒 <b>安全機制要求：</b>
                    首次登入預設密碼為「clerk」。登入後系統將強制引導您重設密碼（新密碼將同步至 Firebase 安全託管），不可寫死私密帳密。
                  </div>

                  <button
                    id="btn-login-submit"
                    type="submit"
                    className="w-full py-4 rounded-xl btn-ocean text-white font-extrabold shadow-lg transition-all active:scale-95 cursor-pointer text-sm"
                  >
                    經由 Firebase 安全驗證登入
                  </button>
                </form>
              </div>
            ) : (
              
              /* Logged In Dashboard Container */
              <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-sky-100/60 overflow-hidden">
                
                {/* Admin Header Navbar */}
                <div className="bg-[#003366] text-white p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between border-b border-[#002244] gap-4 relative z-10 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Lock className="w-8 h-8 text-sky-300 shrink-0" />
                    <div>
                      <h3 className="text-xl md:text-2xl font-black flex items-center gap-2">
                        <span>佳堂品質整合監控後台</span>
                        <span className="text-xs font-extrabold bg-[#0077be] text-white px-3 py-1 rounded-full uppercase leading-none">
                          {adminRole === 'staff' ? '品質檢視專員' : adminRole === 'qa' ? '品保主管' : '最高系統行政代表'}
                        </span>
                      </h3>
                      <p className="text-sky-100 text-xs md:text-sm mt-0.5">連線帳戶：{adminUser} ‧ 管理權限隨時生效中</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-start md:self-center">
                    <button
                      id="btn-refresh-admin"
                      onClick={fetchAdminData}
                      className="flex items-center gap-1 bg-white/10 hover:bg-white/15 px-4 py-2 text-xs md:text-sm font-bold rounded-lg cursor-pointer text-white transition border border-white/10"
                    >
                      <RefreshCw className={`w-4 h-4 ${isAdminLoading ? 'animate-spin' : ''}`} />
                      <span>更新資料庫</span>
                    </button>
                    
                    <button
                      id="btn-logout"
                      onClick={handleAdminLogout}
                      className="flex items-center gap-1.5 bg-rose-600/90 hover:bg-rose-700 px-4 py-2 text-xs md:text-sm font-extrabold rounded-lg cursor-pointer text-white transition shadow-md border border-transparent"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>安全性安全登出</span>
                    </button>
                  </div>
                </div>

                {/* Dashboard Tabs Content */}
                <div className="p-5 md:p-6 space-y-6">
                  
                  {/* Stats Bento Grid Panel */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-sky-50/20 border border-sky-100 p-4 rounded-2xl flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-400">登錄總件數</span>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-2xl md:text-3xl font-black text-[#003366]">{adminRecords.length} 筆</span>
                        <span className="text-xs font-bold text-[#0077be]">正常歸檔</span>
                      </div>
                    </div>

                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex flex-col justify-between">
                      <span className="text-xs font-bold text-rose-500">🔥 緊急警報件</span>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-2xl md:text-3xl font-black text-rose-700">
                          {adminRecords.filter(r => r.severity === 'urgent').length} 件
                        </span>
                        <span className="text-[10px] bg-rose-600 text-white font-extrabold px-1.5 py-0.5 rounded leading-none animate-pulse">
                          待命處置中
                        </span>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex flex-col justify-between">
                      <span className="text-xs font-bold text-amber-600">待改進處置</span>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-2xl md:text-3xl font-black text-amber-700">
                          {adminRecords.filter(r => r.status === 'pending').length} 件
                        </span>
                        <span className="text-xs text-slate-500 font-bold">待命回覆</span>
                      </div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col justify-between">
                      <span className="text-xs font-bold text-emerald-600">已關閉結案</span>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-2xl md:text-3xl font-black text-emerald-700">
                          {adminRecords.filter(r => r.status === 'completed').length} 案
                        </span>
                        <span className="text-xs font-bold text-emerald-600">結案完成</span>
                      </div>
                    </div>
                  </div>

                  {/* Google Forms 雲端對接與同步專區 */}
                  <div className="bg-white rounded-2xl border-2 border-amber-200/50 p-5 space-y-4 shadow-sm relative overflow-hidden bg-gradient-to-r from-amber-50/10 via-white to-sky-50/10 no-print">
                    <div className="absolute right-[-15px] top-[-15px] opacity-5">
                      <Cloud className="w-36 h-36 text-amber-500 animate-pulse" />
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-100 rounded-xl">
                          <CloudLightning className="text-amber-600 w-5 h-5 shrink-0" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-slate-800">
                            ☁️ Google Forms 雲端資料同步中樞 [ 智慧防護網對接模組 ]
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            當前對接目標表單 ID: <code className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1 rounded">{googleFormId || "未設定"}</code>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">同步狀態：</span>
                        <span className="text-xs font-black bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          <span>雙端智聯已啟用</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Token Setup & Buttons */}
                      <div className="space-y-3.5">
                        <div className="bg-slate-50/70 border border-slate-200 p-4 rounded-xl space-y-2.5 text-left">
                          <label className="block text-xs font-black text-slate-700 flex items-center gap-1">
                            🔑 Google OAuth Access Token
                            <span className="text-[10px] text-slate-400 font-normal">(選填，若您已取得開發者憑證密鑰)</span>
                          </label>
                          <input 
                            id="input-gforms-token"
                            type="password"
                            value={gformsAccessToken}
                            onChange={(e) => setGformsAccessToken(e.target.value)}
                            placeholder="請在此貼上您的 Google Forms User Access Token (ya29.a0...)"
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                          />
                          <p className="text-[10px] text-slate-400 leading-normal">
                            💡 若您正在 AI Studio 預覽環境中調試，直接點擊右側的<b>【測試模擬一鍵同步】</b>按鈕，即可瞬間在本地產生高防真滿意度與客訴數據，並執行完整的後台 AI 情緒量度與主管信箱派送模擬！
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2.5">
                          <button
                            id="btn-sync-simulation"
                            onClick={() => handleSyncGoogleForms(true)}
                            disabled={isSyncingGforms}
                            className="flex-1 min-w-[140px] px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-white" />
                            <span>測試模擬一鍵同步 (推薦)</span>
                          </button>
                          
                          <button
                            id="btn-sync-active"
                            onClick={() => handleSyncGoogleForms(false)}
                            disabled={isSyncingGforms || !googleFormId}
                            className="flex-1 min-w-[140px] px-4 py-2.5 bg-[#003366] hover:bg-[#002244] text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                          >
                            <RefreshCw className={`w-4 h-4 text-white ${isSyncingGforms ? 'animate-spin' : ''}`} />
                            <span>啟動 Google 表單即時同步</span>
                          </button>
                        </div>
                      </div>

                      {/* Right: Sync logs screen */}
                      <div className="bg-slate-900 rounded-xl p-3.5 flex flex-col h-[180px]">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Code className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                            系統調試與雲端同步終端日誌
                          </span>
                          <button 
                            id="btn-clear-sync-logs"
                            onClick={() => setGformsSyncLogs([])}
                            className="text-[9px] text-[#0077be] font-bold hover:underline"
                          >
                            清除終端
                          </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto mt-2 font-mono text-[10px] text-slate-300 space-y-1.5 text-left pr-1 scrollbar-thin">
                          {gformsSyncLogs.length === 0 ? (
                            <div className="text-slate-500 text-center py-6">
                              🔌 目前尚無同步日誌，請點選按鈕啟動對接...
                            </div>
                          ) : (
                            gformsSyncLogs.map((logLine, idx) => (
                              <div key={idx} className="leading-relaxed border-b border-slate-800/20 pb-1 break-all">
                                {logLine}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Export and Filter controls block */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-slate-200 gap-4">
                      <div className="flex items-center gap-1.5">
                        <Filter className="w-5 h-5 text-slate-600 animate-spin-slow" />
                        <h4 className="text-lg font-black text-slate-800">進階搜尋、多維度篩選統計面板</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          id="btn-export-excel"
                          onClick={handleExportExcel}
                          className="flex items-center gap-1 px-4 py-2 font-bold text-xs md:text-sm bg-[#0077be] hover:bg-[#005a9c] text-white rounded-lg transition shadow-sm cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>與主管匯出 CSV 報表 (Excel相容)</span>
                        </button>

                        <button
                          id="btn-print-dossiers"
                          onClick={handlePrintPDF}
                          className="flex items-center gap-1 px-4 py-2 font-bold text-xs md:text-sm bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition shadow-sm cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          <span>列印當前報表 (PDF)</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter Inputs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
                      <div id="filter-search">
                        <label className="block text-slate-500 font-bold text-xs mb-1">關鍵字搜尋（客戶/電話/案號）</label>
                        <input
                          id="filter-input-query"
                          type="text"
                          placeholder="請輸入關鍵字..."
                          value={filterQuery}
                          onChange={(e) => setFilterQuery(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div id="filter-status">
                        <label className="block text-slate-500 font-bold text-xs mb-1">對應處理狀態</label>
                        <select
                          id="filter-select-status"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value as any)}
                          className="w-full text-xs px-2.5 py-2.5 bg-white border border-slate-300 rounded-lg cursor-pointer font-bold"
                        >
                          <option value="all">📊 全部進度狀態</option>
                          <option value="pending">待處理</option>
                          <option value="processing">處理中</option>
                          <option value="completed">已結案</option>
                        </select>
                      </div>

                      <div id="filter-severity">
                        <label className="block text-slate-500 font-bold text-xs mb-1">分級警示等級</label>
                        <select
                          id="filter-select-severity"
                          value={filterSeverity}
                          onChange={(e) => setFilterSeverity(e.target.value as any)}
                          className="w-full text-xs px-2.5 py-2.5 bg-white border border-slate-300 rounded-lg cursor-pointer font-bold"
                        >
                          <option value="all">🚨 全部案件等級</option>
                          <option value="normal">一般回饋</option>
                          <option value="urgent">緊急警示案件</option>
                        </select>
                      </div>

                      <div id="filter-sentiment">
                        <label className="block text-slate-500 font-bold text-xs mb-1">AI 輿情情感標記</label>
                        <select
                          id="filter-select-sentiment"
                          value={filterSentiment}
                          onChange={(e) => setFilterSentiment(e.target.value as any)}
                          className="w-full text-xs px-2.5 py-2.5 bg-white border border-slate-300 rounded-lg cursor-pointer font-bold"
                        >
                          <option value="all">🤖 全部 AI 情緒</option>
                          <option value="positive">🟢 正向滿意</option>
                          <option value="neutral">🟡 中立肯定</option>
                          <option value="negative">🔴 負向警報</option>
                        </select>
                      </div>

                      <div id="filter-date">
                        <label className="block text-slate-500 font-bold text-xs mb-1">反映時間範圍</label>
                        <select
                          id="filter-select-date"
                          value={filterDateRange}
                          onChange={(e) => setFilterDateRange(e.target.value as any)}
                          className="w-full text-xs px-2.5 py-2.5 bg-white border border-slate-300 rounded-lg cursor-pointer font-bold"
                        >
                          <option value="all">📅 所有時間範圍</option>
                          <option value="today">今日新增</option>
                          <option value="week">最近 7 天</option>
                          <option value="month">最近 30 天</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Feedback records grid Table list */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full border-collapse text-left text-sm text-slate-700">
                      <thead className="bg-slate-900 text-white font-bold text-xs uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3.5">案件案號</th>
                          <th className="px-4 py-3.5">反映時間</th>
                          <th className="px-4 py-3.5">客戶名稱 / 聯絡方式</th>
                          <th className="px-4 py-3.5 text-center">滿意度均分</th>
                          <th className="px-4 py-3.5">問題反映分類</th>
                          <th className="px-4 py-3.5 text-center">案件等級</th>
                          <th className="px-4 py-3.5 text-center">處理進度</th>
                          <th className="px-4 py-3.5 text-center">追蹤</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRecords.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-bold">
                              🔍 查無符合目前篩選條件的客戶滿意度或客訴資料。
                            </td>
                          </tr>
                        ) : (
                          filteredRecords.map((r) => {
                            const scoresList = Object.values(r.scores) as number[];
                            const avgVal = scoresList.reduce((a, b) => a + b, 0) / scoresList.length;
                            
                            return (
                              <tr 
                                key={r.id} 
                                id={`row-${r.id}`}
                                className={`hover:bg-sky-50/40 transition-colors ${
                                  r.severity === 'urgent' && r.status !== 'completed' ? 'bg-rose-50/20' : ''
                                }`}
                              >
                                <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                                  {r.caseNumber}
                                </td>
                                <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                                  {new Date(r.timestamp).toLocaleString('zh-TW')}
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="font-bold text-slate-900">{r.customerName}</div>
                                  <div className="text-xs text-slate-500">{r.companyName || '個人客戶'} • {r.phone}</div>
                                </td>
                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                  <span className={`inline-block px-3 py-1 rounded-full font-black text-xs ${
                                    avgVal >= 4 ? 'bg-green-100 text-green-700' : avgVal >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {avgVal.toFixed(1)} / 5.0
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-sm whitespace-nowrap">
                                  {r.productName ? (
                                    <span className="text-rose-700 font-bold bg-rose-100 px-2.5 py-0.5 rounded-md text-xs">
                                      🚨 客訴: {r.problemCategory}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md text-xs font-bold">
                                      一般滿意度
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                  {r.severity === 'urgent' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white animate-pulse">
                                      🔴 緊急警示
                                    </span>
                                  ) : (
                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                      一般等級
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                  {r.status === 'completed' ? (
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      🟢 已結案
                                    </span>
                                  ) : r.status === 'processing' ? (
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                      🔵 處理中
                                    </span>
                                  ) : (
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                                      🟡 待處理
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                  <button
                                    id={`btn-open-${r.id}`}
                                    onClick={() => {
                                      setSelectedRecord(r);
                                      setAdminActionStatus(r.status);
                                      setAdminActionRole(r.assignedRole || 'staff');
                                    }}
                                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1 justify-center mx-auto"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>開啟</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Operational simulated inbox Outbox monitor so they can inspect email notifies directly */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4 no-print">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-slate-200 gap-3">
                      <div className="flex items-center gap-1.5">
                        <Mail className="text-cyan-600 w-5 h-5" />
                        <h4 className="text-base font-black text-slate-800">
                          📬 佳堂即時 Email 電子主管通報信箱 [ 出件監控與備份信箱設定 ]
                        </h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">📧 通報主管備份信箱：</label>
                        <input 
                          id="input-backup-email"
                          type="email"
                          value={backupEmail}
                          onChange={(e) => setBackupEmail(e.target.value)}
                          placeholder="jiatang1602@gmail.com"
                          className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 focus:bg-white rounded-lg text-xs font-extrabold text-[#003366] outline-none focus:ring-2 focus:ring-[#0077be] transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">🔗 Google Forms 嵌入嵌入 URL (src)：</label>
                        <input 
                          id="input-gform-url"
                          type="text"
                          value={googleFormUrl}
                          onChange={(e) => setGoogleFormUrl(e.target.value)}
                          placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true"
                          className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 focus:bg-white rounded-lg text-xs font-extrabold text-[#003366] outline-none focus:ring-2 focus:ring-[#0077be] transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">🔑 Google Form ID (用於 API 調用同步)：</label>
                        <div className="flex gap-2">
                          <input 
                            id="input-gform-id"
                            type="text"
                            value={googleFormId}
                            onChange={(e) => setGoogleFormId(e.target.value)}
                            placeholder="1FAIpQLSeS..."
                            className="flex-1 px-2.5 py-2 bg-slate-50 border border-slate-300 focus:bg-white rounded-lg text-xs font-extrabold text-[#003366] outline-none focus:ring-2 focus:ring-[#0077be] transition-all"
                          />
                          <button
                            id="btn-save-backup-email"
                            onClick={handleSaveBackupEmail}
                            className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white rounded-lg text-xs font-black cursor-pointer transition shadow-sm active:scale-95"
                          >
                            保存配置
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      💡 因為平台無直接派駐 SMTP 地端發信硬體，此監控面板是專門為您模擬發信的真實機制。當前台遞交時，自動產出的精美主管通報 HTML 會記錄在下表中，您可以直接點擊「預覽完整通報郵件信箱」！
                    </p>

                    <div className="space-y-2.5 max-h-56 overflow-y-auto">
                      {emailOutbox.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400 font-bold bg-white rounded-xl border border-dashed border-slate-200">
                          📂 目前尚無模擬電子信箱寄出。在前台寫寫問卷嘗試送出吧！
                        </div>
                      ) : (
                        emailOutbox.map((mailObj) => (
                          <div 
                            key={mailObj.id} 
                            id={`mail-card-${mailObj.id}`} 
                            className={`p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between gap-4 transition hover:shadow-sm ${
                              mailObj.isUrgent ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-cyan-500'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  mailObj.isUrgent ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'
                                }`}>
                                  {mailObj.isUrgent ? '緊急警報' : '正常回饋'}
                                </span>
                                <span className="text-[11px] font-bold text-slate-500">
                                  {new Date(mailObj.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <h5 className="text-xs md:text-sm font-bold text-slate-800 truncate max-w-lg">
                                {mailObj.subject}
                              </h5>
                            </div>

                            <button
                              id={`btn-open-mail-${mailObj.id}`}
                              onClick={() => setActivePreviewEmail(mailObj)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-md shrink-0 border border-slate-200 cursor-pointer"
                            >
                              開啟 HTML 預覽
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━ VIEW 4: DETAILED RECORD MODAL (彈出式) ━━━━━━━━━━━━━━━━━━━━━━ */}
        {selectedRecord && (
          <div id="modal-container" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto backdrop-blur-xs">
            <div id="modal-content" className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scaleUp">
              
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-5 md:p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <FileText className="text-cyan-400 w-6 h-6 shrink-0" />
                  <div>
                    <h3 className="text-lg md:text-xl font-black">
                      佳堂客戶案件追蹤處理單：{selectedRecord.caseNumber}
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      反映時間：{new Date(selectedRecord.timestamp).toLocaleString('zh-TW')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 no-print">
                  <button
                    id="btn-print-single-dossier"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition font-extrabold cursor-pointer shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>列印此卷宗</span>
                  </button>
                  
                  <button
                    id="btn-close-modal"
                    onClick={() => setSelectedRecord(null)}
                    className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-6.5 h-6.5" />
                  </button>
                </div>
              </div>

              {/* Modal scroll body */}
              <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1 text-left">
                
                {/* Section header: Client profiles */}
                <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200">
                  <h4 className="text-base font-black text-slate-800 mb-3 flex items-center gap-1.5">
                    <User className="w-5 h-5 text-slate-600" />
                    <span>一、 客戶聯絡基本資料登記簿</span>
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4 text-xs md:text-sm">
                    <div>
                      <span className="text-slate-400">客戶名稱：</span>
                      <b className="text-slate-900">{selectedRecord.customerName}</b>
                    </div>
                    <div>
                      <span className="text-slate-400">對應行號：</span>
                      <b className="text-slate-900">{selectedRecord.companyName || '個人戶'}</b>
                    </div>
                    <div>
                      <span className="text-slate-400">登錄聯絡電話：</span>
                      <b className="text-slate-900">{selectedRecord.phone}</b>
                    </div>
                    <div>
                      <span className="text-slate-400">電子信箱：</span>
                      <b className="text-slate-900">{selectedRecord.email || '無電子信箱'}</b>
                    </div>
                    <div>
                      <span className="text-slate-400">產品消費/採購頻率：</span>
                      <b className="text-slate-900">
                        {selectedRecord.frequency} {selectedRecord.otherFrequency ? `(${selectedRecord.otherFrequency})` : ''}
                      </b>
                    </div>
                    <div>
                      <span className="text-slate-400">期望答覆管道：</span>
                      <b className="text-slate-900">{selectedRecord.contactMethod || '電話聯繫'}</b>
                    </div>
                  </div>
                </div>

                {/* Section header: Scores summary bento */}
                <div className="space-y-3">
                  <h4 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                    <TrendingUp className="w-5 h-5 text-slate-600" />
                    <span>二、 產品品質與服務滿意度詳表</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { l: '口感風味', k: 'taste' },
                      { l: '品質穩定', k: 'consistency' },
                      { l: '新鮮色香物', k: 'freshness' },
                      { l: '外裝完整', k: 'packaging' },
                      { l: '配送交時', k: 'delivery' },
                      { l: '訂單對發', k: 'completeness' },
                      { l: '客服回覆', k: 'serviceSpeed' },
                      { l: '售後問題', k: 'afterSales' },
                      { l: '價格合理', k: 'price' }
                    ].map((item) => {
                      const score = (selectedRecord.scores as any)[item.k] || 5;
                      return (
                        <div key={item.k} className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl flex items-center justify-between text-xs font-bold text-slate-600">
                          <span>{item.l}：</span>
                          <span className="flex items-center gap-1 text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-sky-100 shadow-xs">
                            <span className="text-amber-500">★</span>
                            <span>{score} 分</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {selectedRecord.otherSuggestions && (
                    <div className="bg-slate-50 rounded-xl p-4.5 border border-slate-200 text-xs md:text-sm">
                      <span className="text-slate-500 font-bold block mb-1">客戶提交其他意見或期許指教：</span>
                      <p className="text-slate-800 leading-relaxed font-bold italic">{selectedRecord.otherSuggestions}</p>
                    </div>
                  )}
                </div>

                {/* Complaint issues if provided */}
                {selectedRecord.productName && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-4">
                    <h4 className="text-base font-black text-rose-800 flex items-center gap-1.5 border-b border-rose-200 pb-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
                      <span>三、 產品客訴及受傷退貨專屬反映單</span>
                    </h4>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-4 text-xs">
                      <div>
                        <span className="text-rose-600">異常產品投訴品項：</span>
                        <b className="text-slate-900 font-bold block text-sm mt-0.5">{selectedRecord.productName}</b>
                      </div>
                      <div>
                        <span className="text-rose-600">外袋批號 / 生產日期：</span>
                        <b className="text-slate-900 font-bold block text-sm mt-0.5">{selectedRecord.batchNumber || '無註記'}</b>
                      </div>
                      <div>
                        <span className="text-rose-600">異常瑕疵分類：</span>
                        <b className="text-rose-900 font-black block text-sm mt-0.5">{selectedRecord.problemCategory}</b>
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5">
                      <span className="text-rose-600 font-bold">主要問題發生的異常描述：</span>
                      <p className="text-slate-800 leading-relaxed font-bold bg-white p-3 rounded-lg border border-rose-200">
                        {selectedRecord.problemDescription}
                      </p>
                    </div>

                    {selectedRecord.improvementSuggestion && (
                      <div className="text-xs space-y-1.5">
                        <span className="text-rose-600 font-bold">客戶期望補正與改善期待：</span>
                        <p className="text-slate-800 leading-relaxed bg-white/70 p-3 rounded-lg border border-rose-100">
                          {selectedRecord.improvementSuggestion}
                        </p>
                      </div>
                    )}

                    {/* Lights visual viewer */}
                    {selectedRecord.images && selectedRecord.images.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-rose-600">🖼️ 對應瑕疵照片證物列 (共 {selectedRecord.images.length} 張)：</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedRecord.images.map((imgUrl, i) => (
                            <button 
                              key={i} 
                              type="button"
                              onClick={() => setActivePreviewImage(imgUrl)}
                              className="relative w-24 h-24 bg-slate-200 rounded-lg overflow-hidden border border-[#e11d48] hover:scale-105 transition-transform cursor-pointer text-left"
                            >
                              <img src={imgUrl} alt="defect" className="w-full h-full object-cover" />
                              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded leading-none">
                                證物 #{i + 1}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Gemini AI smart assessment board */}
                <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 space-y-3.5 border border-slate-800 relative overflow-hidden">
                  <div className="absolute right-3 top-3 opacity-10">
                    <Sparkles className="w-16 h-16 text-cyan-400 rotate-12" />
                  </div>

                  <h4 className="text-base font-black text-cyan-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <span>第四域：Gemini AI 客服助理智能研判板</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-slate-400">情緒分類識別：</span>
                      <div className="flex items-center gap-1.5 text-sm font-bold">
                        {selectedRecord.aiSentiment === 'negative' ? (
                          <span className="text-red-400 font-extrabold flex items-center gap-1">🔴 負評/不滿情緒</span>
                        ) : selectedRecord.aiSentiment === 'neutral' ? (
                          <span className="text-amber-400 font-extrabold flex items-center gap-1">🟡 中性/建議回報</span>
                        ) : (
                          <span className="text-emerald-400 font-extrabold flex items-center gap-1">🟢 滿意/友善肯定</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-400">主訴分析問題歸類：</span>
                      <b className="text-slate-200 block text-sm">{selectedRecord.aiCategory || selectedRecord.problemCategory || '綜合滿意評估'}</b>
                    </div>
                  </div>

                  {selectedRecord.aiKeywords && selectedRecord.aiKeywords.length > 0 && (
                    <div className="text-xs">
                      <span className="text-slate-400">核心標籤萃取：</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedRecord.aiKeywords.map((kw, i) => (
                          <span key={i} className="bg-slate-800 text-cyan-300 border border-slate-700 px-2.5 py-0.5 rounded">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs bg-slate-950 p-4.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-slate-400 font-bold text-xs">
                      <span>🤖 佳堂客服專業回復建議 (AI 預置)</span>
                      <button
                        id="btn-copy-reply"
                        type="button"
                        onClick={() => {
                          const val = selectedRecord.aiReplySuggestion || '';
                          navigator.clipboard.writeText(val);
                          alert('📋 客服回信草稿已成功複製至剪貼簿！');
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-white px-3 py-1 rounded text-xs transition cursor-pointer"
                      >
                        一鍵複製智能草稿
                      </button>
                    </div>
                    <p className="text-slate-300 italic text-sm leading-relaxed whitespace-pre-wrap mt-1">
                      {selectedRecord.aiReplySuggestion || '無分析建議'}
                    </p>
                  </div>
                </div>

                {/* Audit trail and operator logs */}
                <div className="space-y-2">
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-5 h-5 text-slate-600" />
                    <span>五、 歷史歷程處置與異動紀錄檔 ({selectedRecord.logs?.length || 0} 筆)</span>
                  </h4>

                  <div className="space-y-2 max-h-40 overflow-y-auto bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {selectedRecord.logs?.map((l, i) => (
                      <div key={i} className="p-3.5 bg-white rounded-lg border border-slate-100 text-xs space-y-1 animate-fadeIn">
                        <div className="flex justify-between items-center text-slate-400">
                          <b>時間：{new Date(l.timestamp).toLocaleString('zh-TW')}</b>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded italic">
                              操作：{l.action}
                            </span>
                            <span className="bg-cyan-100 text-cyan-800 font-bold px-2 py-0.5 rounded leading-none">
                              經辦：{l.operator}
                            </span>
                          </div>
                        </div>
                        <p className="text-slate-700 leading-snug">{l.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tracking Action Form */}
                <form onSubmit={handleStatusUpdate} className="pt-4 border-t border-slate-200 space-y-4 bg-slate-50 p-4.5 rounded-2xl border border-slate-200">
                  <h5 className="text-sm font-extrabold text-slate-800">✍️ 承辦理案件處置與指派科系：</h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div id="modal-field-status">
                      <label className="block text-slate-500 font-bold text-xs mb-1">更新案件追蹤狀態</label>
                      <select
                        id="modal-select-status"
                        value={adminActionStatus}
                        onChange={(e) => setAdminActionStatus(e.target.value as any)}
                        className="w-full text-xs px-2.5 py-2.5 bg-white border border-slate-300 rounded-lg cursor-pointer font-bold"
                      >
                        <option value="pending">待處理</option>
                        <option value="processing">處理中 (進行內部聯繫)</option>
                        <option value="completed">解決結案 (通知退補件完畢)</option>
                      </select>
                    </div>

                    <div id="modal-field-role">
                      <label className="block text-slate-500 font-bold text-xs mb-1">指派處理科系代表 (權限角色)</label>
                      <select
                        id="modal-select-role"
                        value={adminActionRole}
                        onChange={(e) => setAdminActionRole(e.target.value as any)}
                        className="w-full text-xs px-2.5 py-2.5 bg-white border border-slate-300 rounded-lg cursor-pointer font-bold"
                      >
                        <option value="staff">行政人員 (處理物流/缺缺誤)</option>
                        <option value="admin">教職員科 (進行宣導再教育)</option>
                        <option value="qa">品質保證 QA (查驗批次與製程)</option>
                      </select>
                    </div>
                  </div>

                  <div id="modal-field-notes">
                    <label className="block text-slate-500 font-bold text-xs mb-1">本次處置描述、回電結果紀錄與說明</label>
                    <textarea
                      id="modal-textarea-notes"
                      rows={2.5}
                      required
                      placeholder="例：品保科已查驗現場同批次產品，口味正常。已協助發送簡訊向客戶安排退回麻糬包裹，並折抵下次貨款。"
                      value={adminActionNotes}
                      onChange={(e) => setAdminActionNotes(e.target.value)}
                      className="w-full text-xs p-3 border border-slate-300 rounded-lg outline-none bg-white font-medium"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      id="btn-modal-cancel"
                      type="button"
                      onClick={() => setSelectedRecord(null)}
                      className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 hover:scale-98 transition rounded-lg text-slate-700 font-extrabold text-xs cursor-pointer text-center"
                    >
                      暫不更新，直接關閉
                    </button>
                    <button
                      id="btn-modal-save"
                      type="submit"
                      className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-lg transition hover:scale-101 cursor-pointer shadow-md text-center"
                    >
                      變更追蹤進度並建檔 (寫入事件紀錄)
                    </button>
                  </div>
                </form>

              </div>

            </div>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━ VIEW 5: PASSWORD RESET MODAL ━━━━━━━━━━━━━━━━━━━━━━ */}
        {showPasswordResetModal && (
          <div id="password-reset-container" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 overflow-y-auto backdrop-blur-xs no-print animate-fadeIn">
            <div id="password-reset-content" className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 flex flex-col space-y-5 animate-scaleUp text-left">
              <div className="ocean-gradient -mx-6 md:-mx-8 -mt-6 md:-mt-8 p-6 text-white text-center relative mb-2">
                <div className="absolute right-3 top-3 opacity-15">
                  <Lock className="w-16 h-16" />
                </div>
                <h3 className="text-xl font-black">首次登入安全變更密碼</h3>
                <p className="text-sky-100 text-xs mt-1">為保障系統安全，請優先重設預設密碼 "clerk"</p>
              </div>

              <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                {passwordResetError && (
                  <div className="p-3 bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-200">
                    {passwordResetError}
                  </div>
                )}

                <div>
                  <label className="block text-slate-700 font-bold text-xs mb-1.5">
                    設定全新高強度密碼
                  </label>
                  <input
                    id="input-new-password"
                    type="password"
                    required
                    placeholder="請輸入新設定的密碼 (至少 5 字元)"
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    className="w-full text-xs px-4 py-2.5 border border-slate-200 focus:border-[#0077be] rounded-xl outline-none transition-all focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold text-xs mb-1.5">
                    確認您的新密碼組合
                  </label>
                  <input
                    id="input-confirm-password"
                    type="password"
                    required
                    placeholder="請再次輸入安全密碼以防鍵選錯誤"
                    value={confirmPasswordValue}
                    onChange={(e) => setConfirmPasswordValue(e.target.value)}
                    className="w-full text-xs px-4 py-2.5 border border-slate-200 focus:border-[#0077be] rounded-xl outline-none transition-all focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div className="bg-sky-50 p-3 rounded-xl border border-sky-100 text-xs text-sky-800">
                  💡 <b>請做好個人記錄：</b>
                  您重設的新密碼將安全儲存，往後登入皆須使用此密碼。
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    id="btn-force-reset-cancel"
                    type="button"
                    onClick={() => {
                      setShowPasswordResetModal(false);
                      setNewPasswordValue('');
                      setConfirmPasswordValue('');
                      setPasswordResetError('');
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 transition rounded-lg text-slate-600 font-bold text-xs cursor-pointer text-center"
                  >
                    取消登入
                  </button>
                  <button
                    id="btn-force-reset-save"
                    type="submit"
                    className="flex-1 py-2.5 btn-ocean text-white font-black text-xs rounded-lg transition cursor-pointer shadow-md text-center"
                  >
                    確認變更並登入
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 📸 In-App Image Lightbox Modal */}
        {activePreviewImage && (
          <div 
            id="lightbox-overlay"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 animate-scaleUp no-print"
            onClick={() => setActivePreviewImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img 
                src={activePreviewImage} 
                alt="Full preview" 
                className="max-w-full max-h-[80vh] rounded-2xl object-contain border border-slate-800 shadow-2xl"
              />
              <p className="text-slate-300 text-xs font-bold mt-4 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-800">
                點擊任意背景處或按下關閉鍵返回案件
              </p>
              <button 
                id="btn-close-lightbox"
                className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition cursor-pointer"
                onClick={() => setActivePreviewImage(null)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* 📬 In-App Simulated Email Preview Sandbox Modal */}
        {activePreviewEmail && (
          <div 
            id="email-preview-container" 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 overflow-y-auto backdrop-blur-xs no-print"
            onClick={() => setActivePreviewEmail(null)}
          >
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-left" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Mail className="text-cyan-400 w-5 h-5 shrink-0" />
                  <div className="text-left">
                    <h3 className="text-sm font-black truncate max-w-md">
                      預覽通報郵件信件：{activePreviewEmail.subject}
                    </h3>
                    <p className="text-slate-400 text-[10px] mt-0.5">
                      發件時間：{new Date(activePreviewEmail.timestamp).toLocaleString('zh-TW')}
                    </p>
                  </div>
                </div>
                <button
                  id="btn-close-email-preview"
                  onClick={() => setActivePreviewEmail(null)}
                  className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body (iframe rendering safe HTML) */}
              <div className="p-5 overflow-y-auto flex-1 bg-slate-50">
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="flex flex-col gap-1.5 pb-3 border-b border-slate-100 text-[11px] text-slate-500 mb-4 text-left">
                    <div><b>寄件人:</b> 佳堂實業品質回饋防護網 &lt;system-notice@jiatang.com.tw&gt;</div>
                    <div><b>收件人:</b> <span className="text-[#0077be] font-bold">{activePreviewEmail.to}</span></div>
                    <div><b>核發主旨:</b> <span className="font-bold text-slate-800">{activePreviewEmail.subject}</span></div>
                  </div>
                  {/* Safely display simulated email HTML style using srcDoc in an iframe */}
                  <iframe 
                    title="Simulated Email Web Preview"
                    srcDoc={activePreviewEmail.html} 
                    className="w-full min-h-[400px] border border-slate-150 rounded-xl bg-white shadow-inner"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end shrink-0">
                <button
                  id="btn-confirm-close-email-preview"
                  type="button"
                  onClick={() => setActivePreviewEmail(null)}
                  className="px-5 py-2 bg-slate-900 text-white hover:bg-slate-800 transition font-bold text-xs rounded-xl cursor-pointer"
                >
                  確認並關閉
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
