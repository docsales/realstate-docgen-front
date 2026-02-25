import type { Person } from '@/types/types';
import { generateCoupleId } from '@/types/types';

/**
 * Migra dados existentes para usar coupleId
 * Identifica casais baseado em isSpouse e posição na lista
 * 
 * @param people Array de pessoas a migrar
 * @returns Array de pessoas com coupleId atribuído
 */
export function migrateCoupleIds(people: Person[]): Person[] {
  const migrated = [...people];
  const processed = new Set<string>();

  migrated.forEach((person, index) => {
    // Se já foi processado, pular
    if (processed.has(person.id)) return;

    // Se a pessoa é cônjuge, tentar encontrar o titular correspondente
    if (person.isSpouse) {
      // Procurar por um titular casado/união estável antes deste cônjuge
      for (let i = index - 1; i >= 0; i--) {
        const potentialTitular = migrated[i];
        if (
          !potentialTitular.isSpouse &&
          (potentialTitular.maritalState === 'casado' || potentialTitular.maritalState === 'uniao_estavel') &&
          !processed.has(potentialTitular.id)
        ) {
          // Encontrou um titular correspondente
          const coupleId = generateCoupleId();
          person.coupleId = coupleId;
          potentialTitular.coupleId = coupleId;
          processed.add(person.id);
          processed.add(potentialTitular.id);
          return;
        }
      }
    } else if (
      person.maritalState === 'casado' || 
      person.maritalState === 'uniao_estavel'
    ) {
      // Se é titular casado, procurar cônjuge logo após
      const nextPerson = migrated[index + 1];
      if (nextPerson && nextPerson.isSpouse && !processed.has(nextPerson.id)) {
        const coupleId = generateCoupleId();
        person.coupleId = coupleId;
        nextPerson.coupleId = coupleId;
        processed.add(person.id);
        processed.add(nextPerson.id);
      }
    }
  });

  return migrated;
}

/**
 * Valida se os coupleIds estão corretos
 * Verifica se cada casal tem exatamente 2 membros
 */
export function validateCoupleIds(people: Person[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const coupleMap = new Map<string, Person[]>();

  // Agrupar pessoas por coupleId
  people.forEach(person => {
    if (person.coupleId) {
      if (!coupleMap.has(person.coupleId)) {
        coupleMap.set(person.coupleId, []);
      }
      coupleMap.get(person.coupleId)!.push(person);
    }
  });

  // Validar cada casal
  coupleMap.forEach((members, coupleId) => {
    if (members.length !== 2) {
      errors.push(`Casal ${coupleId} tem ${members.length} membros (esperado: 2)`);
    }

    const hasTitular = members.some(m => !m.isSpouse);
    const hasConjuge = members.some(m => m.isSpouse);

    if (!hasTitular) {
      errors.push(`Casal ${coupleId} não tem titular`);
    }

    if (!hasConjuge) {
      errors.push(`Casal ${coupleId} não tem cônjuge`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
