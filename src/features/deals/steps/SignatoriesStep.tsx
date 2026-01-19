
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import type { Signatory } from '@/types/types';
import { Users, Info, AlertCircle } from 'lucide-react';
import { useDeal, useRemoveSignatoryFromDeal, useUpdateDeal } from '../hooks/useDeals';
import { SignerCard } from '../components/SignerCard';
import { mergeDealData, type ExtractedPerson } from '../utils/extractDealData';

interface SignatoryValidationError {
  signatory: Signatory;
  missingFields: string[];
}

interface SignatoriesStepProps {
  signatories: Signatory[];
  onChange: (signer: Signatory[]) => void;
  dealId?: string | null;
  validationErrors?: SignatoryValidationError[];
  onGoToStep?: (step: number) => void;
}

// ===== FUNÇÕES UTILITÁRIAS =====

/**
 * Valida formato de email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Verifica se um signatário tem dados válidos para salvar no banco
 */
function isSignatoryValid(signatory: Signatory): boolean {
  return !!(
    signatory.name && 
    signatory.name.trim() !== '' && 
    signatory.name !== 'Sem nome' &&
    signatory.email && 
    signatory.email.trim() !== '' && 
    isValidEmail(signatory.email) &&
    signatory.phoneNumber &&
    signatory.phoneNumber.trim() !== ''
  );
}

/**
 * Detecta quais campos estão faltando em um signatário
 */
function getMissingFields(signatory: Signatory): string[] {
  const missing: string[] = [];
  
  if (!signatory.name || signatory.name.trim() === '' || signatory.name === 'Sem nome') {
    missing.push('Nome');
  }
  
  if (!signatory.email || signatory.email.trim() === '') {
    missing.push('Email');
  } else if (!isValidEmail(signatory.email)) {
    missing.push('Email válido');
  }
  
  if (!signatory.phoneNumber || signatory.phoneNumber.trim() === '') {
    missing.push('Telefone');
  }
  
  return missing;
}

/**
 * Normaliza string para comparação (lowercase, sem espaços extras)
 */
function normalizeForComparison(value: string | undefined): string {
  if (!value) return '';
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Verifica se um signatário é duplicata de uma pessoa extraída
 * Compara por: email > nome normalizado
 */
function isDuplicateSignatory(
  existing: Signatory,
  candidate: ExtractedPerson & { cpf?: string }
): boolean {
  // Prioridade 1: Comparar por email
  if (existing.email && candidate.email) {
    const existingEmail = normalizeForComparison(existing.email);
    const candidateEmail = normalizeForComparison(candidate.email);
    if (existingEmail === candidateEmail && existingEmail !== '') {
      return true;
    }
  }

  // Prioridade 2: Comparar por CPF (se disponível)
  // Como Signatory não tem campo CPF, essa comparação não é viável
  // Mantemos a lógica para possível extensão futura

  // Prioridade 3: Comparar por nome normalizado (fallback)
  const existingName = normalizeForComparison(existing.name);
  const candidateName = normalizeForComparison(candidate.name);
  if (existingName === candidateName && existingName !== '') {
    return true;
  }

  return false;
}

/**
 * Converte ExtractedPerson para Signatory
 */
function convertToSignatory(
  person: ExtractedPerson & { cpf?: string },
  role: 'buyer_part' | 'seller_part'
): Signatory | null {
  // Validação: precisa ter nome válido e não pode ser "Sem nome"
  const name = person.name?.trim();
  if (!name || name === '' || name === 'Sem nome') {
    return null;
  }

  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    email: person.email || '',
    phoneNumber: person.phone || '',
    role: role,
    signingOrder: 0,
  };
}

export const SignatoriesStep: React.FC<SignatoriesStepProps> = ({ signatories, onChange, dealId, validationErrors, onGoToStep }) => {
  const [form, setForm] = useState({ name: '', email: '', phoneNumber: '', role: 'buyer_part' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const removeSignatoryMutation = useRemoveSignatoryFromDeal();
  const updateDealMutation = useUpdateDeal();
  const [removeSignerLoading, setRemoveSignerLoading] = useState(false);
  const { data: dealData } = useDeal(dealId!);
  const hasAutoPopulatedRef = useRef(false);
  const [incompleteSignatories, setIncompleteSignatories] = useState<SignatoryValidationError[]>([]);

  // Estados para sincronização de mudanças em contractFields
  const [pendingUpdates, setPendingUpdates] = useState<{
    signatory: Signatory;
    updates: Partial<Signatory>;
  }[]>([]);
  const [showSyncBanner, setShowSyncBanner] = useState(false);

  // ===== AUTO-PREENCHIMENTO DE SIGNATÁRIOS =====
  useEffect(() => {
    if (!dealData || !dealId || hasAutoPopulatedRef.current) return;

    const autoPopulateSignatories = async () => {
      try {
        // Extrair dados consolidados do deal
        const mergedData = mergeDealData(dealData);

        // Preparar lista de candidatos a signatários
        const candidates: Array<ExtractedPerson & { cpf?: string; role: 'buyer_part' | 'seller_part' }> = [];

        // Adicionar compradores
        if (mergedData.buyers && mergedData.buyers.length > 0) {
          mergedData.buyers.forEach((buyer) => {
            candidates.push({
              ...buyer,
              role: 'buyer_part',
            });
          });
        }

        // Adicionar vendedores
        if (mergedData.sellers && mergedData.sellers.length > 0) {
          mergedData.sellers.forEach((seller) => {
            candidates.push({
              ...seller,
              role: 'seller_part',
            });
          });
        }

        // Se não há candidatos, não fazer nada
        if (candidates.length === 0) {
          hasAutoPopulatedRef.current = true;
          return;
        }

        // Processar candidatos e criar novos signatários
        const newSignatories: Signatory[] = [];

        candidates.forEach((candidate) => {
          // Verificar se já existe signatário duplicado
          const isDuplicate = signatories.some(existing =>
            isDuplicateSignatory(existing, candidate)
          );

          if (!isDuplicate) {
            // Converter para signatário
            const newSignatory = convertToSignatory(candidate, candidate.role);
            if (newSignatory) {
              newSignatories.push(newSignatory);
            }
          }
        });

        // Se há novos signatários, atualizar estado local
        if (newSignatories.length > 0) {
          // Atualizar signing order
          const updatedSignatories = [...signatories, ...newSignatories].map((sig, index) => ({
            ...sig,
            signingOrder: index,
          }));

          // Atualizar estado local primeiro
          onChange(updatedSignatories);

          // VALIDAÇÃO: Detectar signatários incompletos
          const incompleteOnes: SignatoryValidationError[] = [];
          updatedSignatories.forEach(sig => {
            const missing = getMissingFields(sig);
            if (missing.length > 0) {
              incompleteOnes.push({ signatory: sig, missingFields: missing });
            }
          });

          // Se há signatários incompletos, informar ao usuário
          if (incompleteOnes.length > 0) {
            setIncompleteSignatories(incompleteOnes);
          } else {
            // Todos válidos, limpar avisos e salvar no banco
            setIncompleteSignatories([]);
            
            // Salvar automaticamente no banco para obter IDs reais
            try {
              await updateDealMutation.mutateAsync({
                dealId,
                payload: {
                  signers: updatedSignatories.map(sig => {
                    // Se o ID é temporário (começa com "temp-"), não enviar
                    // O backend criará um novo UUID
                    const isTemporaryId = sig.id.startsWith('temp-');
                    return {
                      ...(isTemporaryId ? {} : { id: sig.id }),
                      name: sig.name,
                      email: sig.email,
                      phoneNumber: sig.phoneNumber,
                      signingOrder: sig.signingOrder,
                      role: sig.role,
                    };
                  }) as any,
                },
              });
            } catch (saveError) {
              console.error('❌ Erro ao salvar signatários no banco:', saveError);
              // Não bloquear a UI, mas logar o erro
            }
          }
        }

        // Marcar como já populado
        hasAutoPopulatedRef.current = true;
      } catch (error) {
        console.error('❌ Erro ao auto-preencher signatários:', error);
        hasAutoPopulatedRef.current = true; // Evitar loop infinito em caso de erro
      }
    };

    autoPopulateSignatories();
  }, [dealData, dealId, signatories, onChange, updateDealMutation]);

  // ===== DETECÇÃO DE MUDANÇAS EM CONTRACTFIELDS =====
  useEffect(() => {
    if (showSyncBanner || !dealData?.contractFields || !signatories.length) return;

    const mergedData = mergeDealData(dealData);
    const updatedPersons = [...mergedData.buyers, ...mergedData.sellers];

    const updates: { signatory: Signatory; updates: Partial<Signatory> }[] = [];

    signatories.forEach(sig => {
      const matchingPerson = updatedPersons.find(person => {
        const nameMatch = normalizeForComparison(person.name) === normalizeForComparison(sig.name);
        const cpfMatch = person.cpf && sig.phoneNumber &&
          person.cpf.replace(/\D/g, '') === sig.phoneNumber.replace(/\D/g, '');
        return nameMatch || cpfMatch;
      });

      if (matchingPerson) {
        const changes: Partial<Signatory> = {};

        if (matchingPerson.name && matchingPerson.name !== sig.name) {
          console.log(`   📝 Nome mudou: "${sig.name}" → "${matchingPerson.name}"`);
          changes.name = matchingPerson.name;
        }

        const sigEmail = (sig.email || '').toLowerCase().trim();
        const personEmail = (matchingPerson.email || '').toLowerCase().trim();
        if (personEmail && personEmail !== sigEmail) {
          console.log(`   📧 Email mudou: "${sigEmail}" → "${personEmail}"`);
          changes.email = matchingPerson.email;
        }

        const sigPhone = (sig.phoneNumber || '').replace(/\D/g, '');
        const personPhone = (matchingPerson.phone || '').replace(/\D/g, '');
        if (personPhone && personPhone !== sigPhone) changes.phoneNumber = matchingPerson.phone;

        if (Object.keys(changes).length > 0) updates.push({ signatory: sig, updates: changes });
      }
    });

    if (updates.length > 0) {
      setPendingUpdates(updates);
      setShowSyncBanner(true);
    }
  }, [dealData, signatories, showSyncBanner]);

  const canRemoveSigner = (): boolean => {
    if (!dealId || (dealData && dealData.status === 'DRAFT')) return true;
    return false;
  }

  const saveSignatory = () => {
    // Validar email e telefone antes de salvar
    if (form.name && form.email && isValidEmail(form.email) && form.phoneNumber && form.phoneNumber.trim() !== '') {
      let updatedSignatories: Signatory[];
      if (editingId) {
        updatedSignatories = signatories.map(s => s.id === editingId ? { ...s, ...form, role: form.role as any } : s);
        setEditingId(null);
      } else {
        const newSignatory: Signatory = {
          ...form,
          id: Date.now().toString(),
          role: form.role as any,
          signingOrder: 0,
        };
        updatedSignatories = [...signatories, newSignatory];
      }
      onChange(updatedSignatories);
      
      // Recalcular signatários incompletos
      const incompleteOnes: SignatoryValidationError[] = [];
      updatedSignatories.forEach(sig => {
        const missing = getMissingFields(sig);
        if (missing.length > 0) {
          incompleteOnes.push({ signatory: sig, missingFields: missing });
        }
      });
      setIncompleteSignatories(incompleteOnes);
      
      setForm({ name: '', email: '', phoneNumber: '', role: 'buyer_part' });
    }
  };

  const handleEdit = (signer: Signatory) => {
    setEditingId(signer.id);
    setForm({
      name: signer.name,
      email: signer.email,
      phoneNumber: signer.phoneNumber || '',
      role: signer.role
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', email: '', phoneNumber: '', role: 'buyer_part' });
  };

  const removeSignatory = async (id: string) => {
    const updatedSignatories = signatories.filter(signer => signer.id !== id);
    onChange(updatedSignatories);

    // Recalcular signatários incompletos
    const incompleteOnes: SignatoryValidationError[] = [];
    updatedSignatories.forEach(sig => {
      const missing = getMissingFields(sig);
      if (missing.length > 0) {
        incompleteOnes.push({ signatory: sig, missingFields: missing });
      }
    });
    setIncompleteSignatories(incompleteOnes);

    if (dealId && id.length > 15) {
      try {
        setRemoveSignerLoading(true);
        await removeSignatoryMutation.mutateAsync({ dealId, signatoryId: id });
        console.log('✅ Signatário removido do banco de dados');
      } catch (error) {
        console.error('❌ Erro ao remover signatário do banco:', error);
      } finally {
        setRemoveSignerLoading(false);
      }
    }
  };

  // ===== HANDLERS DE SINCRONIZAÇÃO =====
  const handleSyncSignatories = async () => {
    if (pendingUpdates.length === 0) return;

    // Aplicar atualizações
    const updatedSignatories = signatories.map(sig => {
      const update = pendingUpdates.find(u => u.signatory.id === sig.id);
      return update ? { ...sig, ...update.updates } : sig;
    });

    onChange(updatedSignatories);

    // Recalcular signatários incompletos
    const incompleteOnes: SignatoryValidationError[] = [];
    updatedSignatories.forEach(sig => {
      const missing = getMissingFields(sig);
      if (missing.length > 0) {
        incompleteOnes.push({ signatory: sig, missingFields: missing });
      }
    });
    setIncompleteSignatories(incompleteOnes);

    // VALIDAÇÃO: Apenas salvar no banco se TODOS os signatários forem válidos
    const allValid = updatedSignatories.every(isSignatoryValid);

    // Salvar automaticamente no banco
    if (dealId && allValid) {
      try {
        await updateDealMutation.mutateAsync({
          dealId,
          payload: {
            signers: updatedSignatories.map(sig => {
              // Se o ID é temporário (começa com "temp-"), não enviar
              const isTemporaryId = sig.id.startsWith('temp-');
              return {
                ...(isTemporaryId ? {} : { id: sig.id }),
                name: sig.name,
                email: sig.email,
                phoneNumber: sig.phoneNumber,
                signingOrder: sig.signingOrder,
                role: sig.role,
              };
            }) as any,
          },
        });
        console.log('✅ Signatários sincronizados com sucesso');
      } catch (error) {
        console.error('❌ Erro ao sincronizar signatários:', error);
      }
    } else if (!allValid) {
      console.log('⚠️ Sincronização cancelada: alguns signatários têm dados inválidos');
    }

    setPendingUpdates([]);
    setShowSyncBanner(false);
  };

  const dismissSyncBanner = () => {
    setShowSyncBanner(false);
    setPendingUpdates([]);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Banner de Erro de Validação (ao tentar finalizar) */}
      {validationErrors && validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-300 text-red-900 px-4 py-3 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-2">
                Signatários com Informações Incompletas
              </h4>
              <p className="text-sm mb-3">
                Os seguintes signatários precisam ter seus dados preenchidos corretamente antes do envio:
              </p>
              <ul className="text-sm space-y-2 mb-4">
                {validationErrors.map((error, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-medium">{error.signatory.name || '(Sem nome)'}:</span>
                    <span className="text-red-700">
                      Faltam: {error.missingFields.join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-red-700">
                  Clique no signatário abaixo para editar suas informações, ou volte à etapa de mapeamento para corrigir os dados na origem.
                </p>
                {onGoToStep && (
                  <button
                    onClick={() => onGoToStep(3)}
                    className="cursor-pointer self-start px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    ← Voltar ao Mapeamento (Etapa 3)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner Informativo (signatários detectados com dados incompletos) */}
      {incompleteSignatories.length > 0 && !validationErrors && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 mb-2">
                Preenchimento Automático Incompleto
              </h4>
              <p className="text-sm mb-3">
                Os seguintes signatários foram detectados nos documentos, mas não possuem todas as informações necessárias para o cadastramento automático:
              </p>
              <ul className="text-sm space-y-2 mb-4">
                {incompleteSignatories.map((error, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-medium">{error.signatory.name || '(Sem nome)'}:</span>
                    <span className="text-amber-700">
                      Faltam: {error.missingFields.join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-amber-800 mb-2">
                  Para prosseguir, você pode:
                </p>
                <ul className="text-sm text-amber-800 list-disc list-inside mb-3 space-y-1">
                  <li>Clicar no signatário abaixo e preencher manualmente os dados faltantes</li>
                  <li>Voltar à etapa de mapeamento para adicionar as informações na origem dos dados</li>
                </ul>
                {onGoToStep && (
                  <button
                    onClick={() => onGoToStep(3)}
                    className="cursor-pointer self-start px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                  >
                    ← Voltar ao Mapeamento (Etapa 3)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Sincronização de Mudanças */}
      {showSyncBanner && pendingUpdates.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 px-4 py-3 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-900">Dados Alterados Detectados</h4>
            <p className="text-sm mb-3">
              Detectamos alterações nas variáveis que afetam {pendingUpdates.length} signatário(s).
              Deseja sincronizar os dados?
            </p>
            <ul className="text-sm mb-3 space-y-1">
              {pendingUpdates.map((update, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-medium">{update.signatory.name}:</span>
                  <span>{Object.keys(update.updates).join(', ')}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={handleSyncSignatories}
                className="cursor-pointer px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
              >
                Sincronizar Dados
              </button>
              <button
                onClick={dismissSyncBanner}
                className="cursor-pointer px-4 py-2 bg-white border border-yellow-300 text-yellow-900 rounded-lg hover:bg-yellow-50 transition-colors text-sm font-medium"
              >
                Manter Dados Atuais
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem informativa sobre auto-preenchimento */}
      {signatories.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 text-sm mb-1">
                Signatários Preenchidos Automaticamente
              </h4>
              <p className="text-sm text-blue-700">
                Os signatários foram criados com base nos dados de compradores e vendedores extraídos dos documentos.
                Você pode <strong>clicar em qualquer signatário para editar</strong> seus dados ou adicionar novos signatários manualmente.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Form */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-6 text-primary">
            <Users className="w-5 h-5" />
            <h3 className="font-bold text-lg">{editingId ? 'Editar Signatário' : 'Novo Signatário'}</h3>
          </div>

          <div className="space-y-4">
            <Input
              label="Nome Completo *"
              placeholder="Ex: João da Silva"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Email *"
              type="email"
              placeholder="Ex: joao@exemplo.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Telefone *"
              placeholder="Ex: (11) 98765-4321"
              mask="phone"
              value={form.phoneNumber}
              onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
            />
            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-slate-700">Função *</label>
              <select
                className="border border-slate-600 rounded-lg px-3 py-2 bg-white text-slate-600 focus:ring-2 focus:ring-primary outline-none"
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
              >
                <option value="buyer_part">Comprador</option>
                <option value="seller_part">Vendedor</option>
                <option value="witness">Testemunha</option>
                <option value="real_estate_agent">Corretor</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              {form.email && !isValidEmail(form.email) && (
                <p className="text-xs text-red-600">
                  Email inválido. Por favor, insira um email no formato correto.
                </p>
              )}
              {(!form.phoneNumber || form.phoneNumber.trim() === '') && form.name && (
                <p className="text-xs text-red-600">
                  Telefone é obrigatório.
                </p>
              )}
              <Button 
                onClick={saveSignatory} 
                disabled={!form.name || !form.email || !isValidEmail(form.email) || !form.phoneNumber || form.phoneNumber.trim() === ''} 
                className="w-full"
              >
                {editingId ? 'Atualizar Signatário' : '+ Adicionar Signatário'}
              </Button>
              {editingId && (
                <Button onClick={cancelEdit} variant="secondary" className="w-full">
                  Cancelar Edição
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right: List */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-slate-800">Signatários ({signatories.length})</h3>
          <div className="space-y-3">
            {signatories.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                Nenhum signatário adicionado.
              </div>
            ) : (
              signatories.map(signer =>
                <SignerCard
                  key={signer.id}
                  signer={signer}
                  dealStatus={dealData?.status || 'DRAFT'}
                  canRemove={canRemoveSigner()}
                  onRemove={removeSignatory}
                  onClick={() => handleEdit(signer)}
                  isSelected={editingId === signer.id}
                  isLoading={removeSignerLoading}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
