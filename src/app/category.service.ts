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
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private fb = inject(FirebaseService);
  userCategories = signal<Category[]>([]);

  private firestoreCategories = signal<Category[]>([]);

  private defaultCategories: Category[] = [
    { name: 'Income', icon: 'trending-up', color: '#28a745', userId: 'system' },
    { name: 'Rent', icon: 'home', color: '#6c757d', userId: 'system' },
    { name: 'General', icon: 'archive', color: '#17a2b8', userId: 'system' },
  ];

  public allCategories = computed(() => {
    return [...this.defaultCategories, ...this.firestoreCategories()];
  });

  listenToCategories(userId: string) {
    const q = query(collection(this.fb.db, 'categories'), where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
      this.userCategories.set(cats);
    });
  }

  async addCategory(cat: Omit<Category, 'id'>) {
    return addDoc(collection(this.fb.db, 'categories'), cat);
  }
}
