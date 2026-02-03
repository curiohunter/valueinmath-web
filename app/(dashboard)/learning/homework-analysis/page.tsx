"use client";

import React, { useState } from "react";
import LearningTabs from "@/components/learning/LearningTabs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClipboardList, UserSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { HomeworkTab, StudentAnalysisTab } from "@/components/learning/homework-analysis";

export default function HomeworkAnalysisPage() {
  const [activeTab, setActiveTab] = useState<string>("homework");

  return (
    <div className="space-y-6">
      <LearningTabs />

      {/* 서브 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start h-auto p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
          <TabsTrigger
            value="homework"
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              "data-[state=active]:bg-slate-800 data-[state=active]:text-white data-[state=active]:shadow-md",
              "data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-50"
            )}
          >
            <ClipboardList className="w-4 h-4" />
            반별 숙제
          </TabsTrigger>
          <TabsTrigger
            value="student-analysis"
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              "data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md",
              "data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:bg-slate-50"
            )}
          >
            <UserSearch className="w-4 h-4" />
            학생별 분석
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700 data-[state=active]:bg-white/20 data-[state=active]:text-white">
              NEW
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="homework" className="mt-4">
          <HomeworkTab />
        </TabsContent>

        <TabsContent value="student-analysis" className="mt-4">
          <StudentAnalysisTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
