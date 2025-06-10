'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, Users, TrendingUp, Award } from 'lucide-react'

export function AboutSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  const philosophies = [
    {
      icon: Target,
      title: "깊이 있는 개념 이해",
      description: "단순 암기가 아닌 수학적 원리에 대한 본질적 접근으로 진정한 개념 이해를 추구합니다.",
      color: "text-blue-500",
      bgColor: "bg-blue-50"
    },
    {
      icon: Users,
      title: "논리적 서술 능력 강화", 
      description: "수학적 사고과정을 언어화하여 서술형 평가에서 높은 점수를 받을 수 있도록 훈련합니다.",
      color: "text-green-500",
      bgColor: "bg-green-50"
    },
    {
      icon: TrendingUp,
      title: "체계적인 학습 관리",
      description: "정기적인 평가와 개별 클리닉을 통해 학생별 맞춤형 학습 방향을 제시합니다.",
      color: "text-purple-500", 
      bgColor: "bg-purple-50"
    },
    {
      icon: Award,
      title: "실전 대비 학습",
      description: "학교별 기출문제 분석과 모의고사를 통한 실전 감각을 키워 안정적인 성적 향상을 돕습니다.",
      color: "text-orange-500",
      bgColor: "bg-orange-50"
    }
  ]

  const stats = [
    { number: "15+", label: "년 교육경력", suffix: "" },
    { number: "98", label: "학생 만족도", suffix: "%" },
    { number: "7", label: "명 이하 소수정예", suffix: "" },
    { number: "24", label: "시간 질의응답", suffix: "/7" }
  ]

  return (
    <div className="py-20 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-4 text-sm font-medium">
            ABOUT VALUEIN
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            밸류인만의 <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">교육 철학</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            "수학의 가치를 믿는, 가치 있는 사람들이 모이는 곳"이라는 모토 아래,<br />
            학생들이 점수 향상과 함께 진정한 수학적 사고력과 자신감을 키울 수 있도록 최선을 다하고 있습니다.
          </p>
        </motion.div>

        {/* Philosophy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {philosophies.map((philosophy, index) => (
            <motion.div
              key={philosophy.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-all duration-300 border-0 shadow-md group hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${philosophy.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <philosophy.icon className={`w-8 h-8 ${philosophy.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    {philosophy.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {philosophy.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ scale: 0 }}
                animate={inView ? { scale: 1 } : { scale: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1, type: "spring", stiffness: 100 }}
                className="text-center text-white"
              >
                <div className="text-3xl md:text-4xl font-bold mb-2">
                  {stat.number}
                  <span className="text-blue-200">{stat.suffix}</span>
                </div>
                <div className="text-sm md:text-base text-blue-100">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Differentiators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 text-center"
        >
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
            밸류인의 <span className="text-blue-600">차별화 포인트</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              "소수정예 학습",
              "체계적인 커리큘럼", 
              "실전 대비 학습",
              "전문 교육 시스템",
              "데이터 기반 관리"
            ].map((point, index) => (
              <motion.div
                key={point}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4, delay: 1.0 + index * 0.1 }}
                className="bg-gray-50 rounded-2xl p-4 hover:bg-blue-50 transition-colors duration-300"
              >
                <div className="text-sm font-semibold text-gray-700">
                  {point}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}