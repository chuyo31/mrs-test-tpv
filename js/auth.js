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

/* =========================
   LOGIN
========================= */
window.login = async function () {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  if (!emailInput || !passwordInput) {
    alert("Campos de login no encontrados");
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Introduce email y contraseña");
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await signOut(auth);
      alert("Usuario sin rol asignado");
      return;
    }

    const data = snap.data();

    if (!data.activo) {
      await signOut(auth);
      alert("Usuario desactivado");
      return;
    }

    sessionStorage.setItem("rol", data.rol);
    sessionStorage.setItem("uid", user.uid);

    window.location.href = "caja.html";

  } catch (error) {
    alert("Error de login: " + error.message);
  }
};

/* =========================
   LOGOUT
========================= */
window.logout = async function () {
  await signOut(auth);
  sessionStorage.clear();
  window.location.href = "login.html";
};

/* =========================
   PROTECCIÓN DE SESIÓN
========================= */
onAuthStateChanged(auth, (user) => {
  const enLogin = window.location.pathname.includes("login");

  if (!user && !enLogin) {
    window.location.href = "login.html";
  }
});
