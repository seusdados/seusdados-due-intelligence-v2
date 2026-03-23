ALTER TABLE `ua_action_plan` MODIFY COLUMN `status` enum('pendente','em_andamento','concluida','concluida_cliente','cancelada','aguardando_validacao','em_validacao','ajustes_solicitados') NOT NULL DEFAULT 'pendente';--> statement-breakpoint
ALTER TABLE `ua_action_plan` ADD `responsibleName` varchar(255);--> statement-breakpoint
ALTER TABLE `ua_action_plan` ADD `observations` text;--> statement-breakpoint
ALTER TABLE `ua_action_plan` ADD `clientCompletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `ua_action_plan` ADD `validatorId` int;--> statement-breakpoint
ALTER TABLE `ua_action_plan` ADD `validatorName` varchar(255);--> statement-breakpoint
ALTER TABLE `ua_action_plan` ADD `validatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `ua_action_plan` ADD `validationNotes` text;--> statement-breakpoint
ALTER TABLE `ua_action_plan` ADD `validationRejectionReason` text;--> statement-breakpoint
ALTER TABLE `ua_action_plan` ADD `submittedForValidationAt` timestamp;