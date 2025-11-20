'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Quote } from 'lucide-react'
import Marquee from "@/components/ui/marquee"

const reviews = [
    {
        author: "학부모 (23.4.28)",
        content: "학생 개인의 성향 파악을 잘 하시고, 열정적으로 지도하십니다. 책상, 의자 컨디션도 편안하고 면학분위기 최고에요. 만족하고, 강추에요.",
        tags: ["맞춤지도", "면학분위기"]
    },
    {
        author: "학부모 (24.4.5)",
        content: "선생님들이 실력이 좋고 면학분위기가 좋습니다. 데스크 선생님들도 친절하십니다. 광장동에서는 최고의 고등전문 수학학원입니다",
        tags: ["열정적", "실력좋음", "소수정예"]
    },
    {
        author: "학부모 (24.5.9)",
        content: "수학을 잘 못했었는데, 이 학원다니고 성적이 많이 향상됬어요. 문제집 많이 풀고 오답풀이 꾸준히 시켜줘요. 시설도 완전 최곱니다.",
        tags: ["성적향상", "꼼꼼한관리", "최신시설"]
    },
    {
        author: "밸류인 재원생 고1",
        content: "밸류인 원장님 만나고 진짜 수학이라는 걸 하고 있구나 느꼈어요 그냥 마냥 푸는게 아니고, 진짜로 수학을 공부하고 있는 느낌?",
        tags: ["원장님직강", "개념학습"]
    },
    {
        author: "밸류인 재원생 고2",
        content: "원장님 설명이 엄청 간단하면서 좋은 아이디어가 많아서 수학 공부가 재밌어졌다.",
        tags: ["수학흥미", "명쾌한설명"]
    },
    {
        author: "학부모 (광진맘카페)",
        content: "중3부터 다니기 시작했는데 숙제까지 대부분 완료하고 오는 점이 좋았어요. 선생님이 돌아다니시면서 확인도 하고 가르쳐주시면서 관리를 철저히 하셔서 집에서 따로 신경 덜 쓰게 되었어요.",
        tags: ["철저한관리", "숙제완료"]
    }
]

export function ReviewsSection() {
    return (
        <section className="py-20 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <Badge variant="secondary" className="mb-4 text-sm font-medium">
                        REVIEWS
                    </Badge>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">생생한</span> 수강 후기
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
                        학생과 학부모님이 직접 경험하고 만족한<br />
                        밸류인수학학원의 실제 이야기입니다.
                    </p>
                </div>

                <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900 py-4 sm:py-20 md:py-20 xl:py-20">
                    <Marquee pauseOnHover className="[--duration:40s]">
                        {reviews.map((review, index) => (
                            <div key={index} className="mx-4 h-full w-[350px]">
                                <Card className="h-full border-none shadow-lg bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300">
                                    <CardContent className="p-8 flex flex-col h-full">
                                        <div className="mb-6">
                                            <Quote className="w-10 h-10 text-blue-100 dark:text-blue-900" />
                                        </div>

                                        <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed flex-grow line-clamp-4">
                                            "{review.content}"
                                        </p>

                                        <div className="mt-auto">
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {review.tags.map((tag) => (
                                                    <Badge key={tag} variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                        #{tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {review.author}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </Marquee>
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-gray-50 dark:from-gray-900"></div>
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-gray-50 dark:from-gray-900"></div>
                </div>
            </div>
        </section>
    )
}
