import { Plugin, StateMirrorInstance, Patch, FirebaseConfig } from '../types';

export interface FirebasePluginConfig extends FirebaseConfig {
  path?: string;
  auth?: boolean;
  realtime?: boolean;
  firestore?: boolean;
}

/**
 * Firebase plugin for cross-device synchronization
 */
export function pluginFirebase(config: FirebasePluginConfig): Plugin {
  let db: any = null;
  let ref: any = null;
  let isConnected = false;

  const initializeFirebase = async () => {
    try {
      // Dynamic import to avoid bundling Firebase in the main bundle
      const { initializeApp } = await import('firebase/app');
      const firebaseDatabase = await import('firebase/database');
      const { getDatabase, ref: dbRef, onValue, set, push } = firebaseDatabase;
      
      const app = initializeApp(config);
      db = getDatabase(app);
      
      const path = config.path || 'state-mirror';
      ref = dbRef(db, path);
      
      // Listen for changes
      onValue(ref, (snapshot) => {
        const data = snapshot.val();
        if (data && isConnected) {
          // Handle incoming data
          handleFirebaseData(data);
        }
      });
      
      isConnected = true;
      console.log('StateMirror: Firebase connected');
    } catch (error) {
      console.error('StateMirror: Failed to initialize Firebase:', error);
      throw error;
    }
  };

  const handleFirebaseData = (data: any) => {
    // This would be implemented to handle incoming Firebase data
    // and convert it to patches for the state mirror
    console.log('StateMirror: Received Firebase data:', data);
  };

  const sendToFirebase = async (patch: Patch) => {
    if (!db || !ref) return;

    try {
      const firebaseDatabase = await import('firebase/database');
      const { push, set } = firebaseDatabase;
      
      // Send patch to Firebase
      const patchRef = push(ref);
      await set(patchRef, {
        ...patch,
        timestamp: Date.now(),
        deviceId: navigator.userAgent
      });
    } catch (error) {
      console.error('StateMirror: Failed to send to Firebase:', error);
      throw error;
    }
  };

  return {
    id: 'firebase',
    name: 'StateMirror Firebase',
    version: '1.0.0',

    async onInit(instance: StateMirrorInstance) {
      await initializeFirebase();
    },

    onSend(patch: Patch, instance: StateMirrorInstance) {
      if (isConnected) {
        sendToFirebase(patch).catch(error => {
          console.error('StateMirror: Firebase send error:', error);
        });
      }
      return patch;
    },

    onReceive(patch: Patch, instance: StateMirrorInstance) {
      // Handle patches received from Firebase
      return patch;
    },

    onApply(patch: Patch, instance: StateMirrorInstance) {
      // Log Firebase-applied patches
      console.log('StateMirror: Applied Firebase patch:', patch.id);
    },

    onDestroy(instance: StateMirrorInstance) {
      isConnected = false;
      console.log('StateMirror: Firebase plugin destroyed');
    }
  };
}

/**
 * Create a Firebase plugin with custom configuration
 */
export function createFirebasePlugin(config: FirebasePluginConfig): Plugin {
  return pluginFirebase(config);
} 