import React from 'react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseStyle = "checkbox border-slate-300 transition-colors duration-200";
  
  const sizeStyles = {
    sm: "checkbox-sm",
    md: "checkbox-md",
    lg: "checkbox-lg"
  };

  const variants = {
    primary: "[--chkbg:#085995] [--chkfg:white] checked:border-[#085995]",
    secondary: "[--chkbg:#ef0474] [--chkfg:white] checked:border-[#ef0474]"
  };

  return (
    <label className="label cursor-pointer flex items-center gap-3 justify-start">
      <input 
        type="checkbox" 
        {...props} 
        className={`${baseStyle} ${sizeStyles[size]} ${variants[variant]} ${className}`} 
      />
      <span className="label-text font-medium text-slate-700">{label}</span>
    </label>
  );
};