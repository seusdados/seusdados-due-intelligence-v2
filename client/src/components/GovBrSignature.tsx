import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileSignature, Shield, CheckCircle2, ExternalLink, AlertTriangle, Copy, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SignatureInfo {
  signerName?: string;
  signerCpf?: string;
  signedAt?: string;
  certificateIssuer?: string;
  validUntil?: string;
  isValid?: boolean;
}

interface GovBrSignatureProps {
  documentTitle: string;
  documentContent: string;
  onSignatureComplete?: (signatureInfo: SignatureInfo) => void;
  existingSignature?: SignatureInfo;
  disabled?: boolean;
}

export function GovBrSignature({
  documentTitle,
  documentContent,
  onSignatureComplete,
  existingSignature,
  disabled = false
}: GovBrSignatureProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState('');

  // URL do assinador Gov.br
  const GOVBR_SIGNER_URL = 'https://assinador.iti.gov.br/';
  const GOVBR_VALIDATOR_URL = 'https://validar.iti.gov.br/';

  const handlePrepareDocument = async () => {
    if (!acceptedTerms) {
      toast.error('Você precisa aceitar os termos para continuar');
      return;
    }

    setIsGeneratingPdf(true);
    
    try {
      // Simular geração do PDF para assinatura
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Documento preparado para assinatura!', {
        description: 'Você será redirecionado para o portal Gov.br'
      });

      // Abrir o assinador Gov.br em nova aba
      window.open(GOVBR_SIGNER_URL, '_blank');
      
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao preparar documento');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleVerifySignature = () => {
    if (verificationUrl) {
      window.open(verificationUrl, '_blank');
    } else {
      window.open(GOVBR_VALIDATOR_URL, '_blank');
    }
  };

  const handleCopyValidatorUrl = () => {
    navigator.clipboard.writeText(GOVBR_VALIDATOR_URL);
    toast.success('URL copiada!');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  // Se já existe assinatura, mostrar informações
  if (existingSignature) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg text-green-800">Documento Assinado</CardTitle>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              {existingSignature.isValid ? 'Assinatura Válida' : 'Verificar Assinatura'}
            </Badge>
          </div>
          <CardDescription className="text-green-700">
            Assinatura eletrônica avançada Gov.br (ICP-Brasil)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Assinante:</span>
              <p className="font-medium">{existingSignature.signerName || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">CPF:</span>
              <p className="font-medium">{existingSignature.signerCpf || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Data/Hora:</span>
              <p className="font-medium">{formatDate(existingSignature.signedAt)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Emissor:</span>
              <p className="font-medium">{existingSignature.certificateIssuer || 'Gov.br'}</p>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setIsVerifyDialogOpen(true)}
            >
              <Shield className="h-4 w-4 mr-2" />
              Verificar Assinatura
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyValidatorUrl}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>

        {/* Dialog de verificação */}
        <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verificar Assinatura Digital</DialogTitle>
              <DialogDescription>
                Use o validador oficial do ITI para verificar a autenticidade da assinatura
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Validador ITI Gov.br</p>
                    <p className="text-sm text-blue-700 mt-1">
                      O Instituto Nacional de Tecnologia da Informação (ITI) oferece um serviço 
                      gratuito para validar assinaturas digitais ICP-Brasil.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>URL do Validador</Label>
                <div className="flex gap-2">
                  <Input value={GOVBR_VALIDATOR_URL} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={handleCopyValidatorUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Instruções:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Acesse o validador ITI</li>
                  <li>Faça upload do documento PDF assinado</li>
                  <li>O sistema verificará a autenticidade da assinatura</li>
                  <li>Você receberá um relatório de validação</li>
                </ol>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsVerifyDialogOpen(false)}>
                Fechar
              </Button>
              <Button onClick={handleVerifySignature}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Validador
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // Componente para documento não assinado
  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
            disabled={disabled}
          >
            <FileSignature className="h-4 w-4" />
            Assinar com Gov.br
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img 
                src="https://www.gov.br/++theme++padrao_govbr/img/govbr-logo-large.png" 
                alt="Gov.br" 
                className="h-6"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              Assinatura Eletrônica Avançada
            </DialogTitle>
            <DialogDescription>
              Assine o documento usando sua conta Gov.br (nível Prata ou Ouro)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informações do documento */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-3">
                <FileSignature className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{documentTitle}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {documentContent.length > 200 
                      ? documentContent.substring(0, 200) + '...' 
                      : documentContent}
                  </p>
                </div>
              </div>
            </div>

            {/* Requisitos */}
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Requisitos</p>
                  <ul className="text-sm text-amber-700 mt-1 space-y-1">
                    <li>• Conta Gov.br nível <strong>Prata</strong> ou <strong>Ouro</strong></li>
                    <li>• Certificado digital válido (ICP-Brasil)</li>
                    <li>• Navegador atualizado com JavaScript habilitado</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Fluxo de assinatura */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Como funciona:</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <p>Download do PDF</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <p>Assinar no Gov.br</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <p>Upload do assinado</p>
                </div>
              </div>
            </div>

            {/* Termos */}
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="terms" 
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              />
              <label
                htmlFor="terms"
                className="text-sm leading-tight cursor-pointer"
              >
                Declaro que li e concordo com os termos de uso da assinatura eletrônica 
                Gov.br e autorizo o uso do meu certificado digital para assinar este documento.
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handlePrepareDocument}
              disabled={!acceptedTerms || isGeneratingPdf}
              className="bg-[#1351B4] hover:bg-[#0C326F]"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Preparando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF para Assinar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card informativo quando não há assinatura */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Assinatura Digital</CardTitle>
          </div>
          <CardDescription>
            Este documento ainda não foi assinado digitalmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <p>Use sua conta Gov.br para assinar com validade jurídica</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
              disabled={disabled}
              onClick={() => setIsDialogOpen(true)}
            >
              <FileSignature className="h-4 w-4" />
              Assinar
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default GovBrSignature;
