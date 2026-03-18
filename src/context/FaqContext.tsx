import React, { createContext, useContext, useState, useEffect } from 'react';
import { FaqCategory, defaultFaq } from '../data/defaultFaq';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot } from '../firebase';
import { User } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface FaqContextType {
  faqData: FaqCategory[];
  updateFaqData: (newData: FaqCategory[]) => Promise<void>;
  resetToDefault: () => Promise<void>;
  user: User | null;
  isAdmin: boolean;
  isAuthReady: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const FaqContext = createContext<FaqContextType | undefined>(undefined);

export const FaqProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [faqData, setFaqData] = useState<FaqCategory[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Check if user is admin
        if (currentUser.email === 'pedronobreneto27@gmail.com' && currentUser.emailVerified) {
          setIsAdmin(true);
        } else {
          try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            setIsAdmin(userDoc.exists() && userDoc.data().role === 'admin');
          } catch (error) {
            console.error("Error checking admin status:", error);
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Data Listener
  useEffect(() => {
    if (!isAuthReady) return;

    const unsubscribe = onSnapshot(collection(db, 'faq'), (snapshot) => {
      if (snapshot.empty) {
        // If Firestore is empty, we can optionally seed it or just use local default
        setFaqData(defaultFaq);
      } else {
        const data = snapshot.docs.map(doc => doc.data() as FaqCategory);
        setFaqData(data);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'faq');
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  const updateFaqData = async (newData: FaqCategory[]) => {
    if (!isAdmin) throw new Error("Unauthorized");
    
    try {
      // Get current docs to find what needs to be deleted
      const snapshot = await getDocs(collection(db, 'faq'));
      const currentIds = snapshot.docs.map(d => d.id);
      const newIds = newData.map(d => d.id);
      
      // Delete removed categories
      for (const id of currentIds) {
        if (!newIds.includes(id)) {
          await deleteDoc(doc(db, 'faq', id));
        }
      }
      
      // Add/Update categories
      for (const category of newData) {
        await setDoc(doc(db, 'faq', category.id), category);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'faq');
    }
  };

  const resetToDefault = async () => {
    if (!isAdmin) throw new Error("Unauthorized");
    await updateFaqData(defaultFaq);
  };

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  return (
    <FaqContext.Provider value={{ faqData, updateFaqData, resetToDefault, user, isAdmin, isAuthReady, login, logout }}>
      {children}
    </FaqContext.Provider>
  );
};

export const useFaq = () => {
  const context = useContext(FaqContext);
  if (context === undefined) {
    throw new Error('useFaq must be used within a FaqProvider');
  }
  return context;
};
