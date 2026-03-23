/**
 * FormattedTextDisplay - Componente reutilizável para exibição de textos formatados
 * 
 * Renderiza textos longos (justificativas, bases legais, ROT, RIPD, POP, ROPA)
 * com formatação visual consistente seguindo o padrão Seusdados Visual Law.
 * 
 * Suporta:
 * - Texto simples com quebras de linha
 * - Listas automáticas (detecta marcadores como -, *, 1., a))
 * - Seções com títulos (detecta linhas terminando em :)
 * - Destaque de termos-chave (LGPD, ANPD, etc.)
 * - Variantes visuais: default, card, inline, document
 */

import React from "react";
import { cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type DisplayVariant = "default" | "card" | "inline" | "document" | "compact";

interface FormattedTextDisplayProps {
  /** Texto a ser exibido (pode conter quebras de linha, marcadores, etc.) */
  content: string | null | undefined;
  /** Variante visual */
  variant?: DisplayVariant;
  /** Label/título acima do texto */
  label?: string;
  /** Ícone ao lado do label */
  icon?: React.ReactNode;
  /** Cor de destaque da borda lateral (para variante card/document) */
  accentColor?: "purple" | "blue" | "teal" | "amber" | "green" | "red" | "gray";
  /** Classes CSS adicionais */
  className?: string;
  /** Texto de fallback quando content está vazio */
  emptyText?: string;
  /** Máximo de linhas antes de truncar (0 = sem limite) */
  maxLines?: number;
}

// ─── Constantes de Cor ───────────────────────────────────────────────────────

const ACCENT_COLORS = {
  purple: {
    border: "border-l-violet-500",
    bg: "bg-violet-50/50 dark:bg-violet-950/20",
    label: "text-violet-700 dark:text-violet-400",
    icon: "text-violet-500",
  },
  blue: {
    border: "border-l-blue-500",
    bg: "bg-blue-50/50 dark:bg-blue-950/20",
    label: "text-blue-700 dark:text-blue-400",
    icon: "text-blue-500",
  },
  teal: {
    border: "border-l-teal-500",
    bg: "bg-teal-50/50 dark:bg-teal-950/20",
    label: "text-teal-700 dark:text-teal-400",
    icon: "text-teal-500",
  },
  amber: {
    border: "border-l-amber-500",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    label: "text-amber-700 dark:text-amber-400",
    icon: "text-amber-500",
  },
  green: {
    border: "border-l-green-500",
    bg: "bg-green-50/50 dark:bg-green-950/20",
    label: "text-green-700 dark:text-green-400",
    icon: "text-green-500",
  },
  red: {
    border: "border-l-red-500",
    bg: "bg-red-50/50 dark:bg-red-950/20",
    label: "text-red-700 dark:text-red-400",
    icon: "text-red-500",
  },
  gray: {
    border: "border-l-gray-400",
    bg: "bg-gray-50/50 dark:bg-gray-900/30",
    label: "text-gray-600 dark:text-gray-400",
    icon: "text-gray-500",
  },
};

// ─── Termos-chave para destaque ──────────────────────────────────────────────

const KEY_TERMS = [
  "LGPD", "ANPD", "RIPD", "ROT", "POP", "ROPA", "DPO",
  "Lei Geral de Proteção de Dados",
  "Relatório de Impacto",
  "Registro de Operações de Tratamento",
  "Procedimento Operacional Padrão",
  "Registro de Atividades de Tratamento",
  "dados pessoais", "dados sensíveis",
  "base legal", "consentimento", "legítimo interesse",
  "obrigação legal", "execução de contrato",
  "titular", "titulares", "controlador", "operador", "encarregado",
  "tratamento de dados", "proteção de dados",
  "transferência internacional",
  "medidas de segurança", "incidente de segurança",
];

// ─── Funções auxiliares ──────────────────────────────────────────────────────

function isListItem(line: string): boolean {
  return /^(\s*[-•*]\s|^\s*\d+[.)]\s|^\s*[a-z][.)]\s)/i.test(line);
}

function isSectionTitle(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.endsWith(":") &&
    trimmed.length < 80 &&
    !trimmed.includes(".") &&
    trimmed.length > 3
  );
}

function highlightTerms(text: string): React.ReactNode[] {
  // Cria regex com todos os termos-chave
  const escapedTerms = KEY_TERMS.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escapedTerms.join("|")})`, "gi");
  
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (regex.test(part)) {
      return (
        <span key={i} className="font-medium text-foreground">
          {part}
        </span>
      );
    }
    return part;
  });
}

function parseContent(content: string): React.ReactNode {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      const ListTag = listType;
      elements.push(
        <ListTag
          key={`list-${elements.length}`}
          className={cn(
            "space-y-1.5 my-3",
            listType === "ul" ? "list-none pl-0" : "list-decimal pl-5"
          )}
        >
          {currentList.map((item, idx) => (
            <li
              key={idx}
              className={cn(
                "font-extralight text-[var(--text-primary)] leading-relaxed",
                listType === "ul" && "flex items-start gap-2.5"
              )}
            >
              {listType === "ul" && (
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
              )}
              <span>{item}</span>
            </li>
          ))}
        </ListTag>
      );
      currentList = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Linha vazia
    if (!trimmed) {
      flushList();
      continue;
    }

    // Título de seção
    if (isSectionTitle(trimmed)) {
      flushList();
      elements.push(
        <h5
          key={`section-${i}`}
          className="font-semibold text-sm tracking-wide text-[var(--text-primary)] mt-4 mb-2 first:mt-0"
        >
          {trimmed}
        </h5>
      );
      continue;
    }

    // Item de lista
    if (isListItem(trimmed)) {
      const isOrdered = /^\s*\d+[.)]\s/.test(trimmed);
      const newType = isOrdered ? "ol" : "ul";
      
      if (listType && listType !== newType) {
        flushList();
      }
      listType = newType;

      const cleanText = trimmed.replace(/^(\s*[-•*]\s|\s*\d+[.)]\s|\s*[a-z][.)]\s)/i, "");
      currentList.push(<>{highlightTerms(cleanText)}</>);
      continue;
    }

    // Parágrafo normal
    flushList();
    elements.push(
      <p
        key={`p-${i}`}
        className="font-extralight text-[var(--text-primary)] leading-relaxed mb-2 last:mb-0"
        style={{ maxWidth: "70ch" }}
      >
        {highlightTerms(trimmed)}
      </p>
    );
  }

  flushList();
  return <>{elements}</>;
}

// ─── Componente Principal ────────────────────────────────────────────────────

export function FormattedTextDisplay({
  content,
  variant = "default",
  label,
  icon,
  accentColor = "purple",
  className,
  emptyText = "Nenhuma informação disponível",
  maxLines = 0,
}: FormattedTextDisplayProps) {
  const colors = ACCENT_COLORS[accentColor];

  if (!content || !content.trim()) {
    return (
      <div className={cn("py-2", className)}>
        {label && (
          <div className="flex items-center gap-2 mb-1.5">
            {icon && <span className={cn("shrink-0", colors.icon)}>{icon}</span>}
            <span className="label-visual-law">{label}</span>
          </div>
        )}
        <p className="text-sm font-light text-muted-foreground italic">
          {emptyText}
        </p>
      </div>
    );
  }

  const parsedContent = parseContent(content);

  // Variante inline - texto simples sem container
  if (variant === "inline") {
    return (
      <span className={cn("font-extralight text-[var(--text-primary)]", className)}>
        {highlightTerms(content)}
      </span>
    );
  }

  // Variante compact - para uso em tabelas e listas
  if (variant === "compact") {
    return (
      <div className={cn("py-1", className)}>
        {label && (
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        )}
        <div className="text-sm font-extralight text-[var(--text-primary)] leading-relaxed mt-0.5">
          {maxLines > 0 ? (
            <div className={`line-clamp-${maxLines}`}>
              {highlightTerms(content)}
            </div>
          ) : (
            highlightTerms(content)
          )}
        </div>
      </div>
    );
  }

  // Variante card - com fundo e borda lateral
  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-lg border-l-4 p-4",
          colors.border,
          colors.bg,
          className
        )}
      >
        {label && (
          <div className="flex items-center gap-2 mb-3">
            {icon && <span className={cn("shrink-0", colors.icon)}>{icon}</span>}
            <span className={cn("label-visual-law", colors.label)}>{label}</span>
          </div>
        )}
        <div className="text-sm">{parsedContent}</div>
      </div>
    );
  }

  // Variante document - estilo documento formal
  if (variant === "document") {
    return (
      <div
        className={cn(
          "rounded-lg border border-border/60 bg-card p-5 shadow-sm",
          className
        )}
      >
        {label && (
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/40">
            {icon && <span className={cn("shrink-0", colors.icon)}>{icon}</span>}
            <span className={cn("heading-4 mb-0", colors.label)}>{label}</span>
          </div>
        )}
        <div className="text-sm">{parsedContent}</div>
      </div>
    );
  }

  // Variante default - texto com label
  return (
    <div className={cn("py-2", className)}>
      {label && (
        <div className="flex items-center gap-2 mb-2">
          {icon && <span className={cn("shrink-0", colors.icon)}>{icon}</span>}
          <span className="label-visual-law">{label}</span>
        </div>
      )}
      <div className="text-sm">{parsedContent}</div>
    </div>
  );
}

// ─── Componentes Especializados ──────────────────────────────────────────────

/** Exibição formatada de Justificativa */
export function JustificativaDisplay({
  content,
  className,
  variant = "card",
}: {
  content: string | null | undefined;
  className?: string;
  variant?: DisplayVariant;
}) {
  return (
    <FormattedTextDisplay
      content={content}
      label="Justificativa"
      accentColor="purple"
      variant={variant}
      emptyText="Nenhuma justificativa registrada"
      className={className}
    />
  );
}

/** Exibição formatada de Base Legal */
export function BaseLegalDisplay({
  content,
  legalBase,
  className,
  variant = "card",
}: {
  content: string | null | undefined;
  legalBase?: string;
  className?: string;
  variant?: DisplayVariant;
}) {
  const LEGAL_BASE_LABELS: Record<string, string> = {
    consentimento: "Consentimento do Titular",
    execucao_contrato: "Execução de Contrato",
    obrigacao_legal: "Obrigação Legal ou Regulatória",
    legitimo_interesse: "Legítimo Interesse do Controlador",
    protecao_vida: "Proteção da Vida ou Incolumidade Física",
    tutela_saude: "Tutela da Saúde",
    interesse_publico: "Interesse Público",
    protecao_credito: "Proteção ao Crédito",
    exercicio_direitos: "Exercício Regular de Direitos",
  };

  const displayContent = content || (legalBase ? LEGAL_BASE_LABELS[legalBase] || legalBase : null);

  return (
    <FormattedTextDisplay
      content={displayContent}
      label="Base Legal"
      accentColor="blue"
      variant={variant}
      emptyText="Base legal não definida"
      className={className}
    />
  );
}

/** Exibição formatada de ROT */
export function RotDisplay({
  content,
  className,
  variant = "document",
}: {
  content: string | null | undefined;
  className?: string;
  variant?: DisplayVariant;
}) {
  return (
    <FormattedTextDisplay
      content={content}
      label="Registro de Operações de Tratamento"
      accentColor="teal"
      variant={variant}
      emptyText="ROT ainda não gerado"
      className={className}
    />
  );
}

/** Exibição formatada de POP */
export function PopDisplay({
  content,
  className,
  variant = "document",
}: {
  content: string | null | undefined;
  className?: string;
  variant?: DisplayVariant;
}) {
  return (
    <FormattedTextDisplay
      content={content}
      label="Procedimento Operacional Padrão"
      accentColor="green"
      variant={variant}
      emptyText="POP ainda não gerado"
      className={className}
    />
  );
}

/** Exibição formatada de ROPA */
export function RopaDisplay({
  content,
  className,
  variant = "document",
}: {
  content: string | null | undefined;
  className?: string;
  variant?: DisplayVariant;
}) {
  return (
    <FormattedTextDisplay
      content={content}
      label="Registro de Atividades de Tratamento"
      accentColor="amber"
      variant={variant}
      emptyText="ROPA ainda não gerado"
      className={className}
    />
  );
}

/** Exibição formatada de RIPD */
export function RipdDisplay({
  content,
  className,
  variant = "document",
}: {
  content: string | null | undefined;
  className?: string;
  variant?: DisplayVariant;
}) {
  return (
    <FormattedTextDisplay
      content={content}
      label="Relatório de Impacto à Proteção de Dados"
      accentColor="red"
      variant={variant}
      emptyText="RIPD ainda não gerado"
      className={className}
    />
  );
}

export default FormattedTextDisplay;
