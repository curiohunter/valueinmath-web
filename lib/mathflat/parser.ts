// HTML 파싱 및 데이터 추출 모듈

import { Page } from 'playwright';
import type { MathflatRecord, CategoryType } from './types';
import { MATHFLAT_CONFIG, parseKoreanNumber } from './config';

/**
 * 학생 페이지에서 학습 데이터 추출 (최신 학습일 데이터)
 */
export async function parseStudentData(
  page: Page,
  studentId: string
): Promise<MathflatRecord[]> {
  const records: MathflatRecord[] = [];

  try {
    console.log(`  Parsing data for student: ${studentId}`);
    
    // 학습 내역이 없는 경우 감지 - 더 정확한 방법
    // 메인 컨텐츠 영역에서만 확인 (헤더나 사이드바 제외)
    const mainContent = await page.locator('main, [role="main"], .content, #content').first();
    let mainText = '';
    
    try {
      if (await mainContent.isVisible({ timeout: 1000 })) {
        mainText = await mainContent.textContent() || '';
      } else {
        // 메인 영역을 못 찾으면 전체 페이지 텍스트 사용
        mainText = await page.textContent('body') || '';
      }
    } catch {
      mainText = await page.textContent('body') || '';
    }
    
    // 실제로 데이터가 없는 경우의 지표들 (여러 개가 동시에 있어야 함)
    const noDataIndicators = [
      '교재나 학습지에서 수업을 진행하면',
      '학습 분석과 진도 및 숙제를 한 눈에 볼 수 있습니다'
    ];
    
    let noDataCount = 0;
    for (const indicator of noDataIndicators) {
      if (mainText.includes(indicator)) {
        noDataCount++;
      }
    }
    
    // 2개 이상의 지표가 있을 때만 데이터 없음으로 판단
    if (noDataCount >= 2) {
      console.log(`    No learning history found (${noDataCount} indicators detected)`);
      return []; // 빈 배열 반환
    }
    
    // 현재 표시된 날짜 가져오기 - 여러 가능한 형식 시도
    let currentDate = new Date().toISOString().split('T')[0]; // 기본값: 오늘
    
    // 가능한 날짜 선택자들
    const dateSelectors = [
      'text=/지난 수업.*\\d{2}\\.\\d{2}/',
      'text=/\\d{2}\\.\\d{2}/',
      'text=/\\d{4}-\\d{2}-\\d{2}/',
      'text=/\\d{4}\\.\\d{2}\\.\\d{2}/'
    ];
    
    for (const selector of dateSelectors) {
      try {
        const dateElement = await page.locator(selector).first();
        if (await dateElement.isVisible({ timeout: 500 })) {
          const dateText = await dateElement.textContent();
          if (dateText) {
            // MM.DD 형식
            let match = dateText.match(/(\d{2})\.(\d{2})/);
            if (match) {
              const year = new Date().getFullYear();
              const month = match[1];
              const day = match[2];
              currentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              break;
            }
            
            // YYYY-MM-DD 형식
            match = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
              currentDate = `${match[1]}-${match[2]}-${match[3]}`;
              break;
            }
            
            // YYYY.MM.DD 형식
            match = dateText.match(/(\d{4})\.(\d{2})\.(\d{2})/);
            if (match) {
              currentDate = `${match[1]}-${match[2]}-${match[3]}`;
              break;
            }
          }
        }
      } catch {
        // 다음 선택자 시도
      }
    }

    console.log(`    Current date: ${currentDate}`);

    // 각 카테고리별로 데이터 추출
    for (const category of MATHFLAT_CONFIG.CATEGORIES) {
      const record = await parseCategoryData(page, category, studentId, currentDate);
      if (record && record.problemsSolved > 0) {
        records.push(record);
        console.log(`    ✅ Found data for ${category}: ${record.problemsSolved} problems, ${record.accuracyRate}%`);
      }
    }

    console.log(`    Total records found: ${records.length}`);
    return records;
  } catch (error) {
    console.error('Error parsing student data:', error);
    throw new Error(`데이터 파싱 실패: ${error}`);
  }
}

/**
 * 특정 카테고리의 데이터 추출
 */
async function parseCategoryData(
  page: Page,
  category: CategoryType,
  studentId: string,
  date: string
): Promise<MathflatRecord | null> {
  try {
    console.log(`      Searching for category: ${category}`);
    let problemsSolved = 0;
    let accuracyRate = 0;

    // 먼저 페이지 전체에서 카테고리 텍스트를 찾아보기
    const pageText = await page.textContent('body');
    console.log(`      Page contains "${category}": ${pageText?.includes(category) || false}`);
    
    // 다양한 선택자 시도 - 실제 HTML 구조에 맞게 수정
    const selectors = [
      // 실제 구조: label.card-label
      `label.card-label:has(div.title:text("${category}"))`,
      `label:has(div:text("${category}"))`,
      // 카드 형태
      `.card-label:has-text("${category}")`,
      `[class*="card"]:has-text("${category}")`,
      `label:has-text("${category}")`,
      // 일반적인 컨테이너
      `div:has(> div:text("${category}"))`,
      `div:has(> span:text("${category}"))`,
      `div:has(> p:text("${category}"))`
    ];
    
    let element = null;
    for (const selector of selectors) {
      try {
        const found = await page.locator(selector).first();
        if (await found.isVisible({ timeout: 200 })) {
          element = found;
          console.log(`      Found with selector: ${selector}`);
          break;
        }
      } catch {
        continue;
      }
    }
    
    if (element) {
      const elementText = await element.textContent();
      console.log(`      Element text: ${elementText?.substring(0, 100)}...`);
      
      // 더 정확한 방법: p 태그 안에서 직접 찾기
      try {
        // 문제 수: <div class="total-problem-count"><sub>총 문제 수</sub><p>0개</p></div>
        const problemElement = await element.locator('.total-problem-count p, div:has(sub:text("총 문제")) p').first();
        if (await problemElement.isVisible({ timeout: 200 })) {
          const problemText = await problemElement.textContent();
          const match = problemText?.match(/(\d+)/);
          if (match) {
            problemsSolved = parseInt(match[1], 10);
            console.log(`      Found problems (from p tag): ${problemsSolved}개`);
          }
        }
        
        // 정답률: <div class="correct-rate"><sub>정답률</sub><p>0%</p></div>
        const accuracyElement = await element.locator('.correct-rate p, div:has(sub:text("정답률")) p').first();
        if (await accuracyElement.isVisible({ timeout: 200 })) {
          const accuracyText = await accuracyElement.textContent();
          const match = accuracyText?.match(/(\d+)/);
          if (match) {
            accuracyRate = parseInt(match[1], 10);
            console.log(`      Found accuracy (from p tag): ${accuracyRate}%`);
          }
        }
      } catch (e) {
        console.log(`      Error finding p tags, falling back to text parsing`);
      }
      
      // 기존 방법도 폴백으로 유지
      if (problemsSolved === 0) {
        // 문제 수 찾기 - "총 문제 수40개" 형태를 처리
        const problemPatterns = [
          /(\d+)개/,          // "40개" - 숫자 바로 앞에 공백이 없을 수도 있음
          /수\s*(\d+)개/,     // "수 40개" 또는 "수40개"
          /(\d+)\s*문제/,     // "40 문제" 
          /문제\s*(\d+)/,     // "문제 40"
        ];
        
        for (const pattern of problemPatterns) {
          const match = elementText?.match(pattern);
          if (match) {
            problemsSolved = parseInt(match[1], 10);
            console.log(`      Found problems: ${problemsSolved} (pattern: ${pattern})`);
            break;
          }
        }
      }
      
      if (accuracyRate === 0) {
        // 정답률 찾기 - "정답률77%" 형태를 처리
        const accuracyPatterns = [
          /(\d+)%/,            // "77%" - 가장 일반적인 패턴
          /률\s*(\d+)%/,       // "률 77%" 또는 "률77%"
          /(\d+)\s*퍼센트/,    // "77 퍼센트"
          /정답률\s*(\d+)/,    // "정답률 77"
        ];
        
        for (const pattern of accuracyPatterns) {
          const match = elementText?.match(pattern);
          if (match) {
            accuracyRate = parseInt(match[1], 10);
            console.log(`      Found accuracy: ${accuracyRate}% (pattern: ${pattern})`);
            break;
          }
        }
      }
    } else {
      console.log(`      Element not found for category: ${category}`);
      return null;
    }

    // 문제를 풀지 않은 경우 null 반환
    if (problemsSolved === 0) {
      return null;
    }

    // 디버깅 로그
    console.log(`    ${category}: ${problemsSolved}개 문제, ${accuracyRate}% 정답률`);

    return {
      studentId,
      date,
      category,
      problemsSolved,
      accuracyRate,
    };
  } catch (error) {
    console.error(`Error parsing category ${category}:`, error);
    return null;
  }
}

/**
 * 날짜 선택기에서 날짜 설정
 */
export async function setDateOnPage(page: Page, date: string): Promise<void> {
  try {
    // 날짜 선택기 찾기
    const dateSelectors = [
      'input[type="date"]',
      '.date-picker',
      '.date-selector',
      'input[name="date"]',
    ];

    for (const selector of dateSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          await element.fill(date);
          
          // 날짜 변경 후 데이터 로딩 대기
          await page.waitForTimeout(2000);
          return;
        }
      } catch {
        continue;
      }
    }

    // 날짜 선택기를 찾지 못한 경우, 날짜 버튼 클릭 방식 시도
    const dateButton = page.locator(`text="${date}"`).first();
    if (await dateButton.isVisible({ timeout: 1000 })) {
      await dateButton.click();
      await page.waitForTimeout(2000);
      return;
    }

    console.warn(`Date selector not found for date: ${date}`);
  } catch (error) {
    console.error('Error setting date:', error);
    throw new Error(`날짜 설정 실패: ${error}`);
  }
}

/**
 * 학생 목록 페이지에서 학생 정보 추출 (현재는 사용하지 않음)
 */
export async function parseStudentList(page: Page): Promise<Array<{ name: string; link: string }>> {
  try {
    const students: Array<{ name: string; link: string }> = [];
    
    // 사이드바에서 학생 이름 찾기
    const grades = ['초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2'];
    
    for (const grade of grades) {
      try {
        const gradeToggle = await page.locator(`text="${grade}"`).first();
        if (await gradeToggle.isVisible({ timeout: 1000 })) {
          // 토글 열기
          const toggleIcon = await page.locator(`text="${grade}"`).locator('..').locator('svg').first();
          if (await toggleIcon.isVisible()) {
            await toggleIcon.click();
            await page.waitForTimeout(1000);
          }
          
          // 학생 찾기
          const studentRows = await page.locator('text=/출결|출석/').all();
          for (const row of studentRows) {
            const parentRow = await row.locator('..');
            const nameElement = await parentRow.locator('text=/[가-힣]+[가-힣0-9]*/').first();
            
            if (await nameElement.isVisible()) {
              const name = await nameElement.textContent();
              if (name && !name.includes('전체') && !name.includes('출결')) {
                students.push({
                  name: name.trim(),
                  link: '', // 실제 링크는 필요없음
                });
              }
            }
          }
        }
      } catch {
        continue;
      }
    }

    return students;
  } catch (error) {
    console.error('Error parsing student list:', error);
    throw new Error(`학생 목록 파싱 실패: ${error}`);
  }
}

/**
 * 로그인 성공 여부 확인
 */
export async function checkLoginSuccess(page: Page): Promise<boolean> {
  try {
    // URL 확인이 가장 확실한 방법
    const url = page.url();
    if (url.includes('/login') || url.includes('/signin')) {
      return false;
    }
    
    // 로그인 페이지가 아니면 성공으로 간주
    return true;
  } catch (error) {
    console.error('Error checking login status:', error);
    return false;
  }
}