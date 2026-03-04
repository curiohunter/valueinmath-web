"use client"

import useSWR from "swr"
import { getMeetings, getMeetingById, getMeetingTopics } from "@/services/meeting-service"
import type { MeetingFilter } from "@/types/meeting"

export function useMeetings(filter?: MeetingFilter) {
  const { data, error, isLoading, mutate } = useSWR(
    ["meetings", filter],
    () => getMeetings(filter),
    { revalidateOnFocus: false }
  )

  return {
    meetings: data || [],
    isLoading,
    error,
    mutate,
  }
}

export function useMeetingTopics() {
  const { data, isLoading } = useSWR("meeting-topics", getMeetingTopics, {
    revalidateOnFocus: false,
  })
  return { topics: data || [], isLoading }
}

export function useMeetingDetail(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ["meeting-detail", id] : null,
    () => (id ? getMeetingById(id) : null),
    { revalidateOnFocus: false }
  )

  return {
    meeting: data || null,
    isLoading,
    error,
    mutate,
  }
}
