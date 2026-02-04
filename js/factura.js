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
     VALIDACIÓN
  ========================= */

  if (!v.numero_legal || !v.numero_legal.startsWith("FAC")) {
    alert("Esta venta no tiene factura generada");
    window.close();
    return;
  }

  /* =========================
     DATOS GENERALES
  ========================= */

  document.getElementById("factura-numero").innerText =
    v.numero_legal;

  document.getElementById("factura-fecha").innerText =
    v.fecha
      ? v.fecha.toDate().toLocaleDateString()
      : "";

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
      <td class="right">${l.cantidad}</td>
      <td class="right">${l.precio.toFixed(2)} €</td>
      <td class="right">${l.base.toFixed(2)} €</td>
    `;
    tbody.appendChild(tr);
  });

  /* =========================
     IMPRIMIR Y CERRAR
  ========================= */

  window.onafterprint = () => {
    window.close();
  };

  setTimeout(() => {
    window.print();
  }, 400);
}

document.addEventListener("DOMContentLoaded", cargarFactura);
