import React from 'react';

export default function ScheduleFilters() {
  return (
    <div className="flex flex-wrap gap-2 px-6 py-2 bg-white border-b items-center">
      <select className="border rounded px-3 py-2 text-sm">
        <option>전체 유형</option>
        <option>학교일정</option>
        <option>수업관련</option>
        <option>재원생상담</option>
        <option>직원일정</option>
        <option>신규입학관련</option>
        <option>학원일정</option>
        <option>기타</option>
      </select>
      <select className="border rounded px-3 py-2 text-sm">
        <option>전체 상태</option>
        <option>진행중</option>
        <option>완료됨</option>
        <option>취소</option>
      </select>
      <select className="border rounded px-3 py-2 text-sm">
        <option>전체 담당관</option>
        <option>고등관</option>
        <option>중등관</option>
        <option>영재관</option>
        <option>과학</option>
      </select>
      <input className="border rounded px-3 py-2 text-sm flex-1 min-w-[200px]" placeholder="일정 제목/설명 검색" />
    </div>
  );
} 