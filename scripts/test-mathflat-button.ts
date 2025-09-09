#!/usr/bin/env tsx
// MathFlat 크롤링 테스트
// 실행: npx tsx scripts/test-mathflat-crawl.ts

import { chromium, Browser, Page } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 환경변수 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const CONFIG = {
  BASE_URL: process.env.MATHFLAT_BASE_URL || 'https://teacher.mathflat.com',
  LOGIN_URL: process.env.MATHFLAT_LOGIN_URL || 'https://teacher.mathflat.com/login',
  LOGIN_ID: process.env.MATHFLAT_LOGIN_ID || '',
  LOGIN_PW: process.env.MATHFLAT_LOGIN_PW || '',
};

async function testMathflatCrawling() {
  console.log('🚀 MathFlat 크롤링 테스트\n');
  console.log('설정:');
  console.log(`  - URL: ${CONFIG.LOGIN_URL}`);
  console.log(`  - ID: ${CONFIG.LOGIN_ID}`);
  console.log(`  - PW: ${CONFIG.LOGIN_PW ? '****' : '(설정 안됨)'}\n`);
  
  // 스크린샷 디렉토리 설정
  const screenshotDir = path.join(process.cwd(), 'screenshots', 'mathflat');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }
  console.log(`📁 스크린샷 저장 경로: ${screenshotDir}\n`);

  if (!CONFIG.LOGIN_ID || !CONFIG.LOGIN_PW) {
    console.error('❌ 환경변수가 설정되지 않았습니다.');
    console.error('   .env.local 파일에 MATHFLAT_LOGIN_ID와 MATHFLAT_LOGIN_PW를 설정하세요.');
    return;
  }

  // 테스트 옵션: 전체열기 버튼만 테스트
  const TEST_ONLY_BUTTON = true; // 전체열기 버튼만 테스트
  
  const browser = await chromium.launch({
    headless: false, // 브라우저 창 보이기
    slowMo: 500,     // 각 동작마다 0.5초 대기
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: 'ko-KR',
    });

    const page = await context.newPage();

    // 콘솔 메시지 출력
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 콘솔 에러:', msg.text());
      }
    });

    // =================
    // 1. 로그인
    // =================
    console.log('1️⃣ 로그인 페이지 접속...');
    await page.goto(CONFIG.LOGIN_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 로그인 폼 확인
    const loginForm = await page.locator('form').first();
    const formExists = await loginForm.isVisible();
    console.log(`   로그인 폼 발견: ${formExists ? '✅' : '❌'}`);

    // ID 입력
    console.log('2️⃣ 로그인 정보 입력...');
    const idInput = await page.locator('input[name="id"]').first();
    await idInput.fill(CONFIG.LOGIN_ID);
    console.log(`   ✓ ID 입력: ${CONFIG.LOGIN_ID}`);

    // 비밀번호 입력
    const pwInput = await page.locator('input[name="password"]').first();
    await pwInput.fill(CONFIG.LOGIN_PW);
    console.log('   ✓ 비밀번호 입력: ****');

    // Enter 키로 로그인
    console.log('3️⃣ 로그인 시도 (Enter 키)...');
    await pwInput.press('Enter');

    // 로그인 후 대기
    console.log('4️⃣ 로그인 처리 대기...');
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`   현재 URL: ${currentUrl}`);

    if (currentUrl.includes('login')) {
      console.log('   ❌ 로그인 실패');
      return;
    }

    console.log('   ✅ 로그인 성공!');

    // =================
    // 2. 수업 페이지로 이동
    // =================
    console.log('\n5️⃣ 수업 메뉴 찾기...');
    
    // 헤더의 모든 메뉴 확인
    const headerMenus = await page.locator('header button, header a').all();
    console.log(`   헤더 메뉴 ${headerMenus.length}개 발견:`);
    
    let lessonButtonFound = false;
    for (const menu of headerMenus) {
      const menuText = await menu.textContent();
      console.log(`     - "${menuText?.trim()}"`);
      
      // '수업' 메뉴만 찾기 (수업준비 제외)
      if (menuText?.trim() === '수업') {
        console.log('   ✅ 수업 버튼 발견!');
        await menu.click();
        lessonButtonFound = true;
        await page.waitForTimeout(3000);
        console.log(`   현재 URL: ${page.url()}`);
        break;
      }
    }
    
    if (!lessonButtonFound) {
      console.log('   ⚠️ 수업 버튼을 찾지 못했습니다. 직접 URL로 이동...');
      await page.goto('https://teacher.mathflat.com/lesson/worksheet/grade/중1');
      await page.waitForTimeout(3000);
    }

    // =================
    // 3. 전체열기 버튼 테스트
    // =================
    console.log('\n6️⃣ 전체열기/전체닫기 버튼 찾기...');
    
    // 스크린샷 저장
    await page.screenshot({ path: path.join(screenshotDir, 'mathflat-lesson-page.png'), fullPage: true });
    console.log('   📸 수업 페이지 스크린샷 저장');
    
    // 모든 버튼 출력해서 확인
    console.log('\n   🔍 페이지의 모든 버튼 확인:');
    const allButtons = await page.locator('button').all();
    console.log(`   총 ${allButtons.length}개 버튼 발견`);
    
    for (let i = 0; i < allButtons.length; i++) {
      const btnText = await allButtons[i].textContent();
      const btnVisible = await allButtons[i].isVisible();
      if (btnText && btnVisible) {
        console.log(`     버튼 ${i}: "${btnText.trim()}" (visible: ${btnVisible})`);
        
        // 전체열기 또는 전체닫기 버튼 찾기
        if (btnText.includes('전체열기') || btnText.includes('전체닫기')) {
          console.log(`       >>> 찾았다! "${btnText.trim()}" 버튼`);
          
          // HTML 구조 확인
          const btnHTML = await allButtons[i].evaluate(el => el.outerHTML);
          console.log(`       HTML: ${btnHTML}`);
          
          // 부모 요소 확인
          const parent = await allButtons[i].locator('..');
          const parentHTML = await parent.evaluate(el => el.outerHTML);
          console.log(`       부모 HTML (첫 200자): ${parentHTML.substring(0, 200)}...`);
        }
      }
    }
    
    // 전체열기 버튼 클릭 시도
    console.log('\n   🔍 전체열기 버튼 클릭 시도:');
    
    // 방법 1: text selector
    try {
      const openBtn1 = await page.locator('button:has-text("전체열기")').first();
      if (await openBtn1.isVisible({ timeout: 1000 })) {
        console.log('   ✅ 방법1: button:has-text("전체열기") 성공');
        await openBtn1.click();
        await page.waitForTimeout(3000);
        console.log('   클릭 완료, 3초 대기...');
      } else {
        console.log('   ❌ 방법1: button:has-text("전체열기") 실패');
      }
    } catch (e) {
      console.log('   ❌ 방법1 오류:', e);
    }
    
    // 방법 2: text content exact match
    try {
      const openBtn2 = await page.locator('button').filter({ hasText: '전체열기' }).first();
      if (await openBtn2.isVisible({ timeout: 1000 })) {
        console.log('   ✅ 방법2: filter hasText 성공');
      } else {
        console.log('   ❌ 방법2: filter hasText 실패');
      }
    } catch (e) {
      console.log('   ❌ 방법2 오류:', e);
    }
    
    // 방법 3: 정확한 텍스트 매칭
    try {
      const openBtn3 = await page.locator('button').filter({ hasText: /^전체열기$/ }).first();
      if (await openBtn3.isVisible({ timeout: 1000 })) {
        console.log('   ✅ 방법3: 정규식 매칭 성공');
      } else {
        console.log('   ❌ 방법3: 정규식 매칭 실패');
      }
    } catch (e) {
      console.log('   ❌ 방법3 오류:', e);
    }

    // 사이드바의 학년 토글 찾기 (초3~고3)
    let grades = ['초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
    
    // 고2만 테스트 모드인 경우 필터링
    if (TEST_ONLY_HIGH2) {
      grades = ['고2'];
      console.log('   ⚡ 고2 학생만 테스트합니다.');
    }
    
    let studentFound = false;

    for (const grade of grades) {
      try {
        // 학년 토글 찾기
        const gradeToggle = await page.locator(`text="${grade}"`).first();
        
        if (await gradeToggle.isVisible()) {
          console.log(`\n   학년: ${grade}`);
          
          // 토글 열기 (▶ 아이콘 클릭)
          const toggleIcon = await page.locator(`text="${grade}"`).locator('..').locator('svg').first();
          if (await toggleIcon.isVisible()) {
            console.log('     토글 열기...');
            await toggleIcon.click();
            await page.waitForTimeout(1500);
          }
          
          // 해당 학년의 학생 수 확인
          const studentCount = await page.locator(`text="${grade}"`).locator('..').locator('text=/\\d+명/').first();
          if (await studentCount.isVisible()) {
            const count = await studentCount.textContent();
            console.log(`     학생 수: ${count}`);
          }
          
          // "전체" 다음에 있는 개별 학생들 찾기
          // 학생 이름은 "출결" 또는 "출석" 버튼 앞에 있음
          const studentRows = await page.locator('text=/출결|출석/').all();
          
          if (studentRows.length > 0) {
            console.log(`     ${studentRows.length}명의 학생 발견`);
            
            // 첫 번째 학생의 이름 찾기 및 클릭
            for (let i = 0; i < Math.min(studentRows.length, 2); i++) {
              try {
                // 출결/출석 버튼의 부모 요소에서 학생 이름 찾기
                const studentRow = studentRows[i];
                const parentRow = await studentRow.locator('..');
                
                // 학생 이름 텍스트 찾기 (출결 버튼 전의 텍스트)
                const nameElement = await parentRow.locator('text=/[가-힣]+[가-힣0-9]*/').first();
                
                if (await nameElement.isVisible()) {
                  const studentName = await nameElement.textContent();
                  
                  // 전체, 출결, 출석 등의 텍스트가 아닌 실제 이름인지 확인
                  if (studentName && 
                      !studentName.includes('전체') && 
                      !studentName.includes('출결') && 
                      !studentName.includes('출석') &&
                      !studentName.includes('명')) {
                    
                    console.log(`\n7️⃣ 학생 선택: ${studentName}`);
                    await nameElement.click();
                    await page.waitForTimeout(2000);
                    
                    // =================
                    // 4. 학습 내역 보기
                    // =================
                    console.log('8️⃣ 학습 내역 버튼 찾기...');
                    
                    // 오른쪽 상단의 '학습 내역' 버튼 찾기
                    const historyButton = await page.locator('button:has-text("학습 내역"), a:has-text("학습 내역"), button:has-text("학습내역"), a:has-text("학습내역")').first();
                    
                    if (await historyButton.isVisible()) {
                  console.log('   ✅ 학습 내역 버튼 발견');
                  await historyButton.click();
                  await page.waitForTimeout(3000);
                  
                  // 학습 내역 페이지 분석
                  console.log('\n9️⃣ 학습 내역 페이지 분석...');
                  console.log(`   현재 URL: ${page.url()}`);
                  
                  // 날짜별 학습 데이터 찾기
                  const dateElements = await page.locator('[class*="date"], [class*="날짜"], time').all();
                  console.log(`   날짜 요소: ${dateElements.length}개`);
                  
                  if (dateElements.length > 0) {
                    console.log('   최근 학습 날짜:');
                    for (let j = 0; j < Math.min(dateElements.length, 5); j++) {
                      const dateText = await dateElements[j].textContent();
                      console.log(`     - ${dateText}`);
                    }
                  }
                  
                  // HTML 구조 확인
                  console.log('\n   📋 HTML 구조 분석:');
                  
                  // 각 카테고리별로 HTML 구조 확인
                  const categories = ['학습지', '교재', '오답/심화', '챌린지'];
                  
                  for (const category of categories) {
                    console.log(`\n   === ${category} 카드 분석 ===`);
                    
                    // 여러 가능한 선택자 시도
                    const selectors = [
                      `text="${category}"`,
                      `h3:text("${category}")`,
                      `div:has-text("${category}")`,
                      `[class*="card"]:has-text("${category}")`,
                      `[class*="Card"]:has-text("${category}")`,
                    ];
                    
                    for (const selector of selectors) {
                      try {
                        const elements = await page.locator(selector).all();
                        if (elements.length > 0) {
                          console.log(`     ✓ 선택자 "${selector}"로 ${elements.length}개 요소 발견`);
                          
                          // 첫 번째 요소의 HTML 출력
                          const firstElement = elements[0];
                          const html = await firstElement.evaluate(el => el.outerHTML);
                          console.log(`     HTML (첫 200자): ${html.substring(0, 200)}...`);
                          
                          // 부모 요소 확인
                          const parent = await firstElement.locator('..');
                          const parentHTML = await parent.evaluate(el => el.outerHTML);
                          console.log(`     부모 HTML (첫 300자): ${parentHTML.substring(0, 300)}...`);
                          
                          // 문제 수와 정답률 찾기
                          const problemTexts = await parent.locator('text=/\\d+개/').all();
                          const percentTexts = await parent.locator('text=/\\d+%/').all();
                          
                          if (problemTexts.length > 0) {
                            const problemText = await problemTexts[0].textContent();
                            console.log(`     ✓ 문제 수: ${problemText}`);
                          }
                          
                          if (percentTexts.length > 0) {
                            const percentText = await percentTexts[0].textContent();
                            console.log(`     ✓ 정답률: ${percentText}`);
                          }
                          
                          break; // 성공한 선택자가 있으면 다음 카테고리로
                        }
                      } catch (e) {
                        // 선택자가 실패하면 다음 시도
                      }
                    }
                  }
                  
                  // 전체 페이지의 카드 구조 확인
                  console.log('\n   === 전체 카드 구조 확인 ===');
                  const cardSelectors = [
                    '[class*="card"]',
                    '[class*="Card"]',
                    'div[class*="box"]',
                    'div[class*="Box"]',
                    'section',
                    'article',
                  ];
                  
                  for (const selector of cardSelectors) {
                    const cards = await page.locator(selector).all();
                    if (cards.length > 0 && cards.length < 10) { // 너무 많으면 의미없는 div일 가능성
                      console.log(`   선택자 "${selector}"로 ${cards.length}개 카드 발견`);
                      
                      // 각 카드가 카테고리를 포함하는지 확인
                      for (let i = 0; i < Math.min(cards.length, 4); i++) {
                        const cardText = await cards[i].textContent();
                        for (const cat of categories) {
                          if (cardText?.includes(cat)) {
                            const cardHTML = await cards[i].evaluate(el => el.outerHTML);
                            console.log(`     카드 ${i+1}에 "${cat}" 포함`);
                            console.log(`     HTML (첫 200자): ${cardHTML.substring(0, 200)}...`);
                            break;
                          }
                        }
                      }
                    }
                  }
                  
                      // 스크린샷 저장
                      await page.screenshot({ path: path.join(screenshotDir, `mathflat-history-${studentName?.trim()}.png`), fullPage: true });
                      console.log(`   📸 ${studentName} 학습 내역 스크린샷 저장`);
                      
                      studentFound = true;
                      break; // 한 명만 테스트하고 종료
                    } else {
                      console.log('   ⚠️ 학습 내역 버튼을 찾지 못했습니다.');
                      
                      // 페이지의 모든 버튼 확인 (디버깅용)
                      const allButtons = await page.locator('button').all();
                      console.log(`   페이지의 버튼 ${allButtons.length}개:`);
                      for (let k = 0; k < Math.min(allButtons.length, 10); k++) {
                        const btnText = await allButtons[k].textContent();
                        console.log(`     - "${btnText?.trim()}"`);
                      }
                    }
                  }
                }
              } catch (e) {
                console.log(`     학생 ${i+1} 처리 중 오류:`, e);
              }
            }
            
            if (studentFound) break;
          }
        }
      } catch (e) {
        // 다음 학년 시도
      }
    }

    if (!studentFound) {
      console.log('\n   ⚠️ 학생 데이터를 찾지 못했습니다.');
    }

    // =================
    // 5. 최종 요약
    // =================
    console.log('\n📊 테스트 요약:');
    console.log('   1. 로그인: ✅');
    console.log('   2. 수업 페이지 접근: ✅');
    console.log(`   3. 학생 선택: ${studentFound ? '✅' : '❌'}`);
    console.log(`   4. 학습 내역 확인: ${studentFound ? '✅' : '❌'}`);

    console.log('\n⏸️  15초 후 브라우저를 닫습니다...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('\n❌ 테스트 중 오류:', error);
  } finally {
    await browser.close();
    console.log('\n✅ 테스트 완료');
  }
}

// 실행
testMathflatCrawling().catch(console.error);