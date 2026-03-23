/**
 * Componente de Card de Alerta XAI (IA Explicável)
 * Exibe alertas com camadas de explicabilidade: evidências, regras, fundamentos, alternativas e auditoria
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  FileText, 
  Scale, 
  BookOpen, 
  Lightbulb, 
  Clock,
  Eye,
  ThumbsUp,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";

// Tipos para os alertas XAI
export interface Evidencia {
  pagina: number;
  trecho: string;
  similaridade: number;
}

export interface RegraHumana {
  id: string;
  descricao: string;
  criterio_objetivo: string;
}

export interface Fundamento {
  norma: string;
  artigo_item: string;
  justificativa: string;
}

export interface AcaoAlerta {
  label: string;
  acao: string;
  goto?: {
    pagina: number;
  };
}

export interface Auditoria {
  modelo: string;
  policy_set: string;
  timestamp: string;
  usuario?: string;
}

export interface AlertaXAI {
  alerta_id: string;
  categoria: string;
  tipo: string;
  gravidade: "baixa" | "media" | "alta";
  confianca: number;
  incerteza: number;
  evidencias: Evidencia[];
  regras_humanas: RegraHumana[];
  fundamentos: Fundamento[];
  raciocinio_resumido: string[];
  contrapontos: string[];
  sugestoes_redacao: string[];
  acoes: AcaoAlerta[];
  auditoria: Auditoria;
}

interface XaiAlertCardProps {
  data: AlertaXAI;
  onAction?: (acao: string, alertaId: string, dados?: any) => void;
  expanded?: boolean;
}

export function XaiAlertCard({ data, onAction, expanded = false }: XaiAlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const gravidadeConfig = {
    baixa: { 
      color: "bg-green-100 text-green-800 border-green-200", 
      icon: <Info className="w-4 h-4" />,
      label: "Baixa"
    },
    media: { 
      color: "bg-amber-100 text-amber-800 border-amber-200", 
      icon: <AlertTriangle className="w-4 h-4" />,
      label: "Média"
    },
    alta: { 
      color: "bg-red-100 text-red-800 border-red-200", 
      icon: <AlertTriangle className="w-4 h-4" />,
      label: "Alta"
    },
  };

  // Fallback para gravidade não mapeada
  const config = gravidadeConfig[data.gravidade] || gravidadeConfig.media;

  return (
    <Card className={`w-full shadow-lg rounded-xl border-l-4 ${
      data.gravidade === 'alta' ? 'border-l-red-500' :
      data.gravidade === 'media' ? 'border-l-amber-500' :
      'border-l-green-500'
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              <span className="font-semibold">{data.tipo}</span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {data.categoria}
              </Badge>
              <Badge className={`text-xs ${config.color}`}>
                {config.icon}
                <span className="ml-1">Gravidade: {config.label}</span>
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Confiança: {(data.confianca * 100).toFixed(0)}%
              </Badge>
              {data.incerteza > 0.3 && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  Incerteza: {(data.incerteza * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* Raciocínio resumido sempre visível */}
        {data.raciocinio_resumido.length > 0 && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
            <p className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> Por que sinalizamos:
            </p>
            <ul className="text-sm text-slate-700 space-y-1">
              {data.raciocinio_resumido.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-slate-400 text-xs mt-1">{idx + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2">
          <Tabs defaultValue="evidencias" className="w-full">
            <TabsList className="grid grid-cols-5 w-full h-auto">
              <TabsTrigger value="evidencias" className="text-xs py-2 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span className="hidden sm:inline">Evidências</span>
              </TabsTrigger>
              <TabsTrigger value="regras" className="text-xs py-2 flex items-center gap-1">
                <Scale className="w-3 h-3" />
                <span className="hidden sm:inline">Regras</span>
              </TabsTrigger>
              <TabsTrigger value="fundamentos" className="text-xs py-2 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span className="hidden sm:inline">Fundamentos</span>
              </TabsTrigger>
              <TabsTrigger value="alternativas" className="text-xs py-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                <span className="hidden sm:inline">Alternativas</span>
              </TabsTrigger>
              <TabsTrigger value="auditoria" className="text-xs py-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="hidden sm:inline">Auditoria</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Evidências */}
            <TabsContent value="evidencias" className="mt-4 space-y-3">
              {data.evidencias.length > 0 ? (
                data.evidencias.map((ev, idx) => (
                  <div key={idx} className="border p-3 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-600">
                        Página {ev.pagina + 1}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Similaridade: {(ev.similaridade * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700 italic bg-amber-50 p-2 rounded border-l-2 border-amber-400">
                      "{ev.trecho}"
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 text-xs"
                      onClick={() => onAction?.('goto_trecho', data.alerta_id, { pagina: ev.pagina })}
                    >
                      <Eye className="w-3 h-3 mr-1" /> Ver no documento
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma evidência específica identificada
                </p>
              )}
            </TabsContent>

            {/* Tab Regras */}
            <TabsContent value="regras" className="mt-4 space-y-3">
              {data.regras_humanas.length > 0 ? (
                data.regras_humanas.map((r) => (
                  <div key={r.id} className="border p-3 rounded-lg bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs font-mono">
                        {r.id}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-800 mb-1">{r.descricao}</p>
                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                      <span className="font-medium">Critério objetivo:</span> {r.criterio_objetivo}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma regra específica aplicada
                </p>
              )}
            </TabsContent>

            {/* Tab Fundamentos */}
            <TabsContent value="fundamentos" className="mt-4 space-y-3">
              {data.fundamentos.length > 0 ? (
                data.fundamentos.map((f, idx) => (
                  <div key={idx} className="border p-3 rounded-lg bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                        {f.norma}
                      </Badge>
                      {f.artigo_item && (
                        <span className="text-xs font-medium text-slate-600">{f.artigo_item}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700">{f.justificativa}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum fundamento normativo específico
                </p>
              )}
            </TabsContent>

            {/* Tab Alternativas */}
            <TabsContent value="alternativas" className="mt-4 space-y-4">
              {/* Sugestões de redação */}
              {data.sugestoes_redacao.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-600" /> Sugestões de redação:
                  </p>
                  <div className="space-y-2">
                    {data.sugestoes_redacao.map((s, idx) => (
                      <div key={idx} className="border p-3 rounded-lg bg-green-50 border-green-200">
                        <p className="text-sm text-green-800">{s}</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 text-xs text-green-700"
                          onClick={() => onAction?.('aplicar_sugestao', data.alerta_id, { sugestao: s })}
                        >
                          <ThumbsUp className="w-3 h-3 mr-1" /> Aplicar sugestão
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contrapontos */}
              {data.contrapontos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-amber-600" /> Por que poderia NÃO ser risco:
                  </p>
                  <ul className="space-y-2">
                    {data.contrapontos.map((c, idx) => (
                      <li key={idx} className="border p-3 rounded-lg bg-amber-50 border-amber-200 text-sm text-amber-800">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.sugestoes_redacao.length === 0 && data.contrapontos.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma alternativa disponível
                </p>
              )}
            </TabsContent>

            {/* Tab Auditoria */}
            <TabsContent value="auditoria" className="mt-4">
              <div className="border p-4 rounded-lg bg-slate-50 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Modelo</p>
                    <p className="font-medium text-slate-700">{data.auditoria.modelo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Conjunto de Políticas</p>
                    <p className="font-medium text-slate-700">{data.auditoria.policy_set}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Data/Hora</p>
                    <p className="font-medium text-slate-700">
                      {new Date(data.auditoria.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {data.auditoria.usuario && (
                    <div>
                      <p className="text-xs text-slate-500">Usuário</p>
                      <p className="font-medium text-slate-700">{data.auditoria.usuario}</p>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t mt-3">
                  <p className="text-xs text-slate-500">ID do Alerta</p>
                  <p className="font-mono text-xs text-slate-600">{data.alerta_id}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Ações */}
          {data.acoes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              {data.acoes.map((acao, idx) => (
                <Button
                  key={idx}
                  variant={acao.acao === 'contestar_alerta' ? 'outline' : 'default'}
                  size="sm"
                  className={`text-xs ${
                    acao.acao === 'contestar_alerta' 
                      ? 'border-red-200 text-red-600 hover:bg-red-50' 
                      : acao.acao.includes('sugestao') || acao.acao.includes('gerar')
                        ? 'bg-green-600 hover:bg-green-700'
                        : ''
                  }`}
                  onClick={() => onAction?.(acao.acao, data.alerta_id, acao.goto)}
                >
                  {acao.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default XaiAlertCard;
