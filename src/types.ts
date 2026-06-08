/**
 * Shared Type Definitions for Jiatang Satisfaction & Complaint System
 */

export interface SatisfactionScores {
  taste: number;        // 口感與風味
  consistency: number;  // 品質穩定度
  freshness: number;    // 新鮮度表現
  packaging: number;    // 外包裝完整性
  delivery: number;     // 交貨準時性
  completeness: number; // 訂單達成率
  serviceSpeed: number; // 業務/客服回應速度
  afterSales: number;   // 售後問題處理
  price: number;        // 價格合理性
}

export interface FeedbackLog {
  timestamp: string;
  action: string;
  operator: string;
  notes?: string;
}

export interface FeedbackRecord {
  id: string; // Document ID / Guid
  caseNumber: string; // e.g. JT-YYYYMMDD-XXXX
  timestamp: string;
  
  // Customer info
  customerName: string;
  companyName: string;
  phone: string;
  email: string;
  frequency: string; // 消費頻率
  otherFrequency?: string; // 其他消費頻率說明
  
  // Satisfaction ratings
  scores: SatisfactionScores;
  otherSuggestions?: string; // 其他建議
  
  // Complaint/Problem details
  productName?: string;
  batchNumber?: string;
  problemCategory?: string; // 問題分類
  problemDescription?: string;
  improvementSuggestion?: string;
  
  // Image attachments
  images: string[]; // Array of base64 or URL strings
  
  // Status Tracking
  status: 'pending' | 'processing' | 'completed';
  severity: 'normal' | 'urgent';
  assignedRole?: 'admin' | 'staff' | 'qa';
  
  // System/AI Analysis
  aiSentiment?: 'positive' | 'neutral' | 'negative';
  aiKeywords?: string[];
  aiCategory?: string;
  aiReplySuggestion?: string;
  
  // Operation History logs
  logs: FeedbackLog[];
}

export interface EmailOutboxRecord {
  id: string;
  timestamp: string;
  to: string;
  subject: string;
  html: string;
  isUrgent: boolean;
}
