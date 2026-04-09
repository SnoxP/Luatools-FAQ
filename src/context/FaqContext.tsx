import React, { createContext, useContext, useState, useEffect } from 'react';
import { FaqCategory, defaultFaq } from '../data/defaultFaq';
import { auth, db, OAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile, collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot, increment } from '../firebase';
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
  userData: any | null;
  isAdmin: boolean;
  isAuthReady: boolean;
  login: () => Promise<void>;
  signup: () => Promise<void>;
  logout: () => Promise<void>;
}

const FaqContext = createContext<FaqContextType | undefined>(undefined);

export const FaqProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [faqData, setFaqData] = useState<FaqCategory[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Check for custom token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const customToken = urlParams.get('auth_token');
    if (customToken) {
      // Clear token from URL to prevent sharing it
      window.history.replaceState({}, document.title, window.location.pathname);
      import('firebase/auth').then(({ signInWithCustomToken }) => {
        signInWithCustomToken(auth, customToken).catch(console.error);
      });
    }
  }, []);

  // Auth Listener
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      setUser(currentUser);
      
      if (currentUser) {
        const discordId = currentUser.providerData.find(p => p.providerId === 'oidc.discord')?.uid || '';
        const isMainAdmin = discordId === '542832142745337867';

        // Check if user is admin based on Firestore role
        try {
          unsubscribeUser = onSnapshot(doc(db, 'users', currentUser.uid), async (userDoc) => {
            if (userDoc.exists()) {
              const data = userDoc.data();
              if (data.isBanned) {
                // If banned, sign out immediately
                signOut(auth).then(() => {
                  setUser(null);
                  setUserData(null);
                  setIsAdmin(false);
                  setIsAuthReady(true);
                  alert("Sua conta foi banida. Entre em contato com o administrador.");
                });
                return;
              }
              
              // Auto-promote to admin if they are a main admin but their role is not admin
              if (isMainAdmin && data.role !== 'admin') {
                try {
                  await setDoc(doc(db, 'users', currentUser.uid), { role: 'admin' }, { merge: true });
                } catch (e) {
                  console.error("Failed to auto-promote admin", e);
                }
              }
              
              setUserData(data);
              setIsAdmin(data.role === 'admin' || isMainAdmin);
            } else {
              // Document doesn't exist, try to create it (recovery for users created when rules were strict)
              try {
                const email = currentUser.email || '';
                let discordUsername = currentUser.displayName || 'Usuário do Discord';
                if (discordId && discordUsername.endsWith(`(${discordId})`)) {
                  discordUsername = discordUsername.replace(` (${discordId})`, '').trim();
                }
                
                await setDoc(doc(db, 'users', currentUser.uid), {
                  email: email,
                  username: discordUsername,
                  discordId: discordId,
                  role: isMainAdmin ? 'admin' : 'user',
                  isOnline: true,
                  lastActive: Date.now()
                });
                console.log("Created missing user document for", currentUser.uid);
              } catch (e) {
                console.error("Failed to create missing user document", e);
              }
              
              setUserData(null);
              setIsAdmin(isMainAdmin);
            }
            setIsAuthReady(true);
          }, (error) => {
            console.error("Error checking admin status:", error);
            setUserData(null);
            setIsAdmin(false);
            setIsAuthReady(true);
          });
        } catch (error) {
          console.error("Error checking admin status:", error);
          setUserData(null);
          setIsAdmin(false);
          setIsAuthReady(true);
        }
      } else {
        setUserData(null);
        setIsAdmin(false);
        setIsAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  // Analytics Tracker
  useEffect(() => {
    const trackVisit = async () => {
      const today = new Date().toISOString().split('T')[0];
      const visitKey = `visited_${today}`;
      
      if (!sessionStorage.getItem(visitKey)) {
        try {
          await setDoc(doc(db, 'analytics', today), {
            visits: increment(1)
          }, { merge: true });
          sessionStorage.setItem(visitKey, 'true');
        } catch (err) {
          console.error("Error tracking visit", err);
        }
      }
    };
    trackVisit();
  }, []);

  useEffect(() => {
    if (user) {
      const trackLogin = async () => {
        const today = new Date().toISOString().split('T')[0];
        const loginKey = `logged_in_${today}_${user.uid}`;
        
        if (!sessionStorage.getItem(loginKey)) {
          try {
            await setDoc(doc(db, 'analytics', today), {
              logins: increment(1)
            }, { merge: true });
            sessionStorage.setItem(loginKey, 'true');
          } catch (err) {
            console.error("Error tracking login", err);
          }
        }
      };
      trackLogin();
    }
  }, [user]);

  // Presence Tracker
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    
    const setOnline = async () => {
      try {
        await setDoc(userRef, { 
          isOnline: true, 
          lastActive: Date.now()
        }, { merge: true });
      } catch (error) {
        console.error("Error setting online status", error);
      }
    };

    setOnline();

    const interval = setInterval(() => {
      setDoc(userRef, { lastActive: Date.now() }, { merge: true }).catch(console.error);
    }, 60000);

    const handleBeforeUnload = () => {
      setDoc(userRef, { isOnline: false, lastActive: Date.now() }, { merge: true }).catch(console.error);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setDoc(userRef, { isOnline: false, lastActive: Date.now() }, { merge: true }).catch(console.error);
    };
  }, [user]);

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
    window.location.href = '/api/auth/discord';
  };

  const signup = async () => {
    window.location.href = '/api/auth/discord';
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
    <FaqContext.Provider value={{ faqData, updateFaqData, resetToDefault, user, userData, isAdmin, isAuthReady, login, signup, logout }}>
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
