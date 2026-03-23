/**
 * Testes unitários: Motor de Permissões de Mapeamentos
 * 
 * Cobre:
 * A) Capabilities cumulativas por perfil
 * B) Combinação de perfis (Gestor + Líder)
 * C) Fallback para role principal
 * D) Enforcement de capabilities
 * E) Delegação (validação de regras)
 */

import { describe, it, expect } from "vitest";
import {
  computeMapeamentoCapabilities,
  enforceMapeamentoCapability,
  enforceMapeamentoAreaAccess,
  type ProfileType,
  type MapeamentoCapabilities,
} from "./services/mapeamentoPermissions";
import { TRPCError } from "@trpc/server";

// Helper para criar perfis mock
function mockProfile(type: ProfileType, areaId: number | null = null) {
  return { profileType: type, areaId, isActive: true };
}

function mockInactiveProfile(type: ProfileType, areaId: number | null = null) {
  return { profileType: type, areaId, isActive: false };
}

// ============================================================
// A) Capabilities por perfil individual
// ============================================================
describe("Capabilities por perfil individual", () => {
  it("admin_global tem acesso total (bypass)", () => {
    const caps = computeMapeamentoCapabilities("admin_global", []);
    expect(caps.isFullAccess).toBe(true);
    expect(caps.canAccessModule).toBe(true);
    expect(caps.canDelegateProcesses).toBe(true);
    expect(caps.canCreateAreas).toBe(true);
    expect(caps.canDeleteAreas).toBe(true);
  });

  it("consultor tem acesso total (bypass)", () => {
    const caps = computeMapeamentoCapabilities("consultor", []);
    expect(caps.isFullAccess).toBe(true);
    expect(caps.canAccessModule).toBe(true);
  });

  it("pmo tem acesso total (bypass)", () => {
    const caps = computeMapeamentoCapabilities("pmo", []);
    expect(caps.isFullAccess).toBe(true);
  });

  it("consultor_par tem acesso total (bypass)", () => {
    const caps = computeMapeamentoCapabilities("consultor_par", []);
    expect(caps.isFullAccess).toBe(true);
  });

  it("lider_processo pode responder mas NÃO pode delegar", () => {
    const caps = computeMapeamentoCapabilities("usuario", [mockProfile("lider_processo", 10)]);
    expect(caps.canAccessModule).toBe(true);
    expect(caps.canViewDashboard).toBe(true);
    expect(caps.canRespondMapeamentos).toBe(true);
    expect(caps.canEditResponses).toBe(true);
    expect(caps.canDelegateProcesses).toBe(false);
    expect(caps.canRevokeDelegation).toBe(false);
    expect(caps.canApproveResponses).toBe(false);
    expect(caps.canManageRespondents).toBe(false);
    expect(caps.canCreateAreas).toBe(false);
    expect(caps.activeProfiles).toContain("lider_processo");
    expect(caps.areaIds).toContain(10);
  });

  it("gestor_area pode responder E delegar", () => {
    const caps = computeMapeamentoCapabilities("usuario", [mockProfile("gestor_area", 20)]);
    expect(caps.canAccessModule).toBe(true);
    expect(caps.canViewDashboard).toBe(true);
    expect(caps.canRespondMapeamentos).toBe(true);
    expect(caps.canEditResponses).toBe(true);
    expect(caps.canDelegateProcesses).toBe(true);
    expect(caps.canRevokeDelegation).toBe(true);
    expect(caps.canApproveResponses).toBe(true);
    expect(caps.canManageRespondents).toBe(true);
    expect(caps.canGenerateROT).toBe(true);
    expect(caps.canGeneratePOP).toBe(true);
    expect(caps.canExportReports).toBe(true);
    expect(caps.canSendInvitations).toBe(true);
    expect(caps.canManageActionPlans).toBe(true);
    expect(caps.activeProfiles).toContain("gestor_area");
    expect(caps.areaIds).toContain(20);
  });

  it("sponsor tem visão gerencial (read-only, todas as áreas)", () => {
    const caps = computeMapeamentoCapabilities("sponsor", [mockProfile("sponsor")]);
    expect(caps.canAccessModule).toBe(true);
    expect(caps.canViewDashboard).toBe(true);
    expect(caps.canViewAllAreaProcesses).toBe(true);
    expect(caps.canRespondMapeamentos).toBe(false);
    expect(caps.canDelegateProcesses).toBe(false);
    expect(caps.canExportReports).toBe(true);
  });

  it("dpo_interno pode aprovar e ver todas as áreas", () => {
    const caps = computeMapeamentoCapabilities("dpo_interno", [mockProfile("dpo_interno")]);
    expect(caps.canAccessModule).toBe(true);
    expect(caps.canViewAllAreaProcesses).toBe(true);
    expect(caps.canApproveResponses).toBe(true);
    expect(caps.canRespondMapeamentos).toBe(false);
    expect(caps.canDelegateProcesses).toBe(false);
    expect(caps.canManageActionPlans).toBe(true);
  });

  it("comite tem visão de leitura apenas", () => {
    const caps = computeMapeamentoCapabilities("comite", [mockProfile("comite")]);
    expect(caps.canAccessModule).toBe(true);
    expect(caps.canViewDashboard).toBe(true);
    expect(caps.canViewAllAreaProcesses).toBe(true);
    expect(caps.canRespondMapeamentos).toBe(false);
    expect(caps.canDelegateProcesses).toBe(false);
    expect(caps.canExportReports).toBe(true);
  });

  it("usuario pode responder mapeamentos da sua área", () => {
    const caps = computeMapeamentoCapabilities("usuario", [mockProfile("usuario")]);
    expect(caps.canAccessModule).toBe(true);
    expect(caps.canRespondMapeamentos).toBe(true);
    expect(caps.canEditResponses).toBe(true);
    expect(caps.canDelegateProcesses).toBe(false);
    expect(caps.canExportReports).toBe(false);
  });
});

// ============================================================
// B) Combinação de perfis (permissões cumulativas)
// ============================================================
describe("Combinação de perfis (permissões cumulativas)", () => {
  it("Gestor de Área + Líder de Processo = prevalece delegação do Gestor", () => {
    const caps = computeMapeamentoCapabilities("usuario", [
      mockProfile("gestor_area", 10),
      mockProfile("lider_processo", 10),
    ]);
    expect(caps.canDelegateProcesses).toBe(true);   // Do gestor_area
    expect(caps.canRespondMapeamentos).toBe(true);   // Ambos
    expect(caps.canApproveResponses).toBe(true);     // Do gestor_area
    expect(caps.canManageRespondents).toBe(true);    // Do gestor_area
    expect(caps.activeProfiles).toContain("gestor_area");
    expect(caps.activeProfiles).toContain("lider_processo");
  });

  it("Sponsor + Gestor de Área = soma de permissões", () => {
    const caps = computeMapeamentoCapabilities("sponsor", [
      mockProfile("sponsor"),
      mockProfile("gestor_area", 30),
    ]);
    expect(caps.canViewAllAreaProcesses).toBe(true);  // Do sponsor
    expect(caps.canDelegateProcesses).toBe(true);     // Do gestor_area
    expect(caps.canRespondMapeamentos).toBe(true);    // Do gestor_area
    expect(caps.canExportReports).toBe(true);         // Ambos
    expect(caps.canManageActionPlans).toBe(true);     // Do gestor_area
    expect(caps.areaIds).toContain(30);
  });

  it("Líder de Processo em múltiplas áreas = áreas somadas", () => {
    const caps = computeMapeamentoCapabilities("usuario", [
      mockProfile("lider_processo", 10),
      mockProfile("lider_processo", 20),
      mockProfile("lider_processo", 30),
    ]);
    expect(caps.areaIds).toEqual(expect.arrayContaining([10, 20, 30]));
    expect(caps.areaIds).toHaveLength(3);
    expect(caps.canRespondMapeamentos).toBe(true);
    expect(caps.canDelegateProcesses).toBe(false);  // Líder não delega
  });

  it("DPO Interno + Gestor de Área = aprovação + delegação + gestão", () => {
    const caps = computeMapeamentoCapabilities("dpo_interno", [
      mockProfile("dpo_interno"),
      mockProfile("gestor_area", 15),
    ]);
    expect(caps.canApproveResponses).toBe(true);      // Ambos
    expect(caps.canDelegateProcesses).toBe(true);     // Do gestor_area
    expect(caps.canRespondMapeamentos).toBe(true);    // Do gestor_area
    expect(caps.canViewAllAreaProcesses).toBe(true);  // Do dpo_interno
    expect(caps.canManageActionPlans).toBe(true);     // Ambos
  });
});

// ============================================================
// C) Fallback para role principal (sem perfis atribuídos)
// ============================================================
describe("Fallback para role principal", () => {
  it("sponsor sem perfis = fallback para capabilities de sponsor", () => {
    const caps = computeMapeamentoCapabilities("sponsor", []);
    expect(caps.canAccessModule).toBe(true);
    expect(caps.canViewAllAreaProcesses).toBe(true);
    expect(caps.canRespondMapeamentos).toBe(false);
    expect(caps.canDelegateProcesses).toBe(false);
    expect(caps.activeProfiles).toEqual(["sponsor"]);
  });

  it("usuario sem perfis = fallback para capabilities de usuario", () => {
    const caps = computeMapeamentoCapabilities("usuario", []);
    expect(caps.canAccessModule).toBe(true);
    expect(caps.canRespondMapeamentos).toBe(true);
    expect(caps.canDelegateProcesses).toBe(false);
    expect(caps.canExportReports).toBe(false);
  });

  it("terceiro sem perfis e sem mapeamento = sem acesso", () => {
    const caps = computeMapeamentoCapabilities("terceiro", []);
    expect(caps.canAccessModule).toBe(false);
    expect(caps.canRespondMapeamentos).toBe(false);
    expect(caps.isFullAccess).toBe(false);
    expect(caps.activeProfiles).toEqual([]);
  });

  it("perfis inativos são ignorados", () => {
    const caps = computeMapeamentoCapabilities("usuario", [
      mockInactiveProfile("gestor_area", 10),
    ]);
    // Sem perfis ativos, cai no fallback de "usuario"
    expect(caps.canDelegateProcesses).toBe(false);
    expect(caps.canRespondMapeamentos).toBe(true); // Fallback usuario
  });
});

// ============================================================
// D) Enforcement de capabilities
// ============================================================
describe("Enforcement de capabilities", () => {
  it("enforceMapeamentoCapability passa quando capability é true", () => {
    const caps = computeMapeamentoCapabilities("usuario", [mockProfile("gestor_area", 10)]);
    expect(() => enforceMapeamentoCapability(caps, "canDelegateProcesses")).not.toThrow();
  });

  it("enforceMapeamentoCapability lança FORBIDDEN quando capability é false", () => {
    const caps = computeMapeamentoCapabilities("usuario", [mockProfile("lider_processo", 10)]);
    expect(() => enforceMapeamentoCapability(caps, "canDelegateProcesses")).toThrow(TRPCError);
    try {
      enforceMapeamentoCapability(caps, "canDelegateProcesses");
    } catch (e: any) {
      expect(e.code).toBe("FORBIDDEN");
    }
  });

  it("enforceMapeamentoCapability passa para admin (isFullAccess)", () => {
    const caps = computeMapeamentoCapabilities("admin_global", []);
    expect(() => enforceMapeamentoCapability(caps, "canDeleteAreas")).not.toThrow();
  });

  it("enforceMapeamentoAreaAccess passa quando areaId está na lista", () => {
    const caps = computeMapeamentoCapabilities("usuario", [mockProfile("lider_processo", 10)]);
    expect(() => enforceMapeamentoAreaAccess(caps, 10)).not.toThrow();
  });

  it("enforceMapeamentoAreaAccess lança FORBIDDEN quando areaId não está na lista", () => {
    const caps = computeMapeamentoCapabilities("usuario", [mockProfile("lider_processo", 10)]);
    expect(() => enforceMapeamentoAreaAccess(caps, 99)).toThrow(TRPCError);
  });

  it("enforceMapeamentoAreaAccess passa para quem tem canViewAllAreaProcesses", () => {
    const caps = computeMapeamentoCapabilities("sponsor", [mockProfile("sponsor")]);
    expect(() => enforceMapeamentoAreaAccess(caps, 999)).not.toThrow();
  });

  it("enforceMapeamentoAreaAccess passa para admin (isFullAccess)", () => {
    const caps = computeMapeamentoCapabilities("admin_global", []);
    expect(() => enforceMapeamentoAreaAccess(caps, 999)).not.toThrow();
  });
});

// ============================================================
// E) Regras de delegação
// ============================================================
describe("Regras de delegação", () => {
  it("apenas gestor_area pode delegar", () => {
    const gestorCaps = computeMapeamentoCapabilities("usuario", [mockProfile("gestor_area", 10)]);
    const liderCaps = computeMapeamentoCapabilities("usuario", [mockProfile("lider_processo", 10)]);
    const sponsorCaps = computeMapeamentoCapabilities("sponsor", [mockProfile("sponsor")]);
    
    expect(gestorCaps.canDelegateProcesses).toBe(true);
    expect(liderCaps.canDelegateProcesses).toBe(false);
    expect(sponsorCaps.canDelegateProcesses).toBe(false);
  });

  it("apenas gestor_area pode revogar delegação", () => {
    const gestorCaps = computeMapeamentoCapabilities("usuario", [mockProfile("gestor_area", 10)]);
    const liderCaps = computeMapeamentoCapabilities("usuario", [mockProfile("lider_processo", 10)]);
    
    expect(gestorCaps.canRevokeDelegation).toBe(true);
    expect(liderCaps.canRevokeDelegation).toBe(false);
  });

  it("gestor_area é responsável final (canApproveResponses)", () => {
    const gestorCaps = computeMapeamentoCapabilities("usuario", [mockProfile("gestor_area", 10)]);
    expect(gestorCaps.canApproveResponses).toBe(true);
  });

  it("combinação Gestor + Líder: delegação prevalece do Gestor", () => {
    const caps = computeMapeamentoCapabilities("usuario", [
      mockProfile("gestor_area", 10),
      mockProfile("lider_processo", 10),
    ]);
    expect(caps.canDelegateProcesses).toBe(true);
    expect(caps.canRevokeDelegation).toBe(true);
    expect(caps.canApproveResponses).toBe(true);
  });
});
