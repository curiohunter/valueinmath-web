'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Star } from 'lucide-react'
import { InquiryFormModal } from './inquiry-form-modal'

export function HeroSection() {
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false)
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black" />

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-transparent to-purple-50 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 mb-8">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>광진구 1등 수학전문학원</span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="text-gray-900 dark:text-white">
              수학의 깊이를
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              진정으로 이해하다
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            개념에 대한 깊이 있는 이해와 논리적 서술 능력으로{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              진정한 수학적 사고력
            </span>을 키워주는 밸류인수학학원
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button
              size="lg"
              className="group bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-8 py-6 text-lg font-semibold"
              onClick={() => setIsInquiryModalOpen(true)}
            >
              무료 상담 시작하기
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Contact info */}
          <div className="space-y-2 text-gray-600 dark:text-gray-400">
            <p className="text-lg font-medium">📞 02-457-4933</p>
            <p className="text-base">
              서울시 광진구 아차산로 484, 6층 601호 (구의동)
            </p>
            <p className="text-sm">
              올림픽대교 북단사거리, 올리브영 건물 6층
            </p>
          </div>
        </div>
      </div>

      {/* Bottom blur */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-black to-transparent" />

      {/* Inquiry Modal */}
      <InquiryFormModal
        open={isInquiryModalOpen}
        onOpenChange={setIsInquiryModalOpen}
      />
    </section>
  )
}