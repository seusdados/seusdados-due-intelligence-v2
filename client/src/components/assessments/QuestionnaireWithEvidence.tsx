import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Link as LinkIcon, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Paperclip,
  X,
  Eye,
  Download,
  Info
} from 'lucide-react';
import { QUESTION_OPTIONS } from '../../../../shared/frameworkSeusdados';
import { EVIDENCE_SUGGESTIONS } from '../../../../shared/evidenceSuggestions';
import { SmartDPOButton } from '../SmartDPOButton';

interface Evidence {
  id: string;
  type: 'pdf' | 'link';
  name: string;
  url: string;
  uploadedAt: Date;
}

interface Question {
  id: string;
  text: string;
  helpText?: string;
  requiresEvidence: boolean;
  evidenceTypes: ('pdf' | 'link')[];
}

interface Domain {
  id: string;
  name: string;
  questions: Question[];
}

interface Response {
  questionId: string;
  level: number;
  notes?: string;
  evidences: Evidence[];
}

interface QuestionnaireWithEvidenceProps {
  assessmentCode: string;
  framework: string;
  domains: Domain[];
  initialResponses?: Record<string, Response>;
  onSaveResponse: (response: Response) => void;
  onFinalize: () => void;
  isReadOnly?: boolean;
}

const LEVEL_DESCRIPTIONS = [
  { level: 1, letter: 'a', label: 'Inexistente', color: 'bg-red-100 text-red-800' },
  { level: 2, letter: 'b', label: 'Inicial', color: 'bg-orange-100 text-orange-800' },
  { level: 3, letter: 'c', label: 'Definido', color: 'bg-yellow-100 text-yellow-800' },
  { level: 4, letter: 'd', label: 'Gerenciado', color: 'bg-blue-100 text-blue-800' },
  { level: 5, letter: 'e', label: 'Otimizado', color: 'bg-green-100 text-green-800' },
];

export function QuestionnaireWithEvidence({
  assessmentCode,
  framework,
  domains,
  initialResponses = {},
  onSaveResponse,
  onFinalize,
  isReadOnly = false,
}: QuestionnaireWithEvidenceProps) {
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, Response>>(initialResponses);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceType, setEvidenceType] = useState<'pdf' | 'link'>('pdf');
  const [linkUrl, setLinkUrl] = useState('');
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentDomain = domains[currentDomainIndex];
  const currentQuestion = currentDomain?.questions[currentQuestionIndex];
  const questionKey = currentQuestion?.id || '';
  const currentResponse = responses[questionKey];

  // Calcular progresso
  const totalQuestions = domains.reduce((sum, d) => sum + d.questions.length, 0);
  const answeredQuestions = Object.keys(responses).filter(k => responses[k]?.level !== undefined).length;
  const progressPercent = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  // Verificar evidências pendentes
  const pendingEvidences = domains.flatMap(d => 
    d.questions.filter(q => q.requiresEvidence && (!responses[q.id]?.evidences?.length))
  );

  const handleSelectLevel = (level: number) => {
    if (isReadOnly) return;
    
    const newResponse: Response = {
      questionId: questionKey,
      level,
      notes: currentResponse?.notes || '',
      evidences: currentResponse?.evidences || [],
    };
    
    setResponses({ ...responses, [questionKey]: newResponse });
    onSaveResponse(newResponse);
  };

  const handleNotesChange = (value: string) => {
    if (isReadOnly) return;
    setNotes(value);
    
    if (currentResponse) {
      const newResponse = { ...currentResponse, notes: value };
      setResponses({ ...responses, [questionKey]: newResponse });
      onSaveResponse(newResponse);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo permitido: 50MB');
      return;
    }

    // Validar tipo
    const allowedExts = ['pdf','doc','docx','odt','rtf','txt','md','xls','xlsx','ods','csv','ppt','pptx','odp','jpg','jpeg','png','gif','bmp','webp','svg','tiff','tif','zip','rar','7z','tar','gz','json','xml','html'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExts.includes(ext)) {
      alert('Formato não permitido. Aceitos: documentos, planilhas, imagens, apresentações, compactados e dados.');
      return;
    }

    // Criar evidência (em produção, faria upload para S3)
    const newEvidence: Evidence = {
      id: `ev_${Date.now()}`,
      type: 'pdf',
      name: file.name,
      url: URL.createObjectURL(file), // Em produção seria URL do S3
      uploadedAt: new Date(),
    };

    addEvidence(newEvidence);
    setShowEvidenceModal(false);
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;

    // Validar URL
    try {
      new URL(linkUrl);
    } catch {
      alert('URL inválida');
      return;
    }

    const newEvidence: Evidence = {
      id: `ev_${Date.now()}`,
      type: 'link',
      name: linkUrl,
      url: linkUrl,
      uploadedAt: new Date(),
    };

    addEvidence(newEvidence);
    setLinkUrl('');
    setShowEvidenceModal(false);
  };

  const addEvidence = (evidence: Evidence) => {
    const newResponse: Response = {
      questionId: questionKey,
      level: currentResponse?.level || 0,
      notes: currentResponse?.notes || '',
      evidences: [...(currentResponse?.evidences || []), evidence],
    };
    
    setResponses({ ...responses, [questionKey]: newResponse });
    onSaveResponse(newResponse);
  };

  const removeEvidence = (evidenceId: string) => {
    if (isReadOnly) return;
    
    const newEvidences = currentResponse?.evidences?.filter(e => e.id !== evidenceId) || [];
    const newResponse: Response = {
      ...currentResponse!,
      evidences: newEvidences,
    };
    
    setResponses({ ...responses, [questionKey]: newResponse });
    onSaveResponse(newResponse);
  };

  const handleNext = () => {
    if (currentQuestionIndex < currentDomain.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentDomainIndex < domains.length - 1) {
      setCurrentDomainIndex(currentDomainIndex + 1);
      setCurrentQuestionIndex(0);
    }
    setNotes(responses[domains[currentDomainIndex + 1]?.questions[0]?.id]?.notes || '');
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentDomainIndex > 0) {
      setCurrentDomainIndex(currentDomainIndex - 1);
      setCurrentQuestionIndex(domains[currentDomainIndex - 1].questions.length - 1);
    }
  };

  const canFinalize = pendingEvidences.length === 0 && answeredQuestions === totalQuestions;

  return (
    <div className="space-y-6">
      {/* Header com código e progresso */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{assessmentCode}</h1>
            <p className="text-white/80 mt-1">Framework: {framework}</p>
          </div>
          <Badge className="bg-white/20 text-white">
            {answeredQuestions}/{totalQuestions} questões
          </Badge>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progresso</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-white/20" />
        </div>
      </div>

      {/* Aviso de evidências pendentes */}
      {pendingEvidences.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">
              {pendingEvidences.length} evidência(s) pendente(s)
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Você precisa anexar evidências para finalizar a avaliação.
            </p>
          </div>
        </div>
      )}

      {/* Navegação de domínios */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {domains.map((domain, idx) => {
          const domainAnswered = domain.questions.filter(q => responses[q.id]?.level !== undefined).length;
          const domainTotal = domain.questions.length;
          const isComplete = domainAnswered === domainTotal;
          
          return (
            <button
              key={domain.id}
              onClick={() => { setCurrentDomainIndex(idx); setCurrentQuestionIndex(0); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                idx === currentDomainIndex
                  ? 'bg-indigo-600 text-white'
                  : isComplete
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {domain.id}: {domain.name}
              {isComplete && <CheckCircle className="w-4 h-4 inline ml-2" />}
            </button>
          );
        })}
      </div>

      {/* Card da questão atual */}
      <Card className="border-2 border-indigo-200">
        <CardHeader className="bg-indigo-50">
          <div className="flex justify-between items-start">
            <div>
              <Badge className="bg-indigo-600 mb-2">{currentDomain?.id}</Badge>
              <CardTitle className="text-lg">{currentDomain?.name}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Pergunta {currentQuestionIndex + 1} de {currentDomain?.questions.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {currentQuestion?.requiresEvidence && (
                <Badge variant="outline" className="border-amber-500 text-amber-700">
                  <Paperclip className="w-3 h-3 mr-1" />
                  Evidência Obrigatória
                </Badge>
              )}
              <SmartDPOButton
                context={{
                  module: 'Due Diligence',
                  page: 'Questionário com Evidências',
                  entityType: 'question',
                  entityId: currentQuestion?.id || '',
                  entityName: `${currentDomain?.id} - Pergunta ${currentQuestionIndex + 1}`,
                  deepLink: `${window.location.pathname}#questao-${currentQuestion?.id}`,
                  snapshot: {
                    domain: currentDomain?.name,
                    questionText: currentQuestion?.text,
                    selectedLevel: currentResponse?.level,
                    notes: currentResponse?.notes,
                  },
                }}
                variant="ghost"
                size="sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Texto da questão */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {currentQuestion?.text}
            </h3>
            {currentQuestion?.helpText && (
              <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{currentQuestion.helpText}</p>
              </div>
            )}
          </div>

          {/* Seleção de alternativa */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Selecione a alternativa que melhor descreve a situação atual:
            </p>
            <div className="space-y-3">
              {LEVEL_DESCRIPTIONS.map(({ level, letter, color }) => {
                const isSelected = currentResponse?.level === level;
                // Obter o texto da opção específica da questão do QUESTION_OPTIONS
                const questionOpts = QUESTION_OPTIONS[questionKey];
                const optionText = questionOpts?.find(o => o.level === level)?.text || 
                  (currentQuestion as any)?.options?.find((o: any) => o.level === level)?.label || 
                  `Alternativa ${letter})`;
                // Obter sugestões de evidência para este nível
                const evidenceSuggestions = EVIDENCE_SUGGESTIONS[questionKey]?.find(s => s.level === level)?.suggestions || [];
                return (
                  <div key={level}>
                    <button
                      onClick={() => handleSelectLevel(level)}
                      disabled={isReadOnly}
                      className={`w-full p-4 rounded-lg text-left transition-all border-2 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600 ring-offset-1'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      } ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          isSelected ? 'bg-indigo-600 text-white' : color
                        }`}>
                          {letter}
                        </div>
                        <div className="flex-1">
                          <span className={`text-sm leading-relaxed ${isSelected ? 'text-indigo-900 font-medium' : 'text-gray-700'}`}>
                            {optionText}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                    {/* Sugestão de evidência — exibida apenas quando esta opção está selecionada */}
                    {isSelected && evidenceSuggestions.length > 0 && (
                      <div className="mt-2 ml-1 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                            Sugestão de evidência para este nível
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {evidenceSuggestions.map((suggestion, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-amber-900">
                              <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Observações (opcional):
            </label>
            <Textarea
              value={currentResponse?.notes || notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Adicione observações ou justificativas..."
              disabled={isReadOnly}
              className="min-h-[80px]"
            />
          </div>

          {/* Seção de Evidências */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Paperclip className="w-5 h-5" />
                Evidências
                {currentQuestion?.requiresEvidence && (
                  <span className="text-red-500">*</span>
                )}
              </h4>
              {!isReadOnly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEvidenceModal(true)}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Adicionar Evidência
                </Button>
              )}
            </div>

            {/* Lista de evidências */}
            {currentResponse?.evidences && currentResponse.evidences.length > 0 ? (
              <div className="space-y-2">
                {currentResponse.evidences.map((evidence) => (
                  <div
                    key={evidence.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {evidence.type === 'pdf' ? (
                        <FileText className="w-5 h-5 text-red-600" />
                      ) : (
                        <LinkIcon className="w-5 h-5 text-blue-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {evidence.name.length > 40 
                            ? evidence.name.substring(0, 40) + '...' 
                            : evidence.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {evidence.type === 'pdf' ? '📄 PDF' : '🔗 Link'} • 
                          {new Date(evidence.uploadedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(evidence.url, '_blank')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEvidence(evidence.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Nenhuma evidência anexada</p>
                {currentQuestion?.requiresEvidence && (
                  <p className="text-sm text-amber-600 mt-1">
                    ⚠️ Esta questão requer evidência
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de adicionar evidência */}
      {showEvidenceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998]">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Adicionar Evidência</span>
                <Button variant="ghost" size="sm" onClick={() => setShowEvidenceModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tabs de tipo */}
              <div className="flex gap-2">
                <Button
                  variant={evidenceType === 'pdf' ? 'default' : 'outline'}
                  onClick={() => setEvidenceType('pdf')}
                  className="flex-1 gap-2"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </Button>
                <Button
                  variant={evidenceType === 'link' ? 'default' : 'outline'}
                  onClick={() => setEvidenceType('link')}
                  className="flex-1 gap-2"
                >
                  <LinkIcon className="w-4 h-4" />
                  Link
                </Button>
              </div>

              {evidenceType === 'pdf' ? (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.md,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.tiff,.tif,.zip,.rar,.7z,.tar,.gz,.json,.xml,.html"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                  >
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Clique para selecionar ou arraste o arquivo</p>
                    <p className="text-sm text-gray-400 mt-1">Documentos, planilhas, imagens, apresentações e outros (até 50MB)</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    type="url"
                    placeholder="https://exemplo.com/documento"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                  <Button onClick={handleAddLink} className="w-full">
                    Adicionar Link
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navegação */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentDomainIndex === 0 && currentQuestionIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Anterior
        </Button>

        <div className="flex gap-2">
          {currentDomainIndex === domains.length - 1 && 
           currentQuestionIndex === currentDomain.questions.length - 1 ? (
            <Button
              onClick={onFinalize}
              disabled={!canFinalize}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              Finalizar Avaliação
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={currentResponse?.level === undefined}
              className="gap-2"
            >
              Próxima
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuestionnaireWithEvidence;
