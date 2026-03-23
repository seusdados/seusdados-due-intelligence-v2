import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Shield, 
  Bell, 
  Lock,
  Save,
  Settings,
  Building,
  RotateCcw,
  Loader2,
  Sun,
  Moon,
  Monitor,
  Palette,
  Languages,
  Check
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";

// Chave para preferências de toast no localStorage (fallback)
const TOAST_PREFERENCES_KEY = 'seusdados_toast_preferences';

type ToastPreferences = {
  showAutoSelectToast: boolean;
  showManualSelectToast: boolean;
  showClearSelectToast: boolean;
};

const defaultToastPreferences: ToastPreferences = {
  showAutoSelectToast: true,
  showManualSelectToast: true,
  showClearSelectToast: true,
};

// Função para obter preferências de toast (exportada para uso no OrganizationContext)
export function getToastPreferences(): ToastPreferences {
  try {
    const saved = localStorage.getItem(TOAST_PREFERENCES_KEY);
    if (saved) {
      return { ...defaultToastPreferences, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Erro ao carregar preferências de toast:', e);
  }
  return defaultToastPreferences;
}

// Função para salvar preferências de toast
export function saveToastPreferences(prefs: ToastPreferences): void {
  try {
    localStorage.setItem(TOAST_PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Erro ao salvar preferências de toast:', e);
  }
}

export default function Perfil() {
  const { user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { selectedOrganization } = useOrganization();
  const { data: organizations } = trpc.organization.list.useQuery(undefined, { enabled: !!user });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: (user as any)?.phone || "",
  });

  // Sincronizar formData quando user mudar (ex: após refresh)
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        name: user.name || prev.name || "",
        email: user.email || prev.email || "",
        phone: (user as any)?.phone || prev.phone || "",
      }));
    }
  }, [user]);

  const utils = trpc.useUtils();

  // Mutation para atualizar perfil
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!", {
        description: "Suas informações pessoais foram salvas",
        duration: 3000,
      });
      setIsEditing(false);
      // Recarregar dados do usuário
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      console.error('Erro ao atualizar perfil:', error);
      toast.error("Erro ao salvar perfil", {
        description: error.message || "Tente novamente mais tarde",
        duration: 4000,
      });
    },
  });

  // Buscar preferências do banco
  const { data: serverPrefs, isLoading: isLoadingPrefs, refetch: refetchPrefs } = trpc.userPreferences.get.useQuery();
  
  // Mutations para atualizar e resetar preferências
  const updatePrefsMutation = trpc.userPreferences.update.useMutation({
    onSuccess: () => {
      refetchPrefs();
    },
    onError: (error) => {
      console.error('Erro ao salvar preferências:', error);
      toast.error("Erro ao salvar preferências", {
        description: "Tente novamente mais tarde",
      });
    }
  });

  const resetPrefsMutation = trpc.userPreferences.reset.useMutation({
    onSuccess: (data) => {
      refetchPrefs();
      // Atualizar localStorage também
      saveToastPreferences({
        showAutoSelectToast: data.preferences.showAutoSelectToast,
        showManualSelectToast: data.preferences.showManualSelectToast,
        showClearSelectToast: data.preferences.showClearSelectToast,
      });
      toast.success("Preferências restauradas", {
        description: "Todas as configurações foram redefinidas para os valores padrão",
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error('Erro ao resetar preferências:', error);
      toast.error("Erro ao restaurar preferências", {
        description: "Tente novamente mais tarde",
      });
    }
  });

  const toastPreferences: ToastPreferences = {
    showAutoSelectToast: serverPrefs?.showAutoSelectToast ?? true,
    showManualSelectToast: serverPrefs?.showManualSelectToast ?? true,
    showClearSelectToast: serverPrefs?.showClearSelectToast ?? true,
  };

  // Sincronizar localStorage com servidor quando carregar
  useEffect(() => {
    if (serverPrefs) {
      saveToastPreferences({
        showAutoSelectToast: serverPrefs.showAutoSelectToast,
        showManualSelectToast: serverPrefs.showManualSelectToast,
        showClearSelectToast: serverPrefs.showClearSelectToast,
      });
    }
  }, [serverPrefs]);

  const handleSave = () => {
    updateProfileMutation.mutate({
      name: formData.name.trim() || undefined,
      phone: formData.phone.trim() || null,
    });
  };

  const handleCancelEdit = () => {
    // Restaurar dados originais
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      phone: (user as any)?.phone || "",
    });
    setIsEditing(false);
  };

  const handleToastPreferenceChange = (key: keyof ToastPreferences, value: boolean) => {
    // Salvar no servidor
    updatePrefsMutation.mutate({ [key]: value });
    // Salvar no localStorage também para acesso rápido
    const newPrefs = { ...toastPreferences, [key]: value };
    saveToastPreferences(newPrefs);
    toast.success("Preferência salva", {
      description: value ? "Notificação ativada" : "Notificação desativada",
      duration: 2000,
    });
  };

  const handleResetToastPreferences = () => {
    updatePrefsMutation.mutate({
      showAutoSelectToast: true,
      showManualSelectToast: true,
      showClearSelectToast: true,
    });
    saveToastPreferences(defaultToastPreferences);
    toast.success("Preferências restauradas", {
      description: "Todas as notificações de organização foram reativadas",
      duration: 3000,
    });
  };

  const getRoleBadge = (role: string | undefined) => {
    const roleMap: Record<string, { label: string; color: string }> = {
      admin_global: { label: 'Admin Global', color: 'bg-violet-600' },
      consultor: { label: 'Consultor', color: 'bg-blue-600' },
      sponsor: { label: 'Sponsor', color: 'bg-pink-600' },
      comite: { label: 'Comitê', color: 'bg-orange-600' },
      lider_processo: { label: 'Líder de Processo', color: 'bg-teal-600' },
      gestor_area: { label: 'Gestor de Área', color: 'bg-sky-600' },
      terceiro: { label: 'Terceiro', color: 'bg-indigo-600' },
    };
    const config = role ? roleMap[role] : undefined;
    if (config) {
      return <Badge className={config.color}>{config.label}</Badge>;
    }
    return <Badge variant="secondary">Usuário</Badge>;
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const isSaving = updatePrefsMutation.isPending || resetPrefsMutation.isPending || updateProfileMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg">
            <Settings className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Configurações do Perfil
            </h1>
            <p className="text-muted-foreground">
              Gerencie suas informações pessoais e preferências
            </p>
          </div>
        </div>
        {isSaving && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Salvando...</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Informações do Usuário */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações Pessoais
                </CardTitle>
                <CardDescription>
                  Seus dados de identificação na plataforma
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={updateProfileMutation.isPending}
                  >
                    Cancelar
                  </Button>
                )}
                <Button 
                  variant={isEditing ? "default" : "outline"} 
                  size="sm"
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : isEditing ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </>
                  ) : (
                    "Editar"
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-blue-500 text-white text-xl">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{user?.name}</h3>
                <p className="text-muted-foreground">{user?.email}</p>
                <div className="mt-2">
                  {getRoleBadge(user?.role)}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="pl-10 opacity-60"
                  />
                </div>
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado por aqui</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    className="pl-10"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Organização Principal</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={
                      selectedOrganization?.name
                        || (user?.organizationId ? `Organização #${user.organizationId}` : "Acesso global (todas)")
                    }
                    disabled
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Segurança
            </CardTitle>
            <CardDescription>
              Configurações de acesso e autenticação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Autenticação</p>
                  <p className="text-sm text-muted-foreground">E-mail e Senha</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Ativo
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Organizações</p>
                  <p className="text-sm text-muted-foreground">Acesso vinculado</p>
                </div>
              </div>
              <Badge variant="secondary">
                {organizations?.length || (user?.organizationId ? 1 : 0)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Preferências de Toast de Organização */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Notificações de Organização
            </CardTitle>
            <CardDescription>
              Configure as notificações ao selecionar ou trocar de organização
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPrefs ? (
              <div className="grid gap-6 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-11 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Seleção Automática</p>
                    <p className="text-sm text-muted-foreground">Notificar ao selecionar automaticamente</p>
                  </div>
                  <Switch
                    checked={toastPreferences.showAutoSelectToast}
                    onCheckedChange={(checked) => handleToastPreferenceChange('showAutoSelectToast', checked)}
                    disabled={isSaving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Seleção Manual</p>
                    <p className="text-sm text-muted-foreground">Notificar ao trocar de organização</p>
                  </div>
                  <Switch
                    checked={toastPreferences.showManualSelectToast}
                    onCheckedChange={(checked) => handleToastPreferenceChange('showManualSelectToast', checked)}
                    disabled={isSaving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Limpar Seleção</p>
                    <p className="text-sm text-muted-foreground">Notificar ao limpar organização</p>
                  </div>
                  <Switch
                    checked={toastPreferences.showClearSelectToast}
                    onCheckedChange={(checked) => handleToastPreferenceChange('showClearSelectToast', checked)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            )}
            <div className="mt-4 pt-4 border-t flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToastPreferences}
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar Padrões
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Aparência e Tema */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Aparência
            </CardTitle>
            <CardDescription>
              Personalize a aparência da plataforma de acordo com sua preferência
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Seleção de Tema */}
              <div>
                <Label className="text-base font-medium mb-4 block">Tema</Label>
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Tema Claro */}
                  <button
                    onClick={() => setTheme('light')}
                    className={`relative flex flex-col items-center gap-3 p-6 border-2 rounded-xl transition-all duration-200 ${
                      theme === 'light'
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                        : 'border-border hover:border-violet-300 hover:bg-muted/50'
                    }`}
                  >
                    {theme === 'light' && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-5 w-5 text-violet-600" />
                      </div>
                    )}
                    <div className={`p-4 rounded-full ${
                      theme === 'light' ? 'bg-violet-100' : 'bg-muted'
                    }`}>
                      <Sun className={`h-8 w-8 ${
                        theme === 'light' ? 'text-violet-600' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">Claro</p>
                      <p className="text-sm text-muted-foreground">Interface clara e luminosa</p>
                    </div>
                  </button>

                  {/* Tema Escuro */}
                  <button
                    onClick={() => setTheme('dark')}
                    className={`relative flex flex-col items-center gap-3 p-6 border-2 rounded-xl transition-all duration-200 ${
                      theme === 'dark'
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                        : 'border-border hover:border-violet-300 hover:bg-muted/50'
                    }`}
                  >
                    {theme === 'dark' && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-5 w-5 text-violet-600" />
                      </div>
                    )}
                    <div className={`p-4 rounded-full ${
                      theme === 'dark' ? 'bg-violet-100 dark:bg-violet-900' : 'bg-muted'
                    }`}>
                      <Moon className={`h-8 w-8 ${
                        theme === 'dark' ? 'text-violet-600' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">Escuro</p>
                      <p className="text-sm text-muted-foreground">Interface escura para conforto visual</p>
                    </div>
                  </button>

                  {/* Tema do Sistema */}
                  <button
                    onClick={() => setTheme('system')}
                    className={`relative flex flex-col items-center gap-3 p-6 border-2 rounded-xl transition-all duration-200 ${
                      theme === 'system'
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                        : 'border-border hover:border-violet-300 hover:bg-muted/50'
                    }`}
                  >
                    {theme === 'system' && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-5 w-5 text-violet-600" />
                      </div>
                    )}
                    <div className={`p-4 rounded-full ${
                      theme === 'system' ? 'bg-violet-100 dark:bg-violet-900' : 'bg-muted'
                    }`}>
                      <Monitor className={`h-8 w-8 ${
                        theme === 'system' ? 'text-violet-600' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">Sistema</p>
                      <p className="text-sm text-muted-foreground">Segue a preferência do dispositivo</p>
                    </div>
                  </button>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Tema atual aplicado: <span className="font-medium capitalize">{resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}</span>
                </p>
              </div>

              <Separator />

              {/* Idioma (placeholder para futuro) */}
              <div>
                <Label className="text-base font-medium mb-4 block">Idioma</Label>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Languages className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Português (Brasil)</p>
                      <p className="text-sm text-muted-foreground">Idioma da interface</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Padrão</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Suporte a outros idiomas em breve.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
