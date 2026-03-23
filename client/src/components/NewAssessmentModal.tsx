import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useLocation } from 'wouter';

interface NewAssessmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewAssessmentModal({ open, onOpenChange, onSuccess }: NewAssessmentModalProps) {
  const [framework, setFramework] = useState('seusdados');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { selectedOrganization } = useOrganization();

  // Gerar nome automático: AC#{YYYY}{MM}{DD}{HHmm}{RANDOM}
  const generateAssessmentName = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `AC#${year}${month}${day}${hours}${minutes}${random}`;
  };

  const createAssessment = trpc.assessments.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Nome é gerado automaticamente, usar data padrão se não alterada
    const defaultDueDateValue = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const finalDueDate = dueDate || defaultDueDateValue;

    setLoading(true);

    try {
      const assessmentName = generateAssessmentName();
      const organizationId = selectedOrganization?.id || user?.organizationId || 0;
      if (!organizationId) {
        alert('Selecione uma organização antes de criar uma avaliação.');
        setLoading(false);
        return;
      }
      
      console.log('Criando avaliação com:', { organizationId, framework, dueDate });
      
      const result = await createAssessment.mutateAsync({
        organizationId,
        framework: framework as 'seusdados' | 'conformidade_lgpd' | 'misto' | 'sgd' | 'ico' | 'cnil',
        deadline: new Date(finalDueDate),
      });

      if (result && result.id) {
        setFramework('seusdados');
        setDueDate('');
        onOpenChange(false);
        onSuccess?.();
        
        // Não redirecionar - deixar que o Sponsor realize a vinculação
        alert(`Avaliação "${assessmentName}" criada com sucesso! O Sponsor será notificado para realizar a vinculação de domínios.`);
      }
    } catch (error: any) {
      console.error('Erro ao criar avaliação:', error);
      const errorMessage = error?.message || error?.data?.message || 'Erro desconhecido';
      alert(`Erro ao criar avaliação: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const defaultDueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Avaliação de Conformidade</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Framework Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Framework <span className="text-red-500">*</span>
            </label>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="seusdados">Seusdados - Maturidade LGPD (Padrão)</option>
              <option value="conformidade_lgpd">Conformidade LGPD - Lei 13.709</option>
              <option value="misto">Misto - Múltiplos Frameworks</option>
              <option value="sgd">SGD - Sistema de Gestão de Documentos</option>
              <option value="ico">ICO - Information Commissioner's Office</option>
              <option value="cnil">CNIL - Comissão Nacional de Informática</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Selecione o framework de avaliação. Seusdados é recomendado para conformidade LGPD.
            </p>
          </div>

          {/* Assessment Name */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-900 mb-1">Nome da Avaliação</p>
            <p className="text-sm text-blue-800 font-mono bg-white px-2 py-1 rounded border border-blue-300">
              {generateAssessmentName()}
            </p>
            <p className="text-xs text-blue-700 mt-2">
              ✓ Gerado automaticamente no formato AC#YYYYMMDDHHmmRANDOM
            </p>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Prazo de Conclusão
            </label>
            <input
              type="date"
              value={dueDate || defaultDueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Prazo padrão: 15 dias. Você pode ajustar conforme necessário.
            </p>
          </div>

          {/* Framework Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Framework Selecionado:</strong> {framework === 'seusdados' ? 'Seusdados - Maturidade LGPD' : framework}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {framework === 'seusdados' && 'Avaliação de maturidade em conformidade LGPD com 39 questões estruturadas em 3 domínios.'}
              {framework === 'conformidade-lgpd' && 'Avaliação completa de conformidade com a Lei Geral de Proteção de Dados.'}
              {framework === 'iso-27001' && 'Avaliação de segurança da informação conforme ISO 27001.'}
              {framework === 'nist-csf' && 'Avaliação de cibersegurança conforme NIST Cybersecurity Framework.'}
              {framework === 'gdpr' && 'Avaliação de conformidade com GDPR - Regulamento Europeu.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e as any);
              }}
            >
              {loading ? 'Criando...' : 'Criar Avaliação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
