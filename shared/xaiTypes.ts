export type AlertaXAI = {
  id: string;
  categoria: string;
  gravidade: 'baixa' | 'media' | 'alta';
  titulo: string;
  descricao: string;
  evidencia?: {
    trechos?: string[];
    palavras_chave?: string[];
    clause_ref?: string[];
  };
  recomendacao?: string;
  referencia_legal?: string;
  confidence?: number; // 0-100
};

export type ClausulaLGPDExplicavel = {
  id: string;
  titulo: string;
  conteudo: string;
  bloco?: string;
  categoria?: string;
  aplicavel?: boolean;
  explicacao?: string;
  fontes?: {
    regras?: string[];
    trechos?: string[];
  };
  explicabilidade?: ExplicabilidadeClausula;
};

export type ExplicabilidadeClausula = {
  confianca: number;
  incerteza: number;
  evidencias: Array<{
    pagina: number;
    trecho: string;
    similaridade: number;
  }>;
  regras_aplicadas: Array<{
    id: string;
    descricao: string;
    criterio_objetivo: string;
  }>;
  fundamentos: Array<{
    norma: string;
    artigo_item: string;
    justificativa: string;
  }>;
  raciocinio: string[];
  contrapontos: string[];
  alternativas: string[];
  auditoria: {
    modelo: string;
    policy_set: string;
    timestamp: string;
    usuario?: string;
  };
};

export type AcaoPlanoExplicavel = {
  id: string;
  titulo: string;
  descricao: string;
  prioridade: 'critica' | 'alta' | 'media' | 'baixa';
  prazo?: string;
  prazo_sugerido_dias?: number;
  responsavel?: string;
  status?: string;
  justificativa?: string;
  evidencias?: string[];
  explicabilidade?: ExplicabilidadeAcao;
};

export type ExplicabilidadeAcao = {
  confianca: number;
  incerteza: number;
  riscos_associados: Array<{
    pagina: number;
    trecho: string;
    similaridade: number;
  }>;
  regras_aplicadas: Array<{
    id: string;
    descricao: string;
    criterio_objetivo: string;
  }>;
  fundamentos: Array<{
    norma: string;
    artigo_item: string;
    justificativa: string;
  }>;
  raciocinio: string[];
  contrapontos: string[];
  alternativas: string[];
  auditoria: {
    modelo: string;
    policy_set: string;
    timestamp: string;
    usuario?: string;
  };
};

export type ResultadoClausulas = {
  clausulas: ClausulaLGPDExplicavel[];
  contextoNormalizado?: any;
  blocosAplicados?: number;
  versao?: string;
  totalBlocos?: number;
};
