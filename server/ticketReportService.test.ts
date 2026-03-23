import { describe, it, expect, vi } from 'vitest';
import { generateTicketReportHTML } from './ticketReportService';

describe('ticketReportService', () => {
  describe('generateTicketReportHTML', () => {
    it('should generate valid HTML report with metrics', () => {
      const mockData = {
        titulo: 'Relatório de Tickets MeuDPO',
        periodo: '01/12/2025 a 12/12/2025',
        organizacao: 'Seusdados Consultoria',
        consultor: undefined,
        geradoEm: new Date('2025-12-12T10:00:00Z'),
        metricas: {
          totalTickets: 10,
          ticketsAbertos: 5,
          ticketsResolvidos: 4,
          ticketsCancelados: 1,
          ticketsEmAtraso: 2,
          tempoMedioResolucao: 24,
          slaCumprido: 80,
          ticketsPorTipo: [
            { tipo: 'Consultoria Geral', quantidade: 5 },
            { tipo: 'Dúvida Jurídica', quantidade: 3 },
            { tipo: 'Incidente de Segurança', quantidade: 2 }
          ],
          ticketsPorPrioridade: [
            { prioridade: 'Alta', quantidade: 4 },
            { prioridade: 'Média', quantidade: 4 },
            { prioridade: 'Baixa', quantidade: 2 }
          ],
          ticketsPorStatus: [
            { status: 'Novo', quantidade: 3 },
            { status: 'Em Análise', quantidade: 2 },
            { status: 'Resolvido', quantidade: 4 },
            { status: 'Cancelado', quantidade: 1 }
          ],
          ticketsPorConsultor: [
            { consultor: 'João Silva', quantidade: 5, resolvidos: 3 },
            { consultor: 'Maria Santos', quantidade: 5, resolvidos: 1 }
          ]
        },
        tickets: [
          {
            id: 1,
            titulo: 'Teste de ticket',
            tipo: 'Consultoria Geral',
            prioridade: 'Alta',
            status: 'Novo',
            criadoEm: new Date('2025-12-10T10:00:00Z'),
            prazo: new Date('2025-12-15T10:00:00Z'),
            resolvidoEm: undefined,
            responsavel: 'João Silva',
            organizacao: 'Seusdados Consultoria'
          }
        ]
      };

      const html = generateTicketReportHTML(mockData);

      // Verificar que o HTML foi gerado
      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);

      // Verificar estrutura básica do HTML
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');

      // Verificar título e informações do relatório
      expect(html).toContain('Relatório de Tickets MeuDPO');
      expect(html).toContain('Seusdados Consultoria');
      expect(html).toContain('01/12/2025 a 12/12/2025');

      // Verificar métricas
      expect(html).toContain('10'); // Total de tickets
      expect(html).toContain('5'); // Tickets abertos
      expect(html).toContain('4'); // Tickets resolvidos
      expect(html).toContain('80%'); // SLA cumprido

      // Verificar tabela de tickets
      expect(html).toContain('Teste de ticket');
      expect(html).toContain('João Silva');
    });

    it('should handle empty ticket list', () => {
      const mockData = {
        titulo: 'Relatório de Tickets MeuDPO',
        periodo: 'Todos os períodos',
        organizacao: undefined,
        consultor: undefined,
        geradoEm: new Date(),
        metricas: {
          totalTickets: 0,
          ticketsAbertos: 0,
          ticketsResolvidos: 0,
          ticketsCancelados: 0,
          ticketsEmAtraso: 0,
          tempoMedioResolucao: 0,
          slaCumprido: 100,
          ticketsPorTipo: [],
          ticketsPorPrioridade: [],
          ticketsPorStatus: [],
          ticketsPorConsultor: []
        },
        tickets: []
      };

      const html = generateTicketReportHTML(mockData);

      expect(html).toBeDefined();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Todas as Organizações');
      expect(html).toContain('0'); // Total de tickets
    });

    it('should include seusdados branding', () => {
      const mockData = {
        titulo: 'Relatório de Tickets MeuDPO',
        periodo: 'Todos os períodos',
        organizacao: undefined,
        consultor: undefined,
        geradoEm: new Date(),
        metricas: {
          totalTickets: 0,
          ticketsAbertos: 0,
          ticketsResolvidos: 0,
          ticketsCancelados: 0,
          ticketsEmAtraso: 0,
          tempoMedioResolucao: 0,
          slaCumprido: 100,
          ticketsPorTipo: [],
          ticketsPorPrioridade: [],
          ticketsPorStatus: [],
          ticketsPorConsultor: []
        },
        tickets: []
      };

      const html = generateTicketReportHTML(mockData);

      // Verificar branding da Seusdados
      expect(html).toContain('seusdados');
      expect(html).toContain('www.seusdados.com');
      expect(html).toContain('dpo@seusdados.com');
      expect(html).toContain('CNPJ 33.899.116/0001-63');
    });
  });
});
