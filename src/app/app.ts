import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { DashboardComponent } from './dashboard.component/dashboard.component';
import { AuthService } from './auth.service';
import { Category } from './category/category.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    AuthComponent,
    DashboardComponent,
    Category,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('assignment5');

  public auth = inject(AuthService);
}
