'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Pagination, Table } from '@/components/ui/table';
import { auditLogsApi, type AuditLog } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { RiEyeLine } from 'react-icons/ri';

export default function AuditLogsPage() {
  const t = useTranslations('auditLogs');
  const tc = useTranslations('common');

  const actionOptions = [
    { value: '', label: t('actionAll') },
    { value: 'CREATE', label: t('actionCreate') },
    { value: 'UPDATE', label: t('actionUpdate') },
    { value: 'DELETE', label: t('actionDelete') },
    { value: 'LOGIN', label: t('actionLogin') },
    { value: 'LOGOUT', label: t('actionLogout') },
  ];

  const entityOptions = [
    { value: '', label: t('entityAll') },
    { value: 'USER', label: t('entityUser') },
    { value: 'TOUR', label: t('entityTour') },
    { value: 'BOOKING', label: t('entityBooking') },
    { value: 'PAYMENT', label: t('entityPayment') },
    { value: 'PROMOTION', label: t('entityPromotion') },
    { value: 'REVIEW', label: t('entityReview') },
  ];

  const roleOptions = [
    { value: '', label: t('roleAll') },
    { value: 'ADMIN', label: t('roleAdmin') },
    { value: 'OPERATOR', label: t('roleOperator') },
    { value: 'SUPPLIER', label: t('roleSupplier') },
    { value: 'CUSTOMER', label: t('roleCustomer') },
  ];

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        pageSize: '20',
      };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityType = entityFilter;
      if (roleFilter) params.actorRole = roleFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await auditLogsApi.listLogs(params);
      setLogs(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, actionFilter, entityFilter, roleFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const openDetailModal = async (log: AuditLog) => {
    try {
      const fullLog = await auditLogsApi.getLogById(log.id);
      setSelectedLog(fullLog);
    } catch {
      setSelectedLog(log);
    }
    setIsDetailModalOpen(true);
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
      CREATE: 'success',
      UPDATE: 'info',
      DELETE: 'danger',
      LOGIN: 'default',
      LOGOUT: 'default',
    };
    return <Badge variant={variants[action] || 'default'}>{action}</Badge>;
  };

  const columns = [
    {
      key: 'action',
      header: t('colAction'),
      render: (log: AuditLog) => getActionBadge(log.action),
    },
    {
      key: 'entityType',
      header: t('colEntity'),
      render: (log: AuditLog) => (
        <div>
          <p className="font-medium">{log.entityType}</p>
          {log.entityId && (
            <p className="truncate text-xs text-gray-500">{log.entityId}</p>
          )}
        </div>
      ),
    },
    {
      key: 'actor',
      header: t('colActor'),
      render: (log: AuditLog) => (
        <div>
          {log.actorUserId ? (
            <>
              <p className="truncate text-sm">{log.actorUserId}</p>
              {log.actorRole && (
                <Badge variant="default">{log.actorRole}</Badge>
              )}
            </>
          ) : (
            <span className="text-gray-500">{t('actorSystem')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: t('colIp'),
      render: (log: AuditLog) => log.ipAddress || '-',
    },
    {
      key: 'createdAt',
      header: t('colDate'),
      render: (log: AuditLog) => new Date(log.createdAt).toLocaleString('vi-VN'),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-16',
      render: (log: AuditLog) => (
        <button
          onClick={() => openDetailModal(log)}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="View Details"
        >
          <RiEyeLine className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {t('subtitle')}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={actionOptions}
              wrapperClassName="sm:w-36 sm:flex-shrink-0"
            />
            <Select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={entityOptions}
              wrapperClassName="sm:w-40 sm:flex-shrink-0"
            />
            <Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={roleOptions}
              wrapperClassName="sm:w-36 sm:flex-shrink-0"
            />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              label={tc('dateFrom')}
              wrapperClassName="flex-1"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              label={tc('dateTo')}
              wrapperClassName="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              className="sm:flex-shrink-0"
              onClick={() => {
                setActionFilter('');
                setEntityFilter('');
                setRoleFilter('');
                setDateFrom('');
                setDateTo('');
                setCurrentPage(1);
              }}
            >
              {tc('clearFilters')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={logs}
          keyExtractor={(l) => l.id}
          isLoading={isLoading}
          emptyMessage={t('empty')}
        />
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={20}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={t('detailModalTitle')}
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{t('detailAction')}</p>
                {getActionBadge(selectedLog.action)}
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('detailEntity')}</p>
                <p className="font-medium">{selectedLog.entityType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('detailEntityId')}</p>
                <p className="font-mono text-sm">{selectedLog.entityId || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('detailActor')}</p>
                <p className="font-mono text-sm">{selectedLog.actorUserId || t('actorSystem')}</p>
                {selectedLog.actorRole && (
                  <Badge variant="default">{selectedLog.actorRole}</Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('detailIp')}</p>
                <p>{selectedLog.ipAddress || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('detailDate')}</p>
                <p>{new Date(selectedLog.createdAt).toLocaleString('vi-VN')}</p>
              </div>
            </div>

            {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-500">{t('detailChanges')}</p>
                <pre className="overflow-auto rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800">
                  {JSON.stringify(selectedLog.changes, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
