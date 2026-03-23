CREATE INDEX `action_plan_responsible_user_idx` ON `ua_action_plan` (`responsibleUserId`);--> statement-breakpoint
CREATE INDEX `assessment_assignments_assessment_user_idx` ON `ua_assignments` (`assessmentId`,`assignedToUserId`);--> statement-breakpoint
CREATE INDEX `cppd_members_user_idx` ON `governanca_cppd_members` (`userId`);--> statement-breakpoint
CREATE INDEX `cppd_members_organization_idx` ON `governanca_cppd_members` (`organizationId`);--> statement-breakpoint
CREATE INDEX `cppd_members_status_idx` ON `governanca_cppd_members` (`status`);--> statement-breakpoint
CREATE INDEX `cppd_members_user_status_idx` ON `governanca_cppd_members` (`userId`,`status`);