'use client'

import React from 'react'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo and Description */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="font-semibold text-xl text-gray-900 dark:text-white">
                밸류인수학
              </span>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              개념 중심의 깊이 있는 학습과 논리적 서술 능력으로 진정한 수학적 사고력을 키우는 광진구 수학전문학원
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">빠른 링크</h3>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  특징
                </a>
              </li>
              <li>
                <a href="#stats" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  실적
                </a>
              </li>
              <li>
                <a href="#contact" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  문의
                </a>
              </li>
              <li>
                <Link href="/login" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  관리시스템 로그인
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">연락처</h3>
            <div className="space-y-2 text-gray-600 dark:text-gray-400">
              <p>📞 02-457-4933</p>
              <p>📍 서울시 광진구 아차산로 484, 6층 601호</p>
              <p>🚇 광나루역, 구의역 인근</p>
              <p>🕒 평일 15:00~22:00, 토 10:00~16:00</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2025 밸류인수학학원. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
              <span>고등관 · 중등관 · 영재관</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}