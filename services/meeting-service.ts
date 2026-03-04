import { createClient } from "@/lib/supabase/client"
import type {
  Meeting,
  MeetingTopic,
  MeetingWithDetails,
  MeetingFilter,
  MeetingFormData,
  MeetingItem,
  MeetingItemFormData,
  MeetingActionItem,
  MeetingActionItemFormData,
  MeetingParticipant,
  MeetingParticipantFormData,
  ActionItemStatus,
  ActionItemAssignee,
} from "@/types/meeting"

// --- Meeting Topics ---

export async function getMeetingTopics(): Promise<MeetingTopic[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("meeting_topics")
    .select("*")
    .order("name")
  if (error) throw error
  return data || []
}

// --- Meetings ---

export async function getMeetings(
  filter?: MeetingFilter
): Promise<Meeting[]> {
  const supabase = createClient()

  let query = supabase
    .from("meetings")
    .select("*, topic:meeting_topics(*)")

  if (filter?.status) {
    query = query.eq("status", filter.status)
  }
  if (filter?.topic_id) {
    query = query.eq("topic_id", filter.topic_id)
  }
  if (filter?.date_from) {
    query = query.gte("meeting_date", filter.date_from)
  }
  if (filter?.date_to) {
    query = query.lte("meeting_date", filter.date_to)
  }
  if (filter?.search) {
    query = query.ilike("title", `%${filter.search}%`)
  }

  const { data, error } = await query.order("meeting_date", {
    ascending: false,
  })

  if (error) throw error
  return data || []
}

export async function getMeetingById(
  id: string
): Promise<MeetingWithDetails> {
  const supabase = createClient()

  const [meetingRes, participantsRes, itemsRes, actionItemsRes, highlightsRes] =
    await Promise.all([
      supabase.from("meetings").select("*, topic:meeting_topics(*)").eq("id", id).single(),
      supabase
        .from("meeting_participants")
        .select("*")
        .eq("meeting_id", id)
        .order("created_at"),
      supabase
        .from("meeting_items")
        .select("*")
        .eq("meeting_id", id)
        .order("sort_order"),
      supabase
        .from("meeting_action_items")
        .select("*, assignees:meeting_action_item_assignees(*)")
        .eq("meeting_id", id)
        .order("sort_order"),
      supabase
        .from("meeting_highlights")
        .select("*")
        .eq("meeting_id", id)
        .order("time_index_ms"),
    ])

  if (meetingRes.error) throw meetingRes.error

  return {
    ...meetingRes.data,
    participants: participantsRes.data || [],
    items: itemsRes.data || [],
    action_items: actionItemsRes.data || [],
    highlights: highlightsRes.data || [],
  }
}

export async function createMeeting(
  data: MeetingFormData,
  createdBy?: string
): Promise<Meeting> {
  const supabase = createClient()

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      ...data,
      created_by: createdBy || null,
    })
    .select()
    .single()

  if (error) throw error
  return meeting
}

export async function updateMeeting(
  id: string,
  data: Partial<MeetingFormData & { recap: string; conversations: string; transcript: string; meeting_minutes: string }>
): Promise<Meeting> {
  const supabase = createClient()

  const { data: meeting, error } = await supabase
    .from("meetings")
    .update(data)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return meeting
}

export async function deleteMeeting(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("meetings").delete().eq("id", id)
  if (error) throw error
}

// --- All Action Items (cross-meeting) ---

export interface ActionItemWithMeeting extends MeetingActionItem {
  meeting_title: string
  meeting_date: string
}

export interface ActionItemFilter {
  assignee_id?: string
  status?: ActionItemStatus
  meeting_id?: string
  exclude_completed?: boolean
}

export async function getAllActionItems(
  filter?: ActionItemFilter
): Promise<ActionItemWithMeeting[]> {
  const supabase = createClient()

  let query = supabase
    .from("meeting_action_items")
    .select("*, assignees:meeting_action_item_assignees(*), meeting:meetings!inner(title, meeting_date)")
    .order("sort_order")
    .limit(100)

  if (filter?.status) {
    query = query.eq("status", filter.status)
  }
  if (filter?.meeting_id) {
    query = query.eq("meeting_id", filter.meeting_id)
  }
  if (filter?.exclude_completed) {
    query = query.not("status", "eq", "completed")
  }

  const { data, error } = await query

  if (error) throw error

  let items = (data || []).map((item: any) => ({
    ...item,
    meeting_title: item.meeting?.title || "",
    meeting_date: item.meeting?.meeting_date || "",
    meeting: undefined,
  }))

  // Client-side assignee filter (Supabase nested filter on inner join isn't reliable)
  if (filter?.assignee_id) {
    items = items.filter((item: ActionItemWithMeeting) =>
      item.assignees.some((a: ActionItemAssignee) => a.employee_id === filter.assignee_id)
    )
  }

  return items
}

// --- Meeting Items ---

export async function addMeetingItem(
  meetingId: string,
  data: MeetingItemFormData,
  createdBy?: string
): Promise<MeetingItem> {
  const supabase = createClient()

  const { data: item, error } = await supabase
    .from("meeting_items")
    .insert({
      meeting_id: meetingId,
      ...data,
      created_by: createdBy || null,
    })
    .select()
    .single()

  if (error) throw error
  return item
}

export async function updateMeetingItem(
  id: string,
  data: Partial<MeetingItemFormData>
): Promise<MeetingItem> {
  const supabase = createClient()

  const { data: item, error } = await supabase
    .from("meeting_items")
    .update(data)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return item
}

export async function deleteMeetingItem(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("meeting_items").delete().eq("id", id)
  if (error) throw error
}

export async function bulkAddMeetingItems(
  meetingId: string,
  items: MeetingItemFormData[],
  createdBy?: string
): Promise<MeetingItem[]> {
  const supabase = createClient()

  const rows = items.map((item, index) => ({
    meeting_id: meetingId,
    ...item,
    sort_order: item.sort_order ?? index,
    created_by: createdBy || null,
  }))

  const { data, error } = await supabase
    .from("meeting_items")
    .insert(rows)
    .select()

  if (error) throw error
  return data || []
}

// --- Meeting Action Items ---

export async function addMeetingActionItem(
  meetingId: string,
  data: MeetingActionItemFormData,
  createdBy?: string
): Promise<MeetingActionItem> {
  const supabase = createClient()

  const { assignee_ids, ...rest } = data

  const { data: item, error } = await supabase
    .from("meeting_action_items")
    .insert({
      meeting_id: meetingId,
      ...rest,
      created_by: createdBy || null,
    })
    .select()
    .single()

  if (error) throw error

  // 담당자 배정
  if (assignee_ids && assignee_ids.length > 0) {
    await setActionItemAssignees(item.id, assignee_ids)
  }

  return { ...item, assignees: [] }
}

export async function updateMeetingActionItem(
  id: string,
  data: Partial<Omit<MeetingActionItemFormData, "assignee_ids">> & { status?: ActionItemStatus }
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("meeting_action_items")
    .update(data)
    .eq("id", id)

  if (error) throw error
}

// --- Action Item Assignees (다중 담당자) ---

export async function setActionItemAssignees(
  actionItemId: string,
  employeeIds: string[]
): Promise<void> {
  const supabase = createClient()

  // 기존 담당자 조회
  const { data: existing } = await supabase
    .from("meeting_action_item_assignees")
    .select("employee_id")
    .eq("action_item_id", actionItemId)

  const existingIds = new Set((existing || []).map((e) => e.employee_id))
  const newIds = new Set(employeeIds)

  // 제거할 담당자
  const toRemove = [...existingIds].filter((id) => !newIds.has(id))
  // 추가할 담당자
  const toAdd = [...newIds].filter((id) => !existingIds.has(id))

  const promises: Promise<unknown>[] = []

  if (toRemove.length > 0) {
    promises.push(
      supabase
        .from("meeting_action_item_assignees")
        .delete()
        .eq("action_item_id", actionItemId)
        .in("employee_id", toRemove)
    )
  }

  if (toAdd.length > 0) {
    // 직원 이름 스냅샷 조회
    const { data: employees } = await supabase
      .from("employees")
      .select("id, name")
      .in("id", toAdd)

    const nameMap = new Map((employees || []).map((e) => [e.id, e.name]))

    promises.push(
      supabase
        .from("meeting_action_item_assignees")
        .insert(
          toAdd.map((empId) => ({
            action_item_id: actionItemId,
            employee_id: empId,
            employee_name_snapshot: nameMap.get(empId) || null,
          }))
        )
    )
  }

  await Promise.all(promises)
}

export async function toggleActionItemStatus(
  id: string,
  currentStatus: ActionItemStatus
): Promise<MeetingActionItem> {
  const supabase = createClient()

  const newStatus: ActionItemStatus =
    currentStatus === "completed" ? "pending" : "completed"
  const completedAt =
    newStatus === "completed" ? new Date().toISOString() : null

  const { data: item, error } = await supabase
    .from("meeting_action_items")
    .update({ status: newStatus, completed_at: completedAt })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return item
}

export async function deleteMeetingActionItem(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("meeting_action_items")
    .delete()
    .eq("id", id)
  if (error) throw error
}

// --- Meeting Participants ---

export async function addMeetingParticipant(
  meetingId: string,
  data: MeetingParticipantFormData
): Promise<MeetingParticipant> {
  const supabase = createClient()

  const { data: participant, error } = await supabase
    .from("meeting_participants")
    .insert({
      meeting_id: meetingId,
      ...data,
    })
    .select()
    .single()

  if (error) throw error
  return participant
}

export async function deleteMeetingParticipant(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("meeting_participants")
    .delete()
    .eq("id", id)
  if (error) throw error
}
