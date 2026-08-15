/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Subject {
  id: string;
  name: string;
  totalUnits: number;
  completedUnits: number;
  examDate: string | null; // YYYY-MM-DD
  revisionStage: number; // 0 (none), 1 (1 day), 2 (3 days), 3 (7 days)
  lastStudiedDate: string | null;
  nextRevisionDate: string | null;
  difficultyBias: number; // -3 to +3 (easy to hard bias)
  weak: boolean;
}

export interface Task {
  id: string;
  subjectId?: string;
  subjectName: string;
  text: string;
  completed: boolean;
  type: string; // 'Active Recall' | 'Spaced Revision' | 'Mock Practice' | 'Learn new concept' | etc.
  badge: 'Urgent' | 'Core' | 'Build' | 'Due' | 'Exam' | 'Weak' | 'Small win';
}

export interface SemesterItem {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  type: 'Assignment' | 'Lab Record' | 'Internal Assessment' | 'Quiz' | 'Mid-Sem Exam' | 'End-Sem Exam';
  deadline: string; // YYYY-MM-DD
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
}

export interface Flashcard {
  id: string;
  subjectId: string;
  question: string;
  answer: string;
  difficulty?: 'E' | 'M' | 'H'; // Easy, Medium, Hard feedback
}

export interface StudyNote {
  id: string;
  subjectId: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface StudySessionLog {
  date: string; // YYYY-MM-DD
  minutes: number;
  subjectId: string;
  difficultyRating: 'E' | 'M' | 'H'; // Easy, Medium, Hard feedback
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  notes: string;
  understandingRating: number; // 1 to 5
}
