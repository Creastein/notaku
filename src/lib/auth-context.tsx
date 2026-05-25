"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import {
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => null,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) {
      setLoading(false);
      return;
    }

    // Handle redirect result when returning to the app on mobile
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
          console.log("Google redirect login success:", result.user);
        }
      })
      .catch((error) => {
        console.error("Google redirect login error:", error);
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    if (!auth) return null;
    try {
      // Check if it is a mobile device or running as standalone PWA
      const isMobileOrPWA = 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.matchMedia("(display-mode: standalone)").matches;

      if (isMobileOrPWA) {
        console.log("Mobile/PWA detected. Initiating signInWithRedirect...");
        await signInWithRedirect(auth, googleProvider);
        return null; // Will redirect away, execution stops here
      }

      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error: any) {
      // User closed popup intentionally — not an error
      if (error?.code === "auth/popup-closed-by-user" || error?.code === "auth/cancelled-popup-request") {
        console.log("Login popup closed/cancelled by user");
        return null;
      }
      // Re-throw actual errors so the caller can show them to the user
      console.error("Google sign-in error:", error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
