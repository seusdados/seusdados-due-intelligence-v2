/**
 * Serviço de Controle de Acesso ao GED
 * Implementa regras de acesso conforme LGPD
 */

interface User {
  id: number;
  role: 'admin' | 'consultant' | 'sponsor' | 'respondent';
  organizationId?: number;
}

interface GedFile {
  id: string;
  assessmentId: number;
  organizationId: number;
  path: string;
  type: 'evidence' | 'response' | 'analysis' | 'result';
  createdBy: number;
  createdAt: Date;
  retentionUntil: Date;
}

interface AccessResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Regras de Acesso ao GED:
 * 1. Admin Seusdados: Acesso total
 * 2. Consultor Seusdados: Acesso a avaliações atribuídas
 * 3. Sponsor: Acesso apenas a resultados liberados
 * 4. Respondente: Acesso apenas às próprias respostas e evidências
 * 5. Cliente não vê a pasta (apenas arquivos específicos)
 */

/**
 * Verificar se usuário tem acesso a um arquivo
 */
export function checkFileAccess(user: User, file: GedFile): AccessResult {
  // Admin tem acesso total
  if (user.role === 'admin') {
    return { allowed: true };
  }

  // Consultor tem acesso a avaliações
  if (user.role === 'consultant') {
    return { allowed: true };
  }

  // Sponsor só pode ver resultados liberados
  if (user.role === 'sponsor') {
    if (file.type === 'result') {
      // Verificar se resultado foi liberado
      return { allowed: true, reason: 'Resultado liberado para sponsor' };
    }
    return { allowed: false, reason: 'Sponsor só pode acessar resultados liberados' };
  }

  // Respondente só pode ver próprias evidências
  if (user.role === 'respondent') {
    if (file.createdBy === user.id) {
      return { allowed: true, reason: 'Acesso ao próprio arquivo' };
    }
    return { allowed: false, reason: 'Respondente só pode acessar próprios arquivos' };
  }

  return { allowed: false, reason: 'Acesso negado' };
}

/**
 * Verificar se usuário pode listar pasta
 */
export function checkFolderAccess(user: User, assessmentId: number, organizationId: number): AccessResult {
  // Admin e Consultor podem listar qualquer pasta
  if (user.role === 'admin' || user.role === 'consultant') {
    return { allowed: true };
  }

  // Sponsor pode ver pasta de resultados da própria organização
  if (user.role === 'sponsor') {
    if (user.organizationId === organizationId) {
      return { allowed: true, reason: 'Acesso à pasta de resultados da organização' };
    }
    return { allowed: false, reason: 'Sponsor só pode acessar pasta da própria organização' };
  }

  // Respondente não pode listar pastas
  if (user.role === 'respondent') {
    return { allowed: false, reason: 'Respondente não pode listar pastas' };
  }

  return { allowed: false, reason: 'Acesso negado' };
}

/**
 * Calcular data de retenção (7 anos conforme LGPD)
 */
export function calculateRetentionDate(createdAt: Date): Date {
  const retentionYears = 7;
  const retentionDate = new Date(createdAt);
  retentionDate.setFullYear(retentionDate.getFullYear() + retentionYears);
  return retentionDate;
}

/**
 * Verificar se arquivo está dentro do período de retenção
 */
export function isWithinRetentionPeriod(file: GedFile): boolean {
  const now = new Date();
  return now < file.retentionUntil;
}

/**
 * Gerar estrutura de pastas para avaliação
 */
export function generateFolderStructure(assessmentCode: string): string[] {
  return [
    `/GED/Avaliacoes/${assessmentCode}`,
    `/GED/Avaliacoes/${assessmentCode}/Respostas`,
    `/GED/Avaliacoes/${assessmentCode}/Evidencias`,
    `/GED/Avaliacoes/${assessmentCode}/Analise_Risco`,
    `/GED/Avaliacoes/${assessmentCode}/Resultado_Final`,
  ];
}

/**
 * Gerar caminho para arquivo
 */
export function generateFilePath(
  assessmentCode: string,
  type: 'evidence' | 'response' | 'analysis' | 'result',
  fileName: string
): string {
  const folderMap = {
    evidence: 'Evidencias',
    response: 'Respostas',
    analysis: 'Analise_Risco',
    result: 'Resultado_Final',
  };

  return `/GED/Avaliacoes/${assessmentCode}/${folderMap[type]}/${fileName}`;
}

/**
 * Verificar permissão de upload
 */
export function checkUploadPermission(user: User, assessmentId: number, type: 'evidence' | 'response'): AccessResult {
  // Admin e Consultor podem fazer upload de qualquer tipo
  if (user.role === 'admin' || user.role === 'consultant') {
    return { allowed: true };
  }

  // Respondente pode fazer upload de evidências e respostas
  if (user.role === 'respondent') {
    if (type === 'evidence' || type === 'response') {
      return { allowed: true, reason: 'Respondente pode fazer upload de evidências e respostas' };
    }
    return { allowed: false, reason: 'Respondente só pode fazer upload de evidências e respostas' };
  }

  // Sponsor não pode fazer upload
  if (user.role === 'sponsor') {
    return { allowed: false, reason: 'Sponsor não pode fazer upload de arquivos' };
  }

  return { allowed: false, reason: 'Acesso negado' };
}

/**
 * Verificar permissão de download
 */
export function checkDownloadPermission(user: User, file: GedFile): AccessResult {
  // Verificar acesso ao arquivo
  const accessResult = checkFileAccess(user, file);
  if (!accessResult.allowed) {
    return accessResult;
  }

  // Verificar período de retenção
  if (!isWithinRetentionPeriod(file)) {
    return { allowed: false, reason: 'Arquivo fora do período de retenção' };
  }

  return { allowed: true };
}

/**
 * Verificar permissão de exclusão
 */
export function checkDeletePermission(user: User, file: GedFile): AccessResult {
  // Apenas Admin pode excluir arquivos
  if (user.role === 'admin') {
    return { allowed: true };
  }

  // Consultor pode excluir arquivos de análise e resultado
  if (user.role === 'consultant') {
    if (file.type === 'analysis' || file.type === 'result') {
      return { allowed: true, reason: 'Consultor pode excluir análises e resultados' };
    }
    return { allowed: false, reason: 'Consultor não pode excluir evidências e respostas' };
  }

  // Respondente pode excluir próprias evidências (antes de finalizar)
  if (user.role === 'respondent') {
    if (file.createdBy === user.id && file.type === 'evidence') {
      return { allowed: true, reason: 'Respondente pode excluir próprias evidências' };
    }
    return { allowed: false, reason: 'Respondente só pode excluir próprias evidências' };
  }

  return { allowed: false, reason: 'Acesso negado' };
}

/**
 * Listar arquivos acessíveis para usuário
 */
export function filterAccessibleFiles(user: User, files: GedFile[]): GedFile[] {
  return files.filter(file => checkFileAccess(user, file).allowed);
}

/**
 * Gerar log de acesso para auditoria
 */
export function generateAccessLog(
  user: User,
  file: GedFile,
  action: 'view' | 'download' | 'upload' | 'delete',
  result: AccessResult
): object {
  return {
    timestamp: new Date().toISOString(),
    userId: user.id,
    userRole: user.role,
    fileId: file.id,
    filePath: file.path,
    action,
    allowed: result.allowed,
    reason: result.reason,
  };
}
