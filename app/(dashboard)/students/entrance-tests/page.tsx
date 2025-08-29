"use client";

import React, { useState, useEffect } from "react";
import { EntranceTestsTable } from "@/components/students/entrance-tests/entrance-tests-table";
import { StudentsHeader } from "@/components/students/students-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/types/database";

type EntranceTest = Database["public"]["Tables"]["entrance_tests"]["Row"];
type Student = Database["public"]["Tables"]["students"]["Row"];

export default function EntranceTestsPage() {
  const [entranceTests, setEntranceTests] = useState<EntranceTest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // 데이터 로드
  const loadData = async () => {
    setLoading(true);
    try {
      // 입학테스트 데이터 로드
      const { data: testsData, error: testsError } = await supabase
        .from("entrance_tests")
        .select("*")
        .order("test_date", { ascending: false });

      if (testsError) throw testsError;

      // 학생 데이터 로드
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .order("name");

      if (studentsError) throw studentsError;

      setEntranceTests(testsData || []);
      setStudents(studentsData || []);
    } catch (error) {
      console.error("데이터 로드 오류:", error);
      toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 테스트 삭제
  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from("entrance_tests")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("입학테스트가 삭제되었습니다.");
      loadData();
    } catch (error) {
      console.error("삭제 오류:", error);
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  // 테스트 업데이트
  const handleUpdate = async (id: number, updates: Partial<EntranceTest>) => {
    try {
      const { error } = await supabase
        .from("entrance_tests")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("입학테스트가 수정되었습니다.");
      loadData();
    } catch (error) {
      console.error("수정 오류:", error);
      toast.error("수정 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <StudentsHeader />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">입학테스트 관리</h1>
          <p className="text-gray-600 mt-1">학생들의 입학테스트 결과를 관리합니다</p>
        </div>
        <Button onClick={() => toast.info("입학테스트 추가 기능은 준비 중입니다.")}>
          <Plus className="w-4 h-4 mr-2" />
          테스트 추가
        </Button>
      </div>

      <EntranceTestsTable
        entranceTests={entranceTests}
        students={students}
        loading={loading}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    </div>
  );
}