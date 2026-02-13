import { db } from "./firebase.js";
import {
    collection,
    getDocs,
    query,
    where,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let ventasFiltradas = [];
let totalesGlobales = { totalVentas: 0, baseIVA: 0, totalIVA: 0 };
let totalesPorTipo = { reparacion: 0, complementos: 0 };

/* ==========================================
   1. CALCULAR RESUMEN FISCAL
   ========================================== */
window.calcularResumen = async function () {
    const desde = document.getElementById("fecha-desde").value;
    const hasta = document.getElementById("fecha-hasta").value;

    if (!desde || !hasta) return alert("⚠️ Selecciona ambas fechas");

    try {
        const fDesde = Timestamp.fromDate(new Date(desde + "T00:00:00"));
        const fHasta = Timestamp.fromDate(new Date(hasta + "T23:59:59"));

        const q = query(
            collection(db, "sales"),
            where("fecha", ">=", fDesde),
            where("fecha", "<=", fHasta)
        );

        const snap = await getDocs(q);
        const catsSnap = await getDocs(collection(db, "categories"));
        const catMap = {};
        catsSnap.forEach(dc => { const c = dc.data(); catMap[dc.id] = (c.nombre || "").toLowerCase(); });
        
        let totalVentas = 0, baseIVA = 0, totalIVA = 0;
        ventasFiltradas = [];
        totalesPorTipo = { reparacion: 0, complementos: 0 };

        snap.forEach(d => {
            const v = d.data();
            totalVentas += v.total || 0;
            totalIVA += v.total_iva || 0;
            // Sin RE
            let hasRepair = false, hasComplement = false;
            v.lineas.forEach(l => {
                const cantidad = parseFloat(l.cantidad) || 0;
                const baseLine = (l.base_imponible || l.base || 0) * cantidad;
                baseIVA += baseLine;
                
                const pvpUnitario = parseFloat(l.precio) || 0;
                const totalLinea = pvpUnitario * cantidad;
                const catName = catMap[l.categoria_id] || "";
                const nombreLinea = (l.nombre || "").toLowerCase();
                const esReparacion = catName.includes("repar") || nombreLinea.includes("repar");
                const tipo = esReparacion ? "REPARACIÓN" : "COMPLEMENTOS";
                if (esReparacion) totalesPorTipo.reparacion += totalLinea; else totalesPorTipo.complementos += totalLinea;
                if (esReparacion) hasRepair = true; else hasComplement = true;
            });

            const tipoTicket = hasRepair && hasComplement ? "MIXTO" : (hasRepair ? "REPARACIÓN" : "COMPLEMENTOS");
            ventasFiltradas.push({
                fecha: v.fecha.toDate().toLocaleDateString('es-ES'),
                ticket: v.ticket_numero,
                pago: v.metodo_pago || "efectivo",
                tipo: tipoTicket,
                total: Number(v.total || 0).toFixed(2),
                iva: Number(v.total_iva || 0).toFixed(2),
                // Sin RE
            });
        });

        totalesGlobales = { totalVentas, baseIVA, totalIVA };

        document.getElementById("res-total").innerText = totalVentas.toFixed(2) + " €";
        document.getElementById("res-base-iva").innerText = baseIVA.toFixed(2) + " €";
        document.getElementById("res-iva").innerText = totalIVA.toFixed(2) + " €";
        document.getElementById("res-reparacion").innerText = totalesPorTipo.reparacion.toFixed(2) + " €";
        document.getElementById("res-complementos").innerText = totalesPorTipo.complementos.toFixed(2) + " €";
        // Sin RE

        document.getElementById("resultado").style.display = "block";
        
    } catch (error) {
        console.error("Error fiscal:", error);
        alert("Error al obtener datos.");
    }
};


/* ==========================================
   EXPORTAR A EXCEL (Con Totales) mejorada
   ========================================== */
window.exportarExcel = function () {
    if (!ventasFiltradas.length) return alert("No hay datos");

    // 1. Crear el libro de trabajo
    const wb = XLSX.utils.book_new();

    // 2. Preparar los datos de las ventas con encabezados limpios
    const datosVentas = ventasFiltradas.map(v => ({
        "FECHA": v.fecha,
        "TICKET Nº": v.ticket,
        "FORMA PAGO": v.pago.toUpperCase(),
        "TIPO": v.tipo || "",
        "IVA (21%) €": parseFloat(v.iva),
        "TOTAL TICKET €": parseFloat(v.total)
    }));

    // 3. Crear la hoja a partir de los datos
    const ws = XLSX.utils.json_to_sheet(datosVentas);

    // 4. DISEÑO: Añadir bloque de TOTALES FISCALES con separación
    // Dejamos 2 filas libres y creamos un cuadro de resumen
    const filaInicioTotales = datosVentas.length + 3;

    const cuadroResumen = [
        ["INFORME RESUMEN FISCAL"],
        ["CONCEPTO", "BASE IMPONIBLE", "IMPUESTO ACUMULADO"],
        ["Régimen General (IVA 21%)", totalesGlobales.baseIVA.toFixed(2) + " €", totalesGlobales.totalIVA.toFixed(2) + " €"],
        ["", "", ""],
        ["Reparación (Total ventas)", "", totalesPorTipo.reparacion.toFixed(2) + " €"],
        ["Complementos (Total ventas)", "", totalesPorTipo.complementos.toFixed(2) + " €"],
        ["", "", ""],
        ["TOTAL VENTAS PERIODO", "", totalesGlobales.totalVentas.toFixed(2) + " €"]
    ];

    // Añadimos el cuadro de resumen a la hoja
    XLSX.utils.sheet_add_aoa(ws, cuadroResumen, { origin: `A${filaInicioTotales}` });

    // 5. AJUSTES DE COLUMNAS (Para que no se corten los textos)
    ws['!cols'] = [
        { wch: 15 }, // Fecha
        { wch: 15 }, // Ticket
        { wch: 15 }, // Pago
        { wch: 15 }, // Tipo
        { wch: 15 }, // IVA
        { wch: 15 }  // Total
    ];

    // 6. Generar el archivo y descargar
    XLSX.utils.book_append_sheet(wb, ws, "Informe de Ventas");
    
    const fechaArchivo = document.getElementById("fecha-desde").value;
    XLSX.writeFile(wb, `Informe_Fiscal_${fechaArchivo}.xlsx`);
};

/* ==========================================
   EXPORTAR A CSV (Con Totales)
   ========================================== */
window.exportarCSV = function () {
    if (!ventasFiltradas.length) return alert("No hay datos");

    // \ufeff es para que Excel reconozca los acentos y el símbolo €
    let csv = "\ufeffFecha;Ticket;Pago;Tipo;IVA;Total\n";

    // Filas de datos
    ventasFiltradas.forEach(v => {
        csv += `${v.fecha};${v.ticket};${v.pago.toUpperCase()};${v.tipo || ""};${v.iva};${v.total}\n`;
    });

    // Añadir línea de separación y totales
    csv += "\n";
    csv += `;;TOTALES ACUMULADOS:;;${totalesGlobales.totalIVA.toFixed(2)};${totalesGlobales.totalVentas.toFixed(2)}\n`;
    csv += `;;Reparación (Total ventas):;;${totalesPorTipo.reparacion.toFixed(2)}\n`;
    csv += `;;Complementos (Total ventas):;;${totalesPorTipo.complementos.toFixed(2)}\n`;

window.exportarPDF = function () {
    if (!ventasFiltradas.length) return alert("No hay datos");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const head = [["Fecha", "Ticket Nº", "Pago", "Tipo", "IVA (21%) €", "Total €"]];
    const body = ventasFiltradas.map(v => [v.fecha, v.ticket || "", (v.pago || "").toUpperCase(), v.tipo || "", v.iva, v.total]);
    doc.autoTable({ head, body, styles: { fontSize: 9 } });
    const y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 20;
    doc.text(`Base IVA (21%): ${totalesGlobales.baseIVA.toFixed(2)} €`, 14, y);
    doc.text(`IVA Repercutido: ${totalesGlobales.totalIVA.toFixed(2)} €`, 14, y + 6);
    doc.text(`TOTAL VENTAS: ${totalesGlobales.totalVentas.toFixed(2)} €`, 14, y + 12);
    doc.text(`Reparación (Total ventas): ${totalesPorTipo.reparacion.toFixed(2)} €`, 14, y + 18);
    doc.text(`Complementos (Total ventas): ${totalesPorTipo.complementos.toFixed(2)} €`, 14, y + 24);
    const fechaArchivo = document.getElementById("fecha-desde").value || "informe";
    doc.save(`Informe_Fiscal_${fechaArchivo}.pdf`);
};

window.addEventListener("DOMContentLoaded", () => {
    const btnPdf = document.querySelector('button[onclick="exportarPDF()"]') || document.getElementById('btn-exportar-pdf');
    if (btnPdf) btnPdf.onclick = window.exportarPDF;
    const btnCsv = document.querySelector('button[onclick="exportarCSV()"]');
    if (btnCsv) btnCsv.onclick = window.exportarCSV;
    const btnXls = document.querySelector('button[onclick="exportarExcel()"]');
    if (btnXls) btnXls.onclick = window.exportarExcel;
});

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Contabilidad_TPV.csv";
    link.click();
};
