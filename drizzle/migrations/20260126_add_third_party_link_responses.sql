-- Due Diligence de Terceiros (acesso público por link)
-- Tabela para armazenar respostas do terceiro vinculadas a um access_link.

CREATE TABLE IF NOT EXISTS `third_party_link_responses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `accessLinkId` INT NOT NULL,
  `assessmentId` INT NOT NULL,
  `questionId` INT NOT NULL,
  `selectedLevel` INT NOT NULL,
  `impactScore` INT NOT NULL,
  `probabilityScore` INT NOT NULL,
  `riskScore` INT NOT NULL,
  `notes` TEXT NULL,
  `evidenceUrls` JSON NULL,
  `responderName` VARCHAR(120) NULL,
  `responderEmail` VARCHAR(255) NULL,
  `responderRole` VARCHAR(80) NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tplr_accessLinkId_question_unique` (`accessLinkId`, `questionId`),
  KEY `tplr_assessmentId_idx` (`assessmentId`),
  KEY `tplr_accessLinkId_idx` (`accessLinkId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
