// components/chat/GlobalChatButton.tsx 수정
"use client";
import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { User } from "@supabase/supabase-js";
import TextareaAutosize from 'react-textarea-autosize';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface GlobalChatButtonProps {
  user?: User | null;
  asHeaderIcon?: boolean;
}

const supabase = createClientComponentClient();

export default function GlobalChatButton({ user, asHeaderIcon }: GlobalChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<Record<string, { email?: string; name?: string }>>({});
  const [currentUserInfo, setCurrentUserInfo] = useState<{ name?: string; email?: string }>({});
  const [input, setInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
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
    if (!user) return;

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

    // 실시간 구독
    const channel = supabase
      .channel('global_chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'global_messages'
      }, async (payload) => {
        // 새 메시지 추가
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

        if (!isOpen) {
          setUnreadCount(prev => prev + 1);
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
      supabase.removeChannel(channel);
    };
  }, [user, isOpen, currentUserInfo.name]);

  // 모달 열릴 때 읽음 처리
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // 스크롤 처리
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;

    const messageContent = input;
    setInput("");

    // 즉시 로컬 상태에 추가 (실시간 느낌을 위해)
    const tempMessage = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      content: messageContent,
      message_type: 'text',
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMessage]);

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

      // 임시 메시지를 실제 메시지로 교체
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id ? data : msg
        )
      );

    } catch (error) {
      console.error('메시지 전송 실패:', error);
      // 실패시 임시 메시지 제거
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  };

  if (!user) return null;

  return (
    <>
      {asHeaderIcon ? (
        <Button
          onClick={() => setIsOpen(true)}
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-medium"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      ) : (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700 relative"
          >
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* 채팅 모달 - Dialog 기본 스타일 완전히 제거 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[500px] p-0 border-none bg-transparent shadow-none [&>button]:hidden">
          <Card className="w-full h-[600px] flex flex-col overflow-hidden shadow-lg">
            {/* 헤더 */}
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b bg-blue-50 space-y-0">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">학원 채팅</h2>
                <VisuallyHidden>
                  <DialogTitle>학원 채팅</DialogTitle>
                </VisuallyHidden>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{onlineUsers.length}</span>
                </div>
              </div>
              {/* X 버튼 - 카드 안에 포함 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 hover:bg-white/80 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            {/* 온라인 사용자 - 헤더 하단 */}
            <div className="px-4 py-2 bg-blue-50 border-b">
              <div className="flex gap-1 flex-wrap">
                {onlineUsers.slice(0, 5).map((user, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {user.name || user.email?.split('@')[0]}
                  </Badge>
                ))}
                {onlineUsers.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{onlineUsers.length - 5}
                  </Badge>
                )}
              </div>
            </div>
            {/* 메시지 영역 */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-base font-medium">학원 전체 채팅방입니다</p>
                  <p className="text-sm mt-1">자유롭게 소통해보세요!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isMyMessage = message.user_id === user.id;
                  const displayName = isMyMessage 
                    ? currentUserInfo.name || "나"
                    : (userMap[message.user_id]?.name || "익명");
                  return (
                    <div
                      key={message.id || index}
                      className={`flex gap-3 ${
                        isMyMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isMyMessage && (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white text-sm font-medium">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`max-w-[70%] ${isMyMessage ? "order-2" : ""}`}>
                        <div className={`text-xs text-gray-500 mb-1 ${isMyMessage ? "text-right" : ""}`}>
                          {displayName}
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-2 break-words shadow-sm ${
                            isMyMessage
                              ? "bg-blue-600 text-white rounded-br-md"
                              : "bg-white text-gray-800 border border-gray-200 rounded-bl-md"
                          }`}
                        >
                          <div className="text-sm leading-relaxed">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                      {isMyMessage && (
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 order-3 text-white text-sm font-medium">
                          {currentUserInfo.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </CardContent>
            {/* 입력 영역 */}
            <div className="border-t bg-white p-4">
              <div className="relative">
                <TextareaAutosize
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      if (e.nativeEvent.isComposing) return;
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  minRows={1}
                  maxRows={4}
                  placeholder="메시지를 입력하세요..."
                  className="w-full resize-none border-2 border-gray-200 focus:border-blue-600 rounded-2xl px-4 py-3 pr-12 transition-colors text-sm leading-relaxed bg-white shadow-sm"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  size="sm"
                  className="absolute right-2 bottom-2 h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white transition-colors p-0 shadow-sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}