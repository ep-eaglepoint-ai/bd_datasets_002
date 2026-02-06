export interface User {
  id: number;
  email: string;
}

export interface Board {
  id: number;
  name: string;
  owner_id: number;
  created_at: string;
}

export interface Column {
  id: number;
  board_id: number;
  name: string;
  position: number;
}

export interface Task {
  id: number;
  column_id: number;
  title: string;
  description: string;
  position: number;
}

export interface WSMessage {
  type: 'task_created' | 'task_updated' | 'task_moved' | 'task_deleted' | 'user_joined' | 'user_left' | 'board_state';
  data: any;
}
