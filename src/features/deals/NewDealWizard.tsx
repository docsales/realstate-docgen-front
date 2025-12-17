
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Send, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/Button';
import type { DealConfig, Signatory, UploadedFile, MappingValue, OcrDataByPerson } from '@/types/types';
import { createDefaultPerson } from '@/types/types';
import { ConfigStep } from './steps/ConfigStep';
import { DocumentsStep } from './steps/DocumentsStep';
import { MappingStep } from './steps/MappingStep';
import { PreviewStep } from './steps/PreviewStep';
import { SignatoriesStep } from './steps/SignatoriesStep';
import { useCreateDeal, useDeal, useUpdateDeal, useSendContract } from './hooks/useDeals';
import { ContractSendingLoader } from './components/ContractSendingLoader';

interface NewDealWizardProps {
  onCancel: () => void;
  onFinish: () => void;
  dealId?: string; // Se fornecido, é modo de edição
}

export const NewDealWizard: React.FC<NewDealWizardProps> = ({ onCancel, onFinish, dealId: editDealId }) => {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [submissionStatus, setSubmissionStatus] = useState<'editing' | 'sending' | 'success'>('editing');
  const [dealId, setDealId] = useState<string | null>(editDealId || null);
  const [isLoadingDeal, setIsLoadingDeal] = useState(!!editDealId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const createDealMutation = useCreateDeal();
  const updateDealMutation = useUpdateDeal();
  const sendContractMutation = useSendContract();

  // TODO: Get ownerId from auth session
  const { data: existingDeal, isLoading: isDealLoading } = useDeal(editDealId || '', '00000000-0000-0000-0000-000000000001', {
    enabled: !!editDealId,
  });

  // -- Lifted State --
  const [configData, setConfigData] = useState<DealConfig>({
    name: '',
    docTemplateId: '1zPOguNqO2UmM7pS4ZkCWlhcG5kXLZChRFOiow-RTJZM', // Financiamento (Google Drive ID)
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
  const [ocrData, setOcrData] = useState<OcrDataByPerson[]>([]);

  useEffect(() => {
    if (existingDeal && editDealId) {
      if (existingDeal.name) {
        setConfigData(prev => ({
          ...prev,
          name: existingDeal.name || '',
          docTemplateId: existingDeal.docTemplateId || prev.docTemplateId,
          ...(existingDeal.metadata || {}),
        }));
      }

      if (existingDeal.signers && existingDeal.signers.length > 0) {
        setSignatories(existingDeal.signers.map(signer => ({
          id: signer.id,
          name: signer.name,
          email: signer.email,
          phoneNumber: signer.phoneNumber || '',
          role: signer.role as any,
          signingOrder: signer.signingOrder,
        })));
      }

      // Carregar contractFields nos mappings
      if (existingDeal.contractFields) {
        const contractFieldsData = typeof existingDeal.contractFields === 'string'
          ? JSON.parse(existingDeal.contractFields)
          : existingDeal.contractFields;

        const loadedMappings: Record<string, MappingValue> = {};
        Object.entries(contractFieldsData).forEach(([fieldId, value]) => {
          if (typeof value === 'string') {
            loadedMappings[fieldId] = {
              value: value,
              source: 'manual', // Default to manual for loaded data
            };
          }
        });

        if (Object.keys(loadedMappings).length > 0) {
          setMappings(loadedMappings);
        }
      }

      if (existingDeal.documents && existingDeal.documents.length > 0) {
        const loadedFiles: UploadedFile[] = existingDeal.documents.map((doc: any) => {
          const fileName = doc.originalFilename || 'documento.pdf';
          const fileSize = doc.fileSize || 1024 * 100;
          const mockBlob = new Blob([''], { type: doc.mimeType || 'application/pdf' });

          const mockFile = new File([mockBlob], fileName, {
            type: doc.mimeType || 'application/pdf',
          });

          Object.defineProperty(mockFile, 'size', {
            value: fileSize,
            writable: false
          });

          const ocrStatus = doc.status === 'EXTRACTED' ? 'completed' :
            doc.status === 'OCR_PROCESSING' ? 'processing' :
              doc.status === 'OCR_DONE' ? 'completed' :
                doc.status === 'ERROR' ? 'error' : 'idle';

          return {
            id: doc.id,
            file: mockFile,
            type: doc.documentType || 'UNKNOWN',
            category: (doc.category || 'property') as 'buyers' | 'sellers' | 'property',
            personId: doc.personId || undefined,
            validated: doc.status === 'EXTRACTED',
            ocrStatus: ocrStatus as any,
            ocrWhisperHash: doc.whisperHash,
            ocrExtractedData: doc.variables,
            ocrError: doc.status === 'ERROR' ? 'Erro no processamento' : undefined,
          };
        });

        setDocuments(loadedFiles);
        const ocrDataMap = new Map<string, any>();

        existingDeal.documents
          .filter((doc: any) => doc.variables)
          .forEach((doc: any) => {
            const personId = doc.personId || 'property';
            const docData = doc.variables && typeof doc.variables === 'string'
              ? JSON.parse(doc.variables)
              : doc.variables;

            if (ocrDataMap.has(personId)) {
              const existingData = ocrDataMap.get(personId);
              ocrDataMap.set(personId, { ...existingData, ...docData });
            } else {
              ocrDataMap.set(personId, docData);
            }
          });

        const ocrDataFromDocs: OcrDataByPerson[] = Array.from(ocrDataMap.entries()).map(
          ([personId, data]) => ({ personId, data })
        );

        if (ocrDataFromDocs.length > 0) {
          setOcrData(ocrDataFromDocs);
        }
      }

      setIsLoadingDeal(false);
    }
  }, [existingDeal, editDealId]);

  // -- Save Functions --
  const handleSaveStep1 = async () => {
    if (!dealId) {
      setSaveError('ID do deal não encontrado');
      setTimeout(() => setSaveError(null), 3000);
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await updateDealMutation.mutateAsync({
        dealId,
        ownerId: '00000000-0000-0000-0000-000000000001',
        payload: {
          name: configData.name,
          docTemplateId: configData.docTemplateId,
          metadata: {
            useFgts: configData.useFgts,
            bankFinancing: configData.bankFinancing,
            consortiumLetter: configData.consortiumLetter,
            sellers: configData.sellers,
            buyers: configData.buyers,
            propertyState: configData.propertyState,
            propertyType: configData.propertyType,
            deedCount: configData.deedCount,
          },
        },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error: any) {
      console.error('❌ Erro ao salvar configurações:', error);
      setSaveError(error?.message || 'Erro ao salvar configurações');
      setTimeout(() => setSaveError(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStep3 = async () => {
    if (!dealId) {
      setSaveError('ID do deal não encontrado');
      setTimeout(() => setSaveError(null), 3000);
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      // Converter mappings para o formato JSON simples (apenas valores)
      const contractFieldsJson: Record<string, string> = {};
      Object.entries(mappings).forEach(([fieldId, mapping]) => {
        contractFieldsJson[fieldId] = mapping.value;
      });

      await updateDealMutation.mutateAsync({
        dealId,
        ownerId: '00000000-0000-0000-0000-000000000001',
        payload: {
          contractFields: contractFieldsJson,
        },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error: any) {
      console.error('❌ Erro ao salvar campos do contrato:', error);
      setSaveError(error?.message || 'Erro ao salvar campos do contrato');
      setTimeout(() => setSaveError(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStep5 = async () => {
    if (!dealId) {
      setSaveError('ID do deal não encontrado');
      setTimeout(() => setSaveError(null), 3000);
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const signersToSave = signatories.map(sig => ({
        id: sig.id,
        name: sig.name,
        email: sig.email,
        phoneNumber: sig.phoneNumber,
        signingOrder: 0,
        role: sig.role,
      }));

      await updateDealMutation.mutateAsync({
        dealId,
        ownerId: '00000000-0000-0000-0000-000000000001',
        payload: {
          signers: signersToSave as any,
        },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error: any) {
      console.error('❌ Erro ao salvar signatários:', error);
      setSaveError(error?.message || 'Erro ao salvar signatários');
      setTimeout(() => setSaveError(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // -- Validation Logic --
  const isStepValid = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 1:
        return configData.name.trim().length > 0 &&
          configData.sellers.length > 0 &&
          configData.buyers.length > 0;
      case 2:
        return documents.length > 0;
      case 3:
        return Object.keys(mappings).length > 0;
      case 4:
        return true;
      case 5:
        return signatories.length > 0;
      default:
        return false;
    }
  };

  const titles = ["Configurações", "Documentos", "Mapear Dados", "Preview", "Signatários"];

  const nextStep = async () => {
    if (!isStepValid(step)) return;

    if (step === 1 && !dealId && !editDealId) {
      try {
        const newDeal = await createDealMutation.mutateAsync({
          name: configData.name,
          docTemplateId: configData.docTemplateId, // Financiamento (Google Drive ID)
          ownerId: '00000000-0000-0000-0000-000000000001', // TODO: Get ownerId from auth session
          signers: [],
          metadata: {
            useFgts: configData.useFgts,
            bankFinancing: configData.bankFinancing,
            consortiumLetter: configData.consortiumLetter,
            sellers: configData.sellers,
            buyers: configData.buyers,
            propertyState: configData.propertyState,
            propertyType: configData.propertyType,
            deedCount: configData.deedCount,
          },
        });

        setDealId(newDeal.id);
      } catch (error) {
        console.error('❌ Erro ao criar deal:', error);
        return;
      }
    } else if (editDealId && !dealId) {
      setDealId(editDealId);
    }

    setDirection(1);
    setStep(s => Math.min(s + 1, 5));
  }

  const prevStep = () => {
    setDirection(-1);
    setStep(s => Math.max(s - 1, 1));
  }

  const handleFinish = async () => {
    if (!isStepValid(step) || !dealId) return;

    setSubmissionStatus('sending');

    try {
      await sendContractMutation.mutateAsync({
        dealId,
        ownerId: '00000000-0000-0000-0000-000000000001', // TODO: Get ownerId from auth session
      });

      setSaveSuccess(true);
    } catch (error: any) {
      console.error('❌ Erro ao enviar contrato:', error);
      setSaveError(error.response?.data?.message || 'Erro ao enviar contrato');
      setTimeout(() => setSaveError(null), 3000);
      setSubmissionStatus('editing');
      return;
    }

    setSubmissionStatus('success');
    setTimeout(() => {
      onFinish();
    }, 2500);
  }

  const handleStepperClick = (targetStep: number) => {
    if (targetStep < step) {
      setDirection(-1);
      setStep(targetStep);
    } else {
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

  if (isDealLoading || isLoadingDeal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-slate-600">Carregando dados do contrato...</p>
      </div>
    );
  }

  if (submissionStatus !== 'editing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <AnimatePresence mode="wait">
          {submissionStatus === 'sending' && (
            <motion.div
              key="sending"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ContractSendingLoader />
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
            <button onClick={onCancel} className="cursor-pointer p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h2 className="font-bold text-slate-800 leading-tight">
                {editDealId ? 'Editar Contrato' : 'Novo Contrato'}
              </h2>
              <p className="text-xs text-slate-500">Etapa {step}: {titles[step - 1]}</p>
            </div>
          </div>

          {/* Steps Indicator */}
          <div className="hidden md:flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(s => {
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
                  dealId={dealId}
                />
              )}
              {step === 3 && (
                <MappingStep
                  mappings={mappings}
                  onMap={(fieldId, value, source) => {
                    if (value === '') {
                      setMappings(prev => {
                        const newMappings = { ...prev };
                        delete newMappings[fieldId];
                        return newMappings;
                      });
                    } else {
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
                  dealId={dealId ?? ''}
                  dealName={configData.name}
                  mappedCount={Object.keys(mappings).length}
                  onGenerate={nextStep}
                />
              )}
              {step === 5 && (
                <SignatoriesStep
                  signatories={signatories}
                  onChange={setSignatories}
                  dealId={dealId}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Actions - Fixed at bottom */}
      <div className="bg-white border-t border-slate-200 p-4 fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-6xl mx-auto">
          {/* Error message */}
          {saveError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <span className="font-medium">❌ {saveError}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={step === 1 ? onCancel : prevStep}>
              {step === 1 ? 'Cancelar' : 'Voltar'}
            </Button>

            <div className="flex items-center gap-3">
              {/* Botão Salvar - apenas em modo de edição e nos steps 1, 3, 5 */}
              {editDealId && (step === 1 || step === 3 || step === 5) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (step === 1) handleSaveStep1();
                    if (step === 3) handleSaveStep3();
                    if (step === 5) handleSaveStep5();
                  }}
                  disabled={isSaving || !currentStepValid}
                  className={`${isSaving ? 'opacity-50' : ''} ${saveSuccess ? '!bg-green-50 !border-green-500 !text-green-700' : ''}`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Salvo!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar
                    </>
                  )}
                </Button>
              )}

              {/* Botão Continuar/Finalizar */}
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
      </div>
    </div>
  );
};
