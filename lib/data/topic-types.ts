export type Level = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export interface TopicExample {
  sql: string;
  note?: string;
  output?: { columns: string[]; rows: (string | number | null)[][] };
}

export interface QuizQ {
  q: string;
  options: string[];
  answer: number; // index into options
  why: string;
}

export interface Topic {
  slug: string;
  title: string;
  category: string;
  level: Level;
  estMinutes: number;
  definition: string;
  simple: string;
  technical: string;
  syntax: string;
  examples: TopicExample[];
  businessUseCase: string;
  interviewAngle: string;
  performanceTips: string[];
  commonMistakes: string[];
  quiz: QuizQ[];
  practice: string[];
  related: string[];
}
