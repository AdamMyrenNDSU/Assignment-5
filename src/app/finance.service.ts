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
import { CategoryService } from './category.service';

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
  private catService = inject(CategoryService);

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

  startDate = signal<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  );
  endDate = signal<string>(new Date().toISOString().split('T')[0]);

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

  public totalIncome = computed(() =>
    this.transactions()
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0),
  );

  // 2. Groups all expenses by category for pie charts
  public categoryTotals = computed(() => {
    const totals: Record<string, number> = {};
    this.transactions()
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
      });
    return totals;
  });

  // 3. (Optional Helper) Net balance calculation
  public netBalance = computed(() => this.totalIncome() - this.totalExpenses());

  public categorySpending = computed(() => {
    const transactions = this.filteredTransactions(); // Use FILTERED data
    const categories = this.catService.userCategories();

    return categories
      .map((cat) => {
        const spent = transactions
          .filter((t) => t.category === cat.name && t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          name: cat.name,
          spent,
          budget: cat.monthlyBudget || 0,
          color: cat.color,
          percent: cat.monthlyBudget ? Math.min((spent / cat.monthlyBudget) * 100, 100) : 0,
          isOver: cat.monthlyBudget ? spent > cat.monthlyBudget : false,
        };
      })
      .filter((c) => c.budget > 0 || c.spent > 0);
  });

  public dateRange = signal<{ start: string; end: string }>({
    start: this.getStartOfMonth(),
    end: this.getEndOfMonth(),
  });

  // 2. Computed filtered transactions based on the dateRange
  public filteredTransactions = computed(() => {
    const start = this.startDate();
    const end = this.endDate();
    const query = this.searchQuery().toLowerCase();
    const catFilter = this.selectedCategory();

    return this.transactions().filter((t) => {
      const matchesDate = t.date >= start && t.date <= end;
      const matchesSearch =
        t.notes.toLowerCase().includes(query) || t.category.toLowerCase().includes(query);
      const matchesCat = catFilter === 'All' || t.category === catFilter;

      return matchesDate && matchesSearch && matchesCat;
    });
  });

  // 3. Update existing totals to use filteredTransactions
  public totalExpenses = computed(() =>
    this.filteredTransactions()
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0),
  );

  // Helper date generators
  private getStartOfMonth() {
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  }
  private getEndOfMonth() {
    return new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];
  }

  public chartData = computed(() => {
    const transactions = this.filteredTransactions(); // Use FILTERED data
    const categories = [...new Set(transactions.map((t) => t.category))];

    return {
      labels: categories,
      datasets: categories.map((cat) =>
        transactions
          .filter((t) => t.category === cat && t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0),
      ),
    };
  });

  public filteredCategoryTotals = computed(() => {
    const transactions = this.filteredTransactions();
    const totals: Record<string, number> = {};

    transactions.forEach((t) => {
      if (t.type === 'expense') {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
      }
    });
    return totals;
  });
}
