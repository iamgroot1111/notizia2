export type Gender = 'w' | 'm' | 'd'

export type Client = {
  id: number
  name: string
  gender?: Gender | null
  age?: number | null 
  anamnesis?: Anamnesis | null        // Jahre
}

export type ProblemCategory =
  | 'overweight' | 'social_anxiety' | 'panic' | 'depression'
  | 'sleep' | 'pain' | 'self_worth' | 'relationship' | 'other'

export type CaseStatus = 'open'|'resolved'|'dropped'

export type Case = {
  id: number
  client_id: number
  problem_category: ProblemCategory
  problem_text: string
  started_at: string
  status: CaseStatus
  severity?: number | null     // (optional; aktuell nicht genutzt)
}

export type Method = 'aufloesende_hypnose'|'klassische_hypnose'|'coaching'|'other'

export type Session = {
  id: number
  case_id: number
  started_at: string
  duration_min: number | null
  method: Method
  // ease_hypnosis lassen wir bestehen, wird aber nicht mehr in der UI verwendet
  ease_hypnosis: number | null
  sud_before: number | null
  sud_after: number | null
  emotional_release: string | null
  insights: string | null
  notes: string | null
}

export type TherapyEntry = {
  type: string;                 // z. B. "Psychotherapie"
  duration_months?: number | null; // "Wie lange?" in Monaten (optional)
  completed?: boolean | null;   // "abgeschlossen?"
  // optional später: started_at?: string; ended_at?: string;
};

export type MedicationEntry = {
  name: string;
  dosage?: string | null;       // z. B. "10 mg"
  frequency?: string | null;    // z. B. "1x täglich"
  current?: boolean | null;     // nimmt der Klient das aktuell?
  // optional später: since?: string; until?: string; notes?: string;
};

export type Anamnesis = {
  previous_therapies?: TherapyEntry[];
  medications?: MedicationEntry[];

  // Intake-Anliegen (optional, erzeugt noch KEINEN Case – nur Dokumentation)
  initial_problem_category?: string | null;  // "Anliegen" (Kategorie)
  initial_problem_text?: string | null;      // Freitext

  // Geplante Methode (Text + passende kanonische Zuordnung)
  planned_method_text?: string | null;       // frei eingegeben
  planned_method?: Method | null;            // auf union gemappt: 'aufloesende_hypnose' | ...
};


