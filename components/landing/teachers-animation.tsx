'use client'

import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ReactNode } from 'react'

interface TeachersAnimationProps {
    children: ReactNode
    delay?: number
}

export function TeachersAnimation({ children, delay = 0 }: TeachersAnimationProps) {
    const [ref, inView] = useInView({
        triggerOnce: true,
        threshold: 0.1
    })

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay }}
        >
            {children}
        </motion.div>
    )
}
