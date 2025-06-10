'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight, 
  Phone, 
  Calendar, 
  MessageCircle,
  CheckCircle,
  Star,
  Clock,
  Users
} from 'lucide-react'

export function CTASection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  const ctaOptions = [
    {
      icon: Phone,
      title: "무료 상담 신청",
      description: "학습 상황 진단과 맞춤형 학습 계획을 상담받으세요",
      action: "상담 신청하기",
      color: "from-blue-500 to-blue-600",
      features: ["학습 현황 진단", "맞춤 학습 계획", "진로 상담"]
    },
    {
      icon: Calendar,
      title: "입학테스트 신청",
      description: "정확한 수준 측정으로 최적의 반 배정을 받으세요",
      action: "테스트 신청하기",
      color: "from-purple-500 to-purple-600",
      features: ["정확한 수준 측정", "최적 반 배정", "개별 피드백"]
    },
    {
      icon: MessageCircle,
      title: "카카오톡 상담",
      description: "간편하게 카카오톡으로 문의하고 답변받으세요",
      action: "카톡 문의하기",
      color: "from-green-500 to-green-600",
      features: ["실시간 답변", "편리한 소통", "빠른 응답"]
    }
  ]

  const benefits = [
    { icon: CheckCircle, text: "소수정예 맞춤형 수업" },
    { icon: Star, text: "15년 이상 전문 강사진" },
    { icon: Clock, text: "체계적인 학습 관리" },
    { icon: Users, text: "개별 클리닉 시스템" }
  ]

  const urgencyFactors = [
    "📚 새 학기 준비를 위한 선행 학습",
    "📊 중간고사, 기말고사 완벽 대비",
    "🎯 수능까지 체계적인 준비 과정",
    "💯 내신 등급 향상을 위한 전략적 학습"
  ]

  return (
    <div className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 메인 CTA 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-4 text-sm font-medium bg-white/80">
            GET STARTED
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            지금 시작하세요!<br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              우리 아이의 수학 실력 향상
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
            밸류인수학학원과 함께 체계적이고 전문적인 수학 교육으로<br />
            진정한 수학적 사고력과 문제해결 능력을 기르세요.
          </p>

          {/* 혜택 포인트 */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.text}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm"
              >
                <benefit.icon className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">{benefit.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA 옵션 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {ctaOptions.map((option, index) => (
            <motion.div
              key={option.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg group overflow-hidden">
                <div className={`bg-gradient-to-r ${option.color} p-6 text-white relative`}>
                  <div className="absolute top-0 right-0 w-20 h-20 opacity-20">
                    <option.icon className="w-full h-full" />
                  </div>
                  <div className="relative z-10">
                    <option.icon className="w-8 h-8 mb-3" />
                    <h3 className="text-xl font-bold mb-2">{option.title}</h3>
                    <p className="text-white/90 text-sm leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="space-y-3 mb-6">
                    {option.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    className="w-full group"
                    size="lg"
                  >
                    {option.action}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 긴급성 요소 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white rounded-3xl p-8 md:p-12 shadow-lg mb-16"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              놓치면 안 되는 <span className="text-blue-600">최적의 시기</span>
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              지금이 바로 우리 아이의 수학 실력을 한 단계 끌어올릴 수 있는 기회입니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {urgencyFactors.map((factor, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-4 text-center"
              >
                <p className="text-sm font-medium text-gray-700">{factor}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 최종 CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
            <CardContent className="relative p-8 md:p-12">
              <h3 className="text-3xl md:text-4xl font-bold mb-4">
                📞 02-457-4933
              </h3>
              <p className="text-xl text-blue-100 mb-6">
                지금 바로 전화주세요!
              </p>
              <p className="text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
                전문 상담사가 학생의 현재 수준을 정확히 진단하고,<br />
                가장 적합한 학습 방법을 제안해드립니다.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button 
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold group"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  지금 바로 전화하기
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 px-8 py-4 text-lg font-semibold"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  카카오톡 상담
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-100">
                <div>
                  <p className="font-semibold mb-1">📍 위치</p>
                  <p>서울시 광진구 아차산로 484, 6층 601호</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">🕒 상담시간</p>
                  <p>평일 15:00~22:00 | 토요일 10:00~16:00</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 추가 신뢰도 요소 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mt-12 text-center"
        >
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="text-gray-600 font-medium">학부모 만족도 98%</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="text-gray-600 font-medium">재원생 500명+</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-gray-600 font-medium">15년+ 교육 경력</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}