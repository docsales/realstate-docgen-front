import React from 'react';

// -------------------------------------------------------------------
// Translation helpers
// -------------------------------------------------------------------

// Known sections with friendly labels
const SECTION_LABELS: Record<string, string> = {
  titular: 'Titular',
  conjuge: 'Cônjuge',
  conjuge_1: 'Cônjuge 1',
  conjuge_2: 'Cônjuge 2',
  imovel: 'Imóvel',
  matricula: 'Matrícula',
  aquisicao: 'Aquisição',
  status_juridico: 'Status Jurídico',
  validacao: 'Validação',
  endereco: 'Endereço',
  documento: 'Documento',
};

// Known field labels
const FIELD_LABELS: Record<string, string> = {
  nome_completo: 'Nome completo',
  cpf: 'CPF',
  rg: 'RG',
  data_nascimento: 'Data de nascimento',
  filiacao: 'Filiação',
  orgao_emissor: 'Órgão emissor',
  data_emissao: 'Data de emissão',
  nome: 'Nome',
  cpf_cnpj: 'CPF/CNPJ',
  endereco_completo: 'Endereço completo',
  cep: 'CEP',
  bairro: 'Bairro',
  cidade: 'Cidade',
  estado: 'Estado',
  numero: 'Número',
  cartorio: 'Cartório',
  area_terreno_m2: 'Área do terreno (m²)',
  area_construida_m2: 'Área construída (m²)',
  valor_transacao: 'Valor da transação',
  situacao: 'Situação',
  onus_ativos: 'Ônus ativos',
  alertas: 'Alertas',
  data_casamento: 'Data do casamento',
  regime_bens: 'Regime de bens',
  nacionalidade: 'Nacionalidade',
  profissao: 'Profissão',
  estado_civil: 'Estado civil',
  sexo: 'Sexo',
  naturalidade: 'Naturalidade',
  mes_referencia: 'Mês de referência',
  tipo_documento: 'Tipo de documento',
};

function formatFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function EmptyValue() {
  return <span className="text-slate-400 italic">--</span>;
}

function renderScalar(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return <EmptyValue />;
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value ? <span className="break-words whitespace-pre-wrap">{value}</span> : <EmptyValue />;
  return <span className="break-words whitespace-pre-wrap">{String(value)}</span>;
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return <EmptyValue />;

  if (typeof value !== 'object') {
    return renderScalar(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-slate-400 italic">Nenhum</span>;
    return (
      <ul className="list-inside space-y-1 min-w-0">
        {value.map((item, i) => (
          <li key={i} className="text-sm text-slate-700 min-w-0">
            {typeof item === 'object' && item !== null ? (
              <div className="mt-1 rounded-md border border-slate-200 bg-white p-2 overflow-x-auto max-w-full">
                <pre className="text-xs font-mono whitespace-pre-wrap break-words min-w-0">
                  {JSON.stringify(item, null, 2)}
                </pre>
              </div>
            ) : (
              renderScalar(item)
            )}
          </li>
        ))}
      </ul>
    );
  }

  // Nested object
  return (
    <div className="space-y-2 pl-3 border-l-2 border-slate-100 min-w-0">
      {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
        <div key={k} className="min-w-0">
          <span className="text-xs text-slate-500 break-all">{formatFieldLabel(k)}</span>
          <div className="text-sm text-slate-700 min-w-0">{renderValue(v)}</div>
        </div>
      ))}
    </div>
  );
}

function VariablesSection({ variables }: { variables: Record<string, any> }) {
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
    <div className="space-y-5 min-w-0">
      {flatFields.length > 0 && (
        <div className="space-y-3 min-w-0">
          {flatFields.map(({ key, value }) => (
            <div key={key} className="min-w-0">
              <p className="text-xs text-slate-500 mb-0.5 break-all">{formatFieldLabel(key)}</p>
              <div className="text-sm text-slate-800 font-medium min-w-0">{renderValue(value)}</div>
            </div>
          ))}
        </div>
      )}

      {sections.map(({ key, label, data }) => (
        <div key={key} className="bg-slate-50 rounded-lg p-4 min-w-0">
          <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-3">
            {label}
          </p>
          <div className="space-y-3 min-w-0">
            {Object.entries(data).map(([fieldKey, fieldValue]) => (
              <div key={fieldKey} className="min-w-0">
                <p className="text-xs text-slate-500 mb-0.5 break-all">{formatFieldLabel(fieldKey)}</p>
                <div className="text-sm text-slate-800 font-medium min-w-0">{renderValue(fieldValue)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DocumentVariablesView({ variables }: { variables: Record<string, any> }) {
  return <VariablesSection variables={variables} />;
}

