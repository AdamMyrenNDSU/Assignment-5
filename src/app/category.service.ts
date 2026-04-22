import { inject, Injectable, signal, computed } from '@angular/core';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';

export interface Category {
  id?: string;
  name: string;
  icon: string; // Lucide icon name like 'shopping-cart'
  color: string; // Hex code
  userId: string;
  monthlyBudget?: number;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private fb = inject(FirebaseService);
  userCategories = signal<Category[]>([]);

  private firestoreCategories = signal<Category[]>([]);

  private defaultCategories: Omit<Category, 'userId'>[] = [
    { name: 'Income', icon: 'trending-up', color: '#28a745' },
    { name: 'Rent', icon: 'home', color: '#6c757d' },
    { name: 'General', icon: 'archive', color: '#17a2b8' },
  ];

  public allCategories = computed(() => {
    return [...this.defaultCategories, ...this.firestoreCategories()];
  });

  listenToCategories(userId: string) {
    const q = query(collection(this.fb.db, 'categories'), where('userId', '==', userId));

    return onSnapshot(q, async (snapshot) => {
      const cats = snapshot.docs.map(
        (d) =>
          ({
            id: d.id,
            ...d.data(),
          }) as Category,
      );

      // 2. If the user has NO categories yet, seed the defaults into Firestore
      if (cats.length === 0) {
        for (const def of this.defaultCategories) {
          await this.addCategory({ ...def, userId });
        }
      }

      this.userCategories.set(cats);
    });
  }

  async addCategory(cat: Omit<Category, 'id'>) {
    return addDoc(collection(this.fb.db, 'categories'), cat);
  }

  async updateCategoryBudget(id: string, budget: number) {
    const docRef = doc(this.fb.db, 'categories', id);
    return updateDoc(docRef, { monthlyBudget: budget });
  }

  async deleteCategory(id: string) {
    const docRef = doc(this.fb.db, 'categories', id);
    return deleteDoc(docRef);
  }

  async updateCategory(id: string, data: Partial<Category>) {
    const docRef = doc(this.fb.db, 'categories', id);
    return updateDoc(docRef, data);
  }
}
