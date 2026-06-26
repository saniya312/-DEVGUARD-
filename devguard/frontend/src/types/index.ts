export interface User {
  id: number
  email: string
  name: string
  role: 'employee' | 'hr'
  department?: string
  position?: string
}

export interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
}

export interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface Conversation {
  id: number
  title?: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface ConversationDetail extends Conversation {
  messages: Message[]
}

export interface Consent {
  chat_analysis: boolean
  voice_analysis: boolean
  face_analysis: boolean
  consented_at?: string
}

// HR Types
export interface EmployeeListItem {
  id: number
  name: string
  email: string
  department?: string
  position?: string
  is_active: boolean
  risk_category?: 'low' | 'medium' | 'high' | 'critical'
  retention_risk?: number
  burnout_risk?: number
  quit_risk?: number
  last_active?: string
}

export interface EmployeeDetail extends EmployeeListItem {
  avg_sentiment?: number
  avg_stress?: number
  avg_engagement?: number
  risk_reasons?: string[]
  recommendations?: {
    hr_actions?: string[]
    wellness_recommendations?: string[]
    follow_up_suggestions?: string[]
  }
  consent?: {
    chat_analysis: boolean
    voice_analysis: boolean
    face_analysis: boolean
  }
  message_count: number
  voice_count: number
  face_count: number
}

export interface DashboardOverview {
  total_employees: number
  active_employees: number
  high_risk_count: number
  critical_risk_count: number
  avg_burnout_risk: number
  avg_retention_risk: number
}

export interface SentimentTrend {
  date: string
  avg_sentiment: number
  avg_stress: number
  avg_engagement: number
  message_count: number
}

export interface VoiceSummary {
  employee_id: number
  employee_name: string
  avg_pitch?: number
  avg_energy?: number
  avg_tempo?: number
  avg_stress?: number
  avg_confidence?: number
  recording_count: number
}

export interface FaceSummary {
  emotion: string
  count: number
  percentage: number
}

export interface Alert {
  id: number
  employee_id: number
  employee_name: string
  alert_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  is_read: boolean
  created_at: string
}