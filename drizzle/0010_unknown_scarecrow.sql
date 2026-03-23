CREATE TABLE `ged_access_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resourceType` enum('folder','document') NOT NULL,
	`resourceId` int NOT NULL,
	`userId` int NOT NULL,
	`action` enum('view','download','upload','edit','delete','share','move','rename') NOT NULL,
	`details` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ged_access_logs_id` PRIMARY KEY(`id`)
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
	`isLatestVersion` boolean NOT NULL DEFAULT true,
	`status` enum('draft','active','archived','deleted') NOT NULL DEFAULT 'active',
	`isSharedWithClient` boolean NOT NULL DEFAULT false,
	`sharedAt` timestamp,
	`sharedById` int,
	`tags` json,
	`metadata` json,
	`linkedEntityType` varchar(50),
	`linkedEntityId` int,
	`createdById` int NOT NULL,
	`lastModifiedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `ged_documents_id` PRIMARY KEY(`id`)
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
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ged_folder_templates_id` PRIMARY KEY(`id`)
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
	`isSystemFolder` boolean NOT NULL DEFAULT false,
	`icon` varchar(50),
	`color` varchar(7),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ged_folders_id` PRIMARY KEY(`id`)
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
	`inheritFromParent` boolean NOT NULL DEFAULT true,
	`grantedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `ged_permissions_id` PRIMARY KEY(`id`)
);
