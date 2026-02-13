import { db } from "./firebase.js";
import { collection, getDocs, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let ventasFiltradas = [];
let totalesGlobales = { totalVentas: 0, baseIVA: 0, totalIVA: 0 };
let totalesPorTipo = { reparacion: 0, complementos: 0 };
let detalleCategorias = { reparacion: { base: 0, iva: 0, total: 0 }, complementos: { base: 0, iva: 0, total: 0 } };
let totalesPagos = { efectivo: 0, tarjeta: 0 };
let unidades = { reparacion: 0, complementos: 0 };
let currentMode = "basico";
let advancedRows = [];

function formatearEuros(n) {
  return Number(n || 0).toFixed(2) + " €";
}

async function calcularResumen() {
  const desde = document.getElementById("fecha-desde").value;
  const hasta = document.getElementById("fecha-hasta").value;
  if (!desde || !hasta) {
    alert("Selecciona ambas fechas");
    return;
  }
  const fDesde = Timestamp.fromDate(new Date(desde + "T00:00:00"));
  const fHasta = Timestamp.fromDate(new Date(hasta + "T23:59:59"));
  const q = query(collection(db, "sales"), where("fecha", ">=", fDesde), where("fecha", "<=", fHasta));
  const snap = await getDocs(q);
  const catsSnap = await getDocs(collection(db, "categories"));
  const catMap = {};
  catsSnap.forEach(dc => { const c = dc.data(); catMap[dc.id] = (c.nombre || "").toLowerCase(); });
  let totalVentas = 0, baseIVA = 0, totalIVA = 0;
  let reparacion = 0, complementos = 0;
  detalleCategorias = { reparacion: { base: 0, iva: 0, total: 0 }, complementos: { base: 0, iva: 0, total: 0 } };
  totalesPagos = { efectivo: 0, tarjeta: 0 };
  unidades = { reparacion: 0, complementos: 0 };
  advancedRows = [];
  ventasFiltradas = [];
  snap.forEach(d => {
    const v = d.data();
    totalVentas += v.total || 0;
    totalIVA += v.total_iva || 0;
    const pago = (v.metodo_pago || "efectivo").toLowerCase();
    if (pago === "efectivo") totalesPagos.efectivo += v.total || 0;
    if (pago === "tarjeta") totalesPagos.tarjeta += v.total || 0;
    let rep_base_ticket = 0, rep_iva_ticket = 0, rep_total_ticket = 0;
    let comp_base_ticket = 0, comp_iva_ticket = 0, comp_total_ticket = 0;
    let hasRepair = false, hasComplement = false;
    (v.lineas || []).forEach(l => {
      const cantidad = parseFloat(l.cantidad) || 0;
      const pvpUnit = parseFloat(l.precio) || 0;
      const baseUnit = (l.base_imponible || l.base || (pvpUnit / 1.21));
      const baseLine = baseUnit * cantidad;
      const ivaUnit = (l.cuota_iva != null) ? parseFloat(l.cuota_iva) : (baseUnit * 0.21);
      const ivaLine = ivaUnit * cantidad;
      baseIVA += baseLine;
      const totalLinea = pvpUnit * cantidad;
      const catName = catMap[l.categoria_id] || "";
      const nombreLinea = (l.nombre || "").toLowerCase();
      const esRep = catName.includes("repar") || nombreLinea.includes("repar");
      if (esRep) {
        reparacion += totalLinea; hasRepair = true;
        detalleCategorias.reparacion.base += baseLine;
        detalleCategorias.reparacion.iva += ivaLine;
        detalleCategorias.reparacion.total += totalLinea;
        unidades.reparacion += cantidad;
        rep_base_ticket += baseLine;
        rep_iva_ticket += ivaLine;
        rep_total_ticket += totalLinea;
      } else {
        complementos += totalLinea; hasComplement = true;
        detalleCategorias.complementos.base += baseLine;
        detalleCategorias.complementos.iva += ivaLine;
        detalleCategorias.complementos.total += totalLinea;
        unidades.complementos += cantidad;
        comp_base_ticket += baseLine;
        comp_iva_ticket += ivaLine;
        comp_total_ticket += totalLinea;
      }
    });
    const tipoTicket = hasRepair && hasComplement ? "MIXTO" : (hasRepair ? "REPARACIÓN" : "COMPLEMENTOS");
    ventasFiltradas.push({
      fecha: v.fecha?.toDate().toLocaleDateString("es-ES"),
      ticket: v.numero_legal || v.ticket_numero || "",
      pago: (v.metodo_pago || "efectivo").toUpperCase(),
      tipo: tipoTicket,
      iva: Number(v.total_iva || 0).toFixed(2),
      total: Number(v.total || 0).toFixed(2)
    });
    advancedRows.push({
      fecha: v.fecha?.toDate().toLocaleDateString("es-ES"),
      ticket: v.numero_legal || v.ticket_numero || "",
      pago: (v.metodo_pago || "efectivo").toUpperCase(),
      rep_base: rep_base_ticket,
      rep_iva: rep_iva_ticket,
      rep_total: rep_total_ticket,
      comp_base: comp_base_ticket,
      comp_iva: comp_iva_ticket,
      comp_total: comp_total_ticket,
      iva_ticket: Number(v.total_iva || 0),
      total_ticket: Number(v.total || 0)
    });
  });
  totalesGlobales = { totalVentas, baseIVA, totalIVA };
  totalesPorTipo = { reparacion, complementos };
  renderResumen();
  renderAvanzado();
}

function renderResumen() {
  document.getElementById("res-total").innerText = formatearEuros(totalesGlobales.totalVentas);
  document.getElementById("res-base-iva").innerText = formatearEuros(totalesGlobales.baseIVA);
  document.getElementById("res-iva").innerText = formatearEuros(totalesGlobales.totalIVA);
  document.getElementById("res-reparacion").innerText = formatearEuros(totalesPorTipo.reparacion);
  document.getElementById("res-complementos").innerText = formatearEuros(totalesPorTipo.complementos);
  document.getElementById("res-iva-reparacion").innerText = formatearEuros(detalleCategorias.reparacion.iva);
  document.getElementById("res-iva-complementos").innerText = formatearEuros(detalleCategorias.complementos.iva);
  document.getElementById("res-unidades-reparacion").innerText = String(unidades.reparacion);
  document.getElementById("res-unidades-complementos").innerText = String(unidades.complementos);
  document.getElementById("res-pagos-efectivo").innerText = formatearEuros(totalesPagos.efectivo);
  document.getElementById("res-pagos-tarjeta").innerText = formatearEuros(totalesPagos.tarjeta);
  document.getElementById("resultado").style.display = "block";
}

function renderAvanzado() {
  const tbody = document.getElementById("lista-avanzado");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!ventasFiltradas.length) return;
  const catsSnapRows = advancedRows.length ? advancedRows : buildAdvancedRowsFallback();
  catsSnapRows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.fecha}</td>
      <td>${r.ticket}</td>
      <td class="text-center">${r.pago}</td>
      <td class="right">${r.rep_base.toFixed(2)}€</td>
      <td class="right">${r.rep_iva.toFixed(2)}€</td>
      <td class="right">${r.rep_total.toFixed(2)}€</td>
      <td class="right">${r.comp_base.toFixed(2)}€</td>
      <td class="right">${r.comp_iva.toFixed(2)}€</td>
      <td class="right">${r.comp_total.toFixed(2)}€</td>
      <td class="right">${parseFloat(r.iva_ticket).toFixed(2)}€</td>
      <td class="right">${parseFloat(r.total_ticket).toFixed(2)}€</td>
    `;
    tbody.appendChild(tr);
  });
  document.getElementById("resultado-avanzado").style.display = "block";
}

function buildAdvancedRowsFallback() {
  return ventasFiltradas.map(v => ({
    fecha: v.fecha,
    ticket: v.ticket,
    pago: v.pago,
    rep_base: detalleCategorias.reparacion.base,
    rep_iva: detalleCategorias.reparacion.iva,
    rep_total: detalleCategorias.reparacion.total,
    comp_base: detalleCategorias.complementos.base,
    comp_iva: detalleCategorias.complementos.iva,
    comp_total: detalleCategorias.complementos.total,
    iva_ticket: v.iva,
    total_ticket: v.total
  }));
}

function exportarCSV() {
  if (!ventasFiltradas.length) { alert("No hay datos"); return; }
  let csv = "\ufeff";
  if (currentMode === "basico") {
    csv += "Resumen Básico\n";
    csv += "Base IVA;IVA Repercutido;Total Ventas\n";
    csv += `${Number(totalesGlobales.baseIVA).toFixed(2)};${Number(totalesGlobales.totalIVA).toFixed(2)};${Number(totalesGlobales.totalVentas).toFixed(2)}\n\n`;
    csv += "Categoria;Unidades;Base;IVA;Total\n";
    csv += `Reparación;${unidades.reparacion};${detalleCategorias.reparacion.base.toFixed(2)};${detalleCategorias.reparacion.iva.toFixed(2)};${detalleCategorias.reparacion.total.toFixed(2)}\n`;
    csv += `Complementos;${unidades.complementos};${detalleCategorias.complementos.base.toFixed(2)};${detalleCategorias.complementos.iva.toFixed(2)};${detalleCategorias.complementos.total.toFixed(2)}\n\n`;
    csv += "Pagos;Efectivo;Tarjeta\n";
    csv += `Totales;${totalesPagos.efectivo.toFixed(2)};${totalesPagos.tarjeta.toFixed(2)}\n`;
  } else {
    csv += "Fecha;Ticket;Pago;Rep Base;Rep IVA;Rep Total;Comp Base;Comp IVA;Comp Total;IVA Ticket;Total Ticket\n";
    const rows = advancedRows.length ? advancedRows : buildAdvancedRowsFallback();
    rows.forEach(r => {
      csv += `${r.fecha};${r.ticket};${r.pago};${r.rep_base.toFixed(2)};${r.rep_iva.toFixed(2)};${r.rep_total.toFixed(2)};${r.comp_base.toFixed(2)};${r.comp_iva.toFixed(2)};${r.comp_total.toFixed(2)};${parseFloat(r.iva_ticket).toFixed(2)};${parseFloat(r.total_ticket).toFixed(2)}\n`;
    });
  }
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  const fechaArchivo = document.getElementById("fecha-desde").value || "informe";
  link.download = `Informe_Fiscal_${fechaArchivo}.csv`;
  link.click();
}

function exportarExcel() {
  if (!ventasFiltradas.length) { alert("No hay datos"); return; }
  const wb = XLSX.utils.book_new();
  if (currentMode === "avanzado") {
    const rows = advancedRows.length ? advancedRows : buildAdvancedRowsFallback();
    const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
      "FECHA": r.fecha,
      "TICKET Nº": r.ticket,
      "PAGO": r.pago,
      "REP BASE": parseFloat(r.rep_base.toFixed(2)),
      "REP IVA": parseFloat(r.rep_iva.toFixed(2)),
      "REP TOTAL": parseFloat(r.rep_total.toFixed(2)),
      "COMP BASE": parseFloat(r.comp_base.toFixed(2)),
      "COMP IVA": parseFloat(r.comp_iva.toFixed(2)),
      "COMP TOTAL": parseFloat(r.comp_total.toFixed(2)),
      "IVA TICKET": parseFloat(r.iva_ticket),
      "TOTAL TICKET": parseFloat(r.total_ticket)
    })));
    ws["!cols"] = [{ wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "Detalle Avanzado");
  } else {
    const ws = XLSX.utils.aoa_to_sheet([
      ["RESUMEN BÁSICO"],
      ["Base IVA", Number(totalesGlobales.baseIVA).toFixed(2)],
      ["IVA Repercutido", Number(totalesGlobales.totalIVA).toFixed(2)],
      ["TOTAL VENTAS", Number(totalesGlobales.totalVentas).toFixed(2)],
      [""],
      ["CATEGORÍA", "UNIDADES", "BASE", "IVA", "TOTAL"],
      ["REPARACIÓN", unidades.reparacion, Number(detalleCategorias.reparacion.base).toFixed(2), Number(detalleCategorias.reparacion.iva).toFixed(2), Number(detalleCategorias.reparacion.total).toFixed(2)],
      ["COMPLEMENTOS", unidades.complementos, Number(detalleCategorias.complementos.base).toFixed(2), Number(detalleCategorias.complementos.iva).toFixed(2), Number(detalleCategorias.complementos.total).toFixed(2)],
      [""],
      ["PAGOS", "EFECTIVO", "TARJETA"],
      ["TOTALES", Number(totalesPagos.efectivo).toFixed(2), Number(totalesPagos.tarjeta).toFixed(2)]
    ]);
    ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, "Resumen Básico");
  }
  const fechaArchivo = document.getElementById("fecha-desde").value || "informe";
  XLSX.writeFile(wb, `Informe_Fiscal_${fechaArchivo}.xlsx`);
}

function exportarPDF() {
  if (!ventasFiltradas.length) { alert("No hay datos"); return; }
  ensurePdfLibs().then(({ jsPDF, pluginFn }) => {
    const doc = new jsPDF();
    if (currentMode === "avanzado") {
      const head = [["Fecha", "Ticket Nº", "Pago", "Rep Base", "Rep IVA", "Rep Total", "Comp Base", "Comp IVA", "Comp Total", "IVA Ticket", "Total Ticket"]];
      const rows = advancedRows.length ? advancedRows : buildAdvancedRowsFallback();
      const body = rows.map(r => [r.fecha, r.ticket, r.pago, r.rep_base.toFixed(2), r.rep_iva.toFixed(2), r.rep_total.toFixed(2), r.comp_base.toFixed(2), r.comp_iva.toFixed(2), r.comp_total.toFixed(2), parseFloat(r.iva_ticket).toFixed(2), parseFloat(r.total_ticket).toFixed(2)]);
      if (pluginFn) pluginFn(doc, { head, body, styles: { fontSize: 8 } }); else doc.autoTable({ head, body, styles: { fontSize: 8 } });
      const y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 20;
      doc.text(`TOTAL VENTAS: ${formatearEuros(totalesGlobales.totalVentas)}`, 14, y);
    } else {
      const head = [["Concepto", "Valor"]];
      const body = [
        ["Base IVA (21%)", Number(totalesGlobales.baseIVA).toFixed(2)],
        ["IVA Repercutido", Number(totalesGlobales.totalIVA).toFixed(2)],
        ["TOTAL VENTAS", Number(totalesGlobales.totalVentas).toFixed(2)],
        ["Reparación Unidades", String(unidades.reparacion)],
        ["Reparación Base", Number(detalleCategorias.reparacion.base).toFixed(2)],
        ["Reparación IVA", Number(detalleCategorias.reparacion.iva).toFixed(2)],
        ["Reparación Total", Number(detalleCategorias.reparacion.total).toFixed(2)],
        ["Complementos Unidades", String(unidades.complementos)],
        ["Complementos Base", Number(detalleCategorias.complementos.base).toFixed(2)],
        ["Complementos IVA", Number(detalleCategorias.complementos.iva).toFixed(2)],
        ["Complementos Total", Number(detalleCategorias.complementos.total).toFixed(2)],
        ["Pagos Efectivo", Number(totalesPagos.efectivo).toFixed(2)],
        ["Pagos Tarjeta", Number(totalesPagos.tarjeta).toFixed(2)]
      ];
      if (pluginFn) pluginFn(doc, { head, body, styles: { fontSize: 10 } }); else doc.autoTable({ head, body, styles: { fontSize: 10 } });
    }
    const fechaArchivo = document.getElementById("fecha-desde").value || "informe";
    doc.save(`Informe_Fiscal_${fechaArchivo}.pdf`);
  }).catch(() => alert("No se pudo cargar jsPDF"));
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = url;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function ensurePdfLibs() {
  let jsPDF = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDF) {
    const sources = [
      "/js/vendor/jspdf.umd.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
      "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js"
    ];
    for (const url of sources) {
      try { await loadScript(url); } catch (_) {}
      jsPDF = window.jspdf && window.jspdf.jsPDF;
      if (jsPDF) break;
    }
  }
  let pluginFn = null;
  if (jsPDF) {
    const test = new jsPDF();
    const hasAutoTable = typeof test.autoTable === "function";
    if (!hasAutoTable) {
      if (typeof window.jspdfAutoTable === "function") pluginFn = window.jspdfAutoTable;
      if (!pluginFn) {
        const pluginSources = [
          "/js/vendor/jspdf.plugin.autotable.min.js",
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf-autotable.min.js",
          "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.5.25/dist/jspdf.plugin.autotable.min.js",
          "https://unpkg.com/jspdf-autotable@3.5.25/dist/jspdf.plugin.autotable.min.js"
        ];
        for (const url of pluginSources) {
          try { await loadScript(url); } catch (_) {}
          const test2 = new jsPDF();
          if (typeof test2.autoTable === "function") break;
          if (typeof window.jspdfAutoTable === "function") { pluginFn = window.jspdfAutoTable; break; }
        }
      }
    }
    return { jsPDF, pluginFn };
  }
  throw new Error("jsPDF no disponible");
}

function enviarWhatsApp() {
  if (!ventasFiltradas.length) { alert("No hay datos"); return; }
  const desde = document.getElementById("fecha-desde").value || "";
  const hasta = document.getElementById("fecha-hasta").value || "";
  const texto =
    `Informe fiscal (${desde} a ${hasta})%0A` +
    `Base IVA (21%): ${formatearEuros(totalesGlobales.baseIVA)}%0A` +
    `IVA Repercutido: ${formatearEuros(totalesGlobales.totalIVA)}%0A` +
    `Reparación (Total ventas): ${formatearEuros(totalesPorTipo.reparacion)}%0A` +
    `Complementos (Total ventas): ${formatearEuros(totalesPorTipo.complementos)}%0A` +
    `TOTAL VENTAS: ${formatearEuros(totalesGlobales.totalVentas)}`;
  const url = `https://wa.me/?text=${texto}`;
  window.open(url, "_blank");
}

document.addEventListener("DOMContentLoaded", () => {
  const btnCalc = document.getElementById("btn-calcular");
  const btnCsv = document.getElementById("btn-exportar-csv");
  const btnXls = document.getElementById("btn-exportar-excel");
  const btnPdf = document.getElementById("btn-exportar-pdf");
  const btnWa = document.getElementById("btn-exportar-whatsapp");
  const btnCsvAdv = document.getElementById("btn-exportar-csv-adv");
  const btnXlsAdv = document.getElementById("btn-exportar-excel-adv");
  const btnPdfAdv = document.getElementById("btn-exportar-pdf-adv");
  const btnModoBasico = document.getElementById("btn-modo-basico");
  const btnModoAvanzado = document.getElementById("btn-modo-avanzado");
  if (btnCalc) btnCalc.addEventListener("click", calcularResumen);
  if (btnCsv) btnCsv.addEventListener("click", exportarCSV);
  if (btnXls) btnXls.addEventListener("click", exportarExcel);
  if (btnPdf) btnPdf.addEventListener("click", exportarPDF);
  if (btnWa) btnWa.addEventListener("click", enviarWhatsApp);
  if (btnCsvAdv) btnCsvAdv.addEventListener("click", () => { currentMode = "avanzado"; exportarCSV(); });
  if (btnXlsAdv) btnXlsAdv.addEventListener("click", () => { currentMode = "avanzado"; exportarExcel(); });
  if (btnPdfAdv) btnPdfAdv.addEventListener("click", () => { currentMode = "avanzado"; exportarPDF(); });
  if (btnModoBasico) btnModoBasico.addEventListener("click", () => {
    currentMode = "basico";
    document.getElementById("resultado").style.display = "block";
    document.getElementById("resultado-avanzado").style.display = "none";
  });
  if (btnModoAvanzado) btnModoAvanzado.addEventListener("click", () => {
    currentMode = "avanzado";
    document.getElementById("resultado").style.display = "none";
    document.getElementById("resultado-avanzado").style.display = "block";
  });
});
