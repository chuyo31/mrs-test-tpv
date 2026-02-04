import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.login = async () => {
  const email = email.value;
  const password = password.value;

  const cred = await signInWithEmailAndPassword(auth, email, password);
  const ref = doc(db, "users", cred.user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await signOut(auth);
    return alert("Usuario sin rol");
  }

  sessionStorage.setItem("rol", snap.data().rol);
  sessionStorage.setItem("uid", cred.user.uid);
  window.location.href = "caja.html";
};

window.logout = async () => {
  await signOut(auth);
  sessionStorage.clear();
  window.location.href = "login.html";
};

onAuthStateChanged(auth, user => {
  if (!user && !location.pathname.includes("login")) {
    window.location.href = "login.html";
  }
});
