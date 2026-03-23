/**
 * Componente Premium: Visualização de Cláusulas LGPD
 * Design elegante com folha de rosto, versionamento e formato corporativo
 * "Acordo para Processamento de Dados Pessoais"
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Building2,
  FileCheck,
  Shield,
  History,
  X,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  UserCheck,
  AlertTriangle,
  Fingerprint,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Streamdown } from "streamdown";

interface ContractParty {
  name: string;
  cnpj?: string;
  role: string; // "Controlador" | "Operador" | "Co-controlador"
}

interface ClauseItem {
  id: string;
  number: number;
  title: string;
  content: string;
  bloco?: string;
  version?: number;
  lastModified?: string;
  modifiedBy?: string;
}

interface ApprovalStatus {
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  approvedByName?: string;
  approvedByRole?: string;
  approvalDate?: string;
  comments?: string;
}

interface ClausulasLGPDPremiumViewProps {
  isOpen: boolean;
  onClose: () => void;
  contractTitle: string;
  contractObject?: string;
  analysisDate: string;
  fileName: string;
  parties: ContractParty[];
  clauses: ClauseItem[];
  version?: number;
  onExportPDF?: () => void;
  onExportWord?: () => void;
  onViewHistory?: (clauseId: string) => void;
  // Novas props para aprovação e envio
  approvalStatus?: ApprovalStatus;
  onRequestApproval?: (data: { email: string; name: string; role: string; message: string }) => void;
  onApprove?: (comments: string) => void;
  onReject?: (reason: string) => void;
  onSendEmail?: (data: { emails: string[]; subject: string; message: string }) => void;
  canApprove?: boolean;
  analysisId?: number;
  // Assinatura Digital Gov.br
  onRequestDigitalSignature?: () => void;
  digitalSignatureStatus?: {
    status: 'pending' | 'awaiting_authorization' | 'processing' | 'completed' | 'failed';
    signedAt?: string;
    signerName?: string;
  };
}

export function ClausulasLGPDPremiumView({
  isOpen,
  onClose,
  contractTitle,
  contractObject,
  analysisDate,
  fileName,
  parties,
  clauses,
  version = 1,
  onExportPDF,
  onExportWord,
  onViewHistory,
  approvalStatus,
  onRequestApproval,
  onApprove,
  onReject,
  onSendEmail,
  canApprove = false,
  analysisId,
  onRequestDigitalSignature,
  digitalSignatureStatus,
}: ClausulasLGPDPremiumViewProps) {
  const [currentPage, setCurrentPage] = useState<"cover" | "clauses">("cover");
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Estados para modais de aprovação e envio
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [emailData, setEmailData] = useState({ emails: '', subject: '', message: '' });
  const [requestApprovalData, setRequestApprovalData] = useState({ email: '', name: '', role: '', message: '' });

  const controlador = parties.find(p => p.role === "Controlador" || p.role === "Controladora");
  const operador = parties.find(p => p.role === "Operador" || p.role === "Operadora");

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 gap-0 overflow-hidden">
        {/* Header Premium */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-normal tracking-wide">
                  Acordo para Processamento de Dados Pessoais
                </DialogTitle>
                <p className="text-xs text-slate-400 font-light">
                  Versão {version}.0 • {formatDate(analysisDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onExportPDF && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExportPDF}
                  className="text-white hover:bg-white/10"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              )}
              {onExportWord && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExportWord}
                  className="text-white hover:bg-white/10"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Word
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.print()}
                className="text-white hover:bg-white/10"
              >
                <Printer className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navegação de Páginas */}
          <div className="flex items-center gap-4 mt-4 border-t border-white/10 pt-4">
            <Button
              variant={currentPage === "cover" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCurrentPage("cover")}
              className={currentPage === "cover" ? "bg-white/20" : "text-white hover:bg-white/10"}
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Folha de Rosto
            </Button>
            <Button
              variant={currentPage === "clauses" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCurrentPage("clauses")}
              className={currentPage === "clauses" ? "bg-white/20" : "text-white hover:bg-white/10"}
            >
              <FileText className="h-4 w-4 mr-2" />
              Cláusulas ({clauses.length})
            </Button>
          </div>
        </div>

        {/* Conteúdo */}
        <ScrollArea className="flex-1 max-h-[calc(95vh-180px)]">
          <div ref={contentRef} className="p-8 bg-white min-h-[600px]">
            {currentPage === "cover" ? (
              /* FOLHA DE ROSTO */
              <div className="max-w-3xl mx-auto">
                {/* Cabeçalho Institucional */}
                <div className="text-center mb-12">
                  <div className="inline-flex items-center justify-center p-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 mb-6">
                    <Shield className="h-12 w-12 text-white" />
                  </div>
                  <h1 className="text-3xl font-normal text-slate-800 tracking-tight mb-2">
                    Acordo para Processamento
                  </h1>
                  <h2 className="text-3xl font-normal text-slate-800 tracking-tight mb-4">
                    de Dados Pessoais
                  </h2>
                  <p className="text-sm text-slate-500 font-light tracking-wide uppercase">
                    Data Processing Agreement (DPA)
                  </p>
                </div>

                <Separator className="my-8" />

                {/* Controle de Versão */}
                <div className="bg-slate-50 rounded-xl p-6 mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-normal text-slate-700">Controle de Versão</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-light text-slate-800">{version}.0</p>
                      <p className="text-xs text-slate-500 font-extralight">Versão</p>
                    </div>
                    <div>
                      <p className="text-2xl font-light text-slate-800">{formatDate(analysisDate)}</p>
                      <p className="text-xs text-slate-500 font-extralight">Data da Análise</p>
                    </div>
                    <div>
                      <p className="text-2xl font-light text-slate-800">{clauses.length}</p>
                      <p className="text-xs text-slate-500 font-extralight">Cláusulas</p>
                    </div>
                  </div>
                </div>

                {/* Identificação das Partes */}
                <div className="mb-8">
                  <h3 className="text-lg font-normal text-slate-800 mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                    Identificação das Partes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {controlador && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                        <Badge className="mb-3 bg-blue-600">Controlador(a)</Badge>
                        <p className="text-lg font-normal text-slate-800">{controlador.name}</p>
                        {controlador.cnpj && (
                          <p className="text-sm text-slate-500 font-extralight mt-1">
                            CNPJ: {controlador.cnpj}
                          </p>
                        )}
                      </div>
                    )}
                    {operador && (
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
                        <Badge className="mb-3 bg-emerald-600">Operador(a)</Badge>
                        <p className="text-lg font-normal text-slate-800">{operador.name}</p>
                        {operador.cnpj && (
                          <p className="text-sm text-slate-500 font-extralight mt-1">
                            CNPJ: {operador.cnpj}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Informações do Contrato */}
                <div className="mb-8">
                  <h3 className="text-lg font-normal text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    Informações do Contrato
                  </h3>
                  <div className="bg-slate-50 rounded-xl p-5 space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 font-extralight uppercase tracking-wide mb-1">
                        Título do Contrato
                      </p>
                      <p className="text-base font-normal text-slate-800">{contractTitle}</p>
                    </div>
                    {contractObject && (
                      <div>
                        <p className="text-xs text-slate-500 font-extralight uppercase tracking-wide mb-1">
                          Objeto
                        </p>
                        <p className="text-base font-extralight text-slate-700">{contractObject}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-500 font-extralight uppercase tracking-wide mb-1">
                        Arquivo Analisado
                      </p>
                      <p className="text-base font-extralight text-slate-700 flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-emerald-500" />
                        {fileName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-extralight uppercase tracking-wide mb-1">
                        Data da Análise
                      </p>
                      <p className="text-base font-extralight text-slate-700 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-emerald-500" />
                        {formatDate(analysisDate)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seção de Aprovação e Envio */}
                {(onRequestApproval || onApprove || onSendEmail) && (
                  <div className="mt-8 p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                    <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-emerald-600" />
                      Aprovação e Envio
                    </h3>
                    
                    {/* Status atual da aprovação */}
                    {approvalStatus && (
                      <div className={`mb-4 p-4 rounded-lg border ${
                        approvalStatus.status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
                        approvalStatus.status === 'rejected' ? 'bg-red-50 border-red-200' :
                        approvalStatus.status === 'revision_requested' ? 'bg-amber-50 border-amber-200' :
                        'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {approvalStatus.status === 'approved' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                          {approvalStatus.status === 'rejected' && <XCircle className="h-5 w-5 text-red-600" />}
                          {approvalStatus.status === 'revision_requested' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                          {approvalStatus.status === 'pending' && <Clock className="h-5 w-5 text-slate-500" />}
                          <span className={`font-medium ${
                            approvalStatus.status === 'approved' ? 'text-emerald-700' :
                            approvalStatus.status === 'rejected' ? 'text-red-700' :
                            approvalStatus.status === 'revision_requested' ? 'text-amber-700' :
                            'text-slate-700'
                          }`}>
                            {approvalStatus.status === 'approved' ? 'Aprovado' :
                             approvalStatus.status === 'rejected' ? 'Rejeitado' :
                             approvalStatus.status === 'revision_requested' ? 'Revisão Solicitada' :
                             'Aguardando Aprovação'}
                          </span>
                        </div>
                        {approvalStatus.approvedByName && (
                          <p className="text-sm text-slate-600">
                            Por: {approvalStatus.approvedByName} {approvalStatus.approvedByRole && `(${approvalStatus.approvedByRole})`}
                          </p>
                        )}
                        {approvalStatus.approvalDate && (
                          <p className="text-xs text-slate-500 mt-1">
                            Em: {formatDate(approvalStatus.approvalDate)}
                          </p>
                        )}
                        {approvalStatus.comments && (
                          <p className="text-sm text-slate-600 mt-2 italic">
                            "{approvalStatus.comments}"
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Botões de ação */}
                    <div className="flex flex-wrap gap-3">
                      {onRequestApproval && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowApprovalModal(true)}
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Solicitar Aprovação
                        </Button>
                      )}
                      
                      {canApprove && onApprove && approvalStatus?.status !== 'approved' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setShowApproveModal(true)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprovar DPA
                        </Button>
                      )}
                      
                      {canApprove && onReject && approvalStatus?.status !== 'rejected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRejectModal(true)}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeitar
                        </Button>
                      )}
                      
                      {onSendEmail && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSendEmailModal(true)}
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Enviar por E-mail
                        </Button>
                      )}
                      
                      {/* Botão de Assinatura Digital Gov.br */}
                      {onRequestDigitalSignature && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onRequestDigitalSignature}
                          disabled={digitalSignatureStatus?.status === 'processing' || digitalSignatureStatus?.status === 'completed'}
                          className="border-green-600 text-green-700 hover:bg-green-50"
                        >
                          <Fingerprint className="h-4 w-4 mr-2" />
                          {digitalSignatureStatus?.status === 'completed' 
                            ? 'Assinado Digitalmente' 
                            : digitalSignatureStatus?.status === 'processing'
                            ? 'Processando...'
                            : 'Assinar com Gov.br'}
                        </Button>
                      )}
                    </div>
                    
                    {/* Status da Assinatura Digital */}
                    {digitalSignatureStatus?.status === 'completed' && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700">
                          <Shield className="h-5 w-5" />
                          <span className="font-medium">Documento Assinado Digitalmente</span>
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          Assinado por {digitalSignatureStatus.signerName} em{' '}
                          {digitalSignatureStatus.signedAt 
                            ? new Date(digitalSignatureStatus.signedAt).toLocaleString('pt-BR')
                            : '-'}
                        </p>
                        <p className="text-xs text-green-500 mt-1">
                          Assinatura eletrônica avançada com validade jurídica (Gov.br)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Botão para ir às cláusulas */}
                <div className="text-center mt-12">
                  <Button
                    onClick={() => setCurrentPage("clauses")}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  >
                    Ver Cláusulas
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : (
              /* CLÁUSULAS */
              <div className="max-w-4xl mx-auto">
                {/* Cabeçalho das Cláusulas */}
                <div className="flex items-center justify-between mb-8">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage("cover")}
                    className="text-slate-600"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Voltar à Folha de Rosto
                  </Button>
                  <Badge variant="outline" className="text-emerald-700 border-emerald-200">
                    {clauses.length} Cláusulas
                  </Badge>
                </div>

                <h2 className="text-2xl font-normal text-slate-800 text-center mb-2">
                  Cláusulas do Acordo
                </h2>
                <p className="text-sm text-slate-500 font-extralight text-center mb-8">
                  Acordo para Processamento de Dados Pessoais
                </p>

                <Separator className="mb-8" />

                {/* Lista de Cláusulas */}
                <div className="space-y-8">
                  {clauses.map((clause, index) => (
                    <div
                      key={clause.id}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Header da Cláusula */}
                      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                              {clause.number || index + 1}
                            </span>
                            <div>
                              <h3 className="text-base font-normal text-slate-800">
                                {clause.title}
                              </h3>
                              {clause.bloco && (
                                <p className="text-xs text-slate-500 font-extralight">
                                  Bloco: {clause.bloco}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {clause.version && (
                              <Badge variant="outline" className="text-xs">
                                v{clause.version}
                              </Badge>
                            )}
                            {onViewHistory && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onViewHistory(clause.id)}
                                className="text-slate-500 hover:text-slate-700"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Conteúdo da Cláusula */}
                      <div className="px-6 py-5">
                        <div className="prose prose-slate prose-sm max-w-none font-extralight">
                          <Streamdown>{clause.content}</Streamdown>
                        </div>
                      </div>

                      {/* Footer da Cláusula */}
                      {clause.lastModified && (
                        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100">
                          <p className="text-xs text-slate-500 font-extralight">
                            Última modificação: {formatDate(clause.lastModified)}
                            {clause.modifiedBy && ` por ${clause.modifiedBy}`}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Seção de Aprovação */}
                {(onRequestApproval || onApprove || onSendEmail) && (
                  <div className="mt-8 p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                    <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-emerald-600" />
                      Aprovação e Envio
                    </h3>
                    
                    {/* Status atual da aprovação */}
                    {approvalStatus && (
                      <div className={`mb-4 p-4 rounded-lg border ${
                        approvalStatus.status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
                        approvalStatus.status === 'rejected' ? 'bg-red-50 border-red-200' :
                        approvalStatus.status === 'revision_requested' ? 'bg-amber-50 border-amber-200' :
                        'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {approvalStatus.status === 'approved' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                          {approvalStatus.status === 'rejected' && <XCircle className="h-5 w-5 text-red-600" />}
                          {approvalStatus.status === 'revision_requested' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                          {approvalStatus.status === 'pending' && <Clock className="h-5 w-5 text-slate-500" />}
                          <span className={`font-medium ${
                            approvalStatus.status === 'approved' ? 'text-emerald-700' :
                            approvalStatus.status === 'rejected' ? 'text-red-700' :
                            approvalStatus.status === 'revision_requested' ? 'text-amber-700' :
                            'text-slate-700'
                          }`}>
                            {approvalStatus.status === 'approved' ? 'Aprovado' :
                             approvalStatus.status === 'rejected' ? 'Rejeitado' :
                             approvalStatus.status === 'revision_requested' ? 'Revisão Solicitada' :
                             'Aguardando Aprovação'}
                          </span>
                        </div>
                        {approvalStatus.approvedByName && (
                          <p className="text-sm text-slate-600">
                            Por: {approvalStatus.approvedByName} {approvalStatus.approvedByRole && `(${approvalStatus.approvedByRole})`}
                          </p>
                        )}
                        {approvalStatus.approvalDate && (
                          <p className="text-xs text-slate-500 mt-1">
                            Em: {formatDate(approvalStatus.approvalDate)}
                          </p>
                        )}
                        {approvalStatus.comments && (
                          <p className="text-sm text-slate-600 mt-2 italic">
                            "{approvalStatus.comments}"
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Botões de ação */}
                    <div className="flex flex-wrap gap-3">
                      {onRequestApproval && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowApprovalModal(true)}
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Solicitar Aprovação
                        </Button>
                      )}
                      
                      {canApprove && onApprove && approvalStatus?.status !== 'approved' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            const comment = prompt('Comentário de aprovação (opcional):');
                            onApprove(comment || '');
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprovar DPA
                        </Button>
                      )}
                      
                      {canApprove && onReject && approvalStatus?.status !== 'rejected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const reason = prompt('Motivo da rejeição:');
                            if (reason) onReject(reason);
                          }}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeitar
                        </Button>
                      )}
                      
                      {onSendEmail && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSendEmailModal(true)}
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Enviar por E-mail
                        </Button>
                      )}
                      
                      {/* Botão de Assinatura Digital Gov.br */}
                      {onRequestDigitalSignature && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onRequestDigitalSignature}
                          disabled={digitalSignatureStatus?.status === 'processing' || digitalSignatureStatus?.status === 'completed'}
                          className="border-green-600 text-green-700 hover:bg-green-50"
                        >
                          <Fingerprint className="h-4 w-4 mr-2" />
                          {digitalSignatureStatus?.status === 'completed' 
                            ? 'Assinado Digitalmente' 
                            : digitalSignatureStatus?.status === 'processing'
                            ? 'Processando...'
                            : 'Assinar com Gov.br'}
                        </Button>
                      )}
                    </div>
                    
                    {/* Status da Assinatura Digital */}
                    {digitalSignatureStatus?.status === 'completed' && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700">
                          <Shield className="h-5 w-5" />
                          <span className="font-medium">Documento Assinado Digitalmente</span>
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          Assinado por {digitalSignatureStatus.signerName} em{' '}
                          {digitalSignatureStatus.signedAt 
                            ? new Date(digitalSignatureStatus.signedAt).toLocaleString('pt-BR')
                            : '-'}
                        </p>
                        <p className="text-xs text-green-500 mt-1">
                          Assinatura eletrônica avançada com validade jurídica (Gov.br)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Rodapé */}
                <div className="mt-12 pt-8 border-t border-slate-200 text-center">
                  <p className="text-xs text-slate-500 font-extralight">
                    Documento gerado automaticamente pela plataforma Seusdados Due Diligence
                  </p>
                  <p className="text-xs text-slate-400 font-extralight mt-1">
                    {formatDate(analysisDate)} • Versão {version}.0
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Modal de Solicitar Aprovação */}
        {showApprovalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998]">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
              <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-600" />
                Solicitar Aprovação do DPA
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="approver-email">E-mail do Aprovador *</Label>
                  <Input
                    id="approver-email"
                    type="email"
                    placeholder="aprovador@empresa.com"
                    value={requestApprovalData.email}
                    onChange={(e) => setRequestApprovalData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="approver-name">Nome do Aprovador</Label>
                  <Input
                    id="approver-name"
                    placeholder="Nome completo"
                    value={requestApprovalData.name}
                    onChange={(e) => setRequestApprovalData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="approver-role">Cargo/Função</Label>
                  <Select
                    value={requestApprovalData.role}
                    onValueChange={(value) => setRequestApprovalData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dpo">DPO - Data Protection Officer</SelectItem>
                      <SelectItem value="juridico">Jurídico</SelectItem>
                      <SelectItem value="diretor">Diretor</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="sponsor">Cliente</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="approval-message">Mensagem (opcional)</Label>
                  <Textarea
                    id="approval-message"
                    placeholder="Mensagem personalizada para o aprovador..."
                    value={requestApprovalData.message}
                    onChange={(e) => setRequestApprovalData(prev => ({ ...prev, message: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
                    if (requestApprovalData.email && onRequestApproval) {
                      try {
                        await onRequestApproval(requestApprovalData);
                        setShowApprovalModal(false);
                        setRequestApprovalData({ email: '', name: '', role: '', message: '' });
                      } catch (error) {
                        console.error('Erro ao solicitar aprovação:', error);
                      }
                    }
                  }}
                  disabled={!requestApprovalData.email}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Solicitação
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal de Enviar por E-mail */}
        {showSendEmailModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998]">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
              <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Enviar Acordo por E-mail
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email-recipients">Destinatários (separados por vírgula) *</Label>
                  <Input
                    id="email-recipients"
                    placeholder="email1@empresa.com, email2@empresa.com"
                    value={emailData.emails}
                    onChange={(e) => setEmailData(prev => ({ ...prev, emails: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email-subject">Assunto</Label>
                  <Input
                    id="email-subject"
                    placeholder="Acordo para Processamento de Dados Pessoais"
                    value={emailData.subject || `Acordo DPA - ${contractTitle}`}
                    onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email-message">Mensagem</Label>
                  <Textarea
                    id="email-message"
                    placeholder="Mensagem do e-mail..."
                    value={emailData.message || `Prezado(a),\n\nSegue em anexo o Acordo para Processamento de Dados Pessoais (DPA) referente ao contrato "${contractTitle}".\n\nPor favor, revise o documento e entre em contato caso tenha alguma dúvida.\n\nAtenciosamente,`}
                    onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                    rows={5}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowSendEmailModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (emailData.emails && onSendEmail) {
                      onSendEmail({
                        emails: emailData.emails.split(',').map(e => e.trim()),
                        subject: emailData.subject || `Acordo DPA - ${contractTitle}`,
                        message: emailData.message,
                      });
                      setShowSendEmailModal(false);
                      setEmailData({ emails: '', subject: '', message: '' });
                    }
                  }}
                  disabled={!emailData.emails}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar E-mail
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ClausulasLGPDPremiumView;
