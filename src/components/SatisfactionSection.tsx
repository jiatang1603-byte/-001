import React from 'react';
import { Star } from 'lucide-react';
import { SatisfactionScores } from '../types';

interface SatisfactionSectionProps {
  scores: SatisfactionScores;
  onChange: (scores: SatisfactionScores) => void;
}

interface QuestionConfig {
  key: keyof SatisfactionScores;
  title: string;
  sub: string;
  labels: string[];
}

export const SatisfactionSection: React.FC<SatisfactionSectionProps> = ({ scores, onChange }) => {
  const questions: QuestionConfig[] = [
    {
      key: 'taste',
      title: '1. 口感與風味',
      sub: '(常規 Q彈度、鹹甜風味是否穩定一致)',
      labels: ['不佳', "尚可", "滿意", "非常滿意", "完美極致"]
    },
    {
      key: 'consistency',
      title: '2. 品質穩定度',
      sub: '(不同批次、日期的產品，品質是否均一)',
      labels: ['不穩定', "偶有落差", "穩定", "非常穩定", "完美無瑕"]
    },
    {
      key: 'freshness',
      title: '3. 新鮮度表現',
      sub: '(產品送達後之色澤、自然鮮氣與保存狀態)',
      labels: ['不新鮮', "勉強", "新鮮物美", "極致新鮮", "滿分鮮嫩"]
    },
    {
      key: 'packaging',
      title: '4. 外包裝完整性',
      sub: '(封口是否牢固、外袋標籤是否清晰、有無任何破損)',
      labels: ['破損/漏氣', "封底未緊", "包裝完整", "封裝精美", "無懈可擊"]
    },
    {
      key: 'delivery',
      title: '5. 交貨準時性',
      sub: '(配送車輛是否在約定的時間帶內送達)',
      labels: ['延遲嚴重', "偶有遲到", "按時送達", "極度準時", "超前契合"]
    },
    {
      key: 'completeness',
      title: '6. 訂單達成率',
      sub: '(有無出現商品缺貨、送錯品項、品項數量漏開)',
      labels: ['常開錯單', "偶有配錯", "全數正確", "精確無漏", "無比貼心"]
    },
    {
      key: 'serviceSpeed',
      title: '7. 業務/客服回應速度',
      sub: '(業務聯繫、產品諮詢、接單處理是否迅速親切)',
      labels: ['態度怠慢', "回覆較慢", "迅速流暢", "親切貼心", "賓至如歸"]
    },
    {
      key: 'afterSales',
      title: '8. 售後問題處理',
      sub: '(若有異常品反映，相關人員的處理效率與態度)',
      labels: ['推諉卸責', "處理緩慢", "有效解決", "迅速負責", "感動服務"]
    },
    {
      key: 'price',
      title: '9. 價格合理性',
      sub: '(相較於同業及市面上同等商品的質地與性價比)',
      labels: ['昂貴不值', "偏高", "合理超值", "性價比高", "佛心超划算"]
    }
  ];

  const handleScoreChange = (key: keyof SatisfactionScores, score: number) => {
    onChange({
      ...scores,
      [key]: score
    });
  };

  return (
    <div className="space-y-6">
      {questions.map((q) => {
        const currentScore = scores[q.key];
        return (
          <div key={q.key} id={`q-${q.key}`} className="bg-sky-50/20 hover:bg-sky-50/50 border border-sky-100/60 rounded-2xl p-5 md:p-6 transition-all duration-200 shadow-sm">
            <div className="text-left mb-3">
              <h4 className="text-lg md:text-xl font-bold text-slate-850 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0077be] inline-block"></span>
                {q.title}
              </h4>
              <p className="text-slate-500 text-sm md:text-base mt-1 ml-4.5">{q.sub}</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 ml-4.5">
              {/* Star rating buttons with large touch-target of 40-48px */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    id={`btn-${q.key}-${star}`}
                    type="button"
                    onClick={() => handleScoreChange(q.key, star)}
                    className="p-1 px-2 focus:outline-none focus:ring-2 focus:ring-sky-300 rounded-xl transition-all duration-150 transform active:scale-95"
                    title={`${star} stars`}
                  >
                    <Star
                      className={`w-10 h-10 md:w-11 md:h-11 cursor-pointer transition-all ${
                        star <= currentScore
                          ? 'fill-amber-400 text-amber-500 drop-shadow-[0_1.5px_4px_rgba(245,158,11,0.4)] scale-110'
                          : 'text-slate-300 hover:text-amber-400'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Text label indicating selection meaning */}
              <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
                <span className="text-lg md:text-xl font-extrabold text-[#003366] bg-sky-50 border border-sky-100/70 px-4 py-1 rounded-full text-center shrink-0">
                  {currentScore}分
                </span>
                <span className="text-slate-700 font-bold text-xs md:text-sm ml-3 bg-white/90 border border-slate-100 px-3.5 py-1.5 rounded-full shadow-xs">
                  {q.labels[currentScore - 1]}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
