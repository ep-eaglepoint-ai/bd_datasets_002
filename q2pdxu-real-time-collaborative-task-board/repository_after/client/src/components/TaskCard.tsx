import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
  onDelete?: (id: number) => void;
}

export const TaskCard = ({ task, onDelete }: TaskCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="task-card"
      {...attributes}
      {...listeners}
    >
      <div
        style={{
          fontWeight: "800",
          marginBottom: "8px",
          textTransform: "uppercase",
          fontSize: "0.9rem",
        }}
      >
        {task.title}
      </div>
      {task.description && (
        <div
          style={{
            fontSize: "0.8rem",
            marginBottom: "12px",
            lineHeight: "1.4",
          }}
        >
          {task.description}
        </div>
      )}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          style={{ fontSize: "0.7rem", padding: "4px 8px" }}
        >
          Delete
        </button>
      )}
    </div>
  );
};
