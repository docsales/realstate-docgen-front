import React from 'react';
import { AlertTriangle, Ban, AlertCircle, Clock, Info } from 'lucide-react';
import type { Alert } from '@/types/checklist.types';

interface AlertBannerProps {
  alerts: Alert[];
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, className = '' }) => {
  if (alerts.length === 0) {
    return null;
  }

  const getAlertStyle = (tipo: Alert['tipo']) => {
    switch (tipo) {
      case 'BLOQUEIO':
        return {
          container: 'bg-red-100 border-red-300 text-red-900',
          icon: Ban,
          iconColor: 'text-red-600'
        };
      case 'CRITICO':
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          icon: AlertTriangle,
          iconColor: 'text-red-600'
        };
      case 'ATENCAO':
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-900',
          icon: AlertCircle,
          iconColor: 'text-yellow-600'
        };
      case 'PRAZO':
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-900',
          icon: Clock,
          iconColor: 'text-blue-600'
        };
      case 'INFO':
      default:
        return {
          container: 'bg-slate-50 border-slate-200 text-slate-700',
          icon: Info,
          iconColor: 'text-slate-500'
        };
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {alerts.map((alert, index) => {
        const style = getAlertStyle(alert.tipo);
        const IconComponent = style.icon;

        return (
          <div
            key={index}
            className={`${style.container} border rounded-lg p-4 flex items-start gap-3 animate-in fade-in`}
          >
            <IconComponent className={`w-5 h-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm uppercase tracking-wide">
                  {alert.tipo}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{alert.mensagem}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};



