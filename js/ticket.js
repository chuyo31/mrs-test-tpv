import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { cargarEmpresaDocs } from "./empresa-docs.js";

/* =========================
   CARGAR TICKET
========================= */

async function cargarTicket() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) return;

  const snap = await getDoc(doc(db, "sales", id));
  if (!snap.exists()) return;

  const v = snap.data();

  /* =========================
     EMPRESA
  ========================= */

  const empresa = await cargarEmpresaDocs();

document.getElementById("empresa-nombre").innerText = empresa.nombre;
document.getElementById("empresa-datos").innerHTML = empresa.datosHtml;
document.getElementById("pie-legal").innerText = empresa.pie || "";

if (empresa.logo) {
  const img = document.createElement("img");
  img.src = empresa.logo;
  img.style.maxWidth = "120px";
  img.style.marginBottom = "6px";

  document
    .getElementById("empresa-nombre")
    .before(img);
}


  /* =========================
     TICKET
  ========================= */

  document.getElementById("ticket-numero").innerText =
    v.numero_legal || "";

  document.getElementById("ticket-fecha").innerText =
    v.fecha?.toDate().toLocaleString() || "";

  document.getElementById("subtotal").innerText =
    (v.subtotal ?? 0).toFixed(2) + " €";

  document.getElementById("iva").innerText =
    (v.total_iva ?? 0).toFixed(2) + " €";

  document.getElementById("recargo").innerText =
    (v.total_recargo ?? 0).toFixed(2) + " €";

  document.getElementById("total").innerText =
    (v.total ?? 0).toFixed(2) + " €";

  document.getElementById("metodo-pago").innerText =
    v.metodo_pago === "efectivo" ? "Efectivo" : "Tarjeta";

  /* =========================
     LÍNEAS (ROBUSTAS)
  ========================= */

  const tbody = document.getElementById("lineas");
  tbody.innerHTML = "";

  (v.lineas || []).forEach(l => {
    const nombre =
      l.nombre ||
      l.producto ||
      l.descripcion ||
      "Artículo";

    const cantidad = l.cantidad ?? 1;
    const importe = l.base ?? l.total ?? 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${cantidad} x ${nombre}</td>
      <td class="right">${importe.toFixed(2)} €</td>
    `;
    tbody.appendChild(tr);
  });

  /* =========================
     EFECTIVO
  ========================= */

  if (v.metodo_pago === "efectivo") {
    document.getElementById("entregado").innerText =
      (v.efectivo_entregado ?? 0).toFixed(2) + " €";

    document.getElementById("cambio").innerText =
      (v.cambio ?? 0).toFixed(2) + " €";
  } else {
    const bloque = document.getElementById("bloque-efectivo");
    if (bloque) bloque.style.display = "none";
  }

  /* =========================
     IMPRIMIR
  ========================= */

  window.onafterprint = () => window.close();
  setTimeout(() => window.print(), 400);
}

document.addEventListener("DOMContentLoaded", cargarTicket);
