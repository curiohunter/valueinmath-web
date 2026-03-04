import type { MeetingAICategorizeResponse } from "@/types/meeting"

export async function categorizeMeetingRecap(
  meetingId: string,
  recap: string
): Promise<MeetingAICategorizeResponse> {
  const response = await fetch("/api/meetings/categorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meeting_id: meetingId, recap }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "AI 분류 요청에 실패했습니다.")
  }

  const result = await response.json()
  return result.data
}
