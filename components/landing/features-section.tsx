'use client'

import React from 'react'
import { BookOpen, Users, Target, Trophy, Brain, Clock } from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: '개념 중심 학습',
    description: '단순 암기가 아닌, 수학의 본질적 개념을 깊이 있게 이해할 수 있도록 지도합니다.',
  },
  {
    icon: Users,
    title: '소수정예 수업',
    description: '개별 맞춤형 교육이 가능한 소규모 학급으로 운영하여 학생 한 명 한 명을 세심하게 케어합니다.',
  },
  {
    icon: Target,
    title: '논리적 사고력',
    description: '문제 해결 과정을 체계적으로 서술하고 논리적으로 사고하는 능력을 기릅니다.',
  },
  {
    icon: Trophy,
    title: '검증된 실력',
    description: '매월 매쓰플랫 KMM 수상 등 다양한 수학 경시대회에서 우수한 성과를 거두고 있습니다.',
  },
  {
    icon: BookOpen,
    title: '체계적 커리큘럼',
    description: '학생 개별 수준에 맞춘 단계별 학습으로 기초부터 심화까지 체계적으로 학습합니다.',
  },
  {
    icon: Clock,
    title: '15년 전문성',
    description: '15년 이상의 수학 교육 경험을 바탕으로 검증된 교육 방법을 제공합니다.',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 lg:py-32 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            왜 밸류인수학인가요?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            15년간 축적된 노하우와 체계적인 교육 시스템으로 학생들의 수학적 사고력을 키웁니다.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative p-8 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:shadow-lg dark:hover:shadow-2xl"
            >
              {/* Background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              
              <div className="relative">
                {/* Icon */}
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mb-6">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 rounded-full">
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              고등관 · 중등관 · 영재관 운영
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}