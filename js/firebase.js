import { initializeApp, getApps } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBqnNgjPsEhxCX2kxvW4OUjLme0IqG8pTQ",
  authDomain: "mrs-test-tpv.firebaseapp.com",
  projectId: "mrs-test-tpv",
  storageBucket: "mrs-test-tpv.firebasestorage.app",
  messagingSenderId: "912692824915",
  appId: "1:912692824915:web:9d79acbbc7bcaf3cdb6fa6"
};

// ⛔ Evita duplicados
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
