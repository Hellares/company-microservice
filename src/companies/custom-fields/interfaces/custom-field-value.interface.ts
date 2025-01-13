export interface ScheduleValue {
  open: string;
  close: string;
  active: boolean;
}

export interface SelectValue {
  options: string[];
  selected: string;
}

export interface AddressValue {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}