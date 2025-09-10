// MathFlat 크롤링 메인 모듈

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { 
  parseStudentData, 
  parseStudentList, 
  checkLoginSuccess,
  setDateOnPage 
} from './parser';
import { 
  saveMathflatRecords, 
  saveWeeklySummary,
  createSyncLog,
  updateSyncLog,
  getStudentList
} from './storage';
import { MATHFLAT_CONFIG, delay, formatDate, getDateRange } from './config';
import type { CrawlOptions, CrawlResult, StudentInfo, MathflatRecord } from './types';

/**
 * MathFlat 크롤링 메인 함수
 */
export async function crawlMathflat(options: CrawlOptions = {}): Promise<CrawlResult> {
  const startTime = Date.now();
  let browser: Browser | null = null;
  let logId: string | undefined;
  
  // 결과 추적
  const errors: Array<{ studentName: string; error: string }> = [];
  let studentsProcessed = 0;
  let recordsCreated = 0;

  try {
    // 크롤링 로그 생성
    const logResult = await createSyncLog({
      sync_type: 'manual',
      status: 'running',
      students_total: 0,
      students_synced: 0,
      students_failed: 0,
      started_at: new Date().toISOString(),
    });
    logId = logResult.logId;

    // 브라우저 실행
    browser = await chromium.launch({
      headless: MATHFLAT_CONFIG.HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: MATHFLAT_CONFIG.VIEWPORT,
      userAgent: MATHFLAT_CONFIG.USER_AGENT,
    });

    const page = await context.newPage();
    page.setDefaultTimeout(MATHFLAT_CONFIG.PAGE_TIMEOUT);

    // 로그인
    await loginToMathflat(page);

    // 학생 목록 가져오고 즉시 처리하기
    const totalStudents = await processStudentsByGrade(
      page, 
      options.studentIds, 
      options.grades,
      async (student) => {
        // 각 학생 처리 콜백
        try {
          console.log(`Processing student: ${student.name}`);
          
          // 학생 페이지로 이동 및 학습 내역 표시
          await navigateToStudentPage(page, student.mathflatId || student.name);
          
          // 최신 학습일 데이터 파싱
          const studentRecords = await parseStudentData(page, student.id);
          
          console.log(`  Parsed ${studentRecords.length} records for ${student.name}`);
          
          // Rate limiting
          await delay(MATHFLAT_CONFIG.WAIT_BETWEEN_REQUESTS);

          // 데이터 저장 (중복 체크 포함)
          if (studentRecords.length > 0) {
            console.log(`  Saving ${studentRecords.length} records to database...`);
            const saveResult = await saveMathflatRecords(studentRecords);
            if (saveResult.success) {
              recordsCreated += saveResult.recordsCreated || 0;
              console.log(`  ✅ Saved successfully (${saveResult.recordsCreated} new records created)`);
              
              // 주간 요약 생성 (최근 7일)
              const endDate = new Date().toISOString().split('T')[0];
              const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              await saveWeeklySummary(student.id, startDate, endDate);
            } else {
              throw new Error(saveResult.error || '데이터 저장 실패');
            }
          } else {
            console.log(`  No records found for ${student.name}`);
          }

          studentsProcessed++;
          
          // 로그 업데이트
          if (logId) {
            await updateSyncLog(logId, {
              students_synced: studentsProcessed,
              students_failed: errors.length,
            });
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`Error processing student ${student.name}:`, errorMsg);
          errors.push({ studentName: student.name, error: errorMsg });
        }
      },
      logId
    );
    
    if (totalStudents === 0) {
      throw new Error('크롤링할 학생이 없습니다.');
    }

    // 성공적으로 완료
    const status = errors.length > 0 ? 'partial' : 'success';
    
    // 크롤링 로그 완료 업데이트
    if (logId) {
      await updateSyncLog(logId, {
        status,
        students_synced: studentsProcessed,
        students_failed: errors.length,
        completed_at: new Date().toISOString(),
        duration_seconds: Math.round((Date.now() - startTime) / 1000),
        error_details: errors.length > 0 ? errors : undefined,
      });
    }

    return {
      success: errors.length === 0,
      studentsProcessed,
      recordsCreated,
      errors,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('Crawling failed:', errorMsg);
    
    // 크롤링 로그 실패 업데이트
    if (logId) {
      await updateSyncLog(logId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_seconds: Math.round((Date.now() - startTime) / 1000),
        error_details: { message: errorMsg },
      });
    }

    return {
      success: false,
      studentsProcessed,
      recordsCreated,
      errors: [...errors, { studentName: 'System', error: errorMsg }],
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * MathFlat 로그인
 */
async function loginToMathflat(page: Page): Promise<void> {
  try {
    console.log('Logging in to MathFlat...');
    
    // 로그인 페이지로 이동
    await page.goto(MATHFLAT_CONFIG.LOGIN_URL, {
      waitUntil: 'networkidle',
    });

    // 로그인 폼 확인
    await page.waitForSelector(MATHFLAT_CONFIG.SELECTORS.LOGIN.ID_INPUT, { timeout: 5000 });
    
    // 로그인 폼 입력
    await page.fill(MATHFLAT_CONFIG.SELECTORS.LOGIN.ID_INPUT, MATHFLAT_CONFIG.LOGIN_ID);
    await page.fill(MATHFLAT_CONFIG.SELECTORS.LOGIN.PW_INPUT, MATHFLAT_CONFIG.LOGIN_PW);

    // Enter 키로 로그인 (버튼 클릭 대신)
    await page.press(MATHFLAT_CONFIG.SELECTORS.LOGIN.PW_INPUT, 'Enter');
    
    // 로그인 후 대기
    await page.waitForTimeout(5000);
    
    // 로그인 성공 확인 (URL 변경 확인)
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      throw new Error(MATHFLAT_CONFIG.ERRORS.LOGIN_FAILED);
    }

    console.log('Login successful');
    
    // 수업 페이지로 이동
    await navigateToLessonPage(page);
    
  } catch (error) {
    console.error('Login failed:', error);
    throw new Error(`로그인 실패: ${error}`);
  }
}

/**
 * 수업 페이지로 이동
 */
async function navigateToLessonPage(page: Page): Promise<void> {
  try {
    console.log('Navigating to lesson page...');
    
    // 헤더의 "수업" 버튼 찾기 ("수업준비" 제외)
    const lessonButton = await page.locator('header button, header a').all();
    let lessonButtonFound = false;
    
    for (const button of lessonButton) {
      const text = await button.textContent();
      if (text?.trim() === '수업') {
        await button.click();
        lessonButtonFound = true;
        await page.waitForTimeout(3000);
        break;
      }
    }
    
    if (!lessonButtonFound) {
      // 직접 URL로 이동
      console.log('Lesson button not found, navigating directly...');
      await page.goto(`${MATHFLAT_CONFIG.BASE_URL}/lesson/worksheet/grade/중${1}`, {
        waitUntil: 'networkidle',
      });
    }
    
    await page.waitForTimeout(2000);
  } catch (error) {
    console.error('Error navigating to lesson page:', error);
    throw error;
  }
}

/**
 * 학년별로 학생을 처리하기 (토글이 열린 상태에서 즉시 처리)
 */
async function processStudentsByGrade(
  page: Page,
  specificStudentIds: string[] | undefined,
  specificGrades: string[] | undefined,
  processStudent: (student: StudentInfo) => Promise<void>,
  logId?: string
): Promise<number> {
  try {
    // DB에서 학생 목록 가져오기
    const dbStudents = await getStudentList();
    
    // 특정 학생만 필터링
    let students = dbStudents;
    if (specificStudentIds && specificStudentIds.length > 0) {
      students = dbStudents.filter(s => specificStudentIds.includes(s.id));
    }
    
    let totalProcessed = 0;
    
    // 항상 모든 학년 처리
    const grades = ['초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
    
    console.log(`Processing all grades: ${grades.join(', ')}`);
    
    // 먼저 전체 닫기를 눌러서 모두 닫기 (공백 있음!)
    console.log('First, closing all toggles if open...');
    const closeAllButton = await page.locator('button:has-text("전체 닫기")').first();
    if (await closeAllButton.isVisible({ timeout: 1000 })) {
      console.log('  Clicking "전체 닫기" to close all toggles');
      await closeAllButton.click();
      await page.waitForTimeout(2000);
    }
    
    // 이제 전체 열기 버튼 클릭 (공백 있음!)
    console.log('Now opening all toggles using "전체 열기" button...');
    const openAllButton = await page.locator('button:has-text("전체 열기")').first();
    if (await openAllButton.isVisible({ timeout: 1000 })) {
      console.log('  Clicking "전체 열기" button');
      await openAllButton.click();
      await page.waitForTimeout(5000); // 충분히 기다리기
      console.log('  All toggles should be opened now');
      
      // 확인: 전체 닫기 버튼이 나타났는지
      const closeButtonAfter = await page.locator('button:has-text("전체 닫기")').first();
      if (await closeButtonAfter.isVisible({ timeout: 1000 })) {
        console.log('  Confirmed: "전체 닫기" button is visible, all toggles are open');
      } else {
        console.log('  Warning: "전체 닫기" button not found after clicking "전체 열기"');
      }
    } else {
      console.log('  ERROR: "전체 열기" button not found!');
      throw new Error('전체 열기 버튼을 찾을 수 없습니다');
    }
    
    // 이제 모든 토글이 열려있으니 모든 학생 찾기
    console.log('\nFinding all students after opening all toggles...');
    
    // 페이지 전체 HTML 확인 (디버깅용)
    const bodyText = await page.locator('body').textContent();
    const visibleStudentCount = (bodyText?.match(/출석|등원|하원/g) || []).length;
    console.log(`  Page contains ${visibleStudentCount} attendance-related texts`);
    
    // 모든 학생 이름 수집
    const allStudentNames: string[] = [];
    
    // 더 정확한 선택자로 출석 버튼 찾기 (출석, 등원, 하원 모두 포함)
    const attendanceButtons = await page.locator('button').filter({ 
      hasText: /^(출석|등원|하원)$/ 
    }).all();
    
    console.log(`  Found ${attendanceButtons.length} attendance buttons`);
    
    for (const button of attendanceButtons) {
      try {
        // 버튼이 실제로 보이는지 확인
        const isVisible = await button.isVisible();
        if (!isVisible) {
          continue;
        }
        
        // 버튼의 직접 부모에서 학생 이름 찾기
        const parent = await button.locator('..');
        const parentText = await parent.textContent();
        if (!parentText) continue;
        
        // 출결 버튼은 건너뛰기 ("전체" 행의 버튼)
        if (parentText.includes('전체')) continue;
        
        // 학생 이름 추출 - 정확한 패턴
        let studentName = '';
        
        // 패턴 1: 버튼 앞에 있는 이름 찾기 (출석/등원/하원 직전의 한글)
        // "손채원출석" 형태에서 "손채원" 추출
        const buttonText = await button.textContent();
        if (buttonText && (buttonText === '출석' || buttonText === '등원' || buttonText === '하원')) {
          // 부모 텍스트에서 버튼 텍스트를 제거하고 이름 찾기
          const textBeforeButton = parentText.split(buttonText)[0];
          if (textBeforeButton) {
            // 마지막 한글 단어를 이름으로 추출 (이하연a 같은 경우도 포함)
            const nameMatches = textBeforeButton.match(/([가-힣]{2,4}[a-z]?)(?:[^가-힣a-z]*)$/i);
            if (nameMatches) {
              studentName = nameMatches[1];
            }
          }
        }
        
        // 패턴 2: 대체 방법 - 공백으로 구분된 이름 (이하연a 같은 경우도 포함)
        if (!studentName) {
          const match2 = parentText.match(/([가-힣]{2,4}[a-z]?)\s+(출석|등원|하원)/i);
          if (match2) {
            studentName = match2[1];
          }
        }
        
        // 유효성 검사 - 동명이인도 모두 추가 (a, b 등 구분자 포함)
        if (studentName && 
            studentName.length >= 2 && 
            studentName.length <= 5 &&  // 이하연a 같은 경우 5글자까지 허용
            !studentName.match(/(초|중|고|전체|출결|선택|학년)/)) {
          // 이미 있는 이름이어도 추가 (동명이인 가능)
          allStudentNames.push(studentName);
          console.log(`    Found student: ${studentName}`);
        }
      } catch (e) {
        console.error(`    Error processing button: ${e}`);
        continue;
      }
    }
    
    console.log(`  Total unique students found: ${allStudentNames.length}`);
    
    // 학생이 없으면 종료
    if (allStudentNames.length === 0) {
      throw new Error('전체열기 후에도 학생을 찾을 수 없습니다.');
    }
    
    // 디버깅: 찾은 모든 학생 이름 출력
    console.log('\n  All found student names:', allStudentNames);
    
    // 디버깅: 고은별 찾았는지 확인
    const hasGoeunbyeol = allStudentNames.some(name => name.includes('고은별'));
    console.log(`  Contains 고은별?: ${hasGoeunbyeol}`);
    if (!hasGoeunbyeol) {
      console.log(`  WARNING: 고은별 not found in MathFlat page!`);
    }
    
    // DB 학생과 매칭하고 처리
    for (const studentName of allStudentNames) {
      // 1단계: 정확히 일치하는 학생 우선 찾기
      let dbStudent = students.find(s => s.name === studentName);
      
      // 2단계: 정확한 매칭이 없을 경우에만 부분 매칭 시도
      if (!dbStudent) {
        // 동명이인 구분자가 있는 경우 (예: 김민준a, 이하연b)
        const hasDistinguisher = /[a-z]$/i.test(studentName);
        
        if (hasDistinguisher) {
          // 구분자가 있으면 정확한 매칭만 허용 (이미 위에서 처리됨)
          console.log(`  Not in DB (requires exact match): ${studentName}`);
          continue;
        } else {
          // 구분자가 없는 경우에만 부분 매칭 허용
          // 예: 매쓰플랫 "김민준" -> DB "김민준"만 매칭 (김민준a, 김민준b는 제외)
          dbStudent = students.find(s => 
            s.name === studentName && !/[a-z]$/i.test(s.name)
          );
        }
      }
      
      if (dbStudent) {
        const studentInfo: StudentInfo = {
          id: dbStudent.id,
          name: dbStudent.name,
          mathflatId: studentName,
        };
        
        console.log(`  Processing: ${studentName} -> ${dbStudent.name} (ID: ${dbStudent.id})`);
        
        // 학생 처리
        await processStudent(studentInfo);
        totalProcessed++;
      } else {
        console.log(`  Not in DB: ${studentName}`);
      }
    }

    return totalProcessed;
  } catch (error) {
    console.error('Error getting students:', error);
    throw new Error(`학생 목록 조회 실패: ${error}`);
  }
}

/**
 * 학생 페이지로 이동 (최신 학습 내역 표시)
 */
async function navigateToStudentPage(
  page: Page,
  studentName: string
): Promise<void> {
  try {
    console.log(`Clicking on student: ${studentName}`);
    
    // 학생 이름 클릭
    const studentElement = await page.locator(`text="${studentName}"`).first();
    if (await studentElement.isVisible({ timeout: 5000 })) {
      await studentElement.click();
      await page.waitForTimeout(2000);
      
      // 학습 내역 버튼 찾기
      console.log('Clicking on learning history button...');
      const historyButton = await page.locator('button:has-text("학습 내역"), a:has-text("학습 내역"), button:has-text("학습내역"), a:has-text("학습내역")').first();
      
      if (await historyButton.isVisible({ timeout: 3000 })) {
        await historyButton.click();
        await page.waitForTimeout(3000);
      } else {
        console.log('Learning history button not found, might already be on the page');
      }
    } else {
      throw new Error(`학생 ${studentName}을 찾을 수 없습니다.`);
    }
  } catch (error) {
    console.error(`Error navigating to student ${studentName}:`, error);
    throw error;
  }
}