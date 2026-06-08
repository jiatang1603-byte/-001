import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up bodies up to 20mb to comfortably handle photos/base64 uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Storage folders for offline-database and upload assets
const DB_DIR = path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Serve uploaded image assets stably
app.use("/uploads", express.static(UPLOAD_DIR));

// Simple in-file JSON databases with multi-instance safety
const DB_PATH = path.join(DB_DIR, "feedbackdb.json");
const EMAIL_PATH = path.join(DB_DIR, "emailoutbox.json");
const SETTINGS_PATH = path.join(DB_DIR, "settings.json");

// Local helper to load settings
function loadSettings(): any {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = fs.readFileSync(SETTINGS_PATH, "utf-8");
      const obj = JSON.parse(data);
      if (!obj.googleFormUrl) {
        obj.googleFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLSeSgbyW8e-Zc_0pM5hX8gD3oJWee7y88V9C78z9pY7v_k5nDA/viewform?embedded=true";
      }
      if (!obj.googleFormId) {
        obj.googleFormId = "1FAIpQLSeSgbyW8e-Zc_0pM5hX8gD3oJWee7y88V9C78z9pY7v_k5nDA";
      }
      return obj;
    }
  } catch (err) {
    console.error("Error reading settings DB:", err);
  }
  return { 
    backupEmail: "jiatang1602@gmail.com",
    googleFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLSeSgbyW8e-Zc_0pM5hX8gD3oJWee7y88V9C78z9pY7v_k5nDA/viewform?embedded=true",
    googleFormId: "1FAIpQLSeSgbyW8e-Zc_0pM5hX8gD3oJWee7y88V9C78z9pY7v_k5nDA"
  };
}

// Local helper to save settings
function saveSettings(settings: any) {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing settings DB:", err);
  }
}

// Local helper to load records
function loadFeedbackRecords(): any[] {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading feedback DB:", err);
  }
  return [];
}

// Local helper to save records
function saveFeedbackRecords(records: any[]) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing feedback DB:", err);
  }
}

// Local helper to load email outbox
function loadEmailOutbox(): any[] {
  try {
    if (fs.existsSync(EMAIL_PATH)) {
      const data = fs.readFileSync(EMAIL_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading email index:", err);
  }
  return [];
}

// Local helper to save emails
function saveEmailOutbox(emails: any[]) {
  try {
    fs.writeFileSync(EMAIL_PATH, JSON.stringify(emails, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing email index:", err);
  }
}

// Lazy-initialized Gemini Client
let geminiClient: any = null;
function getGemini() {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      geminiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return geminiClient;
}

/**
 * 1. API: Image Upload Action
 */
app.post("/api/upload", (req, res) => {
  try {
    const { imageBase64, originalName } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing image payload." });
    }

    // Strip header if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const extension = originalName ? path.extname(originalName).toLowerCase() : ".jpg";
    const filename = `jt-feedback-${Date.now()}-${Math.floor(Math.random() * 1000)}${extension}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/uploads/${filename}`;
    return res.json({ url: imageUrl, filename });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Failed to upload image." });
  }
});

/**
 * 2. API: Submit Survey Feedback
 */
app.post("/api/feedback", async (req, res) => {
  try {
    const payload = req.body;
    const records = loadFeedbackRecords();

    // Verification of essential fields
    if (!payload.customerName || !payload.phone) {
      return res.status(400).json({ error: "客戶名稱與聯絡方式為必填欄位！" });
    }

    // Generate Case Number: JT-YYYYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // e.g. 20260608
    const countToday = records.filter(
      (r) => r.caseNumber && r.caseNumber.startsWith(`JT-${dateStr}`)
    ).length;
    const serial = String(countToday + 1).padStart(4, "0");
    const caseNumber = `JT-${dateStr}-${serial}`;

    // Safety and negative triggers
    const scores = payload.scores || {
      taste: 5,
      consistency: 5,
      freshness: 5,
      packaging: 5,
      delivery: 5,
      completeness: 5,
      serviceSpeed: 5,
      afterSales: 5,
      price: 5,
    };

    // Calculate average score
    const scoresArray = Object.values(scores) as number[];
    const avgScore = scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length;

    // Detect negative keywords (問題、故障、不滿、退貨, etc.)
    const negativeKeywords = ["問題", "故障", "不滿", "退貨", "瑕疵", "異常", "差勁", "壞掉", "破損", "太慢"];
    let containsNegativeWord = false;
    const bodyText = (payload.otherSuggestions || "") + " " + (payload.problemDescription || "");
    for (const kw of negativeKeywords) {
      if (bodyText.includes(kw)) {
        containsNegativeWord = true;
        break;
      }
    }

    // Set Urgency and Alert Levels
    const isUrgent = avgScore < 3.0 || containsNegativeWord;
    const severity = isUrgent ? "urgent" : "normal";

    // AI Analysis (using Gemini if configured and available)
    let aiSentiment: "positive" | "neutral" | "negative" = isUrgent ? "negative" : "positive";
    let aiKeywords: string[] = ["滿意度", "一般調查"];
    let aiCategory = "綜合評估";
    let aiReplySuggestion = "感謝您寶貴的反饋，佳堂實業將持續提昇產品質量，竭誠為您服務！";

    const ai = getRepliedAi();
    if (ai) {
      try {
        console.log("Analyzing with Gemini AI for case:", caseNumber);
        const prompt = `分析下列佳堂實業客戶回饋：
客戶名稱: ${payload.customerName}
平均評分: ${avgScore.toFixed(1)} / 5
客戶建議: ${payload.otherSuggestions || "無"}
客訴分類: ${payload.problemCategory || "無"}
問題描述: ${payload.problemDescription || "無"}
改善建議: ${payload.improvementSuggestion || "無"}`;

        const aiResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: "You are an expert product quality and consumer relation analyst for 佳堂實業股份有限公司 (Jiatang Industrial). Analyze the input satisfaction rate/complaint text in Traditional Chinese and output a strictly valid JSON response using the specified Type objects.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                sentiment: { type: Type.STRING, description: "Must be 'positive', 'neutral', or 'negative'" },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 to 5 Chinese keywords of the issue" },
                category: { type: Type.STRING, description: "Category of opinion, e.g., '口感風味', '品質穩定', '包裝完整', '交貨配送', '客戶服務', '其他'" },
                replySuggestion: { type: Type.STRING, description: "A highly sincere, professional draft reply in template format for customer service" }
              },
              required: ["sentiment", "keywords", "category", "replySuggestion"]
            }
          }
        });

        if (aiResponse && aiResponse.text) {
          const aiData = JSON.parse(aiResponse.text.trim());
          if (aiData.sentiment) aiSentiment = aiData.sentiment as any;
          if (aiData.keywords) aiKeywords = aiData.keywords;
          if (aiData.category) aiCategory = aiData.category;
          if (aiData.replySuggestion) aiReplySuggestion = aiData.replySuggestion;
        }
      } catch (gemError) {
        console.error("Gemini processing error:", gemError);
        // Fall back gracefully to standard defaults
      }
    }

    // Build the complete final feedback object
    const newRecord = {
      id: `jt-uuid-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      caseNumber,
      timestamp: now.toISOString(),
      customerName: payload.customerName,
      companyName: payload.companyName || "",
      phone: payload.phone,
      email: payload.email || "",
      frequency: payload.frequency || "其他",
      otherFrequency: payload.otherFrequency || "",
      scores,
      otherSuggestions: payload.otherSuggestions || "",
      productName: payload.productName || "",
      batchNumber: payload.batchNumber || "",
      problemCategory: payload.problemCategory || "",
      problemDescription: payload.problemDescription || "",
      improvementSuggestion: payload.improvementSuggestion || "",
      images: payload.images || [],
      status: "pending",
      severity,
      aiSentiment,
      aiKeywords,
      aiCategory,
      aiReplySuggestion,
      logs: [
        {
          timestamp: now.toISOString(),
          action: "問卷提交建檔",
          operator: "系統",
          notes: isUrgent ? "系統偵測並標記為緊急警示案件。" : "客戶正常回饋提交。"
        }
      ]
    };

    records.push(newRecord);
    saveFeedbackRecords(records);

    // Trigger Email Alerts via Outbox logging to simulated SMTP
    const outbox = loadEmailOutbox();
    const settings = loadSettings();
    const isNotifyGmail = settings.backupEmail || "jiatang1602@gmail.com";
    
    // Generate Beautiful HTML Email body
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; border: 2px solid ${isUrgent ? "#dc2626" : "#2563eb"}; border-radius: 8px; padding: 20px;">
        <h2 style="color: ${isUrgent ? "#dc2626" : "#1e3a8a"}; margin-top: 0;">
          ${isUrgent ? "⚠️ 【佳堂警示】負評與客訴防護即時通報" : "📬 【佳堂通知】客戶滿意度回饋平台"}
        </h2>
        <p>閣下好，系統已成功接收到客戶提交的最新評估與問題回報，詳細資訊登錄如下：</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; font-weight: bold; width: 120px;">案件編號：</td><td><b>${caseNumber}</b></td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">填寫時間：</td><td>${now.toLocaleString("zh-TW")}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">客戶名稱：</td><td>${payload.customerName} (${payload.companyName || "個人"})</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">客服電話：</td><td>${payload.phone}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">電子郵件：</td><td>${payload.email || "未提供"}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">消費頻率：</td><td>${payload.frequency} ${payload.otherFrequency ? `(${payload.otherFrequency})` : ""}</td></tr>
        </table>
        <h3 style="color: #1e3a8a; margin-bottom: 8px;">📊 調查滿意評分：</h3>
        <ul style="margin-top: 0; padding-left: 20px;">
          <li>口感與風味：${scores.taste}⭐</li>
          <li>品質穩定度：${scores.consistency}⭐</li>
          <li>新鮮度表現：${scores.freshness}⭐</li>
          <li>外包裝完整：${scores.packaging}⭐</li>
          <li>交貨準時性：${scores.delivery}⭐</li>
          <li>訂單達成率：${scores.completeness}⭐</li>
          <li>客服回應速度：${scores.serviceSpeed}⭐</li>
          <li>售後問題處理：${scores.afterSales}⭐</li>
          <li>價格合理性：${scores.price}⭐</li>
        </ul>
        ${payload.otherSuggestions ? `<p><b>綜合意見建議：</b><br>${payload.otherSuggestions}</p>` : ""}
        
        ${payload.productName ? `
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin-top: 15px; border-radius: 4px;">
            <b style="color: #b91c1c;">🚨 專屬客訴問題：</b><br>
            <b>產品名稱：</b>${payload.productName}<br>
            <b>產品批號：</b>${payload.batchNumber || "未標示"}<br>
            <b>問題分類：</b>${payload.problemCategory}<br>
            <b>狀況描述：</b>${payload.problemDescription}<br>
            <b>改善建議：</b>${payload.improvementSuggestion || "無"}
          </div>
        ` : ""}
        
        ${payload.images && payload.images.length > 0 ? `
          <h3 style="color: #1e3a8a; margin-top: 15px;">🖼️ 附隨圖片證物：</h3>
          <p>客戶共上傳 ${payload.images.length} 張反映照片，可在系統內檢視，或點選以下連結：</p>
          <ul>
            ${payload.images.map((img: string, i: number) => `<li><a href="${img.startsWith("/") ? "" : ""}${img}" target="_blank">圖片配件 #${i + 1} 瀏覽</a></li>`).join("")}
          </ul>
        ` : ""}
        
        <div style="background-color: #f3f4f6; border-radius: 4px; padding: 12px; margin-top: 15px; font-size: 13px; color: #1f2937;">
          <b>🤖 智能助理的情感與類別定位：</b><br>
          情緒狀態：${aiSentiment === "negative" ? "🔴 負向/客訴" : "🟢 正向肯定"}<br>
          核心標籤：${aiKeywords.join(", ")}<br>
          處理方向：${aiCategory}
        </div>
        <p style="font-size: 11px; color: #6b7280; margin-top: 20px;">本信件自 佳堂實業股份有限公司 客戶滿意度與客訴回饋安全平台 自動派送發出。</p>
      </div>
    `;

    outbox.push({
      id: `mail-${Date.now()}`,
      timestamp: now.toISOString(),
      to: isNotifyGmail,
      subject: `${isUrgent ? "【⚠️緊急警示】" : "【客戶回饋】"}${payload.customerName} 遞交了顧客評估表 - 案號 ${caseNumber}`,
      html: emailHtml,
      isUrgent
    });
    saveEmailOutbox(outbox);

    return res.json({
      success: true,
      caseNumber,
      isUrgent,
      aiSentiment,
      aiKeywords,
      aiCategory,
      aiReplySuggestion
    });
  } catch (error) {
    console.error("Submit error:", error);
    return res.status(500).json({ error: "問卷提交儲存失敗。" });
  }
});

// Getter helper to avoid referencing uninstantiated AI
function getRepliedAi() {
  try {
    return getGemini();
  } catch {
    return null;
  }
}

/**
 * 3. API: Admin get feedback records
 */
app.get("/api/admin/feedback", (req, res) => {
  const records = loadFeedbackRecords();
  return res.json(records);
});

/**
 * 4. API: Admin Action (Updates Case status / comments / logs)
 */
app.post("/api/admin/action", (req, res) => {
  try {
    const { id, action, operator, notes, status, severity, assignedRole } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Missing record ID." });
    }

    const records = loadFeedbackRecords();
    const index = records.findIndex((r) => r.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Record not found." });
    }

    const record = records[index];
    const now = new Date();

    // Log the update action
    const logItem = {
      timestamp: now.toISOString(),
      action: action || "更新案件狀態",
      operator: operator || "行政人員",
      notes: notes || "無補充備註。"
    };

    if (status) record.status = status;
    if (severity) record.severity = severity;
    if (assignedRole) record.assignedRole = assignedRole;
    
    // Append logs
    record.logs = record.logs || [];
    record.logs.push(logItem);

    records[index] = record;
    saveFeedbackRecords(records);

    return res.json({ success: true, record });
  } catch (error) {
    console.error("Action update error:", error);
    return res.status(500).json({ error: "案件追蹤更新失敗。" });
  }
});

/**
 * 5. API: Email Outbox simulation fetch
 */
app.get("/api/admin/outbox", (req, res) => {
  const outbox = loadEmailOutbox();
  return res.json(outbox);
});

/**
 * 6. API: Get Admin Settings
 */
app.get("/api/admin/settings", (req, res) => {
  const settings = loadSettings();
  return res.json(settings);
});

/**
 * 7. API: Save Admin Settings
 */
app.post("/api/admin/settings", (req, res) => {
  try {
    const { backupEmail, googleFormUrl, googleFormId } = req.body;
    if (!backupEmail) {
      return res.status(400).json({ error: "Missing backupEmail field." });
    }
    const settings = { 
      backupEmail,
      googleFormUrl: googleFormUrl || "https://docs.google.com/forms/d/e/1FAIpQLSeSgbyW8e-Zc_0pM5hX8gD3oJWee7y88V9C78z9pY7v_k5nDA/viewform?embedded=true",
      googleFormId: googleFormId || "1FAIpQLSeSgbyW8e-Zc_0pM5hX8gD3oJWee7y88V9C78z9pY7v_k5nDA"
    };
    saveSettings(settings);
    return res.json({ success: true, settings });
  } catch (err) {
    console.error("Save settings error:", err);
    return res.status(500).json({ error: "儲存系統設定失敗。" });
  }
});

/**
 * 8. API: Sync Google Forms Responses and create Feedback dossier records
 */
app.post("/api/admin/google-forms/sync", async (req, res) => {
  try {
    const { formId, accessToken, useSimulatedData } = req.body;

    if (!formId && !useSimulatedData) {
      return res.status(400).json({ error: "請提供 Google Form ID 或是選取測試模擬同步！" });
    }

    let rawResponses: any[] = [];
    let schemaItems: any[] = [];

    if (useSimulatedData) {
      schemaItems = [
        { itemId: "q_name", title: "客戶姓名/代表聯絡人" },
        { itemId: "q_comp", title: "公司商號名稱" },
        { itemId: "q_phone", title: "聯絡電話" },
        { itemId: "q_email", title: "電子信箱" },
        { itemId: "q_freq", title: "購買消費頻率" },
        { itemId: "q_taste", title: "產品滿意度-口感與風味" },
        { itemId: "q_fresh", title: "產品滿意度-新鮮度表現" },
        { itemId: "q_pack", title: "產品滿意度-外包裝完整度" },
        { itemId: "q_sug", title: "其他寶貴建議意見" },
        { itemId: "q_prod", title: "本次客訴之產品品名" },
        { itemId: "q_desc", title: "特定問題主旨描述說明" }
      ];

      rawResponses = [
        {
          responseId: `GF-SIM-${Date.now()}-1`,
          createTime: new Date(Date.now() - 7200000).toISOString(),
          answers: {
            "q_name": { textAnswers: { answers: [{ value: "陳建國" }] } },
            "q_comp": { textAnswers: { answers: [{ value: "建國食品商行" }] } },
            "q_phone": { textAnswers: { answers: [{ value: "0933-281-992" }] } },
            "q_email": { textAnswers: { answers: [{ value: "jiatang-agent-test@gmail.com" }] } },
            "q_freq": { textAnswers: { answers: [{ value: "每週 1 次" }] } },
            "q_taste": { textAnswers: { answers: [{ value: "5" }] } },
            "q_fresh": { textAnswers: { answers: [{ value: "5" }] } },
            "q_pack": { textAnswers: { answers: [{ value: "5" }] } },
            "q_sug": { textAnswers: { answers: [{ value: "滿意度很高！自從跟佳堂合作以來，品質一直很優異。希望能推出更多元的新品，我們一定會大力推廣。" }] } }
          }
        },
        {
          responseId: `GF-SIM-${Date.now()}-2`,
          createTime: new Date().toISOString(),
          answers: {
            "q_name": { textAnswers: { answers: [{ value: "賴美玲" }] } },
            "q_comp": { textAnswers: { answers: [{ value: "美玲精緻西點工坊" }] } },
            "q_phone": { textAnswers: { answers: [{ value: "03-492-3844" }] } },
            "q_email": { textAnswers: { answers: [{ value: "ling-bakery@gmail.com" }] } },
            "q_freq": { textAnswers: { answers: [{ value: "每週 3 次以上" }] } },
            "q_taste": { textAnswers: { answers: [{ value: "1" }] } },
            "q_fresh": { textAnswers: { answers: [{ value: "2" }] } },
            "q_pack": { textAnswers: { answers: [{ value: "1" }] } },
            "q_sug": { textAnswers: { answers: [{ value: "這次送來的麵糰包裝已經破損，導致有些麵糰表面乾燥、烤出來的口感味道極其差勁，客戶都在抱怨！" }] } },
            "q_prod": { textAnswers: { answers: [{ value: "千層酥皮麵糰" }] } },
            "q_desc": { textAnswers: { answers: [{ value: "外箱有撞擊壓扁，拆封時發現防潮塑膠袋已經破了大約10公分的口，麵糰已風乾瑕疵變硬！要求立即更換退新貨，否則將更換供應商" }] } }
          }
        }
      ];
    } else {
      if (!accessToken) {
        return res.status(401).json({ error: "請登入 Google 提供 Access Token 以便執行即時表單數據調用！" });
      }

      // 1. Fetch form metadata to map item IDs to titles
      const formSchemaUrl = `https://forms.googleapis.com/v1/forms/${formId}`;
      const schemaResponse = await fetch(formSchemaUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!schemaResponse.ok) {
        const errText = await schemaResponse.text();
        console.error("Google Forms API Error (Schema):", errText);
        return res.status(schemaResponse.status).json({ error: `下載表單結構失敗，原因: ${schemaResponse.statusText}。請確認 Form ID 是否正確，以及帳號存取授權是否已過期。` });
      }
      const schemaData: any = await schemaResponse.json();
      schemaItems = schemaData.items || [];

      // 2. Fetch responses
      const responsesUrl = `https://forms.googleapis.com/v1/forms/${formId}/responses`;
      const resResponse = await fetch(responsesUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!resResponse.ok) {
        const errText = await resResponse.text();
        console.error("Google Forms API Error (Responses):", errText);
        return res.status(resResponse.status).json({ error: `獲取表單回覆失敗，原因: ${resResponse.statusText}。` });
      }
      const responsesData: any = await resResponse.json();
      rawResponses = responsesData.responses || [];
    }

    if (rawResponses.length === 0) {
      return res.json({ success: true, count: 0, message: "該表單中目前無任何新增回應可供同步！" });
    }

    const records = loadFeedbackRecords();
    let importedCount = 0;

    for (const raw of rawResponses) {
      const gfResponseId = raw.responseId;
      const isDuplicate = records.some(r => r.id === `gf-${gfResponseId}` || r.id === gfResponseId);
      if (isDuplicate) {
        continue;
      }

      const answersMap: Record<string, string> = {};
      const ratingsMap: Record<string, number> = {};

      if (raw.answers) {
        Object.keys(raw.answers).forEach(qid => {
          const ansObj = raw.answers[qid];
          const textVal = ansObj.textAnswers?.answers?.[0]?.value || "";
          
          let qTitle = "";
          const item = schemaItems.find((itm: any) => {
            if (itm.itemId === qid) return true;
            if (itm.questionItem && itm.questionItem.question && itm.questionItem.question.questionId === qid) return true;
            return false;
          });
          
          if (item) {
            qTitle = item.title || "";
          } else {
            qTitle = qid; 
          }
          
          answersMap[qTitle] = textVal;

          const num = parseInt(textVal);
          if (!isNaN(num) && num >= 1 && num <= 5) {
            ratingsMap[qTitle] = num;
          }
        });
      }

      // Default variables mapped to model
      let customerName = "Google 表單填寫者";
      let companyName = "";
      let phone = "N/A";
      let email = "";
      let frequency = "其他";
      let otherSuggestions = "";
      let productName = "";
      let batchNumber = "";
      let problemCategory = "";
      let problemDescription = "";
      let improvementSuggestion = "";

      Object.keys(answersMap).forEach(title => {
        const val = answersMap[title];
        if (!val) return;

        const lowTitle = title.toLowerCase();
        if (lowTitle.includes("姓名") || lowTitle.includes("客戶姓名") || lowTitle.includes("聯絡人")) {
          customerName = val;
        } else if (lowTitle.includes("公司") || lowTitle.includes("商號") || lowTitle.includes("行號")) {
          companyName = val;
        } else if (lowTitle.includes("電話") || lowTitle.includes("手機") || lowTitle.includes("phone")) {
          phone = val;
        } else if (lowTitle.includes("郵件") || lowTitle.includes("信箱") || lowTitle.includes("email")) {
          email = val;
        } else if (lowTitle.includes("頻率") || lowTitle.includes("多久購買")) {
          frequency = val;
        } else if (lowTitle.includes("建議") || lowTitle.includes("意見") || lowTitle.includes("回饋說明")) {
          otherSuggestions = val;
        } else if (lowTitle.includes("產品") || lowTitle.includes("品名")) {
          productName = val;
        } else if (lowTitle.includes("批號")) {
          batchNumber = val;
        } else if (lowTitle.includes("描述") || lowTitle.includes("狀況") || lowTitle.includes("問題")) {
          problemDescription = val;
        } else if (lowTitle.includes("改善") || lowTitle.includes("期望")) {
          improvementSuggestion = val;
        }
      });

      const scores = {
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

      Object.keys(ratingsMap).forEach(title => {
        const rVal = ratingsMap[title];
        if (title.includes("口感") || title.includes("風味")) scores.taste = rVal;
        if (title.includes("穩定") || title.includes("品質")) scores.consistency = rVal;
        if (title.includes("新鮮")) scores.freshness = rVal;
        if (title.includes("包裝")) scores.packaging = rVal;
        if (title.includes("交貨") || title.includes("準時") || title.includes("配送")) scores.delivery = rVal;
        if (title.includes("達成") || title.includes("缺")) scores.completeness = rVal;
        if (title.includes("客服") || title.includes("回應") || title.includes("速度")) scores.serviceSpeed = rVal;
        if (title.includes("售後")) scores.afterSales = rVal;
        if (title.includes("價格") || title.includes("合理")) scores.price = rVal;
      });

      const scoreVals = Object.values(scores);
      const avgScore = scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length;

      const negativeKeywords = ["問題", "故障", "不滿", "退貨", "瑕疵", "異常", "差勁", "壞掉", "破損", "太慢"];
      let containsNegativeWord = false;
      const combinedText = otherSuggestions + " " + problemDescription;
      for (const kw of negativeKeywords) {
        if (combinedText.includes(kw)) {
          containsNegativeWord = true;
          break;
        }
      }

      const isUrgent = avgScore < 3.0 || containsNegativeWord;
      const severity = isUrgent ? "urgent" : "normal";

      if (productName && !problemCategory) {
        problemCategory = "產品質量質量異常";
      }

      // AI Analysis
      let aiSentiment: "positive" | "neutral" | "negative" = isUrgent ? "negative" : "positive";
      let aiKeywords: string[] = ["GoogleForms整合作業", "雲端表單即時同步"];
      let aiCategory = "綜合評估";
      let aiReplySuggestion = "感謝您使用 Google 表單回饋！我們已收到您的寶貴意見，佳堂實業將秉持高品質標準繼續為您服務。";

      const ai = getRepliedAi();
      if (ai) {
        try {
          const aiPrompt = `分析下列來自 Google Forms 的客戶回饋：
客戶名稱: ${customerName} (公司: ${companyName})
平均評分: ${avgScore.toFixed(1)} / 5
客戶建議: ${otherSuggestions || "無"}
問題描述: ${problemDescription || "無"}
改善建議: ${improvementSuggestion || "無"}`;

          const aiResponse = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: aiPrompt,
            config: {
              systemInstruction: "You are an expert product quality analyst for 佳堂實業股份有限公司. Apply Traditional Chinese analysis and provide JSON format mapping.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  sentiment: { type: Type.STRING },
                  keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                  category: { type: Type.STRING },
                  replySuggestion: { type: Type.STRING }
                },
                required: ["sentiment", "keywords", "category", "replySuggestion"]
              }
            }
          });

          if (aiResponse && aiResponse.text) {
            const aiData = JSON.parse(aiResponse.text.trim());
            if (aiData.sentiment) aiSentiment = aiData.sentiment as any;
            if (aiData.keywords) aiKeywords = aiData.keywords;
            if (aiData.category) aiCategory = aiData.category;
            if (aiData.replySuggestion) aiReplySuggestion = aiData.replySuggestion;
          }
        } catch (err) {
          console.error("Gemini sync parsing error (Ignored gracefully):", err);
        }
      }

      const submitTime = raw.createTime ? new Date(raw.createTime) : new Date();
      const dateStr = submitTime.toISOString().slice(0, 10).replace(/-/g, "");
      const gfCount = records.filter(r => r.caseNumber && r.caseNumber.startsWith(`JT-GF-${dateStr}`)).length;
      const serial = String(gfCount + 1).padStart(4, "0");
      const caseNumber = `JT-GF-${dateStr}-${serial}`;

      const newRecord = {
        id: `gf-${gfResponseId}`,
        caseNumber,
        timestamp: submitTime.toISOString(),
        customerName,
        companyName,
        phone,
        email,
        frequency,
        scores,
        otherSuggestions,
        productName,
        batchNumber,
        problemCategory,
        problemDescription,
        improvementSuggestion,
        images: [],
        status: "pending" as any,
        severity: severity as any,
        aiSentiment,
        aiKeywords,
        aiCategory,
        aiReplySuggestion,
        logs: [
          {
            timestamp: new Date().toISOString(),
            action: "Google Forms 整合同步",
            operator: "網關防護系統",
            notes: `自動從雲端谷歌表單拉取回應資料並入案件庫。回應 ID: ${gfResponseId}。`
          }
        ]
      };

      records.push(newRecord);

      // Save SIM SMTP emails outbox for monitoring
      const outbox = loadEmailOutbox();
      const settingsObj = loadSettings();
      const isNotifyGmail = settingsObj.backupEmail || "jiatang1602@gmail.com";

      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; border: 2px solid ${isUrgent ? "#dc2626" : "#0284c7"}; border-radius: 8px; padding: 20px;">
          <h2 style="color: ${isUrgent ? "#dc2626" : "#0284c7"}; margin-top: 0;">
            ${isUrgent ? "⚠️ 【佳堂警示】負評與客訴同步通報 (來自 Google 表單)" : "📬 【佳堂通知】客戶滿意度回饋同步 (來自 Google 表單)"}
          </h2>
          <p>閣下好，系統已從 **Google Forms 自動化整合作業** 成功匯入並同步一筆最新客戶回應：</p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; font-weight: bold; width: 120px;">案件編號：</td><td><b>${caseNumber}</b></td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">表單提交時間：</td><td>${submitTime.toLocaleString("zh-TW")}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">客戶名稱：</td><td>${customerName} (${companyName || "個人"})</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">聯絡電話：</td><td>${phone}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">電子郵件：</td><td>${email || "未提供"}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">來源表單：</td><td>${formId || "模擬測試表單"}</td></tr>
          </table>
          <h3 style="color: #0284c7; margin-bottom: 8px;">📊 調查滿意評分：</h3>
          <ul style="margin-top: 0; padding-left: 20px;">
            <li>口感風味：${scores.taste}⭐</li>
            <li>品質穩定：${scores.consistency}⭐</li>
            <li>新鮮度：${scores.freshness}⭐</li>
            <li>包裝完整：${scores.packaging}⭐</li>
            <li>配送準時：${scores.delivery}⭐</li>
            <li>訂單達成：${scores.completeness}⭐</li>
            <li>客服回應：${scores.serviceSpeed}⭐</li>
            <li>售後處理：${scores.afterSales}⭐</li>
            <li>價格合理：${scores.price}⭐</li>
          </ul>
          ${otherSuggestions ? `<p><b>綜合意見建議：</b><br>${otherSuggestions}</p>` : ""}
          ${productName ? `<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin-top: 15px; border-radius: 4px;">
            <b style="color: #b91c1c;">🚨 專屬客訴問題：</b><br>
            <b>產品名稱：</b>${productName}<br>
            <b>狀況描述：</b>${problemDescription}<br>
            <b>改善建議：</b>${improvementSuggestion || "無"}
          </div>` : ""}
          <p style="font-size: 11px; color: #6b7280; margin-top: 20px;">本信件自 佳堂實業股份有限公司 谷歌表單整合作業 派送發出。</p>
        </div>
      `;

      outbox.push({
        id: `mail-gf-${Date.now()}-${importedCount}`,
        timestamp: new Date().toISOString(),
        to: isNotifyGmail,
        subject: `【GoogleForms 同步】${isUrgent ? "【⚠️緊急警示】" : ""}${customerName} 回應了顧客調查表 - 案號 ${caseNumber}`,
        html: emailHtml,
        isUrgent
      });

      saveEmailOutbox(outbox);
      importedCount++;
    }

    if (importedCount > 0) {
      saveFeedbackRecords(records);
    }

    return res.json({ 
      success: true, 
      count: importedCount, 
      message: `成功同步完成！本次自谷歌表單新增匯入 ${importedCount} 筆全新客戶問卷回覆，並對接防護警示引擎！`
    });
  } catch (error: any) {
    console.error("Forms sync error:", error);
    return res.status(500).json({ error: `同步谷歌表單發生內部系統錯誤：${error.message || error}` });
  }
});

/**
 * Vite or Static Router entry
 */
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Jiatang Industrial] Live Server listening on URL: http://localhost:${PORT}`);
  });
}

startServer();
