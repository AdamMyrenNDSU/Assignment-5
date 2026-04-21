import { Component, inject, signal } from '@angular/core';
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

  categoryData = signal({ name: '', icon: 'utensils', color: '#007bff' });

  categoryForm = form(this.categoryData, (f) => {
    required(f.name);
  });

  async save() {
    const userId = this.auth.userId;
    if (this.categoryForm().valid() && userId) {
      await this.catService.addCategory({ ...this.categoryData(), userId });
      this.categoryData.set({ name: '', icon: 'utensils', color: '#007bff' });
    }
  }
}
