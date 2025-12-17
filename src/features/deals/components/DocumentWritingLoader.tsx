import React from 'react';
import { Pen } from 'lucide-react';

interface DocumentWritingLoaderProps {
  title?: string;
  description?: string;
}

export const DocumentWritingLoader: React.FC<DocumentWritingLoaderProps> = ({
  title = "Redigindo seu Contrato...",
  description = "O sistema está aplicando as variáveis no modelo e organizando o documento."
}) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
      {/* Document Writing Animation */}
      <div className="relative w-32 h-40 bg-white rounded-lg border-2 border-slate-200 shadow-md p-4 overflow-hidden">
        {/* Text Lines Animation */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className="h-1.5 bg-slate-100 rounded-full relative overflow-hidden"
            >
              <div 
                className="absolute inset-0 bg-primary/30" 
                style={{
                  width: '0%',
                  animation: `writing-line 2.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.4}s`
                }}
              />
            </div>
          ))}
        </div>

        {/* Pencil/Pen Icon Animation */}
        <div className="absolute top-4 right-4">
          <Pen 
            className="w-6 h-6 text-primary" 
            style={{
              animation: 'writing-hand 2.5s ease-in-out infinite'
            }}
          />
        </div>
      </div>

      <div className="text-center space-y-2 max-w-xs">
        <h3 className="text-xl font-bold text-slate-800 animate-pulse">{title}</h3>
        <p className="text-slate-500 text-sm">{description}</p>
      </div>

      {/* Custom Animations Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes writing-line {
          0% { width: 0%; opacity: 0; }
          20% { opacity: 1; }
          80% { width: 100%; opacity: 1; }
          100% { width: 100%; opacity: 0; }
        }
        @keyframes writing-hand {
          0% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(-15px, 10px) rotate(-10deg); }
          40% { transform: translate(0, 20px) rotate(0deg); }
          60% { transform: translate(-15px, 30px) rotate(-10deg); }
          80% { transform: translate(0, 40px) rotate(0deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
      `}} />
    </div>
  );
};

