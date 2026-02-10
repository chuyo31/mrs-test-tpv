import { db } from "./firebase.js";
import {
    collection,
    getDocs,
    query,
    where,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let ventasFiltradas = [];
let totalesGlobales = { totalVentas: 0, baseIVA: 0, totalIVA: 0, baseRE: 0, totalRE: 0 };

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
        
        let totalVentas = 0, baseIVA = 0, totalIVA = 0, baseRE = 0, totalRE = 0;
        ventasFiltradas = [];

        snap.forEach(d => {
            const v = d.data();
            totalVentas += v.total || 0;
            totalIVA += v.total_iva || 0;
            totalRE += v.total_recargo || 0;

            v.lineas.forEach(l => {
                if (l.cuota_re > 0 || l.recargo > 0) { 
                    baseRE += l.base_imponible || l.base || 0;
                } else {
                    baseIVA += l.base_imponible || l.base || 0;
                }
            });

            ventasFiltradas.push({
                fecha: v.fecha.toDate().toLocaleDateString('es-ES'),
                ticket: v.ticket_numero,
                pago: v.metodo_pago || "efectivo",
                total: v.total.toFixed(2),
                iva: v.total_iva.toFixed(2),
                recargo: v.total_recargo.toFixed(2)
            });
        });

        totalesGlobales = { totalVentas, baseIVA, totalIVA, baseRE, totalRE };

        document.getElementById("res-total").innerText = totalVentas.toFixed(2) + " €";
        document.getElementById("res-base-iva").innerText = baseIVA.toFixed(2) + " €";
        document.getElementById("res-iva").innerText = totalIVA.toFixed(2) + " €";
        document.getElementById("res-base-re").innerText = baseRE.toFixed(2) + " €";
        document.getElementById("res-recargo").innerText = totalRE.toFixed(2) + " €";

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
        "IVA (21%) €": parseFloat(v.iva),
        "RE (5.2%) €": parseFloat(v.recargo),
        "TOTAL TICKET €": parseFloat(v.total)
    }));

    // 3. Crear la hoja a partir de los datos
    const ws = XLSX.utils.json_to_sheet(datosVentas);

    // 4. DISEÑO: Añadir bloque de TOTALES FISCALES con separación
    // Dejamos 2 filas libres y creamos un cuadro de resumen
    const filaInicioTotales = datosVentas.length + 3;

    const cuadroResumen = [
        ["INFORME RESUMEN FISCAL"], // Título del bloque
        ["CONCEPTO", "BASE IMPONIBLE", "IMPUESTO ACUMULADO"],
        ["Régimen General (IVA 21%)", totalesGlobales.baseIVA.toFixed(2) + " €", totalesGlobales.totalIVA.toFixed(2) + " €"],
        ["Recargo Equivalencia (RE)", totalesGlobales.baseRE.toFixed(2) + " €", totalesGlobales.totalRE.toFixed(2) + " €"],
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
        { wch: 15 }, // IVA
        { wch: 15 }, // RE
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
    let csv = "\ufeffFecha;Ticket;Pago;IVA;Recargo;Total\n";

    // Filas de datos
    ventasFiltradas.forEach(v => {
        csv += `${v.fecha};${v.ticket};${v.pago.toUpperCase()};${v.iva};${v.recargo};${v.total}\n`;
    });

    // Añadir línea de separación y totales
    csv += "\n";
    csv += `;;TOTALES ACUMULADOS:;${totalesGlobales.totalIVA.toFixed(2)};${totalesGlobales.totalRE.toFixed(2)};${totalesGlobales.totalVentas.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Contabilidad_TPV.csv";
    link.click();
};