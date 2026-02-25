
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FileText, Cpu, BrainCircuit } from 'lucide-react';

interface IAMappingLoaderProps {
  stage: 'fetching' | 'mapping' | 'applying';
}

export const IAMappingLoader: React.FC<IAMappingLoaderProps> = ({ stage }) => {
  const stages = {
    fetching: {
      icon: <FileText className="w-6 h-6 text-blue-500" />,
      text: "Lendo estrutura do template...",
      color: "from-blue-500 to-cyan-400"
    },
    mapping: {
      icon: <BrainCircuit className="w-6 h-6 text-purple-500" />,
      text: "IA analisando correspondências...",
      color: "from-purple-600 to-pink-500"
    },
    applying: {
      icon: <Sparkles className="w-6 h-6 text-amber-500" />,
      text: "Finalizando pré-mapeamento...",
      color: "from-amber-500 to-orange-400"
    }
  };

  const current = stages[stage];

  return (
    <div className="flex flex-col items-center justify-center p-4 text-center overflow-hidden h-full min-h-[450px]">
      <div className="relative w-48 h-64 mb-6 bg-white rounded-xl border-2 border-slate-100 shadow-xl flex flex-col p-3 overflow-hidden">
        {/* Simulação de Documento */}
        <div className="w-full h-3 bg-slate-100 rounded mb-3" />
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex gap-2">
              <div className="w-1/3 h-1.5 bg-slate-50 rounded" />
              <div className="flex-1 h-1.5 bg-slate-100 rounded relative overflow-hidden">
                {stage !== 'fetching' && (
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Linha de Scanner Laser */}
        {stage === 'mapping' && (
          <motion.div
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_10px_rgba(168,85,247,0.4)] z-20"
          />
        )}

        {/* Overlay de Brilho IA */}
        <AnimatePresence>
          {stage === 'mapping' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-purple-500/5 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Partículas flutuantes */}
        {stage !== 'fetching' && (
          <div className="absolute inset-0 pointer-events-none">
            {[1, 2, 3, 4].map((p) => (
              <motion.div
                key={p}
                animate={{
                  y: [-10, -80],
                  x: [0, (p % 2 === 0 ? 15 : -15)],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: p * 0.5,
                  ease: "easeOut"
                }}
                className="absolute bottom-0 left-1/2 w-1 h-1 bg-purple-400 rounded-full"
                style={{ left: `${25 + p * 15}%` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Texto e Status */}
      <div className="relative z-10">
        <motion.div
          key={stage}
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="p-2.5 bg-white rounded-full shadow-md border border-slate-100 ring-2 ring-slate-50/50">
            {current.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">{current.text}</h3>
            <div className="flex items-center justify-center gap-1">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className={`w-1 h-1 rounded-full bg-gradient-to-r ${current.color}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

