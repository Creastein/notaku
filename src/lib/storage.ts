"use client";

import { Transaction } from "@/types";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

const COLLECTION_NAME = "transactions";

// ===== Firestore helpers with smart fallback =====

export async function addTransaction(tx: Omit<Transaction, "id">): Promise<string> {
  // Skip Firebase entirely if not configured
  if (!isFirebaseConfigured() || !db) {
    return addTransactionLocal(tx);
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...tx,
      date: typeof tx.date === "string" ? tx.date : new Date(tx.date).toISOString(),
      createdAt: typeof tx.createdAt === "string" ? tx.createdAt : new Date(tx.createdAt).toISOString(),
    });
    return docRef.id;
  } catch {
    return addTransactionLocal(tx);
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  if (!isFirebaseConfigured() || !db) {
    return getTransactionsLocal();
  }

  try {
    // Race: Firebase vs 3-second timeout
    const firebasePromise = (async () => {
      const q = query(collection(db!, COLLECTION_NAME), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Transaction[];
    })();

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const result = await Promise.race([firebasePromise, timeoutPromise]);

    if (result === null) {
      console.warn("Firebase timeout — using localStorage");
      return getTransactionsLocal();
    }
    return result;
  } catch {
    return getTransactionsLocal();
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  if (!isFirebaseConfigured() || !db) {
    deleteTransactionLocal(id);
    return;
  }

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch {
    deleteTransactionLocal(id);
  }
}

// ===== localStorage fallback =====

const LOCAL_KEY = "notaku_transactions";

function getTransactionsLocal(): Transaction[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function addTransactionLocal(tx: Omit<Transaction, "id">): string {
  const transactions = getTransactionsLocal();
  const id = crypto.randomUUID();
  const newTx = { ...tx, id };
  transactions.unshift(newTx as Transaction);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(transactions));
  return id;
}

function deleteTransactionLocal(id: string): void {
  const transactions = getTransactionsLocal();
  const filtered = transactions.filter((t) => t.id !== id);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(filtered));
}

// ===== Demo data seeder =====

export function seedDemoData(): Transaction[] {
  const expenseCategories = ["Makanan", "Transport", "Belanja Modal", "Operasional"];
  const incomeCategories = ["Penjualan", "Jasa", "Freelance"];
  const expenseMerchants = [
    "Toko Bangunan Jaya", "Warung Makan Sederhana", "GrabBike", "PLN",
    "Tokopedia", "Shopee", "Indosat", "Pertamina"
  ];
  const incomeMerchants = [
    "Pelanggan A", "Pelanggan B", "Pelanggan C",
    "Toko Online", "Marketplace", "Reseller Bandung"
  ];

  const now = new Date();
  const transactions: Transaction[] = [];

  for (let i = 0; i < 35; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const isIncome = Math.random() > 0.45;

    const category = isIncome
      ? incomeCategories[Math.floor(Math.random() * incomeCategories.length)]
      : expenseCategories[Math.floor(Math.random() * expenseCategories.length)];

    const merchant = isIncome
      ? incomeMerchants[Math.floor(Math.random() * incomeMerchants.length)]
      : expenseMerchants[Math.floor(Math.random() * expenseMerchants.length)];

    transactions.push({
      id: crypto.randomUUID(),
      type: isIncome ? "income" : "expense",
      amount: isIncome
        ? Math.floor(Math.random() * 5000000) + 500000
        : Math.floor(Math.random() * 1000000) + 50000,
      category,
      date: date.toISOString(),
      notes: isIncome
        ? `Pembayaran dari ${merchant}`
        : `Pembelian di ${merchant}`,
      merchantName: merchant,
      createdAt: date.toISOString(),
    });
  }

  transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  localStorage.setItem(LOCAL_KEY, JSON.stringify(transactions));
  return transactions;
}

// Check if demo data is needed
export function hasDemoData(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}
