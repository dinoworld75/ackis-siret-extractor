import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ColumnSelection } from '../../types/column.types';

interface SortableItemProps {
  id: string;
  selection: ColumnSelection;
  onToggle: (columnName: string) => void;
}

export function SortableItem({ id, selection, onToggle }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border rounded-lg ${
        selection.selected
          ? 'bg-blue-50 border-primary'
          : 'bg-white border-gray-300'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-move p-1 hover:bg-gray-100 rounded"
      >
        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 110-2 1 1 0 010 2zm0-4a1 1 0 110-2 1 1 0 010 2zm0-4a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </div>

      <input
        type="checkbox"
        checked={selection.selected}
        onChange={() => onToggle(selection.columnName)}
        className="w-5 h-5 text-primary"
      />

      <span
        className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
          selection.selected
            ? 'bg-primary text-white'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {selection.priority}
      </span>

      <span className="flex-1 font-medium">{selection.columnName}</span>
    </div>
  );
}
