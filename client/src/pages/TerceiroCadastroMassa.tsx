import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";

interface ParsedRow {
  razaoSocial: string;
  cnpj: string;
  nomeFantasia: string;
  nomeContato: string;
  emailContato: string;
  whatsappContato: string;
  areaGestora: string;
  tipoContrato: string;
  valid: boolean;
  errors: string[];
}

export default function TerceiroCadastroMassa() {
  const { user } = useAuth();
  const params = useParams<{ organizationId: string }>();
  const organizationId = parseInt(params.organizationId || "0");
  const [, setLocation] = useLocation();

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importComplete, setImportComplete] = useState(false);

  const createMutation = trpc.thirdParty.create.useMutation();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedData([]);
      setImportComplete(false);
    }
  }, []);

  const handleProcessFile = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    
    try {
      // Read file as text (for CSV) or use xlsx library for Excel
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('Arquivo vazio ou sem dados');
        setIsProcessing(false);
        return;
      }

      // Skip header row
      const dataRows = lines.slice(1);
      
      const parsed: ParsedRow[] = dataRows.map((line, index) => {
        const cols = line.split(';').map(c => c.trim().replace(/^"|"$/g, ''));
        const errors: string[] = [];
        
        const razaoSocial = cols[0] || '';
        const cnpj = cols[1] || '';
        const nomeFantasia = cols[2] || '';
        const nomeContato = cols[3] || '';
        const emailContato = cols[4] || '';
        const whatsappContato = cols[5] || '';
        const areaGestora = cols[6] || '';
        const tipoContrato = cols[7] || '';

        if (!razaoSocial) errors.push('Razão Social obrigatória');
        if (!cnpj) errors.push('CNPJ obrigatório');
        if (!emailContato) errors.push('Email do contato obrigatório');

        return {
          razaoSocial,
          cnpj,
          nomeFantasia,
          nomeContato,
          emailContato,
          whatsappContato,
          areaGestora,
          tipoContrato,
          valid: errors.length === 0,
          errors
        };
      });

      setParsedData(parsed);
      toast.success(`${parsed.length} registros processados`);
    } catch (error) {
      toast.error('Erro ao processar arquivo');
    }
    
    setIsProcessing(false);
  }, [file]);

  const handleImport = useCallback(async () => {
    const validRows = parsedData.filter(r => r.valid);
    if (validRows.length === 0) {
      toast.error('Nenhum registro válido para importar');
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of validRows) {
      try {
        await createMutation.mutateAsync({
          organizationId,
          name: row.razaoSocial,
          tradeName: row.nomeFantasia || undefined,
          cnpj: row.cnpj,
          contactName: row.nomeContato || undefined,
          contactEmail: row.emailContato,
          contactPhone: row.whatsappContato || undefined,
          category: row.tipoContrato || undefined,
          description: row.areaGestora ? `Área Gestora: ${row.areaGestora}` : undefined,
          type: 'fornecedor',
        });
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    setIsProcessing(false);
    setImportComplete(true);
    toast.success(`${successCount} terceiros importados com sucesso. ${errorCount} erros.`);
  }, [parsedData, organizationId, createMutation]);

  const downloadTemplate = useCallback(() => {
    const header = 'Razão Social;CNPJ;Nome Fantasia;Nome do Contato;Email do Contato;WhatsApp do Contato;Área Gestora;Tipo de Contrato';
    const example = 'Empresa Exemplo Ltda;12.345.678/0001-90;Exemplo;João Silva;joao@exemplo.com;11999999999;TI;Prestação de Serviços';
    const content = `${header}\n${example}`;
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_terceiros.csv';
    link.click();
  }, []);

  const validCount = parsedData.filter(r => r.valid).length;
  const invalidCount = parsedData.filter(r => !r.valid).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation(`/cliente/${organizationId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-medium text-slate-800">Cadastro em Massa de Terceiros</h1>
              <p className="text-sm text-slate-500">Importe múltiplos terceiros via arquivo CSV/XLSX</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Instructions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-violet-600" />
              Instruções
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Faça upload de um arquivo CSV ou XLSX com os dados dos terceiros. 
              O arquivo deve conter as seguintes colunas, separadas por ponto e vírgula (;):
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['Razão Social*', 'CNPJ*', 'Nome Fantasia', 'Nome do Contato', 'Email do Contato*', 'WhatsApp', 'Área Gestora', 'Tipo de Contrato'].map((col) => (
                <Badge key={col} variant="outline" className="justify-center">
                  {col}
                </Badge>
              ))}
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Baixar Modelo CSV
            </Button>
          </CardContent>
        </Card>

        {/* Upload */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Upload do Arquivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-violet-600 hover:text-violet-700 font-medium">
                  Clique para selecionar
                </span>
                <span className="text-slate-500"> ou arraste o arquivo aqui</span>
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              {file && (
                <p className="mt-2 text-sm text-slate-600">
                  Arquivo selecionado: <strong>{file.name}</strong>
                </p>
              )}
            </div>

            {file && !parsedData.length && (
              <Button 
                onClick={handleProcessFile} 
                disabled={isProcessing}
                className="w-full btn-gradient-seusdados text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Processar Arquivo
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {parsedData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-medium">Prévia dos Dados</CardTitle>
                  <CardDescription>
                    {validCount} válidos, {invalidCount} com erros
                  </CardDescription>
                </div>
                {!importComplete && (
                  <Button 
                    onClick={handleImport}
                    disabled={isProcessing || validCount === 0}
                    className="btn-gradient-seusdados text-white"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Importar {validCount} Terceiros
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">Razão Social</th>
                      <th className="text-left py-2 px-2">CNPJ</th>
                      <th className="text-left py-2 px-2">Email</th>
                      <th className="text-left py-2 px-2">Erros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 20).map((row, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2 px-2">
                          {row.valid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </td>
                        <td className="py-2 px-2">{row.razaoSocial || '-'}</td>
                        <td className="py-2 px-2">{row.cnpj || '-'}</td>
                        <td className="py-2 px-2">{row.emailContato || '-'}</td>
                        <td className="py-2 px-2 text-red-500 text-xs">
                          {row.errors.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 20 && (
                  <p className="text-sm text-slate-500 mt-2">
                    Mostrando 20 de {parsedData.length} registros
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {importComplete && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-green-800 mb-2">Importação Concluída!</h3>
              <p className="text-green-600 mb-4">Os terceiros foram cadastrados com sucesso.</p>
              <Button 
                onClick={() => setLocation(`/cliente/${organizationId}`)}
                className="btn-gradient-seusdados text-white"
              >
                Voltar para o Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
