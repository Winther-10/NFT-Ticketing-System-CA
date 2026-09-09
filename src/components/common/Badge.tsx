import React from 'react';

export interface BadgeProps {
  variant? : 'default' | 'success' | 'warning' | 'error' | 'gold';
  children : React.ReactNode;
  className? : string;
}

export const Badge : React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = ''
}) => {
  const variantStyles = {
    default : 'bg-slate-100 text-slate-700 border-slate-200',
    success : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning : 'bg-amber-50 text-amber-700 border-amber-200',
    error : 'bg-rose-50 text-rose-700 border-rose-200',
    gold : 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
