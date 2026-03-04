"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search } from "lucide-react"
import { useMeetings, useMeetingTopics } from "@/hooks/use-meetings"
import { MeetingsListCard } from "./meetings-list-card"
import { MeetingActionItemsList } from "./meeting-action-items-list"
import type { MeetingFilter } from "@/types/meeting"

export function MeetingsPageClient() {
  const router = useRouter()
  const [filter, setFilter] = useState<MeetingFilter>({})
  const [searchInput, setSearchInput] = useState("")
  const { meetings, isLoading } = useMeetings(filter)
  const { topics } = useMeetingTopics()

  const handleSearch = () => {
    setFilter((prev) => ({ ...prev, search: searchInput || undefined }))
  }

  const handleSelect = (id: string) => {
    router.push(`/meetings/${id}`)
  }

  return (
    <div className="space-y-4">
      {/* Layer 1: Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">회의 관리</h1>
        <p className="text-sm text-muted-foreground">
          Hedy AI 회의 녹음 및 내부 회의 관리
        </p>
      </div>

      {/* Layer 2: Tabs (underline style) */}
      <Tabs defaultValue="meetings">
        <TabsList className="h-auto bg-transparent p-0 border-b border-border rounded-none w-full justify-start">
          <TabsTrigger
            value="meetings"
            className="rounded-none border-b-2 border-transparent px-0 mr-6 pb-2 text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent"
          >
            회의 목록
          </TabsTrigger>
          <TabsTrigger
            value="action-items"
            className="rounded-none border-b-2 border-transparent px-0 mr-6 pb-2 text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none bg-transparent"
          >
            실행항목
          </TabsTrigger>
        </TabsList>

        {/* Layer 3: Search / Filter + Content */}
        <TabsContent value="meetings" className="space-y-4 mt-4">
          {/* Topic segment filter */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilter((prev) => ({ ...prev, topic_id: undefined }))}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !filter.topic_id
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              전체
            </button>
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setFilter((prev) => ({ ...prev, topic_id: topic.id }))}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter.topic_id === topic.id
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {topic.color && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: topic.color }}
                  />
                )}
                {topic.name}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="회의 제목 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              검색
            </Button>
          </div>

          <MeetingsListCard
            meetings={meetings}
            isLoading={isLoading}
            onSelect={handleSelect}
          />
        </TabsContent>

        <TabsContent value="action-items" className="mt-4">
          <MeetingActionItemsList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
