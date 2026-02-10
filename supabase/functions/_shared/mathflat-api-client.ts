/**
 * MathFlat API 클라이언트 (Deno Edge Function용)
 */

import type {
  MathFlatHomeworkItem,
  MathFlatWorkbookProblem,
  MathFlatWorksheetProblem,
  MathFlatWorkItem,
  MathFlatStudent,
} from './mathflat-types.ts';

const MATHFLAT_BASE_URL = 'https://api.mathflat.com';
const PLATFORM_HEADER = 'TEACHER_WEB';
const DELAY_BETWEEN_STUDENTS = 500;
const DELAY_BETWEEN_PROBLEMS = 300;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class MathFlatApiClient {
  private token: string | null = null;
  private tokenExpiresAt: Date | null = null;

  async login(): Promise<string> {
    const id = Deno.env.get('MATHFLAT_LOGIN_ID');
    const password = Deno.env.get('MATHFLAT_LOGIN_PW');

    if (!id || !password) {
      throw new Error('MATHFLAT_LOGIN_ID 또는 MATHFLAT_LOGIN_PW 환경변수가 설정되지 않았습니다');
    }

    const response = await fetch(`${MATHFLAT_BASE_URL}/mathFLAT/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-platform': PLATFORM_HEADER,
      },
      body: JSON.stringify({ id, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MathFlat 로그인 실패: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    this.token = responseData.data?.token || responseData.token;

    if (!this.token) {
      throw new Error(`MathFlat 로그인 응답에 토큰이 없습니다: ${JSON.stringify(responseData)}`);
    }

    this.tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    return this.token;
  }

  private async ensureToken(): Promise<string> {
    if (!this.token || !this.tokenExpiresAt || new Date() >= this.tokenExpiresAt) {
      await this.login();
    }
    return this.token!;
  }

  private async authenticatedFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const token = await this.ensureToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers as Record<string, string>,
        'x-platform': PLATFORM_HEADER,
        'x-auth-token': token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MathFlat API 오류: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async getClassStudentIds(mathflatClassId: string): Promise<{ studentIdList: string[]; className: string }> {
    const response = await this.authenticatedFetch<{
      data: { studentIdList: string[]; id: number; name: string };
    }>(`${MATHFLAT_BASE_URL}/lesson-classes/${mathflatClassId}`);

    return {
      studentIdList: response.data?.studentIdList || [],
      className: response.data?.name || '',
    };
  }

  async getAllStudents(): Promise<Map<string, string>> {
    const response = await this.authenticatedFetch<{
      data: { content: Array<{ id: string; name: string }> };
    }>(`${MATHFLAT_BASE_URL}/students?page=0&size=1000000`);

    const studentMap = new Map<string, string>();
    for (const student of response.data?.content || []) {
      studentMap.set(student.name, student.id);
    }
    return studentMap;
  }

  async getClassHomework(
    mathflatClassId: string,
    startDate: string,
    endDate: string
  ): Promise<MathFlatHomeworkItem[]> {
    const params = new URLSearchParams({ startDate, endDate });

    interface BookResponse {
      bookType: 'WORKBOOK' | 'WORKSHEET';
      bookId: number;
      title: string;
      components: Array<{
        studentHomeworkId: number;
        studentName: string;
        studentBookId: number;
        studentWorkbookId?: number;
        progressIdList?: number[];
        completed: boolean;
        page?: string;
        score?: number;
        status?: string;
        createDatetime?: string;
        bookType: 'WORKBOOK' | 'WORKSHEET';
      }>;
    }

    const response = await this.authenticatedFetch<{ data: BookResponse[] }>(
      `${MATHFLAT_BASE_URL}/student-history/homework/lesson-class/${mathflatClassId}?${params}`
    );

    const homeworks: MathFlatHomeworkItem[] = [];
    const books = response.data || [];

    for (const book of books) {
      for (const component of book.components || []) {
        homeworks.push({
          studentHomeworkId: component.studentHomeworkId,
          studentBookId: component.studentBookId,
          studentWorkbookId: component.studentWorkbookId,
          progressIdList: component.progressIdList,
          bookId: book.bookId,
          title: book.title,
          bookType: component.bookType || book.bookType,
          completed: component.completed,
          page: component.page,
          score: component.score,
          status: component.status,
          createDatetime: component.createDatetime,
          studentName: component.studentName,
        });
      }
    }

    console.log(`[MathFlatAPI] 반(${mathflatClassId}) 숙제 ${homeworks.length}개 조회됨 (책 ${books.length}권)`);
    return homeworks;
  }

  async getWorkbookProblems(
    studentId: string,
    studentWorkbookId: number,
    studentBookId: number,
    progressId: number
  ): Promise<MathFlatWorkbookProblem[]> {
    const params = new URLSearchParams({ page: '0', size: '1000000' });
    const url = `${MATHFLAT_BASE_URL}/student-workbook/student/${studentId}/${studentWorkbookId}/${studentBookId}/${progressId}?${params}`;

    interface RawWorkbookProblem {
      id: number;
      problemId: number;
      title?: string;
      number?: string;
      conceptId?: number;
      topicId?: number;
      subTopicId?: number;
      level?: number;
      type?: string;
      tagTop?: string;
      answer?: string;
      problemImageUrl?: string;
      solutionImageUrl?: string;
      scoring?: {
        studentWorkbookProgressId?: number;
        userAnswer?: string;
        result?: 'CORRECT' | 'WRONG' | 'NONE';
      };
    }

    const response = await this.authenticatedFetch<{
      data: { content: RawWorkbookProblem[] };
    }>(url);

    return (response.data?.content || []).map((raw) => ({
      workbookProblemId: raw.id,
      problemId: raw.problemId,
      studentWorkbookProgressId: raw.scoring?.studentWorkbookProgressId,
      problemTitle: raw.title,
      problemNumber: raw.number,
      conceptId: raw.conceptId,
      topicId: raw.topicId,
      subTopicId: raw.subTopicId,
      level: raw.level,
      type: raw.type,
      tagTop: raw.tagTop,
      correctAnswer: raw.answer,
      userAnswer: raw.scoring?.userAnswer,
      result: raw.scoring?.result || 'NONE',
      problemImageUrl: raw.problemImageUrl,
      solutionImageUrl: raw.solutionImageUrl,
    }));
  }

  async getWorksheetProblems(studentBookId: number): Promise<MathFlatWorksheetProblem[]> {
    const params = new URLSearchParams({ page: '0', size: '1000000' });
    const url = `${MATHFLAT_BASE_URL}/student-worksheet/assign/${studentBookId}/problem?${params}`;

    interface RawWorksheetProblem {
      worksheetProblemId: number;
      userAnswer?: string;
      result?: 'CORRECT' | 'WRONG' | 'NONE';
      problem?: {
        id: number;
        title?: string;
        number?: string;
        conceptId?: number;
        conceptName?: string;
        topicId?: number;
        subTopicId?: number;
        level?: number;
        type?: string;
        tagTop?: string;
        answer?: string;
        problemImageUrl?: string;
        solutionImageUrl?: string;
        problemSummary?: {
          totalUsed?: number;
          correctTimes?: number;
          wrongTimes?: number;
          answerRate?: number;
        };
      };
    }

    const response = await this.authenticatedFetch<{
      data: { content: RawWorksheetProblem[] };
    }>(url);

    return (response.data?.content || []).map((raw) => ({
      worksheetProblemId: raw.worksheetProblemId,
      problemId: raw.problem?.id || 0,
      problemTitle: raw.problem?.title,
      problemNumber: raw.problem?.number,
      conceptId: raw.problem?.conceptId,
      conceptName: raw.problem?.conceptName,
      topicId: raw.problem?.topicId,
      subTopicId: raw.problem?.subTopicId,
      level: raw.problem?.level,
      type: raw.problem?.type,
      tagTop: raw.problem?.tagTop,
      correctAnswer: raw.problem?.answer,
      userAnswer: raw.userAnswer,
      result: raw.result || 'NONE',
      totalUsed: raw.problem?.problemSummary?.totalUsed,
      correctTimes: raw.problem?.problemSummary?.correctTimes,
      wrongTimes: raw.problem?.problemSummary?.wrongTimes,
      answerRate: raw.problem?.problemSummary?.answerRate,
      problemImageUrl: raw.problem?.problemImageUrl,
      solutionImageUrl: raw.problem?.solutionImageUrl,
    }));
  }

  async collectClassHomework(
    mathflatClassId: string,
    targetDate: string,
    collectProblems: boolean = true,
    dbStudentNameToId?: Map<string, string>
  ): Promise<{
    students: Array<{
      studentId: string;
      studentName: string;
      homeworks: Array<{
        homework: MathFlatHomeworkItem;
        problems: Array<MathFlatWorkbookProblem | MathFlatWorksheetProblem>;
      }>;
    }>;
    errors: string[];
  }> {
    const results: {
      students: Array<{
        studentId: string;
        studentName: string;
        homeworks: Array<{
          homework: MathFlatHomeworkItem;
          problems: Array<MathFlatWorkbookProblem | MathFlatWorksheetProblem>;
        }>;
      }>;
      errors: string[];
    } = { students: [], errors: [] };

    // DB 매핑이 있으면 우선 사용, 없으면 외부 API 폴백
    let apiStudentNameToId = new Map<string, string>();
    try {
      apiStudentNameToId = await this.getAllStudents();
      console.log(`[MathFlatAPI] 학생 ${apiStudentNameToId.size}명 API 매핑 로드됨`);
    } catch (error) {
      results.errors.push(`학생 목록 조회 실패: ${error}`);
    }
    if (dbStudentNameToId && dbStudentNameToId.size > 0) {
      console.log(`[MathFlatAPI] DB 학생 매핑 ${dbStudentNameToId.size}명 우선 적용`);
    }

    let homeworks: MathFlatHomeworkItem[];
    try {
      homeworks = await this.getClassHomework(mathflatClassId, targetDate, targetDate);
    } catch (error) {
      results.errors.push(`반(${mathflatClassId}) 숙제 조회 실패: ${error}`);
      return results;
    }

    const studentMap = new Map<string, {
      studentId: string;
      studentName: string;
      homeworks: Array<{
        homework: MathFlatHomeworkItem;
        problems: Array<MathFlatWorkbookProblem | MathFlatWorksheetProblem>;
      }>;
    }>();

    for (const homework of homeworks) {
      const studentName = homework.studentName || '알 수 없음';
      const studentId = dbStudentNameToId?.get(studentName)
        || homework.studentId
        || apiStudentNameToId.get(studentName)
        || '';
      const studentKey = studentName;

      if (!studentMap.has(studentKey)) {
        studentMap.set(studentKey, { studentId, studentName, homeworks: [] });
      }

      const homeworkData: {
        homework: MathFlatHomeworkItem;
        problems: Array<MathFlatWorkbookProblem | MathFlatWorksheetProblem>;
      } = { homework, problems: [] };

      if (collectProblems && studentId) {
        try {
          if (homework.bookType === 'WORKBOOK' && homework.progressIdList && homework.studentWorkbookId) {
            for (const progressId of homework.progressIdList) {
              await delay(DELAY_BETWEEN_PROBLEMS);
              const problems = await this.getWorkbookProblems(
                studentId, homework.studentWorkbookId, homework.studentBookId, progressId
              );
              homeworkData.problems.push(...problems);
            }
          } else if (homework.bookType === 'WORKSHEET') {
            await delay(DELAY_BETWEEN_PROBLEMS);
            const problems = await this.getWorksheetProblems(homework.studentBookId);
            homeworkData.problems.push(...problems);
          }
        } catch (error) {
          results.errors.push(`학생(${studentName}) 숙제(${homework.title}) 문제 조회 실패: ${error}`);
        }
      }

      studentMap.get(studentKey)!.homeworks.push(homeworkData);
      await delay(DELAY_BETWEEN_STUDENTS / 10);
    }

    results.students = Array.from(studentMap.values());
    return results;
  }

  async getAllActiveStudents(): Promise<MathFlatStudent[]> {
    const response = await this.authenticatedFetch<{
      data: { content: MathFlatStudent[] };
    }>(`${MATHFLAT_BASE_URL}/students?page=0&size=1000000`);

    const students = (response.data?.content || []).filter(s => s.status === 'ACTIVE');
    console.log(`[MathFlatAPI] ACTIVE 학생 ${students.length}명 조회됨`);
    return students;
  }

  async getStudentDailyWork(studentId: string, date: string): Promise<MathFlatWorkItem[]> {
    const params = new URLSearchParams({ startDate: date, endDate: date });
    const url = `${MATHFLAT_BASE_URL}/student-history/work/student/${studentId}?${params}`;

    const response = await this.authenticatedFetch<{ data: MathFlatWorkItem[] }>(url);
    return response.data || [];
  }

  async collectAllDailyWork(
    targetDate: string,
    studentIds?: string[]
  ): Promise<{
    works: Array<{ studentId: string; studentName: string; items: MathFlatWorkItem[] }>;
    errors: string[];
  }> {
    const results: {
      works: Array<{ studentId: string; studentName: string; items: MathFlatWorkItem[] }>;
      errors: string[];
    } = { works: [], errors: [] };

    let students: MathFlatStudent[];
    try {
      students = await this.getAllActiveStudents();
    } catch (error) {
      results.errors.push(`학생 목록 조회 실패: ${error}`);
      return results;
    }

    if (studentIds && studentIds.length > 0) {
      students = students.filter(s => studentIds.includes(s.id));
    }

    for (const student of students) {
      try {
        await delay(DELAY_BETWEEN_STUDENTS);
        const items = await this.getStudentDailyWork(student.id, targetDate);
        if (items.length > 0) {
          results.works.push({ studentId: student.id, studentName: student.name, items });
        }
      } catch (error) {
        results.errors.push(`학생(${student.name}) 풀이 조회 실패: ${error}`);
      }
    }

    console.log(`[MathFlatAPI] ${targetDate} 풀이: ${results.works.length}명, ${results.works.reduce((sum, w) => sum + w.items.length, 0)}건`);
    return results;
  }
}
