import { db } from "./firebase.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 🔧 FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyBqnNgjPsEhxCX2kxvW4OUjLme0IqG8pTQ",
  authDomain: "mrs-test-tpv.firebaseapp.com",
  projectId: "mrs-test-tpv"
};


/* =========================
   CARGAR DATOS
========================= */

async function cargarEmpresa() {
  const ref = doc(db, "settings", "empresa");
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const e = snap.data();

  document.getElementById("nombre").value = e.nombre || "";
  document.getElementById("razon").value = e.razon || "";
  document.getElementById("cif").value = e.cif || "";
  document.getElementById("direccion").value = e.direccion || "";
  document.getElementById("telefono").value = e.telefono || "";
  document.getElementById("email").value = e.email || "";
  document.getElementById("pie").value = e.pie || "";
}

/* =========================
   GUARDAR
========================= */

window.guardarEmpresa = async function () {
  if (sessionStorage.getItem("rol") !== "admin") {
    alert("Solo el administrador puede modificar esto");
    return;
  }

  const data = {
    nombre: document.getElementById("nombre").value,
    razon: document.getElementById("razon").value,
    cif: document.getElementById("cif").value,
    direccion: document.getElementById("direccion").value,
    telefono: document.getElementById("telefono").value,
    email: document.getElementById("email").value,
    pie: document.getElementById("pie").value
  };

  await setDoc(doc(db, "settings", "empresa"), data);
  alert("Datos de empresa guardados");
};

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", cargarEmpresa);
