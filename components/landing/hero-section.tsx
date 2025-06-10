'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight, BookOpen, Users, Trophy, Star } from 'lucide-react'

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  
  const highlights = [
    { icon: BookOpen, text: "개념 중심 깊이 있는 학습", color: "text-blue-500" },
    { icon: Users, text: "소수정예 맞춤형 교육", color: "text-green-500" },
    { icon: Trophy, text: "매월 매쓰플랫 KMM 수상", color: "text-purple-500" },
    { icon: Star, text: "15년 이상 전문 강사진", color: "text-orange-500" }
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % highlights.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [highlights.length])

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          {/* Main Title */}
          <div className="space-y-4">
            <motion.h1 
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-white"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                밸류인
              </span>
              <br />
              <span className="text-white">수학학원</span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              개념에 대한 깊이 있는 이해와 논리적 서술 능력으로
              <br />
              <span className="font-semibold text-white">진정한 수학적 사고력</span>을 키워주는 광진구 수학전문학원
            </motion.p>
          </div>

          {/* Rotating Highlights */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center space-x-4 py-6"
          >
            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 border border-white/20">
              <motion.div
                key={currentSlide}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                {highlights[currentSlide].icon && React.createElement(highlights[currentSlide].icon, {
                  className: `w-6 h-6 ${highlights[currentSlide].color}`
                })}
              </motion.div>
              <motion.span
                key={`text-${currentSlide}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="text-white font-medium"
              >
                {highlights[currentSlide].text}
              </motion.span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button 
              size="lg" 
              className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              무료 상담 신청하기
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 px-8 py-4 text-lg font-semibold rounded-full transition-all duration-300"
            >
              입학테스트 신청
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white/70 hover:text-white text-sm underline"
              onClick={() => window.location.href = '/login'}
            >
              학원 관리시스템 로그인
            </Button>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="pt-8 text-blue-100"
          >
            <p className="text-lg font-medium mb-2">📞 02-457-4933</p>
            <p className="text-sm">서울시 광진구 아차산로 484, 6층 601호 (구의동) | 광나루역, 구의역 인근</p>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-1 h-3 bg-white/60 rounded-full mt-2"
          />
        </motion.div>
      </motion.div>
    </div>
  )
}