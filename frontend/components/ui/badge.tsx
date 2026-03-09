import { type ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  success:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  danger:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  info:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  purple:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// Status badge helpers
export function UserStatusBadge({ status }: { status: string }) {
  const variants: Record<string, BadgeVariant> = {
    ACTIVE: 'success',
    PENDING: 'warning',
    SUSPENDED: 'danger',
    DELETED: 'default',
  };
  return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
}

export function TourStatusBadge({ status }: { status: string }) {
  const variants: Record<string, BadgeVariant> = {
    PUBLISHED: 'success',
    DRAFT: 'warning',
    PAUSED: 'info',
    ARCHIVED: 'default',
  };
  return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
}

export function BookingStatusBadge({ status }: { status: string }) {
  const variants: Record<string, BadgeVariant> = {
    CONFIRMED: 'success',
    PENDING_PAYMENT: 'warning',
    INITIATED: 'info',
    CANCELLED_BY_CUSTOMER: 'danger',
    CANCELLED_BY_OPERATOR: 'danger',
    FAILED: 'danger',
    EXPIRED: 'default',
    REFUNDED_PARTIAL: 'purple',
    REFUNDED_FULL: 'purple',
  };
  return <Badge variant={variants[status] || 'default'}>{status.replace(/_/g, ' ')}</Badge>;
}

export function ReviewStatusBadge({ status }: { status: string }) {
  const variants: Record<string, BadgeVariant> = {
    PUBLISHED: 'success',
    PENDING: 'warning',
    HIDDEN: 'default',
    REJECTED: 'danger',
  };
  return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
}

export function BlogStatusBadge({ status }: { status: string }) {
  const variants: Record<string, BadgeVariant> = {
    PUBLISHED: 'success',
    DRAFT: 'warning',
    REVIEW: 'info',
    ARCHIVED: 'default',
  };
  return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
}
