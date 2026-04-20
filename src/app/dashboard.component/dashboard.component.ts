import {
  Component,
  inject,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  ApplicationRef,
} from '@angular/core';
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
export class DashboardComponent implements OnInit, OnDestroy {
  // Added implements OnInit
  private appRef = inject(ApplicationRef); // Use ApplicationRef for a global "tick"
  public financeService = inject(FinanceService);
  private fb = inject(FirebaseService);
  private cdr = inject(ChangeDetectorRef);

  private unsubscribe?: () => void;

  ngOnInit() {
    onAuthStateChanged(this.fb.auth, (user) => {
      if (user) {
        // Listen to transactions
        this.financeService.listenToTransactions(user.uid);
        // Listen to profile/budget
        this.financeService.listenToUserProfile(user.uid);
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribe?.();
  }

  // Helper for deleting from the list
  async delete(id: string) {
    if (confirm('Delete this transaction?')) {
      await this.financeService.deleteTransaction(id);
      // No need to manually refresh; onSnapshot handles it
    }
  }
}
