/**
 * Script para popular o banco de dados com os dados do Framework SeusDados
 */

import { getDb } from '../db';
import { seusdadosDomains, seusdadosQuestions, seusdadosOptions } from '../../drizzle/schema';
import { SEUSDADOS_DOMAINS } from './seusdados-framework';
import { TRPCError } from '@trpc/server';

export async function seedSeusdadosFramework() {
  console.log('Iniciando seed do Framework SeusDados...');
  
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  
  try {
    // 1. Inserir domínios
    console.log('Inserindo domínios...');
    for (let i = 0; i < SEUSDADOS_DOMAINS.length; i++) {
      const domain = SEUSDADOS_DOMAINS[i];
      await db.insert(seusdadosDomains).values({
        code: domain.code,
        label: domain.label,
        weight: String(domain.weight),
        order: i + 1
      }).onConflictDoUpdate({ target: [], set: {
          label: domain.label,
          weight: String(domain.weight),
          order: i + 1
        }
      });
    }
    console.log(`${SEUSDADOS_DOMAINS.length} domínios inseridos/atualizados`);
    
    // 2. Inserir perguntas
    console.log('Inserindo perguntas...');
    let questionCount = 0;
    for (const domain of SEUSDADOS_DOMAINS) {
      for (const question of domain.questions) {
        await db.insert(seusdadosQuestions).values({
          code: question.id,
          domainCode: domain.code,
          idx: question.index,
          prompt: question.prompt,
          frameworkTags: question.frameworkTags,
          frameworkMetadata: question.frameworkMetadata
        }).onConflictDoUpdate({ target: [], set: {
            domainCode: domain.code,
            idx: question.index,
            prompt: question.prompt,
            frameworkTags: question.frameworkTags,
            frameworkMetadata: question.frameworkMetadata
          }
        });
        questionCount++;
      }
    }
    console.log(`${questionCount} perguntas inseridas/atualizadas`);
    
    // 3. Inserir opções
    console.log('Inserindo opções...');
    let optionCount = 0;
    for (const domain of SEUSDADOS_DOMAINS) {
      for (const question of domain.questions) {
        for (const option of question.options) {
          await db.insert(seusdadosOptions).values({
            questionCode: question.id,
            optionCode: option.id,
            level: option.level,
            label: option.text
          }).onConflictDoUpdate({ target: [], set: {
              level: option.level,
              label: option.text
            }
          });
          optionCount++;
        }
      }
    }
    console.log(`${optionCount} opções inseridas/atualizadas`);
    
    console.log('Seed do Framework SeusDados concluído com sucesso!');
    return { success: true, domains: SEUSDADOS_DOMAINS.length, questions: questionCount, options: optionCount };
  } catch (error) {
    console.error('Erro ao executar seed:', error);
    throw error;
  }
}
