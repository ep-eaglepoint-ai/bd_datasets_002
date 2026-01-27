import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Column, Task } from "../types";
import { TaskCard } from "./TaskCard";

interface ColumnViewProps {
  column: Column;
  tasks: Task[];
  onDeleteTask: (id: number) => void;
}

export const ColumnView = ({
  column,
  tasks,
  onDeleteTask,
}: ColumnViewProps) => {
  const { setNodeRef } = useDroppable({
    id: `column-${column.id}`,
  });

  return (
    <div ref={setNodeRef} className="column">
      <div className="column-header">
        <h3>{column.name}</h3>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ minHeight: "100px" }}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onDeleteTask} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};
