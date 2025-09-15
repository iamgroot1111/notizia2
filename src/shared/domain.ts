export type Gender = 'w' | 'm' | 'd'

export type Client = {
  id: number
  name: string
  gender?: Gender | null
  age?: number | null         // Jahre
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
