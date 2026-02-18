import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { cargarEmpresaDocs } from "./empresa-docs.js";

async function cargarFactura() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        console.error("No se encontró el ID en la URL");
        return;
    }

    let facturaData = null;

    try {
        // 1. Intentamos buscar primero en 'invoices'
        const invoiceSnap = await getDoc(doc(db, "invoices", id));
        
        if (invoiceSnap.exists()) {
            facturaData = invoiceSnap.data();
            console.log("Documento encontrado en: invoices");
        } else {
            // 2. Si no existe en invoices, buscamos en 'sales'
            const saleSnap = await getDoc(doc(db, "sales", id));
            if (saleSnap.exists()) {
                facturaData = saleSnap.data();
                console.log("Documento encontrado en: sales");
            }
        }
    } catch (error) {
        console.error("Error al consultar Firebase:", error);
    }

    if (!facturaData) {
        alert("Error: No se ha encontrado el documento en ninguna categoría (invoices/sales).");
        return;
    }

    const f = facturaData;

    /* =========================
       EMPRESA & LOGO
    ========================= */
    const empresa = await cargarEmpresaDocs();
    document.getElementById("empresa-nombre").innerText = empresa.nombre || "MI EMPRESA";
    document.getElementById("empresa-datos").innerHTML = empresa.datosHtml || "";
    document.getElementById("pie-legal").innerText = empresa.pie || "";

    const imgLogo = document.getElementById("empresa-logo");
    if (empresa.logo && empresa.mostrarLogo) {
        imgLogo.src = empresa.logo;
        imgLogo.style.display = "block";
    }

    /* =========================
       DATOS FACTURA
    ========================= */
    document.getElementById("factura-numero").innerText = f.numero_legal || "S/N";
    document.getElementById("factura-fecha").innerText = 
        f.fecha?.toDate ? f.fecha.toDate().toLocaleDateString() : new Date().toLocaleDateString();

    document.getElementById("metodo-pago").innerText = 
        f.metodo_pago === "efectivo" ? "Efectivo" : "Tarjeta";

    // CLIENTE/EMPRESA
    try {
        let c = null;
        let nombreCliente = f.client_nombre || "";

        if (f.client_id) {
            const cliSnap = await getDoc(doc(db, "clients", f.client_id));
            if (cliSnap.exists()) c = cliSnap.data();
        } else if (f.ticket_id) {
            const saleSnap = await getDoc(doc(db, "sales", f.ticket_id));
            if (saleSnap.exists()) {
                const s = saleSnap.data();
                nombreCliente = s.client_nombre || nombreCliente;
                if (s.client_id) {
                    const cliSnap = await getDoc(doc(db, "clients", s.client_id));
                    if (cliSnap.exists()) c = cliSnap.data();
                }
            }
        }

        document.getElementById("cliente-nombre").innerText = c?.nombre || nombreCliente || "";
        document.getElementById("cliente-razon").innerText = c?.razon || "";
        document.getElementById("cliente-cif").innerText = c?.cif || "";
        document.getElementById("cliente-dni").innerText = c?.dni_nie || "";
        document.getElementById("cliente-direccion").innerText = c?.direccion || "";
        document.getElementById("cliente-movil").innerText = c?.movil || "";
        document.getElementById("cliente-correo").innerText = c?.correo || "";
    } catch(e) {}

    /* =========================
       LÍNEAS Y DESGLOSE
    ========================= */
    const tbody = document.getElementById("lineas");
    tbody.innerHTML = "";

    let acumuladoSubtotal = 0;
    let acumuladoIva = 0;
    let acumuladoRecargo = 0;

    const lineas = f.lineas || [];

    lineas.forEach(l => {
        const cantidad = l.cantidad ?? 1;
        const pvpUnitario = l.precio ?? 0;
        const pvpTotalFila = pvpUnitario * cantidad;

        // Cálculo de impuestos por línea (Regla de Oro Fiscal)
        const divisor = 1.21;
        const baseFila = pvpTotalFila / divisor;
        const ivaFila = baseFila * 0.21;
        const reFila = 0;

        acumuladoSubtotal += baseFila;
        acumuladoIva += ivaFila;
        acumuladoRecargo += reFila;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${l.nombre || 'Artículo'}</td>
            <td class="right">${cantidad}</td>
            <td class="right">${pvpUnitario.toFixed(2)} €</td>
            <td class="right">${baseFila.toFixed(2)} €</td>
        `;
        tbody.appendChild(tr);
    });

    // Totales finales
    const totalFinal = f.total || (acumuladoSubtotal + acumuladoIva);
    
    document.getElementById("subtotal").innerText = acumuladoSubtotal.toFixed(2) + " €";
    document.getElementById("iva").innerText = acumuladoIva.toFixed(2) + " €";
    // Sin recargo de equivalencia
    document.getElementById("total").innerText = totalFinal.toFixed(2) + " €";

    /* =========================
       IMPRIMIR
    ========================= */
    setTimeout(() => {
        window.print();
        // window.onafterprint = () => window.close();
    }, 1000);
}

// Iniciar carga al estar listo el DOM
document.addEventListener("DOMContentLoaded", cargarFactura);
