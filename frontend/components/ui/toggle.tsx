'use client';

import { forwardRef } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onChange, disabled = false, label, description, size = 'md' }, ref) => {
    const sizes = {
      sm: { track: 'h-5 w-9', thumb: 'h-3 w-3', translate: 'translate-x-4' },
      md: { track: 'h-6 w-11', thumb: 'h-4 w-4', translate: 'translate-x-5' },
      lg: { track: 'h-7 w-14', thumb: 'h-5 w-5', translate: 'translate-x-7' },
    };

    const { track, thumb, translate } = sizes[size];

    const handleClick = () => {
      if (!disabled) {
        onChange(!checked);
      }
    };

    const toggle = (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        className={`relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${track} ${
          checked
            ? 'bg-blue-600'
            : 'bg-gray-200 dark:bg-gray-700'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block transform rounded-full bg-white shadow transition-transform ${thumb} ${
            checked ? translate : 'translate-x-1'
          }`}
        />
      </button>
    );

    if (label || description) {
      return (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {label && (
              <p className="font-medium text-gray-900 dark:text-white">{label}</p>
            )}
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
          {toggle}
        </div>
      );
    }

    return toggle;
  }
);

Toggle.displayName = 'Toggle';
