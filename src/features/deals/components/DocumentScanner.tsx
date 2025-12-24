import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

export const DocumentScanner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Documento estilizado */}
      <div className="relative w-48 h-64 bg-white rounded-lg shadow-xl border-2 border-slate-200 overflow-hidden mb-8">
        {/* Ícone do documento */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
          <FileText className="w-16 h-16 text-slate-300" />
        </div>

        {/* Linhas simulando texto no documento */}
        <div className="absolute top-28 left-6 right-6 space-y-3">
          <div className="h-2 bg-slate-200 rounded w-full"></div>
          <div className="h-2 bg-slate-200 rounded w-5/6"></div>
          <div className="h-2 bg-slate-200 rounded w-4/5"></div>
          <div className="h-2 bg-slate-200 rounded w-full"></div>
          <div className="h-2 bg-slate-200 rounded w-3/4"></div>
        </div>

        {/* Scanner vermelho animado */}
        <motion.div
          className="absolute left-0 right-0 h-1 bg-red-500 shadow-lg shadow-red-500/50"
          style={{
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4)',
          }}
          animate={{
            top: ['0%', '100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Efeito de brilho no scanner */}
        <motion.div
          className="absolute left-0 right-0 h-8 opacity-30"
          style={{
            background: 'linear-gradient(to bottom, rgba(239, 68, 68, 0.3), transparent)',
          }}
          animate={{
            top: ['0%', '100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Texto piscante */}
      <motion.p
        className="text-slate-600 font-medium text-center"
        animate={{
          opacity: [1, 0.3, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        Escaneando documento para buscar variáveis...
      </motion.p>

      {/* Pontos de loading animados */}
      <div className="flex gap-2 mt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-red-500 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
};

