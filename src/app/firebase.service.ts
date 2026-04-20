import { Injectable } from '@angular/core';
import { getAuth } from 'firebase/auth';
import {initializeApp} from 'firebase/app'
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBUqJnoFq-Oj5A2iz2MI5KwntoyE9RoFgg",
  authDomain: "assignment5-1f95c.firebaseapp.com",
  projectId: "assignment5-1f95c",
  storageBucket: "assignment5-1f95c.firebasestorage.app",
  messagingSenderId: "754517814876",
  appId: "1:754517814876:web:977d860d060f1bbb224099"
};

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  public app = initializeApp(firebaseConfig);
  public auth = getAuth(this.app);
  public db = getFirestore(this.app);
}

const firebase_app = initializeApp(firebaseConfig);
const db = getFirestore(firebase_app);