CREATE TABLE `ai_chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`role` enum('system','user','assistant') NOT NULL,
	`content` text NOT NULL,
	`tokensUsed` int DEFAULT 0,
	`isRefinement` boolean NOT NULL DEFAULT false,
	`parentMessageId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_chat_messages_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_chat_sessions_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_generated_results_id` PRIMARY KEY(`id`)
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
	`includeRecommendations` boolean NOT NULL DEFAULT true,
	`includeRiskAnalysis` boolean NOT NULL DEFAULT true,
	`includeActionPlan` boolean NOT NULL DEFAULT true,
	`customFields` json,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_organization_instructions_id` PRIMARY KEY(`id`)
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
	`isSystem` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_prompt_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_provider_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('openai','gemini','claude','perplexity') NOT NULL,
	`apiKey` text,
	`model` varchar(100),
	`isEnabled` boolean NOT NULL DEFAULT false,
	`isDefault` boolean NOT NULL DEFAULT false,
	`maxTokens` int DEFAULT 4096,
	`temperature` int DEFAULT 70,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_provider_configs_id` PRIMARY KEY(`id`)
);
