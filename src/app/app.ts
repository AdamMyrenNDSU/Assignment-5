import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { DashboardComponent } from './dashboard.component/dashboard.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AuthComponent, DashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('assignment5');
}
