"use client";

import { Transaction, UserProfile } from "@/types";
export type { UserProfile };
import {
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { safeUUID } from "./utils";

const COLLECTION_NAME = "transactions";

function normalizeTransaction(tx: any): Transaction {
  if (!tx || typeof tx !== "object") {
    return {
      id: safeUUID(),
      userId: "anonymous",
      type: "expense",
      amount: 0,
      category: "Lainnya",
      date: new Date().toISOString(),
      notes: "",
      merchantName: "",
      createdAt: new Date().toISOString(),
    };
  }

  const id = typeof tx.id === "string" ? tx.id : safeUUID();
  const userId = typeof tx.userId === "string" ? tx.userId : "anonymous";
  const type = tx.type === "income" || tx.type === "expense" ? tx.type : "expense";
  
  let amount = Number(tx.amount);
  if (isNaN(amount) || amount < 0) {
    amount = 0;
  }

  const category = typeof tx.category === "string" ? tx.category.trim() : "Lainnya";
  const merchantName = typeof tx.merchantName === "string" ? tx.merchantName.trim() : "";
  const notes = typeof tx.notes === "string" ? tx.notes.trim() : "";

  let dateStr = tx.date;
  if (tx.date !== null && tx.date !== undefined) {
    if (typeof tx.date === "object") {
      try {
        if ("seconds" in tx.date) {
          dateStr = new Date(tx.date.seconds * 1000).toISOString();
        } else if (tx.date instanceof Date) {
          dateStr = tx.date.toISOString();
        } else {
          const secs = tx.date.seconds ?? tx.date._seconds;
          if (typeof secs === "number") {
            dateStr = new Date(secs * 1000).toISOString();
          } else {
            dateStr = new Date(tx.date).toISOString();
          }
        }
      } catch {
        dateStr = new Date().toISOString();
      }
    } else if (typeof tx.date !== "string") {
      try {
        dateStr = new Date(tx.date).toISOString();
      } catch {
        dateStr = new Date().toISOString();
      }
    }
  } else {
    dateStr = new Date().toISOString();
  }

  // Ensure invalid dates do not pass
  try {
    if (new Date(dateStr).toString() === "Invalid Date") {
      dateStr = new Date().toISOString();
    }
  } catch {
    dateStr = new Date().toISOString();
  }

  let createdAtStr = tx.createdAt;
  if (tx.createdAt !== null && tx.createdAt !== undefined) {
    if (typeof tx.createdAt === "object") {
      try {
        if ("seconds" in tx.createdAt) {
          createdAtStr = new Date(tx.createdAt.seconds * 1000).toISOString();
        } else if (tx.createdAt instanceof Date) {
          createdAtStr = tx.createdAt.toISOString();
        } else {
          const secs = tx.createdAt.seconds ?? tx.createdAt._seconds;
          if (typeof secs === "number") {
            createdAtStr = new Date(secs * 1000).toISOString();
          } else {
            createdAtStr = new Date(tx.createdAt).toISOString();
          }
        }
      } catch {
        createdAtStr = dateStr;
      }
    } else if (typeof tx.createdAt !== "string") {
      try {
        createdAtStr = new Date(tx.createdAt).toISOString();
      } catch {
        createdAtStr = dateStr;
      }
    }
  } else {
    createdAtStr = dateStr;
  }

  try {
    if (new Date(createdAtStr).toString() === "Invalid Date") {
      createdAtStr = dateStr;
    }
  } catch {
    createdAtStr = dateStr;
  }

  return {
    ...tx,
    id,
    userId,
    type,
    amount,
    category,
    merchantName,
    notes,
    date: dateStr,
    createdAt: createdAtStr,
  };
}

// ===== Firestore helpers with smart fallback =====

export async function addTransaction(tx: Omit<Transaction, "id">): Promise<string> {
  const profile = getUserProfile();
  const userId = profile?.userId || "anonymous";

  // Always write to local storage first (write-through cache)
  const localId = safeUUID();
  const newTx = { ...tx, id: localId, userId };
  addTransactionLocal(newTx, localId);

  // Skip Firebase entirely if not configured
  if (!isFirebaseConfigured() || !db) {
    return localId;
  }

  try {
    const cleanTx = normalizeTransaction(newTx);
    await setDoc(doc(db, COLLECTION_NAME, localId), cleanTx);
    return localId;
  } catch (err) {
    console.error("Firebase write error - falling back to localStorage", err);
    return localId;
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  const profile = getUserProfile();
  const userId = profile?.userId;

  // If there's no user profile (e.g. during onboarding flow), return local
  if (!userId) {
    return getTransactionsLocal();
  }

  // If Firebase is not configured, return local
  if (!isFirebaseConfigured() || !db) {
    return getTransactionsLocal();
  }

  try {
    // Race: Firebase vs 3-second timeout
    const firebasePromise = (async () => {
      const q = query(collection(db!, COLLECTION_NAME), where("userId", "==", userId));
      const snapshot = await getDocs(q);
      const firestoreTxs = snapshot.docs.map((d) => normalizeTransaction({
        id: d.id,
        ...d.data(),
      }));
      return firestoreTxs;
    })();

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const firestoreTxs = await Promise.race([firebasePromise, timeoutPromise]);

    if (firestoreTxs === null) {
      console.warn("Firebase timeout — using localStorage cache");
      const localTxs = getTransactionsLocal();
      // Ensure all local transactions have userId set
      let modified = false;
      const updatedLocalTxs = localTxs.map((t) => {
        if (!t.userId) {
          t.userId = userId;
          modified = true;
        }
        return t;
      });
      if (modified) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(updatedLocalTxs));
      }
      return updatedLocalTxs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // --- Sync Logic ---
    const localTxs = getTransactionsLocal();

    // 1. If Firestore has no data for this userId, but local has data (e.g. demo data seeded during onboarding)
    if (firestoreTxs.length === 0 && localTxs.length > 0) {
      console.log("Firestore empty for user, uploading local transactions...");
      for (const tx of localTxs) {
        try {
          await setDoc(doc(db!, COLLECTION_NAME, tx.id), normalizeTransaction({
            ...tx,
            userId,
          }));
        } catch (err) {
          console.error("Sync upload error for transaction", tx.id, err);
        }
      }
      return localTxs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // 2. If Firestore has data, we sync Firestore and local
    const firestoreIds = new Set(firestoreTxs.map((t) => t.id));
    const missingInFirestore = localTxs.filter((t) => !firestoreIds.has(t.id));

    if (missingInFirestore.length > 0) {
      console.log(`Uploading ${missingInFirestore.length} offline transactions to Firestore...`);
      for (const tx of missingInFirestore) {
        try {
          await setDoc(doc(db!, COLLECTION_NAME, tx.id), normalizeTransaction({
            ...tx,
            userId,
          }));
        } catch (err) {
          console.error("Offline sync upload error for transaction", tx.id, err);
        }
      }
    }

    // Combine Firestore and missing local transactions, then update localStorage cache
    const mergedTxs = [...firestoreTxs];
    const firestoreTxsIds = new Set(firestoreTxs.map((t) => t.id));
    for (const tx of localTxs) {
      if (!firestoreTxsIds.has(tx.id)) {
        mergedTxs.push(tx);
      }
    }

    // Save back to localStorage to keep cache warm and updated
    localStorage.setItem(LOCAL_KEY, JSON.stringify(mergedTxs));

    // Sort in-memory chronologically descending
    return mergedTxs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Firebase read error — falling back to localStorage cache", err);
    return getTransactionsLocal().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  // Always update locally first (write-through cache)
  deleteTransactionLocal(id);

  if (!isFirebaseConfigured() || !db) {
    return;
  }

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (err) {
    console.error("Firebase delete error", err);
  }
}

export async function updateTransaction(
  id: string,
  updates: Partial<Omit<Transaction, "id">>
): Promise<void> {
  // Always update locally first (write-through cache)
  updateTransactionLocal(id, updates);

  if (!isFirebaseConfigured() || !db) {
    return;
  }

  try {
    const transactions = getTransactionsLocal();
    const updatedTx = transactions.find((t) => t.id === id);
    if (updatedTx) {
      await setDoc(doc(db, COLLECTION_NAME, id), updatedTx);
    } else {
      // Fallback updateDoc with normalized dates
      const cleanUpdates: Record<string, any> = { ...updates };
      if (updates.date) {
        cleanUpdates.date = typeof updates.date === "string" ? updates.date : new Date(updates.date).toISOString();
      }
      if (updates.createdAt) {
        cleanUpdates.createdAt = typeof updates.createdAt === "string" ? updates.createdAt : new Date(updates.createdAt).toISOString();
      }
      await updateDoc(doc(db, COLLECTION_NAME, id), cleanUpdates);
    }
  } catch (err) {
    console.error("Firebase update error", err);
  }
}

// ===== localStorage fallback =====

const LOCAL_KEY = "notaku_transactions";

function getTransactionsLocal(): Transaction[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeTransaction);
    }
    return [];
  } catch {
    return [];
  }
}

function addTransactionLocal(tx: Omit<Transaction, "id">, customId?: string): string {
  const transactions = getTransactionsLocal();
  const id = customId || safeUUID();
  const newTx = normalizeTransaction({ ...tx, id });
  const exists = transactions.some((t) => t.id === id);
  if (!exists) {
    transactions.unshift(newTx);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(transactions));
  }
  return id;
}

function deleteTransactionLocal(id: string): void {
  const transactions = getTransactionsLocal();
  const filtered = transactions.filter((t) => t.id !== id);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(filtered));
}

function updateTransactionLocal(id: string, updates: Record<string, unknown>): void {
  const transactions = getTransactionsLocal();
  const idx = transactions.findIndex((t) => t.id === id);
  if (idx === -1) return;
  transactions[idx] = normalizeTransaction({ ...transactions[idx], ...updates });
  localStorage.setItem(LOCAL_KEY, JSON.stringify(transactions));
}

// ===== Demo data seeder =====

export function seedDemoData(): Transaction[] {
  const profile = getUserProfile();
  const userId = profile?.userId || safeUUID();

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
      id: safeUUID(),
      userId,
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

// ===== User Profile helpers =====

const PROFILE_KEY = "notaku_user_profile";

export function getUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    const profile = JSON.parse(raw);
    if (!profile || typeof profile !== "object") return null;

    // Ensure vital profile fields exist & clean them
    const userId = typeof profile.userId === "string" ? profile.userId : safeUUID();
    const ownerName = typeof profile.ownerName === "string" ? profile.ownerName.trim() : "Teman NotaKu";
    const businessName = typeof profile.businessName === "string" ? profile.businessName.trim() : "";
    const businessCategory = typeof profile.businessCategory === "string" ? profile.businessCategory.trim() : "Lainnya";
    const businessAge = typeof profile.businessAge === "string" ? profile.businessAge.trim() : "";
    const targetMonthlyRevenue = typeof profile.targetMonthlyRevenue === "number" && !isNaN(profile.targetMonthlyRevenue) && profile.targetMonthlyRevenue > 0
      ? profile.targetMonthlyRevenue
      : 0;
    const onboardedAt = typeof profile.onboardedAt === "string" ? profile.onboardedAt : new Date().toISOString();

    const validatedProfile: UserProfile = {
      userId,
      ownerName,
      businessName,
      businessCategory,
      businessAge,
      targetMonthlyRevenue,
      onboardedAt
    };

    // If we filled in missing keys or changed anything, update the cache
    if (!profile.userId || profile.ownerName !== ownerName || profile.businessName !== businessName) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(validatedProfile));
    }
    return validatedProfile;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  const updatedProfile = { ...profile };
  if (!updatedProfile.userId) {
    updatedProfile.userId = safeUUID();
  }
  // Sanitize fields before saving
  if (typeof updatedProfile.ownerName === "string") updatedProfile.ownerName = updatedProfile.ownerName.trim();
  if (typeof updatedProfile.businessName === "string") updatedProfile.businessName = updatedProfile.businessName.trim();
  if (typeof updatedProfile.businessCategory === "string") updatedProfile.businessCategory = updatedProfile.businessCategory.trim();
  if (typeof updatedProfile.businessAge === "string") updatedProfile.businessAge = updatedProfile.businessAge.trim();
  if (typeof updatedProfile.targetMonthlyRevenue !== "number" || isNaN(updatedProfile.targetMonthlyRevenue) || updatedProfile.targetMonthlyRevenue < 0) {
    updatedProfile.targetMonthlyRevenue = 0;
  }

  localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
}

export function clearAllData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_KEY);
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem("notaku_ai_messages"); // Clear AI chat history if exists
}
