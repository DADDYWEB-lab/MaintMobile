
export type StatutEspace = 'libre' | 'occupé' | 'nettoyage' | 'maintenance';

export interface Assignation {
  employeId: string;
  employeUid: string;
  employeNom: string;
  employeRole: string;
  typeTache: string;
  dateDebut: string;
  notes?: string;
  assigneLe: string;
}

export interface CategorieEspace {
  id: string;
  nom: string;
  type: 'public' | 'professionnel';
  couleur: string;
  icone: string;
  exemples?: string;
  custom?: boolean;
}

export interface EspaceParent {
  id: string;
  nom: string;
  type: 'etage' | 'batiment' | 'zone' | 'aile';
  numero?: string;
  categorieId: string;
  description?: string;
  assignations?: Assignation[];
  createdAt?: any; // Firebase Timestamp
  updatedAt?: any;
}

export interface SousEspace {
  id: string;
  nom?: string;
  numero: string;
  type: string;
  espaceParentId: string;
  superficie?: string;
  capacite?: string;
  statut: StatutEspace;
  equipements: string[];
  assignations?: Assignation[];
  
}

export interface Task {
  id: string;
  taskType: string;
  locationName: string;
  status: 'pending' | 'en cours' | 'en pause' | 'terminé';
  priority: 'Haute' | 'Moyenne' | 'Basse';
  date: string;
  espaceId?: string;
  sousEspaceId?: string;
  startTime?: string;
  startTimeActual?: number;
  isRecurring?: boolean;
  recurringType?: string;
  notes?: string;
}