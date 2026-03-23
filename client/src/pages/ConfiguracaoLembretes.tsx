import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Bell,
  Clock,
  Mail,
  Settings,
  Play,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

export default function ConfiguracaoLembretes() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ orgId: string }>();
  const organizationId = params.orgId ? parseInt(params.orgId) : user?.organizationId;

  const [isEnabled, setIsEnabled] = useState(true);
  const [daysAfterSent, setDaysAfterSent] = useState(7);
  const [maxReminders, setMaxReminders] = useState(3);
  const [reminderInterval, setReminderInterval] = useState(7);

  const { data: settings, isLoading } = trpc.reminderSettings.get.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId }
  );

  const { data: organization } = trpc.organization.getById.useQuery(
    { id: organizationId! },
    { enabled: !!organizationId }
  );

  const upsertMutation = trpc.reminderSettings.upsert.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const processAutoMutation = trpc.reminderSettings.processAutoReminders.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
    },
    onError: (error) => {
      toast.error(`Erro ao processar: ${error.message}`);
    },
  });

  useEffect(() => {
    if (settings) {
      setIsEnabled(Boolean(settings.isEnabled));
      setDaysAfterSent(settings.daysAfterSent);
      setMaxReminders(settings.maxReminders);
      setReminderInterval(settings.reminderInterval);
    }
  }, [settings]);

  const handleSave = () => {
    if (!organizationId) return;
    upsertMutation.mutate({
      organizationId,
      isEnabled,
      daysAfterSent,
      maxReminders,
      reminderInterval,
    });
  };

  const handleProcessNow = () => {
    if (!organizationId) return;
    processAutoMutation.mutate({ organizationId });
  };

  if (!organizationId) {
    return (
      <MainLayout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Organização não encontrada</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm text-primary font-medium tracking-widest uppercase">
              Configurações
            </p>
            <h1 className="text-2xl md:text-3xl font-light text-foreground">
              Lembretes Automáticos
            </h1>
            {organization && (
              <p className="text-muted-foreground mt-1">{organization.name}</p>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Configurações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Configurações de Lembretes
                </CardTitle>
                <CardDescription>
                  Configure quando e como os lembretes serão enviados automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Ativar/Desativar */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enabled" className="text-base">Lembretes Automáticos</Label>
                    <p className="body-small">
                      Enviar lembretes automaticamente para avaliações pendentes
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={isEnabled}
                    onCheckedChange={setIsEnabled}
                  />
                </div>

                {/* Dias após envio */}
                <div className="space-y-2">
                  <Label htmlFor="daysAfterSent">
                    Dias após envio para primeiro lembrete
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="daysAfterSent"
                      type="number"
                      min={1}
                      max={30}
                      value={daysAfterSent}
                      onChange={(e) => setDaysAfterSent(parseInt(e.target.value) || 7)}
                      className="w-24"
                      disabled={!isEnabled}
                    />
                    <span className="body-small">dias</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O primeiro lembrete será enviado após este número de dias sem resposta
                  </p>
                </div>

                {/* Intervalo entre lembretes */}
                <div className="space-y-2">
                  <Label htmlFor="reminderInterval">
                    Intervalo entre lembretes subsequentes
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="reminderInterval"
                      type="number"
                      min={1}
                      max={30}
                      value={reminderInterval}
                      onChange={(e) => setReminderInterval(parseInt(e.target.value) || 7)}
                      className="w-24"
                      disabled={!isEnabled}
                    />
                    <span className="body-small">dias</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Após o primeiro lembrete, os próximos serão enviados neste intervalo
                  </p>
                </div>

                {/* Máximo de lembretes */}
                <div className="space-y-2">
                  <Label htmlFor="maxReminders">
                    Número máximo de lembretes
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="maxReminders"
                      type="number"
                      min={1}
                      max={10}
                      value={maxReminders}
                      onChange={(e) => setMaxReminders(parseInt(e.target.value) || 3)}
                      className="w-24"
                      disabled={!isEnabled}
                    />
                    <span className="body-small">lembretes</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Após atingir este limite, não serão enviados mais lembretes
                  </p>
                </div>

                <Button 
                  onClick={handleSave}
                  disabled={upsertMutation.isPending}
                  className="w-full"
                >
                  {upsertMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Status e Ações */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Status do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      {isEnabled ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium">Lembretes Automáticos</p>
                        <p className="body-small">
                          {isEnabled ? 'Ativados' : 'Desativados'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isEnabled ? "default" : "secondary"}>
                      {isEnabled ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  {settings?.lastProcessedAt && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Última Execução</p>
                        <p className="body-small">
                          {new Date(settings.lastProcessedAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5 text-primary" />
                    Execução Manual
                  </CardTitle>
                  <CardDescription>
                    Processe os lembretes pendentes agora
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleProcessNow}
                    disabled={processAutoMutation.isPending || !isEnabled}
                    variant="outline"
                    className="w-full"
                  >
                    {processAutoMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Processar Lembretes Agora
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Isso enviará lembretes para todas as avaliações pendentes que atendem aos critérios configurados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumo da Configuração</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Primeiro lembrete após <strong>{daysAfterSent} dias</strong> sem resposta
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Lembretes subsequentes a cada <strong>{reminderInterval} dias</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Máximo de <strong>{maxReminders} lembretes</strong> por avaliação
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
