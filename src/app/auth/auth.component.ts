// auth.component.ts
import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, UserProfile } from '../auth.service';
import { onAuthStateChanged } from 'firebase/auth';
import { FirebaseService } from '../firebase.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent {
  private authService = inject(AuthService);
  private fb = inject(FirebaseService);

  // State Management with Signals
  user = signal<UserProfile | null>(null);
  email = '';
  password = '';
  name = '';
  newBudgetGoal = 0;

  isLoginMode = signal(true); // Default to Login view

  toggleMode() {
    this.isLoginMode.update(val => !val);
  }

  constructor() {
    // Listen for Auth changes in Angular 21 zoneless mode
    onAuthStateChanged(this.fb.auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch custom Firestore profile data
        const profile = await this.authService.getProfile(firebaseUser.uid);
        this.user.set({ uid: firebaseUser.uid, ...profile } as UserProfile);
      } else {
        this.user.set(null);
      }
    });
  }

  async onRegister() {
    if (!this.email || !this.password || !this.name) {
    alert('Please fill in all fields');
    return;
  }

  try {
    await this.authService.register(this.email, this.password, this.name);
    // The onAuthStateChanged listener we set up earlier will 
    // automatically detect the login and update the 'user' signal.
  } catch (error: any) {
    alert(error.message); // Displays Firebase-specific errors (e.g., "Email already in use")
  }
  }

   async onLogin() {
    try {
      // You'll need to add this method to your authService
      await this.authService.login(this.email, this.password);
    } catch (err: any) {
      alert("Login failed: " + err.message);
    }
  }

  async onGoogleLogin() {
    await this.authService.loginWithGoogle();
  }

  async onUpdateBudget() {
    if (this.user()) {
      await this.authService.updateBudget(this.user()!.uid, this.newBudgetGoal);
      this.user.update(u => u ? { ...u, budgetGoals: this.newBudgetGoal } : null);
    }
  }

  logout() {
    this.fb.auth.signOut();
  }

  async saveProfile() {
    const currentUser = this.user();
    if (currentUser) {
      const updatedData = {
        name: this.name,
        budgetGoals: this.newBudgetGoal
      };
      
      try {
        await this.authService.updateProfile(currentUser.uid, updatedData);
        // Refresh local signal state
        this.user.update(u => u ? { ...u, ...updatedData } : null);
        alert('Profile updated successfully!');
      } catch (err) {
        console.error("Update failed", err);
      }
    }
  }
}
