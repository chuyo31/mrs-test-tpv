import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { cargarEmpresaDocs } from "./empresa-docs.js";

async function cargarTicket() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) return;

  const snap = await getDoc(doc(db, "sales", id));
  if (!snap.exists()) return;

  const v = snap.data();

  /* =========================
      EMPRESA & LOGO
  ========================= */
  const empresa = await cargarEmpresaDocs();
  document.getElementById("empresa-nombre").innerText = empresa.nombre;
  document.getElementById("empresa-datos").innerHTML = empresa.datosHtml;
  document.getElementById("pie-legal").innerText = empresa.pie || "";

  const imgLogo = document.getElementById("empresa-logo");
  if (empresa.logo && empresa.mostrarLogo) {
    imgLogo.src = empresa.logo;
    imgLogo.style.display = "inline-block";
  } else {
    imgLogo.style.display = "none";
  }

  /* =========================
      DATOS TICKET
  ========================= */
  document.getElementById("ticket-numero").innerText = v.numero_legal || "";
  document.getElementById("ticket-fecha").innerText = v.fecha?.toDate().toLocaleString() || "";
  document.getElementById("metodo-pago").innerText = v.metodo_pago === "efectivo" ? "Efectivo" : "Tarjeta";

  /* =========================
      LÍNEAS Y DESGLOSE
  ========================= */
  const tbody = document.getElementById("lineas");
  tbody.innerHTML = "";

  let acumuladoSubtotal = 0;
  let acumuladoIva = 0;
  let acumuladoRecargo = 0;

  (v.lineas || []).forEach(l => {
    const cantidad = l.cantidad ?? 1;
    const pvpUnitario = l.precio ?? 0;
    const pvpTotalFila = pvpUnitario * cantidad;

    // Recalculamos el desglose según el tipo fiscal guardado en la línea
    const divisor = (l.tipoFiscal === "IVA_RE") ? 1.262 : 1.21;
    const baseFila = pvpTotalFila / divisor;
    const ivaFila = baseFila * 0.21;
    const reFila = (l.tipoFiscal === "IVA_RE") ? (baseFila * 0.052) : 0;

    acumuladoSubtotal += baseFila;
    acumuladoIva += ivaFila;
    acumuladoRecargo += reFila;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${cantidad} x ${l.nombre}</td>
      <td class="right">${pvpTotalFila.toFixed(2)} €</td>
    `;
    tbody.appendChild(tr);
  });

  // Mostrar Totales Desglosados
  document.getElementById("subtotal").innerText = acumuladoSubtotal.toFixed(2) + " €";
  document.getElementById("iva").innerText = acumuladoIva.toFixed(2) + " €";
  document.getElementById("recargo").innerText = acumuladoRecargo.toFixed(2) + " €";
  document.getElementById("total").innerText = (v.total ?? (acumuladoSubtotal + acumuladoIva + acumuladoRecargo)).toFixed(2) + " €";

  /* =========================
      BLOQUE PAGO/EFECTIVO
  ========================= */
  if (v.metodo_pago === "efectivo") {
    const totalVenta = v.total ?? 0;
    const entregado = v.efectivo_entregado ?? 0;
    const cambio = entregado - totalVenta;
    
    document.getElementById("entregado").innerText = entregado.toFixed(2) + " €";
    document.getElementById("cambio").innerText = (cambio > 0 ? cambio : 0).toFixed(2) + " €";
  } else {
    document.getElementById("bloque-efectivo").style.display = "none";
  }

  /* =========================
      AUTO-IMPRIMIR
  ========================= */
  setTimeout(() => {
    window.print();
    window.onafterprint = () => window.close();
  }, 700);
}

document.addEventListener("DOMContentLoaded", cargarTicket);