import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant? : 'primary' | 'secondary' | 'outline' | 'gold' | 'danger';
  size? : 'sm' | 'md' | 'lg';
  loading? : boolean;
  debounceTimeMs? : number;
  icon? : React.ReactNode;
}

export const Button : React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  debounceTimeMs = 800,
  icon,
  children,
  onClick,
  className = '',
  ...props
}) => {
  const [isDebouncing, setIsDebouncing] = useState(false);

  const handleClick = (e : React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading || isDebouncing) {
      e.preventDefault();
      return;
    }

    if (debounceTimeMs > 0) {
      setIsDebouncing(true);
      setTimeout(() => setIsDebouncing(false), debounceTimeMs);
    }

    if (onClick) {
      onClick(e);
    }
  };

  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm';

  const sizeStyles = {
    sm : 'px-3 py-1.5 text-xs',
    md : 'px-4 py-2 text-sm',
    lg : 'px-6 py-3 text-base'
  };

  const variantStyles = {
    primary :
      'bg-[#002d62] text-white hover:bg-[#001b3a] focus:ring-[#002d62]',
    secondary :
      'bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-300',
    outline :
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400',
    gold :
      'bg-[#c59b27] text-white hover:bg-[#ab8219] focus:ring-[#c59b27]',
    danger :
      'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500'
  };

  const isDisabled = disabled || loading || isDebouncing;

  return (
    <button
      {...props}
      disabled={isDisabled}
      onClick={handleClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className='w-4 h-4 mr-2 animate-spin' />
          <span>กำลังประมวลผล...</span>
        </>
      ) : (
        <>
          {icon && <span className='mr-2 inline-flex items-center'>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
