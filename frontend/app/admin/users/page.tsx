'use client';

import { Badge, UserStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Pagination, Table } from '@/components/ui/table';
import { Toggle } from '@/components/ui/toggle';
import {
    ApiError,
    authApi,
    type CreateUserData,
    type UpdateUserData,
    type User,
    type UserRole
} from '@/lib/api';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { RiAddLine, RiDeleteBinLine, RiLockLine, RiLockUnlockLine, RiMore2Line, RiRefreshLine, RiSearchLine } from 'react-icons/ri';

export default function UsersPage() {
  const t = useTranslations('users');
  const tc = useTranslations('common');

  const roleOptions = [
    { value: '', label: t('roleAll') },
    { value: 'CUSTOMER', label: t('roleCustomer') },
    { value: 'SUPPLIER_ADMIN', label: t('roleSupplierAdmin') },
    { value: 'SUPPLIER_STAFF', label: t('roleSupplierStaff') },
    { value: 'OPERATOR', label: t('roleOperator') },
    { value: 'ADMIN', label: t('roleAdmin') },
  ];

  const statusOptions = [
    { value: '', label: t('statusAll') },
    { value: 'ACTIVE', label: t('statusActive') },
    { value: 'PENDING', label: t('statusPending') },
    { value: 'SUSPENDED', label: t('statusSuspended') },
    { value: 'DELETED', label: t('statusDeleted') },
  ];

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'lock' | 'unlock' | 'delete' | 'restore' | 'resetPassword' | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    roles: ['CUSTOMER'],
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        pageSize: '10',
      };
      if (search) params.q = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      if (includeDeleted) params.includeDeleted = 'true';

      const response = await authApi.listUsers(params);
      setUsers(response.data || []);
      setTotalPages(response.meta?.totalPages || 1);
      setTotalItems(response.meta?.total || 0);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, roleFilter, statusFilter, includeDeleted]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  const openCreateModal = () => {
    setFormData({ email: '', password: '', firstName: '', lastName: '', roles: ['CUSTOMER'] });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      roles: user.roles.map((r) => typeof r === 'string' ? r : r.role),
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const openActionModal = (user: User, action: typeof actionType) => {
    setSelectedUser(user);
    setActionType(action);
    setActionReason('');
    setNewPassword('');
    setIsActionModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      await authApi.createUser(formData);
      setIsCreateModalOpen(false);
      fetchUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError((err.data as { message?: string })?.message || t('createError'));
      } else {
        setFormError(tc('errorGeneric'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setFormError('');
    setIsSubmitting(true);

    try {
      const updateData: UpdateUserData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        roles: formData.roles,
      };
      await authApi.updateUser(selectedUser.id, updateData);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError((err.data as { message?: string })?.message || t('updateError'));
      } else {
        setFormError(tc('errorGeneric'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserAction = async () => {
    if (!selectedUser || !actionType) return;

    setIsSubmitting(true);
    try {
      switch (actionType) {
        case 'lock':
          await authApi.lockUser(selectedUser.id, actionReason);
          break;
        case 'unlock':
          await authApi.unlockUser(selectedUser.id, actionReason);
          break;
        case 'delete':
          await authApi.deleteUser(selectedUser.id, actionReason);
          break;
        case 'restore':
          await authApi.restoreUser(selectedUser.id, actionReason);
          break;
        case 'resetPassword':
          await authApi.resetUserPassword(selectedUser.id, newPassword);
          break;
      }
      setIsActionModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'email',
      header: 'Email',
      render: (user: User) => (
        <div>
          <p className="font-medium">{user.email}</p>
          <p className="text-xs text-gray-500">
            {user.firstName || user.lastName
              ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
              : '-'}
          </p>
        </div>
      ),
    },
    {
      key: 'roles',
      header: t('labelRole'),
      render: (user: User) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((r) => {
            const roleValue = typeof r === 'string' ? r : r.role;
            return (
              <Badge key={roleValue} variant="info">
                {roleValue}
              </Badge>
            );
          })}
        </div>
      ),
    },
    {
      key: 'status',
      header: tc('status'),
      render: (user: User) => <UserStatusBadge status={user.status} />,
    },
    {
      key: 'createdAt',
      header: t('colJoined'),
      render: (user: User) => new Date(user.createdAt).toLocaleDateString('vi-VN'),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (user: User) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(user);
            }}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={t('tooltipEdit')}
          >
            <RiMore2Line className="h-4 w-4" />
          </button>
          {user.status === 'ACTIVE' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openActionModal(user, 'lock');
              }}
              className="rounded p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              title={t('tooltipLock')}
            >
              <RiLockLine className="h-4 w-4" />
            </button>
          )}
          {user.status === 'SUSPENDED' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openActionModal(user, 'unlock');
              }}
              className="rounded p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
              title={t('tooltipUnlock')}
            >
              <RiLockUnlockLine className="h-4 w-4" />
            </button>
          )}
          {user.status !== 'DELETED' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openActionModal(user, 'delete');
              }}
              className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              title={t('tooltipDelete')}
            >
              <RiDeleteBinLine className="h-4 w-4" />
            </button>
          )}
          {user.status === 'DELETED' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openActionModal(user, 'restore');
              }}
              className="rounded p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              title={t('tooltipRestore')}
            >
              <RiRefreshLine className="h-4 w-4" />
            </button>
          )}
        </div>
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
        <Button onClick={openCreateModal}>
          <RiAddLine className="h-5 w-5" />
          {t('addButton')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <RiSearchLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pl-10"
            />
          </div>
          <Select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={roleOptions}
            wrapperClassName="sm:w-40 sm:flex-shrink-0"
          />
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            options={statusOptions}
            wrapperClassName="sm:w-40 sm:flex-shrink-0"
          />
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            <Toggle
              checked={includeDeleted}
              onChange={(checked) => {
                setIncludeDeleted(checked);
                setCurrentPage(1);
              }}
              size="sm"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{tc('showDeleted')}</span>
          </div>
          <Button type="submit" variant="secondary" className="sm:flex-shrink-0">
            {tc('search')}
          </Button>
        </form>
      </Card>

      {/* Table */}
      <Card padding="none">
        <Table
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          isLoading={isLoading}
            emptyMessage={t('empty')}
          onRowClick={openEditModal}
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
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('createModalTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleCreateUser} isLoading={isSubmitting}>
              {tc('create')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {formError}
            </div>
          )}
          <Input
            label={t('labelEmail')}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label={t('labelPassword')}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('labelFirstName')}
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <Input
              label={t('labelLastName')}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          <Select
            label={t('labelRole')}
            value={formData.roles?.[0] || 'CUSTOMER'}
            onChange={(e) => setFormData({ ...formData, roles: [e.target.value as UserRole] })}
            options={roleOptions.slice(1)}
          />
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t('editModalTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                openActionModal(selectedUser!, 'resetPassword');
              }}
            >
              {t('resetPasswordButton')}
            </Button>
            <Button onClick={handleUpdateUser} isLoading={isSubmitting}>
              {tc('saveChanges')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {formError}
            </div>
          )}
          <Input label={t('labelEmail')} value={formData.email} disabled />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('labelFirstName')}
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <Input
              label={t('labelLastName')}
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          <Select
            label={t('labelRole')}
            value={formData.roles?.[0] || 'CUSTOMER'}
            onChange={(e) => setFormData({ ...formData, roles: [e.target.value as UserRole] })}
            options={roleOptions.slice(1)}
          />
        </form>
      </Modal>

      {/* Action Modal */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        title={
          actionType === 'lock'
            ? t('lockTitle')
            : actionType === 'unlock'
              ? t('unlockTitle')
              : actionType === 'delete'
                ? t('deleteTitle')
                : actionType === 'restore'
                  ? t('restoreTitle')
                  : t('resetPasswordTitle')
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsActionModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              variant={actionType === 'delete' ? 'danger' : 'primary'}
              onClick={handleUserAction}
              isLoading={isSubmitting}
            >
              {tc('confirm')}
            </Button>
          </>
        }
      >
        {actionType === 'resetPassword' ? (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              {t.rich('resetPasswordPrompt', { email: selectedUser?.email ?? '', strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
            <Input
              label={t('newPasswordLabel')}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              {actionType === 'lock' && t.rich('lockConfirm', { email: selectedUser?.email ?? '', strong: (chunks) => <strong>{chunks}</strong> })}
              {actionType === 'unlock' && t.rich('unlockConfirm', { email: selectedUser?.email ?? '', strong: (chunks) => <strong>{chunks}</strong> })}
              {actionType === 'delete' && t.rich('deleteConfirm', { email: selectedUser?.email ?? '', strong: (chunks) => <strong>{chunks}</strong> })}
              {actionType === 'restore' && t.rich('restoreConfirm', { email: selectedUser?.email ?? '', strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
            <Input
              label={t('reasonLabel')}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder={t('reasonPlaceholder')}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
