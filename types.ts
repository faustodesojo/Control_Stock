export interface Material {
  id: string;
  name: string;
  unit: string;
  category: string; // New field for categorization
  stock: number;
  reserved: number;
}

export interface ProjectMaterial {
  materialId: string;
  materialName: string; // For display purposes
  materialUnit: string; // For display purposes
  budgetedQuantity: number;
  actualQuantity: number;
}

export enum ProjectStatus {
  PENDIENTE = 'Pendiente',
  COMPLETADO = 'Completado',
}

export interface Project {
  id: string;
  description: string; // Representará "Numero de Presupuesto"
  client: string;
  startDate: string; // ISO date string
  estimatedDays: number; // Nuevo campo para días de trabajo
  status: ProjectStatus;
  materials: ProjectMaterial[];
  completionDate?: string; // ISO date string
}

export interface StockSummary {
  totalStockValue: number; // Could be sum of quantities or monetary value if prices were included
  totalAvailable: number;
  totalReserved: number;
}

// Types for Income/Outcome enhancements
export interface MovementItem {
  materialId: string;
  materialName: string; // For display and history
  materialUnit: string; // For display and history
  quantity: number;
}

export interface MovementTransaction {
  id: string; // Unique ID for the transaction, e.g., "mov-timestamp"
  type: 'Ingreso' | 'Egreso';
  date: string; // ISO date string of the transaction
  items: MovementItem[];
  budgetTarget?: string; // Optional, only for 'Egreso'
}
