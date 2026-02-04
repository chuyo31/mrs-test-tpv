import { db } from "./firebase.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   CARGAR FACTURA
========================= */

async function cargarFactura() {
  const params = new URLSearchParams(window.location.search);
  const ventaId = params.get("id");

  if (!ventaId) return;

  const snap = await getDoc(doc(db, "sales", ventaId));
  if (!snap.exists()) return;

  const v = snap.data();

  /* =========================
     DATOS GENERALES
  ========================= */

  document.getElementById("factura-numero").innerText =
    v.numero_legal ||
    `FAC-${new Date().getFullYear()}-${String(v.ticket_numero).padStart(6, "0")}`;

  document.getElementById("factura-fecha").innerText =
    v.fecha?.toDate().toLocaleDateString() || "";

  document.getElementById("subtotal").innerText =
    v.subtotal.toFixed(2) + " €";

  document.getElementById("iva").innerText =
    v.total_iva.toFixed(2) + " €";

  document.getElementById("recargo").innerText =
    v.total_recargo.toFixed(2) + " €";

  document.getElementById("total").innerText =
    v.total.toFixed(2) + " €";

  document.getElementById("metodo-pago").innerText =
    v.metodo_pago === "efectivo" ? "Efectivo" : "Tarjeta";

  /* =========================
     LÍNEAS
  ========================= */

  const tbody = document.getElementById("lineas");
  tbody.innerHTML = "";

  v.lineas.forEach(l => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${l.nombre}</td>
      <td>${l.cantidad}</td>
      <td>${l.precio.toFixed(2)} €</td>
      <td>${l.base.toFixed(2)} €</td>
    `;
    tbody.appendChild(tr);
  });

  /* =========================
     IMPRIMIR + CIERRE SEGURO
  ========================= */

  // 1️⃣ Cierre clásico
  window.onafterprint = () => {
    window.close();
  };

  // 2️⃣ Cierre de respaldo (Chrome / Edge)
  window.onfocus = () => {
    setTimeout(() => window.close(), 300);
  };

  // Esperar a que el DOM pinte todo
  setTimeout(() => {
    window.print();
  }, 400);
}

document.addEventListener("DOMContentLoaded", cargarFactura);
