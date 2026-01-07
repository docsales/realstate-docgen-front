import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  mask?: 'phone' | 'cep' | null;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', mask, onChange, ...props }) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (mask === 'phone') {
      value = value.replace(/\D/g, '')
        .replace(/^(\d{2})(\d)/g, '($1) $2')
        .replace(/(\d)(\d{4})$/, '$1-$2')
        .slice(0, 15);
    } else if (mask === 'cep') {
      value = value.replace(/\D/g, '')
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .slice(0, 9);
    }
    
    if (onChange) {
      e.target.value = value;
      onChange(e);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <input
        className={`border border-slate-600 rounded-md px-3 py-2 bg-white text-slate-600 placeholder-slate-400 focus:ring-2 focus:ring-[#8592A6] focus:border-transparent outline-none transition-all ${error ? 'border-red-500' : ''} ${className}`}
        onChange={handleChange}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <div className="relative">
        <select
          className={`appearance-none w-full border border-slate-600 rounded-lg px-3 py-2 pr-8 bg-white text-slate-600 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
        </div>
      </div>
    </div>
  );
};

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, ...props }) => {
  return (
    <label className="flex items-center space-x-3 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
      <input 
        type="checkbox" 
        className="form-checkbox h-5 w-5 text-primary rounded border-slate-300 focus:ring-primary" 
        {...props}
      />
      <span className="text-slate-700 font-medium">{label}</span>
    </label>
  );
};