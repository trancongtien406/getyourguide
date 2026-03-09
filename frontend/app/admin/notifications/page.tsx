'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Pagination, Table } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
    ApiError,
    notificationsApi,
    type CreateNotificationTemplateData,
    type Notification,
    type NotificationTemplate,
    type SendNotificationData,
} from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { RiAddLine, RiEditLine, RiSendPlaneLine } from 'react-icons/ri';

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  const tc = useTranslations('common');

  const channelOptions = [
    { value: 'EMAIL', label: t('channelEmail') },
    { value: 'SMS', label: t('channelSms') },
    { value: 'PUSH', label: t('channelPush') },
    { value: 'IN_APP', label: t('channelInApp') },
  ];

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<'notifications' | 'templates'>('notifications');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Send notification modal
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendFormData, setSendFormData] = useState<SendNotificationData>({
    channel: 'EMAIL',
    recipient: '',
    eventKey: '',
  });

  // Template modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState<CreateNotificationTemplateData>({
    eventKey: '',
    channel: 'EMAIL',
    subject: '',
    body: '',
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        pageSize: '10',
      };
      const response = await notificationsApi.listNotifications(params);
      setNotifications(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await notificationsApi.listTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifications();
    } else {
      fetchTemplates();
    }
  }, [activeTab, fetchNotifications, fetchTemplates]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      await notificationsApi.sendNotification(sendFormData);
      setIsSendModalOpen(false);
      fetchNotifications();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError((err.data as { message?: string })?.message || t('sendError'));
      } else {
        setFormError(t('sendError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTemplateModal = (template?: NotificationTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateFormData({
        eventKey: template.eventKey,
        channel: template.channel,
        languageCode: template.languageCode,
        subject: template.subject || '',
        body: template.body,
      });
    } else {
      setEditingTemplate(null);
      setTemplateFormData({
        eventKey: '',
        channel: 'EMAIL',
        subject: '',
        body: '',
      });
    }
    setFormError('');
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (editingTemplate) {
        await notificationsApi.updateTemplate(editingTemplate.id, {
          subject: templateFormData.subject,
          body: templateFormData.body,
        });
      } else {
        await notificationsApi.createTemplate(templateFormData);
      }
      setIsTemplateModalOpen(false);
      fetchTemplates();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError((err.data as { message?: string })?.message || t('templateSaveError'));
      } else {
        setFormError(t('templateSaveError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
      sent: 'success',
      queued: 'warning',
      failed: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const notificationColumns = [
    {
      key: 'eventKey',
      header: t('colEvent'),
      render: (n: Notification) => n.eventKey,
    },
    {
      key: 'channel',
      header: t('colChannel'),
      render: (n: Notification) => (
        <Badge variant="info">{n.channel}</Badge>
      ),
    },
    {
      key: 'recipient',
      header: t('colRecipient'),
      render: (n: Notification) => n.recipient,
    },
    {
      key: 'status',
      header: t('colStatus'),
      render: (n: Notification) => getStatusBadge(n.status),
    },
    {
      key: 'sentAt',
      header: t('colSent'),
      render: (n: Notification) =>
        n.sentAt ? new Date(n.sentAt).toLocaleString('vi-VN') : '-',
    },
    {
      key: 'createdAt',
      header: t('colCreated'),
      render: (n: Notification) => new Date(n.createdAt).toLocaleString('vi-VN'),
    },
  ];

  const templateColumns = [
    {
      key: 'eventKey',
      header: t('templateColEvent'),
      render: (tmpl: NotificationTemplate) => tmpl.eventKey,
    },
    {
      key: 'channel',
      header: t('templateColChannel'),
      render: (tmpl: NotificationTemplate) => (
        <Badge variant="info">{tmpl.channel}</Badge>
      ),
    },
    {
      key: 'subject',
      header: t('templateColSubject'),
      render: (tmpl: NotificationTemplate) => tmpl.subject || '-',
    },
    {
      key: 'isActive',
      header: t('templateColStatus'),
      render: (tmpl: NotificationTemplate) => (
        <Badge variant={tmpl.isActive ? 'success' : 'default'}>
          {tmpl.isActive ? t('templateStatusActive') : t('templateStatusInactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-16',
      render: (tmpl: NotificationTemplate) => (
        <button
          onClick={() => openTemplateModal(tmpl)}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Edit"
        >
          <RiEditLine className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'notifications' && (
            <Button onClick={() => setIsSendModalOpen(true)}>
              <RiSendPlaneLine className="h-5 w-5" />
              {t('sendButton')}
            </Button>
          )}
          {activeTab === 'templates' && (
            <Button onClick={() => openTemplateModal()}>
              <RiAddLine className="h-5 w-5" />
              {t('addTemplateButton')}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'notifications'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          {t('tabNotifications')}
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'templates'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          {t('tabTemplates')}
        </button>
      </div>

      {/* Content */}
      <Card padding="none">
        {activeTab === 'notifications' ? (
          <>
            <Table
              columns={notificationColumns}
              data={notifications}
              keyExtractor={(n) => n.id}
              isLoading={isLoading}
              emptyMessage={t('empty')}
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={10}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        ) : (
          <Table
            columns={templateColumns}
            data={templates}
            keyExtractor={(t) => t.id}
            isLoading={isLoading}
              emptyMessage={t('templatesEmpty')}
          />
        )}
      </Card>

      {/* Send Notification Modal */}
      <Modal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        title={t('sendModalTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsSendModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSendNotification} isLoading={isSubmitting}>
              {t('sendSubmit')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSendNotification} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {formError}
            </div>
          )}
          <Select
            label={t('sendChannelLabel')}
            value={sendFormData.channel}
            onChange={(e) => setSendFormData({ ...sendFormData, channel: e.target.value })}
            options={channelOptions}
          />
          <Input
            label={t('sendRecipientLabel')}
            value={sendFormData.recipient}
            onChange={(e) => setSendFormData({ ...sendFormData, recipient: e.target.value })}
            placeholder={t('sendRecipientPlaceholder')}
            required
          />
          <Input
            label={t('sendEventLabel')}
            value={sendFormData.eventKey}
            onChange={(e) => setSendFormData({ ...sendFormData, eventKey: e.target.value })}
            placeholder={t('sendEventPlaceholder')}
            required
          />
        </form>
      </Modal>

      {/* Template Modal */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title={editingTemplate ? t('templateEditTitle') : t('templateCreateTitle')}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsTemplateModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSaveTemplate} isLoading={isSubmitting}>
              {editingTemplate ? t('templateSave') : t('templateCreate')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveTemplate} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {formError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('templateEventLabel')}
              value={templateFormData.eventKey}
              onChange={(e) =>
                setTemplateFormData({ ...templateFormData, eventKey: e.target.value })
              }
              placeholder="booking.confirmed"
              required
              disabled={!!editingTemplate}
            />
            <Select
              label={t('templateChannelLabel')}
              value={templateFormData.channel}
              onChange={(e) =>
                setTemplateFormData({ ...templateFormData, channel: e.target.value })
              }
              options={channelOptions}
              disabled={!!editingTemplate}
            />
          </div>
          <Input
            label={t('templateSubjectLabel')}
            value={templateFormData.subject}
            onChange={(e) =>
              setTemplateFormData({ ...templateFormData, subject: e.target.value })
            }
            placeholder={t('templateSubjectPlaceholder')}
          />
          <Textarea
            label={t('templateBodyLabel')}
            value={templateFormData.body}
            onChange={(e) =>
              setTemplateFormData({ ...templateFormData, body: e.target.value })
            }
            placeholder="Hello {{name}}, your booking {{bookingRef}} has been confirmed..."
            rows={6}
            required
          />
        </form>
      </Modal>
    </div>
  );
}
