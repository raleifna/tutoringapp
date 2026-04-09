'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { messageApi } from '../../../lib/api-entry';
import { useAuthStore, useMessageStore } from '../../../lib/store';

let socket = null;

const IS_MOCK_CHAT = process.env.NEXT_PUBLIC_STAGE4_API_MODE === 'mock';

const getAvatarUrl = (avatar, firstName, lastName) => {
  if (avatar) return avatar;
  const name = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff`;
};

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getSocketUrl = () => {
  if (typeof window === 'undefined') return '';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  if (!apiUrl || apiUrl.startsWith('/')) return window.location.origin;

  try {
    return new URL(apiUrl).origin;
  } catch {
    return window.location.origin;
  }
};

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuthStore();
  const incrementUnread = useMessageStore((state) => state.incrementUnread);
  const setUnreadCount = useMessageStore((state) => state.setUnreadCount);
  const [selectedConversationId, setSelectedConversationId] = useState(
    searchParams.get('conversationId') || ''
  );
  const [messageInput, setMessageInput] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const requestedUserId = searchParams.get('userId') || '';
  const returnTo = searchParams.get('returnTo') || '';
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => messageApi.getConversations(),
    enabled: !!user?.id,
  });

  const {
    data: messagesData,
    isLoading: messagesLoading,
    isError: messagesError,
    error: messagesQueryError,
  } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: () => messageApi.getMessages(selectedConversationId),
    enabled: !!selectedConversationId,
  });

  const conversations =
    data?.data?.data?.conversations || data?.data?.data || [];
  const messages = messagesData?.data?.data?.messages || [];
  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId
  );
  const selectedPartner = selectedConversation?.participants?.find(
    (item) => item.userId !== user?.id
  )?.user;
  const showConversationList = !selectedConversationId;
  const showReturnButton = Boolean(user?.id && returnTo);

  const buildMessagesHref = (conversationId) => {
    const params = new URLSearchParams();

    if (conversationId) {
      params.set('conversationId', conversationId);
    }
    if (returnTo) {
      params.set('returnTo', returnTo);
    }

    const query = params.toString();
    return query ? `/messages?${query}` : '/messages';
  };

  useEffect(() => {
    const nextId = searchParams.get('conversationId') || '';
    setSelectedConversationId(nextId);
  }, [searchParams]);

  useEffect(() => {
    if (!requestedUserId || !user?.id || selectedConversationId) return;

    let cancelled = false;

    messageApi
      .createConversation(requestedUserId)
      .then((res) => {
        if (cancelled) return;
        const conversationId = res?.data?.data?.id || '';
        if (!conversationId) return;
        setSelectedConversationId(conversationId);
        router.replace(buildMessagesHref(conversationId));
        queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [queryClient, requestedUserId, returnTo, router, selectedConversationId, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const syncUnread = async () => {
      if (!user?.id) return;
      try {
        const res = await messageApi.getUnreadCount();
        if (!cancelled) {
          setUnreadCount(res?.data?.data?.count || 0);
        }
      } catch {}
    };

    syncUnread();

    return () => {
      cancelled = true;
    };
  }, [setUnreadCount, user?.id]);

  useEffect(() => {
    if (!selectedConversationId) return;

    let cancelled = false;

    const markRead = async () => {
      try {
        await messageApi.markAsRead(selectedConversationId);
        const res = await messageApi.getUnreadCount();
        if (!cancelled) {
          setUnreadCount(res?.data?.data?.count || 0);
        }
        queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      } catch {}
    };

    markRead();

    return () => {
      cancelled = true;
    };
  }, [queryClient, selectedConversationId, setUnreadCount, user?.id]);

  useEffect(() => {
    if (!accessToken || IS_MOCK_CHAT) return;

    socket = io(getSocketUrl(), {
      auth: { token: accessToken },
    });

    socket.on('new_message', (message) => {
      queryClient.invalidateQueries({ queryKey: ['messages', message.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });

      if (message.conversationId !== selectedConversationId) {
        incrementUnread();
        return;
      }

      messageApi
        .markAsRead(message.conversationId)
        .then(() => messageApi.getUnreadCount())
        .then((res) => setUnreadCount(res?.data?.data?.count || 0))
        .catch(() => {});
    });

    socket.on('user_typing', ({ conversationId, userId, isTyping }) => {
      if (conversationId === selectedConversationId && userId !== user?.id) {
        setPartnerTyping(Boolean(isTyping));
      }
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [accessToken, incrementUnread, queryClient, selectedConversationId, setUnreadCount, user?.id]);

  useEffect(() => {
    if (!socket || !selectedConversationId) return;

    socket.emit('join_conversation', selectedConversationId);

    return () => {
      socket?.emit('leave_conversation', selectedConversationId);
    };
  }, [selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const sendMutation = useMutation({
    mutationFn: ({ conversationId, content }) =>
      messageApi.sendMessage(conversationId, { content }),
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
  });

  const handleSend = () => {
    const content = messageInput.trim();
    if (!content || !selectedConversationId) return;
    sendMutation.mutate({
      conversationId: selectedConversationId,
      content,
    });
  };

  const handleTyping = () => {
    if (!socket || !selectedConversationId) return;
    socket.emit('typing', { conversationId: selectedConversationId, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('typing', { conversationId: selectedConversationId, isTyping: false });
    }, 1200);
  };

  const handleSelectConversation = (conversationId) => {
    setSelectedConversationId(conversationId);
    router.replace(buildMessagesHref(conversationId));
  };

  const handleBackToList = () => {
    if (showReturnButton) {
      router.push(returnTo);
      return;
    }
    setSelectedConversationId('');
    setPartnerTyping(false);
    router.replace('/messages');
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-start gap-3 md:mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">Messages</h1>
          <p className="mt-1 text-sm text-gray-500">Chat with tutors and learners here.</p>
        </div>
        {showReturnButton && (
          <button
            type="button"
            onClick={() => router.push(returnTo)}
            className="hidden items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 md:inline-flex"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:grid md:grid-cols-[320px_1fr]">
        <div
          className={`md:block ${showConversationList ? 'block' : 'hidden'} border-b border-gray-200 md:border-b-0 md:border-r`}
        >
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">All chats</h2>
          </div>

          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-gray-200" />
                    <div className="h-3 w-2/3 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-4 text-sm text-red-600">
              {error?.response?.data?.message || 'Failed to load chats.'}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">No chats yet</p>
              <p className="mt-1 text-sm text-gray-500">Your conversations will show up here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation) => {
                const partner = conversation.participants?.find(
                  (item) => item.userId !== user?.id
                )?.user;
                const lastMessage = conversation.lastMessage || conversation.messages?.[0];
                const isSelected = selectedConversationId === conversation.id;
                const unread = conversation.unreadCount || 0;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => handleSelectConversation(conversation.id)}
                    className={`flex w-full items-start gap-3 px-4 py-4 text-left transition ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    >
                    <div className="relative">
                      <img
                        src={getAvatarUrl(
                          partner?.avatar,
                          partner?.firstName,
                          partner?.lastName
                        )}
                        alt={partner?.firstName || 'User'}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      {unread > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm ${unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'}`}>
                          {partner?.firstName || 'User'} {partner?.lastName || ''}
                        </p>
                        <span className="shrink-0 text-xs text-gray-400">
                          {formatTime(lastMessage?.createdAt)}
                        </span>
                      </div>
                      <p className={`mt-1 truncate text-sm ${unread > 0 ? 'font-medium text-gray-700' : 'text-gray-500'}`}>
                        {lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!selectedConversationId ? (
          <div className="hidden min-h-[320px] items-center justify-center p-10 text-center md:flex">
            <div>
              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">Pick a chat</h2>
              <p className="mt-2 text-sm text-gray-500">
                Choose a conversation from the list.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-[calc(100dvh-11.5rem)] min-h-[32rem] flex-col md:h-[calc(100dvh-10rem)] md:min-h-[520px]">
            <div className="border-b border-gray-100 px-4 py-3 md:px-5 md:py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 md:hidden"
                  aria-label="Back to chats"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                </button>
                <img
                  src={getAvatarUrl(
                    selectedPartner?.avatar,
                    selectedPartner?.firstName,
                    selectedPartner?.lastName
                  )}
                  alt={selectedPartner?.firstName || 'User'}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedPartner?.firstName || 'User'} {selectedPartner?.lastName || ''}
                  </p>
                  <p className="text-xs text-gray-500">Conversation</p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3 md:p-4">
              {messagesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className="h-14 w-44 rounded-2xl bg-gray-200 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : messagesError ? (
                <div className="text-sm text-red-600">
                  {messagesQueryError?.response?.data?.message || 'Failed to load messages.'}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center">
                  <div>
                    <ChatBubbleLeftRightIcon className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-3 text-sm font-medium text-gray-900">No messages yet</p>
                    <p className="mt-1 text-sm text-gray-500">Say hi to start the chat.</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isMine = message.senderId === user?.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-sm md:max-w-[75%] md:px-4 md:py-3 ${
                          isMine
                            ? 'rounded-br-sm bg-blue-600 text-white'
                            : 'rounded-bl-sm bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p
                          className={`mt-1 text-xs ${
                            isMine ? 'text-blue-100' : 'text-gray-400'
                          }`}
                        >
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              {partnerTyping && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
                    typing...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-100 bg-white p-3 md:p-4">
              <div className="flex items-end gap-2">
                <textarea
                  value={messageInput}
                  onChange={(event) => {
                    setMessageInput(event.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    } else {
                      handleTyping();
                    }
                  }}
                  placeholder="Type a message..."
                  rows={2}
                  className="input min-h-[48px] flex-1 resize-none px-3 py-2.5 md:px-4 md:py-3"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!messageInput.trim() || sendMutation.isPending}
                  className="btn-primary inline-flex h-12 shrink-0 items-center gap-2 px-3 md:px-4 disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {sendMutation.isPending ? 'Sending' : 'Send'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
