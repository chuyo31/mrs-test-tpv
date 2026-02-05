import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   REFERENCIA
========================= */

const PANEL_REF = doc(db, "settings", "panel_pro");

/* =========================
   CARGAR PANEL PRO
========================= */

async function cargarPanelPro() {
  const snap = await getDoc(PANEL_REF);
  if (!snap.exists()) return;

  const d = snap.data();

  // ===== EMPRESA =====
  document.getElementById("nombre").value = d.nombre || "";
  document.getElementById("razon").value = d.razon || "";
  document.getElementById("cif").value = d.cif || "";
  document.getElementById("direccion").value = d.direccion || "";
  document.getElementById("telefono").value = d.telefono || "";
  document.getElementById("email").value = d.email || "";
  document.getElementById("web").value = d.web || "";
  document.getElementById("logo").value = d.logo || "";

  // ===== DOCUMENTOS =====
  document.getElementById("doc-logo").checked = d.doc_logo ?? true;
  document.getElementById("doc-direccion").checked = d.doc_direccion ?? true;
  document.getElementById("doc-telefono").checked = d.doc_telefono ?? true;
  document.getElementById("doc-email").checked = d.doc_email ?? true;
  document.getElementById("doc-web").checked = d.doc_web ?? false;
  document.getElementById("doc-pago").checked = d.doc_pago ?? true;
  document.getElementById("doc-cambio").checked = d.doc_cambio ?? true;

  document.getElementById("pie").value = d.pie || "";

  // ===== APARIENCIA =====
  document.getElementById("tema").value = d.tema || "claro";
  document.getElementById("color").value = d.color || "#2563eb";
}

/* =========================
   GUARDAR PANEL PRO
========================= */

window.guardarPanelPro = async function () {
  if (sessionStorage.getItem("rol") !== "admin") {
    alert("Solo el administrador puede modificar la configuración");
    return;
  }

  const data = {
    // ===== EMPRESA =====
    nombre: document.getElementById("nombre").value.trim(),
    razon: document.getElementById("razon").value.trim(),
    cif: document.getElementById("cif").value.trim(),
    direccion: document.getElementById("direccion").value.trim(),
    telefono: document.getElementById("telefono").value.trim(),
    email: document.getElementById("email").value.trim(),
    web: document.getElementById("web").value.trim(),
    logo: document.getElementById("logo").value.trim(),

    // ===== DOCUMENTOS =====
    doc_logo: document.getElementById("doc-logo").checked,
    doc_direccion: document.getElementById("doc-direccion").checked,
    doc_telefono: document.getElementById("doc-telefono").checked,
    doc_email: document.getElementById("doc-email").checked,
    doc_web: document.getElementById("doc-web").checked,
    doc_pago: document.getElementById("doc-pago").checked,
    doc_cambio: document.getElementById("doc-cambio").checked,

    pie: document.getElementById("pie").value.trim(),

    // ===== APARIENCIA =====
    tema: document.getElementById("tema").value,
    color: document.getElementById("color").value,

    updated_at: new Date()
  };

  await setDoc(PANEL_REF, data, { merge: true });

  alert("✅ Configuración guardada correctamente");
};

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", cargarPanelPro);
