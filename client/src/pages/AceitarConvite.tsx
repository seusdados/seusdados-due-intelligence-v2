import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2, 
  UserCheck,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
import { getLoginUrl } from "@/const";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  consultor: "Consultor",
  cliente: "Cliente",
};

const roleBadgeVariants: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  consultor: "secondary",
  cliente: "outline",
};

export default function AceitarConvite() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";

  const { data: inviteData, isLoading, error } = trpc.userInvite.validate.useQuery(
    { token },
    { enabled: !!token }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Erro ao Carregar Convite</CardTitle>
            <CardDescription>
              Não foi possível verificar este convite. Tente novamente mais tarde.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!inviteData.valid) {
    const reasonMessages: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
      not_found: {
        title: "Convite Não Encontrado",
        description: "Este link de convite não existe ou foi removido.",
        icon: <XCircle className="h-8 w-8 text-red-600" />,
      },
      expired: {
        title: "Convite Expirado",
        description: "Este convite expirou. Solicite um novo convite ao administrador.",
        icon: <Clock className="h-8 w-8 text-orange-600" />,
      },
      accepted: {
        title: "Convite Já Aceito",
        description: "Este convite já foi aceito anteriormente. Faça login para acessar a plataforma.",
        icon: <CheckCircle className="h-8 w-8 text-green-600" />,
      },
      cancelled: {
        title: "Convite Cancelado",
        description: "Este convite foi cancelado pelo administrador.",
        icon: <AlertTriangle className="h-8 w-8 text-yellow-600" />,
      },
    };

    const reason = reasonMessages[inviteData.reason || 'not_found'] || reasonMessages.not_found;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {reason.icon}
            </div>
            <CardTitle>{reason.title}</CardTitle>
            <CardDescription>{reason.description}</CardDescription>
          </CardHeader>
          {inviteData.reason === 'accepted' && (
            <CardContent>
              <Button className="w-full" onClick={() => window.location.href = getLoginUrl()}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Fazer Login
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  const expiresAt = inviteData.expiresAt ? new Date(inviteData.expiresAt) : new Date();
  const expiresFormatted = expiresAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-violet-200 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UserCheck className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-2xl text-violet-700 dark:text-violet-300">
            Você foi convidado!
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Para acessar a plataforma Seusdados Due Diligence
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Detalhes do convite */}
          <div className="bg-muted/60 border rounded-lg p-4 space-y-3">
            {inviteData.name && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nome</span>
                <span className="font-medium text-foreground">{inviteData.name}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">E-mail</span>
              <span className="font-medium text-foreground">{inviteData.email}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Papel</span>
            <Badge variant={roleBadgeVariants[inviteData.role || 'sponsor'] || "outline"}>
              {roleLabels[inviteData.role || 'sponsor'] || inviteData.role}
              </Badge>
            </div>
            
            {inviteData.organizationName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Organização</span>
                <div className="flex items-center gap-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{inviteData.organizationName}</span>
                </div>
              </div>
            )}
          </div>

          {/* Aviso de expiração */}
          <div className="flex items-center gap-2 text-sm bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 rounded-lg p-3 text-amber-900 dark:text-amber-200">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>Este convite expira em <strong>{expiresFormatted}</strong></span>
          </div>

          {/* Botão de aceitar */}
          <Button 
            className="w-full h-12 text-base bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg"
            onClick={() => window.location.href = getLoginUrl()}
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Aceitar Convite e Fazer Login
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Ao aceitar, você concorda com os termos de uso da plataforma.
            Após o login, seu acesso será configurado automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
