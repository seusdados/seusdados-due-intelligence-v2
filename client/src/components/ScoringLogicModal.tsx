import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  AlertTriangle, 
  Shield, 
  Target, 
  Scale, 
  BookOpen,
  Calculator,
  TrendingUp,
  CheckCircle2
} from "lucide-react";

interface ScoringLogicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: 'radar' | 'matrix' | 'classification' | 'all';
}

export function ScoringLogicModal({ open, onOpenChange, type = 'all' }: ScoringLogicModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-violet-600" />
            Lógica de Pontuação e Fundamentos
          </DialogTitle>
          <DialogDescription>
            Entenda como calculamos a maturidade e os riscos de terceiros
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={type === 'all' ? 'overview' : type} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="radar">Gráfico Radar</TabsTrigger>
            <TabsTrigger value="matrix">Matriz 5×5</TabsTrigger>
            <TabsTrigger value="classification">Classificação</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-violet-600" />
                  Metodologia de Avaliação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  Nossa metodologia de avaliação de maturidade de terceiros é baseada em <strong>6 categorias principais</strong>, 
                  cada uma com <strong>4 questões específicas</strong>, totalizando <strong>24 critérios de avaliação</strong>.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
                    <h4 className="font-bold text-violet-900 mb-2 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Cálculo de Pontuação
                    </h4>
                    <div className="text-sm text-violet-800 space-y-1">
                      <p><strong>Impacto:</strong> 1 (Mínimo) a 5 (Máximo)</p>
                      <p><strong>Probabilidade:</strong> 1 (Rara) a 5 (Certa)</p>
                      <p><strong>Risco = Impacto × Probabilidade</strong></p>
                      <p className="mt-2 pt-2 border-t border-violet-300">
                        <strong>Pontuação Final:</strong> 0 a 25 pontos
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Fundamento Legal
                    </h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>LGPD Art. 42:</strong> Responsabilidade solidária</p>
                      <p><strong>LGPD Art. 46:</strong> Transferência internacional</p>
                      <p><strong>LGPD Art. 50:</strong> Governança e boas práticas</p>
                      <p><strong>ISO 27001:</strong> Segurança da informação</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg border-2 border-amber-300">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-900">
                      <strong>Importante:</strong> A avaliação considera não apenas a conformidade legal, 
                      mas também a maturidade operacional, capacidade técnica e postura de segurança do terceiro.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categorias de Avaliação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { name: 'Governança de Dados', icon: Shield, color: 'text-purple-600' },
                    { name: 'Segurança da Informação', icon: Shield, color: 'text-blue-600' },
                    { name: 'Conformidade Legal', icon: Scale, color: 'text-green-600' },
                    { name: 'Gestão de Incidentes', icon: AlertTriangle, color: 'text-orange-600' },
                    { name: 'Capacitação e Cultura', icon: TrendingUp, color: 'text-teal-600' },
                    { name: 'Contratos e SLA', icon: CheckCircle2, color: 'text-indigo-600' },
                  ].map((cat, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <cat.icon className={`h-4 w-4 ${cat.color}`} />
                      <span className="text-sm font-medium">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gráfico Radar */}
          <TabsContent value="radar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Como Interpretar o Gráfico Radar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  O gráfico radar (ou spider chart) visualiza a maturidade do terceiro em cada uma das 6 categorias avaliadas.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-bold text-sm">Interpretação Visual</h4>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-violet-600 font-bold">•</span>
                        <span><strong>Área preenchida grande:</strong> Alta maturidade na categoria</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-violet-600 font-bold">•</span>
                        <span><strong>Área preenchida pequena:</strong> Baixa maturidade, requer atenção</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-violet-600 font-bold">•</span>
                        <span><strong>Forma irregular:</strong> Maturidade desigual entre categorias</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-violet-600 font-bold">•</span>
                        <span><strong>Forma regular:</strong> Maturidade equilibrada</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-sm">Cálculo por Categoria</h4>
                    <div className="p-3 bg-violet-50 rounded border border-violet-200 text-sm">
                      <p className="mb-2"><strong>Para cada categoria:</strong></p>
                      <ol className="space-y-1 list-decimal list-inside">
                        <li>Soma-se a pontuação das 4 questões</li>
                        <li>Divide-se por 4 (média)</li>
                        <li>Converte-se para percentual (0-100%)</li>
                      </ol>
                      <p className="mt-3 pt-3 border-t border-violet-300">
                        <strong>Exemplo:</strong> Se as 4 questões de "Governança" tiveram pontuações 
                        15, 20, 18, 22 → Média = 18.75 → 75% de maturidade
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-2">Referências Técnicas</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li><strong>NIST Cybersecurity Framework:</strong> Modelo de maturidade em 5 níveis</li>
                    <li><strong>CMMI (Capability Maturity Model Integration):</strong> Avaliação de processos</li>
                    <li><strong>ISO/IEC 27001:</strong> Controles de segurança da informação</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matriz 5×5 */}
          <TabsContent value="matrix" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Matriz de Risco 5×5 - Metodologia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  A matriz 5×5 é uma ferramenta de gestão de riscos que cruza <strong>Impacto</strong> e <strong>Probabilidade</strong> 
                  para determinar o nível de risco de cada questão avaliada.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold text-sm mb-2">Escala de Impacto (1-5)</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Nível</TableHead>
                          <TableHead>Descrição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-bold">1</TableCell>
                          <TableCell className="text-xs">Impacto mínimo, sem consequências</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold">2</TableCell>
                          <TableCell className="text-xs">Impacto baixo, consequências menores</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold">3</TableCell>
                          <TableCell className="text-xs">Impacto moderado, afeta operações</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold">4</TableCell>
                          <TableCell className="text-xs">Impacto alto, afeta negócio</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold">5</TableCell>
                          <TableCell className="text-xs">Impacto crítico, pode inviabilizar operação</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm mb-2">Escala de Probabilidade (1-5)</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Nível</TableHead>
                          <TableHead>Descrição</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-bold">1</TableCell>
                          <TableCell className="text-xs">Raro (menos de 1 vez/ano)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold">2</TableCell>
                          <TableCell className="text-xs">Improvável (1-2 vezes/ano)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold">3</TableCell>
                          <TableCell className="text-xs">Possível (3-6 vezes/ano)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold">4</TableCell>
                          <TableCell className="text-xs">Provável (mensal)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold">5</TableCell>
                          <TableCell className="text-xs">Quase certo (semanal ou mais)</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-bold text-purple-900 mb-3">Fórmula de Cálculo</h4>
                  <div className="text-center p-4 bg-white rounded border-2 border-purple-300">
                    <p className="text-2xl font-black text-purple-700">
                      Risco = Impacto × Probabilidade
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Resultado: 1 (mínimo) a 25 (máximo)
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-bold text-green-900 mb-2">Exemplo Prático</h4>
                  <p className="text-sm text-green-800">
                    <strong>Cenário:</strong> Terceiro não possui política de backup<br/>
                    <strong>Impacto:</strong> 5 (perda de dados críticos)<br/>
                    <strong>Probabilidade:</strong> 4 (falhas de hardware são comuns)<br/>
                    <strong>Risco = 5 × 4 = 20</strong> → <Badge className="bg-red-900 text-white">Muito Crítico</Badge>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classificação de Risco */}
          <TabsContent value="classification" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Classificação de Risco - Critérios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  A classificação final é determinada pela <strong>maior pontuação de risco</strong> encontrada 
                  entre todas as 24 questões avaliadas.
                </p>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Faixa</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Ação Recomendada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Badge className="bg-green-600 text-white">Baixo</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">1 - 4</TableCell>
                      <TableCell className="text-xs">
                        Terceiro demonstra maturidade adequada em todas as dimensões
                      </TableCell>
                      <TableCell className="text-xs">
                        Monitoramento periódico (semestral)
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Badge className="bg-yellow-600 text-white">Moderado</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">5 - 9</TableCell>
                      <TableCell className="text-xs">
                        Terceiro possui algumas lacunas que devem ser endereçadas
                      </TableCell>
                      <TableCell className="text-xs">
                        Plano de ação com prazo de 90 dias
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Badge className="bg-orange-600 text-white">Alto</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">10 - 14</TableCell>
                      <TableCell className="text-xs">
                        Terceiro apresenta riscos significativos que exigem mitigação
                      </TableCell>
                      <TableCell className="text-xs">
                        Plano de ação urgente (60 dias) + auditoria
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Badge className="bg-red-600 text-white">Crítico</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">15 - 19</TableCell>
                      <TableCell className="text-xs">
                        Riscos elevados que exigem ação imediata e monitoramento contínuo
                      </TableCell>
                      <TableCell className="text-xs">
                        Plano de ação imediato (30 dias) + auditoria presencial
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Badge className="bg-red-900 text-white">Muito Crítico</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">20 - 25</TableCell>
                      <TableCell className="text-xs">
                        Riscos inaceitáveis que podem comprometer a operação e gerar sanções
                      </TableCell>
                      <TableCell className="text-xs">
                        Não prosseguir ou suspender contrato até correção total
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="p-4 bg-red-50 rounded-lg border-2 border-red-300">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-900">
                      <strong>Responsabilidade Solidária (LGPD Art. 42):</strong> O controlador pode ser 
                      responsabilizado por falhas do operador (terceiro). Terceiros com classificação 
                      <strong> Alta, Crítica ou Muito Crítica</strong> representam risco direto de sanções administrativas, 
                      processos judiciais e danos reputacionais.
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-2">Referências Normativas</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li><strong>LGPD Lei 13.709/2018:</strong> Artigos 42, 46, 48, 50</li>
                    <li><strong>ANPD Resolução CD/ANPD nº 2/2022:</strong> Agentes de tratamento de pequeno porte</li>
                    <li><strong>ISO 31000:2018:</strong> Gestão de riscos - Diretrizes</li>
                    <li><strong>NIST SP 800-30:</strong> Guide for Conducting Risk Assessments</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
