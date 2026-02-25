import React from 'react';
import { X, FileText, Download, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import type { DealDocument } from '@/types/types';
import { Button } from '@/components/Button';

interface DocumentDataDrawerProps {
  document: DealDocument | null;
  open: boolean;
  onClose: () => void;
}

// -------------------------------------------------------------------
// Translation helpers
// -------------------------------------------------------------------

const DOC_TYPE_LABELS: Record<string, string> = {
  RG: 'RG',
  CNH: 'CNH',
  CNI: 'CNI',
  CPF: 'CPF',
  COMPROVANTE_RESIDENCIA: 'Comprovante de Endereco',
  CERTIDAO_CASAMENTO: 'Certidao de Casamento',
  CERTIDAO_NASCIMENTO: 'Certidao de Nascimento',
  MATRICULA: 'Matricula do Imovel',
  IPTU: 'IPTU',
  PROPOSTA_COMERCIAL: 'Proposta Comercial',
};

function translateDocType(type: string): string {
  return DOC_TYPE_LABELS[type] || type;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'EXTRACTED':
    case 'OCR_DONE':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
          <CheckCircle2 className="w-3 h-3" /> Processado
        </span>
      );
    case 'OCR_PROCESSING':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
          <span className="loading loading-spinner loading-sm text-amber-500" /> Processando
        </span>
      );
    case 'ERROR':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
          <AlertCircle className="w-3 h-3" /> Erro
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
          Pendente
        </span>
      );
  }
}

// -------------------------------------------------------------------
// Smart variable rendering
// -------------------------------------------------------------------

// Known sections with friendly labels
const SECTION_LABELS: Record<string, string> = {
  titular: 'Titular',
  conjuge: 'Conjuge',
  conjuge_1: 'Conjuge 1',
  conjuge_2: 'Conjuge 2',
  imovel: 'Imovel',
  matricula: 'Matricula',
  aquisicao: 'Aquisicao',
  status_juridico: 'Status Juridico',
  validacao: 'Validacao',
  endereco: 'Endereco',
  documento: 'Documento',
};

// Known field labels
const FIELD_LABELS: Record<string, string> = {
  nome_completo: 'Nome completo',
  cpf: 'CPF',
  rg: 'RG',
  data_nascimento: 'Data de nascimento',
  filiacao: 'Filiacao',
  orgao_emissor: 'Orgao emissor',
  data_emissao: 'Data de emissao',
  nome: 'Nome',
  cpf_cnpj: 'CPF/CNPJ',
  endereco_completo: 'Endereco completo',
  cep: 'CEP',
  bairro: 'Bairro',
  cidade: 'Cidade',
  estado: 'Estado',
  numero: 'Numero',
  cartorio: 'Cartorio',
  area_terreno_m2: 'Area do terreno (m2)',
  area_construida_m2: 'Area construida (m2)',
  valor_transacao: 'Valor da transacao',
  situacao: 'Situacao',
  onus_ativos: 'Onus ativos',
  alertas: 'Alertas',
  data_casamento: 'Data do casamento',
  regime_bens: 'Regime de bens',
  nacionalidade: 'Nacionalidade',
  profissao: 'Profissao',
  estado_civil: 'Estado civil',
  sexo: 'Sexo',
  naturalidade: 'Naturalidade',
  mes_referencia: 'Mes de referencia',
  tipo_documento: 'Tipo de documento',
};

function formatFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return <span className="text-slate-400 italic">--</span>;
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value || <span className="text-slate-400 italic">--</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400 italic">Nenhum</span>;
    return (
      <ul className="list-disc list-inside space-y-0.5">
        {value.map((item, i) => (
          <li key={i} className="text-sm text-slate-700">
            {typeof item === 'object' ? JSON.stringify(item) : String(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object') {
    // Render nested object as section
    return (
      <div className="space-y-1.5 pl-3 border-l-2 border-slate-100">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <span className="text-xs text-slate-500">{formatFieldLabel(k)}</span>
            <div className="text-sm text-slate-700">{renderValue(v)}</div>
          </div>
        ))}
      </div>
    );
  }
  return String(value);
}

function VariablesSection({ variables }: { variables: Record<string, any> }) {
  // Group into known sections (objects) and flat fields
  const sections: { key: string; label: string; data: Record<string, unknown> }[] = [];
  const flatFields: { key: string; value: unknown }[] = [];

  Object.entries(variables).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sections.push({
        key,
        label: SECTION_LABELS[key] || formatFieldLabel(key),
        data: value as Record<string, unknown>,
      });
    } else {
      flatFields.push({ key, value });
    }
  });

  return (
    <div className="space-y-5">
      {/* Flat fields first */}
      {flatFields.length > 0 && (
        <div className="space-y-3">
          {flatFields.map(({ key, value }) => (
            <div key={key}>
              <p className="text-xs text-slate-500 mb-0.5">{formatFieldLabel(key)}</p>
              <div className="text-sm text-slate-800 font-medium">{renderValue(value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Named sections */}
      {sections.map(({ key, label, data }) => (
        <div key={key} className="bg-slate-50 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-3">
            {label}
          </p>
          <div className="space-y-3">
            {Object.entries(data).map(([fieldKey, fieldValue]) => (
              <div key={fieldKey}>
                <p className="text-xs text-slate-500 mb-0.5">{formatFieldLabel(fieldKey)}</p>
                <div className="text-sm text-slate-800 font-medium">{renderValue(fieldValue)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------------------------
// Main drawer component
// -------------------------------------------------------------------

export const DocumentDataDrawer: React.FC<DocumentDataDrawerProps> = ({
  document,
  open,
  onClose,
}) => {
  const hasVariables =
    document != null &&
    document.variables != null &&
    Object.keys(document.variables).length > 0;

  return (
    <>
      <div className="drawer drawer-end">
        <input
          id="document_data_drawer"
          type="checkbox"
          className="drawer-toggle"
          checked={open}
          onChange={(e) => { if (!e.target.checked) onClose(); }}
        />
        <div className="drawer-content">
          {/* Page content here */}
        </div>
        <div className="drawer-side z-50">
          <label
            htmlFor="document_data_drawer"
            aria-label="close sidebar"
            className="drawer-overlay"
            onClick={(e) => { e.preventDefault(); onClose(); }}
          />
          <div className="w-full max-w-md bg-white border-l border-slate-200">
            {document ? (
              <>
                {/* Header */}
                <div className="flex items-start gap-3 p-5 border-b border-slate-200 flex-shrink-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {document.originalFilename || document.documentType}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">
                        {translateDocType(document.documentType)}
                      </span>
                      {getStatusBadge(document.status)}
                    </div>
                  </div>
                  <label
                    htmlFor="document_data_drawer"
                    aria-label="close sidebar"
                    onClick={(e) => { e.preventDefault(); onClose(); }}
                    className="drawer-overlay cursor-pointer p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors tooltip tooltip-left"
                    data-tip="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </label>
                </div>

                {/* Actions bar */}
                <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 flex-shrink-0">
                  {document.fileUrl && (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => window.open(document.fileUrl, '_blank')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Visualizar
                      </Button>
                      <a
                        href={document.fileUrl}
                        download={document.originalFilename}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar
                      </a>
                    </>
                  )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                  {hasVariables ? (
                    <>
                      <p className="text-xs uppercase tracking-wide font-semibold text-slate-400 mb-4">
                        Dados extraidos
                      </p>
                      <VariablesSection variables={document.variables!} />
                    </>
                  ) : document.status === 'OCR_PROCESSING' ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <span className="loading loading-spinner loading-md text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500">Processando documento...</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Os dados extraidos aparecerao aqui quando o processamento
                        terminar.
                      </p>
                    </div>
                  ) : document.status === 'ERROR' ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <AlertCircle className="w-8 h-8 text-red-300 mb-3" />
                      <p className="text-sm text-slate-500">Erro ao processar documento</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Nao foi possivel extrair os dados deste documento.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <FileText className="w-8 h-8 text-slate-200 mb-3" />
                      <p className="text-sm text-slate-500">Nenhum dado extraido</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Este documento ainda nao possui dados extraidos.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-5" />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
