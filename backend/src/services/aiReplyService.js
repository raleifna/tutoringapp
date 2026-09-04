const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

const cleanReply = (value) =>
  String(value || '')
    .replace(/^["']|["']$/g, '')
    .trim();

const getMessageName = (message, currentUserId) => {
  if (message.senderId === currentUserId) return 'Me';
  const firstName = message.sender?.firstName || '';
  const lastName = message.sender?.lastName || '';
  return `${firstName} ${lastName}`.trim() || 'Other person';
};

const formatTranscript = (messages, currentUserId) =>
  messages
    .map((message) => `${getMessageName(message, currentUserId)}: ${message.content}`)
    .join('\n');

const getLastIncomingMessage = (messages, currentUserId) =>
  [...messages].reverse().find((message) => message.senderId !== currentUserId);

const asksAboutAvailability = (value) =>
  /\bavailable\b|\bavailability\b|\bfree\b|\bthis week\b|\bwhen can\b|\bwhat time\b/i.test(
    String(value || '')
  );

const formatAvailabilityForInstruction = (slots = []) =>
  slots
    .map((slot) => `${slot.day} ${slot.startTime}-${slot.endTime} ${slot.timezone || ''}`.trim())
    .join('; ');

const formatTimeRangeForReply = (slot) =>
  `${slot.day} ${slot.startTime}-${slot.endTime}${slot.timezone ? ` ${slot.timezone}` : ''}`;

const buildAvailabilityReply = ({ context, partnerName }) => {
  const slots =
    context?.tutor?.currentWeekAvailability?.length > 0
      ? context.tutor.currentWeekAvailability
      : context?.tutor?.availability || [];

  if (!slots.length) return '';

  const firstName = String(partnerName || '').trim().split(/\s+/)[0] || 'there';
  const formattedSlots = slots.map(formatTimeRangeForReply);
  const slotText =
    formattedSlots.length === 1
      ? formattedSlots[0]
      : `${formattedSlots.slice(0, -1).join(', ')}, and ${formattedSlots[formattedSlots.length - 1]}`;

  return `Hi ${firstName}, yes, I am available this week: ${slotText}. Let me know which time works best for you.`;
};

const formatContextLines = (context = {}) => {
  const lines = [];
  const currentUser = context.currentUser;
  const partner = context.partner;
  const tutor = context.tutor;
  const learner = context.learner;

  if (currentUser?.role) {
    lines.push(`Current account: ${currentUser.name || 'Me'} (${currentUser.role}).`);
  }
  if (partner?.role) {
    lines.push(`Chat partner: ${partner.name || 'Other person'} (${partner.role}).`);
  }
  if (tutor?.name) {
    lines.push(`Tutor in this chat: ${tutor.name}.`);
  }
  if (learner?.name) {
    lines.push(`Learner in this chat: ${learner.name}.`);
  }
  if (learner?.gradeLevel || learner?.subjects?.length || learner?.learningGoals) {
    lines.push(
      `Learner profile: ${[
        learner.gradeLevel ? `grade/level ${learner.gradeLevel}` : '',
        learner.subjects?.length ? `interested subjects ${learner.subjects.join(', ')}` : '',
        learner.learningGoals ? `goals ${learner.learningGoals}` : '',
      ]
        .filter(Boolean)
        .join('; ')}.`
    );
  }
  if (tutor?.subjects?.length) {
    lines.push(
      `Tutor subjects and levels: ${tutor.subjects
        .map((item) => `${item.name}${item.level ? ` (${item.level})` : ''}`)
        .join(', ')}.`
    );
  }
  if (tutor?.availability?.length) {
    lines.push(
      `Tutor regular availability: ${tutor.availability
        .map((slot) => `${slot.day} ${slot.startTime}-${slot.endTime} ${slot.timezone || ''}`.trim())
        .join('; ')}.`
    );
  }
  if (tutor?.currentWeekAvailability?.length) {
    lines.push(
      `Tutor current-week availability override: ${tutor.currentWeekAvailability
        .map((slot) => `${slot.day} ${slot.startTime}-${slot.endTime}`)
        .join('; ')}.`
    );
  }
  if (context.bookings?.length) {
    lines.push(
      `Bookings between these users: ${context.bookings
        .map(
          (booking) =>
            `${booking.subject} ${booking.status} on ${booking.scheduledAt} for ${booking.duration} minutes`
        )
        .join('; ')}.`
    );
  }

  return lines.join('\n');
};

const buildReplyPrompt = ({ messages, currentUserId, partnerName, context }) => {
  const lastIncoming = getLastIncomingMessage(messages, currentUserId);
  const transcript = formatTranscript(messages, currentUserId);
  const lastIncomingText = String(lastIncoming?.content || '').trim();
  const contextText = formatContextLines(context);
  const effectiveAvailability =
    context?.tutor?.currentWeekAvailability?.length > 0
      ? context.tutor.currentWeekAvailability
      : context?.tutor?.availability || [];
  const availabilityInstruction =
    asksAboutAvailability(lastIncomingText) && effectiveAvailability.length > 0
      ? `The latest message asks about availability. Answer using these slots: ${formatAvailabilityForInstruction(
          effectiveAvailability
        )}.`
      : '';

  return [
    `You are drafting a message from Me to ${partnerName || 'the other person'}.`,
    'Use the chat history below as the source of truth.',
    'Use the account and lesson context when it is relevant.',
    'Reply specifically to the latest message from the other person.',
    'Do not respond to my own latest message unless the other person has not sent anything yet.',
    'Do not introduce yourself by name unless the other person explicitly asks who you are.',
    'If the latest message asks about this week availability and tutor availability is provided, your reply must directly answer with the available days/times from that data.',
    'For availability questions, do not talk about subjects, experience, profile details, or your name unless needed after the availability answer.',
    'If they ask what subjects, courses, or levels the tutor can teach, answer from the tutor subject and level data.',
    'If they ask to change, reschedule, or discuss a lesson, use the bookings between these users when provided.',
    'If context is missing, ask a short clarifying question instead of inventing details.',
    availabilityInstruction,
    'Write one complete reply. Do not stop mid-sentence. End with a complete sentence.',
    'Return only the draft message text.',
    '',
    'Account and lesson context:',
    contextText || '(No extra account or lesson context available)',
    '',
    'Recent chat history:',
    transcript || '(No previous messages)',
    '',
    `Latest message from ${partnerName || 'the other person'}: ${lastIncomingText || '(none)'}`,
  ].join('\n');
};

const buildMockReply = ({ messages, currentUserId }) => {
  const lastIncoming = getLastIncomingMessage(messages, currentUserId);
  const lastText = String(lastIncoming?.content || '').trim();

  if (!lastText) {
    return 'Hi, thanks for reaching out. I am happy to help. What would you like to work on first?';
  }

  if (/\bavailable\b|\bavailability\b|\bfree\b|\bthis week\b/i.test(lastText)) {
    return 'Hi, thanks for reaching out. I can check my availability for this week. Which days and times work best for you?';
  }

  if (lastText.includes('?')) {
    return 'Thanks for asking. Could you share a little more detail so I can give you the most helpful answer?';
  }

  return 'Thanks for the update. That sounds good to me, and I will keep an eye out for the next step.';
};

const extractResponseText = (payload) => {
  if (payload?.output_text) return cleanReply(payload.output_text);

  const text = payload?.output
    ?.flatMap((item) => item?.content || [])
    .map((content) => content?.text || '')
    .join(' ');

  return cleanReply(text);
};

const extractGeminiText = (payload) => {
  const text = payload?.candidates
    ?.flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => part?.text || '')
    .join(' ');

  return cleanReply(text);
};

const extractAnthropicText = (payload) => {
  const text = (payload?.content || [])
    .map((item) => item?.text || '')
    .join(' ');

  return cleanReply(text);
};

async function generateOpenAiReply({ messages, currentUserId, partnerName, context }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error('OpenAI API key is not configured');
    error.statusCode = 400;
    throw error;
  }

  const model = process.env.OPENAI_REPLY_MODEL || 'gpt-5-mini';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions:
          'You write concise, friendly chat replies for a tutoring marketplace. Use the supplied chat history. Draft only the reply text. Do not invent commitments, prices, or schedules. Keep it under 60 words unless the context clearly needs more.',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: buildReplyPrompt({ messages, currentUserId, partnerName, context }),
              },
            ],
          },
        ],
        max_output_tokens: 240,
      }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = payload?.error?.message || 'OpenAI reply generation failed';
      const error = new Error(message);
      error.statusCode = response.status >= 500 ? 502 : 400;
      throw error;
    }

    const reply = extractResponseText(payload);
    if (!reply) throw new Error('OpenAI returned an empty reply');

    return { reply, mode: 'live', provider: 'openai', model };
  } finally {
    clearTimeout(timeout);
  }
}

async function generateGeminiReply({ messages, currentUserId, partnerName, context }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error('Gemini API key is not configured');
    error.statusCode = 400;
    throw error;
  }

  const model = process.env.GEMINI_REPLY_MODEL || 'gemini-2.5-flash';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const url = `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent`;

  const requestGemini = async (maxOutputTokens) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: 'You write concise, friendly chat replies for a tutoring marketplace. Draft only the reply text. Do not invent commitments, prices, or schedules. Keep it under 60 words unless the context clearly needs more.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: buildReplyPrompt({ messages, currentUserId, partnerName, context }),
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens,
          temperature: 0.3,
        },
      }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = payload?.error?.message || 'Gemini reply generation failed';
      const error = new Error(message);
      error.statusCode = response.status >= 500 ? 502 : 400;
      throw error;
    }

    return payload;
  };

  try {
    let payload = await requestGemini(384);
    const finishReason = payload?.candidates?.[0]?.finishReason;

    if (finishReason === 'MAX_TOKENS') {
      payload = await requestGemini(768);
    }

    const reply = extractGeminiText(payload);
    if (!reply) throw new Error('Gemini returned an empty reply');

    return { reply, mode: 'live', provider: 'gemini', model };
  } finally {
    clearTimeout(timeout);
  }
}

async function generateAnthropicReply({ messages, currentUserId, partnerName, context }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const error = new Error('Anthropic API key is not configured');
    error.statusCode = 400;
    throw error;
  }

  const model = process.env.ANTHROPIC_REPLY_MODEL || 'claude-3-5-haiku-latest';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 240,
        temperature: 0.3,
        system:
          'You write concise, friendly chat replies for a tutoring marketplace. Draft only the reply text. Do not invent commitments, prices, or schedules. Keep it under 60 words unless the context clearly needs more.',
        messages: [
          {
            role: 'user',
            content: buildReplyPrompt({ messages, currentUserId, partnerName, context }),
          },
        ],
      }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = payload?.error?.message || 'Anthropic reply generation failed';
      const error = new Error(message);
      error.statusCode = response.status >= 500 ? 502 : 400;
      throw error;
    }

    const reply = extractAnthropicText(payload);
    if (!reply) throw new Error('Anthropic returned an empty reply');

    return { reply, mode: 'live', provider: 'anthropic', model };
  } finally {
    clearTimeout(timeout);
  }
}

async function generateReply({ messages, currentUserId, partnerName, context }) {
  const mode = String(process.env.AI_REPLY_MODE || process.env.OPENAI_REPLY_MODE || '').toLowerCase();
  const provider = String(process.env.AI_REPLY_PROVIDER || 'openai').toLowerCase();
  const lastIncoming = getLastIncomingMessage(messages, currentUserId);
  const lastIncomingText = String(lastIncoming?.content || '').trim();

  if (mode === 'mock') {
    return {
      reply: buildMockReply({ messages, currentUserId }),
      mode: 'mock',
      provider: 'mock',
    };
  }

  if (asksAboutAvailability(lastIncomingText)) {
    const reply = buildAvailabilityReply({ context, partnerName });
    if (reply) {
      return {
        reply,
        mode: 'live',
        provider,
        source: 'availability_context',
      };
    }
  }

  if (provider === 'gemini') {
    return generateGeminiReply({ messages, currentUserId, partnerName, context });
  }

  if (provider === 'anthropic' || provider === 'claude') {
    return generateAnthropicReply({ messages, currentUserId, partnerName, context });
  }

  return generateOpenAiReply({ messages, currentUserId, partnerName, context });
}

module.exports = { generateReply };
