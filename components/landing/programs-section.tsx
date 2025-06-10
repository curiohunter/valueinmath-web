'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GraduationCap, BookOpen, Lightbulb, Users, Clock, Target } from 'lucide-react'

export function ProgramsSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  const programs = [
    {
      title: "고등관",
      subtitle: "High School Division",
      description: "수능과 내신을 동시에 준비하는 체계적인 고등수학 커리큘럼",
      icon: GraduationCap,
      students: "7명 이하",
      subjects: ["공통수학1", "공통수학2", "수학Ⅰ", "수학Ⅱ", "미적분", "확률과 통계"],
      features: [
        "수능 출제경향 완벽 분석",
        "학교별 내신 기출문제 제공", 
        "개념과 문제해결의 균형잡힌 학습",
        "논리적 서술형 답안 작성법"
      ],
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      title: "중등관", 
      subtitle: "Middle School Division",
      description: "고등수학 연계를 고려한 탄탄한 기초 실력 완성",
      icon: BookOpen,
      students: "9명 이하",
      subjects: ["중1 수학", "중2 수학", "중3 수학", "중등 과학"],
      features: [
        "고등수학 연계 개념 선행학습",
        "학교별 내신 완벽 대비",
        "수학적 사고력 기초 다지기", 
        "문제해결 과정 체계적 훈련"
      ],
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      title: "영재관",
      subtitle: "Gifted Program",
      description: "창의적 문제해결력과 심화 수학 사고력 배양",
      icon: Lightbulb,
      students: "6명 이하", 
      subjects: ["기하", "대수", "심화과정", "수학독서"],
      features: [
        "창의적 문제해결 능력 개발",
        "수학 독서를 통한 사고력 확장",
        "개별 맞춤 진도 관리",
        "매쓰플랫 KMM 경시대회 준비"
      ],
      color: "from-purple-500 to-pink-600", 
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600"
    }
  ]

  const features = [
    {
      icon: Users,
      title: "소수정예 수업",
      description: "개인별 맞춤 지도가 가능한 최적의 인원 구성"
    },
    {
      icon: Clock,
      title: "개별 클리닉",
      description: "모르는 부분을 언제든 질문하고 해결할 수 있는 1:1 지도"
    },
    {
      icon: Target,
      title: "맞춤형 진단",
      description: "정기적인 평가를 통한 학생별 취약점 분석 및 피드백"
    }
  ]

  return (
    <div className="py-20 bg-gray-50" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-4 text-sm font-medium">
            PROGRAMS
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">수준별 맞춤</span> 교육과정
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            학생의 수준과 목표에 맞춘 체계적인 수학 전문 교육을 통해<br />
            단계적으로 실력을 향상시킬 수 있도록 도와드립니다.
          </p>
        </motion.div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          {programs.map((program, index) => (
            <motion.div
              key={program.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg group overflow-hidden">
                {/* Header with Gradient */}
                <div className={`bg-gradient-to-r ${program.color} p-6 text-white relative`}>
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                    <program.icon className="w-full h-full" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-2">
                      <program.icon className="w-8 h-8" />
                      <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        {program.students}
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold mb-1">{program.title}</h3>
                    <p className="text-white/80 text-sm">{program.subtitle}</p>
                  </div>
                </div>

                <CardContent className="p-6">
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {program.description}
                  </p>
                  
                  {/* Subjects */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">주요 과목</h4>
                    <div className="flex flex-wrap gap-2">
                      {program.subjects.map((subject) => (
                        <Badge key={subject} variant="outline" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-900 mb-3">특징</h4>
                    {program.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${program.bgColor} mt-2`} />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-2xl shadow-lg flex items-center justify-center">
                <feature.icon className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}