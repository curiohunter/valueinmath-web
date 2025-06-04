// components/schedules/N8nChatSidebar.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, MessageSquare, Bot, Send, Loader2 } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import ReactMarkdown from 'react-markdown';
import { User } from "@supabase/supabase-js";
import TextareaAutosize from 'react-textarea-autosize';

interface N8nChatSidebarProps {
  user?: User | null;
}

const supabase = createClientComponentClient();

export default function N8nChatSidebar({ user }: N8nChatSidebarProps) {
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [agentName, setAgentName] = useState("일정agent");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 메시지 끝으로 스크롤 (새 메시지가 올 때만)
  useEffect(() => {
    if (messages.length > 0) {
      // 사용자가 스크롤을 올려서 보고 있는지 확인
      const messagesContainer = messagesEndRef.current?.parentElement;
      if (messagesContainer) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
        
        // 화면 하단 근처에 있을 때만 자동 스크롤
        if (isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }, [messages]);

  // 초기 페이지 진입 시 최신 메시지로 스크롤
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [loading, selectedChat]);

  // 초기 데이터 로드
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        // 1. agents 조회
        const { data: agentsData } = await supabase
          .from('agents')
          .select('*');
        
        setAgents(agentsData || []);
        
        // 2. "일정agent" 찾기
        const scheduleAgent = agentsData?.find(agent => 
          agent.name === "일정agent" || 
          agent.name.includes("일정") || 
          agent.name.includes("schedule")
        );

        if (scheduleAgent) {
          // 3. 해당 agent의 채팅방 찾기 또는 생성
          const { data: existingChats } = await supabase
            .from('chats')
            .select('*')
            .eq('agent_id', scheduleAgent.id)
            .eq('user_id', user.id);

          let chat = existingChats?.[0];
          
          if (!chat) {
            // 채팅방이 없으면 새로 생성
            const { data: newChat } = await supabase
              .from('chats')
              .insert([{
                agent_id: scheduleAgent.id,
                user_id: user.id,
                title: '일정 관리 대화'
              }])
              .select()
              .single();
            
            chat = newChat;
          }

          if (chat) {
            setSelectedChat({ ...chat, agent: scheduleAgent });
            
            // 4. 메시지 로드
            const { data: messagesData } = await supabase
              .from('messages')
              .select('*')
              .eq('chat_id', chat.id)
              .order('created_at', { ascending: true });
            
            setMessages(messagesData || []);
            
            // 초기 로드 후 최신 메시지로 스크롤
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
            }, 200);
          }
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // 메시지 전송
  const sendMessage = async () => {
    if (!input.trim() || !selectedChat || !user || sending) return;
    
    setSending(true);
    const userMessage = input;
    setInput("");

    try {
      // 1. 사용자 메시지 저장
      const { data: userMsgData } = await supabase
        .from('messages')
        .insert([{
          chat_id: selectedChat.id,
          user_id: user.id,
          role: 'user',
          content: userMessage,
        }])
        .select()
        .single();

      if (userMsgData) {
        setMessages(prev => [...prev, userMsgData]);
        // 새 메시지 추가 후 즉시 스크롤
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }

      // 2. n8n 웹훅 호출
      let webhookUrl = selectedChat.agent.webhook_url;
      
      // n8n URL 프록시 처리
      if (webhookUrl.startsWith("https://n8n.valueinmath.com/")) {
        webhookUrl = "/api/n8n/" + webhookUrl.replace("https://n8n.valueinmath.com/", "");
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      
      // 3. AI 응답 파싱
      let aiContent = "";
      if (data.reply) {
        aiContent = data.reply;
      } else if (data.output) {
        aiContent = data.output;
      } else {
        aiContent = JSON.stringify(data);
      }

      // 4. AI 메시지 저장
      const { data: aiMsgData } = await supabase
        .from('messages')
        .insert([{
          chat_id: selectedChat.id,
          user_id: null,
          role: 'ai',
          content: aiContent,
        }])
        .select()
        .single();

      if (aiMsgData) {
        setMessages(prev => [...prev, aiMsgData]);
        // AI 응답 후 즉시 스크롤
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }

    } catch (error) {
      console.error('메시지 전송 실패:', error);
      
      // 에러 메시지 추가
      const errorMsg = {
        id: Date.now().toString(),
        chat_id: selectedChat.id,
        user_id: null,
        role: 'ai',
        content: '죄송합니다. 메시지 전송 중 오류가 발생했습니다.',
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
      // 메시지 전송 완료 후 무조건 입력창에 포커스
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  };

  // 새 agent 생성
  const createAgent = async () => {
    if (!agentName.trim() || !user) return;

    try {
      const { data: newAgent } = await supabase
        .from('agents')
        .insert([{
          name: agentName,
          webhook_url: process.env.NEXT_PUBLIC_N8N_CHAT_URL || "https://n8n.valueinmath.com/webhook/schedule-agent",
        }])
        .select()
        .single();

      if (newAgent) {
        setAgents(prev => [...prev, newAgent]);
        setShowCreateModal(false);
        setAgentName("일정agent");
        
        // 새 채팅방 생성
        const { data: newChat } = await supabase
          .from('chats')
          .insert([{
            agent_id: newAgent.id,
            user_id: user.id,
            title: '일정 관리 대화'
          }])
          .select()
          .single();

        if (newChat) {
          setSelectedChat({ ...newChat, agent: newAgent });
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Agent 생성 실패:', error);
    }
  };

  if (!user) {
    return (
      <aside className="h-full w-full bg-white border-l flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">채팅 기능</h3>
          <p className="text-gray-500">로그인 후 이용 가능합니다.</p>
        </div>
      </aside>
    );
  }

  if (loading) {
    return (
      <aside className="h-full w-full bg-white border-l flex flex-col items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-500">로딩 중...</p>
      </aside>
    );
  }

  // Agent가 없는 경우
  if (!selectedChat) {
    return (
      <aside className="h-full w-full bg-white border-l flex flex-col">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bot className="h-5 w-5" />
            일정 도우미
          </h3>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">일정 도우미 설정</h4>
            <p className="text-gray-500 mb-6">일정 관리를 도와줄 AI 도우미를 설정해주세요.</p>
            
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              일정 도우미 추가
            </Button>
          </div>
        </div>

        {/* 일정 도우미 생성 모달 */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>일정 도우미 추가</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">도우미 이름</label>
                <Input
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="일정agent"
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 사용 팁</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 일정 생성, 수정, 삭제 도움</li>
                  <li>• 회의 시간 추천</li>
                  <li>• 일정 충돌 확인</li>
                  <li>• 업무 스케줄 최적화</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button 
                onClick={createAgent}
                disabled={!agentName.trim()}
                className="flex-1"
              >
                추가
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </aside>
    );
  }

  // 채팅 UI
  return (
    <aside className="h-[calc(100vh-2rem)] w-full bg-white border-l flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b bg-gray-50 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          {selectedChat.agent.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1">일정 관리 도우미</p>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 max-h-[calc(100vh-280px)] min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p>안녕하세요! 일정 관리를 도와드릴게요.</p>
            <p className="text-sm mt-2">무엇을 도와드릴까요?</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`flex items-start gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "ai" && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              
              <div className={`max-w-[80%] ${message.role === "user" ? "order-2" : ""}`}>
                <div className={`text-xs text-gray-500 mb-1 ${message.role === "user" ? "text-right" : ""}`}>
                  {message.role === "user" ? "나" : selectedChat.agent.name}
                </div>
                <div
                  className={`rounded-2xl px-4 py-3 break-words ${
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm"
                  }`}
                >
                  <div className="text-sm leading-relaxed">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 order-3">
                  <span className="text-white text-sm font-medium">
                    {user.email?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
        
        {sending && (
          <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="max-w-[80%]">
              <div className="text-xs text-gray-500 mb-1">{selectedChat.agent.name}</div>
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  답변을 생성하고 있습니다...
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div className="border-t bg-white p-4 space-y-3">
        <div className="relative">
          <TextareaAutosize
            ref={inputRef}
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            minRows={1}
            maxRows={6}
            maxLength={1000}
            placeholder="메시지를 입력하세요..."
            disabled={sending}
            className="w-full resize-none border-2 border-gray-200 focus:border-blue-600 rounded-2xl px-5 py-3 pr-14 transition-colors text-base leading-relaxed bg-white max-h-48 scrollbar-thin scrollbar-thumb-gray-200"
            style={{ overflow: 'auto' }}
          />
          <Button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            size="sm"
            className="absolute right-2 bottom-2 h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white transition-colors p-0 shadow-sm"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {/* 수정된 일정 확인 버튼 */}
        <Button
          type="button"
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-base font-semibold shadow-sm transition-colors"
          onClick={() => window.location.reload()}
        >
          수정된 일정 확인
        </Button>
      </div>
    </aside>
  );
}