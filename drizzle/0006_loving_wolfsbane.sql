CREATE TABLE `evidences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`assessmentType` enum('compliance','third_party') NOT NULL,
	`assessmentId` int NOT NULL,
	`questionId` varchar(50),
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`description` text,
	`uploadedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidences_id` PRIMARY KEY(`id`)
);
