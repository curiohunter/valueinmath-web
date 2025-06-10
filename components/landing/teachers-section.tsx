'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, BookOpen, Lightbulb, Award, Users, Star } from 'lucide-react'

export function TeachersSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  const teachers = [
    {
      name: "박석돈",
      position: "원장",
      division: "고등관",
      experience: "15년 이상",
      subjects: ["공통수학1", "공통수학2", "수학Ⅰ", "수학Ⅱ", "미적분"],
      philosophy: "왜(Why)를 아는 수학 학습을 강조하며, 개념의 근원적 이해와 간결한 풀이를 중시합니다.",
      background: "밸류인 대치동 학원 원장 출신",
      icon: GraduationCap,
      color: "from-blue-500 to-indigo-600"
    },
    {
      name: "이한결",
      position: "선생님",
      division: "고등관",
      experience: "고등 수학 전문가",
      subjects: ["수학Ⅰ", "수학Ⅱ", "미적분", "확률과 통계"],
      philosophy: "내신 및 수능 대비 전략 수립을 통한 체계적인 학습 지도",
      background: "고등 수학 교육 전문가",
      icon: Award,
      color: "from-green-500 to-emerald-600"
    },
    {
      name: "김형찬",
      position: "선생님",
      division: "고등관",
      experience: "개념 강의 특화",
      subjects: ["고1 수학"],
      philosophy: "개념 강의와 문제 해결력 향상에 특화된 지도법으로 탄탄한 기초 완성",
      background: "고1 수학 전문 강사",
      icon: BookOpen,
      color: "from-purple-500 to-pink-600"
    },
    {
      name: "이명지",
      position: "선생님",
      division: "중등관",
      experience: "중등 수학 전문가",
      subjects: ["중학 수학 전 과정"],
      philosophy: "중등 수학의 체계적 학습과 고등 연계 학습을 통한 단계적 실력 향상",
      background: "중등관 수업 총괄",
      icon: Users,
      color: "from-orange-500 to-red-600"
    },
    {
      name: "신승희",
      position: "선생님",
      division: "영재관",
      experience: "창의적 문제해결 전문가",
      subjects: ["기하", "대수"],
      philosophy: "창의적 문제 해결력 지도를 통한 영재성 발굴 및 계발",
      background: "창의적 문제 해결력 지도 전문가",
      icon: Lightbulb,
      color: "from-pink-500 to-rose-600"
    },
    {
      name: "신현주",
      position: "선생님",
      division: "영재관",
      experience: "초-중등 수학 전문가",
      subjects: ["기하", "중2-1 심화"],
      philosophy: "개별 진도 과정을 통한 수준별 맞춤 교육으로 기초부터 심화까지",
      background: "개별 진도 과정 총괄",
      icon: Star,
      color: "from-indigo-500 to-purple-600"
    }
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
            TEACHERS
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">전문 강사진</span> 소개
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            수학 교육에 열정을 가진 전문 강사진이 학생들의<br />
            수학적 성장과 사고력 발달을 이끌고 있습니다.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher, index) => (
            <motion.div
              key={teacher.name}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg group">
                <div className={`bg-gradient-to-r ${teacher.color} p-6 text-white relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-20 h-20 opacity-20">
                    <teacher.icon className="w-full h-full" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-2">
                      <teacher.icon className="w-6 h-6" />
                      <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                        {teacher.division}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-bold mb-1">{teacher.name} {teacher.position}</h3>
                    <p className="text-white/80 text-sm">{teacher.experience}</p>
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  {/* 담당 과목 */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm">담당 과목</h4>
                    <div className="flex flex-wrap gap-1">
                      {teacher.subjects.map((subject) => (
                        <Badge key={subject} variant="outline" className="text-xs py-0.5 px-2">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* 교육 철학 */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm">교육 철학</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {teacher.philosophy}
                    </p>
                  </div>

                  {/* 경력 */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm">주요 이력</h4>
                    <p className="text-gray-600 text-sm">
                      {teacher.background}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 강사진 특징 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8 md:p-12"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              밸류인 강사진의 <span className="text-blue-600">특징</span>
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">탄탄한 전문성</h4>
              <p className="text-gray-600 text-sm">
                15년 이상의 교육 경력과 대치동 학원 출신의 전문성
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">책임감 있는 관리</h4>
              <p className="text-gray-600 text-sm">
                학생 개개인의 특성과 성향을 세심하게 파악하여 맞춤형 지도
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <Star className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">지속적인 연구</h4>
              <p className="text-gray-600 text-sm">
                최신 교육 트렌드와 출제 경향을 연구하여 최상의 교육 제공
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}