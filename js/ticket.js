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
  const mostrarLogo = !!(empresa.logo && empresa.mostrarLogo);
  if (mostrarLogo) {
    imgLogo.src = empresa.logo;
    imgLogo.style.display = "inline-block";
  } else {
    imgLogo.style.display = "none";
  }
  const nombreEl = document.getElementById("empresa-nombre");
  if (nombreEl) nombreEl.style.display = mostrarLogo ? "none" : "inline";
  
  // Centrar y limitar el ancho del logo al ancho de la línea de dirección
  if (mostrarLogo) {
    const datosEl = document.getElementById("empresa-datos");
    if (datosEl) {
      let anchoRef = 0;
      const direccionText = empresa.direccion || "";
      if (direccionText) {
        const measure = document.createElement("span");
        const cs = getComputedStyle(datosEl);
        measure.style.visibility = "hidden";
        measure.style.whiteSpace = "pre";
        measure.style.fontSize = cs.fontSize;
        measure.style.fontFamily = cs.fontFamily;
        measure.textContent = direccionText;
        datosEl.parentNode.insertBefore(measure, datosEl);
        anchoRef = measure.offsetWidth;
        measure.remove();
      } else {
        anchoRef = datosEl.offsetWidth;
      }
      if (anchoRef > 0) {
        imgLogo.style.maxWidth = anchoRef + "px";
      }
      imgLogo.style.height = "auto";
      imgLogo.style.margin = "0 auto";
      imgLogo.style.marginTop = "2mm";
      imgLogo.style.display = "inline-block";
    }
  }
  // Reducir el espacio vertical: ocultar BRs cuando el logo está activo y el nombre oculto
  if (mostrarLogo) {
    const brTrasLogo = imgLogo.nextElementSibling;
    if (brTrasLogo && brTrasLogo.tagName === "BR") brTrasLogo.style.display = "none";
    if (nombreEl && nombreEl.style.display === "none") {
      const brTrasNombre = nombreEl.nextElementSibling;
      if (brTrasNombre && brTrasNombre.tagName === "BR") brTrasNombre.style.display = "none";
    }
    // Ajustar margen inferior extremadamente pequeño
    imgLogo.style.marginBottom = "2px";
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

  (v.lineas || []).forEach(l => {
    const cantidad = l.cantidad ?? 1;
    const pvpUnitario = l.precio ?? 0;
    const pvpTotalFila = pvpUnitario * cantidad;

    // Usamos el desglose guardado si existe, si no, recalculamos con IVA 21% (retrocompatibilidad)
    const baseFila = (l.base_imponible ? l.base_imponible * cantidad : pvpTotalFila / 1.21);
    const ivaFila = (l.cuota_iva ? l.cuota_iva * cantidad : baseFila * 0.21);

    acumuladoSubtotal += baseFila;
    acumuladoIva += ivaFila;

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

  document.getElementById("total").innerText = (v.total ?? (acumuladoSubtotal + acumuladoIva)).toFixed(2) + " €";

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
