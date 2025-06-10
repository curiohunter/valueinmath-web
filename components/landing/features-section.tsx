'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  Target, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Clock,
  CheckCircle,
  BarChart3
} from 'lucide-react'

export function FeaturesSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  const features = [
    {
      icon: Database,
      title: "데이터 기반 학습 관리",
      description: "학생의 학습 데이터를 체계적으로 수집하고 분석하여 개인별 맞춤 전략을 수립합니다.",
      details: ["월별 학습 보고서", "진도 상황 추적", "성취도 분석", "개인별 데이터 관리"],
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: Target,
      title: "맞춤형 진단 및 피드백",
      description: "정기적인 평가를 통해 학생별 취약점을 분석하고 맞춤형 학습 방향을 제시합니다.",
      details: ["취약점 분석", "개별 클리닉", "맞춤형 피드백", "학습 방향 제시"],
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: TrendingUp,
      title: "실전 대비 학습",
      description: "학교별, 유형별 기출문제 분석과 모의고사를 통한 실전 감각을 키웁니다.",
      details: ["기출문제 분석", "모의고사 진행", "출제 경향 파악", "실전 감각 향상"],
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      icon: Users,
      title: "소수정예 학습",
      description: "밀착 지도가 가능한 학급 운영으로 개개인의 학습 상황을 철저히 관리합니다.",
      details: ["고등관 7명 이하", "중등관 9명 이하", "영재관 6명 이하", "개별 관리"],
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      icon: BookOpen,
      title: "체계적인 커리큘럼",
      description: "학년별, 수준별로 체계화된 커리큘럼으로 단계적 실력 향상을 지원합니다.",
      details: ["수준별 교육과정", "단계적 학습", "연계성 확보", "체계적 관리"],
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50"
    },
    {
      icon: Clock,
      title: "전문 교육 시스템",
      description: "수학 교육에 특화된 전문 교사진과 검증된 교육 시스템으로 안정적인 성적 향상을 돕습니다.",
      details: ["전문 강사진", "검증된 시스템", "지속적 연구", "안정적 향상"],
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-50"
    }
  ]

  const achievements = [
    {
      icon: CheckCircle,
      title: "체계적인 학습 관리",
      description: "한달 수업 후 아이의 성적을 데이터로 분석해 주셔서 수업 내용을 확인해 볼 수 있어 좋습니다.",
      author: "학부모 후기"
    },
    {
      icon: Users,
      title: "맞춤형 지도",
      description: "아이의 특성과 성향을 잘 파악하여 맞춤형으로 지도해주십니다.",
      author: "학부모 후기"
    },
    {
      icon: BarChart3,
      title: "면학 분위기",
      description: "면학 분위기가 좋아 아이가 오랜 시간 집중해서 공부할 수 있습니다.",
      author: "학부모 후기"
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
            FEATURES
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            밸류인의 <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">차별화 포인트</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            점수 향상을 넘어 진정한 수학적 사고력을 키우는<br />
            밸류인만의 특별한 교육 시스템을 소개합니다.
          </p>
        </motion.div>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg group">
                <CardContent className="p-6">
                  <div className={`w-16 h-16 mb-6 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <div className="space-y-2">
                    {feature.details.map((detail, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${feature.color}`} />
                        <span className="text-sm text-gray-600">{detail}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Achievement Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-white rounded-3xl p-8 md:p-12 shadow-lg"
        >
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              학부모님들의 <span className="text-blue-600">생생한 후기</span>
            </h3>
            <p className="text-gray-600">
              밸류인수학학원을 선택한 학부모님들이 직접 전하는 만족도
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, delay: 1.0 + index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <achievement.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  {achievement.title}
                </h4>
                <blockquote className="text-gray-600 text-sm leading-relaxed italic mb-2">
                  "{achievement.description}"
                </blockquote>
                <cite className="text-xs text-blue-600 font-medium">
                  - {achievement.author}
                </cite>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 text-white">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              차별화된 교육 시스템을 직접 경험해보세요
            </h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              밸류인수학학원만의 체계적인 교육 과정과 전문적인 관리 시스템으로<br />
              우리 아이의 수학 실력을 한 단계 끌어올려보세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:shadow-lg transition-all duration-300"
              >
                무료 상담 신청
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-3 rounded-full font-semibold hover:bg-white/30 transition-all duration-300"
              >
                입학테스트 신청
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}