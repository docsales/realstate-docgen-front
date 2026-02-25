import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, RefreshCw, XCircle } from 'lucide-react';
import { useCoupleValidation } from '../../hooks/useCoupleValidation';
import { useCoupleValidationSocket } from '../../hooks/useCoupleValidationSocket';
import { Button } from '@/components/Button';

interface CoupleValidationBannerProps {
  dealId: string;
  coupleId: string;
  titularPersonId: string;
  conjugePersonId: string;
  onValidationComplete?: (result: any) => void;
}

export const CoupleValidationBanner: React.FC<CoupleValidationBannerProps> = ({
  dealId,
  coupleId,
  titularPersonId,
  conjugePersonId,
  onValidationComplete,
}) => {
  const { validateCouple } = useCoupleValidation();
  const [manualAttempts, setManualAttempts] = useState<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Resetar tentativas quando mudar de casal
  useEffect(() => {
    setManualAttempts(0);
    setLastError(null);
    setIsValidating(false);
    setValidationResult(null);
  }, [coupleId]);

  useCoupleValidationSocket({
    onStarted: (evt) => {
      if (evt.dealId === dealId && evt.coupleId === coupleId) {
        setIsValidating(true);
        setLastError(null);
      }
    },
    onCompleted: (evt) => {
      if (evt.dealId === dealId && evt.coupleId === coupleId) {
        setIsValidating(false);
        setValidationResult(evt.result);
        onValidationComplete?.(evt.result);
      }
    },
    onError: (evt) => {
      if (evt.dealId === dealId && evt.coupleId === coupleId) {
        setIsValidating(false);
        setLastError(evt.error);
      }
    },
  });

  const handleValidate = async () => {
    setLastError(null);
    setManualAttempts(prev => prev + 1);
    setIsValidating(true);

    try {
      await validateCouple.mutateAsync({
        dealId,
        coupleId,
        titularPersonId,
        conjugePersonId,
      });
    } catch (error: any) {
      console.error(`❌ Erro na validação manual do casal ${coupleId} (tentativa ${manualAttempts + 1}):`, error);
      const errorMessage =
        error?.response?.data?.mensagem ||
        error?.response?.data?.message ||
        'Erro ao validar o casal. Verifique se todos os documentos foram enviados corretamente.';
      setLastError(errorMessage);
      setIsValidating(false);
    }
  };

  const isValid = validationResult?.validacao_geral?.valido;
  const problems = validationResult?.problemas_encontrados || [];

  if (!validationResult) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900">Validação de Casal Disponível</h4>
              <p className="text-sm text-blue-700">
                Clique para validar a consistência dos documentos deste casal
                {manualAttempts > 0 && ` (${manualAttempts} tentativa${manualAttempts > 1 ? 's' : ''})`}
              </p>
              {isValidating && (
                <p className="text-sm text-blue-700 mt-2 flex items-start gap-1">
                  <span className="loading loading-spinner loading-sm" />
                  <span>Validação em andamento... (resultado chegará em instantes)</span>
                </p>
              )}
              {lastError && (
                <p className="text-sm text-red-600 mt-2 flex items-start gap-1">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{lastError}</span>
                </p>
              )}
            </div>
          </div>
          <Button
            variant="link"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={handleValidate}
            isLoading={validateCouple.isPending || isValidating}
            disabled={validateCouple.isPending || isValidating}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            Validar Casal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${
      isValid 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-start gap-3">
        {isValid ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-semibold ${
              isValid ? 'text-green-800' : 'text-red-800'
            }`}>
              {isValid ? 'Casal Validado' : 'Problemas Encontrados'}
            </h4>
          </div>
          
          <p className={`text-sm mb-3 ${
            isValid ? 'text-green-700' : 'text-red-700'
          }`}>
            {validationResult.validacao_geral.mensagem}
          </p>

          {problems.length > 0 && (
            <div className="space-y-2 mb-3">
              {problems.map((problem: any, index: number) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 p-2 rounded ${
                    problem.severidade === 'CRITICA' ? 'bg-red-100' :
                    problem.severidade === 'ALTA' ? 'bg-orange-100' :
                    problem.severidade === 'MEDIA' ? 'bg-yellow-100' :
                    'bg-blue-100'
                  }`}
                >
                  {problem.tipo === 'ERRO' ? (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : problem.tipo === 'AVISO' ? (
                    <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {problem.descricao}
                    </p>
                    {problem.recomendacao && (
                      <p className="text-xs text-slate-600 mt-1">
                        {problem.recomendacao}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="link"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={handleValidate}
              isLoading={validateCouple.isPending || isValidating}
              disabled={validateCouple.isPending || isValidating}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Revalidar {manualAttempts > 0 ? `(${manualAttempts} tentativa${manualAttempts > 1 ? 's' : ''})` : ''}
            </Button>
            {lastError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {lastError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
