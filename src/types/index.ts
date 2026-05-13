export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: Date | string; // Stored as ISO string or Date object
  notes?: string;
  merchantName?: string;
  receiptUrl?: string; // If an image was uploaded
  createdAt: Date | string;
}

// Structured output schema for Gemini OCR
export * from './api';
export interface GeminiReceiptResult {
  merchantName: string;
  totalAmount: number;
  date: string;
  category: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

// Helper types for AI Advisor
export interface AIAdvisorMessage {
  id: string;
  role: "user" | "model";
  content: string;
  createdAt: Date | string;
}
