import React from 'react';
import { motion } from 'framer-motion';
import { Send, Cloud } from 'lucide-react';

interface ContractSendingLoaderProps {
  title?: string;
  description?: string;
}

export const ContractSendingLoader: React.FC<ContractSendingLoaderProps> = ({
  title = "Enviando Contrato...",
  description = "Disparando emails para os signatários e preparando a coleta de assinaturas."
}) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-10 py-12">
      {/* Animation Container */}
      <div className="relative w-64 h-32 flex items-center justify-center">
        
        {/* Background Clouds/Particles for depth */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: -150, opacity: [0, 0.2, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 right-0 text-slate-200"
        >
          <Cloud className="w-12 h-12" />
        </motion.div>
        
        <motion.div
          initial={{ x: 150, opacity: 0 }}
          animate={{ x: -100, opacity: [0, 0.15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 1 }}
          className="absolute bottom-4 right-0 text-slate-200"
        >
          <Cloud className="w-8 h-8" />
        </motion.div>

        {/* Trajectory Path (Dotted Line) */}
        <svg className="absolute w-full h-full" viewBox="0 0 256 128">
          <motion.path
            d="M 20 80 Q 128 10 236 80"
            fill="transparent"
            stroke="url(#gradient)"
            strokeWidth="2"
            strokeDasharray="4 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
          </defs>
        </svg>

        {/* The Paper Airplane (Send Icon) */}
        <motion.div
          animate={{
            x: [-100, 100],
            y: [20, -40, 20],
            rotate: [15, -15, 15],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative z-10"
        >
          <div className="bg-primary p-4 rounded-full shadow-xl shadow-blue-100">
            <Send className="w-8 h-8 text-white" />
          </div>
          
          {/* Engine Glow/Trail */}
          <motion.div 
            animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute -bottom-1 -left-1 w-10 h-10 bg-primary/20 rounded-full blur-xl"
          />
        </motion.div>
      </div>

      <div className="text-center space-y-3 max-w-md px-6">
        <motion.h2 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-3xl font-black text-slate-800 tracking-tight"
        >
          {title}
        </motion.h2>
        <p className="text-slate-500 text-lg leading-relaxed font-medium">
          {description}
        </p>
      </div>
    </div>
  );
};

