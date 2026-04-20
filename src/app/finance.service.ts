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
  userBudget = signal<number>(0);

  searchQuery = signal('');
  selectedCategory = signal('All');

  // Filters
  filterCategory = signal<string>('All');
  filterDateRange = signal<{ start: string; end: string } | null>(null);

  // 1. New Listener for User Profile
  listenToUserProfile(userId: string) {
    const userDocRef = doc(this.fb.db, 'users', userId);
    return onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Update our signal with the budgetGoals from Firestore
        this.userBudget.set(data['budgetGoals'] || 0);
      }
    });
  }

  // 2. Updated Budget Alerts
  // Comparing total expenses against the single budget goal from profile
  budgetAlerts = computed(() => {
    const spent = this.totalExpenses();
    const limit = this.userBudget();

    if (limit === 0) return []; // No budget set

    return [
      {
        category: 'Total Budget',
        isNearing: spent > limit * 0.8 && spent <= limit,
        isExceeded: spent > limit,
      },
    ].filter((a) => a.isNearing || a.isExceeded);
  });

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

  listenToTransactions(userId: string, onUpdate?: () => void) {
    const q = query(
      collection(this.fb.db, 'transactions'),
      where('userId', '==', userId),
      //orderBy('date', 'desc'),
    );

    return onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(
        (d) =>
          ({
            id: d.id,
            ...d.data(),
          }) as Transaction,
      );

      this.transactions.set([...transactions]);

      // Now this callback will work without a TS error
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

  rawTotalExpenses = computed(() =>
    this.transactions()
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0),
  );
}
