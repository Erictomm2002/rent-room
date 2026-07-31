export interface Room {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  name: string;
  rate: number;
}

export interface CompletedSession {
  id: string;
  roomName: string;
  roomId: string;
  staffId: string;
  staffName: string;
  start: number;
  end: number;
  hours: number;
  amount: number;
  note: string | null;
}
