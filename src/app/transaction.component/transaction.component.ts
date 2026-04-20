// transaction.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { form, FormField, required, min } from '@angular/forms/signals'; // Angular 21 experimental API
import { FinanceService, Transaction } from '../finance.service';

@Component({
  selector: 'app-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule, FormField],
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.css'],
})
export class TransactionComponent {
  public financeService = inject(FinanceService);

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

    const currentData = this.transactionData();
    const userId = 'CURRENT_USER_ID'; // Replace with your actual auth state logic

    if (this.editingId()) {
      await this.financeService.updateTransaction(this.editingId()!, currentData);
    } else {
      await this.financeService.addTransaction({ ...currentData, userId });
    }
    this.reset();
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
}
