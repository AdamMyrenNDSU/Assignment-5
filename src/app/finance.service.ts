import { inject, Injectable, signal, computed } from '@angular/core';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';

export interface Transaction {
  id?: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
  type: 'income' | 'expense';
  userId: string;
}

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private fb = inject(FirebaseService);

  // State
  transactions = signal<Transaction[]>([]);
  categories = signal(['Food', 'Rent', 'Travel', 'Work', 'Entertainment']);
  budgets = signal<Record<string, number>>({ Food: 500, Rent: 1200 }); // Monthly limits

  searchQuery = signal('');
  selectedCategory = signal('All');

  // Filters
  filterCategory = signal<string>('All');
  filterDateRange = signal<{ start: string; end: string } | null>(null);

  // 4. Dashboard & Analytics (Computed)
  filteredTransactions = computed(() => {
    return this.transactions().filter((t) => {
      const matchesSearch = t.notes.toLowerCase().includes(this.searchQuery().toLowerCase());
      const matchesCat =
        this.selectedCategory() === 'All' || t.category === this.selectedCategory();
      return matchesSearch && matchesCat;
    });
  });

  totalExpenses = computed(() =>
    this.filteredTransactions()
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0),
  );

  budgetAlerts = computed(() => {
    return Object.keys(this.budgets())
      .map((cat) => {
        const spent = this.transactions()
          .filter((t) => t.category === cat && t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        const limit = this.budgets()[cat];
        return { category: cat, isNearing: spent > limit * 0.8, isExceeded: spent > limit };
      })
      .filter((a) => a.isNearing);
  });

  listenToTransactions(userId: string, onUpdate?: () => void) {
    const q = query(collection(this.fb.db, 'transactions'), where('userId', '==', userId));

    return onSnapshot(q, (snapshot) => {
      // Update the signal with a NEW array reference (crucial for reactivity)
      this.transactions.set(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction));

      // Notify the component to refresh the UI
      if (onUpdate) onUpdate();
    });
  }

  async addTransaction(t: Omit<Transaction, 'id'>) {
    await addDoc(collection(this.fb.db, 'transactions'), t);
  }

  async deleteTransaction(id: string) {
    await deleteDoc(doc(this.fb.db, 'transactions', id));
  }

  async updateTransaction(id: string, transactionData: Partial<Transaction>) {
    try {
      // 1. Create a reference to the specific document
      const docRef = doc(this.fb.db, 'transactions', id);

      // 2. Remove 'id' if it exists in the payload to avoid Firestore errors
      const { id: _, ...dataToUpdate } = transactionData as any;

      // 3. Perform the update
      await updateDoc(docRef, dataToUpdate);

      console.log('Transaction updated successfully');
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }
}
