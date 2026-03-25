import { pgTable, AnyPgColumn, integer, serial, bigint, varchar, timestamp, text, json, decimal, primaryKey, unique, boolean, smallint, index, uniqueIndex, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const accessLinks = pgTable("access_links", {
	id: serial().primaryKey(),
	token: varchar({ length: 64 }).notNull(),
	thirdPartyId: integer().notNull(),
	organizationId: integer().notNull(),
	assessmentId: integer(),
	type: text().default('due_diligence').notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	usedAt: timestamp({ mode: 'string' }),
	isActive: boolean().default(true).notNull(),
	createdById: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	sentAt: timestamp({ mode: 'string' }),
	viewedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
},
(table) => [
	index("access_links_token_unique").on(table.token),
]);

export const thirdPartyLinkResponses = pgTable("third_party_link_responses", {
	id: serial().primaryKey(),
	accessLinkId: integer().notNull(),
	assessmentId: integer().notNull(),
	questionId: integer().notNull(),
	selectedLevel: integer().notNull(),
	impactScore: integer().notNull(),
	probabilityScore: integer().notNull(),
	riskScore: integer().notNull(),
	notes: text(),
	ropaData: json("ropaData"),
	evidenceUrls: json(),
	responderName: varchar({ length: 120 }),
	responderEmail: varchar({ length: 255 }),
	responderRole: varchar({ length: 80 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	unique("tplr_accessLinkId_question_unique").on(table.accessLinkId, table.questionId),
	index("tplr_assessmentId_idx").on(table.assessmentId),
	index("tplr_accessLinkId_idx").on(table.accessLinkId),
]);


export const actionPlanHistory = pgTable("action_plan_history", {
	id: serial().primaryKey(),
	actionPlanId: integer().notNull(),
	changedById: integer().notNull(),
	changeType: text().notNull(),
	previousValue: text(),
	newValue: text(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("action_plan_history_action_idx").on(table.actionPlanId),
	index("action_plan_history_user_idx").on(table.changedById),
]);

export const actionPlanEvidence = pgTable("action_plan_evidence", {
	id: serial().primaryKey(),
	actionPlanId: integer().notNull(),
	documentId: integer().notNull(),
	description: text(),
	addedById: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("action_plan_evidence_actionPlanId_idx").on(table.actionPlanId),
]);

export const actionPlans = pgTable("action_plans", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	assessmentType: text().notNull(),
	assessmentId: integer().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	priority: text().default('media').notNull(),
	status: text().default('pendente').notNull(),
	responsibleId: integer(),
	responsibleName: varchar({ length: 255 }),
	dueDate: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	clientCompletedAt: timestamp({ mode: 'string' }),
	clientCompletedById: integer(),
	dpoValidatedAt: timestamp({ mode: 'string' }),
	dpoValidatedById: integer(),
	clientRejectionReason: text(),
	dpoValidationTicketId: integer(),
	notes: text(),
	observations: text(),
	gedFolderId: integer(),
	// Campos de validação do consultor
	validatorId: integer(),
	validatorName: varchar({ length: 255 }),
	validatedAt: timestamp({ mode: 'string' }),
	validationNotes: text(),
	validationRejectionReason: text(),
	submittedForValidationAt: timestamp({ mode: 'string' }),
	// Campos de vínculo com a pergunta da avaliação que originou a ação
	sourceQuestionKey: varchar({ length: 50 }),
	sourceQuestionText: text(),
	sourceDomainName: varchar({ length: 255 }),
	sourceSelectedLevel: integer(),
	sourceSelectedAnswer: text(),
	// Novos campos para integração com cláusulas e categorização
	actionCategory: text().default('contratual'),
	linkedClauseId: varchar({ length: 50 }),
	outputType: text(),
	convertedToTicketId: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const aiChatMessages = pgTable("ai_chat_messages", {
	id: serial().primaryKey(),
	sessionId: integer().notNull(),
	role: text().notNull(),
	content: text().notNull(),
	tokensUsed: integer().default(0),
	isRefinement: boolean().default(false).notNull(),
	parentMessageId: integer(),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const aiChatSessions = pgTable("ai_chat_sessions", {
	id: serial().primaryKey(),
	userId: integer().notNull(),
	organizationId: integer(),
	module: text().default('general').notNull(),
	entityType: varchar({ length: 50 }),
	entityId: integer(),
	title: varchar({ length: 255 }),
	provider: text().notNull(),
	model: varchar({ length: 100 }),
	status: text().default('active').notNull(),
	totalTokensUsed: integer().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const aiGeneratedResults = pgTable("ai_generated_results", {
	id: serial().primaryKey(),
	sessionId: integer(),
	organizationId: integer(),
	module: text().notNull(),
	entityType: varchar({ length: 50 }),
	entityId: integer(),
	resultType: text().notNull(),
	title: varchar({ length: 255 }),
	content: text().notNull(),
	structuredData: json(),
	status: text().default('draft').notNull(),
	approvedById: integer(),
	approvedAt: timestamp({ mode: 'string' }),
	appliedAt: timestamp({ mode: 'string' }),
	createdById: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const aiOrganizationInstructions = pgTable("ai_organization_instructions", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	module: text().default('general').notNull(),
	systemPrompt: text(),
	contextInstructions: text(),
	responseStyle: text().default('formal').notNull(),
	language: varchar({ length: 10 }).default('pt-BR'),
	includeRecommendations: boolean().default(true).notNull(),
	includeRiskAnalysis: boolean().default(true).notNull(),
	includeActionPlan: boolean().default(true).notNull(),
	customFields: json(),
	createdById: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const aiPromptTemplates = pgTable("ai_prompt_templates", {
	id: serial().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	module: text().default('general').notNull(),
	category: varchar({ length: 100 }),
	promptTemplate: text().notNull(),
	variables: json(),
	isSystem: boolean().default(false).notNull(),
	isActive: boolean().default(true).notNull(),
	createdById: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const aiProviderConfigs = pgTable("ai_provider_configs", {
	id: serial().primaryKey(),
	provider: text().notNull(),
	apiKey: text(),
	model: varchar({ length: 100 }),
	isEnabled: boolean().default(false).notNull(),
	isDefault: boolean().default(false).notNull(),
	maxTokens: integer().default(4096),
	temperature: integer().default(70),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const assessmentDocuments = pgTable("assessment_documents", {
	id: serial().primaryKey(),
	assessmentType: text().notNull(),
	assessmentId: integer().notNull(),
	documentId: integer().notNull(),
	category: text().default('documento_suporte').notNull(),
	description: text(),
	linkedById: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
	id: serial().primaryKey(),
	userId: integer(),
	organizationId: integer(),
	action: varchar({ length: 100 }).notNull(),
	entityType: varchar({ length: 50 }).notNull(),
	entityId: integer(),
	details: json(),
	ipAddress: varchar({ length: 45 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const clauseAuditLog = pgTable("clause_audit_log", {
	id: serial().primaryKey(),
	analysisId: integer().notNull(),
	clauseId: varchar({ length: 50 }).notNull(),
	clauseAuditActionType: text().notNull(),
	previousContent: text(),
	newContent: text(),
	refinementInstructions: text(),
	userId: integer().notNull(),
	userName: varchar({ length: 255 }),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("clause_audit_log_analysisId_idx").on(table.analysisId),
	index("clause_audit_log_userId_idx").on(table.userId),
]);

export const complianceAssessments = pgTable("compliance_assessments", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	createdById: integer().notNull(),
	title: varchar({ length: 255 }).notNull(),
	framework: text().default('misto').notNull(),
	status: text().default('rascunho').notNull(),
	overallScore: integer(),
	maturityLevel: integer(),
	riskScore: integer(),
	totalQuestions: integer().default(0),
	answeredQuestions: integer().default(0),
	completedAt: timestamp({ mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const complianceResponses = pgTable("compliance_responses", {
	id: serial().primaryKey().primaryKey(),
	assessmentId: integer().notNull(),
	domainId: integer().notNull(),
	questionId: varchar({ length: 20 }).notNull(),
	selectedLevel: integer().notNull(),
	riskScore: integer(),
	notes: text(),
	evidenceUrls: json(),
	attachments: json().$type<{ fileName: string; fileUrl: string; fileSize: number; fileType: string; uploadedAt: string }[]>().default([]).notNull(),
	respondedById: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const contractAnalyses = pgTable("contract_analyses", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	documentId: integer().notNull(),
	thirdPartyId: integer(),
	contractName: varchar({ length: 500 }).notNull(),
	// Status padronizado: 'queued' (aguardando fila), 'analyzing' (em processamento), 'completed', 'error', 'reviewed', 'approved', 'rejected', 'canceled'
	// Nota: 'pending' mantido por compatibilidade mas NÃO deve ser usado no código — usar 'queued'
	contractAnalysisStatus: text().default('queued').notNull(),
	// Pipeline stage: queued → extraction → analysis → mapping → risks → clauses → action_plan → reports → completed
	stage: varchar({ length: 50 }).default('queued').notNull(),
	stageProgress: integer().default(0).notNull(),
	reportUrl: text('reportUrl'),
	progress: integer().default(0).notNull(),
	executiveSummary: text(),
	complianceScore: integer(),
	criticalRisks: integer().default(0).notNull(),
	highRisks: integer().default(0).notNull(),
	mediumRisks: integer().default(0).notNull(),
	lowRisks: integer().default(0).notNull(),
	veryLowRisks: integer().default(0).notNull(),
	extractedText: text(),
	aiResponse: json(),
	aiModel: varchar({ length: 100 }),
	createdById: integer().notNull(),
	reviewedById: integer(),
	reviewedAt: timestamp({ mode: 'string' }),
	reviewNotes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp({ mode: 'string' }),
	status: varchar({ length: 50 }),
	linkedRipdId: integer(),
	lockedByRipd: boolean().default(false),
	startedAt: timestamp({ mode: 'string' }),
	finishedAt: timestamp({ mode: 'string' }),
	attempts: integer().default(0).notNull(),
	maxAttempts: integer().default(3).notNull(),
	lastHeartbeatAt: timestamp({ mode: 'string' }),
	errorCode: varchar({ length: 50 }),
	errorMessage: text(),
	canceledAt: timestamp({ mode: 'string' }),
	resultVersion: integer().default(1).notNull(),
	governanceMetadata: json(),
});

export const contractAnalysisClauses = pgTable("contract_analysis_clauses", {
	id: serial().primaryKey(),
	analysisId: integer().notNull(),
	clauseId: varchar({ length: 50 }).notNull(),
	sequenceNumber: integer().notNull(),
	title: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	originalContent: text().notNull(),
	isAccepted: boolean().default(true).notNull(),
	isApplicable: boolean().default(true).notNull(),
	version: integer().default(1).notNull(),
	// Campos para versão final editada
	finalContent: text(),
	finalTitle: varchar({ length: 500 }),
	isFinalApproved: boolean().default(false).notNull(),
	includeHeader: boolean().default(true).notNull(),
	includeContractReference: boolean().default(true).notNull(),
	editedById: integer(),
	editedAt: timestamp({ mode: 'string' }),
	approvedById: integer(),
	approvedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("contract_analysis_clauses_analysisId_idx").on(table.analysisId),
]);

export const contractAnalysisHistory = pgTable("contract_analysis_history", {
	id: serial().primaryKey(),
	analysisId: integer().notNull(),
	historyActionType: text().notNull(),
	description: text(),
	previousData: json(),
	newData: json(),
	userId: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const contractAnalysisMaps = pgTable("contract_analysis_maps", {
	id: serial().primaryKey(),
	analysisId: integer().notNull(),
	partnerName: varchar({ length: 500 }),
	contractType: varchar({ length: 255 }),
	contractingParty: varchar({ length: 500 }),
	contractedParty: varchar({ length: 500 }),
	lgpdAgentType: text(),
	agentTypeJustification: text(),
	contractObject: text(),
	startDate: varchar({ length: 50 }),
	endDate: varchar({ length: 50 }),
	commonData: text(),
	commonDataLargeScale: boolean().default(false),
	sensitiveData: text(),
	sensitiveDataLargeScale: boolean().default(false),
	hasElderlyData: boolean().default(false),
	elderlyDataDetails: text(),
	hasMinorData: boolean().default(false),
	minorDataDetails: text(),
	titularRightsDetails: text(),
	dataEliminationDetails: text(),
	legalRisks: text(),
	securityRisks: text(),
	protectionClauseDetails: text(),
	suggestedClause: text(),
	actionStatus: text().default('ajustar'),
	actionPlan: text(),
	suggestedDeadline: varchar({ length: 50 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	titularRightsStatus: text(),
	dataEliminationStatus: text(),
	hasProtectionClause: text(),
});

export const contractClauseVersions = pgTable("contract_clause_versions", {
	id: serial().primaryKey(),
	clauseId: integer().notNull(),
	analysisId: integer().notNull(),
	versionNumber: integer().notNull(),
	title: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	includeHeader: boolean().default(true).notNull(),
	includeContractReference: boolean().default(true).notNull(),
	changeDescription: text(),
	createdById: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	isActive: boolean().default(true).notNull(),
},
(table) => [
	index("contract_clause_versions_clauseId_idx").on(table.clauseId),
	index("contract_clause_versions_analysisId_idx").on(table.analysisId),
]);

export const contractChecklistItems = pgTable("contract_checklist_items", {
	id: serial().primaryKey(),
	analysisId: integer().notNull(),
	itemNumber: integer().notNull(),
	question: text().notNull(),
	checklistStatus: text().notNull(),
	observations: text(),
	contractExcerpt: text(),
	responsibleId: integer(),
	responsibleName: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const contractRiskItems = pgTable("contract_risk_items", {
	id: serial().primaryKey(),
	analysisId: integer().notNull(),
	contractArea: varchar({ length: 255 }),
	analysisBlock: integer(),
	riskDescription: text().notNull(),
	riskLevel: text().notNull(),
	potentialImpact: text(),
	requiredAction: text().notNull(),
	suggestedDeadline: varchar({ length: 50 }),
	legalReference: text(),
	riskActionStatus: text().default('pendente'),
	actionPlanId: integer(),
	responsibleId: integer(),
	responsibleName: varchar({ length: 255 }),
	riskDecision: text(),
	decisionNotes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});


export const contractAnalysisOutputsManifest = pgTable("contract_analysis_outputs_manifest", {
  analysisId: bigint({ mode: "number" }).primaryKey(),
  organizationId: bigint({ mode: "number" }).notNull(),

  mapCount: integer().default(0).notNull(),
  checklistCount: integer().default(0).notNull(),
  riskCount: integer().default(0).notNull(),
  clauseCount: integer().default(0).notNull(),
  actionPlanCount: integer().default(0).notNull(),

  reportUrl: text(),
  generatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  integrityHash: varchar({ length: 64 }),
}, (table) => ({
  idxOrg: index("contract_analysis_outputs_manifest_org_idx").on(table.organizationId),
}));


export const documents = pgTable("documents", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	uploadedById: integer().notNull(),
	entityType: text().notNull(),
	entityId: integer().notNull(),
	name: varchar({ length: 255 }).notNull(),
	fileUrl: text().notNull(),
	fileKey: varchar({ length: 500 }).notNull(),
	mimeType: varchar({ length: 100 }),
	fileSize: integer(),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const evidences = pgTable("evidences", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	assessmentType: text().notNull(),
	assessmentId: integer().notNull(),
	questionId: varchar({ length: 50 }),
	fileName: varchar({ length: 255 }).notNull(),
	fileKey: varchar({ length: 500 }).notNull(),
	fileUrl: text().notNull(),
	fileSize: integer(),
	mimeType: varchar({ length: 100 }),
	description: text(),
	uploadedById: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const gedAccessLogs = pgTable("ged_access_logs", {
	id: serial().primaryKey(),
	resourceType: text().notNull(),
	resourceId: integer().notNull(),
	userId: integer().notNull(),
	action: text().notNull(),
	details: json(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const gedDocuments = pgTable("ged_documents", {
	id: serial().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	spaceType: text().notNull(),
	organizationId: integer(),
	folderId: integer().notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileKey: varchar({ length: 500 }).notNull(),
	fileUrl: text().notNull(),
	fileSize: integer().notNull(),
	mimeType: varchar({ length: 100 }).notNull(),
	fileExtension: varchar({ length: 20 }),
	version: integer().default(1).notNull(),
	previousVersionId: integer(),
	isLatestVersion: boolean().default(true).notNull(),
	status: text().default('active').notNull(),
	isSharedWithClient: boolean().default(false).notNull(),
	sharedAt: timestamp({ mode: 'string' }),
	sharedById: integer(),
	tags: json(),
	metadata: json(),
	linkedEntityType: varchar({ length: 50 }),
	linkedEntityId: integer(),
	createdById: integer().notNull(),
	lastModifiedById: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp({ mode: 'string' }),
});

export const gedFolderTemplates = pgTable("ged_folder_templates", {
	id: serial().primaryKey(),
	spaceType: text().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	relativePath: varchar({ length: 500 }).notNull(),
	icon: varchar({ length: 50 }),
	color: varchar({ length: 7 }),
	sortOrder: integer().default(0).notNull(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const gedFolders = pgTable("ged_folders", {
	id: serial().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	spaceType: text().notNull(),
	organizationId: integer(),
	parentFolderId: integer(),
	path: varchar({ length: 1000 }).notNull(),
	depth: integer().default(0).notNull(),
	isSystemFolder: boolean().default(false).notNull(),
	icon: varchar({ length: 50 }),
	color: varchar({ length: 7 }),
	sortOrder: integer().default(0).notNull(),
	createdById: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const gedPermissions = pgTable("ged_permissions", {
	id: serial().primaryKey(),
	resourceType: text().notNull(),
	resourceId: integer().notNull(),
	permissionType: text().notNull(),
	userId: integer(),
	role: text(),
	accessLevel: text().default('view').notNull(),
	inheritFromParent: boolean().default(true).notNull(),
	grantedById: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp({ mode: 'string' }),
});

export const governancaActionItems = pgTable("governanca_action_items", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	meetingId: integer(),
	agendaItemId: integer(),
	createdById: integer().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	assignedToUserId: integer(),
	assignedToName: varchar({ length: 255 }),
	dueDate: timestamp({ mode: 'string' }),
	priority: text().default('media').notNull(),
	status: text().default('aberta').notNull(),
	completedAt: timestamp({ mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const governancaAgendaItems = pgTable("governanca_agenda_items", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	meetingId: integer().notNull(),
	createdById: integer().notNull(),
	order: integer().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	referenceDocuments: json(),
	status: text().default('nao_iniciado').notNull(),
	decisionSummary: text(),
	llmSummary: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const governancaAtividadeOrganizacao = pgTable("governanca_atividade_organizacao", {
	id: serial().primaryKey(),
	mesOrganizacaoId: integer().notNull(),
	organizationId: integer().notNull(),
	order: integer().notNull(),
	description: text().notNull(),
	status: text().default('pendente').notNull(),
	assignedToId: integer(),
	assignedToName: varchar({ length: 255 }),
	completedAt: timestamp({ mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const governancaControls = pgTable("governanca_controls", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	programId: integer().notNull(),
	createdById: integer().notNull(),
	code: varchar({ length: 50 }).notNull(),
	category: text().notNull(),
	label: varchar({ length: 255 }).notNull(),
	isImplemented: boolean().default(false).notNull(),
	implementedAt: timestamp({ mode: 'string' }),
	evidenceDocumentUrl: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const governancaCppdConfigs = pgTable("governanca_cppd_configs", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	createdById: integer().notNull(),
	year: integer().notNull(),
	programType: text().notNull(),
	regime: text().notNull(),
	dayOfWeek: text().notNull(),
	time: varchar({ length: 5 }).notNull(),
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }).notNull(),
	meetingLocationType: text().default('teams').notNull(),
	defaultMeetingUrl: varchar({ length: 255 }),
	status: text().default('ativo').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const governancaCppdMembers = pgTable("governanca_cppd_members", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	cppdId: integer().notNull(),
	createdById: integer().notNull(),
	userId: integer().notNull(),
	nameSnapshot: varchar({ length: 255 }).notNull(),
	emailSnapshot: varchar({ length: 255 }).notNull(),
	roleInCommittee: text().notNull(),
	isVoting: boolean().default(true).notNull(),
	isCoordinator: boolean().default(false).notNull(),
	isSecretary: boolean().default(false).notNull(),
	isDpo: boolean().default(false).notNull(),
	status: text().default('ativo').notNull(),
	nominationTermUrl: text(),
	confidentialityTermUrl: text(),
	regimentUrl: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const governancaEntregavelOrganizacao = pgTable("governanca_entregavel_organizacao", {
	id: serial().primaryKey(),
	mesOrganizacaoId: integer().notNull(),
	organizationId: integer().notNull(),
	order: integer().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	status: text().default('pendente').notNull(),
	assignedToId: integer(),
	assignedToName: varchar({ length: 255 }),
	documentId: integer(),
	documentUrl: text(),
	dueDate: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const governancaMeetingParticipants = pgTable("governanca_meeting_participants", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	meetingId: integer().notNull(),
	createdById: integer().notNull(),
	userId: integer().notNull(),
	nameSnapshot: varchar({ length: 255 }).notNull(),
	emailSnapshot: varchar({ length: 255 }).notNull(),
	role: text().notNull(),
	attendanceStatus: text().default('nao_confirmado').notNull(),
	joinTime: timestamp({ mode: 'string' }),
	leaveTime: timestamp({ mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const governancaMeetings = pgTable("governanca_meetings", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	cppdId: integer().notNull(),
	programId: integer(),
	createdById: integer().notNull(),
	year: integer().notNull(),
	sequence: integer().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	durationMinutes: integer().default(90).notNull(),
	status: text().default('agendada').notNull(),
	location: varchar({ length: 255 }),
	meetingProvider: text().default('teams').notNull(),
	meetingUrl: text(),
	calendarEventId: varchar({ length: 255 }),
	agendaTitle: varchar({ length: 255 }).notNull(),
	agendaSummary: text(),
	agendaTemplateCode: varchar({ length: 50 }),
	recordingUrl: text(),
	transcript: text(),
	minutesContent: text(),
	minutesPdfUrl: text(),
	gedDocumentKey: text(),
	signersSnapshot: json().$type<Array<{userId: number; name: string; role: string; signedAt?: string}>>(),
	minutesStatus: text().default('nao_gerada').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const governancaMesOrganizacao = pgTable("governanca_mes_organizacao", {
	id: serial().primaryKey(),
	planoOrganizacaoId: integer().notNull(),
	organizationId: integer().notNull(),
	mesTemplateId: integer().notNull(),
	monthNumber: integer().notNull(),
	scheduledStartDate: timestamp({ mode: 'string' }),
	scheduledEndDate: timestamp({ mode: 'string' }),
	actualStartDate: timestamp({ mode: 'string' }),
	actualEndDate: timestamp({ mode: 'string' }),
	status: text().default('nao_iniciado').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const governancaMesTemplates = pgTable("governanca_mes_templates", {
	id: serial().primaryKey(),
	planoAnualTemplateId: integer().notNull(),
	templateKey: varchar({ length: 100 }).notNull(),
	monthNumber: integer().notNull(),
	macroBlock: varchar({ length: 255 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	theme: varchar({ length: 255 }).notNull(),
	activities: json().notNull(),
	deliverables: json().notNull(),
	blockColor: varchar({ length: 7 }).default('#5f29cc'),
	icon: varchar({ length: 50 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("gov_mes_tpl_templateKey").on(table.templateKey),
]);

export const governancaPlanoAnualOrganizacao = pgTable("governanca_plano_anual_organizacao", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	templateId: integer().notNull(),
	year: integer().notNull(),
	startDate: timestamp({ mode: 'string' }).notNull(),
	status: text().default('planejado').notNull(),
	notes: text(),
	createdById: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const governancaPlanoAnualTemplates = pgTable("governanca_plano_anual_templates", {
	id: serial().primaryKey(),
	templateKey: varchar({ length: 100 }).notNull(),
	programModel: text().notNull(),
	label: varchar({ length: 255 }).notNull(),
	description: text(),
	totalMonths: integer().default(10).notNull(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("gov_plano_tpl_templateKey").on(table.templateKey),
]);

export const governancaProgramMilestones = pgTable("governanca_program_milestones", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	programId: integer().notNull(),
	phaseId: integer().notNull(),
	createdById: integer().notNull(),
	month: integer().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	isCompleted: boolean().default(false).notNull(),
	completedAt: timestamp({ mode: 'string' }),
	evidenceDocumentUrl: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const governancaProgramPhases = pgTable("governanca_program_phases", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	programId: integer().notNull(),
	createdById: integer().notNull(),
	phaseNumber: integer().notNull(),
	name: varchar({ length: 255 }).notNull(),
	theme: varchar({ length: 255 }),
	startMonth: integer().notNull(),
	endMonth: integer().notNull(),
	quarter: varchar({ length: 10 }),
	status: text().default('nao_iniciado').notNull(),
	completedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const governancaPrograms = pgTable("governanca_programs", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	createdById: integer().notNull(),
	year: integer().notNull(),
	type: text().notNull(),
	status: text().default('planejado').notNull(),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const lgpdClauseTemplateHistory = pgTable("lgpd_clause_template_history", {
	id: serial().primaryKey(),
	templateId: integer().notNull(),
	organizationId: integer(),
	previousContent: text().notNull(),
	newContent: text().notNull(),
	changedBy: integer().notNull(),
	changeReason: text(),
	version: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const lgpdClauseTemplates = pgTable("lgpd_clause_templates", {
	id: serial().primaryKey(),
	organizationId: integer(),
	templateId: varchar({ length: 50 }).notNull(),
	templateName: varchar({ length: 255 }).notNull(),
	templateDescription: text(),
	content: text().notNull(),
	variables: text(),
	isActive: boolean().default(true).notNull(),
	version: integer().default(1).notNull(),
	createdBy: integer().notNull(),
	updatedBy: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const mapeamentoAreas = pgTable("mapeamento_areas", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	contextId: integer().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	isCustom: boolean().default(false),
	isActive: boolean().default(true),
	responsibleName: varchar({ length: 255 }),
	responsibleEmail: varchar({ length: 255 }),
	responsiblePhone: varchar({ length: 50 }),
	processCount: integer().default(0),
	completedProcessCount: integer().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("map_areas_idx_org").on(table.organizationId),
	index("map_areas_idx_context").on(table.contextId),
]);

export const mapeamentoContexts = pgTable("mapeamento_contexts", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	segment: varchar({ length: 100 }).notNull(),
	businessType: varchar({ length: 100 }).notNull(),
	employeesRange: varchar({ length: 50 }),
	unitsCount: integer().default(1),
	hasDataProtectionOfficer: boolean().default(false),
	dataProtectionOfficerName: varchar({ length: 255 }),
	dataProtectionOfficerEmail: varchar({ length: 255 }),
	status: text().default('em_andamento').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("map_ctx_idx_org").on(table.organizationId),
]);

export const mapeamentoProcesses = pgTable("mapeamento_processes", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	areaId: integer().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	purpose: text(),
	isAiGenerated: boolean().default(false),
	isActive: boolean().default(true),
	orderIndex: integer().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("map_proc_idx_org").on(table.organizationId),
	index("map_proc_idx_area").on(table.areaId),
]);

export const mapeamentoRespondents = pgTable("mapeamento_respondents", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	areaId: integer().notNull(),
	processId: integer(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 50 }),
	role: varchar({ length: 100 }),
	inviteToken: varchar({ length: 64 }),
	inviteSentAt: timestamp({ mode: 'string' }),
	inviteExpiresAt: timestamp({ mode: 'string' }),
	status: text().default('pendente').notNull(),
	startedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("map_resp_idx_org").on(table.organizationId),
	index("map_resp_idx_area").on(table.areaId),
	index("map_resp_idx_token").on(table.inviteToken),
]);

export const mapeamentoResponses = pgTable("mapeamento_responses", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	respondentId: integer().notNull(),
	processId: integer().notNull(),
	// Vínculo com ROT gerado automaticamente (Modelo 2)
	rotId: integer(),
	dataCategories: json(),
	titularCategories: json(),
	legalBase: varchar({ length: 255 }),
	sharing: json(),
	consentObtained: boolean().default(false),
	retentionPeriod: varchar({ length: 100 }),
	storageLocation: varchar({ length: 255 }),
	securityMeasures: json(),
	internationalTransfer: boolean().default(false),
	internationalCountries: json(),
	riskLevel: text(),
	riskScore: decimal({ precision: 5, scale: 2 }),
	requiresAction: boolean().default(false),
	notes: text(),
	ropaData: json("ropaData"),
	completed: boolean().default(false),
	completedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
		index("map_responses_idx_org").on(table.organizationId),
		index("map_responses_idx_respondent").on(table.respondentId),
		index("map_responses_idx_process").on(table.processId),
		index("map_responses_idx_rot").on(table.rotId),
	]);

export const meudpoSettings = pgTable("meudpo_settings", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	slaUrgentHours: integer().default(24).notNull(),
	slaPrioritarioHours: integer().default(48).notNull(),
	slaPadraoHours: integer().default(120).notNull(),
	notifyOnCreate: boolean().default(true).notNull(),
	notifyOnUpdate: boolean().default(true).notNull(),
	notifyOnResolve: boolean().default(true).notNull(),
	autoReportFrequency: text().default('semanal').notNull(),
	autoReportRecipients: json(),
	customCategories: json(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	slaCritica: integer().default(4),
	slaAlta: integer().default(8),
	slaMedia: integer().default(24),
	slaBaixa: integer().default(72),
	notifyOnComment: boolean().default(true),
	notifySlaWarning: boolean().default(true),
	slaWarningThreshold: integer().default(80),
	autoReportEnabled: boolean().default(false),
	reportRecipients: json(),
	autoAssignEnabled: boolean().default(false),
	autoAssignRules: json(),
},
(table) => [
	index("org_unique").on(table.organizationId),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey(),
	userId: integer().notNull(),
	organizationId: integer(),
	type: text().default('system').notNull(),
	title: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	isRead: boolean().default(false).notNull(),
	entityType: varchar({ length: 50 }),
	entityId: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	notificationType: varchar({ length: 50 }),
	link: varchar({ length: 500 }),
	readAt: timestamp({ mode: 'string' }),
	sentViaEmail: boolean().default(false).notNull(),
	emailSentAt: timestamp({ mode: 'string' }),
});

export const organizations = pgTable("organizations", {
	id: serial().primaryKey(),
	name: varchar({ length: 255 }).notNull(),
	tradeName: varchar({ length: 255 }).notNull(),
	cnpj: varchar({ length: 18 }),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 20 }),
	address: text(),
	street: varchar({ length: 255 }),
	number: varchar({ length: 20 }),
	complement: varchar({ length: 255 }),
	neighborhood: varchar({ length: 100 }),
	city: varchar({ length: 100 }),
	state: varchar({ length: 2 }),
	zipCode: varchar({ length: 10 }),
	logoUrl: text(),
	primaryColor: varchar({ length: 7 }).default('#5f29cc'),
	secondaryColor: varchar({ length: 7 }).default('#0ea5e9'),
	isActive: boolean().default(true).notNull(),
	deletedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	segment: varchar({ length: 100 }),
	businessType: varchar({ length: 100 }),
	units: integer(),
	employeesRange: varchar({ length: 50 }),
	hasDpo: boolean(),
	dpoName: varchar({ length: 255 }),
	dpoEmail: varchar({ length: 320 }),
	sponsorUserId: integer(),
},
(table) => [
	index("organizations_cnpj_unique").on(table.cnpj),
]);

export const reminderLogs = pgTable("reminder_logs", {
	id: serial().primaryKey(),
	accessLinkId: integer().notNull(),
	organizationId: integer().notNull(),
	thirdPartyId: integer().notNull(),
	reminderNumber: integer().default(1).notNull(),
	sentAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	status: text().default('sent').notNull(),
	errorMessage: text(),
});

export const reminderSettings = pgTable("reminder_settings", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	isEnabled: boolean().default(true).notNull(),
	daysAfterSent: integer().default(7).notNull(),
	maxReminders: integer().default(3).notNull(),
	reminderInterval: integer().default(7).notNull(),
	lastProcessedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("reminder_settings_organizationId_unique").on(table.organizationId),
]);

export const responseTemplates = pgTable("response_templates", {
	id: serial().primaryKey(),
	organizationId: integer(),
	createdById: integer().notNull(),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	category: varchar({ length: 100 }),
	ticketType: varchar({ length: 50 }),
	isGlobal: boolean().default(false).notNull(),
	usageCount: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const riskActionPlans = pgTable("risk_action_plans", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	analysisId: integer().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	priority: text().notNull(),
	assigneeId: integer(),
	assigneeRole: text(),
	dueDate: timestamp({ mode: 'string' }),
	estimatedEffortHours: integer(),
	status: text().default('pendente').notNull(),
	completedAt: timestamp({ mode: 'string' }),
	completedById: integer(),
	evidence: text(),
	evidenceFileKey: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("risk_ap_idx_org").on(table.organizationId),
	index("risk_ap_idx_analysis").on(table.analysisId),
	index("risk_ap_idx_assignee").on(table.assigneeId),
	index("risk_ap_idx_status").on(table.status),
]);

export const riskAnalyses = pgTable("risk_analyses", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	sourceType: text().notNull(),
	sourceId: integer(),
	riskLevel: text().notNull(),
	riskScore: decimal({ precision: 5, scale: 2 }),
	riskFactors: json(),
	analyzedById: integer(),
	analyzedAt: timestamp({ mode: 'string' }).defaultNow(),
	aiAnalysis: json(),
	status: text().default('pendente').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("risk_an_idx_org").on(table.organizationId),
	index("risk_an_idx_source").on(table.sourceType, table.sourceId),
]);

export const rotOperations = pgTable("rot_operations", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	createdById: integer().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	department: varchar({ length: 100 }),
	titularCategory: varchar({ length: 100 }).notNull(),
	dataCategories: json().notNull(),
	purpose: text().notNull(),
	legalBase: varchar({ length: 255 }).notNull(),
	requiresConsent: boolean().notNull(),
	alternativeBases: json(),
	risksIfNoConsent: json(),
	justification: text(),
	aiAnalysis: json(),
	aiGeneratedAt: timestamp({ mode: 'string' }),
	popFileKey: varchar({ length: 255 }),
	rotFileKey: varchar({ length: 255 }),
	ropaData: json("ropaData"),
	ropaFileKey: varchar("ropaFileKey", { length: 255 }),
	status: text().default('rascunho').notNull(),
	approvedById: integer(),
	approvedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const rotTasks = pgTable("rot_tasks", {
	id: serial().primaryKey(),
	rotId: integer().notNull(),
	assigneeId: integer().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	dueDate: timestamp({ mode: 'string' }),
	priority: text().notNull(),
	completed: boolean().default(false),
	completedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const simulationChecklist = pgTable("simulation_checklist", {
	id: serial().primaryKey(),
	simulationId: integer().notNull(),
	organizationId: integer().notNull(),
	category: varchar({ length: 100 }).notNull(),
	item: text().notNull(),
	isCompleted: boolean().default(false).notNull(),
	completedAt: timestamp({ mode: 'string' }),
	completedBy: varchar({ length: 255 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const simulationDecisions = pgTable("simulation_decisions", {
	id: serial().primaryKey(),
	simulationId: integer().notNull(),
	organizationId: integer().notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	phase: varchar({ length: 50 }).notNull(),
	description: text().notNull(),
	decisionMaker: varchar({ length: 255 }).notNull(),
	decisionType: text().notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const simulationEvents = pgTable("simulation_events", {
	id: serial().primaryKey(),
	simulationId: integer().notNull(),
	organizationId: integer().notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	phase: varchar({ length: 50 }).notNull(),
	eventType: varchar({ length: 100 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	severity: text().notNull(),
	isRead: boolean().default(false).notNull(),
	readAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const simulationFeedback = pgTable("simulation_feedback", {
	id: serial().primaryKey(),
	simulationId: integer().notNull(),
	organizationId: integer().notNull(),
	participantId: integer().notNull(),
	participantRole: varchar({ length: 100 }).notNull(),
	clarityScore: integer().notNull(),
	communicationScore: integer().notNull(),
	toolsScore: integer().notNull(),
	strengths: text(),
	weaknesses: text(),
	suggestions: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const simulationKpis = pgTable("simulation_kpis", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	unit: varchar({ length: 50 }).notNull(),
	targetValue: decimal({ precision: 10, scale: 2 }),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const simulationScenarios = pgTable("simulation_scenarios", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	createdById: integer().notNull(),
	nome: varchar({ length: 255 }).notNull(),
	tipoIncidente: varchar({ length: 100 }).notNull(),
	descricao: text().notNull(),
	areasEnvolvidas: json().notNull(),
	sistemasAfetados: json().notNull(),
	objetivos: json().notNull(),
	papeisChave: json().notNull(),
	criteriosSucesso: json().notNull(),
	trimestre: varchar({ length: 20 }),
	isTemplate: boolean().default(false).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const simulationStakeholders = pgTable("simulation_stakeholders", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	name: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 100 }).notNull(),
	department: varchar({ length: 100 }),
	contactEmail: varchar({ length: 255 }),
	contactPhone: varchar({ length: 50 }),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const simulations = pgTable("simulations", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	scenarioId: integer().notNull(),
	createdById: integer().notNull(),
	scenarioName: varchar({ length: 255 }).notNull(),
	startTime: timestamp({ mode: 'string' }).notNull(),
	endTime: timestamp({ mode: 'string' }),
	status: text().default('planejada').notNull(),
	phaseTimings: json().notNull(),
	kpiValues: json().notNull(),
	playbookAdherence: integer().default(0),
	recordsCompleteness: integer().default(0),
	participants: json(),
	quarter: varchar({ length: 20 }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const slaMetrics = pgTable("sla_metrics", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	ticketId: integer().notNull(),
	slaLevel: text().notNull(),
	deadline: timestamp({ mode: 'string' }).notNull(),
	resolvedAt: timestamp({ mode: 'string' }),
	slaMetHours: integer(),
	slaMet: boolean(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const thirdParties = pgTable("third_parties", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	name: varchar({ length: 255 }).notNull(),
	tradeName: varchar({ length: 255 }),
	cnpj: varchar({ length: 18 }),
	type: text().default('fornecedor').notNull(),
	category: varchar({ length: 100 }),
	contactName: varchar({ length: 255 }),
	contactEmail: varchar({ length: 320 }),
	contactPhone: varchar({ length: 20 }),
	address: text(),
	description: text(),
	riskLevel: text(),
	lastAssessmentDate: timestamp({ mode: 'string' }),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	contactWhatsapp: varchar({ length: 20 }),
	managerArea: varchar({ length: 255 }),
	contractType: varchar({ length: 100 }),
});

export const thirdPartyAccessLinks = pgTable("third_party_access_links", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	thirdPartyId: integer().notNull(),
	assessmentId: integer(),
	token: varchar({ length: 64 }).notNull(),
	status: text().default('ativo').notNull(),
	expiresAt: timestamp({ mode: 'string' }),
	usedAt: timestamp({ mode: 'string' }),
	createdById: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("third_party_access_links_token_unique").on(table.token),
]);

export const thirdPartyAssessments = pgTable("third_party_assessments", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	thirdPartyId: integer().notNull(),
	createdById: integer().notNull(),
	title: varchar({ length: 255 }).notNull(),
	status: text().default('rascunho').notNull(),
	overallRiskScore: integer(),
	riskClassification: text(),
	totalQuestions: integer().default(0),
	answeredQuestions: integer().default(0),
	recommendation: text(),
	completedAt: timestamp({ mode: 'string' }),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const thirdPartyResponses = pgTable("third_party_responses", {
	id: serial().primaryKey(),
	assessmentId: integer().notNull(),
	questionId: integer().notNull(),
	selectedLevel: integer().notNull(),
	impactScore: integer().notNull(),
	probabilityScore: integer().notNull(),
	riskScore: integer().notNull(),
	notes: text(),
	evidenceUrls: json(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const ticketAttachments = pgTable("ticket_attachments", {
	id: serial().primaryKey(),
	ticketId: integer().notNull(),
	commentId: integer("comment_id"),
	organizationId: integer().notNull(),
	uploadedById: integer().notNull(),
	filename: varchar({ length: 255 }).notNull(),
	originalFilename: varchar({ length: 255 }).notNull(),
	mimeType: varchar({ length: 100 }).notNull(),
	fileSize: integer().notNull(),
	storageUrl: varchar({ length: 500 }).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const ticketCalendarEvents = pgTable("ticket_calendar_events", {
	id: serial().primaryKey(),
	ticketId: integer().notNull(),
	organizationId: integer().notNull(),
	userId: integer().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	eventType: text().default('deadline').notNull(),
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }),
	externalCalendarType: text(),
	externalEventId: varchar({ length: 255 }),
	reminderMinutes: integer().default(30),
	reminderSent: boolean().default(false).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const ticketComments = pgTable("ticket_comments", {
	id: serial().primaryKey(),
	ticketId: integer().notNull(),
	organizationId: integer().notNull(),
	authorId: integer().notNull(),
	authorRole: text().notNull(),
	content: text().notNull(),
	isInternal: boolean().default(false).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const ticketEscalations = pgTable("ticket_escalations", {
	id: serial().primaryKey(),
	ticketId: integer().notNull(),
	fromUserId: integer(),
	toUserId: integer().notNull(),
	reason: varchar({ length: 255 }).notNull(),
	escalationType: text().notNull(),
	previousPriority: varchar({ length: 20 }),
	newPriority: varchar({ length: 20 }),
	notifiedAt: timestamp({ mode: 'string' }),
	acknowledgedAt: timestamp({ mode: 'string' }),
	acknowledgedById: integer(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const ticketTagAssociations = pgTable("ticket_tag_associations", {
	id: serial().primaryKey(),
	ticketId: integer().notNull(),
	tagId: integer().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const ticketTags = pgTable("ticket_tags", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	createdById: integer().notNull(),
	name: varchar({ length: 50 }).notNull(),
	color: varchar({ length: 7 }).default('#6366f1').notNull(),
	description: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const tickets = pgTable("tickets", {
	id: serial().primaryKey(),
	ticketNumber: integer("ticket_number").unique(),
	organizationId: integer().notNull(),
	createdById: integer().notNull(),
	assignedToId: integer(),
	clientId: integer(),
	title: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	ticketType: text().notNull(),
	priority: text().default('media').notNull(),
	status: text().default('novo').notNull(),
	slaLevel: text().default('padrao').notNull(),
	deadline: timestamp({ mode: 'string' }),
	resolvedAt: timestamp({ mode: 'string' }),
	resolution: text(),
	legalBasis: varchar({ length: 255 }),
	applicableArticles: json(),
	sourceContext: json(),
	metadata: json(),
	incidentId: integer("incident_id"), // Vinculação com incidente
	serviceCatalogItemId: integer("service_catalog_item_id"), // Vinculação com catálogo de serviços CSC
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const userInvites = pgTable("user_invites", {
	id: serial().primaryKey(),
	email: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 255 }),
	token: varchar({ length: 100 }).notNull(),
	role: text().default('sponsor').notNull(),
	organizationId: integer(),
	invitedById: integer().notNull(),
	status: text().default('pending').notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	acceptedAt: timestamp({ mode: 'string' }),
	emailSentAt: timestamp({ mode: 'string' }),
	emailSentCount: integer().default(0).notNull(),
	message: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("user_invites_token_unique").on(table.token),
]);

export const userOrganizations = pgTable("user_organizations", {
	id: serial().primaryKey(),
	userId: integer().notNull(),
	organizationId: integer().notNull(),
	accessLevel: text().default('viewer').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: serial().primaryKey(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: text().default('sponsor').notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).defaultNow().notNull(),
	organizationId: integer(),
	avatarUrl: text(),
	phone: varchar({ length: 20 }),
	isActive: boolean().default(true).notNull(),
		temporaryPassword: varchar("temporary_password", { length: 255 }),
		passwordExpiresAt: timestamp("password_expires_at", { mode: 'string' }),
		mustChangePassword: boolean("must_change_password").default(false),
		passwordHash: varchar("password_hash", { length: 255 }),
			clientRoles: json().$type<('sponsor' | 'comite' | 'lider_processo' | 'gestor_area')[]>().default([]).notNull(), // Múltiplos papéis de cliente
			setupToken: varchar("setup_token", { length: 100 }),
			setupTokenExpiresAt: timestamp("setup_token_expires_at", { mode: 'string' }),
},
(table) => [
	uniqueIndex("users_openId_unique").on(table.openId),
]);


// Vinculação entre Mapeamentos (ROT/POP) e documentos GED
export const mapeamentoGedDocuments = pgTable("mapeamento_ged_documents", {
  id: serial().primaryKey(),
  rotId: integer("rot_id").notNull(),
  gedDocumentId: integer("ged_document_id").notNull(),
  documentType: varchar("document_type", { length: 50 }).notNull(), // rot, pop, ropa, evidence
  version: integer().default(1).notNull(),
  isLatest: boolean("is_latest").default(true).notNull(),
  generatedAt: timestamp("generated_at", { mode: 'string' }).defaultNow().notNull(),
  generatedById: integer("generated_by_id"),
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("mapeamento_ged_rot_idx").on(table.rotId),
  index("mapeamento_ged_document_idx").on(table.gedDocumentId),
  index("mapeamento_ged_type_idx").on(table.documentType),
]);

export type MapeamentoGedDocument = typeof mapeamentoGedDocuments.$inferSelect;
export type InsertMapeamentoGedDocument = typeof mapeamentoGedDocuments.$inferInsert;


// ==================== FASE 3 - CENTRAL DE DIREITOS DO TITULAR ====================

// Consolidação de onde cada titular aparece nos processos mapeados
export const titularInstances = pgTable("titular_instances", {
  id: serial().primaryKey(),
  organizationId: integer().notNull(),
  
  // Identificação do titular
  titularName: varchar({ length: 255 }).notNull(),
  titularEmail: varchar({ length: 255 }),
  titularDocument: varchar({ length: 50 }), // CPF, CNPJ, etc.
  titularCategory: varchar({ length: 100 }), // Cliente, Funcionário, etc.
  
  // Vínculo com processo mapeado
  processId: integer().notNull(),
  responseId: integer(), // Referência à resposta da entrevista
  
  // Sistema/fonte onde os dados residem
  systemName: varchar({ length: 100 }).notNull(),
  databaseTable: varchar({ length: 100 }),
  
  // LGPD metadata
  legalBasis: varchar({ length: 255 }),
  purpose: varchar({ length: 500 }),
  sharing: json(),
  retentionPeriod: varchar({ length: 100 }),
  
  // Dados tratados
  dataCategories: json(), // [{name, sensivel}]
  hasSensitiveData: boolean().default(false),
  
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("titular_instances_org_idx").on(table.organizationId),
  index("titular_instances_name_idx").on(table.titularName),
  index("titular_instances_email_idx").on(table.titularEmail),
  index("titular_instances_document_idx").on(table.titularDocument),
  index("titular_instances_process_idx").on(table.processId),
]);

export type TitularInstance = typeof titularInstances.$inferSelect;
export type InsertTitularInstance = typeof titularInstances.$inferInsert;

// Solicitações de direitos LGPD dos titulares
export const dataSubjectRequests = pgTable("data_subject_requests", {
  id: serial().primaryKey(),
  organizationId: integer().notNull(),
  
  // Titular identificado
  titularName: varchar({ length: 255 }).notNull(),
  titularEmail: varchar({ length: 255 }),
  titularDocument: varchar({ length: 50 }),
  
  // Tipo de solicitação (Art. 18 LGPD)
  requestType: text().notNull(),
  
  // Detalhes da solicitação
  description: text(),
  receivedVia: varchar({ length: 100 }), // email, formulario, telefone, presencial
  externalProtocol: varchar({ length: 100 }), // protocolo externo se houver
  
  // Status do atendimento
  status: text().default('recebida').notNull(),
  
  // Prazos (LGPD: 15 dias)
  receivedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  dueDate: timestamp({ mode: 'string' }),
  respondedAt: timestamp({ mode: 'string' }),
  
  // Resposta
  responseUrl: varchar({ length: 500 }), // URL do relatório gerado
  responseNotes: text(),
  
  // Responsável
  assignedToId: integer(),
  
  // Auditoria
  createdById: integer(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("dsr_org_idx").on(table.organizationId),
  index("dsr_titular_name_idx").on(table.titularName),
  index("dsr_status_idx").on(table.status),
  index("dsr_type_idx").on(table.requestType),
  index("dsr_due_date_idx").on(table.dueDate),
]);

export type DataSubjectRequest = typeof dataSubjectRequests.$inferSelect;
export type InsertDataSubjectRequest = typeof dataSubjectRequests.$inferInsert;

// Histórico de ações nas solicitações de direitos
export const dataSubjectRequestHistory = pgTable("data_subject_request_history", {
  id: serial().primaryKey(),
  requestId: integer().notNull(),
  
  action: varchar({ length: 100 }).notNull(), // status_change, comment, attachment, response
  previousStatus: varchar({ length: 50 }),
  newStatus: varchar({ length: 50 }),
  notes: text(),
  
  performedById: integer(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("dsr_history_request_idx").on(table.requestId),
]);

export type DataSubjectRequestHistory = typeof dataSubjectRequestHistory.$inferSelect;
export type InsertDataSubjectRequestHistory = typeof dataSubjectRequestHistory.$inferInsert;


// ==================== INTEGRAÇÃO ANÁLISE DE CONTRATOS COM MAPEAMENTOS ====================

// Vinculação entre análise de contrato e mapeamentos gerados automaticamente
export const contractMapeamentoLinks = pgTable("contract_mapeamento_links", {
  id: serial().primaryKey(),
  
  // Referência à análise de contrato
  contractAnalysisId: integer().notNull(),
  
  // Referências ao mapeamento gerado
  contextId: integer(), // mapeamento_contexts
  areaId: integer(), // mapeamento_areas
  processId: integer(), // mapeamento_processes
  responseId: integer(), // mapeamento_responses
  rotId: integer(), // rot_operations - preenchido após conversão em ROT
  
  // Metadados da extração
  extractionSource: text().default('contract_map').notNull(),
  extractedData: json(), // Dados brutos extraídos do contrato
  
  // Área/departamento identificado
  identifiedDepartment: varchar({ length: 255 }),
  
  // Status da vinculação
  linkStatus: text().default('pending').notNull(),
  errorMessage: text(),
  
  // Auditoria
  createdById: integer(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("cml_contract_idx").on(table.contractAnalysisId),
  index("cml_context_idx").on(table.contextId),
  index("cml_area_idx").on(table.areaId),
  index("cml_process_idx").on(table.processId),
  index("cml_response_idx").on(table.responseId),
  index("cml_rot_idx").on(table.rotId),
  index("cml_status_idx").on(table.linkStatus),
]);

export type ContractMapeamentoLink = typeof contractMapeamentoLinks.$inferSelect;
export type InsertContractMapeamentoLink = typeof contractMapeamentoLinks.$inferInsert;


// ==========================================
// PLANO CPPD CONTÍNUO - INICIATIVAS
// ==========================================

export const cppdInitiatives = pgTable("cppd_initiatives", {
  id: serial().primaryKey().primaryKey(),
  organizationId: integer().notNull(),
  
  // Informações básicas
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  category: text().default('outro').notNull(),
  
  // Status e progresso
  status: text().default('planejado').notNull(),
  progress: integer().default(0).notNull(), // 0-100
  
  // Datas
  plannedStartDate: timestamp({ mode: 'string' }),
  plannedEndDate: timestamp({ mode: 'string' }),
  actualStartDate: timestamp({ mode: 'string' }),
  actualEndDate: timestamp({ mode: 'string' }),
  
  // Responsável
  responsibleId: integer(),
  responsibleName: varchar({ length: 255 }),
  responsibleEmail: varchar({ length: 255 }),
  
  // Trimestre/Período
  quarter: text(),
  year: integer().notNull(),
  
  // Prioridade e impacto
  priority: text().default('media').notNull(),
  impact: text().default('medio').notNull(),
  
  // Notas e observações
  notes: text(),
  
  // Auditoria
  createdById: integer(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("cppd_init_org_idx").on(table.organizationId),
  index("cppd_init_status_idx").on(table.status),
  index("cppd_init_year_idx").on(table.year),
  index("cppd_init_quarter_idx").on(table.quarter),
  index("cppd_init_responsible_idx").on(table.responsibleId),
]);

export type CppdInitiative = typeof cppdInitiatives.$inferSelect;
export type InsertCppdInitiative = typeof cppdInitiatives.$inferInsert;

// Tarefas das iniciativas CPPD
export const cppdInitiativeTasks = pgTable("cppd_initiative_tasks", {
  id: serial().primaryKey().primaryKey(),
  initiativeId: integer().notNull(),
  
  // Informações da tarefa
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  
  // Status
  status: text().default('pendente').notNull(),
  
  // Datas
  dueDate: timestamp({ mode: 'string' }),
  completedAt: timestamp({ mode: 'string' }),
  
  // Responsável
  assignedToId: integer(),
  assignedToName: varchar({ length: 255 }),
  
  // Ordem
  sortOrder: integer().default(0).notNull(),
  
  // Auditoria
  createdById: integer(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("cppd_task_initiative_idx").on(table.initiativeId),
  index("cppd_task_status_idx").on(table.status),
  index("cppd_task_assigned_idx").on(table.assignedToId),
]);

export type CppdInitiativeTask = typeof cppdInitiativeTasks.$inferSelect;
export type InsertCppdInitiativeTask = typeof cppdInitiativeTasks.$inferInsert;

// Documentos das iniciativas CPPD
export const cppdInitiativeDocuments = pgTable("cppd_initiative_documents", {
  id: serial().primaryKey().primaryKey(),
  initiativeId: integer().notNull(),
  
  // Documento do GED
  documentId: integer(),
  
  // Ou arquivo externo
  fileName: varchar({ length: 255 }),
  fileUrl: varchar({ length: 1024 }),
  fileType: varchar({ length: 100 }),
  fileSize: integer(),
  
  // Descrição
  description: text(),
  
  // Auditoria
  uploadedById: integer(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("cppd_doc_initiative_idx").on(table.initiativeId),
  index("cppd_doc_document_idx").on(table.documentId),
]);

export type CppdInitiativeDocument = typeof cppdInitiativeDocuments.$inferSelect;
export type InsertCppdInitiativeDocument = typeof cppdInitiativeDocuments.$inferInsert;

// Histórico de notificações de documentos atrasados
export const cppdOverdueNotifications = pgTable("cppd_overdue_notifications", {
  id: serial().primaryKey().primaryKey(),
  organizationId: integer().notNull(),
  
  // Tipo de item atrasado
  itemType: text().notNull(),
  itemId: integer().notNull(),
  itemTitle: varchar({ length: 255 }).notNull(),
  
  // Detalhes do atraso
  dueDate: timestamp({ mode: 'string' }).notNull(),
  daysOverdue: integer().notNull(),
  
  // Notificação
  notifiedUserId: integer(),
  notifiedEmail: varchar({ length: 255 }),
  notificationSentAt: timestamp({ mode: 'string' }),
  notificationStatus: text().default('pending').notNull(),
  
  // Auditoria
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("cppd_notif_org_idx").on(table.organizationId),
  index("cppd_notif_type_idx").on(table.itemType),
  index("cppd_notif_status_idx").on(table.notificationStatus),
]);

export type CppdOverdueNotification = typeof cppdOverdueNotifications.$inferSelect;
export type InsertCppdOverdueNotification = typeof cppdOverdueNotifications.$inferInsert;


// Tabela de tokens de compartilhamento de análises de contratos
export const contractShareTokens = pgTable("contract_share_tokens", {
  id: serial().primaryKey(),
  analysisId: integer().notNull(),
  token: varchar({ length: 64 }).notNull(),
  createdById: integer().notNull(),
  expiresAt: timestamp({ mode: 'string' }).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  viewCount: integer().default(0).notNull(),
  lastViewedAt: timestamp({ mode: 'string' }),
},
(table) => [
  index("contract_share_tokens_token_idx").on(table.token),
  index("contract_share_tokens_analysisId_idx").on(table.analysisId),
]);

export type ContractShareToken = typeof contractShareTokens.$inferSelect;
export type InsertContractShareToken = typeof contractShareTokens.$inferInsert;


// Tabela de aprovações de DPA (Acordo de Processamento de Dados)
export const dpaApprovals = pgTable("dpa_approvals", {
  id: serial().primaryKey().primaryKey(),
  analysisId: integer().notNull(),
  
  // Versão do DPA aprovado
  version: integer().default(1).notNull(),
  
  // Informações da aprovação
  approvalStatus: text().default('pending').notNull(),
  approvedById: integer(),
  approvedByName: varchar({ length: 255 }),
  approvedByEmail: varchar({ length: 255 }),
  approvedByRole: varchar({ length: 100 }), // Ex: "DPO", "Jurídico", "Diretor"
  approvalDate: timestamp({ mode: 'string' }),
  
  // Assinatura digital (hash ou referência)
  digitalSignature: text(),
  signatureMethod: text().default('manual'),
  ipAddress: varchar({ length: 45 }),
  userAgent: text(),
  
  // Comentários e observações
  comments: text(),
  rejectionReason: text(),
  
  // Cláusulas aprovadas (JSON com IDs das cláusulas)
  approvedClauses: json(),
  
  // Auditoria
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("dpa_approvals_analysisId_idx").on(table.analysisId),
  index("dpa_approvals_status_idx").on(table.approvalStatus),
]);
export type DpaApproval = typeof dpaApprovals.$inferSelect;
export type InsertDpaApproval = typeof dpaApprovals.$inferInsert;

// Tabela de solicitações de aprovação de DPA
export const dpaApprovalRequests = pgTable("dpa_approval_requests", {
  id: serial().primaryKey().primaryKey(),
  analysisId: integer().notNull(),
  
  // Quem solicitou
  requestedById: integer().notNull(),
  requestedByName: varchar({ length: 255 }),
  
  // Para quem foi solicitado
  approverEmail: varchar({ length: 255 }).notNull(),
  approverName: varchar({ length: 255 }),
  approverRole: varchar({ length: 100 }), // Ex: "DPO", "Jurídico", "Cliente"
  
  // Status da solicitação
  status: text().default('pending').notNull(),
  
  // Token de acesso único
  accessToken: varchar({ length: 64 }).notNull(),
  expiresAt: timestamp({ mode: 'string' }).notNull(),
  
  // Mensagem personalizada
  message: text(),
  
  // Rastreamento
  sentAt: timestamp({ mode: 'string' }),
  viewedAt: timestamp({ mode: 'string' }),
  respondedAt: timestamp({ mode: 'string' }),
  
  // Auditoria
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("dpa_approval_requests_analysisId_idx").on(table.analysisId),
  index("dpa_approval_requests_token_idx").on(table.accessToken),
  index("dpa_approval_requests_status_idx").on(table.status),
]);
export type DpaApprovalRequest = typeof dpaApprovalRequests.$inferSelect;
export type InsertDpaApprovalRequest = typeof dpaApprovalRequests.$inferInsert;


// Tabela de assinaturas digitais Gov.br
export const govbrDigitalSignatures = pgTable("govbr_digital_signatures", {
  id: serial().primaryKey().primaryKey(),
  
  // Referência ao documento/entidade sendo assinado
  entityType: text().notNull(),
  entityId: integer().notNull(),
  analysisId: integer(), // Referência à análise de contrato (se aplicável)
  
  // Informações do signatário
  signerUserId: integer(), // ID do usuário no sistema (se logado)
  signerCpf: varchar({ length: 14 }), // CPF do signatário
  signerName: varchar({ length: 255 }),
  signerEmail: varchar({ length: 255 }),
  signerGovbrLevel: text(), // Nível da conta gov.br
  
  // Status da assinatura
  status: text().default('pending').notNull(),
  
  // Dados do fluxo OAuth Gov.br
  govbrClientId: varchar({ length: 100 }),
  govbrState: varchar({ length: 100 }), // State para CSRF protection
  govbrNonce: varchar({ length: 100 }), // Nonce para replay protection
  govbrCode: text(), // Authorization code recebido
  govbrAccessToken: text(), // Access token para assinatura
  govbrTokenExpiresAt: timestamp({ mode: 'string' }),
  
  // Dados do documento
  documentHash: varchar({ length: 64 }), // SHA-256 do documento
  documentHashBase64: text(), // Hash em Base64 para envio à API
  documentUrl: text(), // URL do documento original
  
  // Dados da assinatura
  signatureType: text().default('pkcs7_detached'),
  signaturePkcs7: text(), // Assinatura PKCS#7 em Base64
  signedDocumentUrl: text(), // URL do documento assinado
  certificatePublic: text(), // Certificado público do signatário
  certificateType: text(), // Tipo de certificado usado
  
  // Metadados da assinatura
  signedAt: timestamp({ mode: 'string' }),
  validatedAt: timestamp({ mode: 'string' }),
  validationResult: json(), // Resultado da validação ITI
  
  // Rastreamento
  ipAddress: varchar({ length: 45 }),
  userAgent: text(),
  
  // Mensagens de erro
  errorCode: varchar({ length: 50 }),
  errorMessage: text(),
  
  // Auditoria
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("govbr_signatures_entity_idx").on(table.entityType, table.entityId),
  index("govbr_signatures_analysis_idx").on(table.analysisId),
  index("govbr_signatures_status_idx").on(table.status),
  index("govbr_signatures_signer_idx").on(table.signerCpf),
]);
export type GovbrDigitalSignature = typeof govbrDigitalSignatures.$inferSelect;
export type InsertGovbrDigitalSignature = typeof govbrDigitalSignatures.$inferInsert;

// Tabela de configuração da integração Gov.br
export const govbrIntegrationConfig = pgTable("govbr_integration_config", {
  id: serial().primaryKey().primaryKey(),
  
  // Ambiente
  environment: text().default('staging').notNull(),
  
  // Credenciais OAuth
  clientId: varchar({ length: 100 }),
  clientSecret: text(), // Criptografado
  
  // URLs configuradas
  redirectUri: text(),
  
  // Status
  isActive: boolean().default(false).notNull(),
  lastTestedAt: timestamp({ mode: 'string' }),
  testResult: text(),
  testErrorMessage: text(),
  
  // Auditoria
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedById: integer(),
});
export type GovbrIntegrationConfig = typeof govbrIntegrationConfig.$inferSelect;
export type InsertGovbrIntegrationConfig = typeof govbrIntegrationConfig.$inferInsert;

// Tabela de log de assinaturas (auditoria detalhada)
export const govbrSignatureAuditLog = pgTable("govbr_signature_audit_log", {
  id: serial().primaryKey().primaryKey(),
  signatureId: integer().notNull(),
  
  // Ação realizada
  action: text().notNull(),
  
  // Detalhes
  details: json(),
  errorMessage: text(),
  
  // Rastreamento
  ipAddress: varchar({ length: 45 }),
  userAgent: text(),
  
  // Auditoria
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("govbr_audit_signature_idx").on(table.signatureId),
  index("govbr_audit_action_idx").on(table.action),
]);
export type GovbrSignatureAuditLog = typeof govbrSignatureAuditLog.$inferSelect;
export type InsertGovbrSignatureAuditLog = typeof govbrSignatureAuditLog.$inferInsert;


// ============================================
// MOTOR DE MATURIDADE POR EVIDÊNCIAS
// ============================================

// Tabela central de eventos - todos os módulos registram eventos aqui
export const sdEvents = pgTable("sd_events", {
  id: serial().primaryKey().primaryKey(),
  eventId: varchar({ length: 36 }).notNull(), // UUID
  tenantId: integer().notNull(), // organizationId
  
  // Classificação do evento
  module: text().notNull(),
  eventType: text().notNull(),
  
  // Nível de risco
  riskLevel: text(),
  
  // Referências
  areaId: integer(), // Área organizacional
  entityId: integer(), // ID da entidade relacionada (contrato, terceiro, etc)
  entityType: varchar({ length: 50 }), // Tipo da entidade
  
  // Datas
  expectedDate: date({ mode: 'string' }), // Data prevista
  startDate: date({ mode: 'string' }), // Data de início
  endDate: date({ mode: 'string' }), // Data de conclusão
  
  // Status e conformidade
  status: text().default('programado').notNull(),
  conformity: text(),
  
  // Flags de planejamento e execução
  plannedFlag: boolean().default(true).notNull(), // Indica se era item planejado
  executedFlag: boolean().default(false).notNull(), // Indica se foi executado
  
  // Evidências
  evidenceLink: text(), // URL ou referência de evidência
  evidenceDocumentId: integer(), // Referência ao documento no GED
  
  // Responsável
  responsibleId: integer(),
  
  // Metadados adicionais
  metadata: json(),
  
  // Auditoria
  createdById: integer(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("sd_events_tenant_idx").on(table.tenantId),
  index("sd_events_module_idx").on(table.module),
  index("sd_events_event_type_idx").on(table.eventType),
  index("sd_events_status_idx").on(table.status),
  index("sd_events_risk_idx").on(table.riskLevel),
  index("sd_events_dates_idx").on(table.expectedDate, table.endDate),
]);
export type SdEvent = typeof sdEvents.$inferSelect;
export type InsertSdEvent = typeof sdEvents.$inferInsert;

// Tabela de áreas organizacionais
export const sdAreas = pgTable("sd_areas", {
  id: serial().primaryKey().primaryKey(),
  areaId: varchar({ length: 36 }).notNull(), // UUID
  tenantId: integer().notNull(), // organizationId
  areaName: varchar({ length: 255 }).notNull(),
  description: text(),
  parentAreaId: integer(), // Para hierarquia de áreas
  isActive: boolean().default(true).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("sd_areas_tenant_idx").on(table.tenantId),
]);
export type SdArea = typeof sdAreas.$inferSelect;
export type InsertSdArea = typeof sdAreas.$inferInsert;

// Tabela de estágio de maturidade por organização
export const sdMaturityStage = pgTable("sd_maturity_stage", {
  id: serial().primaryKey().primaryKey(),
  tenantId: integer().notNull().unique(), // organizationId
  currentStage: integer().default(1).notNull(), // Estágio atual (1-5)
  previousStage: integer(), // Estágio anterior
  lastUpdated: date({ mode: 'string' }),
  lastEvaluatedAt: timestamp({ mode: 'string' }),
  nextEvaluationAt: timestamp({ mode: 'string' }),
  suggestedPromotion: boolean().default(false), // Sugestão de promoção ativa
  promotionBlockedReason: text(), // Motivo do bloqueio de promoção
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("sd_maturity_tenant_idx").on(table.tenantId),
]);
export type SdMaturityStage = typeof sdMaturityStage.$inferSelect;
export type InsertSdMaturityStage = typeof sdMaturityStage.$inferInsert;

// Tabela de log de decisões de maturidade
export const sdMaturityDecisionLog = pgTable("sd_maturity_decision_log", {
  id: serial().primaryKey().primaryKey(),
  tenantId: integer().notNull(), // organizationId
  previousStage: integer().notNull(),
  newStage: integer().notNull(),
  decisionDate: timestamp({ mode: 'string' }).notNull(),
  approvedById: integer().notNull(),
  justification: text(),
  evidenceLinks: json(), // Array de links de evidências
  indicatorSnapshot: json(), // Snapshot dos indicadores no momento da decisão
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("sd_maturity_log_tenant_idx").on(table.tenantId),
  index("sd_maturity_log_date_idx").on(table.decisionDate),
]);
export type SdMaturityDecisionLog = typeof sdMaturityDecisionLog.$inferSelect;
export type InsertSdMaturityDecisionLog = typeof sdMaturityDecisionLog.$inferInsert;

// Tabela de configuração de indicadores
export const sdIndicatorConfig = pgTable("sd_indicator_config", {
  id: serial().primaryKey().primaryKey(),
  indicatorId: varchar({ length: 50 }).notNull().unique(),
  module: varchar({ length: 50 }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  formula: varchar({ length: 255 }).notNull(),
  cutoff: decimal({ precision: 5, scale: 2 }), // Valor de corte (ex: 0.85 = 85%)
  cutoffDays: integer(), // Para indicadores baseados em dias
  windowDays: integer().default(90), // Janela de análise em dias
  isActive: boolean().default(true).notNull(),
  weight: decimal({ precision: 3, scale: 2 }).default('1.00'), // Peso do indicador
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});
export type SdIndicatorConfig = typeof sdIndicatorConfig.$inferSelect;
export type InsertSdIndicatorConfig = typeof sdIndicatorConfig.$inferInsert;

// Tabela de histórico de cálculo de indicadores
export const sdIndicatorHistory = pgTable("sd_indicator_history", {
  id: serial().primaryKey().primaryKey(),
  tenantId: integer().notNull(),
  indicatorId: varchar({ length: 50 }).notNull(),
  calculatedValue: decimal({ precision: 5, scale: 4 }), // Valor calculado
  cutoff: decimal({ precision: 5, scale: 2 }), // Valor de corte usado
  passed: boolean(), // Se passou no corte
  windowStart: date({ mode: 'string' }),
  windowEnd: date({ mode: 'string' }),
  eventsCount: integer(), // Quantidade de eventos considerados
  metadata: json(), // Dados adicionais do cálculo
  calculatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("sd_indicator_history_tenant_idx").on(table.tenantId),
  index("sd_indicator_history_indicator_idx").on(table.indicatorId),
  index("sd_indicator_history_date_idx").on(table.calculatedAt),
]);
export type SdIndicatorHistory = typeof sdIndicatorHistory.$inferSelect;
export type InsertSdIndicatorHistory = typeof sdIndicatorHistory.$inferInsert;


// ============================================================
// MÓDULO DE INCIDENTES LGPD
// ============================================================

// Tabela principal de incidentes
export const incidents = pgTable("incidents", {
  id: serial().primaryKey().primaryKey(),
  organizationId: integer("organization_id").notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  status: text().default('active').notNull(),
  riskLevel: text("risk_level").default('medium').notNull(),
  
  // Timestamps
  detectedAt: timestamp("detected_at", { mode: 'string' }).notNull(),
  knowledgeAt: timestamp("knowledge_at", { mode: 'string' }).notNull(), // Data do conhecimento (para contagem ANPD)
  closedAt: timestamp("closed_at", { mode: 'string' }),
  
  // Progress
  currentPhaseId: integer("current_phase_id").default(1).notNull(),
  phases: json().notNull(), // Array de fases com checklist
  
  // Triage
  triageAnswers: json("triage_answers"), // Array de respostas da triagem
  triageResult: json("triage_result"), // Resultado da triagem (notificationRequired, anpdRequired, etc)
  
  // Deadlines
  deadlines: json(), // Array de prazos
  
  // Responsáveis
  assignedDpoId: integer("assigned_dpo_id"),
  assignedTeamIds: json("assigned_team_ids"), // Array de IDs de usuários
  
  // LGPD Specific
  affectedDataCategories: json("affected_data_categories"), // Array de categorias de dados afetados
  estimatedAffectedTitulars: integer("estimated_affected_titulars"),
  dataProcessorInvolved: boolean("data_processor_involved").default(false),
  
  // Communications
  anpdCommunicationId: varchar("anpd_communication_id", { length: 100 }),
  anpdCommunicationSentAt: timestamp("anpd_communication_sent_at", { mode: 'string' }),
  titularCommunicationSentAt: timestamp("titular_communication_sent_at", { mode: 'string' }),
  
  // Metadata
  tags: json(), // Array de tags
  externalReferences: json("external_references"), // Array de referências externas
  attachments: json(), // Array de URLs de anexos
  
  createdById: integer("created_by_id").notNull(),
  ticketId: integer("ticket_id"), // Vinculação com ticket do MeuDPO
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("incidents_organization_idx").on(table.organizationId),
  index("incidents_status_idx").on(table.status),
  index("incidents_knowledge_at_idx").on(table.knowledgeAt),
]);
export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = typeof incidents.$inferInsert;

// Tabela de logs de incidentes
export const incidentLogs = pgTable("incident_logs", {
  id: serial().primaryKey().primaryKey(),
  incidentId: integer("incident_id").notNull(),
  timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
  message: text().notNull(),
  type: text().default('action').notNull(),
  userId: integer("user_id"),
  userName: varchar("user_name", { length: 255 }),
  phaseId: integer("phase_id"),
  metadata: json(),
},
(table) => [
  index("incident_logs_incident_idx").on(table.incidentId),
]);
export type IncidentLog = typeof incidentLogs.$inferSelect;
export type InsertIncidentLog = typeof incidentLogs.$inferInsert;

// Tabela de contatos de emergência
export const incidentEmergencyContacts = pgTable("incident_emergency_contacts", {
  id: serial().primaryKey().primaryKey(),
  organizationId: integer("organization_id").notNull(),
  role: varchar({ length: 100 }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull(),
  phone: varchar({ length: 50 }).notNull(),
  priority: integer().default(1).notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("incident_contacts_organization_idx").on(table.organizationId),
]);
export type IncidentEmergencyContact = typeof incidentEmergencyContacts.$inferSelect;
export type InsertIncidentEmergencyContact = typeof incidentEmergencyContacts.$inferInsert;


// ============================================
// CATÁLOGO DE SERVIÇOS CSC - MeuDPO
// ============================================

// Tabela de Blocos de Serviços (categorias)
export const serviceCatalogBlocks = pgTable("service_catalog_blocks", {
  id: serial().primaryKey().primaryKey(),
  code: varchar({ length: 10 }).notNull(), // TS, DT, GI, GC, CT, PS
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  color: varchar({ length: 7 }).notNull(), // Cor hex
  icon: varchar({ length: 50 }), // Nome do ícone
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("service_blocks_code_idx").on(table.code),
]);
export type ServiceCatalogBlock = typeof serviceCatalogBlocks.$inferSelect;
export type InsertServiceCatalogBlock = typeof serviceCatalogBlocks.$inferInsert;

// Tabela de Serviços do Catálogo
export const serviceCatalogItems = pgTable("service_catalog_items", {
  id: serial().primaryKey().primaryKey(),
  blockId: integer("block_id").notNull(),
  code: varchar({ length: 20 }).notNull(), // TS-01, DT-01, etc.
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  slaHours: integer("sla_hours").notNull(), // SLA em horas úteis
  legalDeadlineDays: integer("legal_deadline_days"), // Prazo legal em dias (quando aplicável)
  deliverable: varchar({ length: 255 }), // Tipo de entrega (Relatório, Documento, etc.)
  priority: text().default('media').notNull(),
  requiresApproval: boolean("requires_approval").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  metadata: json(), // Dados adicionais específicos do serviço
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("service_items_block_idx").on(table.blockId),
  index("service_items_code_idx").on(table.code),
]);
export type ServiceCatalogItem = typeof serviceCatalogItems.$inferSelect;
export type InsertServiceCatalogItem = typeof serviceCatalogItems.$inferInsert;

// Tabela de SLAs por Organização (customização)
export const organizationServiceSlas = pgTable("organization_service_slas", {
  id: serial().primaryKey().primaryKey(),
  organizationId: integer("organization_id").notNull(),
  serviceItemId: integer("service_item_id").notNull(),
  customSlaHours: integer("custom_sla_hours"), // SLA customizado para a organização
  customLegalDeadlineDays: integer("custom_legal_deadline_days"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  notes: text(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("org_service_slas_org_idx").on(table.organizationId),
  index("org_service_slas_service_idx").on(table.serviceItemId),
]);
export type OrganizationServiceSla = typeof organizationServiceSlas.$inferSelect;
export type InsertOrganizationServiceSla = typeof organizationServiceSlas.$inferInsert;


// ==================== PREFERÊNCIAS DE USUÁRIO ====================

// Preferências de notificação e configurações do usuário
export const userPreferences = pgTable("user_preferences", {
  id: serial().primaryKey(),
  userId: integer().notNull().unique(),
  
  // Preferências de notificação
  emailNotifications: boolean().default(true).notNull(),
  pushNotifications: boolean().default(true).notNull(),
  notifyAvaliacoes: boolean().default(true).notNull(),
  notifyTickets: boolean().default(true).notNull(),
  notifyReunioes: boolean().default(true).notNull(),
  
  // Preferências de toast de organização
  showAutoSelectToast: boolean().default(true).notNull(),
  showManualSelectToast: boolean().default(true).notNull(),
  showClearSelectToast: boolean().default(true).notNull(),
  
  // Preferências de interface
  theme: text().default('system').notNull(),
  language: varchar({ length: 10 }).default('pt-BR').notNull(),
  
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("user_prefs_user_idx").on(table.userId),
]);

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;


// GED Types
export type GedFolder = typeof gedFolders.$inferSelect;
export type InsertGedFolder = typeof gedFolders.$inferInsert;
export type GedDocument = typeof gedDocuments.$inferSelect;
export type InsertGedDocument = typeof gedDocuments.$inferInsert;
export type InsertGedPermission = typeof gedPermissions.$inferInsert;
export type InsertGedAccessLog = typeof gedAccessLogs.$inferInsert;


// Histórico de Notificações
export const notificationHistory = pgTable("notification_history", {
  id: serial().primaryKey(),
  organizationId: integer(),
  userId: integer(),
  type: text().notNull(),
  title: varchar({ length: 255 }).notNull(),
  content: text().notNull(),
  channel: text().default('app').notNull(),
  status: text().default('pending').notNull(),
  metadata: json(),
  errorMessage: text(),
  sentAt: timestamp({ mode: 'string' }),
  readAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("notification_history_org_idx").on(table.organizationId),
  index("notification_history_user_idx").on(table.userId),
  index("notification_history_type_idx").on(table.type),
  index("notification_history_status_idx").on(table.status),
]);
export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = typeof notificationHistory.$inferInsert;


// ============================================
// SISTEMA DE COMENTÁRIOS E ANOTAÇÕES EM CLÁUSULAS
// ============================================

// Tabela de comentários por cláusula
export const clauseComments = pgTable("clause_comments", {
  id: serial().primaryKey().primaryKey(),
  
  // Referência à cláusula
  analysisId: integer().notNull(), // ID da análise de contrato
  clauseId: varchar({ length: 50 }).notNull(), // ID da cláusula (ex: "clause_1")
  
  // Autor do comentário
  authorId: integer().notNull(),
  authorRole: text().notNull(),
  
  // Conteúdo
  content: text().notNull(),
  
  // Thread de respostas
  parentCommentId: integer(), // Se for resposta, referencia o comentário pai
  
  // Menções de usuários
  mentions: json(), // Array de IDs de usuários mencionados
  
  // Status
  isResolved: boolean().default(false).notNull(),
  resolvedById: integer(),
  resolvedAt: timestamp({ mode: 'string' }),
  
  // Edição
  isEdited: boolean().default(false).notNull(),
  editedAt: timestamp({ mode: 'string' }),
  
  // Soft delete
  isDeleted: boolean().default(false).notNull(),
  deletedAt: timestamp({ mode: 'string' }),
  deletedById: integer(),
  
  // Auditoria
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("clause_comments_analysis_idx").on(table.analysisId),
  index("clause_comments_clause_idx").on(table.clauseId),
  index("clause_comments_author_idx").on(table.authorId),
  index("clause_comments_parent_idx").on(table.parentCommentId),
  index("clause_comments_resolved_idx").on(table.isResolved),
]);
export type ClauseComment = typeof clauseComments.$inferSelect;
export type InsertClauseComment = typeof clauseComments.$inferInsert;

// Tabela de anotações destacadas no texto
export const clauseAnnotations = pgTable("clause_annotations", {
  id: serial().primaryKey().primaryKey(),
  
  // Referência à cláusula
  analysisId: integer().notNull(),
  clauseId: varchar({ length: 50 }).notNull(),
  
  // Autor da anotação
  authorId: integer().notNull(),
  authorRole: text().notNull(),
  
  // Seleção de texto
  selectedText: text().notNull(), // Texto selecionado
  startOffset: integer().notNull(), // Posição inicial no texto
  endOffset: integer().notNull(), // Posição final no texto
  
  // Conteúdo da anotação
  content: text().notNull(),
  
  // Cor/tipo da anotação
  highlightColor: text().default('yellow').notNull(),
  annotationType: text().default('note').notNull(),
  
  // Status
  isResolved: boolean().default(false).notNull(),
  resolvedById: integer(),
  resolvedAt: timestamp({ mode: 'string' }),
  
  // Soft delete
  isDeleted: boolean().default(false).notNull(),
  deletedAt: timestamp({ mode: 'string' }),
  
  // Auditoria
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("clause_annotations_analysis_idx").on(table.analysisId),
  index("clause_annotations_clause_idx").on(table.clauseId),
  index("clause_annotations_author_idx").on(table.authorId),
  index("clause_annotations_type_idx").on(table.annotationType),
]);
export type ClauseAnnotation = typeof clauseAnnotations.$inferSelect;
export type InsertClauseAnnotation = typeof clauseAnnotations.$inferInsert;

// Tabela de notificações de comentários
export const commentNotifications = pgTable("comment_notifications", {
  id: serial().primaryKey().primaryKey(),
  
  // Usuário que receberá a notificação
  userId: integer().notNull(),
  
  // Tipo de notificação
  notificationType: text().notNull(),
  
  // Referência ao comentário/anotação
  commentId: integer(),
  annotationId: integer(),
  
  // Contexto
  analysisId: integer().notNull(),
  clauseId: varchar({ length: 50 }).notNull(),
  
  // Autor da ação
  triggeredById: integer().notNull(),
  
  // Status
  isRead: boolean().default(false).notNull(),
  readAt: timestamp({ mode: 'string' }),
  
  // Auditoria
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("comment_notif_user_idx").on(table.userId),
  index("comment_notif_read_idx").on(table.isRead),
  index("comment_notif_analysis_idx").on(table.analysisId),
]);
export type CommentNotification = typeof commentNotifications.$inferSelect;
export type InsertCommentNotification = typeof commentNotifications.$inferInsert;


// ============================================
// MÓDULO DPIA - Data Protection Impact Assessment
// ============================================

// Tabela principal de avaliações DPIA
export const dpiaAssessments = pgTable("dpia_assessments", {
  id: serial().primaryKey().primaryKey(),
  
  // Organização e contexto
  organizationId: integer().notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  
  // Origem do DPIA
  sourceType: text().default('manual').notNull(),
  sourceId: integer(), // ID do mapeamento, contrato ou incidente de origem
  
  // Classificação de risco
  riskLevel: text().default('moderado').notNull(),
  overallScore: integer().default(0), // Pontuação geral 0-100
  
  // Status do DPIA
  status: text().default('draft').notNull(),
  
  // Responsáveis
  dpoId: integer(), // DPO responsável
  createdById: integer().notNull(),
  reviewedById: integer(),
  approvedById: integer(),
  
  // Datas
  reviewedAt: timestamp({ mode: 'string' }),
  approvedAt: timestamp({ mode: 'string' }),
  nextReviewDate: timestamp({ mode: 'string' }),
  
  // Metadados
  metadata: json(),
  
  // PATCH-2: Campos de Workflow e PDF
  workflowStatus: text().default('draft'),
  version: integer().default(1).notNull(),
  
  // PATCH-2: IDs dos documentos PDF no GED
  finalPdfGedId: integer(), // PDF completo
  simplifiedPdfGedId: integer(), // PDF simplificado
  anpdPackageGedId: integer(), // Pacote ANPD (ZIP)
  
  // Auditoria
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("dpia_org_idx").on(table.organizationId),
  index("dpia_status_idx").on(table.status),
  index("dpia_risk_idx").on(table.riskLevel),
  index("dpia_source_idx").on(table.sourceType, table.sourceId),
  index("dpia_workflow_idx").on(table.workflowStatus),
]);
export type DpiaAssessment = typeof dpiaAssessments.$inferSelect;
export type InsertDpiaAssessment = typeof dpiaAssessments.$inferInsert;

// Perguntas do questionário DPIA (template)
export const dpiaQuestions = pgTable("dpia_questions", {
  id: serial().primaryKey().primaryKey(),
  
  // Categoria da pergunta
  category: text().notNull(),
  
  // Conteúdo
  questionText: text().notNull(),
  helpText: text(),
  
  // Configuração
  questionType: text().default('text').notNull(),
  options: json(), // Opções para select/multiselect
  
  // Peso para cálculo de risco
  riskWeight: integer().default(1),
  
  // Ordem de exibição
  displayOrder: integer().default(0),
  
  // Status
  isActive: boolean().default(true).notNull(),
  isRequired: boolean().default(true).notNull(),
  
  // Referência legal
  legalReference: varchar({ length: 255 }), // Ex: "Art. 38, LGPD"
  
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("dpia_questions_category_idx").on(table.category),
  index("dpia_questions_order_idx").on(table.displayOrder),
]);
export type DpiaQuestion = typeof dpiaQuestions.$inferSelect;
export type InsertDpiaQuestion = typeof dpiaQuestions.$inferInsert;

// Respostas do questionário DPIA
export const dpiaResponses = pgTable("dpia_responses", {
  id: serial().primaryKey().primaryKey(),
  
  dpiaId: integer().notNull(),
  questionId: integer().notNull(),
  
  // Resposta
  responseText: text(),
  responseValue: varchar({ length: 255 }), // Para respostas de escala/select
  responseJson: json(), // Para multiselect
  
  // Avaliação de risco da resposta
  riskScore: integer().default(0), // 0-10
  
  // Comentários
  notes: text(),
  
  // Autor
  answeredById: integer().notNull(),
  
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("dpia_responses_dpia_idx").on(table.dpiaId),
  index("dpia_responses_question_idx").on(table.questionId),
]);
export type DpiaResponse = typeof dpiaResponses.$inferSelect;
export type InsertDpiaResponse = typeof dpiaResponses.$inferInsert;

// Riscos identificados no DPIA
export const dpiaRisks = pgTable("dpia_risks", {
  id: serial().primaryKey().primaryKey(),
  
  dpiaId: integer().notNull(),
  
  // Descrição do risco
  title: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  
  // Classificação
  riskCategory: text().notNull(),
  
  // Avaliação de risco
  likelihood: text().default('media').notNull(),
  impact: text().default('medio').notNull(),
  riskLevel: text().default('moderado').notNull(),
  riskScore: integer().default(0), // Calculado: likelihood * impact
  
  // Status
  status: text().default('identificado').notNull(),
  
  // Referência legal
  legalReference: varchar({ length: 255 }),
  
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("dpia_risks_dpia_idx").on(table.dpiaId),
  index("dpia_risks_level_idx").on(table.riskLevel),
  index("dpia_risks_status_idx").on(table.status),
]);
export type DpiaRisk = typeof dpiaRisks.$inferSelect;
export type InsertDpiaRisk = typeof dpiaRisks.$inferInsert;

// Medidas de mitigação para riscos do DPIA
export const dpiaMitigations = pgTable("dpia_mitigations", {
  id: serial().primaryKey().primaryKey(),
  
  dpiaId: integer().notNull(),
  riskId: integer().notNull(),
  
  // Descrição da medida
  title: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  
  // Tipo de medida
  mitigationType: text().notNull(),
  
  // Status
  status: text().default('planejada').notNull(),
  
  // Responsável e prazo
  responsibleId: integer(),
  dueDate: timestamp({ mode: 'string' }),
  completedAt: timestamp({ mode: 'string' }),
  
  // Eficácia
  effectivenessRating: text(),
  
  // Vinculação com plano de ação
  actionPlanId: integer(),
  
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("dpia_mitigations_dpia_idx").on(table.dpiaId),
  index("dpia_mitigations_risk_idx").on(table.riskId),
  index("dpia_mitigations_status_idx").on(table.status),
]);
export type DpiaMitigation = typeof dpiaMitigations.$inferSelect;
export type InsertDpiaMitigation = typeof dpiaMitigations.$inferInsert;

// ============================================
// SISTEMA DE REVISÃO PERIÓDICA DE MAPEAMENTOS
// ============================================

// Configuração de revisão por organização
export const mapeamentoReviewConfig = pgTable("mapeamento_review_config", {
  id: serial().primaryKey().primaryKey(),
  
  organizationId: integer().notNull(),
  
  // Periodicidade (em dias)
  reviewPeriodDays: integer().default(365).notNull(), // Padrão: anual
  
  // Alertas
  alertDaysBefore: integer().default(30), // Dias antes do vencimento para alertar
  sendEmailAlerts: boolean().default(true).notNull(),
  
  // Responsável padrão
  defaultReviewerId: integer(),
  
  // Status
  isActive: boolean().default(true).notNull(),
  
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("review_config_org_idx").on(table.organizationId),
]);
export type MapeamentoReviewConfig = typeof mapeamentoReviewConfig.$inferSelect;
export type InsertMapeamentoReviewConfig = typeof mapeamentoReviewConfig.$inferInsert;

// Agendamento de revisões
export const mapeamentoReviewSchedule = pgTable("mapeamento_review_schedule", {
  id: serial().primaryKey().primaryKey(),
  
  organizationId: integer().notNull(),
  
  // Referência ao mapeamento (ROT ou processo)
  mapeamentoType: text().notNull(),
  mapeamentoId: integer().notNull(),
  
  // Datas
  lastReviewDate: timestamp({ mode: 'string' }),
  nextReviewDate: timestamp({ mode: 'string' }).notNull(),
  
  // Status
  status: text().default('scheduled').notNull(),
  
  // Responsável
  reviewerId: integer(),
  
  // Notificações enviadas
  alertsSent: integer().default(0),
  lastAlertSentAt: timestamp({ mode: 'string' }),
  
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("review_schedule_org_idx").on(table.organizationId),
  index("review_schedule_type_idx").on(table.mapeamentoType, table.mapeamentoId),
  index("review_schedule_next_idx").on(table.nextReviewDate),
  index("review_schedule_status_idx").on(table.status),
]);
export type MapeamentoReviewSchedule = typeof mapeamentoReviewSchedule.$inferSelect;
export type InsertMapeamentoReviewSchedule = typeof mapeamentoReviewSchedule.$inferInsert;

// Histórico de revisões
export const mapeamentoReviewHistory = pgTable("mapeamento_review_history", {
  id: serial().primaryKey().primaryKey(),
  
  scheduleId: integer().notNull(),
  organizationId: integer().notNull(),
  
  // Referência ao mapeamento
  mapeamentoType: text().notNull(),
  mapeamentoId: integer().notNull(),
  
  // Revisão
  reviewedById: integer().notNull(),
  reviewedAt: timestamp({ mode: 'string' }).notNull(),
  
  // Resultado
  reviewResult: text().notNull(),
  
  // Notas e alterações
  notes: text(),
  changesDescription: text(),
  
  // Snapshot do estado anterior (para auditoria)
  previousState: json(),
  
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("review_history_schedule_idx").on(table.scheduleId),
  index("review_history_org_idx").on(table.organizationId),
  index("review_history_type_idx").on(table.mapeamentoType, table.mapeamentoId),
]);
export type MapeamentoReviewHistory = typeof mapeamentoReviewHistory.$inferSelect;
export type InsertMapeamentoReviewHistory = typeof mapeamentoReviewHistory.$inferInsert;


// ============================================================================
// FRAMEWORK-SPECIFIC QUESTIONS - Questões Específicas por Framework
// ============================================================================

// Domínios de Conformidade por Framework
export const complianceDomains = pgTable("compliance_domains", {
  id: serial().primaryKey().primaryKey(),
  
  // Identificação
  framework: text().notNull(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  color: varchar({ length: 7 }), // Cor em hex (ex: #7c3aed)
  icon: varchar({ length: 50 }), // Ícone emoji ou nome
  
  // Ordenação
  order: integer().default(0).notNull(),
  
  // Auditoria
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("compliance_domains_framework_idx").on(table.framework),
  index("compliance_domains_order_idx").on(table.order),
]);
export type ComplianceDomain = typeof complianceDomains.$inferSelect;
export type InsertComplianceDomain = typeof complianceDomains.$inferInsert;

// Questões de Conformidade Específicas por Framework
export const complianceQuestions = pgTable("compliance_questions", {
  id: serial().primaryKey().primaryKey(),
  
  // Identificação
  framework: text().notNull(),
  domainId: integer().notNull(),
  
  // Conteúdo da Questão
  questionText: text().notNull(),
  
  // Opções de Resposta (4 níveis de maturidade)
  option1Text: text().notNull(),
  option1Evidence: text(), // Evidência necessária para opção 1
  
  option2Text: text().notNull(),
  option2Evidence: text(),
  
  option3Text: text().notNull(),
  option3Evidence: text(),
  
  option4Text: text().notNull(),
  option4Evidence: text(),
  
  // Ordenação
  order: integer().default(0).notNull(),
  
  // Auditoria
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("compliance_questions_framework_idx").on(table.framework),
  index("compliance_questions_domain_idx").on(table.domainId),
  index("compliance_questions_order_idx").on(table.order),
]);
export type ComplianceQuestion = typeof complianceQuestions.$inferSelect;
export type InsertComplianceQuestion = typeof complianceQuestions.$inferInsert;

// Respostas Específicas por Framework (estendendo complianceResponses)
export const complianceFrameworkResponses = pgTable("compliance_framework_responses", {
  id: serial().primaryKey().primaryKey(),
  
  // Referências
  assessmentId: integer().notNull(),
  questionId: integer().notNull(),
  
  // Resposta
  selectedOption: integer().notNull(), // 1, 2, 3 ou 4
  notes: text(),
  evidenceUrls: json(), // Array de URLs de evidências
  
  // Auditoria
  respondedById: integer(),
  respondedAt: timestamp({ mode: 'string' }),
  
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("compliance_framework_responses_assessment_idx").on(table.assessmentId),
  index("compliance_framework_responses_question_idx").on(table.questionId),
]);
export type ComplianceFrameworkResponse = typeof complianceFrameworkResponses.$inferSelect;
export type InsertComplianceFrameworkResponse = typeof complianceFrameworkResponses.$inferInsert;


// ==================== FRAMEWORK SEUSDADOS - MATURIDADE LGPD ====================

// Domínios do Framework SeusDados
export const seusdadosDomains = pgTable("seusdados_domains", {
  id: serial().primaryKey().primaryKey(),
  code: varchar({ length: 50 }).notNull().unique(),
  label: varchar({ length: 255 }).notNull(),
  weight: decimal({ precision: 3, scale: 2 }).default('1.00').notNull(),
  order: integer().default(0).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("seusdados_domains_code_idx").on(table.code),
  index("seusdados_domains_order_idx").on(table.order),
]);
export type SeusdadosDomain = typeof seusdadosDomains.$inferSelect;
export type InsertSeusdadosDomain = typeof seusdadosDomains.$inferInsert;

// Perguntas do Framework SeusDados
export const seusdadosQuestions = pgTable("seusdados_questions", {
  id: serial().primaryKey().primaryKey(),
  code: varchar({ length: 20 }).notNull().unique(),
  domainCode: varchar({ length: 50 }).notNull(),
  idx: integer().notNull(),
  prompt: text().notNull(),
  frameworkTags: json().$type<string[]>().default([]).notNull(),
  frameworkMetadata: json().$type<{
    iso?: { family: string[]; topics: string[] };
    nist_privacy?: { functions: string[]; categories: string[] };
    lgpd?: { topics: string[] };
    ia?: { topics: string[] };
  }>().default({}).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("seusdados_questions_code_idx").on(table.code),
  index("seusdados_questions_domain_idx").on(table.domainCode),
]);
export type SeusdadosQuestion = typeof seusdadosQuestions.$inferSelect;
export type InsertSeusdadosQuestion = typeof seusdadosQuestions.$inferInsert;

// Opções de Resposta do Framework SeusDados (5 níveis)
export const seusdadosOptions = pgTable("seusdados_options", {
  id: serial().primaryKey().primaryKey(),
  questionCode: varchar({ length: 20 }).notNull(),
  optionCode: varchar({ length: 20 }).notNull(),
  level: integer().notNull(), // 1-5
  label: text().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("seusdados_options_question_idx").on(table.questionCode),
  index("seusdados_options_level_idx").on(table.level),
]);
export type SeusdadosOption = typeof seusdadosOptions.$inferSelect;
export type InsertSeusdadosOption = typeof seusdadosOptions.$inferInsert;

// Avaliações do Framework SeusDados
export const seusdadosAssessments = pgTable("seusdados_assessments", {
  id: serial().primaryKey().primaryKey(),
  organizationId: integer().notNull(),
  createdById: integer().notNull(),
  title: varchar({ length: 255 }).notNull(),
  status: text().default('rascunho').notNull(),
  
  // Scores calculados
  overallScoreAvg: decimal({ precision: 5, scale: 2 }),
  overallLevelRounded: integer(),
  totalQuestions: integer().default(39),
  answeredQuestions: integer().default(0),
  
  // Timestamps
  completedAt: timestamp({ mode: 'string' }),
  notes: text(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("seusdados_assessments_org_idx").on(table.organizationId),
  index("seusdados_assessments_status_idx").on(table.status),
]);
export type SeusdadosAssessment = typeof seusdadosAssessments.$inferSelect;
export type InsertSeusdadosAssessment = typeof seusdadosAssessments.$inferInsert;

// Respostas do Framework SeusDados
export const seusdadosAnswers = pgTable("seusdados_answers", {
  id: serial().primaryKey().primaryKey(),
  assessmentId: integer().notNull(),
  questionCode: varchar({ length: 20 }).notNull(),
  selectedOptionCode: varchar({ length: 20 }).notNull(),
  selectedLevel: integer().notNull(), // 1-5
  observations: text(),
  evidence: json().$type<{ links?: string[]; files?: string[]; metadata?: Record<string, unknown> }>().default({}).notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("seusdados_answers_assessment_idx").on(table.assessmentId),
  index("seusdados_answers_question_idx").on(table.questionCode),
]);
export type SeusdadosAnswer = typeof seusdadosAnswers.$inferSelect;
export type InsertSeusdadosAnswer = typeof seusdadosAnswers.$inferInsert;

// Scores por Domínio do Framework SeusDados
export const seusdadosDomainScores = pgTable("seusdados_domain_scores", {
  id: serial().primaryKey().primaryKey(),
  assessmentId: integer().notNull(),
  domainCode: varchar({ length: 50 }).notNull(),
  scoreAvg: decimal({ precision: 5, scale: 2 }).notNull(),
  levelRounded: integer().notNull(),
  answeredQuestions: integer().notNull(),
  totalQuestions: integer().notNull(),
  distribution: json().$type<{ l1: number; l2: number; l3: number; l4: number; l5: number }>().default({ l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 }).notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("seusdados_domain_scores_assessment_idx").on(table.assessmentId),
  index("seusdados_domain_scores_domain_idx").on(table.domainCode),
]);
export type SeusdadosDomainScore = typeof seusdadosDomainScores.$inferSelect;
export type InsertSeusdadosDomainScore = typeof seusdadosDomainScores.$inferInsert;


// ============================================
// MÓDULO PA ANPD - Gestão de Incidentes e Processos Administrativos
// ============================================

// Incidentes de Segurança (PAISI)
export const irIncidents = pgTable("ir_incidents", {
  id: varchar({ length: 36 }).primaryKey().notNull(),
  organizationId: integer().notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  incidentType: varchar({ length: 100 }),
  severity: text(),
  discoveryDate: timestamp({ mode: 'string' }),
  reportedBy: integer(),
  stage: integer().default(0).notNull(),
  status: text().default('aberto').notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("ir_incidents_organization_idx").on(table.organizationId),
  index("ir_incidents_status_idx").on(table.status),
]);

// Casos Administrativos (ANPD-PA)
export const irCases = pgTable("ir_cases", {
  id: varchar({ length: 36 }).primaryKey().notNull(),
  incidentId: varchar({ length: 36 }).notNull(),
  caseNumber: varchar({ length: 50 }).notNull().unique(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  status: text().default('aberto').notNull(),
  cisStatus: text().default('nao_iniciado').notNull(),
  cisInitialDeadline: timestamp({ mode: 'string' }),
  cisFinalDeadline: timestamp({ mode: 'string' }),
  doubleDeadlineApplied: boolean().default(false).notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("ir_cases_incident_idx").on(table.incidentId),
  index("ir_cases_status_idx").on(table.status),
  index("ir_cases_cisStatus_idx").on(table.cisStatus),
]);

// Atos Processuais
export const irActs = pgTable("ir_acts", {
  id: varchar({ length: 36 }).primaryKey().notNull(),
  caseId: varchar({ length: 36 }).notNull(),
  actType: varchar({ length: 100 }).notNull(),
  description: text().notNull(),
  actDate: timestamp({ mode: 'string' }).notNull(),
  recordedBy: integer(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("ir_acts_case_idx").on(table.caseId),
  index("ir_acts_actDate_idx").on(table.actDate),
]);

// Prazos
export const irDeadlines = pgTable("ir_deadlines", {
  id: varchar({ length: 36 }).primaryKey().notNull(),
  caseId: varchar({ length: 36 }).notNull(),
  category: varchar({ length: 50 }).notNull(),
  dueDate: timestamp({ mode: 'string' }).notNull(),
  status: text().default('pendente').notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("ir_deadlines_case_idx").on(table.caseId),
  index("ir_deadlines_dueDate_idx").on(table.dueDate),
  index("ir_deadlines_status_idx").on(table.status),
]);

// Termo de Ajustamento de Conduta (TAC)
export const irTacs = pgTable("ir_tacs", {
  id: varchar({ length: 36 }).primaryKey().notNull(),
  caseId: varchar({ length: 36 }).notNull().unique(),
  obligations: text(),
  deadline: timestamp({ mode: 'string' }),
  terms: text(),
  status: text().default('pendente'),
  signedAt: timestamp({ mode: 'string' }),
  fulfilledAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("ir_tacs_case_idx").on(table.caseId),
]);

// Sanções
export const irSanctions = pgTable("ir_sanctions", {
  id: varchar({ length: 36 }).primaryKey().notNull(),
  caseId: varchar({ length: 36 }).notNull().unique(),
  gravity: varchar({ length: 50 }),
  damageLevel: varchar({ length: 50 }),
  sanctionType: varchar({ length: 100 }),
  fineAmount: decimal({ precision: 15, scale: 2 }),
  appliedAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("ir_sanctions_case_idx").on(table.caseId),
]);

// CIS (Comunicado de Investigação Sumária)
export const irCisDocuments = pgTable("ir_cis_documents", {
  id: varchar({ length: 36 }).primaryKey().notNull(),
  caseId: varchar({ length: 36 }).notNull().unique(),
  content: json(),
  status: text().default('rascunho').notNull(),
  generatedAt: timestamp({ mode: 'string' }),
  submittedAt: timestamp({ mode: 'string' }),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("ir_cis_documents_case_idx").on(table.caseId),
  index("ir_cis_documents_status_idx").on(table.status),
]);

// CIS - Histórico de versões (imutável)
export const irCisDocumentVersions = pgTable("ir_cis_document_versions", {
  id: varchar({ length: 36 }).primaryKey().notNull(),
  caseId: varchar({ length: 36 }).notNull(),
  versionStatus: text().default('rascunho').notNull(),
  content: text(),
  affectedDataTypes: text(),
  affectedIndividuals: varchar({ length: 50 }),
  riskAssessment: text(),
  mitigationMeasures: text(),
  aiDraft: text(),
  createdBy: integer(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("ir_cis_doc_versions_case_idx").on(table.caseId),
  index("ir_cis_doc_versions_status_idx").on(table.versionStatus),
  index("ir_cis_doc_versions_createdAt_idx").on(table.createdAt),
]);

// Evidências (integração com Custódia Digital)
export const irEvidences = pgTable("ir_evidences", {
  id: varchar({ length: 36 }).primaryKey().notNull(),
  caseId: varchar({ length: 36 }).notNull(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  documentId: integer(),
  storageUrl: varchar({ length: 500 }),
  status: text().default('pendente').notNull(),
  collectedAt: timestamp({ mode: 'string' }),
  collectedBy: integer(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("ir_evidences_case_idx").on(table.caseId),
  index("ir_evidences_status_idx").on(table.status),
]);

// Type exports para TypeScript
export type IrIncident = typeof irIncidents.$inferSelect;
export type InsertIrIncident = typeof irIncidents.$inferInsert;

export type IrCase = typeof irCases.$inferSelect;
export type InsertIrCase = typeof irCases.$inferInsert;

export type IrAct = typeof irActs.$inferSelect;
export type InsertIrAct = typeof irActs.$inferInsert;

export type IrDeadline = typeof irDeadlines.$inferSelect;
export type InsertIrDeadline = typeof irDeadlines.$inferInsert;

export type IrTac = typeof irTacs.$inferSelect;
export type InsertIrTac = typeof irTacs.$inferInsert;

export type IrSanction = typeof irSanctions.$inferSelect;
export type InsertIrSanction = typeof irSanctions.$inferInsert;

export type IrCisDocument = typeof irCisDocuments.$inferSelect;
export type InsertIrCisDocument = typeof irCisDocuments.$inferInsert;

export type IrCisDocumentVersion = typeof irCisDocumentVersions.$inferSelect;
export type InsertIrCisDocumentVersion = typeof irCisDocumentVersions.$inferInsert;

export type IrEvidence = typeof irEvidences.$inferSelect;
export type InsertIrEvidence = typeof irEvidences.$inferInsert;


// ============================================
// SISTEMA UNIFICADO DE AVALIAÇÕES
// ============================================

// Avaliações Unificadas (Conformidade LGPD + Framework Seusdados)
export const unifiedAssessments = pgTable("ua_assessments", {
	id: serial().primaryKey().primaryKey(),
	organizationId: integer().notNull(),
	assessmentCode: varchar({ length: 20 }).notNull().unique(), // AC#100000ABC format
	framework: text().default('seusdados').notNull(),
	status: text().default('programada').notNull(),
	deadline: timestamp({ mode: 'string' }).notNull(),
	defaultDeadlineDays: integer().default(15).notNull(),
	createdById: integer().notNull(), // Consultor Seusdados
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("unified_assessments_org_idx").on(table.organizationId),
	index("unified_assessments_code_idx").on(table.assessmentCode),
	index("unified_assessments_status_idx").on(table.status),
]);

// Atribuições de Domínios a Usuários
export const assessmentAssignments = pgTable("ua_assignments", {
	id: serial().primaryKey().primaryKey(),
	assessmentId: integer().notNull(),
	domainId: varchar({ length: 20 }).notNull(), // IA-01, IA-02, etc
	domainName: varchar({ length: 255 }).notNull(),
	assignedToUserId: integer().notNull(), // Usuário cliente que responderá
	assignedToName: varchar({ length: 255 }).notNull(),
	assignedToEmail: varchar({ length: 255 }).notNull(),
	status: text().default('pendente').notNull(),
	deadline: timestamp({ mode: 'string' }).notNull(),
	startedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("assessment_assignments_assessment_idx").on(table.assessmentId),
	index("assessment_assignments_user_idx").on(table.assignedToUserId),
	index("assessment_assignments_status_idx").on(table.status),
	unique("ua_assign_assessment_domain_unique").on(table.assessmentId, table.domainId),
]);

// Respostas do Questionário
export const assessmentResponses = pgTable("ua_responses", {
	id: serial().primaryKey().primaryKey(),
	assessmentId: integer().notNull(),
	assignmentId: integer().notNull(),
	questionId: varchar({ length: 20 }).notNull(), // IA-01, IA-02, etc
	questionText: text().notNull(),
	selectedLevel: integer().notNull(), // 1-5 maturity level
	respondedByUserId: integer().notNull(),
	respondedAt: timestamp({ mode: 'string' }).notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("assessment_responses_assessment_idx").on(table.assessmentId),
	index("assessment_responses_question_idx").on(table.questionId),
	unique("ua_resp_assessment_question_unique").on(table.assessmentId, table.questionId),
]);
// Evidências (Documentos e Links))
export const assessmentEvidences = pgTable("ua_evidences", {
	id: serial().primaryKey().primaryKey(),
	assessmentId: integer().notNull(),
	responseId: integer().notNull(),
	questionId: varchar({ length: 20 }).notNull(),
	type: text().notNull(),
	fileName: varchar({ length: 500 }),
	fileUrl: varchar({ length: 1000 }).notNull(),
	fileKey: varchar({ length: 500 }), // S3 key for GED storage
	description: text(),
	uploadedByUserId: integer().notNull(),
	uploadedAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("assessment_evidences_assessment_idx").on(table.assessmentId),
	index("assessment_evidences_response_idx").on(table.responseId),
	index("assessment_evidences_question_idx").on(table.questionId),
]);

// Status de Evidências por Pergunta
export const assessmentEvidenceStatus = pgTable("ua_evidence_status", {
	id: serial().primaryKey().primaryKey(),
	assessmentId: integer().notNull(),
	questionId: varchar({ length: 20 }).notNull(),
	hasEvidence: boolean().default(false).notNull(),
	evidenceCount: integer().default(0).notNull(),
	lastUpdatedAt: timestamp({ mode: 'string' }).notNull(),
},
(table) => [
	index("evidence_status_assessment_idx").on(table.assessmentId),
	index("evidence_status_question_idx").on(table.questionId),
]);

// Análise de Risco Multi-Norma
export const riskAnalysis = pgTable("ua_risk_analysis", {
	id: serial().primaryKey().primaryKey(),
	assessmentId: integer().notNull(),
	domainId: varchar({ length: 20 }).notNull(),
	questionId: varchar({ length: 20 }).notNull(),
	riskLevel: text().notNull(),
	probability: integer(), // 1-5
	impact: integer(), // 1-5
	severity: integer(), // Calculated: probability * impact
	referencedNorms: json().$type<{ norm: string; articles: string[] }[]>().default([]).notNull(),
	mitigation: text(),
	editedByConsultant: boolean().default(false).notNull(),
	editedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("risk_analysis_assessment_idx").on(table.assessmentId),
	index("risk_analysis_domain_idx").on(table.domainId),
]);

// Matriz de Risco (5 Colunas)
export const riskMatrix = pgTable("ua_risk_matrix", {
	id: serial().primaryKey().primaryKey(),
	riskAnalysisId: integer().notNull(),
	domainId: varchar({ length: 20 }).notNull(),
	lgpdArticles: varchar({ length: 500 }), // LGPD articles referenced
	isoControls: varchar({ length: 500 }), // ISO 27001 controls
	nistFramework: varchar({ length: 500 }), // NIST CSF categories
	riskDescription: text().notNull(),
	severity: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("risk_matrix_analysis_idx").on(table.riskAnalysisId),
	index("risk_matrix_domain_idx").on(table.domainId),
]);

// Resultados da Avaliação
export const assessmentResults = pgTable("ua_results", {
	id: serial().primaryKey().primaryKey(),
	assessmentId: integer().notNull(),
	status: text().default('rascunho').notNull(),
	overallMaturityScore: integer(), // 1-5
	radarData: json().$type<{ domain: string; score: number }[]>().default([]).notNull(),
	classifications: json().$type<{ domain: string; level: string; color: string }[]>().default([]).notNull(),
	riskSummary: text(),
	actionPlanSummary: text(),
	consultantNotes: text(),
	editedByConsultantId: integer(),
	editedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("assessment_results_assessment_idx").on(table.assessmentId),
	index("assessment_results_status_idx").on(table.status),
]);

// Liberação de Resultados
export const resultRelease = pgTable("ua_result_release", {
	id: serial().primaryKey().primaryKey(),
	assessmentId: integer().notNull(),
	releasedByConsultantId: integer().notNull(),
	releasedAt: timestamp({ mode: 'string' }).notNull(),
	releasedToRoles: json().$type<string[]>().default(['sponsor']).notNull(), // sponsor, cppd_member
	actionPlanIncluded: boolean().default(true).notNull(),
	radarChartIncluded: boolean().default(true).notNull(),
	riskMatrixIncluded: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("result_release_assessment_idx").on(table.assessmentId),
]);

// Plano de Ação Integrado
export const assessmentActionPlan = pgTable("ua_action_plan", {
	id: serial().primaryKey().primaryKey(),
	assessmentId: integer().notNull(),
	domainId: varchar({ length: 20 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	priority: text().notNull(),
	status: text().default('pendente').notNull(),
	dueDate: timestamp({ mode: 'string' }).notNull(),
	responsibleUserId: integer(),
	responsibleName: varchar({ length: 255 }),
	observations: text(),
	clientCompletedAt: timestamp({ mode: 'string' }),
	mitigationMeasures: text(),
	normsReferenced: json().$type<string[]>().default([]).notNull(),
	editedByConsultantId: integer(),
	editedAt: timestamp({ mode: 'string' }),
	// Campos de validação do consultor
	validatorId: integer(),
	validatorName: varchar({ length: 255 }),
	validatedAt: timestamp({ mode: 'string' }),
	validationNotes: text(),
	validationRejectionReason: text(),
	submittedForValidationAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("action_plan_assessment_idx").on(table.assessmentId),
	index("action_plan_domain_idx").on(table.domainId),
]);

// Notificações e Alertas de Prazo
export const assessmentNotifications = pgTable("ua_notifications", {
	id: serial().primaryKey().primaryKey(),
	assessmentId: integer().notNull(),
	assignmentId: integer(),
	userId: integer().notNull(),
	type: text().notNull(),
	message: text().notNull(),
	isRead: boolean().default(false).notNull(),
	readAt: timestamp({ mode: 'string' }),
	sentAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("notifications_user_idx").on(table.userId),
	index("notifications_assessment_idx").on(table.assessmentId),
	index("notifications_type_idx").on(table.type),
]);

// Requisições de Redistribuição de Domínios
export const domainRedistributionRequests = pgTable("ua_redistribution_requests", {
	id: serial().primaryKey().primaryKey(),
	assessmentId: integer().notNull(),
	assignmentId: integer().notNull(),
	requestedByUserId: integer().notNull(),
	domainId: varchar({ length: 20 }).notNull(),
	currentAssigneeId: integer().notNull(),
	newAssigneeId: integer(), // NULL if requesting new user creation
	newUserData: json().$type<{ name: string; email: string; role: string }>(), // If new user needed
	status: text().default('pendente').notNull(),
	reason: text(),
	reviewedByConsultantId: integer(),
	reviewedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("redistribution_assessment_idx").on(table.assessmentId),
	index("redistribution_status_idx").on(table.status),
]);

// Type exports para TypeScript
export type UnifiedAssessment = typeof unifiedAssessments.$inferSelect;
export type InsertUnifiedAssessment = typeof unifiedAssessments.$inferInsert;

export type AssessmentAssignment = typeof assessmentAssignments.$inferSelect;
export type InsertAssessmentAssignment = typeof assessmentAssignments.$inferInsert;

export type AssessmentResponse = typeof assessmentResponses.$inferSelect;
export type InsertAssessmentResponse = typeof assessmentResponses.$inferInsert;

export type AssessmentEvidence = typeof assessmentEvidences.$inferSelect;
export type InsertAssessmentEvidence = typeof assessmentEvidences.$inferInsert;

export type RiskAnalysis = typeof riskAnalysis.$inferSelect;
export type InsertRiskAnalysis = typeof riskAnalysis.$inferInsert;

export type RiskMatrix = typeof riskMatrix.$inferSelect;
export type InsertRiskMatrix = typeof riskMatrix.$inferInsert;

export type AssessmentResult = typeof assessmentResults.$inferSelect;
export type InsertAssessmentResult = typeof assessmentResults.$inferInsert;

export type ResultRelease = typeof resultRelease.$inferSelect;
export type InsertResultRelease = typeof resultRelease.$inferInsert;

export type AssessmentActionPlan = typeof assessmentActionPlan.$inferSelect;
export type InsertAssessmentActionPlan = typeof assessmentActionPlan.$inferInsert;

export type AssessmentNotification = typeof assessmentNotifications.$inferSelect;
export type InsertAssessmentNotification = typeof assessmentNotifications.$inferInsert;

export type DomainRedistributionRequest = typeof domainRedistributionRequests.$inferSelect;
export type InsertDomainRedistributionRequest = typeof domainRedistributionRequests.$inferInsert;

// ==================== EMAIL LOGS ====================
// Tabela para rastrear todos os e-mails enviados pelo sistema
export const emailLogs = pgTable("email_logs", {
	id: serial().primaryKey(),
	organizationId: integer().notNull(),
	recipientEmail: varchar({ length: 255 }).notNull(),
	recipientName: varchar({ length: 255 }),
	subject: varchar({ length: 500 }).notNull(),
	emailType: text().notNull(),
	relatedEntityType: text(),
	relatedEntityId: integer(),
	status: text().default('pending').notNull(),
	resendMessageId: varchar({ length: 100 }), // ID retornado pelo Resend
	errorMessage: text(),
	sentAt: timestamp({ mode: 'string' }),
	deliveredAt: timestamp({ mode: 'string' }),
	openedAt: timestamp({ mode: 'string' }),
	clickedAt: timestamp({ mode: 'string' }),
	bouncedAt: timestamp({ mode: 'string' }),
	sentById: integer(), // Usuário que disparou o envio
	retryCount: integer().default(0).notNull(),
	lastRetryAt: timestamp({ mode: 'string' }),
	metadata: json().$type<{ templateVersion?: string; linkToken?: string; assessmentId?: number }>(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("email_logs_org_idx").on(table.organizationId),
	index("email_logs_recipient_idx").on(table.recipientEmail),
	index("email_logs_status_idx").on(table.status),
	index("email_logs_type_idx").on(table.emailType),
	index("email_logs_created_idx").on(table.createdAt),
]);

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

// ==================== CONTRACT ANALYSIS FIELD EVIDENCE ====================
/**
 * Tabela para armazenar evidências de campos da análise de contratos.
 * Guarda trechos e confiança para reduzir retrabalho e dar rastreabilidade.
 */
export const contractAnalysisFieldEvidence = pgTable("contract_analysis_field_evidence", {
	id: serial().primaryKey(),
	analysisId: integer().notNull(),
	fieldName: varchar({ length: 120 }).notNull(),
	excerpt: text(),
	clauseRef: varchar({ length: 255 }),
	confidence: integer(),
	note: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("contract_analysis_field_evidence_analysisId_idx").on(table.analysisId),
	index("contract_analysis_field_evidence_fieldName_idx").on(table.fieldName),
]);

export type ContractAnalysisFieldEvidence = typeof contractAnalysisFieldEvidence.$inferSelect;
export type InsertContractAnalysisFieldEvidence = typeof contractAnalysisFieldEvidence.$inferInsert;


// ==================== TICKET AUDIT LOG ====================
/**
 * Tabela de audit log imutável para tickets do MeuDPO.
 * Registra todas as ações críticas com cadeia de hash para rastreabilidade.
 */
export const ticketAuditLog = pgTable("ticket_audit_log", {
	id: serial().primaryKey(),
	ticketId: integer().notNull(),
	action: varchar({ length: 100 }).notNull(),
	actorId: integer(),
	actorRole: varchar({ length: 50 }),
	payloadJson: json(),
	prevHash: varchar({ length: 64 }),
	entryHash: varchar({ length: 64 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("ticket_audit_log_ticket_idx").on(table.ticketId),
	index("ticket_audit_log_action_idx").on(table.action),
	index("ticket_audit_log_created_idx").on(table.createdAt),
]);

export type TicketAuditLog = typeof ticketAuditLog.$inferSelect;
export type InsertTicketAuditLog = typeof ticketAuditLog.$inferInsert;


// ==================== PATCH-2-RIPD-AUTOMATION ====================

export const ripdEvidences = pgTable("ripd_evidences", {
  id: serial("id").primaryKey(),
  ripdId: integer("ripdId").notNull(),
  organizationId: integer("organizationId").notNull(),
  questionId: integer("questionId"),
  riskId: integer("riskId"),
  mitigationId: integer("mitigationId"),
  gedDocumentId: integer("gedDocumentId").notNull(),
  evidenceType: text("evidenceType").default("documento"),
  tags: json("tags"),
  uploadedByUserId: integer("uploadedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => [
  index("ripd_evidences_ripd_idx").on(table.ripdId),
  index("ripd_evidences_org_idx").on(table.organizationId),
]);

export type RipdEvidence = typeof ripdEvidences.$inferSelect;
export type InsertRipdEvidence = typeof ripdEvidences.$inferInsert;


// ==================== COMPLIANCE ASSIGNMENTS ====================

export const complianceAssignments = pgTable("compliance_assignments", {
  id: serial().primaryKey().primaryKey(),
  
  // Referências
  assessmentId: integer().notNull(),
  domainId: integer().notNull(),
  userId: integer().notNull(),
  
  // Rastreamento de envio
  sentAt: timestamp({ mode: 'string' }),
  resentAt: timestamp({ mode: 'string' }),
  respondedAt: timestamp({ mode: 'string' }),
  viewedAt: timestamp({ mode: 'string' }),
  
  // Status
  status: text().default('pending').notNull(),
  
  // Auditoria
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	index("compliance_assignments_assessment_idx").on(table.assessmentId),
	index("compliance_assignments_domain_idx").on(table.domainId),
	index("compliance_assignments_user_idx").on(table.userId),
	index("compliance_assignments_status_idx").on(table.status),
	// Unique constraint: apenas 1 usuário por domínio por avaliação
	unique("compliance_assignments_domain_unique").on(table.assessmentId, table.domainId),
]);

export type ComplianceAssignment = typeof complianceAssignments.$inferSelect;
export type InsertComplianceAssignment = typeof complianceAssignments.$inferInsert;



// ============================================
// HISTÓRICO DE VERSÕES DE TEXTOS (ROT/POP/JUSTIFICATIVA/BASE LEGAL)
// ============================================

export const textVersionHistory = pgTable("text_version_history", {
  id: serial().primaryKey().primaryKey(),
  
  // Referência à entidade
  entityType: text().notNull(),
  entityId: integer().notNull(), // ID do rot_operations ou mapeamento_responses
  organizationId: integer().notNull(),
  
  // Campo específico sendo versionado
  fieldName: varchar({ length: 100 }).notNull(), // Ex: 'purpose', 'legalBase', 'justification', 'content'
  
  // Conteúdo da versão
  content: text().notNull(),
  previousContent: text(), // Conteúdo anterior (para diff)
  
  // Metadados da versão
  version: integer().default(1).notNull(),
  changeReason: text(), // Motivo da alteração
  changeType: text().default('criacao').notNull(),
  
  // Autor
  createdById: integer().notNull(),
  createdByName: varchar({ length: 255 }),
  
  // Auditoria
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("tvh_entity_idx").on(table.entityType, table.entityId),
  index("tvh_org_idx").on(table.organizationId),
  index("tvh_field_idx").on(table.fieldName),
  index("tvh_created_idx").on(table.createdAt),
]);

export type TextVersionHistory = typeof textVersionHistory.$inferSelect;
export type InsertTextVersionHistory = typeof textVersionHistory.$inferInsert;


// ─── Custom Taxonomy ─────────────────────────────────────────────────
export const customTaxonomy = pgTable("custom_taxonomy", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  kind: text("kind").notNull(),
  parentCode: varchar("parent_code", { length: 100 }),
  code: varchar("code", { length: 100 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ct_org_idx").on(table.organizationId),
  index("ct_kind_idx").on(table.kind),
]);

export type CustomTaxonomy = typeof customTaxonomy.$inferSelect;
export type InsertCustomTaxonomy = typeof customTaxonomy.$inferInsert;


// ==================== ACTIVITY LOG ====================
/**
 * Tabela de log de atividades para rastrear ações dos usuários na plataforma.
 * Alimenta a seção "Atividade Recente" no Dashboard.
 */
export const activityLog = pgTable("activity_log", {
  id: serial().primaryKey().primaryKey(),
  organizationId: integer().notNull(),
  userId: integer().notNull(),
  userName: varchar({ length: 255 }),
  
  // Tipo de atividade
  activityType: text().notNull(),
  
  // Módulo de origem
  module: text().notNull(),
  
  // Descrição legível
  description: varchar({ length: 500 }).notNull(),
  
  // Referência à entidade relacionada
  entityType: varchar({ length: 50 }),
  entityId: integer(),
  entityName: varchar({ length: 255 }),
  
  // Metadados adicionais
  metadata: json().$type<Record<string, any>>(),
  
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("activity_log_org_idx").on(table.organizationId),
  index("activity_log_user_idx").on(table.userId),
  index("activity_log_type_idx").on(table.activityType),
  index("activity_log_module_idx").on(table.module),
  index("activity_log_created_idx").on(table.createdAt),
]);

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;


// ============================================================
// Múltiplos Perfis por Usuário (user_profiles)
// ============================================================
export const userProfiles = pgTable("user_profiles", {
  id: serial().primaryKey(),
  userId: integer("user_id").notNull(),
  organizationId: integer("organization_id").notNull(),
  profileType: varchar("profile_type", { length: 50 }).notNull(),
  areaId: integer("area_id"),
  assignedBy: integer("assigned_by"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("up_user_idx").on(table.userId),
  index("up_org_idx").on(table.organizationId),
  index("up_profile_idx").on(table.profileType),
  index("up_area_idx").on(table.areaId),
  index("up_user_org_idx").on(table.userId, table.organizationId),
]);
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// ============================================================
// Delegação de Mapeamentos (mapeamento_delegations)
// ============================================================
export const mapeamentoDelegations = pgTable("mapeamento_delegations", {
  id: serial().primaryKey(),
  organizationId: integer("organization_id").notNull(),
  areaId: integer("area_id").notNull(),
  processId: integer("process_id").notNull(),
  delegatedBy: integer("delegated_by").notNull(),
  delegatedTo: integer("delegated_to").notNull(),
  status: text("status").default('ativa').notNull(),
  notes: text(),
  delegatedAt: timestamp("delegated_at", { mode: 'string' }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: 'string' }),
  revokedAt: timestamp("revoked_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("md_org_idx").on(table.organizationId),
  index("md_area_idx").on(table.areaId),
  index("md_process_idx").on(table.processId),
  index("md_delegated_by_idx").on(table.delegatedBy),
  index("md_delegated_to_idx").on(table.delegatedTo),
  index("md_status_idx").on(table.status),
]);
export type MapeamentoDelegation = typeof mapeamentoDelegations.$inferSelect;
export type InsertMapeamentoDelegation = typeof mapeamentoDelegations.$inferInsert;

// ─── Histórico de Observações de Andamento do Plano de Ação ───────────────────
export const actionPlanObservations = pgTable("action_plan_observations", {
  id: serial().primaryKey(),
  actionPlanId: integer().notNull(),
  userId: integer().notNull(),
  userName: varchar({ length: 255 }).notNull(),
  userRole: varchar({ length: 50 }).notNull(),
  text: text().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => [
  index("apo_actionPlanId_idx").on(table.actionPlanId),
  index("apo_userId_idx").on(table.userId),
]);
export type ActionPlanObservation = typeof actionPlanObservations.$inferSelect;
export type InsertActionPlanObservation = typeof actionPlanObservations.$inferInsert;
