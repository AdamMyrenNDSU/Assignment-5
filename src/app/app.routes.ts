import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component/dashboard.component';
import { TransactionComponent } from './transaction.component/transaction.component';
import { AuthComponent } from './auth/auth.component'; // Your existing component
import { Category } from './category/category.component';
import { TransactionHistory } from './transaction-history/transaction-history';

export const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'add-transaction', component: TransactionComponent },
  { path: 'profile', component: AuthComponent }, // Maps "Profile" tab to AuthComponent
  { path: 'transaction-history', component: TransactionHistory },
  { path: 'categories', component: Category },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }, // Wildcard to handle invalid URLs
];
