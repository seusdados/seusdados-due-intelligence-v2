CREATE TABLE `access_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`thirdPartyId` int NOT NULL,
	`organizationId` int NOT NULL,
	`assessmentId` int,
	`type` enum('due_diligence','conformidade') NOT NULL DEFAULT 'due_diligence',
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`sentAt` timestamp,
	`viewedAt` timestamp,
	`completedAt` timestamp
);
--> statement-breakpoint
CREATE TABLE `action_plan_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionPlanId` int NOT NULL,
	`documentId` int NOT NULL,
	`description` text,
	`addedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `action_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`assessmentType` enum('compliance','third_party','contract_analysis') NOT NULL,
	`assessmentId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`status` enum('pendente','em_andamento','concluida_cliente','pendente_validacao_dpo','concluida','cancelada','recusada_cliente') NOT NULL DEFAULT 'pendente',
	`responsibleId` int,
	`dueDate` timestamp,
	`completedAt` timestamp,
	`clientCompletedAt` timestamp,
	`clientCompletedById` int,
	`dpoValidatedAt` timestamp,
	`dpoValidatedById` int,
	`clientRejectionReason` text,
	`dpoValidationTicketId` int,
	`notes` text,
	`actionCategory` enum('contratual','operacional') DEFAULT 'contratual',
	`linkedClauseId` varchar(50),
	`outputType` enum('clausula_contrato','clausula_aditivo','acordo_tratamento_dados','tarefa_operacional'),
	`convertedToTicketId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ai_chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`role` enum('system','user','assistant') NOT NULL,
	`content` text NOT NULL,
	`tokensUsed` int DEFAULT 0,
	`isRefinement` tinyint NOT NULL DEFAULT 0,
	`parentMessageId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `ai_chat_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int,
	`module` enum('compliance','due_diligence','action_plans','general') NOT NULL DEFAULT 'general',
	`entityType` varchar(50),
	`entityId` int,
	`title` varchar(255),
	`provider` enum('openai','gemini','claude','perplexity') NOT NULL,
	`model` varchar(100),
	`status` enum('active','archived','deleted') NOT NULL DEFAULT 'active',
	`totalTokensUsed` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ai_generated_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int,
	`organizationId` int,
	`module` enum('compliance','due_diligence','action_plans','general') NOT NULL,
	`entityType` varchar(50),
	`entityId` int,
	`resultType` enum('analysis','recommendations','action_plan','summary','risk_assessment') NOT NULL,
	`title` varchar(255),
	`content` text NOT NULL,
	`structuredData` json,
	`status` enum('draft','approved','rejected','applied') NOT NULL DEFAULT 'draft',
	`approvedById` int,
	`approvedAt` timestamp,
	`appliedAt` timestamp,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ai_organization_instructions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`module` enum('compliance','due_diligence','action_plans','general') NOT NULL DEFAULT 'general',
	`systemPrompt` text,
	`contextInstructions` text,
	`responseStyle` enum('formal','tecnico','executivo','simplificado') NOT NULL DEFAULT 'formal',
	`language` varchar(10) DEFAULT 'pt-BR',
	`includeRecommendations` tinyint NOT NULL DEFAULT 1,
	`includeRiskAnalysis` tinyint NOT NULL DEFAULT 1,
	`includeActionPlan` tinyint NOT NULL DEFAULT 1,
	`customFields` json,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ai_prompt_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`module` enum('compliance','due_diligence','action_plans','general') NOT NULL DEFAULT 'general',
	`category` varchar(100),
	`promptTemplate` text NOT NULL,
	`variables` json,
	`isSystem` tinyint NOT NULL DEFAULT 0,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ai_provider_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('openai','gemini','claude','perplexity') NOT NULL,
	`apiKey` text,
	`model` varchar(100),
	`isEnabled` tinyint NOT NULL DEFAULT 0,
	`isDefault` tinyint NOT NULL DEFAULT 0,
	`maxTokens` int DEFAULT 4096,
	`temperature` int DEFAULT 70,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ua_action_plan` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`domainId` varchar(20) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`priority` enum('baixa','media','alta','critica') NOT NULL,
	`status` enum('pendente','em_andamento','concluida') NOT NULL DEFAULT 'pendente',
	`dueDate` timestamp NOT NULL,
	`responsibleUserId` int,
	`mitigationMeasures` text,
	`normsReferenced` json NOT NULL DEFAULT ('[]'),
	`editedByConsultantId` int,
	`editedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ua_action_plan_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ua_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`domainId` varchar(20) NOT NULL,
	`domainName` varchar(255) NOT NULL,
	`assignedToUserId` int NOT NULL,
	`assignedToName` varchar(255) NOT NULL,
	`assignedToEmail` varchar(255) NOT NULL,
	`status` enum('pendente','em_progresso','concluida') NOT NULL DEFAULT 'pendente',
	`deadline` timestamp NOT NULL,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ua_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assessment_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentType` enum('conformidade','due_diligence') NOT NULL,
	`assessmentId` int NOT NULL,
	`documentId` int NOT NULL,
	`category` enum('evidencia_conformidade','documento_suporte','relatorio_auditoria','politica_procedimento','contrato','termo_responsabilidade','outro') NOT NULL DEFAULT 'documento_suporte',
	`description` text,
	`linkedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `ua_evidence_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`questionId` varchar(20) NOT NULL,
	`hasEvidence` tinyint NOT NULL DEFAULT 0,
	`evidenceCount` int NOT NULL DEFAULT 0,
	`lastUpdatedAt` timestamp NOT NULL,
	CONSTRAINT `ua_evidence_status_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ua_evidences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`responseId` int NOT NULL,
	`questionId` varchar(20) NOT NULL,
	`type` enum('pdf','link') NOT NULL,
	`fileName` varchar(500),
	`fileUrl` varchar(1000) NOT NULL,
	`fileKey` varchar(500),
	`description` text,
	`uploadedByUserId` int NOT NULL,
	`uploadedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `ua_evidences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ua_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`assignmentId` int,
	`userId` int NOT NULL,
	`type` enum('assignment','reminder_10d','reminder_5d','reminder_2d','reminder_1d','reminder_today','deadline_passed') NOT NULL,
	`message` text NOT NULL,
	`isRead` tinyint NOT NULL DEFAULT 0,
	`readAt` timestamp,
	`sentAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `ua_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ua_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`assignmentId` int NOT NULL,
	`questionId` varchar(20) NOT NULL,
	`questionText` text NOT NULL,
	`selectedLevel` int NOT NULL,
	`respondedByUserId` int NOT NULL,
	`respondedAt` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ua_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ua_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`status` enum('rascunho','em_analise','finalizado','liberado') NOT NULL DEFAULT 'rascunho',
	`overallMaturityScore` int,
	`radarData` json NOT NULL DEFAULT ('[]'),
	`classifications` json NOT NULL DEFAULT ('[]'),
	`riskSummary` text,
	`actionPlanSummary` text,
	`consultantNotes` text,
	`editedByConsultantId` int,
	`editedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ua_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`organizationId` int,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`details` json,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `clause_annotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`clauseId` varchar(50) NOT NULL,
	`authorId` int NOT NULL,
	`authorRole` enum('admin_global','consultor','cliente','advogado','dpo') NOT NULL,
	`selectedText` text NOT NULL,
	`startOffset` int NOT NULL,
	`endOffset` int NOT NULL,
	`content` text NOT NULL,
	`highlightColor` enum('yellow','green','blue','red','purple','orange') NOT NULL DEFAULT 'yellow',
	`annotationType` enum('note','question','suggestion','issue','approval') NOT NULL DEFAULT 'note',
	`isResolved` tinyint NOT NULL DEFAULT 0,
	`resolvedById` int,
	`resolvedAt` timestamp,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clause_annotations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clause_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`clauseId` varchar(50) NOT NULL,
	`clauseAuditActionType` enum('generated','accepted','rejected','refined','edited','downloaded','copied') NOT NULL,
	`previousContent` text,
	`newContent` text,
	`refinementInstructions` text,
	`userId` int NOT NULL,
	`userName` varchar(255),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `clause_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`clauseId` varchar(50) NOT NULL,
	`authorId` int NOT NULL,
	`authorRole` enum('admin_global','consultor','cliente','advogado','dpo') NOT NULL,
	`content` text NOT NULL,
	`parentCommentId` int,
	`mentions` json,
	`isResolved` tinyint NOT NULL DEFAULT 0,
	`resolvedById` int,
	`resolvedAt` timestamp,
	`isEdited` tinyint NOT NULL DEFAULT 0,
	`editedAt` timestamp,
	`isDeleted` tinyint NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`deletedById` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clause_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comment_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notificationType` enum('new_comment','reply','mention','resolved','new_annotation') NOT NULL,
	`commentId` int,
	`annotationId` int,
	`analysisId` int NOT NULL,
	`clauseId` varchar(50) NOT NULL,
	`triggeredById` int NOT NULL,
	`isRead` tinyint NOT NULL DEFAULT 0,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `comment_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`framework` enum('misto','sgd','ico','cnil','seusdados') NOT NULL DEFAULT 'misto',
	`status` enum('rascunho','em_andamento','concluida','arquivada') NOT NULL DEFAULT 'rascunho',
	`overallScore` int,
	`maturityLevel` int,
	`riskScore` int,
	`totalQuestions` int DEFAULT 0,
	`answeredQuestions` int DEFAULT 0,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `compliance_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`domainId` int NOT NULL,
	`userId` int NOT NULL,
	`sentAt` timestamp,
	`resentAt` timestamp,
	`respondedAt` timestamp,
	`viewedAt` timestamp,
	`status` enum('pending','sent','resent','viewed','responded','overdue') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `compliance_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `compliance_assignments_unique` UNIQUE(`assessmentId`,`domainId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `compliance_domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`framework` enum('misto','sgd','ico','cnil','seusdados') NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`color` varchar(7),
	`icon` varchar(50),
	`order` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `compliance_domains_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_framework_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`questionId` int NOT NULL,
	`selectedOption` int NOT NULL,
	`notes` text,
	`evidenceUrls` json,
	`respondedById` int,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `compliance_framework_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`framework` enum('misto','sgd','ico','cnil','seusdados') NOT NULL,
	`domainId` int NOT NULL,
	`questionText` text NOT NULL,
	`option1Text` text NOT NULL,
	`option1Evidence` text,
	`option2Text` text NOT NULL,
	`option2Evidence` text,
	`option3Text` text NOT NULL,
	`option3Evidence` text,
	`option4Text` text NOT NULL,
	`option4Evidence` text,
	`order` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `compliance_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`domainId` int NOT NULL,
	`questionId` varchar(20) NOT NULL,
	`selectedLevel` int NOT NULL,
	`riskScore` int,
	`notes` text,
	`evidenceUrls` json,
	`attachments` json NOT NULL DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `compliance_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`documentId` int NOT NULL,
	`thirdPartyId` int,
	`contractName` varchar(500) NOT NULL,
	`contractAnalysisStatus` enum('pending','analyzing','completed','reviewed','approved','rejected','error') NOT NULL DEFAULT 'pending',
	`progress` int NOT NULL DEFAULT 0,
	`executiveSummary` text,
	`complianceScore` int,
	`criticalRisks` int NOT NULL DEFAULT 0,
	`highRisks` int NOT NULL DEFAULT 0,
	`mediumRisks` int NOT NULL DEFAULT 0,
	`lowRisks` int NOT NULL DEFAULT 0,
	`veryLowRisks` int NOT NULL DEFAULT 0,
	`extractedText` text,
	`aiResponse` json,
	`aiModel` varchar(100),
	`createdById` int NOT NULL,
	`reviewedById` int,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`completedAt` timestamp
);
--> statement-breakpoint
CREATE TABLE `contract_analysis_clauses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`clauseId` varchar(50) NOT NULL,
	`sequenceNumber` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`originalContent` text NOT NULL,
	`isAccepted` tinyint NOT NULL DEFAULT 1,
	`isApplicable` tinyint NOT NULL DEFAULT 1,
	`version` int NOT NULL DEFAULT 1,
	`finalContent` text,
	`finalTitle` varchar(500),
	`isFinalApproved` tinyint NOT NULL DEFAULT 0,
	`includeHeader` tinyint NOT NULL DEFAULT 1,
	`includeContractReference` tinyint NOT NULL DEFAULT 1,
	`editedById` int,
	`editedAt` timestamp,
	`approvedById` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `contract_analysis_field_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`fieldName` varchar(120) NOT NULL,
	`excerpt` text,
	`clauseRef` varchar(255),
	`confidence` int,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `contract_analysis_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`historyActionType` enum('created','analysis_started','analysis_completed','analysis_error','refinement_requested','refinement_completed','reviewed','approved','rejected','exported','xai_analyzed','xai_clauses_generated','xai_action_plan_generated','xai_report_exported','xai_alert_contested','map_updated','clauses_exported','integrated_report_generated','share_link_generated','approval_requested','dpa_approved','dpa_rejected','dpa_sent_email','mapeamento_generated','mapeamento_edited','mapeamento_refined','mapeamento_approved','mapeamento_regenerated') NOT NULL,
	`description` text,
	`previousData` json,
	`newData` json,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `contract_analysis_maps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`partnerName` varchar(500),
	`contractType` varchar(255),
	`contractingParty` varchar(500),
	`contractedParty` varchar(500),
	`lgpdAgentType` enum('controlador','operador','controlador_conjunto','suboperador'),
	`agentTypeJustification` text,
	`contractObject` text,
	`startDate` varchar(50),
	`endDate` varchar(50),
	`commonData` text,
	`commonDataLargeScale` tinyint DEFAULT 0,
	`sensitiveData` text,
	`sensitiveDataLargeScale` tinyint DEFAULT 0,
	`hasElderlyData` tinyint DEFAULT 0,
	`elderlyDataDetails` text,
	`hasMinorData` tinyint DEFAULT 0,
	`minorDataDetails` text,
	`titularRightsDetails` text,
	`dataEliminationDetails` text,
	`legalRisks` text,
	`securityRisks` text,
	`protectionClauseDetails` text,
	`suggestedClause` text,
	`actionStatus` enum('adequado','ajustar') DEFAULT 'ajustar',
	`actionPlan` text,
	`suggestedDeadline` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`titularRightsStatus` enum('sim','nao','parcial'),
	`dataEliminationStatus` enum('sim','nao','parcial'),
	`hasProtectionClause` enum('sim','nao','parcial')
);
--> statement-breakpoint
CREATE TABLE `contract_checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`itemNumber` int NOT NULL,
	`question` text NOT NULL,
	`checklistStatus` enum('sim','nao','parcial') NOT NULL,
	`observations` text,
	`contractExcerpt` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `contract_clause_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clauseId` int NOT NULL,
	`analysisId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`includeHeader` tinyint NOT NULL DEFAULT 1,
	`includeContractReference` tinyint NOT NULL DEFAULT 1,
	`changeDescription` text,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`isActive` tinyint NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `contract_mapeamento_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractAnalysisId` int NOT NULL,
	`contextId` int,
	`areaId` int,
	`processId` int,
	`responseId` int,
	`rotId` int,
	`extractionSource` enum('contract_map','contract_text','ai_analysis') NOT NULL DEFAULT 'contract_map',
	`extractedData` json,
	`identifiedDepartment` varchar(255),
	`linkStatus` enum('pending','created','reviewed','error','draft','approved') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `contract_risk_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`contractArea` varchar(255),
	`analysisBlock` int,
	`riskDescription` text NOT NULL,
	`riskLevel` enum('1','2','3','4','5') NOT NULL,
	`potentialImpact` text,
	`requiredAction` text NOT NULL,
	`suggestedDeadline` varchar(50),
	`legalReference` text,
	`riskActionStatus` enum('pendente','em_andamento','concluido') DEFAULT 'pendente',
	`actionPlanId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `contract_share_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`createdById` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`viewCount` int NOT NULL DEFAULT 0,
	`lastViewedAt` timestamp
);
--> statement-breakpoint
CREATE TABLE `cppd_initiative_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`initiativeId` int NOT NULL,
	`documentId` int,
	`fileName` varchar(255),
	`fileUrl` varchar(1024),
	`fileType` varchar(100),
	`fileSize` int,
	`description` text,
	`uploadedById` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `cppd_initiative_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cppd_initiative_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`initiativeId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('pendente','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'pendente',
	`dueDate` timestamp,
	`completedAt` timestamp,
	`assignedToId` int,
	`assignedToName` varchar(255),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cppd_initiative_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cppd_initiatives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` enum('politica','treinamento','auditoria','mapeamento','tecnologia','processo','comunicacao','outro') NOT NULL DEFAULT 'outro',
	`status` enum('planejado','em_andamento','concluido','atrasado','cancelado') NOT NULL DEFAULT 'planejado',
	`progress` int NOT NULL DEFAULT 0,
	`plannedStartDate` timestamp,
	`plannedEndDate` timestamp,
	`actualStartDate` timestamp,
	`actualEndDate` timestamp,
	`responsibleId` int,
	`responsibleName` varchar(255),
	`responsibleEmail` varchar(255),
	`quarter` enum('Q1','Q2','Q3','Q4'),
	`year` int NOT NULL,
	`priority` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`impact` enum('baixo','medio','alto','muito_alto') NOT NULL DEFAULT 'medio',
	`notes` text,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cppd_initiatives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cppd_overdue_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`itemType` enum('initiative','task','document') NOT NULL,
	`itemId` int NOT NULL,
	`itemTitle` varchar(255) NOT NULL,
	`dueDate` timestamp NOT NULL,
	`daysOverdue` int NOT NULL,
	`notifiedUserId` int,
	`notifiedEmail` varchar(255),
	`notificationSentAt` timestamp,
	`notificationStatus` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `cppd_overdue_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_subject_request_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`previousStatus` varchar(50),
	`newStatus` varchar(50),
	`notes` text,
	`performedById` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `data_subject_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`titularName` varchar(255) NOT NULL,
	`titularEmail` varchar(255),
	`titularDocument` varchar(50),
	`requestType` enum('acesso','retificacao','exclusao','portabilidade','revogacao_consentimento','oposicao','informacao') NOT NULL,
	`description` text,
	`receivedVia` varchar(100),
	`externalProtocol` varchar(100),
	`status` enum('recebida','em_analise','aguardando_info','respondida','negada','arquivada') NOT NULL DEFAULT 'recebida',
	`receivedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`dueDate` timestamp,
	`respondedAt` timestamp,
	`responseUrl` varchar(500),
	`responseNotes` text,
	`assignedToId` int,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`uploadedById` int NOT NULL,
	`entityType` enum('organization','third_party','compliance_assessment','third_party_assessment','action_plan') NOT NULL,
	`entityId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `ua_redistribution_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`assignmentId` int NOT NULL,
	`requestedByUserId` int NOT NULL,
	`domainId` varchar(20) NOT NULL,
	`currentAssigneeId` int NOT NULL,
	`newAssigneeId` int,
	`newUserData` json,
	`status` enum('pendente','aprovada','recusada') NOT NULL DEFAULT 'pendente',
	`reason` text,
	`reviewedByConsultantId` int,
	`reviewedAt` timestamp,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ua_redistribution_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dpa_approval_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`requestedById` int NOT NULL,
	`requestedByName` varchar(255),
	`approverEmail` varchar(255) NOT NULL,
	`approverName` varchar(255),
	`approverRole` varchar(100),
	`status` enum('pending','viewed','approved','rejected','expired') NOT NULL DEFAULT 'pending',
	`accessToken` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`message` text,
	`sentAt` timestamp,
	`viewedAt` timestamp,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `dpa_approval_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dpa_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`approvalStatus` enum('pending','approved','rejected','revision_requested') NOT NULL DEFAULT 'pending',
	`approvedById` int,
	`approvedByName` varchar(255),
	`approvedByEmail` varchar(255),
	`approvedByRole` varchar(100),
	`approvalDate` timestamp,
	`digitalSignature` text,
	`signatureMethod` enum('manual','digital_certificate','oauth') DEFAULT 'manual',
	`ipAddress` varchar(45),
	`userAgent` text,
	`comments` text,
	`rejectionReason` text,
	`approvedClauses` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dpa_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dpia_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`sourceType` enum('manual','mapeamento','contrato','incidente') NOT NULL DEFAULT 'manual',
	`sourceId` int,
	`riskLevel` enum('baixo','moderado','alto','critico') NOT NULL DEFAULT 'moderado',
	`overallScore` int DEFAULT 0,
	`status` enum('draft','in_progress','pending_review','approved','rejected','archived') NOT NULL DEFAULT 'draft',
	`dpoId` int,
	`createdById` int NOT NULL,
	`reviewedById` int,
	`approvedById` int,
	`reviewedAt` timestamp,
	`approvedAt` timestamp,
	`nextReviewDate` timestamp,
	`metadata` json,
	`workflowStatus` enum('draft','in_progress','review','ready_for_signature','signing','signed') DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 1,
	`finalPdfGedId` int,
	`simplifiedPdfGedId` int,
	`anpdPackageGedId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dpia_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dpia_mitigations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dpiaId` int NOT NULL,
	`riskId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`mitigationType` enum('tecnica','organizacional','juridica','fisica','treinamento','monitoramento','outro') NOT NULL,
	`status` enum('planejada','em_implementacao','implementada','verificada','cancelada') NOT NULL DEFAULT 'planejada',
	`responsibleId` int,
	`dueDate` timestamp,
	`completedAt` timestamp,
	`effectivenessRating` enum('baixa','media','alta'),
	`actionPlanId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dpia_mitigations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dpia_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('necessidade_proporcionalidade','direitos_titulares','medidas_seguranca','transferencia_internacional','compartilhamento','retencao_dados','riscos_identificados','medidas_mitigacao') NOT NULL,
	`questionText` text NOT NULL,
	`helpText` text,
	`questionType` enum('text','textarea','select','multiselect','boolean','scale') NOT NULL DEFAULT 'text',
	`options` json,
	`riskWeight` int DEFAULT 1,
	`displayOrder` int DEFAULT 0,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`isRequired` tinyint NOT NULL DEFAULT 1,
	`legalReference` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dpia_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dpia_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dpiaId` int NOT NULL,
	`questionId` int NOT NULL,
	`responseText` text,
	`responseValue` varchar(255),
	`responseJson` json,
	`riskScore` int DEFAULT 0,
	`notes` text,
	`answeredById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dpia_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dpia_risks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dpiaId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`riskCategory` enum('acesso_nao_autorizado','perda_dados','uso_indevido','violacao_privacidade','discriminacao','dano_financeiro','dano_reputacional','nao_conformidade_legal','outro') NOT NULL,
	`likelihood` enum('muito_baixa','baixa','media','alta','muito_alta') NOT NULL DEFAULT 'media',
	`impact` enum('muito_baixo','baixo','medio','alto','muito_alto') NOT NULL DEFAULT 'medio',
	`riskLevel` enum('baixo','moderado','alto','critico') NOT NULL DEFAULT 'moderado',
	`riskScore` int DEFAULT 0,
	`status` enum('identificado','em_mitigacao','mitigado','aceito','transferido') NOT NULL DEFAULT 'identificado',
	`legalReference` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dpia_risks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`recipientEmail` varchar(255) NOT NULL,
	`recipientName` varchar(255),
	`subject` varchar(500) NOT NULL,
	`emailType` enum('convite_avaliacao','lembrete_avaliacao','resultado_avaliacao','convite_usuario','notificacao_sistema','lembrete_prazo') NOT NULL,
	`relatedEntityType` enum('third_party_assessment','compliance_assessment','action_plan','ticket','user'),
	`relatedEntityId` int,
	`status` enum('pending','sent','delivered','opened','clicked','bounced','failed','spam') NOT NULL DEFAULT 'pending',
	`resendMessageId` varchar(100),
	`errorMessage` text,
	`sentAt` timestamp,
	`deliveredAt` timestamp,
	`openedAt` timestamp,
	`clickedAt` timestamp,
	`bouncedAt` timestamp,
	`sentById` int,
	`retryCount` int NOT NULL DEFAULT 0,
	`lastRetryAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `evidences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`assessmentType` enum('compliance','third_party','contract_analysis') NOT NULL,
	`assessmentId` int NOT NULL,
	`questionId` varchar(50),
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`description` text,
	`uploadedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `ged_access_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resourceType` enum('folder','document') NOT NULL,
	`resourceId` int NOT NULL,
	`userId` int NOT NULL,
	`action` enum('view','download','upload','edit','delete','share','move','rename') NOT NULL,
	`details` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `ged_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`spaceType` enum('organization','seusdados') NOT NULL,
	`organizationId` int,
	`folderId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileExtension` varchar(20),
	`version` int NOT NULL DEFAULT 1,
	`previousVersionId` int,
	`isLatestVersion` tinyint NOT NULL DEFAULT 1,
	`status` enum('draft','active','archived','deleted') NOT NULL DEFAULT 'active',
	`isSharedWithClient` tinyint NOT NULL DEFAULT 0,
	`sharedAt` timestamp,
	`sharedById` int,
	`tags` json,
	`metadata` json,
	`linkedEntityType` varchar(50),
	`linkedEntityId` int,
	`createdById` int NOT NULL,
	`lastModifiedById` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp
);
--> statement-breakpoint
CREATE TABLE `ged_folder_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spaceType` enum('organization','seusdados') NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`relativePath` varchar(500) NOT NULL,
	`icon` varchar(50),
	`color` varchar(7),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `ged_folders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`spaceType` enum('organization','seusdados') NOT NULL,
	`organizationId` int,
	`parentFolderId` int,
	`path` varchar(1000) NOT NULL,
	`depth` int NOT NULL DEFAULT 0,
	`isSystemFolder` tinyint NOT NULL DEFAULT 0,
	`icon` varchar(50),
	`color` varchar(7),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ged_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resourceType` enum('folder','document') NOT NULL,
	`resourceId` int NOT NULL,
	`permissionType` enum('user','role') NOT NULL,
	`userId` int,
	`role` enum('admin_global','consultor','cliente'),
	`accessLevel` enum('view','download','edit','delete','admin') NOT NULL DEFAULT 'view',
	`inheritFromParent` tinyint NOT NULL DEFAULT 1,
	`grantedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`expiresAt` timestamp
);
--> statement-breakpoint
CREATE TABLE `govbr_digital_signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('dpa','contract','document') NOT NULL,
	`entityId` int NOT NULL,
	`analysisId` int,
	`signerUserId` int,
	`signerCpf` varchar(14),
	`signerName` varchar(255),
	`signerEmail` varchar(255),
	`signerGovbrLevel` enum('bronze','prata','ouro'),
	`status` enum('pending','awaiting_authorization','processing','completed','failed','expired','cancelled') NOT NULL DEFAULT 'pending',
	`govbrClientId` varchar(100),
	`govbrState` varchar(100),
	`govbrNonce` varchar(100),
	`govbrCode` text,
	`govbrAccessToken` text,
	`govbrTokenExpiresAt` timestamp,
	`documentHash` varchar(64),
	`documentHashBase64` text,
	`documentUrl` text,
	`signatureType` enum('pkcs7_detached','pkcs7_enveloped','pdf_embedded') DEFAULT 'pkcs7_detached',
	`signaturePkcs7` text,
	`signedDocumentUrl` text,
	`certificatePublic` text,
	`certificateType` enum('govbr','icp_brasil'),
	`signedAt` timestamp,
	`validatedAt` timestamp,
	`validationResult` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`errorCode` varchar(50),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `govbr_digital_signatures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `govbr_integration_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`environment` enum('staging','production') NOT NULL DEFAULT 'staging',
	`clientId` varchar(100),
	`clientSecret` text,
	`redirectUri` text,
	`isActive` tinyint NOT NULL DEFAULT 0,
	`lastTestedAt` timestamp,
	`testResult` enum('success','failed'),
	`testErrorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedById` int,
	CONSTRAINT `govbr_integration_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `govbr_signature_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`signatureId` int NOT NULL,
	`action` enum('signature_requested','oauth_redirect','oauth_callback','token_obtained','certificate_obtained','hash_submitted','signature_received','signature_validated','signature_failed','signature_cancelled') NOT NULL,
	`details` json,
	`errorMessage` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `govbr_signature_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governanca_action_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`meetingId` int,
	`agendaItemId` int,
	`createdById` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`assignedToUserId` int,
	`assignedToName` varchar(255),
	`dueDate` timestamp,
	`priority` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`status` enum('aberta','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'aberta',
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_agenda_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`meetingId` int NOT NULL,
	`createdById` int NOT NULL,
	`order` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`referenceDocuments` json,
	`status` enum('nao_iniciado','em_discussao','encerrado') NOT NULL DEFAULT 'nao_iniciado',
	`decisionSummary` text,
	`llmSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_atividade_organizacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesOrganizacaoId` int NOT NULL,
	`organizationId` int NOT NULL,
	`order` int NOT NULL,
	`description` text NOT NULL,
	`status` enum('pendente','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'pendente',
	`assignedToId` int,
	`assignedToName` varchar(255),
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_controls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`programId` int NOT NULL,
	`createdById` int NOT NULL,
	`code` varchar(50) NOT NULL,
	`category` enum('governanca','processos','tecnologia','pessoas','compliance') NOT NULL,
	`label` varchar(255) NOT NULL,
	`isImplemented` tinyint NOT NULL DEFAULT 0,
	`implementedAt` timestamp,
	`evidenceDocumentUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_cppd_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`year` int NOT NULL,
	`programType` enum('ano1','em_curso') NOT NULL,
	`regime` enum('quinzenal','mensal','bimestral') NOT NULL,
	`dayOfWeek` enum('domingo','segunda','terca','quarta','quinta','sexta','sabado') NOT NULL,
	`time` varchar(5) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`meetingLocationType` enum('teams','meet','outlook','google','outro') NOT NULL DEFAULT 'teams',
	`defaultMeetingUrl` varchar(255),
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_cppd_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`cppdId` int NOT NULL,
	`createdById` int NOT NULL,
	`userId` int NOT NULL,
	`nameSnapshot` varchar(255) NOT NULL,
	`emailSnapshot` varchar(255) NOT NULL,
	`roleInCommittee` enum('sponsor','dpo','juridico','ti','rh','seguranca_da_informacao','processos','comercial_marketing','operacoes','outro') NOT NULL,
	`isVoting` tinyint NOT NULL DEFAULT 1,
	`isCoordinator` tinyint NOT NULL DEFAULT 0,
	`isSecretary` tinyint NOT NULL DEFAULT 0,
	`isDpo` tinyint NOT NULL DEFAULT 0,
	`status` enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
	`nominationTermUrl` text,
	`confidentialityTermUrl` text,
	`regimentUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_entregavel_organizacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesOrganizacaoId` int NOT NULL,
	`organizationId` int NOT NULL,
	`order` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('pendente','em_elaboracao','em_revisao','aprovado','arquivado') NOT NULL DEFAULT 'pendente',
	`assignedToId` int,
	`assignedToName` varchar(255),
	`documentId` int,
	`documentUrl` text,
	`dueDate` timestamp,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_meeting_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`meetingId` int NOT NULL,
	`createdById` int NOT NULL,
	`userId` int NOT NULL,
	`nameSnapshot` varchar(255) NOT NULL,
	`emailSnapshot` varchar(255) NOT NULL,
	`role` enum('membro','convidado','consultor','secretario','presidente') NOT NULL,
	`attendanceStatus` enum('nao_confirmado','presente','ausente','justificado') NOT NULL DEFAULT 'nao_confirmado',
	`joinTime` timestamp,
	`leaveTime` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_meetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`cppdId` int NOT NULL,
	`programId` int,
	`createdById` int NOT NULL,
	`year` int NOT NULL,
	`sequence` int NOT NULL,
	`date` timestamp NOT NULL,
	`durationMinutes` int NOT NULL DEFAULT 90,
	`status` enum('agendada','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'agendada',
	`location` varchar(255),
	`meetingProvider` enum('teams','meet','outlook','google','outro') NOT NULL DEFAULT 'teams',
	`meetingUrl` text,
	`calendarEventId` varchar(255),
	`agendaTitle` varchar(255) NOT NULL,
	`agendaSummary` text,
	`agendaTemplateCode` varchar(50),
	`recordingUrl` text,
	`transcript` text,
	`minutesPdfUrl` text,
	`minutesStatus` enum('nao_gerada','em_validacao','em_assinatura','assinada') NOT NULL DEFAULT 'nao_gerada',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_mes_organizacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planoOrganizacaoId` int NOT NULL,
	`organizationId` int NOT NULL,
	`mesTemplateId` int NOT NULL,
	`monthNumber` int NOT NULL,
	`scheduledStartDate` timestamp,
	`scheduledEndDate` timestamp,
	`actualStartDate` timestamp,
	`actualEndDate` timestamp,
	`status` enum('nao_iniciado','em_andamento','concluido') NOT NULL DEFAULT 'nao_iniciado',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_mes_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planoAnualTemplateId` int NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`monthNumber` int NOT NULL,
	`macroBlock` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`theme` varchar(255) NOT NULL,
	`activities` json NOT NULL,
	`deliverables` json NOT NULL,
	`blockColor` varchar(7) DEFAULT '#5f29cc',
	`icon` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_plano_anual_organizacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`templateId` int NOT NULL,
	`year` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`status` enum('planejado','em_execucao','concluido','pausado') NOT NULL DEFAULT 'planejado',
	`notes` text,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_plano_anual_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`programModel` enum('ano1','em_curso') NOT NULL,
	`label` varchar(255) NOT NULL,
	`description` text,
	`totalMonths` int NOT NULL DEFAULT 10,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_program_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`programId` int NOT NULL,
	`phaseId` int NOT NULL,
	`createdById` int NOT NULL,
	`month` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isCompleted` tinyint NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`evidenceDocumentUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_program_phases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`programId` int NOT NULL,
	`createdById` int NOT NULL,
	`phaseNumber` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`theme` varchar(255),
	`startMonth` int NOT NULL,
	`endMonth` int NOT NULL,
	`quarter` varchar(10),
	`status` enum('nao_iniciado','em_andamento','concluido') NOT NULL DEFAULT 'nao_iniciado',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `governanca_programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`year` int NOT NULL,
	`type` enum('ano1','em_curso') NOT NULL,
	`status` enum('planejado','em_execucao','concluido','pausado') NOT NULL DEFAULT 'planejado',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `incident_emergency_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`role` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(50) NOT NULL,
	`priority` int NOT NULL DEFAULT 1,
	`is_available` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incident_emergency_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incident_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`incident_id` int NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`message` text NOT NULL,
	`type` enum('action','system','alert','communication') NOT NULL DEFAULT 'action',
	`user_id` int,
	`user_name` varchar(255),
	`phase_id` int,
	`metadata` json,
	CONSTRAINT `incident_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('standby','active','contained','remediated','closed') NOT NULL DEFAULT 'active',
	`risk_level` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`detected_at` timestamp NOT NULL,
	`knowledge_at` timestamp NOT NULL,
	`closed_at` timestamp,
	`current_phase_id` int NOT NULL DEFAULT 1,
	`phases` json NOT NULL,
	`triage_answers` json,
	`triage_result` json,
	`deadlines` json,
	`assigned_dpo_id` int,
	`assigned_team_ids` json,
	`affected_data_categories` json,
	`estimated_affected_titulars` int,
	`data_processor_involved` tinyint DEFAULT 0,
	`anpd_communication_id` varchar(100),
	`anpd_communication_sent_at` timestamp,
	`titular_communication_sent_at` timestamp,
	`tags` json,
	`external_references` json,
	`attachments` json,
	`created_by_id` int NOT NULL,
	`ticket_id` int,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ir_acts` (
	`id` varchar(36) NOT NULL,
	`caseId` varchar(36) NOT NULL,
	`actType` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`actDate` timestamp NOT NULL,
	`recordedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ir_acts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ir_cases` (
	`id` varchar(36) NOT NULL,
	`incidentId` varchar(36) NOT NULL,
	`caseNumber` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('aberto','em_analise','em_decisao','finalizado','arquivado') NOT NULL DEFAULT 'aberto',
	`cisStatus` enum('nao_iniciado','rascunho','em_analise','finalizado') NOT NULL DEFAULT 'nao_iniciado',
	`cisInitialDeadline` timestamp,
	`cisFinalDeadline` timestamp,
	`doubleDeadlineApplied` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ir_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `ir_cases_caseNumber_unique` UNIQUE(`caseNumber`)
);
--> statement-breakpoint
CREATE TABLE `ir_cis_document_versions` (
	`id` varchar(36) NOT NULL,
	`caseId` varchar(36) NOT NULL,
	`versionStatus` enum('rascunho','em_analise','finalizado','enviado') NOT NULL DEFAULT 'rascunho',
	`content` text,
	`affectedDataTypes` text,
	`affectedIndividuals` varchar(50),
	`riskAssessment` text,
	`mitigationMeasures` text,
	`aiDraft` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `ir_cis_document_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ir_cis_documents` (
	`id` varchar(36) NOT NULL,
	`caseId` varchar(36) NOT NULL,
	`content` json,
	`status` enum('rascunho','em_revisao','finalizado','enviado') NOT NULL DEFAULT 'rascunho',
	`generatedAt` timestamp,
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ir_cis_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `ir_cis_documents_caseId_unique` UNIQUE(`caseId`)
);
--> statement-breakpoint
CREATE TABLE `ir_deadlines` (
	`id` varchar(36) NOT NULL,
	`caseId` varchar(36) NOT NULL,
	`category` varchar(50) NOT NULL,
	`dueDate` timestamp NOT NULL,
	`status` enum('pendente','em_alerta','vencido','cumprido') NOT NULL DEFAULT 'pendente',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ir_deadlines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ir_evidences` (
	`id` varchar(36) NOT NULL,
	`caseId` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`documentId` int,
	`storageUrl` varchar(500),
	`status` enum('pendente','coletada','analisada','arquivada') NOT NULL DEFAULT 'pendente',
	`collectedAt` timestamp,
	`collectedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ir_evidences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ir_incidents` (
	`id` varchar(36) NOT NULL,
	`organizationId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`incidentType` varchar(100),
	`severity` enum('baixa','media','alta','critica'),
	`discoveryDate` timestamp,
	`reportedBy` int,
	`stage` int NOT NULL DEFAULT 0,
	`status` enum('aberto','em_investigacao','resolvido','encerrado') NOT NULL DEFAULT 'aberto',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ir_incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ir_sanctions` (
	`id` varchar(36) NOT NULL,
	`caseId` varchar(36) NOT NULL,
	`gravity` varchar(50),
	`damageLevel` varchar(50),
	`sanctionType` varchar(100),
	`fineAmount` decimal(15,2),
	`appliedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ir_sanctions_id` PRIMARY KEY(`id`),
	CONSTRAINT `ir_sanctions_caseId_unique` UNIQUE(`caseId`)
);
--> statement-breakpoint
CREATE TABLE `ir_tacs` (
	`id` varchar(36) NOT NULL,
	`caseId` varchar(36) NOT NULL,
	`obligations` text,
	`deadline` timestamp,
	`terms` text,
	`status` enum('pendente','assinado','cumprido') DEFAULT 'pendente',
	`signedAt` timestamp,
	`fulfilledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ir_tacs_id` PRIMARY KEY(`id`),
	CONSTRAINT `ir_tacs_caseId_unique` UNIQUE(`caseId`)
);
--> statement-breakpoint
CREATE TABLE `lgpd_clause_template_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`organizationId` int,
	`previousContent` text NOT NULL,
	`newContent` text NOT NULL,
	`changedBy` int NOT NULL,
	`changeReason` text,
	`version` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `lgpd_clause_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int,
	`templateId` varchar(50) NOT NULL,
	`templateName` varchar(255) NOT NULL,
	`templateDescription` text,
	`content` text NOT NULL,
	`variables` text,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`version` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `mapeamento_areas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`contextId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isCustom` tinyint DEFAULT 0,
	`isActive` tinyint DEFAULT 1,
	`responsibleName` varchar(255),
	`responsibleEmail` varchar(255),
	`responsiblePhone` varchar(50),
	`processCount` int DEFAULT 0,
	`completedProcessCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `mapeamento_contexts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`segment` varchar(100) NOT NULL,
	`businessType` varchar(100) NOT NULL,
	`employeesRange` varchar(50),
	`unitsCount` int DEFAULT 1,
	`hasDataProtectionOfficer` tinyint DEFAULT 0,
	`dataProtectionOfficerName` varchar(255),
	`dataProtectionOfficerEmail` varchar(255),
	`status` enum('em_andamento','concluido') NOT NULL DEFAULT 'em_andamento',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `mapeamento_ged_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rot_id` int NOT NULL,
	`ged_document_id` int NOT NULL,
	`document_type` varchar(50) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`is_latest` tinyint NOT NULL DEFAULT 1,
	`generated_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`generated_by_id` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `mapeamento_processes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`areaId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`purpose` text,
	`isAiGenerated` tinyint DEFAULT 0,
	`isActive` tinyint DEFAULT 1,
	`orderIndex` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `mapeamento_respondents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`areaId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`phone` varchar(50),
	`role` varchar(100),
	`inviteToken` varchar(64),
	`inviteSentAt` timestamp,
	`inviteExpiresAt` timestamp,
	`status` enum('pendente','convidado','em_andamento','concluiu') NOT NULL DEFAULT 'pendente',
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `mapeamento_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`respondentId` int NOT NULL,
	`processId` int NOT NULL,
	`rotId` int,
	`dataCategories` json,
	`titularCategories` json,
	`legalBase` varchar(255),
	`sharing` json,
	`consentObtained` tinyint DEFAULT 0,
	`retentionPeriod` varchar(100),
	`storageLocation` varchar(255),
	`securityMeasures` json,
	`internationalTransfer` tinyint DEFAULT 0,
	`internationalCountries` json,
	`riskLevel` enum('baixa','media','alta','extrema'),
	`riskScore` decimal(5,2),
	`requiresAction` tinyint DEFAULT 0,
	`notes` text,
	`completed` tinyint DEFAULT 0,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `mapeamento_review_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`reviewPeriodDays` int NOT NULL DEFAULT 365,
	`alertDaysBefore` int DEFAULT 30,
	`sendEmailAlerts` tinyint NOT NULL DEFAULT 1,
	`defaultReviewerId` int,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mapeamento_review_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mapeamento_review_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`organizationId` int NOT NULL,
	`mapeamentoType` enum('rot','processo','area') NOT NULL,
	`mapeamentoId` int NOT NULL,
	`reviewedById` int NOT NULL,
	`reviewedAt` timestamp NOT NULL,
	`reviewResult` enum('approved','updated','archived','flagged') NOT NULL,
	`notes` text,
	`changesDescription` text,
	`previousState` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `mapeamento_review_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mapeamento_review_schedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`mapeamentoType` enum('rot','processo','area') NOT NULL,
	`mapeamentoId` int NOT NULL,
	`lastReviewDate` timestamp,
	`nextReviewDate` timestamp NOT NULL,
	`status` enum('scheduled','pending','overdue','completed','skipped') NOT NULL DEFAULT 'scheduled',
	`reviewerId` int,
	`alertsSent` int DEFAULT 0,
	`lastAlertSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mapeamento_review_schedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meudpo_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`slaUrgentHours` int NOT NULL DEFAULT 24,
	`slaPrioritarioHours` int NOT NULL DEFAULT 48,
	`slaPadraoHours` int NOT NULL DEFAULT 120,
	`notifyOnCreate` tinyint NOT NULL DEFAULT 1,
	`notifyOnUpdate` tinyint NOT NULL DEFAULT 1,
	`notifyOnResolve` tinyint NOT NULL DEFAULT 1,
	`autoReportFrequency` enum('diario','semanal','mensal','desativado') NOT NULL DEFAULT 'semanal',
	`autoReportRecipients` json,
	`customCategories` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`slaCritica` int DEFAULT 4,
	`slaAlta` int DEFAULT 8,
	`slaMedia` int DEFAULT 24,
	`slaBaixa` int DEFAULT 72,
	`notifyOnComment` tinyint DEFAULT 1,
	`notifySlaWarning` tinyint DEFAULT 1,
	`slaWarningThreshold` int DEFAULT 80,
	`autoReportEnabled` tinyint DEFAULT 0,
	`reportRecipients` json,
	`autoAssignEnabled` tinyint DEFAULT 0,
	`autoAssignRules` json
);
--> statement-breakpoint
CREATE TABLE `notification_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int,
	`userId` int,
	`type` enum('sla_alert','sla_summary','ticket_created','ticket_updated','ticket_assigned','deadline_warning','system','email','owner') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`channel` enum('app','email','owner_notification') NOT NULL DEFAULT 'app',
	`status` enum('pending','sent','failed','read') NOT NULL DEFAULT 'pending',
	`metadata` json,
	`errorMessage` text,
	`sentAt` timestamp,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int,
	`type` enum('assessment_completed','risk_critical','action_due','action_overdue','document_added','assessment_responded','task_assigned','task_due_reminder','contract_analysis_complete','invitation_received','system','ticket_created','ticket_updated','ticket_comment','ticket_resolved','ticket_assigned','sla_warning','sla_breach','report_ready') NOT NULL DEFAULT 'system',
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`isRead` tinyint NOT NULL DEFAULT 0,
	`entityType` varchar(50),
	`entityId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`notificationType` varchar(50),
	`link` varchar(500),
	`readAt` timestamp,
	`sentViaEmail` tinyint NOT NULL DEFAULT 0,
	`emailSentAt` timestamp
);
--> statement-breakpoint
CREATE TABLE `organization_service_slas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organization_id` int NOT NULL,
	`service_item_id` int NOT NULL,
	`custom_sla_hours` int,
	`custom_legal_deadline_days` int,
	`is_enabled` tinyint NOT NULL DEFAULT 1,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_service_slas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`tradeName` varchar(255) NOT NULL,
	`cnpj` varchar(18),
	`email` varchar(320),
	`phone` varchar(20),
	`address` text,
	`street` varchar(255),
	`number` varchar(20),
	`complement` varchar(255),
	`neighborhood` varchar(100),
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`logoUrl` text,
	`primaryColor` varchar(7) DEFAULT '#5f29cc',
	`secondaryColor` varchar(7) DEFAULT '#0ea5e9',
	`isActive` tinyint NOT NULL DEFAULT 1,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `reminder_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessLinkId` int NOT NULL,
	`organizationId` int NOT NULL,
	`thirdPartyId` int NOT NULL,
	`reminderNumber` int NOT NULL DEFAULT 1,
	`sentAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`status` enum('sent','failed','skipped') NOT NULL DEFAULT 'sent',
	`errorMessage` text
);
--> statement-breakpoint
CREATE TABLE `reminder_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`isEnabled` tinyint NOT NULL DEFAULT 1,
	`daysAfterSent` int NOT NULL DEFAULT 7,
	`maxReminders` int NOT NULL DEFAULT 3,
	`reminderInterval` int NOT NULL DEFAULT 7,
	`lastProcessedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `response_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int,
	`createdById` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100),
	`ticketType` varchar(50),
	`isGlobal` tinyint NOT NULL DEFAULT 0,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ua_result_release` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`releasedByConsultantId` int NOT NULL,
	`releasedAt` timestamp NOT NULL,
	`releasedToRoles` json NOT NULL DEFAULT ('["sponsor"]'),
	`actionPlanIncluded` tinyint NOT NULL DEFAULT 1,
	`radarChartIncluded` tinyint NOT NULL DEFAULT 1,
	`riskMatrixIncluded` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `ua_result_release_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ripd_evidences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ripdId` int NOT NULL,
	`organizationId` int NOT NULL,
	`questionId` int,
	`riskId` int,
	`mitigationId` int,
	`gedDocumentId` int NOT NULL,
	`evidenceType` enum('documento','captura_tela','log_sistema','declaracao','certificado','outro') DEFAULT 'documento',
	`tags` json,
	`uploadedByUserId` int NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `ripd_evidences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_action_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`analysisId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` enum('baixa','media','alta','critica') NOT NULL,
	`assigneeId` int,
	`assigneeRole` enum('dpo','titular','consultor','admin'),
	`dueDate` timestamp,
	`estimatedEffortHours` int,
	`status` enum('pendente','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'pendente',
	`completedAt` timestamp,
	`completedById` int,
	`evidence` text,
	`evidenceFileKey` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `risk_analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`sourceType` enum('rot','response','manual') NOT NULL,
	`sourceId` int,
	`riskLevel` enum('baixa','media','alta','extrema') NOT NULL,
	`riskScore` decimal(5,2),
	`riskFactors` json,
	`analyzedById` int,
	`analyzedAt` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`aiAnalysis` json,
	`status` enum('pendente','em_tratamento','mitigado','aceito') NOT NULL DEFAULT 'pendente',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ua_risk_analysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`domainId` varchar(20) NOT NULL,
	`questionId` varchar(20) NOT NULL,
	`riskLevel` enum('baixa','media','alta','critica') NOT NULL,
	`probability` int,
	`impact` int,
	`severity` int,
	`referencedNorms` json NOT NULL DEFAULT ('[]'),
	`mitigation` text,
	`editedByConsultant` tinyint NOT NULL DEFAULT 0,
	`editedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ua_risk_analysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ua_risk_matrix` (
	`id` int AUTO_INCREMENT NOT NULL,
	`riskAnalysisId` int NOT NULL,
	`domainId` varchar(20) NOT NULL,
	`lgpdArticles` varchar(500),
	`isoControls` varchar(500),
	`nistFramework` varchar(500),
	`riskDescription` text NOT NULL,
	`severity` enum('baixa','media','alta','critica') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ua_risk_matrix_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rot_operations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`department` varchar(100),
	`titularCategory` varchar(100) NOT NULL,
	`dataCategories` json NOT NULL,
	`purpose` text NOT NULL,
	`legalBase` varchar(255) NOT NULL,
	`requiresConsent` tinyint NOT NULL,
	`alternativeBases` json,
	`risksIfNoConsent` json,
	`justification` text,
	`aiAnalysis` json,
	`aiGeneratedAt` timestamp,
	`popFileKey` varchar(255),
	`rotFileKey` varchar(255),
	`status` enum('rascunho','em_revisao','aprovado','arquivado') NOT NULL DEFAULT 'rascunho',
	`approvedById` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `rot_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rotId` int NOT NULL,
	`assigneeId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`dueDate` timestamp,
	`priority` enum('baixa','media','alta','critica') NOT NULL,
	`completed` tinyint DEFAULT 0,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `sd_areas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`areaId` varchar(36) NOT NULL,
	`tenantId` int NOT NULL,
	`areaName` varchar(255) NOT NULL,
	`description` text,
	`parentAreaId` int,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sd_areas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sd_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(36) NOT NULL,
	`tenantId` int NOT NULL,
	`module` enum('checklist','cppd','dpia','contratos','mapeamentos','terceiros','incidentes') NOT NULL,
	`eventType` enum('tarefa','reuniao','treinamento','dpia','contrato_risco','mapeamento_area','terceiro','incidente') NOT NULL,
	`riskLevel` enum('baixo','medio','alto'),
	`areaId` int,
	`entityId` int,
	`entityType` varchar(50),
	`expectedDate` date,
	`startDate` date,
	`endDate` date,
	`status` enum('programado','em_andamento','pendente','concluido','bloqueado') NOT NULL DEFAULT 'programado',
	`conformity` enum('conforme','parcialmente_conforme','nao_conforme'),
	`plannedFlag` tinyint NOT NULL DEFAULT 1,
	`executedFlag` tinyint NOT NULL DEFAULT 0,
	`evidenceLink` text,
	`evidenceDocumentId` int,
	`responsibleId` int,
	`metadata` json,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sd_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sd_indicator_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`indicatorId` varchar(50) NOT NULL,
	`module` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`formula` varchar(255) NOT NULL,
	`cutoff` decimal(5,2),
	`cutoffDays` int,
	`windowDays` int DEFAULT 90,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`weight` decimal(3,2) DEFAULT '1.00',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sd_indicator_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `sd_indicator_config_indicatorId_unique` UNIQUE(`indicatorId`)
);
--> statement-breakpoint
CREATE TABLE `sd_indicator_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`indicatorId` varchar(50) NOT NULL,
	`calculatedValue` decimal(5,4),
	`cutoff` decimal(5,2),
	`passed` tinyint,
	`windowStart` date,
	`windowEnd` date,
	`eventsCount` int,
	`metadata` json,
	`calculatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `sd_indicator_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sd_maturity_decision_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`previousStage` int NOT NULL,
	`newStage` int NOT NULL,
	`decisionDate` timestamp NOT NULL,
	`approvedById` int NOT NULL,
	`justification` text,
	`evidenceLinks` json,
	`indicatorSnapshot` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `sd_maturity_decision_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sd_maturity_stage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`currentStage` int NOT NULL DEFAULT 1,
	`previousStage` int,
	`lastUpdated` date,
	`lastEvaluatedAt` timestamp,
	`nextEvaluationAt` timestamp,
	`suggestedPromotion` tinyint DEFAULT 0,
	`promotionBlockedReason` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sd_maturity_stage_id` PRIMARY KEY(`id`),
	CONSTRAINT `sd_maturity_stage_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `service_catalog_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(10) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(7) NOT NULL,
	`icon` varchar(50),
	`display_order` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_catalog_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_catalog_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`block_id` int NOT NULL,
	`code` varchar(20) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sla_hours` int NOT NULL,
	`legal_deadline_days` int,
	`deliverable` varchar(255),
	`priority` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`requires_approval` tinyint NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`display_order` int NOT NULL DEFAULT 0,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_catalog_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seusdados_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`questionCode` varchar(20) NOT NULL,
	`selectedOptionCode` varchar(20) NOT NULL,
	`selectedLevel` int NOT NULL,
	`observations` text,
	`evidence` json NOT NULL DEFAULT ('{}'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seusdados_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seusdados_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('rascunho','em_andamento','concluida','arquivada') NOT NULL DEFAULT 'rascunho',
	`overallScoreAvg` decimal(5,2),
	`overallLevelRounded` int,
	`totalQuestions` int DEFAULT 39,
	`answeredQuestions` int DEFAULT 0,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seusdados_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seusdados_domain_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`domainCode` varchar(50) NOT NULL,
	`scoreAvg` decimal(5,2) NOT NULL,
	`levelRounded` int NOT NULL,
	`answeredQuestions` int NOT NULL,
	`totalQuestions` int NOT NULL,
	`distribution` json NOT NULL DEFAULT ('{"l1":0,"l2":0,"l3":0,"l4":0,"l5":0}'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seusdados_domain_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seusdados_domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`label` varchar(255) NOT NULL,
	`weight` decimal(3,2) NOT NULL DEFAULT '1.00',
	`order` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `seusdados_domains_id` PRIMARY KEY(`id`),
	CONSTRAINT `seusdados_domains_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `seusdados_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionCode` varchar(20) NOT NULL,
	`optionCode` varchar(20) NOT NULL,
	`level` int NOT NULL,
	`label` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `seusdados_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seusdados_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(20) NOT NULL,
	`domainCode` varchar(50) NOT NULL,
	`idx` int NOT NULL,
	`prompt` text NOT NULL,
	`frameworkTags` json NOT NULL DEFAULT ('[]'),
	`frameworkMetadata` json NOT NULL DEFAULT ('{}'),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `seusdados_questions_id` PRIMARY KEY(`id`),
	CONSTRAINT `seusdados_questions_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `simulation_checklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`simulationId` int NOT NULL,
	`organizationId` int NOT NULL,
	`category` varchar(100) NOT NULL,
	`item` text NOT NULL,
	`isCompleted` tinyint NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`completedBy` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `simulation_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`simulationId` int NOT NULL,
	`organizationId` int NOT NULL,
	`timestamp` timestamp NOT NULL,
	`phase` varchar(50) NOT NULL,
	`description` text NOT NULL,
	`decisionMaker` varchar(255) NOT NULL,
	`decisionType` enum('operational','strategic','communication') NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `simulation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`simulationId` int NOT NULL,
	`organizationId` int NOT NULL,
	`timestamp` timestamp NOT NULL,
	`phase` varchar(50) NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`severity` enum('baixa','media','alta','critica') NOT NULL,
	`isRead` tinyint NOT NULL DEFAULT 0,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `simulation_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`simulationId` int NOT NULL,
	`organizationId` int NOT NULL,
	`participantId` int NOT NULL,
	`participantRole` varchar(100) NOT NULL,
	`clarityScore` int NOT NULL,
	`communicationScore` int NOT NULL,
	`toolsScore` int NOT NULL,
	`strengths` text,
	`weaknesses` text,
	`suggestions` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `simulation_kpis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`unit` varchar(50) NOT NULL,
	`targetValue` decimal(10,2),
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `simulation_scenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`tipoIncidente` varchar(100) NOT NULL,
	`descricao` text NOT NULL,
	`areasEnvolvidas` json NOT NULL,
	`sistemasAfetados` json NOT NULL,
	`objetivos` json NOT NULL,
	`papeisChave` json NOT NULL,
	`criteriosSucesso` json NOT NULL,
	`trimestre` varchar(20),
	`isTemplate` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `simulation_stakeholders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(100) NOT NULL,
	`department` varchar(100),
	`contactEmail` varchar(255),
	`contactPhone` varchar(50),
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `simulations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`scenarioId` int NOT NULL,
	`createdById` int NOT NULL,
	`scenarioName` varchar(255) NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp,
	`status` enum('planejada','em_andamento','pausada','concluida','cancelada') NOT NULL DEFAULT 'planejada',
	`phaseTimings` json NOT NULL,
	`kpiValues` json NOT NULL,
	`playbookAdherence` int DEFAULT 0,
	`recordsCompleteness` int DEFAULT 0,
	`participants` json,
	`quarter` varchar(20),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `sla_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`ticketId` int NOT NULL,
	`slaLevel` enum('padrao','prioritario','urgente') NOT NULL,
	`deadline` timestamp NOT NULL,
	`resolvedAt` timestamp,
	`slaMetHours` int,
	`slaMet` tinyint,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `third_parties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`tradeName` varchar(255),
	`cnpj` varchar(18),
	`type` enum('fornecedor','parceiro','suboperador','outro') NOT NULL DEFAULT 'fornecedor',
	`category` varchar(100),
	`contactName` varchar(255),
	`contactEmail` varchar(320),
	`contactPhone` varchar(20),
	`address` text,
	`description` text,
	`riskLevel` enum('baixo','moderado','alto','critico'),
	`lastAssessmentDate` timestamp,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`contactWhatsapp` varchar(20),
	`managerArea` varchar(255),
	`contractType` varchar(100)
);
--> statement-breakpoint
CREATE TABLE `third_party_access_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`thirdPartyId` int NOT NULL,
	`assessmentId` int,
	`token` varchar(64) NOT NULL,
	`status` enum('ativo','expirado','usado','cancelado') NOT NULL DEFAULT 'ativo',
	`expiresAt` timestamp,
	`usedAt` timestamp,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `third_party_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`thirdPartyId` int NOT NULL,
	`createdById` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('rascunho','em_andamento','concluida','arquivada') NOT NULL DEFAULT 'rascunho',
	`overallRiskScore` int,
	`riskClassification` enum('baixo','moderado','alto','critico'),
	`totalQuestions` int DEFAULT 0,
	`answeredQuestions` int DEFAULT 0,
	`recommendation` text,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `third_party_link_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accessLinkId` int NOT NULL,
	`assessmentId` int NOT NULL,
	`questionId` int NOT NULL,
	`selectedLevel` int NOT NULL,
	`impactScore` int NOT NULL,
	`probabilityScore` int NOT NULL,
	`riskScore` int NOT NULL,
	`notes` text,
	`evidenceUrls` json,
	`responderName` varchar(120),
	`responderEmail` varchar(255),
	`responderRole` varchar(80),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tplr_accessLinkId_question_unique` UNIQUE(`accessLinkId`,`questionId`)
);
--> statement-breakpoint
CREATE TABLE `third_party_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`questionId` int NOT NULL,
	`selectedLevel` int NOT NULL,
	`impactScore` int NOT NULL,
	`probabilityScore` int NOT NULL,
	`riskScore` int NOT NULL,
	`notes` text,
	`evidenceUrls` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ticket_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`comment_id` int,
	`organizationId` int NOT NULL,
	`uploadedById` int NOT NULL,
	`filename` varchar(255) NOT NULL,
	`originalFilename` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int NOT NULL,
	`storageUrl` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `ticket_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`actorId` int,
	`actorRole` varchar(50),
	`payloadJson` json,
	`prevHash` varchar(64),
	`entryHash` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `ticket_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`eventType` enum('deadline','reminder','meeting','followup') NOT NULL DEFAULT 'deadline',
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`externalCalendarType` enum('google','outlook'),
	`externalEventId` varchar(255),
	`reminderMinutes` int DEFAULT 30,
	`reminderSent` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ticket_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`organizationId` int NOT NULL,
	`authorId` int NOT NULL,
	`authorRole` enum('cliente','consultor','advogado','dpo','admin') NOT NULL,
	`content` text NOT NULL,
	`isInternal` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `ticket_escalations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`fromUserId` int,
	`toUserId` int NOT NULL,
	`reason` varchar(255) NOT NULL,
	`escalationType` enum('sla_warning','sla_breach','manual','priority_change') NOT NULL,
	`previousPriority` varchar(20),
	`newPriority` varchar(20),
	`notifiedAt` timestamp,
	`acknowledgedAt` timestamp,
	`acknowledgedById` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `ticket_tag_associations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `ticket_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#6366f1',
	`description` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_number` int,
	`organizationId` int NOT NULL,
	`createdById` int NOT NULL,
	`assignedToId` int,
	`clientId` int,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`ticketType` enum('solicitacao_titular','incidente_seguranca','duvida_juridica','consultoria_geral','auditoria','treinamento','documentacao') NOT NULL,
	`priority` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`status` enum('novo','em_analise','aguardando_cliente','aguardando_terceiro','resolvido','cancelado') NOT NULL DEFAULT 'novo',
	`slaLevel` enum('padrao','prioritario','urgente') NOT NULL DEFAULT 'padrao',
	`deadline` timestamp,
	`resolvedAt` timestamp,
	`resolution` text,
	`legalBasis` varchar(255),
	`applicableArticles` json,
	`sourceContext` json,
	`metadata` json,
	`incident_id` int,
	`service_catalog_item_id` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_ticket_number_unique` UNIQUE(`ticket_number`)
);
--> statement-breakpoint
CREATE TABLE `titular_instances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`titularName` varchar(255) NOT NULL,
	`titularEmail` varchar(255),
	`titularDocument` varchar(50),
	`titularCategory` varchar(100),
	`processId` int NOT NULL,
	`responseId` int,
	`systemName` varchar(100) NOT NULL,
	`databaseTable` varchar(100),
	`legalBasis` varchar(255),
	`purpose` varchar(500),
	`sharing` json,
	`retentionPeriod` varchar(100),
	`dataCategories` json,
	`hasSensitiveData` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `ua_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`assessmentCode` varchar(20) NOT NULL,
	`framework` enum('seusdados','conformidade_lgpd','misto','sgd','ico','cnil') NOT NULL DEFAULT 'seusdados',
	`status` enum('programada','iniciada','concluida','arquivada') NOT NULL DEFAULT 'programada',
	`deadline` timestamp NOT NULL,
	`defaultDeadlineDays` int NOT NULL DEFAULT 15,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ua_assessments_id` PRIMARY KEY(`id`),
	CONSTRAINT `ua_assessments_assessmentCode_unique` UNIQUE(`assessmentCode`)
);
--> statement-breakpoint
CREATE TABLE `user_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255),
	`token` varchar(100) NOT NULL,
	`role` enum('admin','consultor','usuario') NOT NULL DEFAULT 'usuario',
	`organizationId` int,
	`invitedById` int NOT NULL,
	`status` enum('pending','accepted','expired','cancelled') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`emailSentAt` timestamp,
	`emailSentCount` int NOT NULL DEFAULT 0,
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `user_organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`accessLevel` enum('viewer','editor','admin') NOT NULL DEFAULT 'viewer',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailNotifications` tinyint NOT NULL DEFAULT 1,
	`pushNotifications` tinyint NOT NULL DEFAULT 1,
	`notifyAvaliacoes` tinyint NOT NULL DEFAULT 1,
	`notifyTickets` tinyint NOT NULL DEFAULT 1,
	`notifyReunioes` tinyint NOT NULL DEFAULT 1,
	`showAutoSelectToast` tinyint NOT NULL DEFAULT 1,
	`showManualSelectToast` tinyint NOT NULL DEFAULT 1,
	`showClearSelectToast` tinyint NOT NULL DEFAULT 1,
	`theme` enum('light','dark','system') NOT NULL DEFAULT 'system',
	`language` varchar(10) NOT NULL DEFAULT 'pt-BR',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin_global','pmo','consultor','consultor_par','sponsor','dpo_interno','comite','usuario','terceiro') NOT NULL DEFAULT 'usuario';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` tinyint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `temporary_password` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `password_expires_at` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `must_change_password` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` varchar(255);--> statement-breakpoint
CREATE INDEX `access_links_token_unique` ON `access_links` (`token`);--> statement-breakpoint
CREATE INDEX `action_plan_evidence_actionPlanId_idx` ON `action_plan_evidence` (`actionPlanId`);--> statement-breakpoint
CREATE INDEX `action_plan_assessment_idx` ON `ua_action_plan` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `action_plan_domain_idx` ON `ua_action_plan` (`domainId`);--> statement-breakpoint
CREATE INDEX `assessment_assignments_assessment_idx` ON `ua_assignments` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `assessment_assignments_user_idx` ON `ua_assignments` (`assignedToUserId`);--> statement-breakpoint
CREATE INDEX `assessment_assignments_status_idx` ON `ua_assignments` (`status`);--> statement-breakpoint
CREATE INDEX `evidence_status_assessment_idx` ON `ua_evidence_status` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `evidence_status_question_idx` ON `ua_evidence_status` (`questionId`);--> statement-breakpoint
CREATE INDEX `assessment_evidences_assessment_idx` ON `ua_evidences` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `assessment_evidences_response_idx` ON `ua_evidences` (`responseId`);--> statement-breakpoint
CREATE INDEX `assessment_evidences_question_idx` ON `ua_evidences` (`questionId`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `ua_notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_assessment_idx` ON `ua_notifications` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `notifications_type_idx` ON `ua_notifications` (`type`);--> statement-breakpoint
CREATE INDEX `assessment_responses_assessment_idx` ON `ua_responses` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `assessment_responses_question_idx` ON `ua_responses` (`questionId`);--> statement-breakpoint
CREATE INDEX `assessment_results_assessment_idx` ON `ua_results` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `assessment_results_status_idx` ON `ua_results` (`status`);--> statement-breakpoint
CREATE INDEX `clause_annotations_analysis_idx` ON `clause_annotations` (`analysisId`);--> statement-breakpoint
CREATE INDEX `clause_annotations_clause_idx` ON `clause_annotations` (`clauseId`);--> statement-breakpoint
CREATE INDEX `clause_annotations_author_idx` ON `clause_annotations` (`authorId`);--> statement-breakpoint
CREATE INDEX `clause_annotations_type_idx` ON `clause_annotations` (`annotationType`);--> statement-breakpoint
CREATE INDEX `clause_audit_log_analysisId_idx` ON `clause_audit_log` (`analysisId`);--> statement-breakpoint
CREATE INDEX `clause_audit_log_userId_idx` ON `clause_audit_log` (`userId`);--> statement-breakpoint
CREATE INDEX `clause_comments_analysis_idx` ON `clause_comments` (`analysisId`);--> statement-breakpoint
CREATE INDEX `clause_comments_clause_idx` ON `clause_comments` (`clauseId`);--> statement-breakpoint
CREATE INDEX `clause_comments_author_idx` ON `clause_comments` (`authorId`);--> statement-breakpoint
CREATE INDEX `clause_comments_parent_idx` ON `clause_comments` (`parentCommentId`);--> statement-breakpoint
CREATE INDEX `clause_comments_resolved_idx` ON `clause_comments` (`isResolved`);--> statement-breakpoint
CREATE INDEX `comment_notif_user_idx` ON `comment_notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `comment_notif_read_idx` ON `comment_notifications` (`isRead`);--> statement-breakpoint
CREATE INDEX `comment_notif_analysis_idx` ON `comment_notifications` (`analysisId`);--> statement-breakpoint
CREATE INDEX `compliance_assignments_assessment_idx` ON `compliance_assignments` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `compliance_assignments_domain_idx` ON `compliance_assignments` (`domainId`);--> statement-breakpoint
CREATE INDEX `compliance_assignments_user_idx` ON `compliance_assignments` (`userId`);--> statement-breakpoint
CREATE INDEX `compliance_assignments_status_idx` ON `compliance_assignments` (`status`);--> statement-breakpoint
CREATE INDEX `compliance_domains_framework_idx` ON `compliance_domains` (`framework`);--> statement-breakpoint
CREATE INDEX `compliance_domains_order_idx` ON `compliance_domains` (`order`);--> statement-breakpoint
CREATE INDEX `compliance_framework_responses_assessment_idx` ON `compliance_framework_responses` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `compliance_framework_responses_question_idx` ON `compliance_framework_responses` (`questionId`);--> statement-breakpoint
CREATE INDEX `compliance_questions_framework_idx` ON `compliance_questions` (`framework`);--> statement-breakpoint
CREATE INDEX `compliance_questions_domain_idx` ON `compliance_questions` (`domainId`);--> statement-breakpoint
CREATE INDEX `compliance_questions_order_idx` ON `compliance_questions` (`order`);--> statement-breakpoint
CREATE INDEX `contract_analysis_clauses_analysisId_idx` ON `contract_analysis_clauses` (`analysisId`);--> statement-breakpoint
CREATE INDEX `contract_analysis_field_evidence_analysisId_idx` ON `contract_analysis_field_evidence` (`analysisId`);--> statement-breakpoint
CREATE INDEX `contract_analysis_field_evidence_fieldName_idx` ON `contract_analysis_field_evidence` (`fieldName`);--> statement-breakpoint
CREATE INDEX `contract_clause_versions_clauseId_idx` ON `contract_clause_versions` (`clauseId`);--> statement-breakpoint
CREATE INDEX `contract_clause_versions_analysisId_idx` ON `contract_clause_versions` (`analysisId`);--> statement-breakpoint
CREATE INDEX `cml_contract_idx` ON `contract_mapeamento_links` (`contractAnalysisId`);--> statement-breakpoint
CREATE INDEX `cml_context_idx` ON `contract_mapeamento_links` (`contextId`);--> statement-breakpoint
CREATE INDEX `cml_area_idx` ON `contract_mapeamento_links` (`areaId`);--> statement-breakpoint
CREATE INDEX `cml_process_idx` ON `contract_mapeamento_links` (`processId`);--> statement-breakpoint
CREATE INDEX `cml_response_idx` ON `contract_mapeamento_links` (`responseId`);--> statement-breakpoint
CREATE INDEX `cml_rot_idx` ON `contract_mapeamento_links` (`rotId`);--> statement-breakpoint
CREATE INDEX `cml_status_idx` ON `contract_mapeamento_links` (`linkStatus`);--> statement-breakpoint
CREATE INDEX `contract_share_tokens_token_idx` ON `contract_share_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `contract_share_tokens_analysisId_idx` ON `contract_share_tokens` (`analysisId`);--> statement-breakpoint
CREATE INDEX `cppd_doc_initiative_idx` ON `cppd_initiative_documents` (`initiativeId`);--> statement-breakpoint
CREATE INDEX `cppd_doc_document_idx` ON `cppd_initiative_documents` (`documentId`);--> statement-breakpoint
CREATE INDEX `cppd_task_initiative_idx` ON `cppd_initiative_tasks` (`initiativeId`);--> statement-breakpoint
CREATE INDEX `cppd_task_status_idx` ON `cppd_initiative_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `cppd_task_assigned_idx` ON `cppd_initiative_tasks` (`assignedToId`);--> statement-breakpoint
CREATE INDEX `cppd_init_org_idx` ON `cppd_initiatives` (`organizationId`);--> statement-breakpoint
CREATE INDEX `cppd_init_status_idx` ON `cppd_initiatives` (`status`);--> statement-breakpoint
CREATE INDEX `cppd_init_year_idx` ON `cppd_initiatives` (`year`);--> statement-breakpoint
CREATE INDEX `cppd_init_quarter_idx` ON `cppd_initiatives` (`quarter`);--> statement-breakpoint
CREATE INDEX `cppd_init_responsible_idx` ON `cppd_initiatives` (`responsibleId`);--> statement-breakpoint
CREATE INDEX `cppd_notif_org_idx` ON `cppd_overdue_notifications` (`organizationId`);--> statement-breakpoint
CREATE INDEX `cppd_notif_type_idx` ON `cppd_overdue_notifications` (`itemType`);--> statement-breakpoint
CREATE INDEX `cppd_notif_status_idx` ON `cppd_overdue_notifications` (`notificationStatus`);--> statement-breakpoint
CREATE INDEX `dsr_history_request_idx` ON `data_subject_request_history` (`requestId`);--> statement-breakpoint
CREATE INDEX `dsr_org_idx` ON `data_subject_requests` (`organizationId`);--> statement-breakpoint
CREATE INDEX `dsr_titular_name_idx` ON `data_subject_requests` (`titularName`);--> statement-breakpoint
CREATE INDEX `dsr_status_idx` ON `data_subject_requests` (`status`);--> statement-breakpoint
CREATE INDEX `dsr_type_idx` ON `data_subject_requests` (`requestType`);--> statement-breakpoint
CREATE INDEX `dsr_due_date_idx` ON `data_subject_requests` (`dueDate`);--> statement-breakpoint
CREATE INDEX `redistribution_assessment_idx` ON `ua_redistribution_requests` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `redistribution_status_idx` ON `ua_redistribution_requests` (`status`);--> statement-breakpoint
CREATE INDEX `dpa_approval_requests_analysisId_idx` ON `dpa_approval_requests` (`analysisId`);--> statement-breakpoint
CREATE INDEX `dpa_approval_requests_token_idx` ON `dpa_approval_requests` (`accessToken`);--> statement-breakpoint
CREATE INDEX `dpa_approval_requests_status_idx` ON `dpa_approval_requests` (`status`);--> statement-breakpoint
CREATE INDEX `dpa_approvals_analysisId_idx` ON `dpa_approvals` (`analysisId`);--> statement-breakpoint
CREATE INDEX `dpa_approvals_status_idx` ON `dpa_approvals` (`approvalStatus`);--> statement-breakpoint
CREATE INDEX `dpia_org_idx` ON `dpia_assessments` (`organizationId`);--> statement-breakpoint
CREATE INDEX `dpia_status_idx` ON `dpia_assessments` (`status`);--> statement-breakpoint
CREATE INDEX `dpia_risk_idx` ON `dpia_assessments` (`riskLevel`);--> statement-breakpoint
CREATE INDEX `dpia_source_idx` ON `dpia_assessments` (`sourceType`,`sourceId`);--> statement-breakpoint
CREATE INDEX `dpia_workflow_idx` ON `dpia_assessments` (`workflowStatus`);--> statement-breakpoint
CREATE INDEX `dpia_mitigations_dpia_idx` ON `dpia_mitigations` (`dpiaId`);--> statement-breakpoint
CREATE INDEX `dpia_mitigations_risk_idx` ON `dpia_mitigations` (`riskId`);--> statement-breakpoint
CREATE INDEX `dpia_mitigations_status_idx` ON `dpia_mitigations` (`status`);--> statement-breakpoint
CREATE INDEX `dpia_questions_category_idx` ON `dpia_questions` (`category`);--> statement-breakpoint
CREATE INDEX `dpia_questions_order_idx` ON `dpia_questions` (`displayOrder`);--> statement-breakpoint
CREATE INDEX `dpia_responses_dpia_idx` ON `dpia_responses` (`dpiaId`);--> statement-breakpoint
CREATE INDEX `dpia_responses_question_idx` ON `dpia_responses` (`questionId`);--> statement-breakpoint
CREATE INDEX `dpia_risks_dpia_idx` ON `dpia_risks` (`dpiaId`);--> statement-breakpoint
CREATE INDEX `dpia_risks_level_idx` ON `dpia_risks` (`riskLevel`);--> statement-breakpoint
CREATE INDEX `dpia_risks_status_idx` ON `dpia_risks` (`status`);--> statement-breakpoint
CREATE INDEX `email_logs_org_idx` ON `email_logs` (`organizationId`);--> statement-breakpoint
CREATE INDEX `email_logs_recipient_idx` ON `email_logs` (`recipientEmail`);--> statement-breakpoint
CREATE INDEX `email_logs_status_idx` ON `email_logs` (`status`);--> statement-breakpoint
CREATE INDEX `email_logs_type_idx` ON `email_logs` (`emailType`);--> statement-breakpoint
CREATE INDEX `email_logs_created_idx` ON `email_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `govbr_signatures_entity_idx` ON `govbr_digital_signatures` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `govbr_signatures_analysis_idx` ON `govbr_digital_signatures` (`analysisId`);--> statement-breakpoint
CREATE INDEX `govbr_signatures_status_idx` ON `govbr_digital_signatures` (`status`);--> statement-breakpoint
CREATE INDEX `govbr_signatures_signer_idx` ON `govbr_digital_signatures` (`signerCpf`);--> statement-breakpoint
CREATE INDEX `govbr_audit_signature_idx` ON `govbr_signature_audit_log` (`signatureId`);--> statement-breakpoint
CREATE INDEX `govbr_audit_action_idx` ON `govbr_signature_audit_log` (`action`);--> statement-breakpoint
CREATE INDEX `templateKey` ON `governanca_mes_templates` (`templateKey`);--> statement-breakpoint
CREATE INDEX `templateKey` ON `governanca_plano_anual_templates` (`templateKey`);--> statement-breakpoint
CREATE INDEX `incident_contacts_organization_idx` ON `incident_emergency_contacts` (`organization_id`);--> statement-breakpoint
CREATE INDEX `incident_logs_incident_idx` ON `incident_logs` (`incident_id`);--> statement-breakpoint
CREATE INDEX `incidents_organization_idx` ON `incidents` (`organization_id`);--> statement-breakpoint
CREATE INDEX `incidents_status_idx` ON `incidents` (`status`);--> statement-breakpoint
CREATE INDEX `incidents_knowledge_at_idx` ON `incidents` (`knowledge_at`);--> statement-breakpoint
CREATE INDEX `ir_acts_case_idx` ON `ir_acts` (`caseId`);--> statement-breakpoint
CREATE INDEX `ir_acts_actDate_idx` ON `ir_acts` (`actDate`);--> statement-breakpoint
CREATE INDEX `ir_cases_incident_idx` ON `ir_cases` (`incidentId`);--> statement-breakpoint
CREATE INDEX `ir_cases_status_idx` ON `ir_cases` (`status`);--> statement-breakpoint
CREATE INDEX `ir_cases_cisStatus_idx` ON `ir_cases` (`cisStatus`);--> statement-breakpoint
CREATE INDEX `ir_cis_doc_versions_case_idx` ON `ir_cis_document_versions` (`caseId`);--> statement-breakpoint
CREATE INDEX `ir_cis_doc_versions_status_idx` ON `ir_cis_document_versions` (`versionStatus`);--> statement-breakpoint
CREATE INDEX `ir_cis_doc_versions_createdAt_idx` ON `ir_cis_document_versions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `ir_cis_documents_case_idx` ON `ir_cis_documents` (`caseId`);--> statement-breakpoint
CREATE INDEX `ir_cis_documents_status_idx` ON `ir_cis_documents` (`status`);--> statement-breakpoint
CREATE INDEX `ir_deadlines_case_idx` ON `ir_deadlines` (`caseId`);--> statement-breakpoint
CREATE INDEX `ir_deadlines_dueDate_idx` ON `ir_deadlines` (`dueDate`);--> statement-breakpoint
CREATE INDEX `ir_deadlines_status_idx` ON `ir_deadlines` (`status`);--> statement-breakpoint
CREATE INDEX `ir_evidences_case_idx` ON `ir_evidences` (`caseId`);--> statement-breakpoint
CREATE INDEX `ir_evidences_status_idx` ON `ir_evidences` (`status`);--> statement-breakpoint
CREATE INDEX `ir_incidents_organization_idx` ON `ir_incidents` (`organizationId`);--> statement-breakpoint
CREATE INDEX `ir_incidents_status_idx` ON `ir_incidents` (`status`);--> statement-breakpoint
CREATE INDEX `ir_sanctions_case_idx` ON `ir_sanctions` (`caseId`);--> statement-breakpoint
CREATE INDEX `ir_tacs_case_idx` ON `ir_tacs` (`caseId`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `mapeamento_areas` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_context` ON `mapeamento_areas` (`contextId`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `mapeamento_contexts` (`organizationId`);--> statement-breakpoint
CREATE INDEX `mapeamento_ged_rot_idx` ON `mapeamento_ged_documents` (`rot_id`);--> statement-breakpoint
CREATE INDEX `mapeamento_ged_document_idx` ON `mapeamento_ged_documents` (`ged_document_id`);--> statement-breakpoint
CREATE INDEX `mapeamento_ged_type_idx` ON `mapeamento_ged_documents` (`document_type`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `mapeamento_processes` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_area` ON `mapeamento_processes` (`areaId`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `mapeamento_respondents` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_area` ON `mapeamento_respondents` (`areaId`);--> statement-breakpoint
CREATE INDEX `idx_token` ON `mapeamento_respondents` (`inviteToken`);--> statement-breakpoint
CREATE INDEX `inviteToken` ON `mapeamento_respondents` (`inviteToken`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `mapeamento_responses` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_respondent` ON `mapeamento_responses` (`respondentId`);--> statement-breakpoint
CREATE INDEX `idx_process` ON `mapeamento_responses` (`processId`);--> statement-breakpoint
CREATE INDEX `idx_rot` ON `mapeamento_responses` (`rotId`);--> statement-breakpoint
CREATE INDEX `review_config_org_idx` ON `mapeamento_review_config` (`organizationId`);--> statement-breakpoint
CREATE INDEX `review_history_schedule_idx` ON `mapeamento_review_history` (`scheduleId`);--> statement-breakpoint
CREATE INDEX `review_history_org_idx` ON `mapeamento_review_history` (`organizationId`);--> statement-breakpoint
CREATE INDEX `review_history_type_idx` ON `mapeamento_review_history` (`mapeamentoType`,`mapeamentoId`);--> statement-breakpoint
CREATE INDEX `review_schedule_org_idx` ON `mapeamento_review_schedule` (`organizationId`);--> statement-breakpoint
CREATE INDEX `review_schedule_type_idx` ON `mapeamento_review_schedule` (`mapeamentoType`,`mapeamentoId`);--> statement-breakpoint
CREATE INDEX `review_schedule_next_idx` ON `mapeamento_review_schedule` (`nextReviewDate`);--> statement-breakpoint
CREATE INDEX `review_schedule_status_idx` ON `mapeamento_review_schedule` (`status`);--> statement-breakpoint
CREATE INDEX `org_unique` ON `meudpo_settings` (`organizationId`);--> statement-breakpoint
CREATE INDEX `notification_history_org_idx` ON `notification_history` (`organizationId`);--> statement-breakpoint
CREATE INDEX `notification_history_user_idx` ON `notification_history` (`userId`);--> statement-breakpoint
CREATE INDEX `notification_history_type_idx` ON `notification_history` (`type`);--> statement-breakpoint
CREATE INDEX `notification_history_status_idx` ON `notification_history` (`status`);--> statement-breakpoint
CREATE INDEX `org_service_slas_org_idx` ON `organization_service_slas` (`organization_id`);--> statement-breakpoint
CREATE INDEX `org_service_slas_service_idx` ON `organization_service_slas` (`service_item_id`);--> statement-breakpoint
CREATE INDEX `organizations_cnpj_unique` ON `organizations` (`cnpj`);--> statement-breakpoint
CREATE INDEX `reminder_settings_organizationId_unique` ON `reminder_settings` (`organizationId`);--> statement-breakpoint
CREATE INDEX `result_release_assessment_idx` ON `ua_result_release` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `ripd_evidences_ripd_idx` ON `ripd_evidences` (`ripdId`);--> statement-breakpoint
CREATE INDEX `ripd_evidences_org_idx` ON `ripd_evidences` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `risk_action_plans` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_analysis` ON `risk_action_plans` (`analysisId`);--> statement-breakpoint
CREATE INDEX `idx_assignee` ON `risk_action_plans` (`assigneeId`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `risk_action_plans` (`status`);--> statement-breakpoint
CREATE INDEX `idx_org` ON `risk_analyses` (`organizationId`);--> statement-breakpoint
CREATE INDEX `idx_source` ON `risk_analyses` (`sourceType`,`sourceId`);--> statement-breakpoint
CREATE INDEX `risk_analysis_assessment_idx` ON `ua_risk_analysis` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `risk_analysis_domain_idx` ON `ua_risk_analysis` (`domainId`);--> statement-breakpoint
CREATE INDEX `risk_matrix_analysis_idx` ON `ua_risk_matrix` (`riskAnalysisId`);--> statement-breakpoint
CREATE INDEX `risk_matrix_domain_idx` ON `ua_risk_matrix` (`domainId`);--> statement-breakpoint
CREATE INDEX `sd_areas_tenant_idx` ON `sd_areas` (`tenantId`);--> statement-breakpoint
CREATE INDEX `sd_events_tenant_idx` ON `sd_events` (`tenantId`);--> statement-breakpoint
CREATE INDEX `sd_events_module_idx` ON `sd_events` (`module`);--> statement-breakpoint
CREATE INDEX `sd_events_event_type_idx` ON `sd_events` (`eventType`);--> statement-breakpoint
CREATE INDEX `sd_events_status_idx` ON `sd_events` (`status`);--> statement-breakpoint
CREATE INDEX `sd_events_risk_idx` ON `sd_events` (`riskLevel`);--> statement-breakpoint
CREATE INDEX `sd_events_dates_idx` ON `sd_events` (`expectedDate`,`endDate`);--> statement-breakpoint
CREATE INDEX `sd_indicator_history_tenant_idx` ON `sd_indicator_history` (`tenantId`);--> statement-breakpoint
CREATE INDEX `sd_indicator_history_indicator_idx` ON `sd_indicator_history` (`indicatorId`);--> statement-breakpoint
CREATE INDEX `sd_indicator_history_date_idx` ON `sd_indicator_history` (`calculatedAt`);--> statement-breakpoint
CREATE INDEX `sd_maturity_log_tenant_idx` ON `sd_maturity_decision_log` (`tenantId`);--> statement-breakpoint
CREATE INDEX `sd_maturity_log_date_idx` ON `sd_maturity_decision_log` (`decisionDate`);--> statement-breakpoint
CREATE INDEX `sd_maturity_tenant_idx` ON `sd_maturity_stage` (`tenantId`);--> statement-breakpoint
CREATE INDEX `service_blocks_code_idx` ON `service_catalog_blocks` (`code`);--> statement-breakpoint
CREATE INDEX `service_items_block_idx` ON `service_catalog_items` (`block_id`);--> statement-breakpoint
CREATE INDEX `service_items_code_idx` ON `service_catalog_items` (`code`);--> statement-breakpoint
CREATE INDEX `seusdados_answers_assessment_idx` ON `seusdados_answers` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `seusdados_answers_question_idx` ON `seusdados_answers` (`questionCode`);--> statement-breakpoint
CREATE INDEX `seusdados_assessments_org_idx` ON `seusdados_assessments` (`organizationId`);--> statement-breakpoint
CREATE INDEX `seusdados_assessments_status_idx` ON `seusdados_assessments` (`status`);--> statement-breakpoint
CREATE INDEX `seusdados_domain_scores_assessment_idx` ON `seusdados_domain_scores` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `seusdados_domain_scores_domain_idx` ON `seusdados_domain_scores` (`domainCode`);--> statement-breakpoint
CREATE INDEX `seusdados_domains_code_idx` ON `seusdados_domains` (`code`);--> statement-breakpoint
CREATE INDEX `seusdados_domains_order_idx` ON `seusdados_domains` (`order`);--> statement-breakpoint
CREATE INDEX `seusdados_options_question_idx` ON `seusdados_options` (`questionCode`);--> statement-breakpoint
CREATE INDEX `seusdados_options_level_idx` ON `seusdados_options` (`level`);--> statement-breakpoint
CREATE INDEX `seusdados_questions_code_idx` ON `seusdados_questions` (`code`);--> statement-breakpoint
CREATE INDEX `seusdados_questions_domain_idx` ON `seusdados_questions` (`domainCode`);--> statement-breakpoint
CREATE INDEX `third_party_access_links_token_unique` ON `third_party_access_links` (`token`);--> statement-breakpoint
CREATE INDEX `tplr_assessmentId_idx` ON `third_party_link_responses` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `tplr_accessLinkId_idx` ON `third_party_link_responses` (`accessLinkId`);--> statement-breakpoint
CREATE INDEX `ticket_audit_log_ticket_idx` ON `ticket_audit_log` (`ticketId`);--> statement-breakpoint
CREATE INDEX `ticket_audit_log_action_idx` ON `ticket_audit_log` (`action`);--> statement-breakpoint
CREATE INDEX `ticket_audit_log_created_idx` ON `ticket_audit_log` (`createdAt`);--> statement-breakpoint
CREATE INDEX `titular_instances_org_idx` ON `titular_instances` (`organizationId`);--> statement-breakpoint
CREATE INDEX `titular_instances_name_idx` ON `titular_instances` (`titularName`);--> statement-breakpoint
CREATE INDEX `titular_instances_email_idx` ON `titular_instances` (`titularEmail`);--> statement-breakpoint
CREATE INDEX `titular_instances_document_idx` ON `titular_instances` (`titularDocument`);--> statement-breakpoint
CREATE INDEX `titular_instances_process_idx` ON `titular_instances` (`processId`);--> statement-breakpoint
CREATE INDEX `unified_assessments_org_idx` ON `ua_assessments` (`organizationId`);--> statement-breakpoint
CREATE INDEX `unified_assessments_code_idx` ON `ua_assessments` (`assessmentCode`);--> statement-breakpoint
CREATE INDEX `unified_assessments_status_idx` ON `ua_assessments` (`status`);--> statement-breakpoint
CREATE INDEX `user_invites_token_unique` ON `user_invites` (`token`);--> statement-breakpoint
CREATE INDEX `user_prefs_user_idx` ON `user_preferences` (`userId`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);