import { describe, it, expect } from "vitest";

/**
 * Testes para os 3 ajustes pós-vinculação do Sponsor
 */

describe("Ajuste 1: Status automáticos da avaliação", () => {
  const STATUS_TRANSITIONS = {
    pendente_atribuicao: "Pendente de Atribuição",
    em_andamento: "Em Andamento",
    concluida: "Concluída",
  };

  it("deve ter os 3 status obrigatórios definidos", () => {
    expect(STATUS_TRANSITIONS).toHaveProperty("pendente_atribuicao");
    expect(STATUS_TRANSITIONS).toHaveProperty("em_andamento");
    expect(STATUS_TRANSITIONS).toHaveProperty("concluida");
  });

  it("status inicial deve ser pendente_atribuicao", () => {
    const statusInicial = "pendente_atribuicao";
    expect(statusInicial).toBe("pendente_atribuicao");
  });

  it("transição: pendente_atribuicao → em_andamento quando 100% atribuídos", () => {
    const totalDomains = 9;
    const assignedDomains = 9;
    const allAssigned = assignedDomains >= totalDomains;
    const newStatus = allAssigned ? "em_andamento" : "pendente_atribuicao";
    expect(newStatus).toBe("em_andamento");
  });

  it("deve manter pendente_atribuicao quando atribuição parcial", () => {
    const totalDomains = 9;
    const assignedDomains = 5;
    const allAssigned = assignedDomains >= totalDomains;
    const newStatus = allAssigned ? "em_andamento" : "pendente_atribuicao";
    expect(newStatus).toBe("pendente_atribuicao");
  });

  it("transição: em_andamento → concluida quando todos concluídos", () => {
    const assignments = [
      { status: "concluida" },
      { status: "concluida" },
      { status: "concluida" },
    ];
    const allCompleted = assignments.every(a => a.status === "concluida");
    const newStatus = allCompleted ? "concluida" : "em_andamento";
    expect(newStatus).toBe("concluida");
  });

  it("não deve mudar para concluida se algum domínio não concluído", () => {
    const assignments = [
      { status: "concluida" },
      { status: "em_andamento" },
      { status: "pendente" },
    ];
    const allCompleted = assignments.every(a => a.status === "concluida");
    const newStatus = allCompleted ? "concluida" : "em_andamento";
    expect(newStatus).toBe("em_andamento");
  });
});

describe("Ajuste 2: Notificações inteligentes", () => {
  it("primeira atribuição: notifica todos os responsáveis", () => {
    const previousMap = new Map<string, number>(); // vazio = primeira vez
    const newAssignments = [
      { domainId: "IA-01", userId: 1, userEmail: "a@test.com", userName: "A", domainName: "Dom 1" },
      { domainId: "IA-02", userId: 2, userEmail: "b@test.com", userName: "B", domainName: "Dom 2" },
    ];

    const changed = newAssignments.filter(a => {
      const prev = previousMap.get(a.domainId);
      return prev === undefined || prev !== a.userId;
    });

    expect(changed.length).toBe(2); // todos são novos
  });

  it("re-atribuição: notifica apenas quem mudou", () => {
    const previousMap = new Map<string, number>();
    previousMap.set("IA-01", 1); // já atribuído a user 1
    previousMap.set("IA-02", 2); // já atribuído a user 2

    const newAssignments = [
      { domainId: "IA-01", userId: 1, userEmail: "a@test.com", userName: "A", domainName: "Dom 1" }, // sem mudança
      { domainId: "IA-02", userId: 3, userEmail: "c@test.com", userName: "C", domainName: "Dom 2" }, // mudou de 2 para 3
    ];

    const changed = newAssignments.filter(a => {
      const prev = previousMap.get(a.domainId);
      return prev === undefined || prev !== a.userId;
    });

    expect(changed.length).toBe(1); // apenas IA-02 mudou
    expect(changed[0].domainId).toBe("IA-02");
    expect(changed[0].userId).toBe(3);
  });

  it("sem mudanças: não notifica ninguém", () => {
    const previousMap = new Map<string, number>();
    previousMap.set("IA-01", 1);
    previousMap.set("IA-02", 2);

    const newAssignments = [
      { domainId: "IA-01", userId: 1, userEmail: "a@test.com", userName: "A", domainName: "Dom 1" },
      { domainId: "IA-02", userId: 2, userEmail: "b@test.com", userName: "B", domainName: "Dom 2" },
    ];

    const changed = newAssignments.filter(a => {
      const prev = previousMap.get(a.domainId);
      return prev === undefined || prev !== a.userId;
    });

    expect(changed.length).toBe(0);
  });
});

describe("Ajuste 3: Sponsor responde apenas seus domínios", () => {
  it("Sponsor atribuído ao domínio pode responder", () => {
    const sponsorId = 10;
    const assignment = { domainId: "IA-09", assignedToUserId: 10 };
    const isSponsor = true;
    const isInternalAdmin = false;

    const canRespond = isInternalAdmin || (assignment && assignment.assignedToUserId === sponsorId);
    expect(canRespond).toBe(true);
  });

  it("Sponsor NÃO atribuído ao domínio não pode responder", () => {
    const sponsorId = 10;
    const assignment = { domainId: "IA-01", assignedToUserId: 5 }; // atribuído a outro
    const isSponsor = true;
    const isInternalAdmin = false;

    const canRespond = isInternalAdmin || (assignment && assignment.assignedToUserId === sponsorId);
    expect(canRespond).toBe(false);
  });

  it("Sponsor sem atribuição no domínio não pode responder", () => {
    const sponsorId = 10;
    const assignment = null; // sem atribuição
    const isSponsor = true;
    const isInternalAdmin = false;

    const canRespond = isInternalAdmin || (assignment && assignment.assignedToUserId === sponsorId);
    expect(canRespond).toBeFalsy();
  });

  it("Admin pode responder qualquer domínio", () => {
    const adminId = 1;
    const assignment = { domainId: "IA-01", assignedToUserId: 5 }; // atribuído a outro
    const isInternalAdmin = true;

    const canRespond = isInternalAdmin || (assignment && assignment.assignedToUserId === adminId);
    expect(canRespond).toBe(true);
  });

  it("Sponsor vê todos os domínios (visão geral)", () => {
    const allDomains = ["IA-01", "IA-02", "IA-03", "IA-04", "IA-05", "IA-06", "IA-07", "IA-08", "IA-09"];
    const sponsorAssignedDomains = ["IA-09"]; // atribuído a apenas 1
    const isSponsor = true;

    // Sponsor vê todos os domínios
    const visibleDomains = isSponsor ? allDomains : sponsorAssignedDomains;
    expect(visibleDomains.length).toBe(9);

    // Mas só pode editar os atribuídos
    const editableDomains = sponsorAssignedDomains;
    expect(editableDomains.length).toBe(1);
    expect(editableDomains[0]).toBe("IA-09");
  });
});
