import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

/* =========================
   STORAGE
========================= */

const storage = getStorage();

/* =========================
   CARGAR DATOS EMPRESA
========================= */

async function cargarEmpresa() {
  const refDoc = doc(db, "settings", "empresa");
  const snap = await getDoc(refDoc);

  if (!snap.exists()) return;

  const e = snap.data();

  // Textos
  document.getElementById("nombre").value = e.nombre || "";
  document.getElementById("razon").value = e.razon || "";
  document.getElementById("cif").value = e.cif || "";
  document.getElementById("direccion").value = e.direccion || "";
  document.getElementById("telefono").value = e.telefono || "";
  document.getElementById("email").value = e.email || "";
  document.getElementById("web").value = e.web || "";
  document.getElementById("pie").value = e.pie || "";

  // Checkboxes (configuración)
  document.getElementById("mostrar-direccion").checked = e.mostrar_direccion ?? true;
  document.getElementById("mostrar-telefono").checked = e.mostrar_telefono ?? true;
  document.getElementById("mostrar-email").checked = e.mostrar_email ?? true;
  document.getElementById("mostrar-web").checked = e.mostrar_web ?? false;
  document.getElementById("mostrar-logo").checked = e.mostrar_logo ?? true;

  // Preview logo
  if (e.logo_url) {
    const img = document.getElementById("logo-preview");
    img.src = e.logo_url;
    img.style.display = "block";
  }
}

/* =========================
   GUARDAR EMPRESA
========================= */

window.guardarEmpresa = async function () {
  if (sessionStorage.getItem("rol") !== "admin") {
    alert("Solo el administrador puede modificar estos datos");
    return;
  }

  const logoInput = document.getElementById("logo");
  let logoUrl = null;

  // Subir logo si hay archivo nuevo
  if (logoInput && logoInput.files.length > 0) {
    const file = logoInput.files[0];
    const logoRef = ref(storage, "empresa/logo.png");

    await uploadBytes(logoRef, file);
    logoUrl = await getDownloadURL(logoRef);
  }

  const mostrarDireccion = document.getElementById("mostrar-direccion").checked;
  const mostrarTelefono = document.getElementById("mostrar-telefono").checked;
  const mostrarEmail = document.getElementById("mostrar-email").checked;
  const mostrarWeb = document.getElementById("mostrar-web").checked;
  const mostrarLogo = document.getElementById("mostrar-logo").checked;

  const data = {
    // Datos empresa
    nombre: document.getElementById("nombre").value.trim(),
    razon: document.getElementById("razon").value.trim(),
    cif: document.getElementById("cif").value.trim(),
    direccion: document.getElementById("direccion").value.trim(),
    telefono: document.getElementById("telefono").value.trim(),
    email: document.getElementById("email").value.trim(),
    web: document.getElementById("web").value.trim(),
    pie: document.getElementById("pie").value.trim(),

    // Configuración visual
    mostrar_direccion: mostrarDireccion,
    mostrar_telefono: mostrarTelefono,
    mostrar_email: mostrarEmail,
    mostrar_web: mostrarWeb,
    mostrar_logo: mostrarLogo,

    // Flags DOCUMENTALES (tickets / facturas)
    doc_direccion: mostrarDireccion,
    doc_telefono: mostrarTelefono,
    doc_email: mostrarEmail,
    doc_web: mostrarWeb,
    doc_logo: mostrarLogo,
    doc_pago: true,
    doc_cambio: true,

    updated_at: new Date()
  };

  if (logoUrl) {
    data.logo_url = logoUrl;
  }

  await setDoc(doc(db, "settings", "empresa"), data, { merge: true });

  alert("✅ Datos de empresa guardados correctamente");
};

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", cargarEmpresa);
