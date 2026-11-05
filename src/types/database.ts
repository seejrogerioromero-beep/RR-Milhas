import type { RecordModel } from 'pocketbase'

export interface UserRecord extends RecordModel {
  email: string
  name: string
  avatar?: string
  verified: boolean
}

export type TaskPriority = 'baixa' | 'media' | 'alta'

export interface TaskRecord extends RecordModel {
  title: string
  notes?: string
  done: boolean
  priority: TaskPriority
  due?: string
}

export type TransactionType = 'receita' | 'despesa'
export type TransactionCategory =
  | 'salario'
  | 'moradia'
  | 'alimentacao'
  | 'transporte'
  | 'saude'
  | 'lazer'
  | 'educacao'
  | 'outros'

export interface TransactionRecord extends RecordModel {
  description: string
  amount: number
  type: TransactionType
  category: TransactionCategory
  date: string
}

export interface NoteRecord extends RecordModel {
  title: string
  content: string
  pinned: boolean
}

export type HabitColor = 'verde' | 'ambar' | 'azul' | 'coral'

export interface HabitRecord extends RecordModel {
  name: string
  icon: string
  color: HabitColor
  active: boolean
}

export interface HabitLogRecord extends RecordModel {
  habit: string
  date: string
  expand?: {
    habit?: HabitRecord
  }
}
