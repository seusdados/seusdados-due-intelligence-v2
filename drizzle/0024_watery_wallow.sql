ALTER TABLE `contract_checklist_items` ADD `responsibleId` int;--> statement-breakpoint
ALTER TABLE `contract_checklist_items` ADD `responsibleName` varchar(255);--> statement-breakpoint
ALTER TABLE `contract_risk_items` ADD `responsibleId` int;--> statement-breakpoint
ALTER TABLE `contract_risk_items` ADD `responsibleName` varchar(255);