#!/usr/bin/env node
/**
 * Script para popular dados de conformidade LGPD
 * Executa: node server/seed-compliance-data.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.ts';
import { complianceDomains, complianceQuestions } from '../drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar dados do JSON
const specPath = '/home/ubuntu/specification_structure.json';
const specData = JSON.parse(fs.readFileSync(specPath, 'utf-8'));

async function seedCompliance() {
  try {
    console.log('🌱 Iniciando seed de dados de conformidade LGPD...\n');

    // 1. Inserir/atualizar domínios
    console.log('📋 Processando domínios...');
    for (const domain of specData.domains) {
      await db
        .insert(complianceDomains)
        .values({
          framework: domain.framework,
          name: domain.name,
          description: null,
          color: null,
          icon: null,
          order: domain.order,
        })
        .onDuplicateKeyUpdate({
          set: {
            order: domain.order,
            updatedAt: new Date(),
          },
        });
      console.log(`  ✓ ${domain.name}`);
    }

    console.log('\n📝 Processando perguntas...');
    let processedCount = 0;
    for (const question of specData.questions) {
      await db
        .insert(complianceQuestions)
        .values({
          framework: question.framework,
          domainId: question.domainId,
          questionText: question.questionText,
          option1Text: question.option1Text,
          option1Evidence: question.option1Evidence,
          option2Text: question.option2Text,
          option2Evidence: question.option2Evidence,
          option3Text: question.option3Text,
          option3Evidence: question.option3Evidence,
          option4Text: question.option4Text,
          option4Evidence: question.option4Evidence,
          order: question.order,
        })
        .onDuplicateKeyUpdate({
          set: {
            questionText: question.questionText,
            option1Text: question.option1Text,
            option1Evidence: question.option1Evidence,
            option2Text: question.option2Text,
            option2Evidence: question.option2Evidence,
            option3Text: question.option3Text,
            option3Evidence: question.option3Evidence,
            option4Text: question.option4Text,
            option4Evidence: question.option4Evidence,
            order: question.order,
            updatedAt: new Date(),
          },
        });
      processedCount++;
      if (processedCount % 5 === 0) {
        console.log(`  ✓ ${processedCount}/${specData.questions.length} perguntas`);
      }
    }

    console.log(`\n✅ Seed concluído com sucesso!`);
    console.log(`  - ${specData.domains.length} domínios`);
    console.log(`  - ${specData.questions.length} perguntas`);

    // Verificação
    const domainCount = await db.select().from(complianceDomains).where(eq(complianceDomains.framework, 'seusdados'));
    const questionCount = await db.select().from(complianceQuestions).where(eq(complianceQuestions.framework, 'seusdados'));
    
    console.log(`\n📊 Verificação no banco:`);
    console.log(`  - Domínios: ${domainCount.length}`);
    console.log(`  - Perguntas: ${questionCount.length}`);

  } catch (error) {
    console.error('❌ Erro durante seed:', error);
    process.exit(1);
  }
}

seedCompliance();
