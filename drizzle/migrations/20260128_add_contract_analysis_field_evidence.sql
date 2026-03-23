-- Migration: add contract_analysis_field_evidence
CREATE TABLE IF NOT EXISTS `contract_analysis_field_evidence` (
  `id` int NOT NULL AUTO_INCREMENT,
  `analysisId` int NOT NULL,
  `fieldName` varchar(120) NOT NULL,
  `excerpt` text NULL,
  `clauseRef` varchar(255) NULL,
  `confidence` int NULL,
  `note` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `contract_analysis_field_evidence_analysisId_idx` (`analysisId`),
  KEY `contract_analysis_field_evidence_fieldName_idx` (`fieldName`)
);
