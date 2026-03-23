ALTER TABLE `clause_annotations` MODIFY COLUMN `authorRole` enum('admin','consultor','cliente','advogado','dpo') NOT NULL;--> statement-breakpoint
ALTER TABLE `clause_comments` MODIFY COLUMN `authorRole` enum('admin','consultor','cliente','advogado','dpo') NOT NULL;--> statement-breakpoint
ALTER TABLE `ged_permissions` MODIFY COLUMN `role` enum('admin','consultor','cliente');--> statement-breakpoint
ALTER TABLE `user_invites` MODIFY COLUMN `role` enum('admin','consultor','sponsor','comite','lider_processo','gestor_area','terceiro') NOT NULL DEFAULT 'gestor_area';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','consultor','sponsor','comite','lider_processo','gestor_area','terceiro') NOT NULL DEFAULT 'gestor_area';