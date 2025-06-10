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
  onClick?: () => void;
}

const supabase = createClientComponentClient();

export default function GlobalChatButton({ user, asHeaderIcon, onClick }: GlobalChatButtonProps) {
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

  // user가 없어도 버튼은 보여주되, 클릭 시에만 체크
  // if (!user) return null;

  if (asHeaderIcon) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full hover:bg-gray-100 transition-colors relative"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log('GlobalChatButton clicked!', onClick)
          console.log('User:', user)
          if (!user) {
            console.log('User가 없어서 채팅을 열 수 없습니다.');
            alert('User가 없어서 채팅을 열 수 없습니다.');
            return;
          }
          if (onClick) {
            onClick()
          } else {
            console.log('onClick prop is not provided!')
          }
        }}
        aria-label="채팅 열기"
      >
        <MessageCircle className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </Button>
    );
  }

  return (
    <>
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

      {/* 글로벌 채팅 모달 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl w-full h-[80vh] flex flex-col p-0">
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle>전체 채팅</DialogTitle>
            </DialogHeader>
          </VisuallyHidden>
          
          {/* 헤더 */}
          <Card className="border-0 border-b rounded-t-lg">
            <CardHeader className="pb-3">
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
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>

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
          <Card className="border-0 border-t rounded-b-lg">
            <CardContent className="p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <TextareaAutosize
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="메시지를 입력하세요..."
                    className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    minRows={1}
                    maxRows={4}
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  size="sm"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}