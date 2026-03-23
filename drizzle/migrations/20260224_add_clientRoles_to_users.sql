-- Add clientRoles column to users table
ALTER TABLE `users` ADD COLUMN `clientRoles` json DEFAULT NULL AFTER `clientType`;
