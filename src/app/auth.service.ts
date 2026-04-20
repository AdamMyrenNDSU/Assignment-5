import { inject, Injectable } from '@angular/core';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { updateProfile } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  budgetGoals: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private fb = inject(FirebaseService);

  // 1. User Registration
  async register(email: string, pass: string, name: string) {
    try {
      // 1. Create the user in Firebase Auth
      const credential = await createUserWithEmailAndPassword(this.fb.auth, email, pass);
      const user = credential.user;

      // 2. Create the initial profile document in Firestore
      const profileData = {
        name: name,
        email: email,
        budgetGoals: 0
      };
      
      await setDoc(doc(this.fb.db, 'users', user.uid), profileData);
      
      return user;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  // 2. Google OAuth Login
  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(this.fb.auth, provider);
    // Check if profile exists, if not, create it
    const docRef = doc(this.fb.db, 'users', res.user.uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await this.createProfile(res.user.uid, { 
        name: res.user.displayName || '', 
        email: res.user.email || '', 
        budgetGoals: 0 
      });
    }
  }

  // 3. Profile Management
  async createProfile(uid: string, data: Omit<UserProfile, 'uid'>) {
    return setDoc(doc(this.fb.db, 'users', uid), data);
  }

  async updateBudget(uid: string, goal: number) {
    return updateDoc(doc(this.fb.db, 'users', uid), { budgetGoals: goal });
  }

  async getProfile(uid: string): Promise<any> {
    const docRef = doc(this.fb.db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.warn("No profile found for this user in Firestore.");
      return null;
    }
  }

   async updateProfile(uid: string, data: Partial<UserProfile>) {
    // 1. Update Firebase Auth display name if name is provided
    if (data.name && this.fb.auth.currentUser) {
      await updateProfile(this.fb.auth.currentUser, { displayName: data.name });
    }

    // 2. Update custom fields in Firestore (email, budgetGoals, etc.)
    const docRef = doc(this.fb.db, 'users', uid);
    return updateDoc(docRef, { ...data });
  }

  async login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.fb.auth, email, pass);
  }

}