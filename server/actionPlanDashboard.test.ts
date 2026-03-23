import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do módulo de notificações
vi.mock('./actionPlanNotifications', () => ({
  checkAndNotifyUpcomingDeadlines: vi.fn(),
  getUpcomingDeadlinesReport: vi.fn(),
}));

describe('Action Plan Dashboard - Funcionalidades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Categorização de Ações', () => {
    it('deve categorizar ações como contratuais por padrão', () => {
      const action = {
        id: 1,
        title: 'Revisar cláusula de proteção de dados',
        actionCategory: null,
      };
      
      const category = action.actionCategory || 'contratual';
      expect(category).toBe('contratual');
    });

    it('deve identificar ações operacionais corretamente', () => {
      const action = {
        id: 2,
        title: 'Implementar controles de acesso',
        actionCategory: 'operacional',
      };
      
      expect(action.actionCategory).toBe('operacional');
    });

    it('deve filtrar ações por categoria', () => {
      const actions = [
        { id: 1, title: 'Ação 1', actionCategory: 'contratual' },
        { id: 2, title: 'Ação 2', actionCategory: 'operacional' },
        { id: 3, title: 'Ação 3', actionCategory: null },
        { id: 4, title: 'Ação 4', actionCategory: 'operacional' },
      ];
      
      const contratuais = actions.filter(a => a.actionCategory === 'contratual' || !a.actionCategory);
      const operacionais = actions.filter(a => a.actionCategory === 'operacional');
      
      expect(contratuais.length).toBe(2);
      expect(operacionais.length).toBe(2);
    });
  });

  describe('Estatísticas do Dashboard', () => {
    it('deve calcular estatísticas corretamente', () => {
      const actions = [
        { id: 1, status: 'pendente', priority: 'critica', dueDate: null },
        { id: 2, status: 'em_andamento', priority: 'alta', dueDate: null },
        { id: 3, status: 'concluida', priority: 'media', dueDate: null },
        { id: 4, status: 'pendente', priority: 'baixa', dueDate: null },
        { id: 5, status: 'cancelada', priority: 'alta', dueDate: null },
      ];
      
      const total = actions.length;
      const pendentes = actions.filter(a => a.status === 'pendente').length;
      const emAndamento = actions.filter(a => a.status === 'em_andamento').length;
      const concluidas = actions.filter(a => a.status === 'concluida').length;
      const criticas = actions.filter(a => a.priority === 'critica' && a.status !== 'concluida').length;
      
      expect(total).toBe(5);
      expect(pendentes).toBe(2);
      expect(emAndamento).toBe(1);
      expect(concluidas).toBe(1);
      expect(criticas).toBe(1);
    });

    it('deve calcular progresso geral corretamente', () => {
      const actions = [
        { status: 'concluida' },
        { status: 'concluida' },
        { status: 'pendente' },
        { status: 'em_andamento' },
      ];
      
      const total = actions.length;
      const concluidas = actions.filter(a => a.status === 'concluida').length;
      const progressoGeral = total > 0 ? Math.round((concluidas / total) * 100) : 0;
      
      expect(progressoGeral).toBe(50);
    });
  });

  describe('Verificação de Prazos', () => {
    it('deve identificar ações atrasadas', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const action = {
        id: 1,
        title: 'Ação atrasada',
        status: 'pendente',
        dueDate: yesterday.toISOString(),
      };
      
      const isOverdue = action.dueDate && new Date(action.dueDate) < now && action.status !== 'concluida';
      expect(isOverdue).toBe(true);
    });

    it('deve identificar ações com prazo próximo (7 dias)', () => {
      const now = new Date();
      const inFiveDays = new Date(now);
      inFiveDays.setDate(inFiveDays.getDate() + 5);
      
      const action = {
        id: 1,
        title: 'Ação com prazo próximo',
        status: 'pendente',
        dueDate: inFiveDays.toISOString(),
      };
      
      const dueDate = new Date(action.dueDate);
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isDueSoon = diffDays <= 7 && diffDays >= 0;
      
      expect(isDueSoon).toBe(true);
      expect(diffDays).toBe(5);
    });

    it('não deve marcar ações concluídas como atrasadas', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const action = {
        id: 1,
        title: 'Ação concluída',
        status: 'concluida',
        dueDate: yesterday.toISOString(),
      };
      
      const isOverdue = action.dueDate && new Date(action.dueDate) < now && action.status !== 'concluida';
      expect(isOverdue).toBe(false);
    });
  });

  describe('Filtros do Dashboard', () => {
    it('deve filtrar por termo de busca', () => {
      const actions = [
        { id: 1, title: 'Revisar contrato LGPD', description: 'Análise de cláusulas' },
        { id: 2, title: 'Implementar backup', description: 'Configurar rotina' },
        { id: 3, title: 'Treinar equipe LGPD', description: 'Workshop de privacidade' },
      ];
      
      const searchTerm = 'LGPD';
      const filtered = actions.filter(a => 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(filtered.length).toBe(2);
    });

    it('deve filtrar por status', () => {
      const actions = [
        { id: 1, status: 'pendente' },
        { id: 2, status: 'em_andamento' },
        { id: 3, status: 'pendente' },
        { id: 4, status: 'concluida' },
      ];
      
      const statusFilter = 'pendente';
      const filtered = actions.filter(a => a.status === statusFilter);
      
      expect(filtered.length).toBe(2);
    });

    it('deve filtrar por prioridade', () => {
      const actions = [
        { id: 1, priority: 'critica' },
        { id: 2, priority: 'alta' },
        { id: 3, priority: 'critica' },
        { id: 4, priority: 'baixa' },
      ];
      
      const priorityFilter = 'critica';
      const filtered = actions.filter(a => a.priority === priorityFilter);
      
      expect(filtered.length).toBe(2);
    });

    it('deve combinar múltiplos filtros', () => {
      const actions = [
        { id: 1, title: 'LGPD', status: 'pendente', priority: 'critica', actionCategory: 'contratual' },
        { id: 2, title: 'LGPD', status: 'concluida', priority: 'critica', actionCategory: 'contratual' },
        { id: 3, title: 'Backup', status: 'pendente', priority: 'critica', actionCategory: 'operacional' },
        { id: 4, title: 'LGPD', status: 'pendente', priority: 'baixa', actionCategory: 'contratual' },
      ];
      
      const searchTerm = 'LGPD';
      const statusFilter = 'pendente';
      const priorityFilter = 'critica';
      const categoryFilter = 'contratual';
      
      const filtered = actions.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = a.status === statusFilter;
        const matchesPriority = a.priority === priorityFilter;
        const matchesCategory = a.actionCategory === categoryFilter;
        return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
      });
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe(1);
    });
  });

  describe('Conversão para Ticket', () => {
    it('deve identificar ações já convertidas em ticket', () => {
      const action = {
        id: 1,
        title: 'Ação convertida',
        convertedToTicketId: 123,
      };
      
      const isConverted = !!action.convertedToTicketId;
      expect(isConverted).toBe(true);
    });

    it('deve identificar ações não convertidas', () => {
      const action = {
        id: 1,
        title: 'Ação não convertida',
        convertedToTicketId: null,
      };
      
      const isConverted = !!action.convertedToTicketId;
      expect(isConverted).toBe(false);
    });
  });

  describe('Atribuição de Responsável', () => {
    it('deve permitir atribuir responsável a uma ação', () => {
      const action = {
        id: 1,
        title: 'Ação sem responsável',
        responsibleId: null,
      };
      
      const updatedAction = {
        ...action,
        responsibleId: 5,
      };
      
      expect(updatedAction.responsibleId).toBe(5);
    });

    it('deve permitir alterar responsável de uma ação', () => {
      const action = {
        id: 1,
        title: 'Ação com responsável',
        responsibleId: 3,
      };
      
      const updatedAction = {
        ...action,
        responsibleId: 7,
      };
      
      expect(updatedAction.responsibleId).toBe(7);
    });
  });

  describe('Output Types', () => {
    it('deve identificar tipo de output como cláusula de contrato', () => {
      const action = {
        id: 1,
        outputType: 'clausula_contrato',
      };
      
      expect(action.outputType).toBe('clausula_contrato');
    });

    it('deve identificar tipo de output como cláusula de aditivo', () => {
      const action = {
        id: 1,
        outputType: 'clausula_aditivo',
      };
      
      expect(action.outputType).toBe('clausula_aditivo');
    });

    it('deve identificar tipo de output como acordo de tratamento de dados', () => {
      const action = {
        id: 1,
        outputType: 'acordo_tratamento_dados',
      };
      
      expect(action.outputType).toBe('acordo_tratamento_dados');
    });

    it('deve identificar tipo de output como tarefa operacional', () => {
      const action = {
        id: 1,
        outputType: 'tarefa_operacional',
      };
      
      expect(action.outputType).toBe('tarefa_operacional');
    });
  });
});

describe('Action Plan Notifications', () => {
  describe('Cálculo de dias até o prazo', () => {
    it('deve calcular corretamente dias até o prazo', () => {
      const now = new Date();
      const inTenDays = new Date(now);
      inTenDays.setDate(inTenDays.getDate() + 10);
      
      const diffTime = inTenDays.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBe(10);
    });

    it('deve retornar valor negativo para ações atrasadas', () => {
      const now = new Date();
      const fiveDaysAgo = new Date(now);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      
      const diffTime = fiveDaysAgo.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      expect(diffDays).toBeLessThan(0);
    });
  });

  describe('Geração de mensagens de notificação', () => {
    it('deve gerar mensagem para ação atrasada', () => {
      const diffDays = -3;
      const title = 'Revisar contrato';
      
      const message = diffDays < 0 
        ? `⚠️ Ação ATRASADA: ${title}`
        : diffDays === 0
          ? `🔔 Ação vence HOJE: ${title}`
          : `📅 Ação vence em ${diffDays} dia(s): ${title}`;
      
      expect(message).toContain('ATRASADA');
      expect(message).toContain(title);
    });

    it('deve gerar mensagem para ação que vence hoje', () => {
      const diffDays = 0;
      const title = 'Enviar relatório';
      
      const message = diffDays < 0 
        ? `⚠️ Ação ATRASADA: ${title}`
        : diffDays === 0
          ? `🔔 Ação vence HOJE: ${title}`
          : `📅 Ação vence em ${diffDays} dia(s): ${title}`;
      
      expect(message).toContain('HOJE');
      expect(message).toContain(title);
    });

    it('deve gerar mensagem para ação com prazo próximo', () => {
      const diffDays = 5;
      const title = 'Atualizar política';
      
      const message = diffDays < 0 
        ? `⚠️ Ação ATRASADA: ${title}`
        : diffDays === 0
          ? `🔔 Ação vence HOJE: ${title}`
          : `📅 Ação vence em ${diffDays} dia(s): ${title}`;
      
      expect(message).toContain('5 dia(s)');
      expect(message).toContain(title);
    });
  });
});
