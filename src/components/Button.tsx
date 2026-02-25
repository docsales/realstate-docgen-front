import { type FC, type ReactNode, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button: FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading,
  disabled,
  ...props
}) => {
  const baseStyle = "btn btn-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizeStyles = {
    sm: "btn btn-sm",
    md: "btn btn-md",
    lg: "btn btn-lg"
  };
  const variants = {
    primary: "btn bg-[#085995] border-[#085995] text-md text-white shadow-md hover:shadow-lg hover:bg-[#085995]/90 transition-colors duration-200",
    secondary: "btn bg-white border border-slate-300 text-md text-slate-600 hover:bg-slate-100 shadow-md hover:shadow-lg hover:bg-slate-100 transition-colors duration-200",
    tertiary: "btn btn-secondary border-[#ef0474] text-md text-white hover:bg-[#ef0474]/90 shadow-md hover:shadow-lg hover:bg-[#ef0474]/90 transition-colors duration-200",
    danger: "btn btn-error border-[#ef0474] text-md text-white hover:bg-[#ef0474]/90 shadow-md hover:shadow-lg hover:bg-[#ef0474]/90 transition-colors duration-200",
    ghost: "btn btn-ghost border-transparent text-md text-slate-600 hover:bg-slate-100 hover:bg-slate-100 transition-colors duration-200",
    link: "btn btn-link border-transparent text-md text-primary no-underline hover:text-primary/80 hover:bg-transparent transition-colors duration-200"
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizeStyles[size]} ${className}`}
      disabled={isLoading || disabled}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="loading loading-spinner loading-sm" aria-hidden="true" />
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};