-- 2026-01-26 - Third-party link responses (jornada pública)
-- Idempotente (MySQL/InnoDB)

CREATE TABLE IF NOT EXISTS `third_party_link_responses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `accessLinkId` int NOT NULL,
  `assessmentId` int NOT NULL,
  `questionId` int NOT NULL,
  `selectedLevel` int NOT NULL,
  `impactScore` int NOT NULL,
  `probabilityScore` int NOT NULL,
  `riskScore` int NOT NULL,
  `notes` text NULL,
  `evidenceUrls` json NULL,
  `responderName` varchar(120) NULL,
  `responderEmail` varchar(255) NULL,
  `responderRole` varchar(80) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tplr_accessLinkId_question_unique` (`accessLinkId`, `questionId`),
  KEY `tplr_assessmentId_idx` (`assessmentId`),
  KEY `tplr_accessLinkId_idx` (`accessLinkId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
