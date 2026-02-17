import { db } from "./firebase.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  Timestamp
} from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const storage = getStorage();

/* 🔧 FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyBqnNgjPsEhxCX2kxvW4OUjLme0IqG8pTQ",
  authDomain: "mrs-test-tpv.firebaseapp.com",
  projectId: "mrs-test-tpv"
};

let ventasFiltradas = [];
let rangoActual = "";
let categoriasMapa = {};
let resumenCategorias = [];

async function ensureResumen() {
  const desde = document.getElementById("fecha-desde").value;
  const hasta = document.getElementById("fecha-hasta").value;
  if (!desde || !hasta) { alert("Selecciona ambas fechas"); return false; }
  const r = `${desde} a ${hasta}`;
  if (!ventasFiltradas.length || rangoActual !== r) {
    await window.calcularResumen();
  }
  return true;
}
/* =========================
   CALCULAR RESUMEN
========================= */

window.calcularResumen = async function () {
  const desde = document.getElementById("fecha-desde").value;
  const hasta = document.getElementById("fecha-hasta").value;

  if (!desde || !hasta) {
    alert("Selecciona ambas fechas");
    return;
  }

  const fDesde = Timestamp.fromDate(new Date(desde + "T00:00:00"));
  const fHasta = Timestamp.fromDate(new Date(hasta + "T23:59:59"));
  rangoActual = `${desde} a ${hasta}`;

  const q = query(
    collection(db, "sales"),
    where("fecha", ">=", fDesde),
    where("fecha", "<=", fHasta)
  );

  const snap = await getDocs(q);

  let totalVentas = 0;
  let baseIVA = 0;
  let totalIVA = 0;

  ventasFiltradas = [];
  resumenCategorias = [];
  const porCategoria = {};

  // Cargar nombres de categorías para el resumen
  try {
    const catSnap = await getDocs(collection(db, "categories"));
    categoriasMapa = {};
    catSnap.forEach(c => { categoriasMapa[c.id] = (c.data().nombre || c.id); });
  } catch(e) {}

  snap.forEach(d => {
    const v = d.data();
    let totalDoc = 0;
    let baseDoc = 0;
    let ivaDoc = 0;

    (v.lineas || []).forEach(l => {
      const cantidad = l.cantidad ?? 1;
      const pvpUnitario = l.precio ?? 0;
      const pvpTotalFila = pvpUnitario * cantidad;
      const baseFila = pvpTotalFila / 1.21;
      const ivaFila = baseFila * 0.21;
      totalDoc += pvpTotalFila;
      baseDoc += baseFila;
      ivaDoc += ivaFila;

      const catId = l.categoria_id || "sin_categoria";
      if (!porCategoria[catId]) {
        porCategoria[catId] = { nombre: categoriasMapa[catId] || "Sin familia", cantidad: 0, total: 0 };
      }
      porCategoria[catId].cantidad += cantidad;
      porCategoria[catId].total += pvpTotalFila;
    });

    totalVentas += totalDoc;
    baseIVA += baseDoc;
    totalIVA += ivaDoc;

    ventasFiltradas.push({
      fecha: v.fecha.toDate().toLocaleDateString(),
      ticket: v.ticket_numero || v.numero_legal || "",
      total: totalDoc.toFixed(2),
      base: baseDoc.toFixed(2),
      iva: ivaDoc.toFixed(2)
    });
  });

  document.getElementById("res-total").innerText =
    totalVentas.toFixed(2) + " €";
  document.getElementById("res-base-iva").innerText =
    baseIVA.toFixed(2) + " €";
  document.getElementById("res-iva").innerText =
    totalIVA.toFixed(2) + " €";

  const tbody = document.getElementById("tabla-exportes");
  if (tbody) {
    tbody.innerHTML = "";
    ventasFiltradas.forEach(v => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${v.fecha}</td>
        <td>${v.ticket}</td>
        <td>${v.total} €</td>
        <td>${v.base} €</td>
        <td>${v.iva} €</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById("resultado").style.display = "block";

  // Ordenar y preparar resumen de categorías
  resumenCategorias = Object.values(porCategoria).sort((a,b) => b.total - a.total);
};

/* =========================
   EXPORTAR CSV
========================= */

window.exportarCSV = function () {
  if (!ventasFiltradas.length) {
    alert("No hay datos");
    return;
  }

  let csv = "Fecha;Documento;Total;Base;IVA\n";

  ventasFiltradas.forEach(v => {
    csv += `${v.fecha};${v.ticket};${v.total};${v.base};${v.iva}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "exporte_tpv.csv";
  a.click();

  URL.revokeObjectURL(url);
};

window.exportarExcel = function() {
  if (!ventasFiltradas.length) { alert("No hay datos"); return; }
  let html = `<table border="1"><tr><th>Fecha</th><th>Documento</th><th>Total</th><th>Base</th><th>IVA</th></tr>`;
  ventasFiltradas.forEach(v => {
    html += `<tr><td>${v.fecha}</td><td>${v.ticket}</td><td>${v.total}</td><td>${v.base}</td><td>${v.iva}</td></tr>`;
  });
  html += `</table>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "exporte_tpv.xls";
  a.click();
  URL.revokeObjectURL(url);
};

window.exportarPDF = async function() {
  const ok = await ensureResumen();
  if (!ok) return;
  const w = window.open("", "_blank");
  const totBase = ventasFiltradas.reduce((a,b)=>a+parseFloat(b.base),0);
  const totIva = ventasFiltradas.reduce((a,b)=>a+parseFloat(b.iva),0);
  const totTotal = ventasFiltradas.reduce((a,b)=>a+parseFloat(b.total),0);
  const rows = ventasFiltradas.map(v => `<tr><td>${v.fecha}</td><td>${v.ticket}</td><td class="right">${v.total} €</td><td class="right">${v.base} €</td><td class="right">${v.iva} €</td></tr>`).join("");
  const cats = resumenCategorias.map(c => `<div class="cat-item"><strong>${c.nombre}</strong> <span class="muted">(${c.cantidad} ${c.cantidad === 1 ? 'realizada' : 'realizadas'})</span> · <span class="total">${c.total.toFixed(2)} €</span></div>`).join("");
  w.document.write(`
    <html><head><title>Exportes TPV</title>
    <style>
      :root { --accent: #3b82f6; --bg: #ffffff; --text: #111827; --muted: #475569; --border: #cbd5e1; --thead: #f1f5f9; --row: #f9fafb; --cardbg: #eef2ff; --cardbd: #c7d2fe; }
      @page { margin: 8mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      body { font-family: Arial, Helvetica, sans-serif; padding: 12px; background: var(--bg); color: var(--text); }
      .header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px; }
      .title { font-size: 18px; font-weight: 700; }
      .range { font-size: 12px; color: var(--muted); }
      .summary { display:grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0 12px; }
      .card { background: var(--cardbg); border: 1px solid var(--cardbd); border-radius: 8px; padding: 8px 10px; }
      .card-title { font-size: 11px; color: var(--muted); }
      .card-value { font-size: 14px; font-weight: 700; color: var(--text); }
      .cats { margin: 8px 0 12px; padding: 8px; border: 1px solid var(--border); border-radius: 8px; }
      .cats-title { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
      .cat-item { padding: 6px 8px; border-radius: 6px; background: #f0f9ff; border: 1px solid #bae6fd; margin-bottom: 6px; }
      .cat-item .muted { color: var(--muted); }
      .cat-item .total { color: #0ea5e9; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      thead th { background: var(--thead); color: var(--text); font-weight: 600; }
      th, td { border: 1px solid var(--border); padding: 6px; }
      tbody tr:nth-child(odd) { background: var(--row); }
      .right { text-align: right; }
      .footer { margin-top: 8px; font-size: 10px; color: var(--muted); }
    </style></head><body>
    <div class="header">
      <div class="title">Exportes TPV</div>
      <div class="range">${rangoActual}</div>
    </div>
    <div class="summary">
      <div class="card"><div class="card-title">Total Base</div><div class="card-value">${totBase.toFixed(2)} €</div></div>
      <div class="card"><div class="card-title">Total IVA</div><div class="card-value">${totIva.toFixed(2)} €</div></div>
      <div class="card"><div class="card-title">Total</div><div class="card-value">${totTotal.toFixed(2)} €</div></div>
    </div>
    <div class="cats">
      <div class="cats-title">Por categorías</div>
      ${cats}
    </div>
    <table>
      <thead><tr><th>Fecha</th><th>Documento</th><th>Total</th><th>Base</th><th>IVA</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><th colspan="2">Totales</th><th class="right">${totTotal.toFixed(2)} €</th><th class="right">${totBase.toFixed(2)} €</th><th class="right">${totIva.toFixed(2)} €</th></tr></tfoot>
    </table>
    <div class="footer">Generado por MRS TPV · Rango ${rangoActual}</div>
    <script>setTimeout(() => { window.print(); }, 400);</script>
    </body></html>
  `);
  w.document.close();
};

window.exportarPDFBasico = async function() {
  const ok = await ensureResumen();
  if (!ok) return;
  const w = window.open("", "_blank");
  const totBase = ventasFiltradas.reduce((a,b)=>a+parseFloat(b.base),0);
  const totIva = ventasFiltradas.reduce((a,b)=>a+parseFloat(b.iva),0);
  const totTotal = ventasFiltradas.reduce((a,b)=>a+parseFloat(b.total),0);
  const cats = resumenCategorias.map(c => `<div class="cat-item"><strong>${c.nombre}</strong> <span class="muted">(${c.cantidad} ${c.cantidad === 1 ? 'realizada' : 'realizadas'})</span> · <span class="total">${c.total.toFixed(2)} €</span></div>`).join("");
  w.document.write(`
    <html><head><title>Exportes TPV</title>
    <style>
      :root { --accent: #3b82f6; --bg: #ffffff; --text: #111827; --muted: #475569; --border: #cbd5e1; --cardbg: #eef2ff; --cardbd: #c7d2fe; }
      @page { margin: 8mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      body { font-family: Arial, Helvetica, sans-serif; padding: 12px; background: var(--bg); color: var(--text); }
      .header { display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px; }
      .title { font-size: 18px; font-weight: 700; }
      .range { font-size: 12px; color: var(--muted); }
      .summary { display:grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0 12px; }
      .card { background: var(--cardbg); border: 1px solid var(--cardbd); border-radius: 8px; padding: 8px 10px; }
      .card-title { font-size: 11px; color: var(--muted); }
      .card-value { font-size: 14px; font-weight: 700; color: var(--text); }
      .cats { margin: 8px 0 12px; padding: 8px; border: 1px solid var(--border); border-radius: 8px; }
      .cats-title { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
      .cat-item { padding: 6px 8px; border-radius: 6px; background: #f0f9ff; border: 1px solid #bae6fd; margin-bottom: 6px; }
      .cat-item .muted { color: var(--muted); }
      .cat-item .total { color: #0ea5e9; font-weight: 700; }
      .footer { margin-top: 8px; font-size: 10px; color: var(--muted); }
    </style></head><body>
    <div class="header">
      <div class="title">Exportes TPV</div>
      <div class="range">${rangoActual}</div>
    </div>
    <div class="summary">
      <div class="card"><div class="card-title">Total Base</div><div class="card-value">${totBase.toFixed(2)} €</div></div>
      <div class="card"><div class="card-title">Total IVA</div><div class="card-value">${totIva.toFixed(2)} €</div></div>
      <div class="card"><div class="card-title">Total</div><div class="card-value">${totTotal.toFixed(2)} €</div></div>
    </div>
    <div class="cats">
      <div class="cats-title">Por categorías</div>
      ${cats}
    </div>
    <div class="footer">Generado por MRS TPV · Rango ${rangoActual}</div>
    <script>setTimeout(() => { window.print(); }, 400);</script>
    </body></html>
  `);
  w.document.close();
};

window.enviarWhatsApp = async function() {
  const ok = await ensureResumen();
  if (!ok) return;
  let csv = "Fecha;Documento;Total;Base;IVA\n";
  ventasFiltradas.forEach(v => { csv += `${v.fecha};${v.ticket};${v.total};${v.base};${v.iva}\n`; });
  const file = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const filename = `exporte_tpv_${rangoActual.replace(/\s+/g,'_').replace(/[^\w\-]/g,'-')}.csv`;
  const storageRef = ref(storage, `exportes/${filename}`);
  await uploadBytes(storageRef, file);
  const link = await getDownloadURL(storageRef);
  const text = `Exportes TPV (${rangoActual})\\n${link}`;
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
};

window.enviarEmail = async function() {
  const ok = await ensureResumen();
  if (!ok) return;
  let csv = "Fecha;Documento;Total;Base;IVA\n";
  ventasFiltradas.forEach(v => { csv += `${v.fecha};${v.ticket};${v.total};${v.base};${v.iva}\n`; });
  const file = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const filename = `exporte_tpv_${rangoActual.replace(/\s+/g,'_').replace(/[^\w\-]/g,'-')}.csv`;
  const storageRef = ref(storage, `exportes/${filename}`);
  await uploadBytes(storageRef, file);
  const link = await getDownloadURL(storageRef);
  const subject = `Exportes TPV (${rangoActual})`;
  const body = `Adjunto enlace al exporte: ${link}`;
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
};
