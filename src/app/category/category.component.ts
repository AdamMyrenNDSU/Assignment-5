import { Component, effect, inject, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { CategoryService } from '../category.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-category',
  imports: [FormField],
  templateUrl: './category.component.html',
  styleUrl: './category.component.css',
})
export class Category {
  catService = inject(CategoryService);
  auth = inject(AuthService);

  editingId = signal<string | null>(null);

  categoryData = signal({
    name: '',
    icon: 'utensils',
    color: '#007bff',
    monthlyBudget: 0,
  });

  constructor() {
    // This effect runs every time the currentUser signal changes
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        // Start listening to this specific user's categories
        this.catService.listenToCategories(user.uid);
      }
    });
  }

  categoryForm = form(this.categoryData, (f) => {
    required(f.name);
  });

  async save() {
    const currentUserId = this.auth.userId; // Get UID from your AuthService signal

    if (this.categoryForm().valid() && currentUserId) {
      const newCategory = {
        ...this.categoryData(),
        userId: currentUserId, // Explicitly link the record to this user
      };

      if (this.editingId()) {
        await this.catService.updateCategory(this.editingId()!, newCategory);
      } else {
        await this.catService.addCategory(newCategory);
      }

      this.cancelEdit();
    }
  }
  // Helper to determine alert status (Logic-only example)
  getAlertLevel(spent: number, budget: number) {
    if (!budget) return 'none';
    const ratio = spent / budget;
    if (ratio >= 1) return 'exceeded';
    if (ratio >= 0.8) return 'warning';
    return 'safe';
  }

  async deleteCategory(id: string | undefined) {
    if (!id) return;

    const confirmed = confirm('Are you sure you want to delete this category?');
    if (confirmed) {
      try {
        await this.catService.deleteCategory(id);
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  }

  editCategory(cat: any) {
    const id = cat.id || cat['id']; // Try both dot and bracket notation
    if (!id) return;

    this.editingId.set(id);

    // Set the form data, ensuring defaults if fields are missing
    this.categoryData.set({
      name: cat.name || '',
      icon: cat.icon || 'utensils',
      color: cat.color || '#007bff',
      monthlyBudget: cat.monthlyBudget ?? 0,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.editingId.set(null);
    this.categoryData.set({ name: '', icon: 'utensils', color: '#007bff', monthlyBudget: 0 });
  }
}
