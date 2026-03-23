import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ClipboardCheck, Shield, Globe, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { frameworksDisponiveis } from "@shared/assessmentData";

export default function ConformidadeNova() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselectedOrg = params.get('org');
  
  const { user } = useAuth();
  
  // ✅ REGRA: Apenas Administradores Globais podem acessar esta página
  useEffect(() => {
    if (user && user.role !== 'admin_global') {
      toast.error('Apenas Administradores Globais podem criar novas avaliações');
      setLocation('/conformidade');
    }
  }, [user, setLocation]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [framework, setFramework] = useState("misto");
  const [organizationId, setOrganizationId] = useState(preselectedOrg || "");

  const { data: organizations } = trpc.organization.list.useQuery(undefined, {
    enabled: user?.role === 'admin_global'
  });
  const createMutation = trpc.compliance.create.useMutation();

  useEffect(() => {
    if (preselectedOrg) {
      setOrganizationId(preselectedOrg);
    } else if (user?.organizationId) {
      setOrganizationId(user.organizationId.toString());
    }
  }, [preselectedOrg, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Informe o título da avaliação");
      return;
    }
    if (!organizationId) {
      toast.error("Selecione uma organização");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        title,
        notes: description,
        framework: framework as 'misto' | 'sgd' | 'ico' | 'cnil' | 'seusdados',
        organizationId: parseInt(organizationId),
      });
      
      toast.success("Avaliação criada com sucesso! O Sponsor será notificado para realizar a vinculação de domínios.");
      
      // Retornar à listagem - não redirecionar para tela de vinculação
      setLocation('/conformidade');
    } catch (error) {
      toast.error("Erro ao criar avaliação");
    }
  };

  const frameworks = Object.values(frameworksDisponiveis);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-cyan-50/20">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        
        <div className="relative max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/conformidade')}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <ClipboardCheck className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Nova Avaliação de Conformidade
                </h1>
                <p className="text-white/70 text-sm">
                  Crie uma nova avaliação PPPD para uma organização
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto px-6 -mt-6 pb-12">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-r from-violet-50 to-purple-50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100">
                <Shield className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Dados da Avaliação</CardTitle>
                <CardDescription>
                  Preencha as informações para iniciar a avaliação de conformidade
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="organization" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-violet-500" />
                  Organização *
                </Label>
                <Select value={organizationId} onValueChange={setOrganizationId}>
                  <SelectTrigger className="border-gray-200 focus:border-violet-500 focus:ring-violet-500">
                    <SelectValue placeholder="Selecione a organização" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-violet-500" />
                  Título da Avaliação *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Avaliação de Conformidade LGPD 2024"
                  className="border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="framework" className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-violet-500" />
                  Framework de Avaliação *
                </Label>
                <Select value={framework} onValueChange={setFramework}>
                  <SelectTrigger className="border-gray-200 focus:border-violet-500 focus:ring-violet-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frameworks.map((fw) => (
                      <SelectItem key={fw.id} value={fw.id}>
                        <div className="flex items-center gap-2">
                          <span>{fw.icone}</span>
                          <span>{fw.nome}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground bg-violet-50 p-2 rounded-lg">
                  {frameworksDisponiveis[framework as keyof typeof frameworksDisponiveis]?.descricao}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Adicione observações ou contexto sobre esta avaliação..."
                  rows={3}
                  className="border-gray-200 focus:border-violet-500 focus:ring-violet-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation('/conformidade')}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                >
                  {createMutation.isPending ? "Criando..." : "Criar e Iniciar Avaliação"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
