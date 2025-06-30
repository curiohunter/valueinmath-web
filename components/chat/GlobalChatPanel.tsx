"use client";
import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { User } from "@supabase/supabase-js";
import TextareaAutosize from 'react-textarea-autosize';
import ReactMarkdown from 'react-markdown';

interface GlobalChatPanelProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

const supabase = createClientComponentClient();

export default function GlobalChatPanel({ user, isOpen, onClose }: GlobalChatPanelProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<Record<string, { email?: string; name?: string }>>({});
  const [currentUserInfo, setCurrentUserInfo] = useState<{ name?: string; email?: string }>({});
  const [input, setInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 현재 사용자 정보 로드
  useEffect(() => {
    if (!user) return;

    const loadCurrentUser = async () => {
      const { data: employee } = await supabase
        .from('employees')
        .select('name, phone')
        .eq('auth_id', user.id)
        .single();

      setCurrentUserInfo({
        name: employee?.name || user.email?.split('@')[0],
        email: user.email
      });
    };

    loadCurrentUser();
  }, [user]);

  // 메시지 + 유저 정보 불러오기
  useEffect(() => {
    if (!user || !isOpen) return;

    let channel: any = null;

    const loadMessages = async () => {
      try {
        // 1. 메시지 가져오기
        const { data: messages, error: msgError } = await supabase
          .from('global_messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(50);

        if (msgError) throw msgError;
        setMessages(messages || []);

        // 2. 사용자 ID 목록 추출
        const userIds = Array.from(new Set(
          (messages || []).map((msg: any) => msg.user_id).filter(Boolean)
        ));

        if (userIds.length > 0) {
          // 3. employees 테이블에서 사용자 정보 가져오기
          const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('auth_id, name, phone')
            .in('auth_id', userIds);

          if (empError) {
            console.error('직원 정보 조회 에러:', empError);
          }

          // 4. userMap 생성
          const map: Record<string, { email?: string; name?: string }> = {};
          (employees || []).forEach((emp: any) => {
            if (emp.auth_id) {
              map[emp.auth_id] = {
                name: emp.name,
                email: emp.auth_id
              };
            }
          });

          setUserMap(map);
        }

      } catch (error) {
        console.error('데이터 로드 실패:', error);
      }
    };

    // 기존 채널이 있으면 먼저 제거
    supabase.removeAllChannels();

    // 실시간 구독
    channel = supabase
      .channel(`global_chat_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'global_messages'
      }, async (payload) => {
        // 자신이 보낸 메시지는 이미 처리했으므로 무시
        if (payload.new.user_id === user.id) {
          return;
        }
        
        // 다른 사용자의 메시지만 추가
        setMessages(prev => [...prev, payload.new]);
        
        // 해당 사용자 정보가 userMap에 없으면 조회
        if (payload.new.user_id && !userMap[payload.new.user_id]) {
          const { data: employee } = await supabase
            .from('employees')
            .select('name, phone')
            .eq('auth_id', payload.new.user_id)
            .single();

          if (employee) {
            setUserMap(prev => ({
              ...prev,
              [payload.new.user_id]: {
                name: employee.name,
                email: payload.new.user_id
              }
            }));
          }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsers(Object.values(state).flat());
      })
      .subscribe();

    // 온라인 상태 추가
    channel.track({
      user_id: user.id,
      email: user.email,
      name: currentUserInfo.name,
      online_at: new Date().toISOString()
    });

    loadMessages();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, isOpen]);

  // 스크롤 처리
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, isOpen]);

  // 패널 열릴 때 포커스
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || !user || isSending) return;

    const messageContent = input.trim();
    setInput("");
    setIsSending(true);

    try {
      const { data, error } = await supabase
        .from('global_messages')
        .insert([{
          user_id: user.id,
          content: messageContent,
          message_type: 'text'
        }])
        .select()
        .single();

      if (error) throw error;

      // 메시지를 직접 추가
      setMessages(prev => [...prev, data]);

    } catch (error) {
      console.error('메시지 전송 실패:', error);
      // 실패시 입력값 복원
      setInput(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <MessageCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">학원 전체 채팅</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="h-4 w-4" />
                <span>{onlineUsers.length}명 온라인</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => {
          const isCurrentUser = message.user_id === user?.id;
          const senderInfo = userMap[message.user_id];
          const displayName = senderInfo?.name || message.user_id || '익명';

          return (
            <div
              key={message.id || index}
              className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className={`flex-1 max-w-[80%] ${isCurrentUser ? 'text-right' : ''}`}>
                <div className={`text-xs text-gray-500 mb-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                  {displayName} • {new Date(message.created_at).toLocaleTimeString()}
                </div>
                <div
                  className={`inline-block p-3 rounded-lg break-words ${
                    isCurrentUser
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-700 rounded-bl-sm'
                  }`}
                >
                  <div className="text-sm leading-relaxed">
                    <ReactMarkdown>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <TextareaAutosize
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // 한글 조합 중이 아닐 때만 전송
                if (!e.nativeEvent.isComposing) {
                  sendMessage();
                }
              }
            }}
            placeholder="메시지를 입력하세요..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[44px]"
            minRows={1}
            maxRows={4}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="w-[44px] h-[44px] bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center flex-shrink-0"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}