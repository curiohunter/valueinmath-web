"use client"

import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react"
import type { LeadSourceMetrics, SortField, SortDirection } from "../types"

interface LeadSourceTabProps {
  sortedMetrics: LeadSourceMetrics[]
  summary: LeadSourceMetrics | null
  sortField: SortField
  sortDirection: SortDirection
  onSort: (field: SortField) => void
}

export function LeadSourceTab({
  sortedMetrics,
  summary,
  sortField,
  sortDirection,
  onSort,
}: LeadSourceTabProps) {
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    return sortDirection === "asc"
      ? <ChevronUp className="h-3 w-3 ml-1" />
      : <ChevronDown className="h-3 w-3 ml-1" />
  }

  return (
    <div className="space-y-4">
      {/* 테이블 상단 설명 */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">유입 채널별 전환율 및 비용 효율 분석</p>
      </div>

      {sortedMetrics.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th
                  className="text-left p-2 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => onSort("source")}
                >
                  <div className="flex items-center">
                    소스 <SortIcon field="source" />
                  </div>
                </th>
                <th
                  className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => onSort("firstContacts")}
                >
                  <div className="flex items-center justify-center">
                    첫상담 <SortIcon field="firstContacts" />
                  </div>
                </th>
                <th
                  className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => onSort("tests")}
                >
                  <div className="flex items-center justify-center">
                    테스트 <SortIcon field="tests" />
                  </div>
                </th>
                <th
                  className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => onSort("enrollments")}
                >
                  <div className="flex items-center justify-center">
                    등록 <SortIcon field="enrollments" />
                  </div>
                </th>
                <th
                  className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => onSort("testRate")}
                >
                  <div className="flex items-center justify-center">
                    리드→테스트 <SortIcon field="testRate" />
                  </div>
                </th>
                <th
                  className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => onSort("testToEnrollRate")}
                >
                  <div className="flex items-center justify-center">
                    테스트→등록 <SortIcon field="testToEnrollRate" />
                  </div>
                </th>
                <th
                  className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => onSort("conversionRate")}
                >
                  <div className="flex items-center justify-center">
                    전체전환율 <SortIcon field="conversionRate" />
                  </div>
                </th>
                <th
                  className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => onSort("avgDaysToEnroll")}
                >
                  <div className="flex items-center justify-center">
                    소요일 <SortIcon field="avgDaysToEnroll" />
                  </div>
                </th>
                <th
                  className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => onSort("avgConsultations")}
                >
                  <div className="flex items-center justify-center">
                    상담횟수 <SortIcon field="avgConsultations" />
                  </div>
                </th>
                <th
                  className="text-center p-2 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => onSort("totalCost")}
                >
                  <div className="flex items-center justify-center">
                    비용 <SortIcon field="totalCost" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMetrics.map((source) => (
                <tr key={source.source} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">{source.source}</td>
                  <td className="p-2 text-center">{source.firstContacts}</td>
                  <td className="p-2 text-center">{source.tests}</td>
                  <td className="p-2 text-center font-bold text-green-600">
                    {source.enrollments}
                  </td>
                  <td className="p-2 text-center">
                    <Badge
                      className={
                        source.testRate >= 70
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : source.testRate >= 50
                          ? "bg-sky-100 text-sky-700 hover:bg-sky-100"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                      }
                    >
                      {source.testRate}%
                    </Badge>
                  </td>
                  <td className="p-2 text-center">
                    <Badge
                      className={
                        source.testToEnrollRate >= 60
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : source.testToEnrollRate >= 40
                          ? "bg-sky-100 text-sky-700 hover:bg-sky-100"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                      }
                    >
                      {source.testToEnrollRate}%
                    </Badge>
                  </td>
                  <td className="p-2 text-center">
                    <Badge
                      className={
                        source.conversionRate >= 30
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : source.conversionRate >= 15
                          ? "bg-sky-100 text-sky-700 hover:bg-sky-100"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                      }
                    >
                      {source.conversionRate}%
                    </Badge>
                  </td>
                  <td className="p-2 text-center text-muted-foreground">
                    {source.avgDaysToEnroll !== null ? `${source.avgDaysToEnroll}일` : "-"}
                  </td>
                  <td className="p-2 text-center text-muted-foreground">
                    {source.avgConsultations !== null ? `${source.avgConsultations}회` : "-"}
                  </td>
                  <td className="p-2 text-center text-muted-foreground">
                    {source.totalCost !== null ? `${source.totalCost.toLocaleString()}원` : "-"}
                  </td>
                </tr>
              ))}
              {summary && (
                <tr className="border-t-2 bg-muted/50 font-semibold">
                  <td className="p-2">{summary.source}</td>
                  <td className="p-2 text-center">{summary.firstContacts}</td>
                  <td className="p-2 text-center">{summary.tests}</td>
                  <td className="p-2 text-center text-green-600">
                    {summary.enrollments}
                  </td>
                  <td className="p-2 text-center">
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      {summary.testRate}%
                    </Badge>
                  </td>
                  <td className="p-2 text-center">
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      {summary.testToEnrollRate}%
                    </Badge>
                  </td>
                  <td className="p-2 text-center">
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      {summary.conversionRate}%
                    </Badge>
                  </td>
                  <td className="p-2 text-center">
                    {summary.avgDaysToEnroll !== null ? `${summary.avgDaysToEnroll}일` : "-"}
                  </td>
                  <td className="p-2 text-center">
                    {summary.avgConsultations !== null ? `${summary.avgConsultations}회` : "-"}
                  </td>
                  <td className="p-2 text-center">
                    {summary.totalCost !== null ? `${summary.totalCost.toLocaleString()}원` : "-"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          리드 소스 데이터가 없습니다.
        </div>
      )}
    </div>
  )
}
