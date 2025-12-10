import React from 'react';
import { Plus, Users } from 'lucide-react';
import { PersonForm } from './PersonForm';
import type { Person } from '@/types/types';
import { createDefaultPerson } from '@/types/types';
import { Button } from '@/components/Button';

interface PersonListProps {
  title: string;
  people: Person[];
  onChange: (people: Person[]) => void;
}

export const PersonList: React.FC<PersonListProps> = ({
  title,
  people,
  onChange,
}) => {
  const handlePersonChange = (index: number, updatedPerson: Person) => {
    const newPeople = [...people];
    newPeople[index] = updatedPerson;
    onChange(newPeople);
  };

  const handleAddPerson = () => {
    onChange([...people, createDefaultPerson()]);
  };

  const handleRemovePerson = (index: number) => {
    if (people.length > 1) {
      onChange(people.filter((_, i) => i !== index));
    }
  };

  // Check if there are multiple people to show spouse option
  const showSpouseOption = people.length > 1;

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
        <Button
          onClick={handleAddPerson}
          className="flex items-center gap-2 btn-md"
          variant='ghost'
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </Button>
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
          <button
            type="button"
            onClick={handleAddPerson}
            className="mt-3 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Adicionar Pessoa
          </button>
        </div>
      )}
    </div>
  );
};

