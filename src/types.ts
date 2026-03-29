import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'instructor';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  knowledgeBase?: string;
}

export interface Scenario {
  id: string;
  title: string;
  content: string;
  question: string;
  options: string[];
  optionExplanations: string[];
  optionConsequences: string[];
  references: string[];
  correctAnswerIndex: number;
  explanation: string;
  concepts: string;
  applications: string;
  status: 'pending' | 'approved';
  createdAt: Timestamp;
  instructorId: string;
}

export interface QuizAttempt {
  id: string;
  studentId: string;
  scenarioIds: string[];
  answers: {
    scenarioId: string;
    selectedIndex: number;
    isCorrect: boolean;
  }[];
  score: number;
  completed: boolean;
  createdAt: Timestamp;
}
