ALTER TABLE `action_plan_history` MODIFY COLUMN `changeType` enum('atribuicao','reatribuicao','aceite','recusa','status','prazo','edicao','envio_validacao','validacao_aprovada','validacao_recusada','ajustes_solicitados') NOT NULL;--> statement-breakpoint
ALTER TABLE `action_plans` MODIFY COLUMN `status` enum('pendente','em_andamento','concluida_cliente','pendente_validacao_dpo','concluida','cancelada','recusada_cliente','aguardando_validacao','em_validacao','ajustes_solicitados') NOT NULL DEFAULT 'pendente';--> statement-breakpoint
ALTER TABLE `action_plans` ADD `responsibleName` varchar(255);--> statement-breakpoint
ALTER TABLE `action_plans` ADD `validatorId` int;--> statement-breakpoint
ALTER TABLE `action_plans` ADD `validatorName` varchar(255);--> statement-breakpoint
ALTER TABLE `action_plans` ADD `validatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `action_plans` ADD `validationNotes` text;--> statement-breakpoint
ALTER TABLE `action_plans` ADD `validationRejectionReason` text;--> statement-breakpoint
ALTER TABLE `action_plans` ADD `submittedForValidationAt` timestamp;