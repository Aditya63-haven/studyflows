import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'warning' | 'danger' | 'success';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  small?: boolean;
  children: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: '',
  secondary: 'secondary',
  warning: 'warning',
  danger: 'danger',
  success: 'success',
};

export const Button = ({
  variant = 'primary',
  small = false,
  className,
  children,
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    className={['button', variantClass[variant], small ? 'small' : '', className ?? '']
      .filter(Boolean)
      .join(' ')}
    {...rest}
  >
    {children}
  </button>
);
