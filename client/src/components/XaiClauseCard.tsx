/**
 * Componente de Card de Cláusula LGPD com Explicabilidade XAI
 * Exibe cláusulas geradas com camadas de explicabilidade
 */

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  Scale, 
  BookOpen, 
  Lightbulb, 
  Clock,
  Copy,
  Download,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  X
} from "lucide-react";
import { useState } from "react";

// Tipos para cláusulas XAI
export interface ClausulaExplicabilidade {
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
  sugestoes_alternativas: string[];
  auditoria: {
    modelo: string;
    policy_set: string;
    timestamp: string;
    usuario?: string;
  };
}

export interface ClausulaLGPDExplicavel {
  id: string;
  titulo: string;
  conteudo: string;
  bloco: string;
  categoria: string;
  explicabilidade: ClausulaExplicabilidade;
}

interface XaiClauseCardProps {
  data: ClausulaLGPDExplicavel;
  index: number;
  isAccepted?: boolean;
  onAcceptChange?: (id: string, accepted: boolean) => void;
  onCopy?: (content: string) => void;
  onDownload?: (id: string, titulo: string, content: string) => void;
  onRefine?: (id: string, instructions: string) => void;
  isRefining?: boolean;
}

export function XaiClauseCard({ 
  data, 
  index,
  isAccepted = true,
  onAcceptChange,
  onCopy,
  onDownload,
  onRefine,
  isRefining = false
}: XaiClauseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [refineInstructions, setRefineInstructions] = useState('');

  const handleRefine = () => {
    if (refineInstructions.trim() && onRefine) {
      onRefine(data.id, refineInstructions);
      setRefineInstructions('');
      setShowRefineInput(false);
    }
  };

  return (
    <Card className={`w-full shadow-md rounded-xl transition-all ${
      isAccepted ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-slate-300 opacity-75'
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox 
              checked={isAccepted}
              onCheckedChange={(checked) => onAcceptChange?.(data.id, !!checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span className="text-slate-500 text-sm">#{index + 1}</span>
                {data.titulo}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {data.bloco}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {data.categoria}
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
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onCopy?.(data.conteudo)}
              title="Copiar"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onDownload?.(data.id, data.titulo, data.conteudo)}
              title="Download"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Conteúdo da cláusula */}
        <div className="mt-3 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {data.conteudo}
          </p>
        </div>

        {/* Botão de refinar */}
        <div className="mt-3 flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowRefineInput(!showRefineInput)}
            disabled={isRefining}
            className="text-xs"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {isRefining ? 'Refinando...' : 'Refinar com IA'}
          </Button>
        </div>

        {/* Input de refinamento */}
        {showRefineInput && (
          <div className="mt-3 space-y-2">
            <Textarea
              placeholder="Descreva como deseja ajustar esta cláusula..."
              value={refineInstructions}
              onChange={(e) => setRefineInstructions(e.target.value)}
              className="text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleRefine}
                disabled={!refineInstructions.trim() || isRefining}
                className="text-xs"
              >
                <Check className="w-3 h-3 mr-1" /> Aplicar
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowRefineInput(false);
                  setRefineInstructions('');
                }}
                className="text-xs"
              >
                <X className="w-3 h-3 mr-1" /> Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2">
          <Tabs defaultValue="raciocinio" className="w-full">
            <TabsList className="grid grid-cols-5 w-full h-auto">
              <TabsTrigger value="raciocinio" className="text-xs py-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                <span className="hidden sm:inline">Raciocínio</span>
              </TabsTrigger>
              <TabsTrigger value="regras" className="text-xs py-2 flex items-center gap-1">
                <Scale className="w-3 h-3" />
                <span className="hidden sm:inline">Regras</span>
              </TabsTrigger>
              <TabsTrigger value="fundamentos" className="text-xs py-2 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span className="hidden sm:inline">Fundamentos</span>
              </TabsTrigger>
              <TabsTrigger value="evidencias" className="text-xs py-2 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span className="hidden sm:inline">Evidências</span>
              </TabsTrigger>
              <TabsTrigger value="auditoria" className="text-xs py-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="hidden sm:inline">Auditoria</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Raciocínio */}
            <TabsContent value="raciocinio" className="mt-4 space-y-3">
              {data.explicabilidade.raciocinio.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Por que esta cláusula foi gerada:</p>
                  <ul className="space-y-2">
                    {data.explicabilidade.raciocinio.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 bg-blue-50 p-2 rounded">
                        <span className="text-blue-500 font-medium">{idx + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Raciocínio não disponível
                </p>
              )}

              {data.explicabilidade.contrapontos.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Pontos de atenção:</p>
                  <ul className="space-y-2">
                    {data.explicabilidade.contrapontos.map((item, idx) => (
                      <li key={idx} className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
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

            {/* Tab Evidências */}
            <TabsContent value="evidencias" className="mt-4 space-y-3">
              {data.explicabilidade.evidencias.length > 0 ? (
                data.explicabilidade.evidencias.map((ev, idx) => (
                  <div key={idx} className="border p-3 rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-600">
                        Evidência {idx + 1}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Similaridade: {(ev.similaridade * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700 italic bg-green-50 p-2 rounded border-l-2 border-green-400">
                      "{ev.trecho}"
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma evidência específica
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
                  <p className="text-xs text-slate-500">ID da Cláusula</p>
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

export default XaiClauseCard;
