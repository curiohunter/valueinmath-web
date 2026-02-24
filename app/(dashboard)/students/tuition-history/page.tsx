// @ts-nocheck
"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import StudentClassTabs from "@/components/students/StudentClassTabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";
import type { Database } from "@/types/database";
import { Input } from "@/components/ui/input";
import { TuitionTable } from "@/components/tuition/tuition-table";
import { Save, Trash2, Download, Filter, Calendar, Send, RefreshCw, CreditCard, Receipt, CheckCircle2, AlertCircle, Clock, UserX, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TuitionRow, PaymentStatus, ClassType, TuitionFeeInput, AppliedDiscount, AppliedTextbook } from "@/types/tuition";
import {
  removeDiscountFromTuition,
  applyPolicyToTuition,
  applyRewardToTuition,
  getApplicablePoliciesBatch,
  getPendingRewards,
  type DiscountDetail,
  type Campaign,
  type CampaignParticipant
} from "@/services/campaign-service";
import { getPendingAssignments, applyTextbookToTuition, removeTextbookFromTuition } from "@/services/textbook-service";
import { exportTuitionToExcelWithPhone } from "@/lib/excel-export";
import { SendInvoiceModal, PointBalance } from "@/components/payssam";

// 금액 포맷팅 함수
const formatAmount = (amount: number) => {
  return amount.toLocaleString() + "원";
};

// 통계 계산 함수 - 단일 순회로 최적화 (js-combine-iterations)
// 분할납부(분할청구) 학생은 이미 이전 청구에서 계산되었으므로 총 금액에서 제외
const calculateStats = (data: TuitionRow[]) => {
  let totalAmount = 0;
  let paidCount = 0;
  let paidAmount = 0;
  let unpaidCount = 0;
  let unpaidAmount = 0;
  let partialCount = 0;
  let partialAmount = 0;

  for (const row of data) {
    const amount = row.amount;
    const status = row.paymentStatus;

    if (status === '완납') {
      paidCount++;
      paidAmount += amount;
      totalAmount += amount;
    } else if (status === '미납') {
      unpaidCount++;
      unpaidAmount += amount;
      totalAmount += amount;
    } else if (status === '분할청구') {
      partialCount++;
      partialAmount += amount;
      // 분할청구는 totalAmount에 포함하지 않음
    } else {
      totalAmount += amount;
    }
  }

  return {
    totalCount: data.length,
    totalAmount,
    paidCount,
    paidAmount,
    unpaidCount,
    unpaidAmount,
    partialCount,
    partialAmount
  };
};

export default function TuitionHistoryPage() {
  const supabase = createClient<Database>();
  const { user, loading: authLoading } = useAuth();
  
  // 필터 상태
  const [datePreset, setDatePreset] = useState("custom");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]); // 반별 중복선택
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]); // 학생 중복선택으로 변경
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("");
  const [selectedClassType, setSelectedClassType] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TuitionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 반/학생 id→이름 매핑
  const [classMap, setClassMap] = useState<{ [id: string]: string }>({});
  const [studentMap, setStudentMap] = useState<{ [id: string]: string }>({});
  const [classOptions, setClassOptions] = useState<{id: string, name: string, teacher_id?: string | null}[]>([]);
  const [studentOptions, setStudentOptions] = useState<{id: string, name: string}[]>([]);
  const [classSearch, setClassSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [teachers, setTeachers] = useState<{id: string, name: string}[]>([]);
  
  // 테이블 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [classTypeFilter, setClassTypeFilter] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  
  // 변경사항 추적
  const [originalData, setOriginalData] = useState<TuitionRow[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // PaysSam 관련 상태
  const [showSendInvoiceModal, setShowSendInvoiceModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  // isCreatingInvoices는 1단계 워크플로우 통합으로 제거됨 (isSendingInvoices로 대체)
  const [isSendingInvoices, setIsSendingInvoices] = useState(false);
  const [isProcessingOfflinePayment, setIsProcessingOfflinePayment] = useState(false);

  // 할인 정책 관련 상태
  const [policiesByStudent, setPoliciesByStudent] = useState<Record<string, Campaign[]>>({});
  const [pendingRewardsByStudent, setPendingRewardsByStudent] = useState<Record<string, CampaignParticipant[]>>({});
  // 교재 배정 관련 상태
  const [pendingTextbooksByStudent, setPendingTextbooksByStudent] = useState<Record<string, any[]>>({});

  // 학원비 미생성 학생 관련 상태
  const [missingTuitionStudents, setMissingTuitionStudents] = useState<{
    studentId: string;
    studentName: string;
    className: string;
    classId: string;
    monthlyFee: number;
  }[]>([]);
  const [isMissingExpanded, setIsMissingExpanded] = useState(false);
  const [isMissingLoading, setIsMissingLoading] = useState(false);

  // 반 이름 매핑 및 선생님 정보 fetch (초기 로드)
  useEffect(() => {
    async function fetchClassesAndTeachers() {
      // 반 정보 가져오기 (teacher_id 포함)
      const { data: classes } = await supabase.from("classes").select("id,name,teacher_id").eq("is_active", true);
      setClassMap(Object.fromEntries((classes || []).map((c: any) => [c.id, c.name])));
      setClassOptions(classes || []);
      
      // 선생님 정보 가져오기 (재직 중인 직원)
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("id, name")
        .eq("status", "재직");
      
      if (employeesError) {
        console.error("Error fetching employees:", employeesError);
      }
      
      setTeachers(employeesData || []);
    }
    fetchClassesAndTeachers();
  }, []);

  // 날짜 범위에 따른 학생 목록 동적 fetch
  useEffect(() => {
    async function fetchStudentsInDateRange() {
      if (!dateRange.from || !dateRange.to) return;

      const [fromYear, fromMonth] = dateRange.from.split('-').map(Number);
      const [toYear, toMonth] = dateRange.to.split('-').map(Number);

      // 날짜 범위에 해당하는 tuition_fees에서 unique한 student_id들을 가져오기
      let query = supabase
        .from("tuition_fees")
        .select("student_id, students!inner(id, name)")
        .order("students(name)", { ascending: true });

      // 날짜 범위 필터링
      if (fromYear && fromMonth && toYear && toMonth) {
        if (fromYear === toYear) {
          query = query
            .eq("year", fromYear)
            .gte("month", fromMonth)
            .lte("month", toMonth);
        } else {
          query = query.or(
            `and(year.eq.${fromYear},month.gte.${fromMonth}),` +
            `and(year.eq.${toYear},month.lte.${toMonth})` +
            (toYear - fromYear > 1 ? `,and(year.gt.${fromYear},year.lt.${toYear})` : '')
          );
        }
      }

      const { data, error } = await query;
      
      if (!error && data) {
        // 중복 제거하여 unique한 학생 목록 생성
        const uniqueStudents = new Map();
        data.forEach((item: any) => {
          if (item.students && !uniqueStudents.has(item.student_id)) {
            uniqueStudents.set(item.student_id, {
              id: item.student_id,
              name: item.students.name
            });
          }
        });

        const studentList = Array.from(uniqueStudents.values()).sort((a, b) => 
          a.name.localeCompare(b.name, 'ko')
        );
        
        setStudentOptions(studentList);
        setStudentMap(Object.fromEntries(studentList.map((s: any) => [s.id, s.name])));
        
        // 날짜 범위가 변경되면 선택된 학생 중 새로운 날짜 범위에 없는 학생만 제거
        setSelectedStudents(prev => prev.filter(id => uniqueStudents.has(id)));
      }
    }

    fetchStudentsInDateRange();
  }, [dateRange]);

  // 이번 달 기본 설정
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const lastDayStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    setDateRange({ from: firstDay, to: lastDayStr });
  }, []);

  // 학원비 미생성 학생 조회 (날짜 범위 변경 시)
  useEffect(() => {
    async function fetchMissingTuitionStudents() {
      if (!dateRange.from) return;

      const [year, month] = dateRange.from.split('-').map(Number);
      if (!year || !month) return;

      setIsMissingLoading(true);
      try {
        // 1. 활성 반 정보 가져오기 (monthly_fee > 0인 반만)
        const { data: classes, error: classError } = await supabase
          .from("classes")
          .select("id, name, monthly_fee")
          .eq("is_active", true)
          .gt("monthly_fee", 0);

        if (classError || !classes) {
          console.error("반 조회 오류:", classError);
          return;
        }

        // 2. 반에 등록된 재원 학생 가져오기
        const { data: classStudents, error: csError } = await supabase
          .from("class_students")
          .select(`
            class_id,
            student_id,
            students!inner(id, name, status)
          `)
          .in("class_id", classes.map(c => c.id));

        if (csError || !classStudents) {
          console.error("반-학생 조회 오류:", csError);
          return;
        }

        // 재원 학생만 필터링
        const activeClassStudents = classStudents.filter((cs: any) =>
          cs.students?.status === '재원'
        );

        // 3. 해당 연월의 학원비 조회
        const { data: tuitionFees, error: tfError } = await supabase
          .from("tuition_fees")
          .select("student_id, class_id")
          .eq("year", year)
          .eq("month", month);

        if (tfError) {
          console.error("학원비 조회 오류:", tfError);
          return;
        }

        // 4. 이미 생성된 학원비의 (student_id, class_id) 조합을 Set으로 만들기
        const existingTuitionSet = new Set(
          (tuitionFees || []).map(tf => `${tf.student_id}-${tf.class_id}`)
        );

        // 5. 미생성 학생 찾기
        const missing: typeof missingTuitionStudents = [];

        for (const cs of activeClassStudents) {
          const classInfo = classes.find(c => c.id === cs.class_id);
          if (!classInfo) continue;

          const key = `${cs.student_id}-${cs.class_id}`;
          if (!existingTuitionSet.has(key)) {
            missing.push({
              studentId: cs.student_id,
              studentName: (cs.students as any)?.name || '알 수 없음',
              className: classInfo.name,
              classId: cs.class_id,
              monthlyFee: classInfo.monthly_fee || 0
            });
          }
        }

        // 반 이름 → 학생 이름 순으로 정렬
        missing.sort((a, b) => {
          const classCompare = a.className.localeCompare(b.className, 'ko');
          if (classCompare !== 0) return classCompare;
          return a.studentName.localeCompare(b.studentName, 'ko');
        });

        setMissingTuitionStudents(missing);
      } catch (error) {
        console.error("미생성 학생 조회 오류:", error);
      } finally {
        setIsMissingLoading(false);
      }
    }

    fetchMissingTuitionStudents();
  }, [dateRange.from]);

  // 할인 정책 및 대기 중인 이벤트 보상 fetch
  async function fetchDiscountData(studentIds: string[]) {
    try {
      // 1. 학생별 적용 가능한 정책 조회
      const policiesResult = await getApplicablePoliciesBatch(supabase, studentIds);
      if (policiesResult.success && policiesResult.data) {
        setPoliciesByStudent(policiesResult.data);
      }

      // 2. 대기 중인 이벤트 보상 조회 (pending 상태만)
      const rewardsResult = await getPendingRewards(supabase);
      if (rewardsResult.success && rewardsResult.data) {
        // 학생 ID별로 그룹화
        const rewardsByStudent: Record<string, CampaignParticipant[]> = {};
        rewardsResult.data.forEach(reward => {
          const studentId = reward.student_id;
          if (!rewardsByStudent[studentId]) {
            rewardsByStudent[studentId] = [];
          }
          rewardsByStudent[studentId].push(reward);
        });
        setPendingRewardsByStudent(rewardsByStudent);
      }

      // 교재 배정 조회
      const textbooksResult = await getPendingAssignments(supabase);
      if (textbooksResult.success && textbooksResult.data) {
        const byStudent: Record<string, any[]> = {};
        for (const assignment of textbooksResult.data) {
          if (!byStudent[assignment.student_id]) {
            byStudent[assignment.student_id] = [];
          }
          byStudent[assignment.student_id].push(assignment);
        }
        setPendingTextbooksByStudent(byStudent);
      }
    } catch (error) {
      console.error("할인/교재 데이터 조회 에러:", error);
    }
  }

  // 데이터 페칭 함수
  async function fetchTuitionHistoryWithFilters(resetPage: boolean = true) {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("tuition_fees")
        .select(`
          id,
          class_id,
          student_id,
          year,
          month,
          is_sibling,
          class_type,
          amount,
          note,
          payment_status,
          period_start_date,
          period_end_date,
          base_amount,
          total_discount,
          discount_details,
          additional_details,
          total_additional,
          classes!left(name),
          students!left(name, status),
          payssam_bills(bill_id, request_status, short_url, sent_at, paid_at)
        `);
      
      // 연월 범위 필터 - 정확한 필터링 로직
      if (dateRange.from && dateRange.to) {
        const [fromYear, fromMonth] = dateRange.from.split('-').map(Number);
        const [toYear, toMonth] = dateRange.to.split('-').map(Number);
        
        if (fromYear && fromMonth && toYear && toMonth) {
          if (fromYear === toYear) {
            // 같은 연도 내에서 월 범위
            query = query
              .eq("year", fromYear)
              .gte("month", fromMonth)
              .lte("month", toMonth);
          } else {
            // 연도를 넘나드는 범위
            query = query.or(
              `and(year.eq.${fromYear},month.gte.${fromMonth}),` +
              `and(year.eq.${toYear},month.lte.${toMonth})` +
              (toYear - fromYear > 1 ? `,and(year.gt.${fromYear},year.lt.${toYear})` : '')
            );
          }
        }
      } else if (dateRange.from) {
        const [fromYear, fromMonth] = dateRange.from.split('-').map(Number);
        if (fromYear && fromMonth) {
          query = query.or(`year.gt.${fromYear},and(year.eq.${fromYear},month.gte.${fromMonth})`);
        }
      } else if (dateRange.to) {
        const [toYear, toMonth] = dateRange.to.split('-').map(Number);
        if (toYear && toMonth) {
          query = query.or(`year.lt.${toYear},and(year.eq.${toYear},month.lte.${toMonth})`);
        }
      }
      
      // 반 필터 (중복선택 지원)
      if (selectedClasses.length > 0) {
        query = query.in("class_id", selectedClasses);
      }
      
      // 학생 필터 (중복선택 지원)
      if (selectedStudents.length > 0) {
        query = query.in("student_id", selectedStudents);
      }

      // 납부 상태 필터
      if (selectedPaymentStatus) {
        query = query.eq("payment_status", selectedPaymentStatus);
      }

      const { data, error } = await query.order("year", { ascending: false }).order("month", { ascending: false });
      
      if (error) throw error;

      // 데이터 변환
      // @ts-ignore - Supabase 복잡한 관계 타입 처리
      const transformedData: TuitionRow[] = (data || []).map((item: any) => {
        const studentStatus = (item.students as any)?.status || '';
        const studentName = (item.students as any)?.name || '(알 수 없음)';
        // class_type이 '입학테스트비'인지 확인 (공백 제거하여 비교)
        const isEntranceTest = item.class_type?.trim() === '입학테스트비';
        const isRetired = !isEntranceTest && studentStatus && !studentStatus.includes('재원');

        // 반명 처리: 입학테스트비인 경우 "입학테스트비", 아니면 기존 반명 또는 "(반 정보 없음)"
        const className = isEntranceTest ? '입학테스트비' :
                         ((item.classes as any)?.name || '(반 정보 없음)');

        // discount_details JSONB를 appliedDiscounts로 변환
        const discountDetails = (item.discount_details || []) as DiscountDetail[];
        const appliedDiscounts: AppliedDiscount[] = discountDetails.map((d: DiscountDetail) => ({
          id: d.participant_id || d.campaign_id || `discount-${Math.random()}`,
          type: d.type === 'event' ? 'event' : 'policy',
          title: d.description || (d.type === 'sibling' ? '형제 할인' : '할인'),
          amount: d.amount,
          amountType: d.amount_type || 'fixed',
          rawValue: d.amount,
        }));

        // additional_details JSONB를 appliedTextbooks로 변환
        const additionalDetails = (item.additional_details || []) as any[];
        const appliedTextbooks: AppliedTextbook[] = additionalDetails
          .filter((d: any) => d.type === 'textbook')
          .map((d: any) => ({
            assignmentId: d.assignment_id,
            textbookName: d.textbook_name || '교재',
            amount: d.amount || 0,
            quantity: d.quantity || 1,
          }));

        // 활성 청구서 찾기 (payssam_bills JOIN 결과에서)
        const bills = (item.payssam_bills || []) as any[];
        const activeBill = bills.find(
          (b: any) => !['destroyed', 'cancelled', 'failed'].includes(b.request_status)
        ) || null;

        return {
          id: item.id,
          classId: item.class_id,
          className: className,
          studentId: item.student_id,
          studentName: isEntranceTest ? studentName :
                       (isRetired ? `${studentName} (퇴원)` : studentName),
          year: item.year,
          month: item.month,
          isSibling: item.is_sibling || false,
          classType: item.class_type,
          amount: item.amount,
          note: item.note || '',
          paymentStatus: item.payment_status,
          periodStartDate: item.period_start_date || undefined,
          periodEndDate: item.period_end_date || undefined,
          // PaysSam 필드 (payssam_bills 테이블에서)
          paysSamBillId: activeBill?.bill_id || null,
          paysSamRequestStatus: activeBill?.request_status || null,
          paysSamShortUrl: activeBill?.short_url || null,
          paysSamSentAt: activeBill?.sent_at || null,
          paysSamPaidAt: activeBill?.paid_at || null,
          // 할인 필드
          appliedDiscounts: appliedDiscounts.length > 0 ? appliedDiscounts : undefined,
          originalAmount: item.base_amount || undefined,
          // 교재비 필드
          appliedTextbooks: appliedTextbooks.length > 0 ? appliedTextbooks : undefined,
        };
      });

      // 클라이언트 사이드에서 반 이름으로 추가 정렬
      transformedData.sort((a, b) => {
        // 먼저 년도로 비교 (내림차순)
        if (a.year !== b.year) return b.year - a.year;
        // 같은 년도면 월로 비교 (내림차순)
        if (a.month !== b.month) return b.month - a.month;
        // 같은 년월이면 반 이름으로 비교 (오름차순)
        return a.className.localeCompare(b.className, 'ko');
      });

      setData(transformedData);
      setOriginalData(JSON.parse(JSON.stringify(transformedData))); // 깊은 복사
      setHasUnsavedChanges(false); // 데이터 로드 시 변경사항 없음

      // resetPage가 true일 때만 페이지를 1로 리셋
      if (resetPage) {
        setPage(1);
      }

      // 할인 정책 데이터 로드 (학생 ID 기반)
      const uniqueStudentIds = [...new Set(transformedData.map(row => row.studentId).filter(Boolean))];
      if (uniqueStudentIds.length > 0) {
        fetchDiscountData(uniqueStudentIds);
      }
    } catch (e) {
      console.error("데이터 fetch 에러:", e);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 검색 버튼 클릭 시
  function handleSearch() {
    // 변경사항이 있으면 경고
    if (hasUnsavedChanges) {
      const confirmChange = window.confirm("저장하지 않은 변경사항이 있습니다. 계속하시겠습니까?");
      if (!confirmChange) return;
    }
    
    // 검색 실행 (selectedClasses와 selectedStudents는 이미 state에 있으므로 자동으로 적용됨)
    fetchTuitionHistoryWithFilters();
  }

  // 초기화 버튼
  function resetFilters() {
    // 변경사항이 있으면 경고
    if (hasUnsavedChanges) {
      const confirmChange = window.confirm("저장하지 않은 변경사항이 있습니다. 계속하시겠습니까?");
      if (!confirmChange) return;
    }
    
    setClassSearch("");
    setStudentSearch("");
    setSelectedClasses([]); // 반별 중복선택 초기화
    setSelectedStudents([]); // 학생 중복선택 초기화
    setSelectedPaymentStatus("");
    setSelectedClassType("");
    setSearchTerm("");
    setPaymentStatusFilter("all");
    setClassTypeFilter("all");
    setDatePreset("custom");
    setSelectedRows([]);
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const lastDayStr = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    setDateRange({ from: firstDay, to: lastDayStr });
    
    // 필터 초기화 후 데이터 다시 불러오기
    fetchTuitionHistoryWithFilters();
  }

  // 페이지당 아이템 수
  const pageSize = 12;

  // 검색 및 필터링 적용 - useMemo로 캐싱
  const filteredData = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return data.filter(row => {
      // 검색어 필터
      const searchMatches = !searchTerm ||
        row.studentName.toLowerCase().includes(searchLower) ||
        row.className.toLowerCase().includes(searchLower) ||
        (row.note && row.note.toLowerCase().includes(searchLower));

      // 납부 상태 필터
      const statusMatches = paymentStatusFilter === "all" || row.paymentStatus === paymentStatusFilter;

      // 수업 유형 필터
      const classTypeMatches = classTypeFilter === "all" || row.classType === classTypeFilter;

      return searchMatches && statusMatches && classTypeMatches;
    });
  }, [data, searchTerm, paymentStatusFilter, classTypeFilter]);

  // 페이지네이션 계산 - useMemo로 캐싱
  const { totalPages, paginatedData } = useMemo(() => {
    const total = Math.ceil(filteredData.length / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return {
      totalPages: total,
      paginatedData: filteredData.slice(startIndex, endIndex)
    };
  }, [filteredData, page, pageSize]);

  // 통계 계산 - useMemo로 캐싱
  const stats = useMemo(() => calculateStats(filteredData), [filteredData]);

  // 개별 행 수정 핸들러
  const handleRowChange = (index: number, field: keyof TuitionRow, value: any) => {
    // paginatedData의 index를 사용하여 직접 접근
    if (index < paginatedData.length) {
      const rowToUpdate = paginatedData[index];
      const originalDataIndex = data.findIndex(item => item.id === rowToUpdate.id);
      
      if (originalDataIndex !== -1) {
        setData(prev => prev.map((row, i) => 
          i === originalDataIndex ? { ...row, [field]: value } : row
        ));
      }
    }
  };

  // 개별 행 저장 핸들러
  const handleRowSave = async (index: number) => {
    if (index >= paginatedData.length) return;

    const row = paginatedData[index];

    // 디버깅: 저장 시점의 note 값 확인
    console.log('저장할 row:', row.id, 'note:', row.note, 'note 타입:', typeof row.note);

    setIsSaving(true);
    try {
      // 빈 문자열이면 null로, 아니면 원래 값 유지
      const noteValue = row.note === '' || row.note === null || row.note === undefined ? null : row.note;

      const { error } = await supabase
        .from("tuition_fees")
        .update({
          year: row.year,
          month: row.month,
          class_type: row.classType,
          payment_status: row.paymentStatus,
          amount: row.amount,
          is_sibling: row.isSibling,
          note: noteValue,
          period_start_date: row.periodStartDate || null,
          period_end_date: row.periodEndDate || null
        })
        .eq("id", row.id);

      if (error) throw error;

      toast.success(`${row.studentName}의 학원비가 저장되었습니다.`);
      
      // 데이터 새로고침 (페이지 유지)
      fetchTuitionHistoryWithFilters(false);
    } catch (error) {
      console.error("학원비 저장 에러:", error);
      toast.error("학원비 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 개별 행 삭제 핸들러
  const handleRowDelete = async (index: number) => {
    if (index >= paginatedData.length) return;

    const row = paginatedData[index];
    const confirmDelete = window.confirm(`정말로 ${row.studentName}의 ${row.year}년 ${row.month}월 학원비를 삭제하시겠습니까?`);

    if (!confirmDelete) return;

    try {
      // 1. 캠페인 참여자의 연결 해제 및 상태를 '대기'로 변경
      await supabase
        .from("campaign_participants")
        .update({
          reward_applied_tuition_id: null,
          reward_status: 'pending',
          reward_paid_at: null
        })
        .eq("reward_applied_tuition_id", row.id);

      // 2. 학원비 삭제
      const { error } = await supabase
        .from("tuition_fees")
        .delete()
        .eq("id", row.id);

      if (error) throw error;

      toast.success(`${row.studentName}의 학원비가 성공적으로 삭제되었습니다.`);

      // 데이터 새로고침 (페이지 유지)
      fetchTuitionHistoryWithFilters(false);
    } catch (error) {
      console.error("학원비 삭제 에러:", error);
      toast.error("학원비 삭제 중 오류가 발생했습니다.");
    }
  };

  // 할인 취소 핸들러 (이력 모드에서 DB에서 할인 제거)
  const handleCancelDiscount = async (index: number, discountId: string) => {
    if (index >= paginatedData.length) return;

    const row = paginatedData[index];
    const confirm = window.confirm("이 할인을 제거하시겠습니까?");
    if (!confirm) return;

    try {
      // removeDiscountFromTuition API 호출
      const result = await removeDiscountFromTuition(supabase, row.id, discountId);

      if (result.success) {
        toast.success("할인이 제거되었습니다.");
        // 데이터 새로고침
        fetchTuitionHistoryWithFilters(false);
      } else {
        toast.error(result.error || "할인 제거에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("할인 제거 오류:", error);
      toast.error(error.message || "할인 제거 중 오류가 발생했습니다.");
    }
  };

  // 정책 적용 핸들러 (이력 모드에서 DB에 할인 추가)
  const handleApplyPolicy = async (index: number, policyId: string) => {
    if (index >= paginatedData.length) return;

    const row = paginatedData[index];
    const policy = policiesByStudent[row.studentId]?.find(p => p.id === policyId);
    if (!policy) {
      toast.error("정책을 찾을 수 없습니다.");
      return;
    }

    try {
      const result = await applyPolicyToTuition(supabase, policyId, row.id);

      if (result.success) {
        toast.success(`${policy.title} 할인이 적용되었습니다.`);
        // 데이터 새로고침
        fetchTuitionHistoryWithFilters(false);
      } else {
        toast.error(result.error || "할인 적용에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("할인 적용 오류:", error);
      toast.error(error.message || "할인 적용 중 오류가 발생했습니다.");
    }
  };

  // 이벤트 보상 적용 핸들러 (이력 모드에서 DB에 할인 추가)
  const handleApplyEvent = async (index: number, participantId: string) => {
    if (index >= paginatedData.length) return;

    const row = paginatedData[index];
    const rewards = pendingRewardsByStudent[row.studentId] || [];
    const reward = rewards.find(r => r.id === participantId);
    if (!reward) {
      toast.error("이벤트 보상을 찾을 수 없습니다.");
      return;
    }

    try {
      const result = await applyRewardToTuition(supabase, participantId, row.id);

      if (result.success) {
        toast.success("이벤트 보상이 적용되었습니다.");
        // 데이터 새로고침
        fetchTuitionHistoryWithFilters(false);
      } else {
        toast.error(result.error || "이벤트 보상 적용에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("이벤트 보상 적용 오류:", error);
      toast.error(error.message || "이벤트 보상 적용 중 오류가 발생했습니다.");
    }
  };

  // 교재비 적용 핸들러
  const handleApplyTextbook = async (assignmentId: string, index: number) => {
    if (index >= paginatedData.length) return;
    const row = paginatedData[index];

    try {
      const result = await applyTextbookToTuition(supabase, assignmentId, row.id);
      if (result.success) {
        toast.success("교재비가 적용되었습니다.");
        fetchTuitionHistoryWithFilters(false);
        // pending 목록에서 제거
        setPendingTextbooksByStudent(prev => {
          const updated = { ...prev };
          for (const studentId in updated) {
            updated[studentId] = updated[studentId].filter((a: any) => a.id !== assignmentId);
            if (updated[studentId].length === 0) delete updated[studentId];
          }
          return updated;
        });
      } else {
        toast.error(result.error || "교재비 적용에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("교재비 적용 오류:", error);
      toast.error(error.message || "교재비 적용 중 오류가 발생했습니다.");
    }
  };

  // 교재비 취소 핸들러
  const handleCancelTextbook = async (assignmentId: string, index: number) => {
    if (index >= paginatedData.length) return;
    const row = paginatedData[index];

    const confirm = window.confirm("이 교재비를 제거하시겠습니까?");
    if (!confirm) return;

    try {
      const result = await removeTextbookFromTuition(supabase, row.id, assignmentId);
      if (result.success) {
        toast.success("교재비가 제거되었습니다.");
        fetchTuitionHistoryWithFilters(false);
      } else {
        toast.error(result.error || "교재비 제거에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("교재비 제거 오류:", error);
      toast.error(error.message || "교재비 제거 중 오류가 발생했습니다.");
    }
  };

  // 행 선택 핸들러
  const handleRowSelect = (index: number, selected: boolean) => {
    // paginatedData의 실제 row ID를 사용하여 선택 관리
    if (index >= paginatedData.length) return;

    const row = paginatedData[index];
    const globalIndex = data.findIndex(item => item.id === row.id);

    if (selected) {
      setSelectedRows([...selectedRows, globalIndex]);
    } else {
      setSelectedRows(selectedRows.filter(i => i !== globalIndex));
    }
  };

  // 이 페이지 전체 선택 핸들러
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      // 이 페이지의 모든 행을 선택 (global index 기준)
      const pageGlobalIndices = paginatedData.map(row => data.findIndex(item => item.id === row.id)).filter(i => i !== -1);
      setSelectedRows([...new Set([...selectedRows, ...pageGlobalIndices])]);
    } else {
      // 모든 선택 해제
      setSelectedRows([]);
    }
  };

  // 필터된 전체 데이터 선택 핸들러
  const handleSelectAllFiltered = () => {
    // filteredData의 모든 행을 선택 (global index 기준)
    const allFilteredIndices = filteredData.map(row => data.findIndex(item => item.id === row.id)).filter(i => i !== -1);
    setSelectedRows([...new Set(allFilteredIndices)]);
  };

  // 선택 삭제 핸들러
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) {
      toast.error("선택된 항목이 없습니다.");
      return;
    }

    const confirmDelete = window.confirm(`선택한 ${selectedRows.length}개의 학원비를 삭제하시겠습니까?`);

    if (!confirmDelete) return;

    setIsSaving(true);
    try {
      // 선택된 행들의 ID 수집
      // selectedRows는 data 배열의 global index를 저장하므로 data[index]로 접근
      const idsToDelete = selectedRows
        .map(index => data[index]?.id)
        .filter(id => id);

      if (idsToDelete.length === 0) {
        toast.error("삭제할 항목을 찾을 수 없습니다.");
        return;
      }

      // 1. 캠페인 참여자의 연결 해제 및 상태를 '대기'로 변경
      await supabase
        .from("campaign_participants")
        .update({
          reward_applied_tuition_id: null,
          reward_status: 'pending',
          reward_applied_at: null
        })
        .in("reward_applied_tuition_id", idsToDelete);

      // 2. 일괄 삭제
      const { error } = await supabase
        .from("tuition_fees")
        .delete()
        .in("id", idsToDelete);

      if (error) throw error;

      toast.success(`${idsToDelete.length}개의 학원비가 삭제되었습니다.`);

      // 선택 초기화
      setSelectedRows([]);

      // 데이터 새로고침 (페이지 유지)
      fetchTuitionHistoryWithFilters(false);
    } catch (error) {
      console.error("일괄 삭제 에러:", error);
      toast.error("학원비 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 엑셀 내보내기 핸들러
  const handleExport = async () => {
    try {
      // filteredData를 사용하여 현재 필터된 데이터만 내보내기
      const getPaymentPhone = async (studentId: string): Promise<{payment: string | null, parent: string | null}> => {
        const { data, error } = await supabase
          .from("students")
          .select("payment_phone, parent_phone")
          .eq("id", studentId)
          .single();

        if (error || !data) return { payment: null, parent: null };
        return {
          payment: data.payment_phone,
          parent: data.parent_phone
        };
      };

      // 파일명 생성 (날짜 범위 포함)
      let filename = "학원비_청구";
      if (dateRange?.from || dateRange?.to) {
        if (dateRange.from) {
          const [year, month] = dateRange.from.split('-');
          filename += `_${year}년${parseInt(month)}월`;
        }
        if (dateRange.to && dateRange.to !== dateRange.from) {
          const [year, month] = dateRange.to.split('-');
          filename += `-${year}년${parseInt(month)}월`;
        }
      }

      await exportTuitionToExcelWithPhone(filteredData, getPaymentPhone, filename);
      toast.success("엑셀 파일이 다운로드되었습니다.");
    } catch (error) {
      console.error("엑셀 내보내기 에러:", error);
      toast.error("엑셀 내보내기 중 오류가 발생했습니다.");
    }
  };

  // 전체 저장 핸들러 (모든 변경된 데이터 저장)
  const handleSave = async () => {
    // 변경된 데이터만 찾기
    const changedRows = data.filter((row, index) => {
      const originalRow = originalData[index];
      return JSON.stringify(row) !== JSON.stringify(originalRow);
    });

    if (changedRows.length === 0) {
      toast.info("변경된 데이터가 없습니다.");
      return;
    }

    setIsSaving(true);
    try {
      // 변경된 데이터 일괄 저장
      for (const row of changedRows) {
        // 빈 문자열이면 null로
        const noteValue = row.note === '' || row.note === null || row.note === undefined ? null : row.note;

        const { error } = await supabase
          .from("tuition_fees")
          .update({
            year: row.year,
            month: row.month,
            class_type: row.classType,
            payment_status: row.paymentStatus,
            amount: row.amount,
            is_sibling: row.isSibling,
            note: noteValue,
            period_start_date: row.periodStartDate || null,
            period_end_date: row.periodEndDate || null
          })
          .eq("id", row.id);

        if (error) throw error;
      }

      toast.success(`${changedRows.length}개의 학원비가 저장되었습니다.`);
      
      // 데이터 새로고침 (페이지 유지)
      fetchTuitionHistoryWithFilters(false);
    } catch (error) {
      console.error("학원비 저장 에러:", error);
      toast.error("학원비 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // PaysSam 일괄 상태 동기화 핸들러
  const handleBulkSync = async () => {
    // 발송된 청구서만 동기화 대상
    const syncTargets = filteredData.filter(
      row => row.paysSamRequestStatus === 'sent' || row.paysSamRequestStatus === 'paid'
    );

    if (syncTargets.length === 0) {
      toast.info("동기화할 청구서가 없습니다.");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch("/api/payssam/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tuitionFeeIds: syncTargets.map(row => row.id)
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || `${data.data?.success || 0}건 동기화 완료`);
        fetchTuitionHistoryWithFilters(false); // 데이터 새로고침
      } else {
        toast.error(data.error || "동기화 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("동기화 중 오류가 발생했습니다.");
    } finally {
      setIsSyncing(false);
    }
  };

  // 청구서 일괄 발송 핸들러 (1단계 워크플로우: 결제선생 등록 + 카카오톡 발송)
  // PaysSam에서 "발송"이 곧 "등록"이므로 create API를 사용
  const handleBulkSendInvoices = async () => {
    // selectedRows는 data 배열의 global index를 저장하므로 data[index]로 접근
    const selectedFees = selectedRows
      .map(index => data[index])
      .filter(Boolean)
      .filter(row => !row.paysSamBillId && row.paymentStatus !== '완납'); // 미발송 & 미완납만

    if (selectedFees.length === 0) {
      toast.error("발송할 수 있는 청구서가 없습니다.\n(미발송 & 미완납 상태만 가능)");
      return;
    }

    const confirmSend = window.confirm(
      `선택한 ${selectedFees.length}건의 청구서를 발송하시겠습니까?\n\n` +
      `※ 카카오톡으로 청구서가 발송됩니다.\n` +
      `※ 쌤포인트가 차감됩니다.\n` +
      `※ 결제선생 앱에서 현장결제가 가능해집니다.`
    );

    if (!confirmSend) return;

    setIsSendingInvoices(true);
    try {
      const response = await fetch("/api/payssam/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tuitionFeeIds: selectedFees.map(fee => fee.id)
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || `${data.data?.success || 0}건 발송 완료`);
        setSelectedRows([]);
        fetchTuitionHistoryWithFilters(false);
      } else {
        toast.error(data.error || "청구서 발송 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Send invoice error:", error);
      toast.error("청구서 발송 중 오류가 발생했습니다.");
    } finally {
      setIsSendingInvoices(false);
    }
  };

  // 현장결제 완료 처리 핸들러 (DB만 업데이트)
  const handleOfflinePaymentComplete = async () => {
    // selectedRows는 data 배열의 global index를 저장하므로 data[index]로 접근
    const selectedFees = selectedRows
      .map(index => data[index])
      .filter(Boolean)
      .filter(row =>
        row.paysSamRequestStatus === 'created' ||
        row.paysSamRequestStatus === 'sent'
      ); // created 또는 sent 상태만

    if (selectedFees.length === 0) {
      toast.error("현장결제 처리할 수 있는 항목이 없습니다.\n(생성됨 또는 청구됨 상태만 가능)");
      return;
    }

    const confirmPayment = window.confirm(
      `선택한 ${selectedFees.length}건을 현장결제 완료로 처리하시겠습니까?\n\n` +
      `※ PaysSam 앱에서 실제 결제를 먼저 진행해주세요.\n` +
      `※ DB에서 완납 처리만 됩니다 (PaysSam API 호출 없음).`
    );

    if (!confirmPayment) return;

    setIsProcessingOfflinePayment(true);
    try {
      const response = await fetch("/api/payssam/offline-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tuitionFeeIds: selectedFees.map(fee => fee.id)
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || `${data.data?.success || 0}건 완료 처리`);
        setSelectedRows([]);
        fetchTuitionHistoryWithFilters(false);
      } else {
        toast.error(data.error || "현장결제 처리 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Offline payment error:", error);
      toast.error("현장결제 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessingOfflinePayment(false);
    }
  };

  // 선택된 항목 중 발송/현장결제 가능한 건수 계산 - useMemo로 캐싱
  // PaysSam에서는 "발송"이 곧 "등록"이므로 1단계 워크플로우로 통합
  const invoiceActionCounts = useMemo(() => {
    // selectedRows는 data 배열의 global index를 저장하고 있으므로
    // data[index]로 접근해야 함 (filteredData[index]가 아님)
    const selectedFees = selectedRows.map(index => data[index]).filter(Boolean);

    // 발송 가능: 청구서가 없고 완납이 아닌 건
    const sendableCount = selectedFees.filter(
      row => !row.paysSamBillId && row.paymentStatus !== '완납'
    ).length;

    // 현장결제 가능: 청구서가 발송된 상태 (sent)
    const offlinePayableCount = selectedFees.filter(
      row => row.paysSamRequestStatus === 'sent'
    ).length;

    return { sendableCount, offlinePayableCount };
  }, [selectedRows, data]);

  // 선택된 행들의 TuitionRow 데이터 - useMemo로 캐싱
  const selectedFeesForInvoice = useMemo((): TuitionRow[] => {
    // selectedRows는 data 배열의 global index를 저장하므로 data[index]로 접근
    return selectedRows
      .map(index => data[index])
      .filter(Boolean);
  }, [selectedRows, data]);

  // TuitionTable에 전달할 selectedRows (현재 페이지 기준) - useMemo로 캐싱
  const tableSelectedRows = useMemo(() => {
    return paginatedData.map((row, idx) => {
      const globalIndex = data.findIndex(item => item.id === row.id);
      return selectedRows.includes(globalIndex) ? idx : -1;
    }).filter(i => i !== -1);
  }, [paginatedData, data, selectedRows]);

  // 데이터 새로고침 콜백 - useCallback으로 안정화
  const handleRefresh = useCallback(() => {
    fetchTuitionHistoryWithFilters(false);
  }, []);

  // 초기 데이터 로드 - 날짜 범위가 설정되면 한 번만 로드
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchTuitionHistoryWithFilters();
    }
  }, [dateRange.from, dateRange.to]);

  // 데이터 변경 감지 - 효율적인 비교 (JSON.stringify 대신 필드별 비교)
  useEffect(() => {
    if (data.length !== originalData.length) {
      setHasUnsavedChanges(true);
      return;
    }
    // 빠른 변경 감지: 주요 편집 가능 필드만 비교
    const hasChanges = data.some((row, index) => {
      const orig = originalData[index];
      if (!orig) return true;
      return (
        row.paymentStatus !== orig.paymentStatus ||
        row.amount !== orig.amount ||
        row.note !== orig.note ||
        row.classType !== orig.classType ||
        row.isSibling !== orig.isSibling
      );
    });
    setHasUnsavedChanges(hasChanges);
  }, [data, originalData]);

  if (authLoading) return (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <div className="text-gray-400">로딩 중...</div>
    </div>
  );
  
  if (!user) return (
    <div className="p-8 text-center">
      <div className="text-red-400 text-4xl mb-4">🔒</div>
      <div className="text-red-500">로그인이 필요합니다</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <StudentClassTabs />

      {/* PaysSam 관리 영역 */}
      <div className="flex items-center justify-between">
        <PointBalance compact />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkSync}
            disabled={isSyncing}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? '동기화 중...' : '상태 동기화'}
          </Button>

          {/* 청구서 발송 (1단계 워크플로우: 결제선생 등록 + 카카오톡 발송) */}
          <Button
            size="sm"
            onClick={handleBulkSendInvoices}
            disabled={selectedRows.length === 0 || isSendingInvoices}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className={`w-4 h-4 mr-2 ${isSendingInvoices ? 'animate-pulse' : ''}`} />
            {isSendingInvoices ? '발송 중...' : `청구서 발송 (${invoiceActionCounts.sendableCount})`}
          </Button>

          {/* 현장결제 완료 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOfflinePaymentComplete}
            disabled={selectedRows.length === 0 || isProcessingOfflinePayment}
            className="text-green-600 border-green-200 hover:bg-green-50"
          >
            <CreditCard className={`w-4 h-4 mr-2 ${isProcessingOfflinePayment ? 'animate-pulse' : ''}`} />
            {isProcessingOfflinePayment ? '처리 중...' : `현장결제 완료 (${invoiceActionCounts.offlinePayableCount})`}
          </Button>
        </div>
      </div>

      {/* 학원비 미생성 학생 카드 */}
      {dateRange.from && (
        <Card className={cn(
          "border transition-all duration-200",
          missingTuitionStudents.length > 0
            ? "bg-gradient-to-br from-violet-50 to-purple-50 border-violet-300 cursor-pointer hover:shadow-md"
            : "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200"
        )}
          onClick={() => missingTuitionStudents.length > 0 && setIsMissingExpanded(!isMissingExpanded)}
        >
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-lg text-white",
                  missingTuitionStudents.length > 0 ? "bg-violet-500" : "bg-gray-400"
                )}>
                  <UserX className="h-5 w-5" />
                </div>
                <div>
                  <p className={cn(
                    "text-xs font-medium",
                    missingTuitionStudents.length > 0 ? "text-violet-600" : "text-gray-500"
                  )}>
                    {dateRange.from.split('-')[1]}월 학원비 미생성
                  </p>
                  {isMissingLoading ? (
                    <p className="text-lg font-bold text-gray-400">조회중...</p>
                  ) : (
                    <p className={cn(
                      "text-2xl font-bold",
                      missingTuitionStudents.length > 0 ? "text-violet-700" : "text-gray-500"
                    )}>
                      {missingTuitionStudents.length}
                      <span className={cn(
                        "text-sm font-normal ml-0.5",
                        missingTuitionStudents.length > 0 ? "text-violet-500" : "text-gray-400"
                      )}>명</span>
                    </p>
                  )}
                </div>
              </div>
              {missingTuitionStudents.length > 0 && (
                <div className="text-violet-500">
                  {isMissingExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 미생성 학생 목록 (펼침) */}
      {isMissingExpanded && missingTuitionStudents.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/50 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserX className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-semibold text-violet-800">
                {dateRange.from.split('-')[1]}월 학원비 미생성 학생
              </h3>
              <Badge variant="outline" className="bg-violet-100 text-violet-700 border-violet-300 text-xs">
                {missingTuitionStudents.length}명
              </Badge>
            </div>
            {/* 반별로 그룹핑하여 표시 */}
            <div className="space-y-3">
              {Object.entries(
                missingTuitionStudents.reduce((acc, item) => {
                  if (!acc[item.className]) {
                    acc[item.className] = [];
                  }
                  acc[item.className].push(item);
                  return acc;
                }, {} as Record<string, typeof missingTuitionStudents>)
              ).map(([className, students]) => (
                <div key={className} className="space-y-1">
                  <div className="text-xs font-medium text-violet-700 flex items-center gap-2">
                    <span>{className}</span>
                    <span className="text-violet-500">({students.length}명)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {students.map(student => (
                      <Badge
                        key={`${student.studentId}-${student.classId}`}
                        variant="secondary"
                        className="bg-white border border-violet-200 text-violet-800 hover:bg-violet-100 transition-colors px-3 py-1.5 text-sm font-medium"
                      >
                        {student.studentName}
                        <span className="ml-1 text-violet-500 font-normal">
                          ({formatAmount(student.monthlyFee)})
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* 통계 카드 - 반관리 페이지와 일관된 디자인 */}
      {filteredData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 전체 청구 */}
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-slate-600 text-white">
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">전체 청구</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-slate-800">{stats.totalCount}<span className="text-sm font-normal text-slate-500 ml-0.5">건</span></p>
                    <p className="text-sm font-semibold text-slate-600">{formatAmount(stats.totalAmount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 완납 */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-emerald-600 font-medium">완납</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-emerald-700">{stats.paidCount}<span className="text-sm font-normal text-emerald-500 ml-0.5">건</span></p>
                    <p className="text-sm font-semibold text-emerald-600">{formatAmount(stats.paidAmount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 미납 */}
          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-red-500 text-white">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-red-600 font-medium">미납</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-red-700">{stats.unpaidCount}<span className="text-sm font-normal text-red-500 ml-0.5">건</span></p>
                    <p className="text-sm font-semibold text-red-600">{formatAmount(stats.unpaidAmount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 분할청구 */}
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500 text-white">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-amber-600 font-medium">분할청구</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-amber-700">{stats.partialCount}<span className="text-sm font-normal text-amber-500 ml-0.5">건</span></p>
                    <p className="text-sm font-semibold text-amber-600">{formatAmount(stats.partialAmount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 저장 버튼 및 경고 메시지 */}
      {hasUnsavedChanges && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-amber-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-amber-800 font-medium">변경사항이 있습니다. 저장하지 않으면 변경사항이 사라집니다.</span>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                저장 중...
              </div>
            ) : (
              "전체 저장"
            )}
          </Button>
        </div>
      )}

      {/* 메인 테이블 */}
      {loading ? (
        <Card className="p-12">
          <div className="text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            로딩 중...
          </div>
        </Card>
      ) : error ? (
        <Card className="p-12">
          <div className="text-center text-red-500">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            {error}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <TuitionTable
            rows={paginatedData}
            originalRows={filteredData}
            totalFilteredCount={filteredData.length}
            onRowChange={handleRowChange}
            onRowDelete={handleRowDelete}
            onRowSave={handleRowSave}
            onSave={handleSave}
            isSaving={isSaving}
            selectedRows={tableSelectedRows}
            totalSelectedCount={selectedRows.length}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            onSelectAllFiltered={handleSelectAllFiltered}
            onBulkDelete={handleBulkDelete}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            paymentStatusFilter={paymentStatusFilter}
            onPaymentStatusFilterChange={setPaymentStatusFilter}
            classTypeFilter={classTypeFilter}
            onClassTypeFilterChange={setClassTypeFilter}
            showSearchAndFilter={true}
            isReadOnly={false}
            isHistoryMode={true}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onResetFilters={resetFilters}
            classOptions={classOptions}
            selectedClasses={selectedClasses}
            onClassSelectionChange={setSelectedClasses}
            studentOptions={studentOptions}
            selectedStudents={selectedStudents}
            onStudentSelectionChange={setSelectedStudents}
            teachers={teachers}
            onSearch={handleSearch}
            onExport={handleExport}
            onRefresh={handleRefresh}
            onCancelDiscount={handleCancelDiscount}
            policiesByStudent={policiesByStudent}
            pendingRewardsByStudent={pendingRewardsByStudent}
            onApplyPolicy={handleApplyPolicy}
            onApplyEvent={handleApplyEvent}
            pendingTextbooksByStudent={pendingTextbooksByStudent}
            onApplyTextbook={handleApplyTextbook}
            onCancelTextbook={handleCancelTextbook}
          />
          
        </div>
      )}
      
      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p-1))} 
              disabled={page === 1}
            >
              이전
            </Button>
            {page > 2 && (
              <>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)} 
                  title="첫 페이지로"
                >
                  1
                </Button>
                {page > 3 && <span className="text-gray-400">...</span>}
              </>
            )}
            <div className="flex items-center space-x-1">
              {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            {page < totalPages - 1 && (
              <>
                {page < totalPages - 2 && <span className="text-gray-400">...</span>}
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)} 
                  title="마지막 페이지로"
                >
                  {totalPages}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p+1))}
              disabled={page === totalPages}
            >
              다음
            </Button>
          </div>
        </div>
      )}

      {/* 청구서 발송 모달 */}
      <SendInvoiceModal
        open={showSendInvoiceModal}
        onOpenChange={setShowSendInvoiceModal}
        selectedFees={selectedFeesForInvoice}
        onSuccess={() => {
          setSelectedRows([]);
          fetchTuitionHistoryWithFilters(false);
        }}
      />
    </div>
  );
}