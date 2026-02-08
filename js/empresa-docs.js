import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function cargarEmpresaDocs() {
  const snap = await getDoc(doc(db, "settings", "panel_pro"));

  if (!snap.exists()) {
    return {
      nombre: "TU EMPRESA",
      datosHtml: "",
      pie: "",
      logo: null,
      mostrarLogo: false
    };
  }

  const e = snap.data();
  const datos = [];

  if (e.doc_direccion && e.direccion) datos.push(e.direccion);
  if (e.doc_telefono && e.telefono) datos.push("Tel: " + e.telefono);
  if (e.doc_email && e.email) datos.push(e.email);
  if (e.doc_web && e.web) datos.push(e.web);

  return {
    nombre: e.nombre || "TU EMPRESA",
    datosHtml: datos.join("<br>"),
    pie: e.pie || "",
    logo: e.logo_url || null,        // 👈 CLAVE
    mostrarLogo: e.doc_logo === true // 👈 CONTROL VISUAL
  };
}
