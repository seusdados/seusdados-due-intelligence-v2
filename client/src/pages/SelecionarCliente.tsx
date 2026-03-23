import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { 
  Building2, 
  Search, 
  Users, 
  FileCheck, 
  AlertTriangle,
  ArrowRight,
  Plus
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";

export default function SelecionarCliente() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: organizations, isLoading } = trpc.organization.list.useQuery();

  const filteredOrganizations = useMemo(() => {
    if (!organizations) return [];
    if (!searchTerm) return organizations;
    
    const term = searchTerm.toLowerCase();
    return organizations.filter(org => 
      org.name.toLowerCase().includes(term) ||
      org.tradeName?.toLowerCase().includes(term) ||
      org.cnpj?.includes(term)
    );
  }, [organizations, searchTerm]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96 mb-8" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/logo-seusdados.png" 
              alt="Seusdados" 
              className="h-8"
            />
            <div className="h-6 w-px bg-slate-200" />
            <span className="text-sm text-slate-500 font-light">
              Área do Consultor
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              {user?.name}
            </span>
            <Badge variant="secondary" className="bg-violet-100 text-violet-700">
              {user?.role === 'admin_global' ? 'Admin' : 'Consultor'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-light text-slate-800 mb-2">
            Selecione uma Organização Cliente
          </h1>
          <p className="text-slate-500 font-light">
            Escolha o cliente para visualizar avaliações, terceiros e gerenciar dados
          </p>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome, nome fantasia ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <Button 
            onClick={() => setLocation('/admin/organizacoes/nova')}
            className="btn-gradient-seusdados text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Organização
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-violet-100">
                <Building2 className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-light text-slate-800">{organizations?.length || 0}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Organizações</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-light text-slate-800">--</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Terceiros</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <FileCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-light text-slate-800">--</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Avaliações</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-light text-slate-800">--</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Pendências</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organizations Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrganizations.map((org) => (
            <Card 
              key={org.id} 
              className="bg-white hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => setLocation(`/cliente/${org.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {org.logoUrl ? (
                      <img 
                        src={org.logoUrl} 
                        alt={org.name} 
                        className="h-10 w-10 rounded-lg object-contain bg-slate-100"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {org.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base font-medium text-slate-800 group-hover:text-violet-600 transition-colors">
                        {org.tradeName || org.name}
                      </CardTitle>
                      {org.tradeName && (
                        <CardDescription className="text-xs">
                          {org.name}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  {org.cnpj && (
                    <p className="text-slate-500 font-light">
                      CNPJ: {org.cnpj}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Badge 
                      variant={org.isActive ? "default" : "secondary"}
                      className={org.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}
                    >
                      {org.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                    {org.city && (
                      <Badge variant="outline" className="font-light">
                        {org.city}/{org.state}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOrganizations.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              Nenhuma organização encontrada
            </h3>
            <p className="text-slate-500 font-light mb-4">
              {searchTerm ? "Tente ajustar os termos de busca" : "Cadastre a primeira organização cliente"}
            </p>
            <Button 
              onClick={() => setLocation('/admin/organizacoes/nova')}
              className="btn-gradient-seusdados text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Organização
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
