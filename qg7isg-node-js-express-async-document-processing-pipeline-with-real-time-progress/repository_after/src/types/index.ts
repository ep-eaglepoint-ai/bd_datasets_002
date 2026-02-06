export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: string[];
}

export interface SchemaField {
  name: string;
  type: string;
  validation?: ValidationRule;
  transform?: {
    mapping?: string;
    default?: any;
  };
}

export interface WebSocketMessage {
  type: 'progress' | 'error' | 'completed';
  progress?: number;
  records_processed?: number;
  record_index?: number;
  message?: string;
  status?: string;
  records_failed?: number;
}
