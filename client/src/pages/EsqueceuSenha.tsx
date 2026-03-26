import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Mail, AlertCircle, CheckCircle2, ArrowLeft, Loader2, ShieldAlert } from "lucide-react";

export default function EsqueceuSenha() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inactive, setInactive] = useState(false);

  const resetMutation = trpc.localAuth.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      if (data.inactive) {
        setInactive(true);
        setError(data.message);
      } else {
        setSuccess(true);
        setError(null);
      }
    },
    onError: (err) => {
      setError(err.message || "Erro ao solicitar redefinição de senha.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInactive(false);
    if (!email) {
      setError("Informe seu e-mail");
      return;
    }
    resetMutation.mutate({ email });
  };

  // Estado de usuário inativo
  if (inactive) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f1729 0%, #1a2744 25%, #1e3a5f 50%, #1a2744 75%, #0f1729 100%)' }} />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
          <div className="mb-8">
            <img src="/logo-seusdados.png" alt="Seusdados" className="h-16 md:h-20" />
          </div>
          <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 text-center">
            <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Conta Inativa</h2>
            <p className="text-white/60 text-sm mb-6">
              Sua conta está desativada. Entre em contato com o administrador da plataforma para reativar seu acesso.
            </p>
            <Button
              onClick={() => window.location.href = "/login"}
              className="w-full py-5 text-base font-normal rounded-lg"
              style={{ background: '#d4a853', color: '#1a2744' }}
            >
              Voltar ao Login
            </Button>
          </div>
        </div>
        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 py-4 px-6" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-white/50 font-light">
            <div className="mb-2 md:mb-0">
              <span className="font-normal text-white/70">Seusdados Consultoria em Gestão de Dados Ltda.</span>
              <br className="md:hidden" />
              <span className="hidden md:inline"> | </span>
              CNPJ 33.899.116/0001-63 | Responsável Técnico: Marcelo Fattori
            </div>
            <div className="text-center md:text-right">
              <a href="https://www.seusdados.com" className="hover:text-white/70">www.seusdados.com</a>
              <span className="mx-2">|</span>
              <a href="mailto:dpo@seusdados.com" className="hover:text-white/70">dpo@seusdados.com</a>
              <br className="md:hidden" />
              <span className="hidden md:inline mx-2">|</span>
              <span>+55 11 4040 5552</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Estado de sucesso
  if (success) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f1729 0%, #1a2744 25%, #1e3a5f 50%, #1a2744 75%, #0f1729 100%)' }} />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
          <div className="mb-8">
            <img src="/logo-seusdados.png" alt="Seusdados" className="h-16 md:h-20" />
          </div>
          <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">E-mail Enviado!</h2>
            <p className="text-white/60 text-sm mb-2">
              Se o e-mail <strong className="text-white/80">{email}</strong> estiver cadastrado na plataforma, 
              você receberá um link para redefinir sua senha.
            </p>
            <p className="text-white/40 text-xs mb-6">
              Verifique também sua caixa de spam. O link é válido por 1 hora.
            </p>
            <Button
              onClick={() => window.location.href = "/login"}
              className="w-full py-5 text-base font-normal rounded-lg"
              style={{ background: '#d4a853', color: '#1a2744' }}
            >
              Voltar ao Login
            </Button>
          </div>
        </div>
        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 py-4 px-6" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-white/50 font-light">
            <div className="mb-2 md:mb-0">
              <span className="font-normal text-white/70">Seusdados Consultoria em Gestão de Dados Ltda.</span>
              <br className="md:hidden" />
              <span className="hidden md:inline"> | </span>
              CNPJ 33.899.116/0001-63 | Responsável Técnico: Marcelo Fattori
            </div>
            <div className="text-center md:text-right">
              <a href="https://www.seusdados.com" className="hover:text-white/70">www.seusdados.com</a>
              <span className="mx-2">|</span>
              <a href="mailto:dpo@seusdados.com" className="hover:text-white/70">dpo@seusdados.com</a>
              <br className="md:hidden" />
              <span className="hidden md:inline mx-2">|</span>
              <span>+55 11 4040 5552</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Formulário principal
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #0f1729 0%, #1a2744 25%, #1e3a5f 50%, #1a2744 75%, #0f1729 100%)',
        }}
      >
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 50px, rgba(255,255,255,0.03) 50px, rgba(255,255,255,0.03) 100px)`
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="mb-8">
          <img src="/logo-seusdados.png" alt="Seusdados" className="h-16 md:h-20" />
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-white mb-1">Esqueceu a Senha?</h2>
            <p className="text-white/60 text-sm">
              Informe seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="bg-amber-500/20 border-amber-500/50 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-white">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/90">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full py-6 text-base font-normal rounded-lg"
              style={{ background: '#d4a853', color: '#1a2744' }}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Link de Redefinição"
              )}
            </Button>
          </form>

          {/* Voltar ao login */}
          <div className="mt-6 text-center">
            <a 
              href="/login" 
              className="text-white/50 text-sm hover:text-white/70 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar ao login
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div 
        className="absolute bottom-0 left-0 right-0 py-4 px-6"
        style={{ background: 'rgba(0,0,0,0.3)' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs text-white/50 font-light">
          <div className="mb-2 md:mb-0">
            <span className="font-normal text-white/70">Seusdados Consultoria em Gestão de Dados Ltda.</span>
            <br className="md:hidden" />
            <span className="hidden md:inline"> | </span>
            CNPJ 33.899.116/0001-63 | Responsável Técnico: Marcelo Fattori
          </div>
          <div className="text-center md:text-right">
            <a href="https://www.seusdados.com" className="hover:text-white/70">www.seusdados.com</a>
            <span className="mx-2">|</span>
            <a href="mailto:dpo@seusdados.com" className="hover:text-white/70">dpo@seusdados.com</a>
            <br className="md:hidden" />
            <span className="hidden md:inline mx-2">|</span>
            <span>+55 11 4040 5552</span>
          </div>
        </div>
      </div>
    </div>
  );
}
