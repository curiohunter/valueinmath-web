// MathFlat 크롤링 설정

export const MATHFLAT_CONFIG = {
  // Base URLs
  BASE_URL: process.env.MATHFLAT_BASE_URL || 'https://teacher.mathflat.com',
  LOGIN_URL: process.env.MATHFLAT_LOGIN_URL || 'https://teacher.mathflat.com/login',
  LESSON_URL: 'https://teacher.mathflat.com/lesson/worksheet/grade', // 수업 페이지 직접 URL
  
  // Credentials (must be set in environment variables)
  LOGIN_ID: process.env.MATHFLAT_LOGIN_ID || '',
  LOGIN_PW: process.env.MATHFLAT_LOGIN_PW || '',
  
  // Crawling settings
  PAGE_TIMEOUT: 30000, // 30 seconds
  WAIT_BETWEEN_REQUESTS: 2000, // 2 seconds
  MAX_RETRIES: 3,
  MAX_CONCURRENT_STUDENTS: 3,
  
  // Browser settings
  HEADLESS: process.env.NODE_ENV === 'production',
  VIEWPORT: { width: 1280, height: 720 },
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  
  // Categories
  CATEGORIES: ['학습지', '교재', '오답/심화', '챌린지'] as const,
  
  // Selectors (테스트에서 확인된 실제 선택자)
  SELECTORS: {
    LOGIN: {
      ID_INPUT: 'input[name="id"]',
      PW_INPUT: 'input[name="password"]',
      SUBMIT_BTN: 'Enter', // Enter 키로 로그인
    },
    NAVIGATION: {
      LESSON_BUTTON: 'header button:has-text("수업"):not(:has-text("준비")), header a:has-text("수업"):not(:has-text("준비"))', // "수업준비" 제외
      HISTORY_BUTTON: 'button:has-text("학습 내역"), a:has-text("학습 내역"), button:has-text("학습내역"), a:has-text("학습내역")',
    },
    SIDEBAR: {
      GRADE_TOGGLE: 'text=/^(초[3-6]|중[1-3]|고[1-2])$/', // 정확한 학년만 매칭
      TOGGLE_ICON: 'svg', // 토글 아이콘
      STUDENT_ROW: 'text=/출결|출석/', // 학생 행 표시
      STUDENT_NAME: 'text=/^[가-힣]+[가-힣0-9]*$/', // 한글 이름
    },
    LEARNING_DATA: {
      CATEGORY_NAMES: ['학습지', '교재', '오답/심화', '챌린지'],
      DATE_ELEMENT: '[class*="date"], [class*="날짜"], time',
      PROBLEM_COUNT: 'text=/\\d+문제/',
      ACCURACY_RATE: 'text=/\\d+%/',
    },
  },
  
  // Date formats
  DATE_FORMAT: 'YYYY-MM-DD',
  
  // Error messages
  ERRORS: {
    LOGIN_FAILED: '로그인에 실패했습니다. ID/PW를 확인해주세요.',
    PAGE_TIMEOUT: '페이지 로딩 시간이 초과되었습니다.',
    STUDENT_NOT_FOUND: '학생 정보를 찾을 수 없습니다.',
    DATA_PARSE_ERROR: '데이터 파싱 중 오류가 발생했습니다.',
  },
};

// Helper functions
export function getDateRange(weeks: number = 1): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() - ((end.getDay() + 6) % 7)); // Last Sunday
  
  const start = new Date(end);
  start.setDate(start.getDate() - (7 * weeks) + 1); // Monday of n weeks ago
  
  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseKoreanNumber(text: string): number {
  // "45개", "93%" 같은 텍스트에서 숫자 추출
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}