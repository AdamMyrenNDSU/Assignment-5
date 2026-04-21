// transaction.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { form, FormField, required, min } from '@angular/forms/signals'; // Angular 21 experimental API
import { FinanceService, Transaction } from '../finance.service';
import { AuthService } from '../auth.service';
import { CategoryService } from '../category.service';

@Component({
  selector: 'app-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule, FormField],
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.css'],
})
export class TransactionComponent {
  public financeService = inject(FinanceService);
  public authService = inject(AuthService);
  public catService = inject(CategoryService);

  constructor() {
    // 2. Start listening for categories if a user is logged in
    const userId = this.authService.userId;
    if (userId) {
      this.catService.listenToCategories(userId);
    }
  }

  // Track if we are editing an existing transaction
  editingId = signal<string | null>(null);

  // 1. Define the Signal Model
  transactionData = signal<Omit<Transaction, 'id' | 'userId'>>({
    amount: 0,
    category: 'Food',
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD for date input
    notes: '',
    type: 'expense',
  });

  // 2. Create the Signal Form with Validation
  transactionForm = form(this.transactionData, (f) => {
    required(f.amount, { message: 'Amount is required' });
    min(f.amount, 0.01, { message: 'Amount must be greater than 0' });
    required(f.category);
    required(f.date);
  });

  updateType(type: 'income' | 'expense') {
    this.transactionData.update((v) => ({ ...v, type }));
  }

  async save() {
    if (!this.transactionForm().valid()) return;

    // Try the signal first, fallback to the direct Firebase Auth instance
    const userId = this.authService.userId || this.authService['fb'].auth.currentUser?.uid;

    if (!userId) {
      console.error('Current Signal Value:', this.authService.userId);
      console.error('Firebase Auth Instance:', this.authService['fb'].auth.currentUser);
      alert('Session not ready. Please wait a moment or log in again.');
      return;
    }

    const currentData = this.transactionData();

    try {
      if (this.editingId()) {
        await this.financeService.updateTransaction(this.editingId()!, {
          ...currentData,
          userId,
        });
      } else {
        await this.financeService.addTransaction({
          ...currentData,
          userId,
        });
      }
      this.reset();
    } catch (error) {
      console.error('Firebase Save Error:', error);
      alert('Check your Firebase Security Rules!');
    }
  }

  edit(t: Transaction) {
    this.editingId.set(t.id!);
    // Populate the signal model to update the form automatically
    this.transactionData.set({
      amount: t.amount,
      category: t.category,
      date: t.date,
      notes: t.notes,
      type: t.type,
    });
  }

  reset() {
    this.editingId.set(null);
    this.transactionData.set({
      amount: 0,
      category: 'Food',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      type: 'expense',
    });
  }

  getIcon(iconName: string): string {
    const iconMap: Record<string, string> = {
      utensils: '🍴',
      car: '🚗',
      home: '🏠',
      'shopping-cart': '🛒',
      heart: '❤️',
      'trending-up': '📈',
      archive: '📦',
    };
    return iconMap[iconName] || '💰';
  }

  getSelectedCategoryColor(): string {
    const selectedName = this.transactionData().category;
    let category = this.catService.allCategories().find((c) => c.name === selectedName);
    category
      ? category.color
      : (category = this.catService.userCategories().find((c) => c.name === selectedName));
    return category ? category.color : 'rgba(255,255,255,0.1)';
  }
}
