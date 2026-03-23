import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { KPICards, KPICardData } from "@/components/KPICards";
import { 
  Palette, 
  Type, 
  LayoutGrid, 
  Component, 
  FileSearch,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Building2,
  Shield,
  TrendingUp
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function StyleGuide() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Dados de exemplo para KPICards
  const exampleKPIData: KPICardData[] = [
    { title: "Total", value: 42, subtitle: "itens", icon: FileSearch, color: "violet" },
    { title: "Concluídos", value: 28, subtitle: "finalizados", icon: CheckCircle, color: "emerald" },
    { title: "Em Andamento", value: 10, subtitle: "em progresso", icon: Clock, color: "amber" },
    { title: "Críticos", value: 4, subtitle: "atenção", icon: AlertTriangle, color: "red" },
  ];

  const colors = [
    { name: "violet", class: "from-violet-500 to-violet-600", hex: "#8B5CF6" },
    { name: "emerald", class: "from-emerald-500 to-emerald-600", hex: "#10B981" },
    { name: "amber", class: "from-amber-500 to-amber-600", hex: "#F59E0B" },
    { name: "red", class: "from-red-500 to-red-600", hex: "#EF4444" },
    { name: "blue", class: "from-blue-500 to-blue-600", hex: "#3B82F6" },
    { name: "cyan", class: "from-cyan-500 to-cyan-600", hex: "#06B6D4" },
    { name: "pink", class: "from-pink-500 to-pink-600", hex: "#EC4899" },
    { name: "orange", class: "from-orange-500 to-orange-600", hex: "#F97316" },
    { name: "teal", class: "from-teal-500 to-teal-600", hex: "#14B8A6" },
    { name: "indigo", class: "from-indigo-500 to-indigo-600", hex: "#6366F1" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Guia de Estilo"
        subtitle="Documentação dos padrões visuais e componentes da plataforma Seusdados"
        icon={Palette}
        showBack={true}
        showDPOButton={false}
      />

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="colors" className="gap-2">
            <Palette className="h-4 w-4" />
            Cores
          </TabsTrigger>
          <TabsTrigger value="typography" className="gap-2">
            <Type className="h-4 w-4" />
            Tipografia
          </TabsTrigger>
          <TabsTrigger value="components" className="gap-2">
            <Component className="h-4 w-4" />
            Componentes
          </TabsTrigger>
          <TabsTrigger value="layout" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Layout
          </TabsTrigger>
        </TabsList>

        {/* Cores */}
        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paleta de Cores</CardTitle>
              <CardDescription>
                Cores disponíveis para uso nos componentes KPICards e gradientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {colors.map((color) => (
                  <div key={color.name} className="space-y-2">
                    <div 
                      className={`h-20 rounded-lg bg-gradient-to-br ${color.class} shadow-lg`}
                    />
                    <div className="text-center">
                      <p className="font-medium text-sm">{color.name}</p>
                      <p className="text-xs text-muted-foreground">{color.hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cores Semânticas</CardTitle>
              <CardDescription>
                Cores do tema que se adaptam ao modo claro/escuro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="h-16 rounded-lg bg-primary" />
                  <p className="text-sm font-medium">Primary</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 rounded-lg bg-secondary" />
                  <p className="text-sm font-medium">Secondary</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 rounded-lg bg-accent" />
                  <p className="text-sm font-medium">Accent</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 rounded-lg bg-destructive" />
                  <p className="text-sm font-medium">Destructive</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 rounded-lg bg-muted" />
                  <p className="text-sm font-medium">Muted</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 rounded-lg bg-card border" />
                  <p className="text-sm font-medium">Card</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 rounded-lg bg-popover border" />
                  <p className="text-sm font-medium">Popover</p>
                </div>
                <div className="space-y-2">
                  <div className="h-16 rounded-lg bg-background border" />
                  <p className="text-sm font-medium">Background</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tema Atual: {theme === 'dark' ? 'Escuro' : 'Claro'}</CardTitle>
              <CardDescription>
                Alterne entre os temas usando o botão no menu do usuário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => toggleTheme && toggleTheme()}>
                Alternar para {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tipografia */}
        <TabsContent value="typography" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Escala Modular 1.35</CardTitle>
              <CardDescription>
                Hierarquia tipográfica baseada em escala modular com razão 1.35
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h1 className="mb-2">Heading 1 - 40px / Semi Bold</h1>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{"<h1>"} ou .heading-1</code>
                </div>
                <div className="border-b pb-4">
                  <h2 className="mb-2">Heading 2 - 30px / Semi Bold</h2>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{"<h2>"} ou .heading-2</code>
                </div>
                <div className="border-b pb-4">
                  <h3 className="mb-2">Heading 3 - 22px / Semi Bold</h3>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{"<h3>"} ou .heading-3</code>
                </div>
                <div className="border-b pb-4">
                  <h4 className="mb-2">Heading 4 - 18px / Semi Bold</h4>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{"<h4>"} ou .heading-4</code>
                </div>
                <div className="border-b pb-4">
                  <p className="mb-2">Parágrafo - 16px / Extra Light (200)</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{"<p>"} ou .body-text</code>
                </div>
                <div className="border-b pb-4">
                  <p className="body-small mb-2">Body Small - 14px / Light (300)</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded">.body-small</code>
                </div>
                <div>
                  <small className="mb-2 block">Caption - 12px / Light (300)</small>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{"<small>"} ou .caption</code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pesos de Fonte</CardTitle>
              <CardDescription>
                Fonte Inter com pesos específicos para cada contexto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p style={{ fontWeight: 200 }}>Extra Light (200) - Corpo principal</p>
                <p style={{ fontWeight: 300 }}>Light (300) - Texto secundário</p>
                <p style={{ fontWeight: 400 }}>Regular (400) - Ênfase leve</p>
                <p style={{ fontWeight: 500 }}>Medium (500) - Labels</p>
                <p style={{ fontWeight: 600 }}>Semi Bold (600) - Títulos</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Componentes */}
        <TabsContent value="components" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>PageHeader</CardTitle>
              <CardDescription>
                Componente de cabeçalho padronizado para todas as páginas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/30">
                <PageHeader
                  title="Exemplo de Título"
                  subtitle="Descrição breve da página ou módulo"
                  icon={Shield}
                  showBack={false}
                  showDPOButton={false}
                />
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto">{`<PageHeader
  title="Título da Página"
  subtitle="Descrição"
  icon={Shield}
  showBack={false}
  showDPOButton={true}
  dpoContext={{ module: "Módulo", page: "Página" }}
  actions={<Button>Ação</Button>}
/>`}</pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>KPICards</CardTitle>
              <CardDescription>
                Cards de indicadores-chave de performance com 10 cores disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <KPICards cards={exampleKPIData} />
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto">{`<KPICards
  cards={[
    { title: "Total", value: 42, subtitle: "itens", icon: FileSearch, color: "violet" },
    { title: "Concluídos", value: 28, subtitle: "finalizados", icon: CheckCircle, color: "emerald" },
    { title: "Em Andamento", value: 10, subtitle: "em progresso", icon: Clock, color: "amber" },
    { title: "Críticos", value: 4, subtitle: "atenção", icon: AlertTriangle, color: "red" },
  ]}
/>`}</pre>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Cores disponíveis:</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <Badge key={c.name} variant="outline">{c.name}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Botões</CardTitle>
              <CardDescription>
                Variantes de botões disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
              <CardDescription>
                Variantes de badges para status e categorias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
              <CardDescription>
                Campos de entrada padronizados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 max-w-sm">
                <Label htmlFor="example">Label do Campo</Label>
                <Input id="example" placeholder="Placeholder..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout */}
        <TabsContent value="layout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estrutura de Página</CardTitle>
              <CardDescription>
                Padrão recomendado para estruturar páginas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto">{`<div className="space-y-6">
  {/* 1. Breadcrumbs (opcional) */}
  <DynamicBreadcrumbs />
  
  {/* 2. Header da página */}
  <PageHeader
    title="Título"
    subtitle="Descrição"
    icon={Icon}
    actions={<Button>Ação</Button>}
  />
  
  {/* 3. Cards de KPI (quando aplicável) */}
  <KPICards cards={[...]} />
  
  {/* 4. Conteúdo principal */}
  <Card>
    <CardHeader>...</CardHeader>
    <CardContent>...</CardContent>
  </Card>
</div>`}</pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Espaçamentos</CardTitle>
              <CardDescription>
                Escala de espaçamentos baseada na escala modular
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-8 bg-primary rounded" />
                  <span>xs - 8px (0.5rem)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-3 h-8 bg-primary rounded" />
                  <span>sm - 12px (0.75rem)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-4 h-8 bg-primary rounded" />
                  <span>base - 16px (1rem)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-6 h-8 bg-primary rounded" />
                  <span>lg - 22px (1.375rem)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-primary rounded" />
                  <span>xl - 30px (1.875rem)</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-8 bg-primary rounded" />
                  <span>2xl - 40px (2.5rem)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Grid de Cards</CardTitle>
              <CardDescription>
                Padrões de grid para diferentes quantidades de cards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">4 cards (KPIs):</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4</code>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">3 cards:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">grid grid-cols-1 md:grid-cols-3 gap-4</code>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">2 cards:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">grid grid-cols-1 md:grid-cols-2 gap-4</code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
