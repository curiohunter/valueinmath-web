import React from 'react';

export default function ScheduleSidebar() {
  return (
    <aside className="h-full w-full bg-white border-l px-4 py-6 flex flex-col gap-4">
      <div className="text-lg font-semibold mb-2">📅 일정 패널</div>
      <div className="text-gray-500 text-sm">
        여기에 일정 상세, 빠른 추가, 필터, 통계 등<br />
        다양한 부가 기능을 넣을 수 있습니다.
      </div>
      {/* 필요에 따라 추가 UI/기능 구현 */}
    </aside>
  );
} 