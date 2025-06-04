"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import ReactMarkdown from 'react-markdown'
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from '@/types/database'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Check, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const supabase = createClientComponentClient<Database>()

const PROVIDERS = [
  { key: "n8n", label: "n8n" },
]

// 예시 챗봇 목록(실제 사용시 DB 또는 props로 관리 가능)
const dummyBots = [
  { id: "1", name: "teddy_test1", webhookUrl: process.env.NEXT_PUBLIC_N8N_CHAT_URL || "" },
  // 필요시 추가
]

export default function MultiChat({ openNewApp, setOpenNewApp, user, singleAgentName }: { openNewApp?: boolean, setOpenNewApp?: (v: boolean) => void, user: any, singleAgentName?: string }) {
  // const session = useSession();
  // const user = session?.user;
  const [bots, setBots] = useState(dummyBots)
  const [selectedBot, setSelectedBot] = useState(dummyBots[0])
  const [chats, setChats] = useState<any[]>([])
  const [selectedChat, setSelectedChat] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  // 새 앱 연결 모달 상태
  const modalOpen = openNewApp !== undefined ? openNewApp : false
  const setModalOpen = setOpenNewApp || (() => {})
  const [provider, setProvider] = useState("n8n")
  const [chatUrl, setChatUrl] = useState("")
  const [authType, setAuthType] = useState("none")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // agents(앱) 목록을 Supabase에서 불러오기 (모든 사용자 조회)
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null)
  const [agentName, setAgentName] = useState("")
  const [editAgentId, setEditAgentId] = useState<string | null>(null)
  const [editAgentName, setEditAgentName] = useState("")
  const [editChatId, setEditChatId] = useState<string | null>(null)
  const [editChatName, setEditChatName] = useState("")

  // singleAgentName이 있으면 해당 이름의 agent만 사용
  const filteredAgents = singleAgentName
    ? agents.filter(a => a.name === singleAgentName)
    : agents;
  const agent = filteredAgents[0];

  // chats도 agent 기준으로 필터링
  const filteredChats = agent ? chats.filter(c => c.agent_id === agent.id) : [];
  const chat = filteredChats[0];

  // 메시지 전송
  const sendMessage = async () => {
    if (!input.trim() || !selectedChat || !user) return
    setLoading(true)
    // 메시지 DB 저장
    const { data: msgData } = await supabase.from('messages').insert([
      {
        chat_id: selectedChat.id,
        user_id: user.id,
        role: 'user',
        content: input,
      }
    ]).select()
    if (msgData && msgData.length > 0) {
      setMessages(prev => [...prev, msgData[0]])
    }
    // n8n Webhook 호출 (선택된 agent의 webhook_url 사용)
    let url = selectedAgent.webhook_url
    if (url.startsWith("https://n8n.valueinmath.com/")) {
      url = "/api/n8n/" + url.replace("https://n8n.valueinmath.com/", "")
    }
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      })
      const data = await res.json()
      
      let aiContent = ""
      if (data.reply) {
        aiContent = data.reply
      } else if (data.output) {
        aiContent = data.output
      } else {
        aiContent = JSON.stringify(data)
      }

      // AI 메시지 DB에 저장 후 즉시 UI 업데이트
      const { data: aiMsgData } = await supabase.from('messages').insert([
        {
          chat_id: selectedChat.id,
          user_id: null, // AI 메시지는 user_id 없이
          role: 'ai',
          content: aiContent,
        }
      ]).select()

      if (aiMsgData && aiMsgData.length > 0) {
        setMessages(prev => [...prev, aiMsgData[0]])
      }
    } catch (e) {
      // 에러 메시지도 DB에 저장하고 UI 업데이트
      const errorMsg = { 
        chat_id: selectedChat.id,
        user_id: null,
        role: "ai", 
        content: "오류가 발생했습니다." 
      }
      const { data: errorMsgData } = await supabase.from('messages').insert([errorMsg]).select()
      if (errorMsgData && errorMsgData.length > 0) {
        setMessages(prev => [...prev, errorMsgData[0]])
      } else {
        setMessages(prev => [...prev, errorMsg])
      }
    }
    setInput("")
    setLoading(false)
  }

  // singleAgentName이 있으면 UI(연결 버튼/모달, 리스트, 탭 등) 모두 숨기고 채팅창만 렌더링
  if (singleAgentName) {
    return (
      <div className="h-full flex flex-col">
        {/* agent가 없으면 안내 메시지 */}
        {!agent ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">"{singleAgentName}" agent가 없습니다.</div>
        ) : (
          <div className="flex-1 flex flex-col bg-slate-50 min-h-0">
            {/* 채팅 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              {messages.map((m, i) => (
                <div
                  key={m.id || i}
                  className={`flex items-start space-x-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "ai" && (
                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm font-medium">AI</span>
                    </div>
                  )}
                  <div className={`max-w-[75%] ${m.role === "user" ? "order-2" : ""}`}>
                    <div className={`text-xs text-slate-500 mb-1 ${m.role === "user" ? "text-right" : ""}`}>
                      {m.role === "user" ? (user.email || "나") : agent?.name || "AI"}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 break-words shadow-sm ${
                        m.role === "user"
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-white text-slate-700 border border-slate-200 rounded-bl-md"
                      }`}
                    >
                      <div className="text-sm leading-relaxed">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                  {m.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1 order-3">
                      <span className="text-white text-sm font-medium">
                        {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-start space-x-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-medium">AI</span>
                  </div>
                  <div className="max-w-[75%]">
                    <div className="text-xs text-slate-500 mb-1">{agent?.name || "AI"}</div>
                    <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-slate-200">
                      <div className="text-sm text-slate-600">답변을 생성하고 있습니다...</div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {/* 입력창 */}
            <div className="border-t border-slate-200 bg-white p-4 shrink-0">
              <div className="flex items-end space-x-3 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    className="min-h-[48px] resize-none border-2 border-slate-200 focus:border-blue-400 rounded-2xl px-4 py-3 transition-colors"
                    disabled={loading}
                    placeholder="메시지를 입력하세요..."
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="h-12 px-6 bg-blue-500 hover:bg-blue-600 rounded-2xl transition-all duration-200 shadow-sm"
                >
                  전송
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // agents 전체 조회
  useEffect(() => {
    supabase.from('agents').select('*').then(({ data }) => {
      setAgents(data || [])
      if (data && data.length > 0) setSelectedAgent(data[0])
    })
  }, [])

  // chats: 선택된 agent, 로그인 user 기준 조회 + 실시간 동기화
  useEffect(() => {
    if (!selectedAgent || !user) return;
    const fetchChats = () => {
      supabase.from('chats').select('*').eq('agent_id', selectedAgent.id).eq('user_id', user.id).then(({ data }) => {
        setChats(data || [])
        if (data && data.length > 0) setSelectedChat(data[0])
      })
    }
    fetchChats()
    // 실시간 구독 (채널 이름을 고유하게 변경)
    const sub = supabase.channel(`chats-${selectedAgent.id}-${Date.now()}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chats', 
        filter: `agent_id=eq.${selectedAgent.id}` 
      }, (payload) => {
        console.log('Realtime chat update:', payload)
        fetchChats()
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [selectedAgent, user])

  // messages: 선택된 chat 기준 조회 + 실시간 동기화
  useEffect(() => {
    if (!selectedChat) return;
    const fetchMessages = () => {
      supabase.from('messages').select('*').eq('chat_id', selectedChat.id).order('created_at', { ascending: true }).then(({ data }) => {
        setMessages(data || [])
      })
    }
    fetchMessages()
    // 실시간 구독 (채널 이름을 고유하게 변경)
    const sub = supabase.channel(`messages-${selectedChat.id}-${Date.now()}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages', 
        filter: `chat_id=eq.${selectedChat.id}` 
      }, (payload) => {
        console.log('Realtime message update:', payload)
        fetchMessages()
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [selectedChat])

  // 새 대화방 생성
  const handleCreateChat = async () => {
    if (!selectedAgent || !user) return;
    const { data, error } = await supabase.from('chats').insert([
      {
        agent_id: selectedAgent.id,
        user_id: user.id,
        title: `새 대화방 ${chats.length + 1}`,
      }
    ]).select()
    if (data && data.length > 0) {
      setChats([...chats, data[0]])
      setSelectedChat(data[0])
    }
  }

  // 대화방 삭제
  const handleDeleteChat = async (chatId: string) => {
    await supabase.from('messages').delete().eq('chat_id', chatId)
    await supabase.from('chats').delete().eq('id', chatId)
    setChats(chats.filter(c => c.id !== chatId))
    if (selectedChat?.id === chatId) setSelectedChat(null)
  }

  // 메시지 삭제
  const handleDeleteMessage = async (msgId: string) => {
    await supabase.from('messages').delete().eq('id', msgId)
    setMessages(messages.filter(m => m.id !== msgId))
  }

  // 새 에이전트(앱) 등록
  const handleConnectApp = async () => {
    if (!chatUrl.trim() || !agentName.trim()) return
    const { data, error } = await supabase.from('agents').insert([
      {
        name: agentName,
        webhook_url: chatUrl,
        // user_id: ... (공유형이므로 생략)
      }
    ]).select()
    if (data && data.length > 0) {
      setAgents([...agents, data[0]])
      setSelectedAgent(data[0])
    }
    setModalOpen(false)
    setChatUrl("")
    setAgentName("")
    setProvider("n8n")
    setAuthType("none")
  }

  // 에이전트 이름 수정
  const handleEditAgent = async (id: string) => {
    if (!editAgentName.trim()) return
    const { data } = await supabase.from('agents').update({ name: editAgentName }).eq('id', id).select()
    if (data && data.length > 0) {
      setAgents(agents.map(a => a.id === id ? { ...a, name: editAgentName } : a))
      setEditAgentId(null)
      setEditAgentName("")
    }
  }

  // 에이전트 삭제
  const handleDeleteAgent = async (id: string) => {
    await supabase.from('agents').delete().eq('id', id)
    setAgents(agents.filter(a => a.id !== id))
    if (selectedAgent?.id === id) setSelectedAgent(null)
  }

  const handleEditChat = useCallback(async (chatId: string) => {
    if (!editChatName.trim()) return
    const { data } = await supabase.from('chats').update({ title: editChatName }).eq('id', chatId).select()
    if (data && data.length > 0) {
      setChats(chats => chats.map(c => c.id === chatId ? { ...c, title: editChatName } : c))
      setEditChatId(null)
      setEditChatName("")
    }
  }, [editChatName])

  useEffect(() => {
    // 세션 상태 콘솔 출력 (실제 access_token이 있는지 확인)
    supabase.auth.getSession().then(({ data }) => {
      console.log("[MultiChat] supabase.auth.getSession():", data)
    })
  }, [])

  // user가 없으면 로그인 안내만 출력
  if (!user) {
    return <div className="p-8 text-center">로그인 후 이용 가능합니다.</div>
  }

  return (
    <div className="bg-slate-50 min-h-screen p-4">
      <Card className="bg-white shadow-sm border border-slate-200 h-[calc(100vh-2rem)] flex flex-col">
        <CardContent className="flex flex-row flex-1 gap-0 p-0 min-h-0">
          {/* 에이전트 목록 */}
          <div className="w-64 space-y-3 p-4 border-r border-slate-200 bg-slate-50 flex flex-col min-h-0">
            <Button 
              className="w-full mb-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200" 
              onClick={() => setModalOpen(true)}
            >
              + New Agent
            </Button>
            <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
            {agents.map(agent => (
              <Card 
                key={agent.id} 
                className={`hover:shadow-sm transition-all duration-200 border border-slate-200 cursor-pointer h-16 ${
                  selectedAgent?.id === agent.id 
                    ? "bg-blue-50 border-l-4 border-l-blue-500 shadow-sm" 
                    : "bg-white hover:bg-slate-50"
                }`} 
                onClick={() => setSelectedAgent(agent)}
              >
                <CardContent className="p-3 h-full flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {editAgentId === agent.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editAgentName}
                          onChange={e => setEditAgentName(e.target.value)}
                          className="h-7 px-2 text-sm border-slate-200 focus:border-blue-400"
                        />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); handleEditAgent(agent.id) }}>
                          <Check size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); setEditAgentId(null); setEditAgentName("") }}>
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-medium text-slate-700 truncate text-sm">{agent.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">활성 상태</p>
                      </>
                    )}
                  </div>
                  {editAgentId !== agent.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-60 hover:opacity-100" onClick={e => e.stopPropagation()}>
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditAgentId(agent.id); setEditAgentName(agent.name) }}>
                          이름 수정
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteAgent(agent.id)} className="text-destructive">
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardContent>
              </Card>
            ))}
            </div>
          </div>

          {/* 대화방 리스트 */}
          <div className="w-64 bg-white border-r border-slate-200 px-4 py-4 flex flex-col min-h-0">
            <Button 
              className="w-full mb-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200" 
              onClick={handleCreateChat}
            >
              + New Chat
            </Button>
            <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
              {chats.map(chat => (
                <Card 
                  key={chat.id} 
                  className={`cursor-pointer transition-all border border-slate-200 h-16 ${
                    selectedChat?.id === chat.id 
                      ? "bg-blue-50 border-l-4 border-l-blue-500 shadow-sm" 
                      : "bg-white hover:bg-slate-50"
                  }`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <CardContent className="p-3 h-full flex items-center justify-between">
                    {editChatId === chat.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <Input 
                          value={editChatName} 
                          onChange={e => setEditChatName(e.target.value)} 
                          className="h-7 text-sm border-slate-200 focus:border-blue-400" 
                        />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEditChat(chat.id)}>
                          <Check size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditChatId(null); setEditChatName("") }}>
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <span className="truncate font-medium text-slate-700 text-sm block">{chat.title}</span>
                          <span className="text-xs text-slate-500">방금 전</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-60 hover:opacity-100">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditChatId(chat.id); setEditChatName(chat.title) }}>
                              이름 수정
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteChat(chat.id)} className="text-destructive">
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* 대화창 */}
          <div className="flex-1 flex flex-col bg-slate-50 min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              {messages.map((m, i) => (
                <div
                  key={m.id || i}
                  className={`flex items-start space-x-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "ai" && (
                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm font-medium">AI</span>
                    </div>
                  )}
                  <div className={`max-w-[75%] ${m.role === "user" ? "order-2" : ""}`}>
                    <div className={`text-xs text-slate-500 mb-1 ${m.role === "user" ? "text-right" : ""}`}>
                      {m.role === "user" ? (user.email || "나") : selectedAgent?.name || "AI"}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 break-words shadow-sm ${
                        m.role === "user"
                          ? "bg-blue-500 text-white rounded-br-md"
                          : "bg-white text-slate-700 border border-slate-200 rounded-bl-md"
                      }`}
                    >
                      <div className="text-sm leading-relaxed">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                  {m.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1 order-3">
                      <span className="text-white text-sm font-medium">
                        {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-start space-x-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-medium">AI</span>
                  </div>
                  <div className="max-w-[75%]">
                    <div className="text-xs text-slate-500 mb-1">{selectedAgent?.name || "AI"}</div>
                    <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-slate-200">
                      <div className="text-sm text-slate-600">답변을 생성하고 있습니다...</div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* 입력창 */}
            <div className="border-t border-slate-200 bg-white p-4 shrink-0">
              <div className="flex items-end space-x-3 max-w-4xl mx-auto">
                <div className="flex-1 relative">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    className="min-h-[48px] resize-none border-2 border-slate-200 focus:border-blue-400 rounded-2xl px-4 py-3 transition-colors"
                    disabled={loading}
                    placeholder="메시지를 입력하세요..."
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="h-12 px-6 bg-blue-500 hover:bg-blue-600 rounded-2xl transition-all duration-200 shadow-sm"
                >
                  전송
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 새 에이전트(앱) 연결 모달 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>새 에이전트(앱) 연결</DialogTitle>
            <DialogDescription>
              새로운 AI 에이전트를 연결하여 대화를 시작하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">이름</label>
              <Input
                placeholder="에이전트 이름"
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                className="border-slate-200 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">n8n Webhook URL</label>
              <Input
                placeholder="https://n8n.example.com/webhook/..."
                value={chatUrl}
                onChange={e => setChatUrl(e.target.value)}
                className="border-slate-200 focus:border-blue-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-slate-300 hover:bg-slate-50">
              취소
            </Button>
            <Button 
              onClick={handleConnectApp} 
              disabled={!agentName.trim() || !chatUrl.trim()}
              className="bg-blue-500 hover:bg-blue-600"
            >
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}