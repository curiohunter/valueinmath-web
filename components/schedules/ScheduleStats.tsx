import React from 'react';

const stats = [
  { label: '총 일정', value: 24 },
  { label: '완료율', value: '83%' },
  { label: '목표 달성률', value: '71%' },
  { label: '만족도', value: '4.7/5' },
];

export default function ScheduleStats() {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-slate-50 border-b">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg bg-white shadow p-4 flex flex-col items-center">
          <span className="text-sm text-gray-500">{stat.label}</span>
          <span className="text-2xl font-bold mt-1">{stat.value}</span>
        </div>
      ))}
    </section>
  );
} 