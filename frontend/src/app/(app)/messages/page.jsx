'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { messageApi } from '../../../lib/api-entry';
import { useAuthStore } from '../../../lib/store';

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

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [selectedConversationId, setSelectedConversationId] = useState(
    searchParams.get('conversationId') || ''
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => messageApi.getConversations(),
    enabled: !!user?.id,
  });

  const conversations =
    data?.data?.data?.conversations || data?.data?.data || [];

  useEffect(() => {
    const nextId = searchParams.get('conversationId') || '';
    setSelectedConversationId(nextId);
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Messages</h1>
        <p className="mt-1 text-sm text-gray-500">Chat with tutors and learners here.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:grid md:grid-cols-[320px_1fr]">
        <div className="border-b border-gray-200 md:border-b-0 md:border-r">
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

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => {
                      setSelectedConversationId(conversation.id);
                      router.replace(`/messages?conversationId=${conversation.id}`);
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-4 text-left transition ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <img
                      src={getAvatarUrl(
                        partner?.avatar,
                        partner?.firstName,
                        partner?.lastName
                      )}
                      alt={partner?.firstName || 'User'}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {partner?.firstName || 'User'} {partner?.lastName || ''}
                        </p>
                        <span className="shrink-0 text-xs text-gray-400">
                          {formatTime(lastMessage?.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-gray-500">
                        {lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex min-h-[320px] items-center justify-center p-10 text-center">
          <div>
            <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-300" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              {selectedConversationId ? 'Chat coming next' : 'Pick a chat'}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {selectedConversationId
                ? 'The message panel will be added in the next step.'
                : 'Choose a conversation from the list.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
