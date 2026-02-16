import { db, auth } from "./firebase.js";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { generarNumeroLegal } from "./numeracion.js";

async function cargarVentas() {
  const tbody = document.getElementById("lista-ventas");
  if (!tbody) return;
  tbody.innerHTML = "<tr><td colspan='6'>Cargando ventas...</td></tr>";

  try {
    // 1. Obtener facturas para saber qué tickets están ya facturados
    const factSnap = await getDocs(collection(db, "invoices"));
    const facturadas = {};
    factSnap.forEach(f => {
      const data = f.data();
      if (data.ticket_id) facturadas[data.ticket_id] = { facturaId: f.id, numero: data.numero_legal };
    });

    // 2. Obtener todas las ventas (tickets y rectificativas)
    const q = query(collection(db, "sales"), orderBy("fecha", "desc"));
    const snap = await getDocs(q);

    tbody.innerHTML = "";
    if (snap.empty) {
      tbody.innerHTML = "<tr><td colspan='6'>No hay ventas registradas</td></tr>";
      return;
    }

    snap.forEach(docSnap => {
      const v = docSnap.data();
      const saleId = docSnap.id;
      const fecha = v.fecha ? v.fecha.toDate().toLocaleString() : "—";
      const numero = v.numero_legal || "—";
      const total = (v.total ?? 0).toFixed(2) + " €";
      const pago = v.metodo_pago || "—";
      
      // Estilo para rectificativas (rojo si es negativo)
      const esRectificativa = v.tipo === "rectificativa" || (v.total < 0);
      const colorFila = esRectificativa ? "style='background-color: #fff5f5; color: #c0392b;'" : "";

      const facturada = facturadas[saleId];
      const estado = esRectificativa ? "⚠️ RECTIFICATIVA" : (facturada ? "✅ Facturada" : "⏳ Sin facturar");

      // Botones de acción
      const botonFactura = facturada
        ? `<button class="outline" onclick="verFactura('${facturada.facturaId}')">📄 Ver Fac</button>`
        : (esRectificativa ? "" : `<button class="outline" onclick="generarFactura('${saleId}')">📄 Crear Fac</button>`);

      const botonRectificar = esRectificativa 
        ? `<small>Abono de ${v.referencia_original || 'origen'}</small>` 
        : `<button class="outline error" onclick="rectificarVenta('${saleId}')">✖ Abono</button>`;

      const tr = document.createElement("tr");
      if (colorFila) tr.setAttribute("style", "background-color: #fff5f5;");
      tr.innerHTML = `
        <td>${fecha}</td>
        <td><strong>${numero}</strong></td>
        <td>${total}</td>
        <td>${pago}</td>
        <td>${estado}</td>
        <td>
          <div style="display: flex; gap: 5px;">
            <button class="outline" onclick="reimprimirTicket('${saleId}')">🧾 TCK</button>
            ${botonFactura}
            ${botonRectificar}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = "<tr><td colspan='6'>Error al cargar datos</td></tr>";
  }
}

/* =========================
   ACCIONES
========================= */

window.reimprimirTicket = id => window.open(`ticket.html?id=${id}`, "_blank");
window.verFactura = id => window.open(`factura.html?id=${id}`, "_blank");

window.generarFactura = async saleId => {
  try {
    const saleSnap = await getDoc(doc(db, "sales", saleId));
    if (!saleSnap.exists()) return alert("Venta no encontrada");
    const sale = saleSnap.data();

    const numeroFactura = await generarNumeroLegal(db, "facturas");
    const facturaRef = await addDoc(collection(db, "invoices"), {
      fecha: serverTimestamp(),
      numero_legal: numeroFactura,
      ticket_id: saleId,
      ticket_numero: sale.numero_legal || null,
      total: sale.total ?? 0,
      metodo_pago: sale.metodo_pago || "",
      lineas: sale.lineas || []
    });

    cargarVentas();
    window.open(`factura.html?id=${facturaRef.id}`, "_blank");
  } catch (err) { alert("Error al generar factura"); }
};

window.rectificarVenta = async (saleId) => {
    if (!confirm("¿Deseas generar un abono/rectificativa de esta venta? Los importes se invertirán a negativo.")) return;

    try {
        const snap = await getDoc(doc(db, "sales", saleId));
        const original = snap.data();

        // Determinar si rectificamos un Ticket o una Factura (si existe en la tabla invoices)
        // Por simplificar Verifactu, usaremos el tipo basado en su numero_legal
        const esFactura = original.numero_legal.startsWith("FAC");
        const nuevoNum = await generarNumeroLegal(db, esFactura ? "facturas" : "tickets", true);

        // Invertir líneas
        const nuevasLineas = (original.lineas || []).map(l => ({
            ...l,
            cantidad: -Math.abs(l.cantidad),
            // El precio unitario se mantiene positivo, el total de línea será negativo por la cantidad
        }));

        const rectificativa = {
            numero_legal: nuevoNum,
            referencia_original: original.numero_legal,
            id_original: saleId,
            fecha: serverTimestamp(),
            lineas: nuevasLineas,
            total: -Math.abs(original.total),
            metodo_pago: original.metodo_pago,
            tipo: "rectificativa",
            motivo: "Abono por error o devolución"
        };

        const docRef = await addDoc(collection(db, "sales"), rectificativa);
        alert("✅ Rectificativa generada: " + nuevoNum);
        cargarVentas();
        window.open(`ticket.html?id=${docRef.id}`, "_blank");

    } catch (e) {
        console.error(e);
        alert("Error al procesar el abono");
    }
};

onAuthStateChanged(auth, user => {
  if (!user) { window.location.href = "login.html"; return; }
  cargarVentas();
});