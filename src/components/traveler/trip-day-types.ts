export type TripJournalPlace = {
  id: string;
  name: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
};

export type TripJournalData = {
  photos: string[];
  memory: string | null;
  mood: string | null;
  rating: number | null;
  places: TripJournalPlace[];
};

export type TripDayData = {
  id: string;
  dayNumber: number;
  date: string;
  notes: string | null;
  journal?: TripJournalData | null;
};
