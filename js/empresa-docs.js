import { db } from "./firebase.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function cargarEmpresaEnDocumento() {
  const snap = await getDoc(doc(db, "settings", "empresa"));
  if (!snap.exists()) return null;

  const e = snap.data();

  // Nombre
  const nombreEl = document.getElementById("empresa-nombre");
  if (nombreEl) nombreEl.innerText = e.nombre || "";

  // Bloque datos empresa
  const datosEl = document.getElementById("empresa-datos");
  if (datosEl) {
    let html = "";

    if (e.doc_direccion && e.direccion) html += `${e.direccion}<br>`;
    if (e.doc_telefono && e.telefono) html += `Tel: ${e.telefono}<br>`;
    if (e.doc_email && e.email) html += `${e.email}<br>`;
    if (e.doc_web && e.web) html += `${e.web}<br>`;
    if (e.cif) html += `CIF: ${e.cif}`;

    datosEl.innerHTML = html;
  }

  // Logo
  const logoEl = document.getElementById("empresa-logo");
  if (logoEl && e.doc_logo && e.logo_url) {
    logoEl.src = e.logo_url;
    logoEl.style.display = "block";
  }

  // Pie legal
  const pieEl = document.getElementById("pie-legal");
  if (pieEl && e.pie) {
    pieEl.innerText = e.pie;
  }

  return e;
}
