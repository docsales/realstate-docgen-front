import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  isLoading, 
  disabled,
  ...props 
}) => {
  const baseStyle = "btn btn-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "btn btn-primary text-md text-white shadow-md hover:shadow-lg",
    secondary: "btn bg-white border border-slate-300 text-md text-slate-600 hover:bg-slate-100 shadow-md hover:shadow-lg",
    tertiary: "btn btn-secondary text-md text-white hover:bg-secondary/90 shadow-md hover:shadow-lg",
    danger: "btn btn-error text-md text-white hover:bg-danger/90 shadow-md hover:shadow-lg",
    ghost: "btn btn-ghost text-md text-slate-600 hover:bg-slate-100"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="loading loading-spinner loading-sm"></span>
          <span>Processando...</span>
        </>
      ) : children}
    </button>
  );
};