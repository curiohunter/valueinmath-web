import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { Database } from "@/types/database";

type Student = Database['public']['Tables']['students']['Row'];

interface StudentsTabProps {
  students: Student[];
  onStudentSelect: (student: Student) => void;
}

export function StudentsTab({ students, onStudentSelect }: StudentsTabProps) {
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [schoolTypeFilter, setSchoolTypeFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<'name' | 'school_type' | 'grade' | 'school' | 'lead_source' | 'first_contact_date' | 'start_date' | 'end_date' | 'status'>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter students when search or filters change
  useEffect(() => {
    let filtered = [...students];

    // Apply search filter (using debounced value)
    if (debouncedSearchTerm) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    // Apply school type filter - map UI values to database values
    if (schoolTypeFilter !== "all") {
      const schoolTypeMap: Record<string, string> = {
        "초등": "초등학교",
        "중등": "중학교", 
        "고등": "고등학교"
      };
      const dbSchoolType = schoolTypeMap[schoolTypeFilter];
      filtered = filtered.filter(s => s.school_type === dbSchoolType);
    }
    
    // Apply grade filter
    if (gradeFilter !== "all") {
      filtered = filtered.filter(s => s.grade?.toString() === gradeFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      // 기본 정렬: 상태 우선순위 (신규상담 > 재원 > 기타)
      if (sortBy === 'status') {
        const statusPriority: Record<string, number> = {
          '신규상담': 0,
          '재원': 1,
          '미등록': 2,
          '퇴원': 3,
        };
        const aPriority = statusPriority[a.status] ?? 99;
        const bPriority = statusPriority[b.status] ?? 99;

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        // 같은 상태 내에서: 신규상담은 first_contact_date 내림차순, 나머지는 이름순
        if (a.status === '신규상담') {
          // 최신 first_contact_date가 위로 (내림차순)
          return (b.first_contact_date || '').localeCompare(a.first_contact_date || '');
        }

        // 재원생 및 기타는 이름순
        return a.name.localeCompare(b.name, 'ko');
      }

      let compareValue = 0;

      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name, 'ko');
          break;
        case 'school_type':
          compareValue = (a.school_type || '').localeCompare(b.school_type || '', 'ko');
          break;
        case 'grade':
          compareValue = (a.grade || 0) - (b.grade || 0);
          break;
        case 'school':
          compareValue = (a.school || '').localeCompare(b.school || '', 'ko');
          break;
        case 'lead_source':
          compareValue = (a.lead_source || '').localeCompare(b.lead_source || '', 'ko');
          break;
        case 'first_contact_date':
          compareValue = (a.first_contact_date || '').localeCompare(b.first_contact_date || '');
          break;
        case 'start_date':
          compareValue = (a.start_date || '').localeCompare(b.start_date || '');
          break;
        case 'end_date':
          compareValue = (a.end_date || '').localeCompare(b.end_date || '');
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    setFilteredStudents(filtered);
  }, [students, debouncedSearchTerm, statusFilter, schoolTypeFilter, gradeFilter, sortBy, sortOrder]);
  
  const handleSort = (column: 'name' | 'school_type' | 'grade' | 'school' | 'lead_source' | 'first_contact_date' | 'start_date' | 'end_date' | 'status') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "재원":
        return "bg-green-100 text-green-800";
      case "신규상담":
        return "bg-blue-100 text-blue-800";
      case "퇴원":
        return "bg-gray-100 text-gray-800";
      case "미등록":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>학생 목록</CardTitle>
        <CardDescription>전체 학생 목록에서 상담을 등록할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="학생 이름 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="재원">재원</SelectItem>
              <SelectItem value="신규상담">신규상담</SelectItem>
              <SelectItem value="퇴원">퇴원</SelectItem>
              <SelectItem value="미등록">미등록</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={schoolTypeFilter} onValueChange={setSchoolTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="학교급 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 학교급</SelectItem>
              <SelectItem value="초등">초등</SelectItem>
              <SelectItem value="중등">중등</SelectItem>
              <SelectItem value="고등">고등</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="학년 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 학년</SelectItem>
              {[1, 2, 3, 4, 5, 6].map(grade => (
                <SelectItem key={grade} value={grade.toString()}>
                  {grade}학년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Students Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  이름
                  {sortBy === 'name' ? (
                    sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-blue-600" /> : <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('school_type')}
              >
                <div className="flex items-center">
                  학교급
                  {sortBy === 'school_type' ? (
                    sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-blue-600" /> : <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('grade')}
              >
                <div className="flex items-center">
                  학년
                  {sortBy === 'grade' ? (
                    sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-blue-600" /> : <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('school')}
              >
                <div className="flex items-center">
                  학교
                  {sortBy === 'school' ? (
                    sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-blue-600" /> : <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />
                  )}
                </div>
              </TableHead>
              <TableHead>상태</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('lead_source')}
              >
                <div className="flex items-center">
                  유입경로
                  {sortBy === 'lead_source' ? (
                    sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-blue-600" /> : <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('first_contact_date')}
              >
                <div className="flex items-center">
                  최초상담일
                  {sortBy === 'first_contact_date' ? (
                    sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-blue-600" /> : <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('start_date')}
              >
                <div className="flex items-center">
                  등록일
                  {sortBy === 'start_date' ? (
                    sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-blue-600" /> : <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('end_date')}
              >
                <div className="flex items-center">
                  종료일
                  {sortBy === 'end_date' ? (
                    sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-blue-600" /> : <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>{student.school_type || '-'}</TableCell>
                <TableCell>{student.grade || '-'}</TableCell>
                <TableCell>{student.school || '-'}</TableCell>
                <TableCell>
                  <Badge className={getStatusBadgeColor(student.status)}>
                    {student.status}
                  </Badge>
                </TableCell>
                <TableCell>{student.lead_source || '-'}</TableCell>
                <TableCell>{student.first_contact_date || '-'}</TableCell>
                <TableCell>{student.start_date || '-'}</TableCell>
                <TableCell>{student.end_date || '-'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    onClick={() => onStudentSelect(student)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    상담
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}