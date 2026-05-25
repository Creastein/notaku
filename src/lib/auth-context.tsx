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
  authError: any;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => null,
  signOut: async () => {},
  authError: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<any>(null);

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
        setAuthError(error);
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    if (!auth) return null;
    setAuthError(null);
    try {
      console.log("Attempting signInWithPopup...");
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error: any) {
      // User closed popup intentionally — not a fatal error
      if (error?.code === "auth/popup-closed-by-user" || error?.code === "auth/cancelled-popup-request") {
        console.log("Login popup closed/cancelled by user");
        return null;
      }

      // Check if popup was blocked or failed
      const isPopupBlocked = 
        error?.code === "auth/popup-blocked" || 
        error?.code === "auth/cancelled-popup-request" ||
        error?.code === "auth/network-request-failed" ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isPopupBlocked) {
        console.log("Popup failed or blocked on mobile. Falling back to signInWithRedirect...");
        try {
          await signInWithRedirect(auth, googleProvider);
          return null; // Will redirect away, execution stops
        } catch (redirectError: any) {
          console.error("Google signInWithRedirect fallback error:", redirectError);
          setAuthError(redirectError);
          throw redirectError;
        }
      }

      console.error("Google sign-in error:", error);
      setAuthError(error);
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
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, authError }}>
      {children}
    </AuthContext.Provider>
  );
}
