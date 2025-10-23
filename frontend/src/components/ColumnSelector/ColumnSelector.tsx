import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { ColumnSelection } from '../../types/column.types';

interface ColumnSelectorProps {
  columns: string[];
  onSelectionChange: (selections: ColumnSelection[]) => void;
}

export function ColumnSelector({ columns, onSelectionChange }: ColumnSelectorProps) {
  const [selections, setSelections] = useState<ColumnSelection[]>(
    columns.map((col, idx) => ({
      columnName: col,
      priority: idx + 1,
      selected: false,
    }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSelections((items) => {
        const oldIndex = items.findIndex((i) => i.columnName === active.id);
        const newIndex = items.findIndex((i) => i.columnName === over.id);
        const newSelections = arrayMove(items, oldIndex, newIndex);

        // Update priorities
        const updatedSelections = newSelections.map((sel, idx) => ({
          ...sel,
          priority: idx + 1,
        }));

        onSelectionChange(updatedSelections);
        return updatedSelections;
      });
    }
  };

  const toggleSelection = (columnName: string) => {
    const updatedSelections = selections.map((sel) =>
      sel.columnName === columnName ? { ...sel, selected: !sel.selected } : sel
    );
    setSelections(updatedSelections);
    onSelectionChange(updatedSelections);
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">
        Select columns containing URLs
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Check columns and drag to set priority (1 = highest)
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={selections.map((s) => s.columnName)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {selections.map((selection) => (
              <SortableItem
                key={selection.columnName}
                id={selection.columnName}
                selection={selection}
                onToggle={toggleSelection}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
