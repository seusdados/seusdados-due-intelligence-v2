/**
 * Componente de Card de Ação do Plano com Explicabilidade XAI
 * Exibe ações do plano de ação com camadas de explicabilidade
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  AlertTriangle,
  Scale, 
  BookOpen, 
  Lightbulb, 
  Clock,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Target
} from "lucide-react";
import { useState } from "react";

// Tipos para ações XAI
export interface AcaoExplicabilidade {
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
}

export interface AcaoPlanoExplicavel {
  id: string;
  titulo: string;
  descricao: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  prazo: string;
  responsavel: string;
  status: string;
  explicabilidade: AcaoExplicabilidade;
}

interface XaiActionCardProps {
  data: AcaoPlanoExplicavel;
  index: number;
  onStatusChange?: (id: string, status: string) => void;
}

export function XaiActionCard({ 
  data, 
  index,
  onStatusChange
}: XaiActionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const prioridadeConfig = {
    baixa: { 
      color: "bg-green-100 text-green-800 border-green-200", 
      label: "Baixa"
    },
    media: { 
      color: "bg-amber-100 text-amber-800 border-amber-200", 
      label: "Média"
    },
    alta: { 
      color: "bg-orange-100 text-orange-800 border-orange-200", 
      label: "Alta"
    },
    critica: { 
      color: "bg-red-100 text-red-800 border-red-200", 
      label: "Crítica"
    },
  };

  const config = prioridadeConfig[data.prioridade];

  return (
    <Card className={`w-full shadow-md rounded-xl border-l-4 ${
      data.prioridade === 'critica' ? 'border-l-red-500' :
      data.prioridade === 'alta' ? 'border-l-orange-500' :
      data.prioridade === 'media' ? 'border-l-amber-500' :
      'border-l-green-500'
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="text-slate-500 text-sm">#{index + 1}</span>
              {data.titulo}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge className={`text-xs ${config.color}`}>
                <AlertTriangle className="w-3 h-3 mr-1" />
                Prioridade: {config.label}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                {data.prazo}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <User className="w-3 h-3 mr-1" />
                {data.responsavel}
              </Badge>
              <Badge 
                className={`text-xs ${
                  data.explicabilidade.confianca >= 0.8 
                    ? 'bg-green-100 text-green-800' 
                    : data.explicabilidade.confianca >= 0.6 
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                Confiança: {(data.explicabilidade.confianca * 100).toFixed(0)}%
              </Badge>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* Descrição da ação */}
        <div className="mt-3 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-700">
            {data.descricao}
          </p>
        </div>

        {/* Raciocínio resumido */}
        {data.explicabilidade.raciocinio.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs font-medium text-blue-600 mb-1 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> Por que esta ação foi recomendada:
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              {data.explicabilidade.raciocinio.slice(0, 2).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-400 text-xs mt-1">{idx + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2">
          <Tabs defaultValue="riscos" className="w-full">
            <TabsList className="grid grid-cols-5 w-full h-auto">
              <TabsTrigger value="riscos" className="text-xs py-2 flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span className="hidden sm:inline">Riscos</span>
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

            {/* Tab Riscos Associados */}
            <TabsContent value="riscos" className="mt-4 space-y-3">
              {data.explicabilidade.riscos_associados.length > 0 ? (
                data.explicabilidade.riscos_associados.map((r, idx) => (
                  <div key={idx} className="border p-3 rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-600">
                        Risco {idx + 1}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Relevância: {(r.similaridade * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700 italic bg-red-50 p-2 rounded border-l-2 border-red-400">
                      "{r.trecho}"
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum risco específico associado
                </p>
              )}
            </TabsContent>

            {/* Tab Regras */}
            <TabsContent value="regras" className="mt-4 space-y-3">
              {data.explicabilidade.regras_aplicadas.length > 0 ? (
                data.explicabilidade.regras_aplicadas.map((r) => (
                  <div key={r.id} className="border p-3 rounded-lg bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs font-mono">
                        {r.id}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-800 mb-1">{r.descricao}</p>
                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                      <span className="font-medium">Critério:</span> {r.criterio_objetivo}
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
              {data.explicabilidade.fundamentos.length > 0 ? (
                data.explicabilidade.fundamentos.map((f, idx) => (
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
              {data.explicabilidade.alternativas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Alternativas de implementação:</p>
                  <ul className="space-y-2">
                    {data.explicabilidade.alternativas.map((a, idx) => (
                      <li key={idx} className="border p-3 rounded-lg bg-green-50 border-green-200 text-sm text-green-800">
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.explicabilidade.contrapontos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">Pontos de atenção:</p>
                  <ul className="space-y-2">
                    {data.explicabilidade.contrapontos.map((c, idx) => (
                      <li key={idx} className="border p-3 rounded-lg bg-amber-50 border-amber-200 text-sm text-amber-800">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.explicabilidade.alternativas.length === 0 && data.explicabilidade.contrapontos.length === 0 && (
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
                    <p className="font-medium text-slate-700">{data.explicabilidade.auditoria.modelo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Conjunto de Políticas</p>
                    <p className="font-medium text-slate-700">{data.explicabilidade.auditoria.policy_set}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Data/Hora</p>
                    <p className="font-medium text-slate-700">
                      {new Date(data.explicabilidade.auditoria.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {data.explicabilidade.auditoria.usuario && (
                    <div>
                      <p className="text-xs text-slate-500">Usuário</p>
                      <p className="font-medium text-slate-700">{data.explicabilidade.auditoria.usuario}</p>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t mt-3">
                  <p className="text-xs text-slate-500">ID da Ação</p>
                  <p className="font-mono text-xs text-slate-600">{data.id}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}

export default XaiActionCard;
