import { getPublicTeachers } from '@/actions/landing'
import { Badge } from '@/components/ui/badge'
import { Award, Users, Star } from 'lucide-react'
import { TeachersAnimation } from './teachers-animation'
import { TeacherCard } from './teacher-card'
import Marquee from "@/components/ui/marquee"

export async function TeachersSection() {
  const teachers = await getPublicTeachers()

  return (
    <div className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TeachersAnimation>
          <div className="text-center mb-16">
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
          </div>
        </TeachersAnimation>

        <div className="relative">
          {teachers.length > 0 ? (
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-background py-4 sm:py-20 md:py-20 xl:py-20">
              <Marquee pauseOnHover className="[--duration:40s]">
                {teachers.map((teacher, index) => (
                  <div key={teacher.id} className="mx-4 w-[300px]">
                    <TeacherCard teacher={teacher} index={index} />
                  </div>
                ))}
              </Marquee>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white dark:from-background"></div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white dark:from-background"></div>
            </div>
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              등록된 강사 정보가 없습니다.
            </div>
          )}
        </div>

        {/* 강사진 특징 */}
        <TeachersAnimation delay={0.8}>
          <div className="mt-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8 md:p-12">
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
          </div>
        </TeachersAnimation>
      </div>
    </div>
  )
}