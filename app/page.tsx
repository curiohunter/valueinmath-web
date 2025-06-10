import { Metadata } from 'next'
import { HeroSection } from '@/components/landing/hero-section'
import { AboutSection } from '@/components/landing/about-section'
import { ProgramsSection } from '@/components/landing/programs-section'
import { TeachersSection } from '@/components/landing/teachers-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { LocationSection } from '@/components/landing/location-section'
import { CTASection } from '@/components/landing/cta-section'
import { Footer } from '@/components/landing/footer'

export const metadata: Metadata = {
  title: '밸류인수학학원 | 광진구 수학전문학원 | 고등관·중등관·영재관',
  description: '광진구 구의동 위치한 수학전문학원. 개념 중심의 깊이 있는 학습과 논리적 서술능력 배양으로 진정한 수학적 사고력을 키워드립니다. 소수정예 맞춤형 교육.',
  keywords: '광진구 수학학원, 구의동 수학학원, 광나루역 수학학원, 수학전문학원, 고등수학, 중등수학, 영재수학, 밸류인수학',
  authors: [{ name: '밸류인수학학원' }],
  creator: '밸류인수학학원',
  publisher: '밸류인수학학원',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://valueinmath.com',
    title: '밸류인수학학원 | 광진구 수학전문학원',
    description: '개념 중심의 깊이 있는 수학교육으로 진정한 수학적 사고력을 키우는 광진구 수학전문학원',
    siteName: '밸류인수학학원',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '밸류인수학학원 로고'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: '밸류인수학학원 | 광진구 수학전문학원',
    description: '개념 중심의 깊이 있는 수학교육으로 진정한 수학적 사고력을 키우는 광진구 수학전문학원',
    images: ['/og-image.jpg']
  },
  verification: {
    google: 'your-google-verification-code',
    other: {
      'naver-site-verification': 'your-naver-verification-code'
    }
  }
}

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": "밸류인수학학원",
            "alternateName": "ValueIn Math Academy",
            "description": "광진구 구의동 위치한 수학전문학원. 고등관·중등관·영재관 운영",
            "url": "https://valueinmath.com",
            "telephone": "02-457-4933",
            "email": "ian_park@valueinmath.com",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "서울시 광진구 아차산로 484, 6층 601호",
              "addressLocality": "광진구",
              "addressRegion": "서울시",
              "addressCountry": "KR"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": "37.5394",
              "longitude": "127.0941"
            },
            "founder": {
              "@type": "Person",
              "name": "박석돈"
            },
            "serviceArea": {
              "@type": "Place",
              "name": "광진구, 성동구, 중랑구"
            }
          })
        }}
      />
      
      <HeroSection />
      <AboutSection />
      <ProgramsSection />
      <TeachersSection />
      <FeaturesSection />
      <LocationSection />
      <CTASection />
      <Footer />
    </main>
  )
}