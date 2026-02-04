import { db } from "./firebase.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function cargarTicket() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) return;

  const snap = await getDoc(doc(db, "sales", id));
  if (!snap.exists()) return;

  const v = snap.data();

  document.getElementById("ticket-numero").innerText =
    String(v.ticket_numero).padStart(4, "0");

  document.getElementById("ticket-fecha").innerText =
    v.fecha?.toDate().toLocaleString() || "";

  document.getElementById("subtotal").innerText = v.subtotal.toFixed(2) + " €";
  document.getElementById("iva").innerText = v.total_iva.toFixed(2) + " €";
  document.getElementById("recargo").innerText = v.total_recargo.toFixed(2) + " €";
  document.getElementById("total").innerText = v.total.toFixed(2) + " €";

  document.getElementById("metodo-pago").innerText =
    v.metodo_pago === "efectivo" ? "Efectivo" : "Tarjeta";

  const tbody = document.getElementById("lineas");
  tbody.innerHTML = "";

  v.lineas.forEach(l => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${l.cantidad} x ${l.nombre}</td>
      <td style="text-align:right">${l.base.toFixed(2)} €</td>
    `;
    tbody.appendChild(tr);
  });

  // EFECTIVO
  if (v.metodo_pago === "efectivo") {
    document.getElementById("entregado").innerText =
      v.efectivo_entregado.toFixed(2) + " €";
    document.getElementById("cambio").innerText =
      v.cambio.toFixed(2) + " €";
  } else {
    document.getElementById("bloque-efectivo").style.display = "none";
  }

  setTimeout(() => {
    window.print();
    window.onafterprint = () => window.close();
  }, 300);
}

document.addEventListener("DOMContentLoaded", cargarTicket);
