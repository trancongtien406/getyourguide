'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/table';
import {
    messagesApi,
    type Message as ApiMessage,
    type Conversation,
    type ConversationStatus,
    type ConversationType,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RiArrowLeftLine, RiChat3Line, RiSendPlaneLine } from 'react-icons/ri';

const CONV_STATUSES: ConversationStatus[] = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED', 'SPAM'];
const CONV_TYPES: ConversationType[] = ['SUPPORT', 'BOOKING', 'SUPPLIER_CUSTOMER', 'SYSTEM'];

export default function ProfileMessagesPage() {
  const t = useTranslations('profile');
  const tm = useTranslations('messagesAdmin');
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pageSize = 10;

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
      if (search) params.q = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      const res = await messagesApi.listConversations(params);
      setConversations(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const fetchMessages = useCallback(async (convId: string) => {
    setMessagesLoading(true);
    try {
      const res = await messagesApi.listMessages(convId, { pageSize: '100', sortBy: 'createdAt', sortOrder: 'asc' });
      setMessages(res.data);
    } catch { /* empty */ } finally {
      setMessagesLoading(false);
    }
  }, []);

  const openConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    await fetchMessages(conv.id);
    try { await messagesApi.markConversationRead(conv.id); } catch { /* empty */ }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!selectedConversation || !newMessage.trim()) return;
    setSending(true);
    try {
      await messagesApi.sendMessage(selectedConversation.id, { body: newMessage.trim() });
      setNewMessage('');
      fetchMessages(selectedConversation.id);
    } catch { /* empty */ } finally {
      setSending(false);
    }
  };

  // Detail view
  if (selectedConversation) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
          <button onClick={() => setSelectedConversation(null)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <RiArrowLeftLine className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {selectedConversation.subject || '(no subject)'}
            </h2>
            <span className="text-sm text-slate-500">{selectedConversation.type} · {selectedConversation.status}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {messagesLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-slate-500">No messages yet</p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isMine = msg.senderUserId === user?.id;
                return (
                <div key={msg.id} className={`flex ${msg.messageType === 'SYSTEM' ? 'justify-center' : isMine ? 'justify-end' : 'justify-start'}`}>
                  {msg.messageType === 'SYSTEM' ? (
                    <div className="rounded-full bg-slate-100 px-4 py-1.5 text-xs text-slate-500 dark:bg-slate-800">
                      {msg.body}
                    </div>
                  ) : (
                    <div className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
                      isMine
                        ? 'bg-primary text-white rounded-br-none'
                        : 'bg-white dark:bg-slate-800 rounded-bl-none'
                    }`}>
                      {!isMine && (
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-medium text-primary dark:text-primary-light">
                            {msg.sender ? `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim() || msg.sender.email : 'System'}
                          </span>
                        </div>
                      )}
                      <p className={`text-sm whitespace-pre-wrap ${isMine ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{msg.body}</p>
                      <span className={`text-xs mt-1 block text-right ${isMine ? 'text-white/70' : 'text-slate-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {selectedConversation.status !== 'CLOSED' && (
          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              />
              <Button onClick={handleSend} isLoading={sending} disabled={!newMessage.trim()}>
                <RiSendPlaneLine className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('messagesTitle')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('messagesSubtitle')}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          placeholder={tm('searchPlaceholder')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-64"
        />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          wrapperClassName="w-44"
          options={[
            { value: '', label: tm('statusAll') },
            ...CONV_STATUSES.map((s) => ({ value: s, label: tm(`status${s[0] + s.slice(1).toLowerCase()}` as Parameters<typeof tm>[0]) })),
          ]}
        />
        <Select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          wrapperClassName="w-48"
          options={[
            { value: '', label: tm('typeAll') },
            ...CONV_TYPES.map((ct) => ({ value: ct, label: tm(`type${ct.split('_').map(w => w[0] + w.slice(1).toLowerCase()).join('')}` as Parameters<typeof tm>[0]) })),
          ]}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <RiChat3Line className="mb-4 h-12 w-12" />
          <p>{t('messagesEmpty')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => openConversation(conv)}
              className="flex w-full items-center gap-4 rounded-lg bg-white border border-slate-200 dark:border-slate-700 p-4 text-left shadow-sm transition-shadow hover:shadow-md dark:bg-slate-800/50"
            >
              <RiChat3Line className="h-8 w-8 flex-shrink-0 text-primary" />
              <div className="flex-1 overflow-hidden">
                <p className="truncate font-medium text-slate-900 dark:text-white">
                  {conv.subject || '(no subject)'}
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${
                    conv.status === 'OPEN' ? 'bg-primary/10 text-primary' :
                    conv.status === 'RESOLVED' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                  }`}>{conv.status}</span>
                  <span>{conv.type}</span>
                  {conv.lastMessageAt && <span>· {new Date(conv.lastMessageAt).toLocaleDateString()}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={pageSize}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
