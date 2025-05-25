import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const googleProvider = new GoogleAuthProvider();

// Configure Google Auth Provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // List of authorized admin emails - Only these will have admin privileges
  const adminEmails = [
    'kyawwin@gmail.com',
    'helium33hl@gmail.com'
  ];

  // List of authorized staff emails - All staff can login
  const authorizedEmails = [
    ...adminEmails,
    'chittulay2001@gmail.com'
    // Add other staff emails here if needed
  ];

  const logUserActivity = async (currentUser: User, action: 'Login' | 'Logout', authorized: boolean = true) => {
    try {
      const position = 'geolocation' in navigator ? 
        await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        }) : null;

      const activityData = {
        action,
        details: authorized 
          ? `User ${action.toLowerCase()}ed successfully`
          : `Unauthorized ${action.toLowerCase()} attempt`,
        staffId: currentUser.uid,
        staffEmail: currentUser.email,
        timestamp: serverTimestamp(),
        authorized,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        ...(position && {
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        })
      };

      await addDoc(collection(db, 'activityLogs'), activityData);
      
      if (authorized) {
        await addDoc(collection(db, 'notifications'), {
          type: 'System',
          title: `User ${action}`,
          message: `${currentUser.email} ${action.toLowerCase()}ed at ${new Date().toLocaleString()}`,
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error(`Error logging ${action.toLowerCase()} activity:`, error);
    }
  };

  const checkUserAuthorization = async (email: string): Promise<boolean> => {
    // Check if email is in authorized list
    if (authorizedEmails.includes(email)) {
      return true;
    }

    // Check if email exists in staff collection
    const staffQuery = query(
      collection(db, 'staff'),
      where('email', '==', email),
      where('active', '==', true)
    );
    
    const snapshot = await getDocs(staffQuery);
    return !snapshot.empty;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const isAuthorized = await checkUserAuthorization(currentUser.email || '');
        
        if (!isAuthorized) {
          await logUserActivity(currentUser, 'Login', false);
          await firebaseSignOut(auth);
          setUser(null);
          setIsAdmin(false);
          return;
        }

        await logUserActivity(currentUser, 'Login');
        
        // Check if user is an admin (only the specified admin emails)
        setIsAdmin(adminEmails.includes(currentUser.email || ''));
        setUser(currentUser);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    const isAuthorized = await checkUserAuthorization(result.user.email || '');
    
    if (!isAuthorized) {
      await logUserActivity(result.user, 'Login', false);
      await firebaseSignOut(auth);
      throw new Error('Unauthorized email. Please use your staff email address.');
    }
  };

  const logout = async () => {
    if (user) {
      await logUserActivity(user, 'Logout');
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};