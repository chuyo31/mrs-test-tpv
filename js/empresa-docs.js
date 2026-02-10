import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function cargarEmpresaDocs() {
  const snap = await getDoc(doc(db, "settings", "panel_pro"));

  if (!snap.exists()) {
    return {
      nombre: "MRS TPV",
      datosHtml: "",
      pie: "",
      logo_url: null,
      nav_mostrar_logo: false,
      doc_logo: false
    };
  }

  const e = snap.data();
  const datos = [];

  // Construcción de datos para documentos (facturas/tickets)
  if (e.doc_direccion && e.direccion) datos.push(e.direccion);
  if (e.doc_telefono && e.telefono) datos.push("Tel: " + e.telefono);
  if (e.doc_email && e.email) datos.push(e.email);
  if (e.doc_web && e.web) datos.push(e.web);

  // Retornamos el objeto manteniendo los nombres originales de Firebase
  // para que navbar.js no se rompa
  return {
    ...e, // Pasamos todo el objeto original (incluye logo_url y nav_mostrar_logo)
    nombre: e.nombre || "MRS TPV",
    datosHtml: datos.join("<br>"),
    pie: e.pie || "",
    // Mantenemos estas por compatibilidad con tus scripts de facturas:
    logo: e.logo_url || null,
    mostrarLogo: e.doc_logo === true
  };
}