'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Phone, Calendar } from 'lucide-react'

export function CTASection() {
  return (
    <section id="contact" className="py-20 lg:py-32 bg-white dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main CTA */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-8 lg:p-16 border border-gray-200 dark:border-gray-800">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            지금 시작해보세요
          </h2>
          
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            밸류인수학과 함께 진정한 수학적 사고력을 기르고 체계적인 학습으로 실력을 향상시켜보세요.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="group bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-8 py-6 text-lg font-semibold"
            >
              <Phone className="w-5 h-5 mr-2" />
              무료 상담 신청
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 px-8 py-6 text-lg font-semibold"
            >
              <Calendar className="w-5 h-5 mr-2" />
              입학테스트 신청
            </Button>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 text-gray-600 dark:text-gray-400">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              📞 02-457-4933
            </div>
            <div className="space-y-2">
              <p className="text-base">
                서울시 광진구 아차산로 484, 6층 601호 (구의동)
              </p>
              <p className="text-sm">
                광나루역, 구의역 인근 | 평일 15:00~22:00, 토요일 10:00~16:00
              </p>
            </div>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">15+</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">년 전문 경력</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">9명 이하</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">소수정예 수업</div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">3개관</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">고등관·중등관·영재관</div>
          </div>
        </div>
      </div>
    </section>
  )
}