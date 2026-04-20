// dashboard.component.ts
import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../finance.service';
import { FirebaseService } from '../firebase.service';
import { onAuthStateChanged } from 'firebase/auth';
import { TransactionComponent } from '../transaction.component/transaction.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TransactionComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent {
  public financeService = inject(FinanceService);
  private fb = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef); // 2. Inject it

  // Local state for the "Add Transaction" form
  newTransaction = {
    amount: 0,
    category: 'Food',
    notes: '',
    type: 'expense' as 'income' | 'expense',
  };

  constructor() {
    onAuthStateChanged(this.fb.auth, (user) => {
      if (user) {
        // 3. Capture the unsubscribe function
        const unsubscribe = this.financeService.listenToTransactions(user.uid, () => {
          // 4. This callback runs every time Firestore data changes
          this.cdr.markForCheck();
        });
      }
    });
  }

  async handleAdd() {
    const user = this.fb.auth.currentUser;
    if (!user) return;

    await this.financeService.addTransaction({
      ...this.newTransaction,
      date: new Date().toISOString(),
      userId: user.uid,
    });

    // Reset form
    this.newTransaction.amount = 0;
    this.newTransaction.notes = '';
  }

  async delete(id: string) {
    if (confirm('Delete this transaction?')) {
      await this.financeService.deleteTransaction(id);
    }
  }
}
