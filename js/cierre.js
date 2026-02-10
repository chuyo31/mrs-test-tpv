import { db } from "./firebase.js";
import {
  collection, getDocs, getDoc, updateDoc, doc,
  serverTimestamp, query, where, limit, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let cajaActual = null;
let totales = {
    fondo: 0,
    efectivo: 0,
    tarjeta: 0,
    abonos: 0,
    esperado: 0
};

async function cargarDatosCierre() {
    // 1. Buscar la caja abierta
    const q = query(collection(db, "cash_registers"), where("estado", "==", "abierta"), limit(1));
    const snapCaja = await getDocs(q);

    if (snapCaja.empty) {
        document.getElementById("no-caja").style.display = "block";
        return;
    }

    cajaActual = { id: snapCaja.docs[0].id, ...snapCaja.docs[0].data() };
    document.getElementById("zona-cierre").style.display = "block";
    document.getElementById("fecha-apertura").innerText = cajaActual.fecha_apertura.toDate().toLocaleString();

    // 2. Traer todas las ventas realizadas DESDE la apertura de esta caja
    const qVentas = query(
        collection(db, "sales"), 
        where("caja_id", "==", cajaActual.id)
    );
    const snapVentas = await getDocs(qVentas);

    totales.fondo = cajaActual.fondo_inicial || 0;

    snapVentas.forEach(docSnap => {
        const v = docSnap.data();
        const importe = v.total || 0;

        if (importe < 0) {
            totales.abonos += importe; // Suma negativos
        } else {
            if (v.metodo_pago === "efectivo") totales.efectivo += importe;
            if (v.metodo_pago === "tarjeta") totales.tarjeta += importe;
        }
    });

    totales.esperado = totales.fondo + totales.efectivo + totales.abonos; // El esperado en cajón solo incluye efectivo y abonos en efectivo

    renderizarTotales();
}

function renderizarTotales() {
    document.getElementById("sys-fondo").innerText = totales.fondo.toFixed(2) + " €";
    document.getElementById("sys-efectivo").innerText = totales.efectivo.toFixed(2) + " €";
    document.getElementById("sys-tarjeta").innerText = totales.tarjeta.toFixed(2) + " €";
    document.getElementById("sys-abonos").innerText = totales.abonos.toFixed(2) + " €";
    document.getElementById("sys-total-caja").innerText = totales.esperado.toFixed(2) + " €";
    calcularDescuadre();
}

window.calcularDescuadre = () => {
    const real = parseFloat(document.getElementById("real-efectivo").value) || 0;
    const descuadre = real - totales.esperado;
    const el = document.getElementById("descuadre");
    el.innerText = descuadre.toFixed(2) + " €";
    el.className = descuadre >= 0 ? "total-valor diferencia-positiva" : "total-valor diferencia-negativa";
};

window.ejecutarCierre = async () => {
    const realEfectivo = parseFloat(document.getElementById("real-efectivo").value);
    if (isNaN(realEfectivo)) return alert("Por favor, introduce el efectivo real contado.");

    if (!confirm("¿Estás seguro de cerrar la caja? No podrás añadir más ventas hoy.")) return;

    try {
        const cajaRef = doc(db, "cash_registers", cajaActual.id);
        await updateDoc(cajaRef, {
            estado: "cerrada",
            fecha_cierre: serverTimestamp(),
            total_efectivo_sistema: totales.efectivo,
            total_tarjeta_sistema: totales.tarjeta,
            total_abonos: totales.abonos,
            efectivo_real_contado: realEfectivo,
            descuadre: realEfectivo - totales.esperado,
            observaciones: document.getElementById("obs-cierre").value
        });

        alert("Caja cerrada correctamente. Generando informe...");
        location.href = "historial.html"; // O a una página de informe Z
    } catch (e) {
        console.error(e);
        alert("Error al cerrar la caja");
    }
};

document.addEventListener("DOMContentLoaded", cargarDatosCierre);