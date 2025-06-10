'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Train,
  Car,
  School,
  Navigation
} from 'lucide-react'

export function LocationSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  const contactInfo = [
    {
      icon: Phone,
      title: "전화번호",
      content: "02-457-4933",
      description: "상담 및 문의",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: Mail,
      title: "이메일",
      content: "ian_park@valueinmath.com",
      description: "학원 대표 메일",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: Clock,
      title: "운영시간",
      content: "평일 15:00~22:00",
      description: "토요일 10:00~16:00",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ]

  const transportInfo = [
    {
      icon: Train,
      title: "지하철",
      content: "광나루역, 구의역 인근",
      description: "5호선 이용 가능"
    },
    {
      icon: Car,
      title: "자가용",
      content: "건물 내 주차장 이용",
      description: "주차 공간 제한적"
    }
  ]

  const nearbySchools = [
    { category: "고등학교", schools: ["광남고", "가람고", "건대부고"] },
    { category: "중학교", schools: ["광남중", "구의중", "양진중", "건대부중", "동대부여중"] },
    { category: "초등학교", schools: ["양진초", "구남초", "구의초", "광남초", "광장초", "경복초"] }
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
            LOCATION & CONTACT
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">오시는 길</span> 및 연락처
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            광진구 중심지에서 접근성이 뛰어난 위치에 자리잡고 있으며<br />
            언제든지 편리하게 상담받으실 수 있습니다.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* 지도 영역 */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="h-full shadow-lg border-0">
              <CardContent className="p-0">
                <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                  {/* 임시 지도 플레이스홀더 - 실제로는 Google Maps나 Naver Maps 임베드 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100">
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">밸류인수학학원</h3>
                        <p className="text-gray-600 text-sm mb-4">
                          서울시 광진구 아차산로 484<br />
                          6층 601호 (구의동)
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-white/80 backdrop-blur-sm"
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          길찾기
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* 실제 지도 임베드는 여기에 */}
                  {/* 
                  <iframe
                    src="Google Maps 또는 Naver Maps 임베드 URL"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  */}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 연락처 정보 */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {/* 기본 연락처 */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">연락처 정보</h3>
              {contactInfo.map((info, index) => (
                <motion.div
                  key={info.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="shadow-md border-0 hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl ${info.bgColor} flex items-center justify-center`}>
                          <info.icon className={`w-6 h-6 ${info.color}`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{info.title}</h4>
                          <p className="text-lg font-bold text-gray-800">{info.content}</p>
                          <p className="text-sm text-gray-600">{info.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* 교통 정보 */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">교통 안내</h3>
              {transportInfo.map((transport, index) => (
                <motion.div
                  key={transport.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <transport.icon className="w-5 h-5 text-gray-600" />
                  <div>
                    <span className="font-medium text-gray-900">{transport.content}</span>
                    <p className="text-sm text-gray-600">{transport.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* 인근 학교 정보 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-3xl p-8 md:p-12"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <School className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              인근 <span className="text-blue-600">주요 학교</span>
            </h3>
            <p className="text-gray-600">
              밸류인수학학원과 가까운 주요 학교들로 통학이 편리합니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {nearbySchools.map((category, index) => (
              <motion.div
                key={category.category}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                className="text-center"
              >
                <Card className="bg-white border-0 shadow-md">
                  <CardContent className="p-6">
                    <h4 className="font-bold text-gray-900 mb-4 text-lg">
                      {category.category}
                    </h4>
                    <div className="space-y-2">
                      {category.schools.map((school) => (
                        <Badge 
                          key={school} 
                          variant="secondary" 
                          className="mx-1 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        >
                          {school}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 상담 안내 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mt-16 text-center"
        >
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white">
            <CardContent className="p-8 md:p-12">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                언제든지 편리하게 상담받으세요
              </h3>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                전화 상담, 방문 상담 모두 가능하며<br />
                학생의 수준 진단부터 맞춤 학습 계획까지 상세히 안내해드립니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 font-semibold"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  전화 상담 신청
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 px-8 py-3 font-semibold"
                >
                  <MapPin className="w-5 h-5 mr-2" />
                  방문 상담 신청
                </Button>
              </div>
              
              <div className="mt-8 text-center">
                <p className="text-blue-100 text-sm">
                  🕒 상담 시간: 평일 15:00~22:00, 토요일 10:00~16:00
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}