import { cargarEmpresaEnDocumento } from "./empresa-docs.js";
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
  const facturaId = params.get("id");

  const empresa = await cargarEmpresaEnDocumento();
if (!empresa?.doc_pago) {
  document.getElementById("metodo-pago").parentElement.style.display = "none";
}


  if (!facturaId) {
    alert("Factura sin ID");
    window.close();
    return;
  }

  /* 🔹 AHORA BUSCAMOS EN 'invoices' */
  const snap = await getDoc(doc(db, "invoices", facturaId));

  if (!snap.exists()) {
    alert("Factura no encontrada");
    window.close();
    return;
  }

  const f = snap.data();

  /* =========================
     DATOS GENERALES
  ========================= */

  document.getElementById("factura-numero").innerText =
    f.numero_legal || "—";

  document.getElementById("factura-fecha").innerText =
    f.fecha
      ? f.fecha.toDate().toLocaleDateString()
      : "";

  document.getElementById("metodo-pago").innerText =
    f.metodo_pago === "efectivo" ? "Efectivo" : "Tarjeta";

  document.getElementById("subtotal").innerText =
    f.subtotal.toFixed(2) + " €";

  document.getElementById("iva").innerText =
    f.total_iva.toFixed(2) + " €";

  document.getElementById("recargo").innerText =
    f.total_recargo.toFixed(2) + " €";

  document.getElementById("total").innerText =
    f.total.toFixed(2) + " €";

  /* =========================
     LÍNEAS
  ========================= */

  const tbody = document.getElementById("lineas");
  tbody.innerHTML = "";

  f.lineas.forEach(l => {
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
