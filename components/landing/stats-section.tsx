'use client'

import React from 'react'
import { Award, Users, Clock, Star } from 'lucide-react'

const stats = [
  {
    icon: Clock,
    number: '15+',
    label: '년 전문 경력',
    description: '수학 교육 전문성',
  },
  {
    icon: Users,
    number: '9',
    label: '명 이하 소수정예',
    description: '개별 맞춤 교육',
  },
  {
    icon: Award,
    number: '매월',
    label: 'KMM 수상',
    description: '검증된 교육 성과',
  },
  {
    icon: Star,
    number: '3',
    label: '개 전문관 운영',
    description: '고등관·중등관·영재관',
  },
]

export function StatsSection() {
  return (
    <section id="stats" className="py-20 lg:py-32 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            숫자로 보는 밸류인수학
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            검증된 교육 경험과 지속적인 성과를 통해 확인된 밸류인수학의 전문성입니다.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="relative text-center p-8 bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-lg dark:hover:shadow-2xl transition-all duration-300"
            >
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6">
                <stat.icon className="w-8 h-8 text-white" />
              </div>

              {/* Number */}
              <div className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                {stat.number}
              </div>

              {/* Label */}
              <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {stat.label}
              </div>

              {/* Description */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {stat.description}
              </div>
            </div>
          ))}
        </div>

        {/* Additional info */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-8 px-8 py-4 bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
              <span className="font-semibold">📍 위치:</span>
              <span>광나루역, 구의역 인근</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
              <span className="font-semibold">📞 문의:</span>
              <span>02-457-4933</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}