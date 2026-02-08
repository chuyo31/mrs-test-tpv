import { db } from "./firebase.js";
import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { cargarEmpresaDocs } from "./empresa-docs.js";

/* =========================
   CARGAR FACTURA
========================= */

async function cargarFactura() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    console.warn("Factura sin ID");
    return;
  }

  const facturaSnap = await getDoc(doc(db, "invoices", id));
  if (!facturaSnap.exists()) {
    console.warn("Factura no encontrada");
    return;
  }

  const f = facturaSnap.data();

  /* =========================
     EMPRESA
  ========================= */

  const empresa = await cargarEmpresaDocs();

document.getElementById("empresa-nombre").innerText = empresa.nombre;
document.getElementById("empresa-datos").innerHTML = empresa.datosHtml;
document.getElementById("pie-legal").innerText = empresa.pie || "";

const img = document.getElementById("empresa-logo");

if (empresa.logo && empresa.mostrarLogo) {
  img.src = empresa.logo;
  img.style.display = "block";
} else {
  img.style.display = "none";
}


  /* =========================
     DATOS FACTURA
  ========================= */

  document.getElementById("factura-numero").innerText =
    f.numero_legal || "";

  document.getElementById("factura-fecha").innerText =
    f.fecha?.toDate().toLocaleDateString() || "";

  document.getElementById("metodo-pago").innerText =
    f.metodo_pago === "efectivo" ? "Efectivo" : "Tarjeta";

  document.getElementById("subtotal").innerText =
    (f.subtotal ?? 0).toFixed(2) + " €";

  document.getElementById("iva").innerText =
    (f.total_iva ?? 0).toFixed(2) + " €";

  document.getElementById("recargo").innerText =
    (f.total_recargo ?? 0).toFixed(2) + " €";

  document.getElementById("total").innerText =
    (f.total ?? 0).toFixed(2) + " €";

  /* =========================
     LÍNEAS
  ========================= */

  const tbody = document.getElementById("lineas");
  tbody.innerHTML = "";

  (f.lineas || []).forEach(l => {
    const nombre =
      l.nombre ||
      l.producto ||
      l.descripcion ||
      "Artículo";

    const cantidad = l.cantidad ?? 1;
    const precio =
      l.precio ??
      (l.base && cantidad ? l.base / cantidad : 0);

    const base = l.base ?? 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${nombre}</td>
      <td class="right">${cantidad}</td>
      <td class="right">${precio.toFixed(2)} €</td>
      <td class="right">${base.toFixed(2)} €</td>
    `;
    tbody.appendChild(tr);
  });

  /* =========================
     IMPRIMIR
  ========================= */

  window.onafterprint = () => window.close();
  setTimeout(() => window.print(), 400);
}

document.addEventListener("DOMContentLoaded", cargarFactura);
