import { cargarEmpresaEnDocumento } from "./empresa-docs.js";
import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function cargarTicket() {
  const params = new URLSearchParams(window.location.search);
  await cargarEmpresaEnDocumento();
  const ventaId = params.get("id");

  if (!ventaId) {
    alert("Ticket sin venta");
    window.close();
    return;
  }

  /* =========================
     CARGAR VENTA
  ========================= */

  const ventaSnap = await getDoc(doc(db, "sales", ventaId));
  if (!ventaSnap.exists()) {
    alert("Venta no encontrada");
    window.close();
    return;
  }

  const v = ventaSnap.data();

  /* =========================
     CARGAR PANEL PRO
  ========================= */

  const panelSnap = await getDoc(doc(db, "settings", "panel_pro"));
  const p = panelSnap.exists() ? panelSnap.data() : {};

  /* =========================
     EMPRESA
  ========================= */

  const nombreEl = document.getElementById("empresa-nombre");
  const datosEl = document.getElementById("empresa-datos");

  if (nombreEl) nombreEl.innerText = p.nombre || "";

  let datos = [];

  if (p.doc_direccion && p.direccion) datos.push(p.direccion);
  if (p.doc_telefono && p.telefono) datos.push("Tel: " + p.telefono);
  if (p.doc_email && p.email) datos.push(p.email);
  if (p.doc_web && p.web) datos.push(p.web);

  if (datosEl) datosEl.innerText = datos.join(" · ");

  /* =========================
     DATOS TICKET
  ========================= */

  document.getElementById("ticket-numero").innerText =
    v.numero_legal || "";

  document.getElementById("ticket-fecha").innerText =
    v.fecha?.toDate().toLocaleString() || "";

  document.getElementById("subtotal").innerText =
    v.subtotal.toFixed(2) + " €";

  document.getElementById("iva").innerText =
    v.total_iva.toFixed(2) + " €";

  document.getElementById("recargo").innerText =
    v.total_recargo.toFixed(2) + " €";

  document.getElementById("total").innerText =
    v.total.toFixed(2) + " €";

  /* =========================
     LÍNEAS
  ========================= */

  const tbody = document.getElementById("lineas");
  tbody.innerHTML = "";

  v.lineas.forEach(l => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${l.cantidad} x ${l.nombre}</td>
      <td class="right">${l.base.toFixed(2)} €</td>
    `;
    tbody.appendChild(tr);
  });

  /* =========================
     MÉTODO DE PAGO
  ========================= */

  const metodoPagoEl = document.getElementById("metodo-pago");
  if (p.doc_pago && metodoPagoEl) {
    metodoPagoEl.innerText =
      v.metodo_pago === "efectivo" ? "Efectivo" : "Tarjeta";
  } else if (metodoPagoEl) {
    metodoPagoEl.parentElement.style.display = "none";
  }

  /* =========================
     EFECTIVO
  ========================= */

  const bloqueEfectivo = document.getElementById("bloque-efectivo");

  const empresa = await cargarEmpresaEnDocumento();

if (
  v.metodo_pago === "efectivo" &&
  empresa?.doc_pago
) {
  document.getElementById("entregado").innerText =
    v.efectivo_entregado.toFixed(2) + " €";
  document.getElementById("cambio").innerText =
    v.cambio.toFixed(2) + " €";
} else {
  document.getElementById("bloque-efectivo").style.display = "none";
}


  /* =========================
     PIE LEGAL
  ========================= */

  const pieEl = document.getElementById("pie-legal");
  if (pieEl && p.pie) pieEl.innerText = p.pie;

  /* =========================
     IMPRIMIR Y CERRAR
  ========================= */

  window.onafterprint = () => window.close();

  setTimeout(() => window.print(), 400);
}

document.addEventListener("DOMContentLoaded", cargarTicket);
