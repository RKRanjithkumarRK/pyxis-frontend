export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  createdAt: string
}

export interface Conversation {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
  archived: boolean
  projectId?: string
}

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface ModelDef {
  id: string
  name: string
  provider: string
  description: string
  free: boolean
  maxTokens: number
}

export interface UserSettings {
  general: {
    appearance: 'system' | 'light' | 'dark'
    accentColor: string
    language: string
    spokenLanguage: string
    voice: string
  }
  personalization: {
    baseStyle: string
    warm: string
    enthusiastic: string
    headersLists: string
    emoji: string
    customInstructions: string
    nickname: string
  }
  notifications: {
    responses: string
    groupChats: string
    tasks: string
    projects: string
    recommendations: string
    usage: string
  }
  dataControls: {
    improveModel: boolean
  }
}

export interface ApiKeys {
  openrouter: string
  openai: string
}

export type VoiceState = 'idle' | 'permission' | 'connecting' | 'listening' | 'speaking'

export type SettingsTab = 'general' | 'personalization' | 'data' | 'security' | 'account'
