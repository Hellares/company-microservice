export interface DaySchedule {
  open: string;      // Hora de apertura
  close: string;     // Hora de cierre
  active: boolean;   // Si atiende ese día
}

export interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}