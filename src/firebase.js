import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Cole aqui as chaves do seu projeto Firebase
// Console Firebase → Configurações do projeto → Seus apps → firebaseConfig
const firebaseConfig = {
  apiKey:            "AIzaSyBT3dJm-_gqC0v_qtQVL6UBYpyKtoKMxLI",
  authDomain:        "metro-6af82.firebaseapp.com",
  projectId:         "metro-6af82",
  storageBucket:     "metro-6af82.firebasestorage.app",
  messagingSenderId: "347920070007",
  appId:             "1:347920070007:web:2bbf572d588fa751a3dd72",
  measurementId:     "G-N2Y3S2ZKWV",
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
