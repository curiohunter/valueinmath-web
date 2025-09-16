"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, FolderOpen, FileText, BookOpen, GraduationCap, FileSpreadsheet, Users } from "lucide-react";

export default function ResourcesPage() {
  const googleDriveUrl = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_URL;

  const resources = [
    {
      title: "교재 자료",
      description: "수업에 사용되는 교재 및 참고 자료",
      icon: BookOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "시험 문제",
      description: "기출 문제 및 모의고사 자료",
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "학습 자료",
      description: "보충 학습 자료 및 연습 문제",
      icon: GraduationCap,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "성적 관리",
      description: "성적표 및 평가 자료",
      icon: FileSpreadsheet,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "학부모 자료",
      description: "학부모님께 전달할 안내 자료",
      icon: Users,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
    },
    {
      title: "전체 자료실",
      description: "구글 드라이브의 모든 자료 보기",
      icon: FolderOpen,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ];

  const handleOpenDrive = () => {
    if (googleDriveUrl) {
      window.open(googleDriveUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">자료실</h1>
        <p className="text-gray-600">
          학원 운영에 필요한 모든 자료를 구글 드라이브에서 관리합니다.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource, index) => {
          const Icon = resource.icon;
          const isMainFolder = index === resources.length - 1;

          return (
            <Card
              key={resource.title}
              className={`hover:shadow-lg transition-shadow cursor-pointer ${
                isMainFolder ? "border-2 border-indigo-200" : ""
              }`}
              onClick={handleOpenDrive}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${resource.bgColor}`}>
                    <Icon className={`h-6 w-6 ${resource.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {resource.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  variant={isMainFolder ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDrive();
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {isMainFolder ? "전체 자료실 열기" : "자료 보기"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          자료실 이용 안내
        </h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• 모든 자료는 구글 드라이브에서 중앙 관리됩니다.</li>
          <li>• 편집 권한이 있는 선생님은 직접 자료를 업로드하실 수 있습니다.</li>
          <li>• 폴더별로 정리된 자료를 쉽게 찾아보실 수 있습니다.</li>
          <li>• 구글 드라이브의 검색 기능을 활용해 빠르게 자료를 찾으세요.</li>
        </ul>
      </div>
    </div>
  );
}