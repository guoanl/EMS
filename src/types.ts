export type Role = 'admin' | 'enterprise';

export interface User {
  id: number;
  username: string;
  role: Role;
  enterprise_name: string;
}

export interface Attachment {
  id: number;
  task_id: number;
  name: string;
  path: string;
  created_at: string;
}

export interface Task {
  id: number;
  user_id: number;
  name: string;
  target_type: 'number' | 'boolean';
  target_value: string;
  actual_value?: string;
  attachments?: Attachment[];
  remarks?: string;
  updated_at?: string;
}

export interface Account {
  id: number;
  username: string;
  enterprise_name: string;
}

export interface EnterpriseOverview {
  id: number;
  username: string;
  enterprise_name: string;
  last_reported_at: string | null;
  status: '已填报' | '未填报';
}
