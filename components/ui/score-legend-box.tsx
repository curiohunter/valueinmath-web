import * as React from "react";

const legends = {
  attendance: [
    { value: 1, label: "1:❌ 결석" },
    { value: 2, label: "2:🏃 조퇴" },
    { value: 3, label: "3:🚶 30분내 등원" },
    { value: 4, label: "4:⏰ 15분내 등원" },
    { value: 5, label: "5:🟢 수업시작전 등원" },
  ],
  homework: [
    { value: 1, label: "1:❌ 결석" },
    { value: 2, label: "2:📝 보강필요" },
    { value: 3, label: "3:🔍 추가 추적 필요" },
    { value: 4, label: "4:✅ 90% 이상" },
    { value: 5, label: "5:🏅 100% 마무리" },
  ],
  focus: [
    { value: 1, label: "1:❌ 결석" },
    { value: 2, label: "2:⚠️ 조치필요" },
    { value: 3, label: "3:😐 산만하나 진행가능" },
    { value: 4, label: "4:👍 대체로 잘 들음" },
    { value: 5, label: "5:🔥 매우 열의있음" },
  ],
};

type ScoreType = keyof typeof legends;

interface ScoreLegendBoxProps {
  type: ScoreType;
}

export function ScoreLegendBox({ type }: ScoreLegendBoxProps) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 border text-sm flex flex-col gap-1 w-fit min-w-[180px]">
      <div className="font-semibold mb-1">{type === 'attendance' ? '출결' : type === 'homework' ? '숙제' : '집중도'} 점수 설명</div>
      {legends[type].map(opt => {
        const [num, emoji, ...descArr] = opt.label.replace(':', ' ').split(' ');
        const desc = descArr.join(' ');
        return (
          <div key={opt.value} className="flex items-center gap-2">
            <span className="w-5 text-center font-bold text-gray-700">{num}</span>
            <span className="w-6 text-center">{emoji}</span>
            <span className="flex-1">{desc}</span>
          </div>
        );
      })}
    </div>
  );
} 