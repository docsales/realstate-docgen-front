
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Send, Mail } from 'lucide-react';
import { Button } from '@/components/Button';
import type { DealConfig, Signatory, UploadedFile, MappingValue, OcrDataByPerson } from '@/types/types';
import { MOCK_OCR_DATA_BY_PERSON, createDefaultPerson } from '@/types/types';
import { ConfigStep } from './steps/ConfigStep';
import { DocumentsStep } from './steps/DocumentsStep';
import { MappingStep } from './steps/MappingStep';
import { PreviewStep } from './steps/PreviewStep';
import { SignatoriesStep } from './steps/SignatoriesStep';

export const NewDealWizard: React.FC<{ onCancel: () => void, onFinish: () => void }> = ({ onCancel, onFinish }) => {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [submissionStatus, setSubmissionStatus] = useState<'editing' | 'sending' | 'success'>('editing');

  // -- Lifted State --
  const [configData, setConfigData] = useState<DealConfig>({
    name: '',
    contractModel: 'venda_compra_padrao',
    useFgts: false,
    bankFinancing: false,
    consortiumLetter: false,
    sellers: [createDefaultPerson('default-seller-1')],
    buyers: [createDefaultPerson('default-buyer-1')],
    propertyState: 'quitado',
    propertyType: 'urbano',
    deedCount: 1,
  });
  const [documents, setDocuments] = useState<UploadedFile[]>([]);
  const [mappings, setMappings] = useState<Record<string, MappingValue>>({});
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [ocrData, setOcrData] = useState<OcrDataByPerson[]>(MOCK_OCR_DATA_BY_PERSON);

  // -- Validation Logic --
  const isStepValid = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 1: // Config
        return configData.name.trim().length > 0 && 
               configData.sellers.length > 0 && 
               configData.buyers.length > 0;
      case 2: // Documents
        return documents.length > 0;
      case 3: // Mapping
        // Require at least one mapping to proceed
        return Object.keys(mappings).length > 0;
      case 4: // Preview
        return true; // Review step is always valid
      case 5: // Signatories
        return signatories.length > 0;
      default:
        return false;
    }
  };

  const titles = ["Configurações", "Documentos", "Mapear Dados", "Preview", "Signatários"];

  const nextStep = () => {
    if (!isStepValid(step)) return; // Prevent advance if invalid
    setDirection(1);
    setStep(s => Math.min(s + 1, 5));
  }

  const prevStep = () => {
    setDirection(-1);
    setStep(s => Math.max(s - 1, 1));
  }

  const handleFinish = () => {
    if (!isStepValid(step)) return;

    setSubmissionStatus('sending');

    // Sequence: Sending -> Success -> Redirect
    setTimeout(() => {
      setSubmissionStatus('success');
      setTimeout(() => {
        onFinish();
      }, 2500); // Wait on success screen before redirecting
    }, 3000); // Sending duration
  }

  const handleStepperClick = (targetStep: number) => {
    // Logic: Can always go back. 
    // Can only go forward to 'targetStep' if all steps strictly before 'targetStep' are valid.

    if (targetStep < step) {
      // Going back is always allowed
      setDirection(-1);
      setStep(targetStep);
    } else {
      // Going forward: Check all intermediate steps
      let canProceed = true;
      for (let i = 1; i < targetStep; i++) {
        if (!isStepValid(i)) {
          canProceed = false;
          break;
        }
      }

      if (canProceed) {
        setDirection(1);
        setStep(targetStep);
      }
    }
  }

  if (submissionStatus !== 'editing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <AnimatePresence mode="wait">
          {submissionStatus === 'sending' && (
            <motion.div
              key="sending"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <Mail className="absolute inset-0 m-auto text-primary w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Enviando Contrato...</h2>
                <p className="text-slate-500 mt-2">Disparando emails para os signatários</p>
              </div>
            </motion.div>
          )}

          {submissionStatus === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-100">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-800">Sucesso!</h2>
                <p className="text-slate-500 mt-2 text-lg">Documento enviado para assinatura.</p>
              </div>
              <p className="text-sm text-slate-400 animate-pulse">Redirecionando...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const currentStepValid = isStepValid(step);

  return (
    <div className="min-h-full flex flex-col relative">
      {/* Header Stepper - Sticky below Navbar (top-16) */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="font-bold text-slate-800 leading-tight">Novo Contrato</h2>
              <p className="text-xs text-slate-500">Etapa {step}: {titles[step - 1]}</p>
            </div>
          </div>

          {/* Steps Indicator */}
          <div className="hidden md:flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(s => {
              // Calculate if this specific step button should be clickable/valid
              let isValidUpToHere = true;
              for (let i = 1; i < s; i++) { if (!isStepValid(i)) isValidUpToHere = false; }

              return (
                <div key={s} className="flex items-center">
                  <button
                    onClick={() => handleStepperClick(s)}
                    disabled={!isValidUpToHere && s > step}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all 
                               ${step === s ? 'bg-primary text-white shadow-lg scale-110 ring-2 ring-blue-100 cursor-default' :
                        step > s ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600' :
                          (!isValidUpToHere ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-pointer hover:bg-slate-200')
                      }`}>
                    {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                  </button>
                  {s < 5 && <div className={`w-8 h-1 mx-2 rounded ${step > s ? 'bg-green-500' : 'bg-slate-100'}`} />}
                </div>
              )
            })}
          </div>

          <div className="w-10">
            {/* Spacer to balance layout */}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-slate-50 p-6">
        <div className="max-w-6xl mx-auto pb-20">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ x: direction * 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -50, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {step === 1 && (
                <ConfigStep
                  data={configData}
                  onChange={d => setConfigData(prev => ({ ...prev, ...d }))}
                />
              )}
              {step === 2 && (
                <DocumentsStep
                  config={configData}
                  files={documents}
                  onFilesChange={setDocuments}
                  onNext={nextStep}
                  onAnalysisComplete={(data) => setOcrData(data)}
                />
              )}
              {step === 3 && (
                <MappingStep
                  mappings={mappings}
                  onMap={(fieldId, value, source) => {
                    if (value === '') {
                      // Remove mapping if value is empty
                      setMappings(prev => {
                        const newMappings = { ...prev };
                        delete newMappings[fieldId];
                        return newMappings;
                      });
                    } else {
                      // Add or update mapping
                      setMappings(prev => ({ 
                        ...prev, 
                        [fieldId]: { value, source } 
                      }));
                    }
                  }}
                  dealConfig={configData}
                  ocrData={ocrData}
                />
              )}
              {step === 4 && (
                <PreviewStep
                  dealName={configData.name}
                  mappedCount={Object.keys(mappings).length}
                  onGenerate={nextStep}
                />
              )}
              {step === 5 && (
                <SignatoriesStep
                  signatories={signatories}
                  onChange={setSignatories}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Actions - Fixed at bottom */}
      <div className="bg-white border-t border-slate-200 p-4 fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Button variant="ghost" onClick={step === 1 ? onCancel : prevStep}>
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>

          {/* Button is disabled if current step validation fails */}
          {step !== 2 && step !== 4 && (
            <Button
              onClick={step === 5 ? handleFinish : nextStep}
              disabled={!currentStepValid}
              className={!currentStepValid ? 'opacity-50 grayscale' : ''}
            >
              {step === 5 ? 'Finalizar e Enviar' : 'Continuar'}
              {step !== 5 && <ArrowRight className="w-4 h-4" />}
              {step === 5 && <Send className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
