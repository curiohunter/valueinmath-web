'use client'

import { motion } from 'framer-motion'
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock,
  Instagram,
  Globe,
  Youtube,
  MessageCircle
} from 'lucide-react'

export function Footer() {
  const contactInfo = [
    {
      icon: MapPin,
      title: "주소",
      content: "서울시 광진구 아차산로 484, 6층 601호 (구의동)"
    },
    {
      icon: Phone,
      title: "전화",
      content: "02-457-4933"
    },
    {
      icon: Mail,
      title: "이메일",
      content: "ian_park@valueinmath.com"
    },
    {
      icon: Clock,
      title: "운영시간",
      content: "평일 15:00~22:00, 토요일 10:00~16:00"
    }
  ]

  const quickLinks = [
    { name: "학원 소개", href: "#about" },
    { name: "교육과정", href: "#programs" },
    { name: "강사진", href: "#teachers" },
    { name: "특징", href: "#features" },
    { name: "오시는 길", href: "#location" }
  ]

  const programs = [
    { name: "고등관", description: "수능 및 내신 대비" },
    { name: "중등관", description: "기초 실력 완성" },
    { name: "영재관", description: "창의적 사고력 개발" }
  ]

  const socialLinks = [
    {
      icon: Instagram,
      name: "인스타그램",
      href: "https://instagram.com/valueinmath",
      handle: "@valueinmath"
    },
    {
      icon: Globe,
      name: "네이버 블로그",
      href: "https://blog.naver.com/valueinmath2",
      handle: "블로그"
    },
    {
      icon: Youtube,
      name: "유튜브",
      href: "#",
      handle: "준비중"
    },
    {
      icon: MessageCircle,
      name: "카카오톡",
      href: "#",
      handle: "밸류인수학학원"
    }
  ]

  const nearbySchools = [
    "광남고", "가람고", "건대부고", 
    "광남중", "구의중", "양진중", "건대부중", "동대부여중",
    "양진초", "구남초", "구의초", "광남초", "광장초", "경복초"
  ]

  return (
    <section className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="lg:col-span-2"
            >
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                밸류인수학학원
              </h3>
              <p className="text-gray-300 mb-6 leading-relaxed">
                수학의 가치를 믿는, 가치 있는 사람들이 모이는 곳<br />
                개념 중심의 깊이 있는 학습과 논리적 서술 능력으로<br />
                진정한 수학적 사고력을 키우는 광진구 수학전문학원입니다.
              </p>
              
              <div className="space-y-3">
                {contactInfo.map((info, index) => {
                  const IconComponent = info.icon
                  return (
                    <motion.div
                      key={info.title}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-start space-x-3"
                    >
                      <IconComponent className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-gray-400 text-sm">{info.title}</span>
                        <p className="text-white font-medium">{info.content}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h4 className="text-lg font-semibold mb-6">빠른 링크</h4>
              <ul className="space-y-3">
                {quickLinks.map((link, index) => (
                  <motion.li
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <a 
                      href={link.href} 
                      className="text-gray-300 hover:text-blue-400 transition-colors duration-300 flex items-center group"
                    >
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {link.name}
                    </a>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-8">
                <h5 className="font-semibold mb-4 text-white">교육과정</h5>
                <div className="space-y-2">
                  {programs.map((program, index) => (
                    <motion.div
                      key={program.name}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                      viewport={{ once: true }}
                      className="text-sm"
                    >
                      <span className="text-blue-400 font-medium">{program.name}</span>
                      <p className="text-gray-400">{program.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <h4 className="text-lg font-semibold mb-6">소셜 미디어</h4>
              <div className="space-y-3 mb-8">
                {socialLinks.map((social, index) => {
                  const IconComponent = social.icon
                  return (
                    <motion.a
                      key={social.name}
                      href={social.href}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center space-x-3 text-gray-300 hover:text-blue-400 transition-colors duration-300 group"
                    >
                      <IconComponent className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                      <div>
                        <p className="font-medium">{social.name}</p>
                        <p className="text-sm text-gray-400">{social.handle}</p>
                      </div>
                    </motion.a>
                  )
                })}
              </div>

              <div>
                <h5 className="font-semibold mb-4 text-white">인근 주요 학교</h5>
                <div className="flex flex-wrap gap-2">
                  {nearbySchools.map((school, index) => (
                    <motion.span
                      key={school}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.8 + index * 0.05 }}
                      viewport={{ once: true }}
                      className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-md hover:bg-gray-700 transition-colors duration-300"
                    >
                      {school}
                    </motion.span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="border-t border-gray-800" />

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="py-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm">
              <p>&copy; 2025 밸류인수학학원. All rights reserved.</p>
              <p className="mt-1">
                사업자등록번호: [등록번호] | 대표자: 박석돈 | 학원등록번호: [등록번호]
              </p>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-blue-400 transition-colors duration-300">
                개인정보처리방침
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors duration-300">
                이용약관
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors duration-300">
                학원 소개서
              </a>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-8 p-6 bg-gray-800 rounded-2xl"
          >
            <h5 className="text-white font-semibold mb-3">📞 상담 및 등록 안내</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                <p className="font-medium text-blue-400 mb-1">상담 시간</p>
                <p>평일: 오후 3시 ~ 오후 10시</p>
                <p>토요일: 오전 10시 ~ 오후 4시</p>
                <p className="text-gray-400 mt-1">일요일 및 공휴일 휴무</p>
              </div>
              <div>
                <p className="font-medium text-blue-400 mb-1">등록 절차</p>
                <p>1. 전화 또는 방문 상담</p>
                <p>2. 수준 진단 테스트</p>
                <p>3. 맞춤 반 배정 및 등록</p>
                <p className="text-blue-400 mt-1">📍 모든 상담은 사전 예약제로 운영됩니다</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}