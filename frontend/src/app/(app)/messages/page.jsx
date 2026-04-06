'use client';

import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

export default function MessagesPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Messages</h1>
        <p className="mt-1 text-sm text-gray-500">Chat with tutors and learners here.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-300" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900">No chats yet</h2>
        <p className="mt-2 text-sm text-gray-500">
          Your conversations will show up here later.
        </p>
      </div>
    </div>
  );
}
