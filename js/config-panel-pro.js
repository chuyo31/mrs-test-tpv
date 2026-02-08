console.log("⚙️ config-panel-pro.js CARGADO");

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

const storage = getStorage();

/* =========================
   CARGAR CONFIGURACIÓN
========================= */
async function cargarPanelPro() {
  const snap = await getDoc(doc(db, "settings", "panel_pro"));
  if (!snap.exists()) return;

  const d = snap.data();

  document.getElementById("nombre").value = d.nombre || "";
  document.getElementById("razon").value = d.razon || "";
  document.getElementById("cif").value = d.cif || "";
  document.getElementById("direccion").value = d.direccion || "";
  document.getElementById("telefono").value = d.telefono || "";
  document.getElementById("email").value = d.email || "";
  document.getElementById("web").value = d.web || "";
  document.getElementById("pie").value = d.pie || "";

  document.getElementById("doc-logo").checked = d.doc_logo ?? true;
  document.getElementById("doc-direccion").checked = d.doc_direccion ?? true;
  document.getElementById("doc-telefono").checked = d.doc_telefono ?? true;
  document.getElementById("doc-email").checked = d.doc_email ?? false;
  document.getElementById("doc-web").checked = d.doc_web ?? false;
  document.getElementById("doc-pago").checked = d.doc_pago ?? true;
  document.getElementById("doc-cambio").checked = d.doc_cambio ?? true;

  if (d.logo_url) {
    const img = document.getElementById("logo-preview");
    img.src = d.logo_url;
    img.style.display = "block";
  }
}

/* =========================
   GUARDAR CONFIGURACIÓN
========================= */
window.guardarPanelPro = async function () {
  const fileInput = document.getElementById("logo");
  let logoUrl = null;

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const storageRef = ref(storage, "empresa/logo.png");

    await uploadBytes(storageRef, file);
    logoUrl = await getDownloadURL(storageRef);
  }

  const data = {
    nombre: nombre.value.trim(),
    razon: razon.value.trim(),
    cif: cif.value.trim(),
    direccion: direccion.value.trim(),
    telefono: telefono.value.trim(),
    email: email.value.trim(),
    web: web.value.trim(),
    pie: pie.value.trim(),

    doc_logo: document.getElementById("doc-logo").checked,
    doc_direccion: document.getElementById("doc-direccion").checked,
    doc_telefono: document.getElementById("doc-telefono").checked,
    doc_email: document.getElementById("doc-email").checked,
    doc_web: document.getElementById("doc-web").checked,
    doc_pago: document.getElementById("doc-pago").checked,
    doc_cambio: document.getElementById("doc-cambio").checked,

    updated_at: new Date()
  };

  if (logoUrl) data.logo_url = logoUrl;

  await setDoc(doc(db, "settings", "panel_pro"), data, { merge: true });

  alert("✅ Configuración guardada correctamente");
};

document.addEventListener("DOMContentLoaded", cargarPanelPro);
