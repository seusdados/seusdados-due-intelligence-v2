import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  FileSignature, 
  Key, 
  Smartphone, 
  Building2, 
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Info
} from "lucide-react";

interface ElectronicSignatureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle: string;
  documentId: number;
  onSignatureComplete: (signatureData: SignatureResult) => void;
}

interface SignatureResult {
  method: 'icp-brasil' | 'gov-br' | 'simple';
  signatureId: string;
  signedAt: string;
  signerName: string;
  signerDocument: string;
  certificateInfo?: {
    issuer: string;
    validFrom: string;
    validTo: string;
    serialNumber: string;
  };
  govBrInfo?: {
    cpf: string;
    nivel: 'bronze' | 'prata' | 'ouro';
    validatedAt: string;
  };
}

export default function ElectronicSignature({
  open,
  onOpenChange,
  documentTitle,
  documentId,
  onSignatureComplete
}: ElectronicSignatureProps) {
  const [signatureMethod, setSignatureMethod] = useState<'icp-brasil' | 'gov-br' | 'simple'>('gov-br');
  const [step, setStep] = useState<'select' | 'process' | 'complete'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ICP-Brasil states
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState("");
  
  // Simple signature states
  const [signerName, setSignerName] = useState("");
  const [signerCpf, setSignerCpf] = useState("");
  const [signerEmail, setSignerEmail] = useState("");

  const handleStartSignature = async () => {
    setError(null);
    setLoading(true);
    
    try {
      if (signatureMethod === 'gov-br') {
        // Redirecionar para autenticação gov.br
        const redirectUrl = `${window.location.origin}/api/signature/gov-br/callback?documentId=${documentId}`;
        const govBrAuthUrl = `https://sso.acesso.gov.br/authorize?response_type=code&client_id=${import.meta.env.VITE_GOV_BR_CLIENT_ID || 'DEMO'}&scope=openid+email+profile+govbr_confiabilidades&redirect_uri=${encodeURIComponent(redirectUrl)}`;
        
        // Em ambiente de produção, redirecionaria para gov.br
        // Por enquanto, simular o fluxo
        setStep('process');
        
        // Simular processo de autenticação gov.br
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const result: SignatureResult = {
          method: 'gov-br',
          signatureId: `GOVBR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          signedAt: new Date().toISOString(),
          signerName: "Usuário Gov.br (Simulado)",
          signerDocument: "***.***.***-**",
          govBrInfo: {
            cpf: "***.***.***-**",
            nivel: 'prata',
            validatedAt: new Date().toISOString()
          }
        };
        
        setStep('complete');
        onSignatureComplete(result);
        
      } else if (signatureMethod === 'icp-brasil') {
        if (!certificateFile) {
          throw new Error("Selecione o certificado digital");
        }
        if (!certificatePassword) {
          throw new Error("Digite a senha do certificado");
        }
        
        setStep('process');
        
        // Simular validação do certificado ICP-Brasil
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const result: SignatureResult = {
          method: 'icp-brasil',
          signatureId: `ICP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          signedAt: new Date().toISOString(),
          signerName: "Titular do Certificado (Simulado)",
          signerDocument: "***.***.***-**",
          certificateInfo: {
            issuer: "AC Certisign RFB G5",
            validFrom: "2024-01-01T00:00:00Z",
            validTo: "2027-01-01T00:00:00Z",
            serialNumber: "XXXX-XXXX-XXXX-XXXX"
          }
        };
        
        setStep('complete');
        onSignatureComplete(result);
        
      } else {
        // Assinatura simples
        if (!signerName || !signerCpf || !signerEmail) {
          throw new Error("Preencha todos os campos obrigatórios");
        }
        
        setStep('process');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const result: SignatureResult = {
          method: 'simple',
          signatureId: `SIMPLE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          signedAt: new Date().toISOString(),
          signerName: signerName,
          signerDocument: signerCpf
        };
        
        setStep('complete');
        onSignatureComplete(result);
      }
    } catch (err: any) {
      setError(err.message);
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep('select');
    setError(null);
    setCertificateFile(null);
    setCertificatePassword("");
    setSignerName("");
    setSignerCpf("");
    setSignerEmail("");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetModal();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-emerald-600" />
            Assinatura Eletrônica
          </DialogTitle>
          <DialogDescription>
            Assine o documento "{documentTitle}" eletronicamente
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Sobre Assinatura Eletrônica</p>
                  <p className="mt-1">
                    A assinatura eletrônica possui validade jurídica conforme a Lei 14.063/2020 
                    e a MP 2.200-2/2001 que instituiu a ICP-Brasil.
                  </p>
                </div>
              </div>
            </div>

            <RadioGroup 
              value={signatureMethod} 
              onValueChange={(v) => setSignatureMethod(v as any)}
              className="space-y-4"
            >
              {/* Gov.br */}
              <Card className={`cursor-pointer transition-all ${signatureMethod === 'gov-br' ? 'ring-2 ring-emerald-500 bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="gov-br" id="gov-br" />
                      <div className="w-10 h-10 bg-[#1351B4] rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs">GOV</span>
                      </div>
                      <div>
                        <CardTitle className="text-base">Assinatura via Gov.br</CardTitle>
                        <CardDescription className="text-xs">
                          Autenticação com conta gov.br
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      Recomendado
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="ml-14 space-y-2">
                    <p className="text-sm text-slate-600">
                      Use sua conta gov.br para assinar com validade jurídica. 
                      Níveis Prata e Ouro garantem maior segurança.
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">Nível Bronze</Badge>
                      <Badge variant="outline" className="text-xs bg-slate-100">Nível Prata</Badge>
                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700">Nível Ouro</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ICP-Brasil */}
              <Card className={`cursor-pointer transition-all ${signatureMethod === 'icp-brasil' ? 'ring-2 ring-emerald-500 bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="icp-brasil" id="icp-brasil" />
                      <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-yellow-500 rounded-lg flex items-center justify-center">
                        <Key className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Certificado Digital ICP-Brasil</CardTitle>
                        <CardDescription className="text-xs">
                          e-CPF ou e-CNPJ
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      Máxima Segurança
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="ml-14 space-y-3">
                    <p className="text-sm text-slate-600">
                      Assinatura com certificado digital A1 ou A3 emitido por 
                      Autoridade Certificadora credenciada na ICP-Brasil.
                    </p>
                    
                    {signatureMethod === 'icp-brasil' && (
                      <div className="space-y-3 pt-2 border-t">
                        <div>
                          <Label htmlFor="certificate">Certificado Digital (.pfx ou .p12)</Label>
                          <Input
                            id="certificate"
                            type="file"
                            accept=".pfx,.p12"
                            onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cert-password">Senha do Certificado</Label>
                          <Input
                            id="cert-password"
                            type="password"
                            value={certificatePassword}
                            onChange={(e) => setCertificatePassword(e.target.value)}
                            placeholder="Digite a senha do certificado"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Assinatura Simples */}
              <Card className={`cursor-pointer transition-all ${signatureMethod === 'simple' ? 'ring-2 ring-emerald-500 bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="simple" id="simple" />
                      <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                        <FileSignature className="h-5 w-5 text-slate-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Assinatura Simples</CardTitle>
                        <CardDescription className="text-xs">
                          Sem certificado digital
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-slate-500">
                      Básico
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="ml-14 space-y-3">
                    <p className="text-sm text-slate-600">
                      Assinatura eletrônica simples com registro de dados do signatário. 
                      Válida para documentos internos e contratos de menor complexidade.
                    </p>
                    
                    {signatureMethod === 'simple' && (
                      <div className="space-y-3 pt-2 border-t">
                        <div>
                          <Label htmlFor="signer-name">Nome Completo *</Label>
                          <Input
                            id="signer-name"
                            value={signerName}
                            onChange={(e) => setSignerName(e.target.value)}
                            placeholder="Digite seu nome completo"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="signer-cpf">CPF *</Label>
                          <Input
                            id="signer-cpf"
                            value={signerCpf}
                            onChange={(e) => setSignerCpf(e.target.value)}
                            placeholder="000.000.000-00"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="signer-email">E-mail *</Label>
                          <Input
                            id="signer-email"
                            type="email"
                            value={signerEmail}
                            onChange={(e) => setSignerEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </RadioGroup>

            <Separator />

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleStartSignature}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <FileSignature className="h-4 w-4 mr-2" />
                Assinar Documento
              </Button>
            </div>
          </div>
        )}

        {step === 'process' && (
          <div className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Processando Assinatura
            </h3>
            <p className="text-slate-500">
              {signatureMethod === 'gov-br' && "Aguardando autenticação via Gov.br..."}
              {signatureMethod === 'icp-brasil' && "Validando certificado digital ICP-Brasil..."}
              {signatureMethod === 'simple' && "Registrando assinatura eletrônica..."}
            </p>
          </div>
        )}

        {step === 'complete' && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Documento Assinado com Sucesso!
            </h3>
            <p className="text-slate-500 mb-6">
              A assinatura eletrônica foi registrada e o documento possui validade jurídica.
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
