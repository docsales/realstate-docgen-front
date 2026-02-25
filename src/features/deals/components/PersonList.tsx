import React from 'react';
import { Plus, Users } from 'lucide-react';
import { PersonForm } from './PersonForm';
import type { Person } from '@/types/types';
import { createDefaultPerson, generateCoupleId } from '@/types/types';
import { Button } from '@/components/Button';

interface PersonListProps {
  title: string;
  people: Person[];
  onChange: (people: Person[]) => void;
  role?: 'buyers' | 'sellers'; // Contexto para melhorar labels
}

export const PersonList: React.FC<PersonListProps> = ({
  title,
  people,
  onChange,
  role,
}) => {
  const handlePersonChange = (index: number, updatedPerson: Person) => {
    const newPeople = [...people];
    const oldPerson = newPeople[index];
    newPeople[index] = updatedPerson;
    
    // Verifica se o estado civil mudou para casado ou união estável
    const oldMaritalState = oldPerson.maritalState;
    const newMaritalState = updatedPerson.maritalState;
    
    // Se mudou para casado ou união estável e não era antes
    if (
      updatedPerson.personType === 'PF' &&
      (newMaritalState === 'casado' || newMaritalState === 'uniao_estavel') &&
      oldMaritalState !== 'casado' &&
      oldMaritalState !== 'uniao_estavel'
    ) {
      // Verifica se já existe um cônjuge para esta pessoa (usando coupleId)
      const hasSpouse = newPeople.some((p, idx) => 
        idx !== index && 
        p.coupleId && 
        p.coupleId === updatedPerson.coupleId &&
        p.isSpouse
      );
      
      // Se não existe cônjuge, adiciona automaticamente
      if (!hasSpouse && !updatedPerson.isSpouse) {
        // Gerar ou usar coupleId existente
        const coupleId = updatedPerson.coupleId || generateCoupleId();
        updatedPerson.coupleId = coupleId;
        
        const spouse = createDefaultPerson();
        spouse.isSpouse = true;
        spouse.coupleId = coupleId; // Mesmo ID compartilhado
        spouse.maritalState = newMaritalState;
        spouse.propertyRegime = updatedPerson.propertyRegime || 'comunhao_parcial';
        newPeople.splice(index + 1, 0, spouse);
      } else if (!updatedPerson.coupleId) {
        // Se já tem cônjuge mas não tem coupleId, gerar um
        const coupleId = generateCoupleId();
        updatedPerson.coupleId = coupleId;
        // Atualizar o cônjuge existente também
        const spouseIndex = newPeople.findIndex((p, idx) => 
          idx !== index && p.isSpouse && !p.coupleId
        );
        if (spouseIndex !== -1) {
          newPeople[spouseIndex].coupleId = coupleId;
        }
      }
    }
    
    // Se mudou de casado/união estável para outro estado e não é cônjuge
    if (
      updatedPerson.personType === 'PF' &&
      (oldMaritalState === 'casado' || oldMaritalState === 'uniao_estavel') &&
      newMaritalState !== 'casado' &&
      newMaritalState !== 'uniao_estavel' &&
      !updatedPerson.isSpouse
    ) {
      // Remove o cônjuge associado usando coupleId
      if (updatedPerson.coupleId) {
        const spouseIndex = newPeople.findIndex((p, idx) => 
          idx !== index && 
          p.coupleId === updatedPerson.coupleId &&
          p.isSpouse
        );
        if (spouseIndex !== -1) {
          newPeople[spouseIndex].coupleId = undefined;
          newPeople.splice(spouseIndex, 1);
        }
      }
      // Limpar coupleId do titular
      updatedPerson.coupleId = undefined;
    }
    
    // Sincroniza o regime de bens entre pessoa e cônjuge usando coupleId
    if (
      updatedPerson.personType === 'PF' &&
      (newMaritalState === 'casado' || newMaritalState === 'uniao_estavel') &&
      updatedPerson.propertyRegime !== oldPerson.propertyRegime &&
      updatedPerson.coupleId
    ) {
      // Encontra o cônjuge usando coupleId
      const spouseIndex = newPeople.findIndex((p, idx) => 
        idx !== index && 
        p.coupleId === updatedPerson.coupleId &&
        p.isSpouse !== updatedPerson.isSpouse
      );
      
      // Atualiza o regime de bens do cônjuge se encontrado
      if (spouseIndex !== -1) {
        newPeople[spouseIndex] = {
          ...newPeople[spouseIndex],
          propertyRegime: updatedPerson.propertyRegime,
        };
      }
    }
    
    onChange(newPeople);
  };

  const handleAddPerson = () => {
    onChange([...people, createDefaultPerson()]);
  };

  const handleRemovePerson = (index: number) => {
    if (people.length > 1) {
      const personToRemove = people[index];
      const newPeople = people.filter((_, i) => i !== index);
      
      // Se a pessoa removida tem coupleId, limpar o coupleId do cônjuge
      if (personToRemove.coupleId) {
        const spouseIndex = newPeople.findIndex(p => 
          p.coupleId === personToRemove.coupleId &&
          p.id !== personToRemove.id
        );
        if (spouseIndex !== -1) {
          newPeople[spouseIndex].coupleId = undefined;
          // Se o cônjuge não tem mais razão para existir, removê-lo também
          if (newPeople[spouseIndex].isSpouse) {
            const spouse = newPeople[spouseIndex];
            if (spouse.maritalState !== 'casado' && spouse.maritalState !== 'uniao_estavel') {
              newPeople.splice(spouseIndex, 1);
            }
          }
        }
      }
      
      onChange(newPeople);
    }
  };

  // Check if there are multiple people to show spouse option
  const showSpouseOption = people.length > 1;

  // Sempre permitir adicionar pessoas para suportar:
  // - Múltiplos casais
  // - Pessoas solteiras junto com casais
  // A gestão de cônjuges continua funcionando automaticamente
  const showAddButton = true;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-slate-800">{title}</h3>
          <div className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
            {people.length}
          </div>
        </div>
        {showAddButton && (
          <Button
            variant="secondary"
            onClick={handleAddPerson}
            icon={<Plus className="w-4 h-4" />}
            className="flex items-center gap-2 btn-md"
          >
            Adicionar
          </Button>
        )}
      </div>

      {/* People List */}
      <div className="space-y-3">
        {people.map((person, index) => (
          <PersonForm
            key={person.id}
            person={person}
            index={index}
            canRemove={people.length > 1}
            showSpouseOption={showSpouseOption}
            allPeople={people}
            role={role}
            onChange={(updated) => handlePersonChange(index, updated)}
            onRemove={() => handleRemovePerson(index)}
          />
        ))}
      </div>

      {/* Empty State */}
      {people.length === 0 && (
        <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Nenhuma pessoa adicionada</p>
          <Button
            variant="primary"
            onClick={handleAddPerson}
            icon={<Plus className="w-4 h-4" />}
            className="mt-3 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Adicionar Pessoa
          </Button>
        </div>
      )}
    </div>
  );
};

