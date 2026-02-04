import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   CARGAR TICKET
========================= */

async function cargarTicket() {
  const params = new URLSearchParams(window.location.search);
  const ventaId = params.get("id");

  if (!ventaId) {
    alert("Ticket sin venta");
    window.close();
    return;
  }

  const snap = await getDoc(doc(db, "sales", ventaId));
  if (!snap.exists()) {
    alert("Venta no encontrada");
    window.close();
    return;
  }

  const v = snap.data();

  /* =========================
     VALIDACIÓN DE TICKET
  ========================= */

  // Aceptar tickets antiguos y nuevos
const numeroTicket = v.numero_legal
  ? v.numero_legal
  : `TCK-${String(v.ticket_numero || "").padStart(4, "0")}`;

document.getElementById("ticket-numero").innerText = numeroTicket;

  /* =========================
     DATOS GENERALES
  ========================= */

  document.getElementById("ticket-numero").innerText = v.numero_legal;

  document.getElementById("ticket-fecha").innerText =
    v.fecha
      ? v.fecha.toDate().toLocaleString()
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
     LÍNEAS (COINCIDE CON <tbody id="lineas">)
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
     EFECTIVO (CONDICIONAL)
  ========================= */

  const bloqueEfectivo = document.getElementById("bloque-efectivo");

  if (v.metodo_pago === "efectivo") {
    document.getElementById("entregado").innerText =
      v.efectivo_entregado.toFixed(2) + " €";

    document.getElementById("cambio").innerText =
      v.cambio.toFixed(2) + " €";
  } else {
    bloqueEfectivo.style.display = "none";
  }

  /* =========================
     IMPRIMIR Y CERRAR
  ========================= */

  window.onafterprint = () => {
    window.close();
  };

  // Esperar a que el DOM esté completamente pintado
  setTimeout(() => {
    window.print();
  }, 400);
}

document.addEventListener("DOMContentLoaded", cargarTicket);
