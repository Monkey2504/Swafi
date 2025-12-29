
export interface DayData {
  debut: string | null;
  fin: string | null;
  code: string | null;
}

export interface SemaineData {
  semaine: number;
  lundi: DayData;
  mardi: DayData;
  mercredi: DayData;
  jeudi: DayData;
  vendredi: DayData;
  samedi: DayData;
  dimanche: DayData;
}

export interface SncfPlanning {
  serie: string;
  periode: string;
  semaines: SemaineData[];
}

export const DAYS_LIST = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
