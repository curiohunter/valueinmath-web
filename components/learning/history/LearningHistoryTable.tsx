import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// 점수 색상 스타일 함수 (노션 스타일)
const scoreColor = (score: number) => {
  switch (score) {
    case 1: return "bg-red-100 text-red-600 border-red-200";
    case 2: return "bg-orange-100 text-orange-600 border-orange-200";
    case 3: return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case 4: return "bg-blue-100 text-blue-600 border-blue-200";
    case 5: return "bg-green-100 text-green-700 border-green-200";
    default: return "bg-gray-100 text-gray-400 border-gray-200";
  }
};

interface LearningHistoryTableProps {
  data: any[];
  paginatedData: any[];
  classMap: { [id: string]: string };
  studentMap: { [id: string]: string };
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  onCellClick: (title: string, content: string) => void;
  onEdit: (row: any) => void;
  onDelete: (id: string, row: any) => void;
  isDeleting: boolean;
}

export function LearningHistoryTable({
  data,
  paginatedData,
  classMap,
  studentMap,
  page,
  setPage,
  pageSize,
  totalPages,
  loading,
  error,
  onCellClick,
  onEdit,
  onDelete,
  isDeleting,
}: LearningHistoryTableProps) {
  // 페이지네이션된 데이터를 반별로 그룹화
  const paginatedGroupedData = paginatedData.reduce((groups: { [className: string]: any[] }, item) => {
    const className = item.class_id 
      ? (classMap[item.class_id] || item.class_id) 
      : (item.class_name_snapshot || '클래스 없음');
    if (!groups[className]) {
      groups[className] = [];
    }
    groups[className].push(item);
    return groups;
  }, {});
  
  // 그룹 정보와 함께 데이터 준비
  const groupsToDisplay = Object.entries(paginatedGroupedData).map(([className, items]) => {
    const dates = items.map(item => item.date).filter(Boolean).sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const displayName = startDate && endDate && startDate !== endDate 
      ? `${className} [${startDate}] → [${endDate}]`
      : startDate 
      ? `${className} [${startDate}]`
      : className;
    return { className, items, displayName, startDate };
  }).sort((a, b) => {
    if (a.startDate && b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    return a.className.localeCompare(b.className);
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow border">
        <div className="text-center text-gray-400 py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          로딩 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow border">
        <div className="text-center text-red-500 py-12 px-4">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-32">반</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-24">학생</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-28">날짜</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-16">출결</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-16">숙제</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-20">집중도</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-44 max-w-[240px]">교재1</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-36 max-w-[180px]">진도1</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-44 max-w-[240px]">교재2</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-36 max-w-[180px]">진도2</th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700 w-32 max-w-[120px]">특이사항</th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700 w-20">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-gray-400">
                  <div className="text-gray-300 text-4xl mb-4">📋</div>
                  <div className="text-lg font-medium text-gray-500 mb-2">기록이 없습니다</div>
                  <div className="text-sm text-gray-400">검색 조건을 조정해보세요</div>
                </td>
              </tr>
            ) : (
              groupsToDisplay.map((group, groupIndex) => (
                <React.Fragment key={group.className}>
                  {/* 반별 그룹 헤더 */}
                  <tr className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-200">
                    <td colSpan={12} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-semibold text-green-800">
                          {group.displayName}
                        </span>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          {group.items.length}건
                        </span>
                      </div>
                    </td>
                  </tr>
                  {/* 그룹 내 데이터 */}
                  {group.items.map((row, i) => (
                    <tr key={`${group.className}-${i}`} className="hover:bg-blue-50/50 transition-colors duration-150">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {/* 반 이름은 그룹 헤더에 있으므로 비우기 */}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                        {studentMap[row.student_id] || row.student_id}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 font-mono">
                        {row.date?.replace(/^2025-/, '') || row.date}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 text-xs font-bold rounded-full border-2 ${scoreColor(parseInt(row.attendance_status) || 0)}`}>
                          {row.attendance_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 text-xs font-bold rounded-full border-2 ${scoreColor(parseInt(row.homework) || 0)}`}>
                          {row.homework}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 text-xs font-bold rounded-full border-2 ${scoreColor(parseInt(row.focus) || 0)}`}>
                          {row.focus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600 hover:text-blue-800 cursor-pointer hover:underline font-medium max-w-[240px] truncate"
                          onClick={() => onCellClick("교재1", row.book1)}>
                        {row.book1 || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600 hover:text-blue-800 cursor-pointer hover:underline max-w-[180px] truncate"
                          onClick={() => onCellClick("진도1", row.book1log)}>
                        {row.book1log || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600 hover:text-blue-800 cursor-pointer hover:underline font-medium max-w-[240px] truncate"
                          onClick={() => onCellClick("교재2", row.book2)}>
                        {row.book2 || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600 hover:text-blue-800 cursor-pointer hover:underline max-w-[180px] truncate"
                          onClick={() => onCellClick("진도2", row.book2log)}>
                        {row.book2log || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 cursor-pointer hover:text-gray-800 hover:bg-gray-50 rounded max-w-[120px] truncate"
                          onClick={() => onCellClick("특이사항", row.note)}>
                        {row.note ? (
                          <div className="truncate" title={row.note}>
                            {row.note}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(row)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">수정</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">삭제</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>기록 삭제</AlertDialogTitle>
                                <AlertDialogDescription>
                                  정말로 이 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>취소</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => onDelete(row.class_id + row.student_id + row.date, row)} 
                                  disabled={isDeleting} 
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {isDeleting ? "삭제 중..." : "삭제"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* 개선된 페이지네이션 */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            총 <span className="font-semibold text-gray-800">{data.length}</span>개 중{' '}
            <span className="font-semibold text-gray-800">
              {((page-1)*pageSize)+1}-{Math.min(page*pageSize, data.length)}
            </span>개 표시
          </div>
          <div className="flex items-center space-x-2">
            <button 
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
              onClick={() => setPage(Math.max(1, page-1))} 
              disabled={page===1}
            >
              이전
            </button>
            <div className="flex items-center space-x-1">
              {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 text-sm rounded-md transition-colors ${
                      page === pageNum
                        ? 'bg-blue-500 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button 
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
              onClick={() => setPage(Math.min(totalPages, page+1))} 
              disabled={page===totalPages}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}