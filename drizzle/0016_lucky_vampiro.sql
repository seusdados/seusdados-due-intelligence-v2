ALTER TABLE `contract_analysis_maps` ADD `titularRightsStatus` enum('sim','nao','parcial');--> statement-breakpoint
ALTER TABLE `contract_analysis_maps` ADD `dataEliminationStatus` enum('sim','nao','parcial');--> statement-breakpoint
ALTER TABLE `contract_analysis_maps` ADD `hasProtectionClause` enum('sim','nao','parcial');--> statement-breakpoint
ALTER TABLE `contract_analysis_maps` DROP COLUMN `checklistStatus`;