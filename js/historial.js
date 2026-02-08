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

import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { generarNumeroLegal } from "./numeracion.js";

/* =========================
   CARGAR HISTORIAL
========================= */

async function cargarVentas() {
  const tbody = document.getElementById("lista-ventas");
  tbody.innerHTML = "";

  try {
    /* 1️⃣ FACTURAS EXISTENTES */
    const factSnap = await getDocs(collection(db, "invoices"));
    const facturadas = {};

    factSnap.forEach(f => {
      const data = f.data();
      if (data.ticket_id) {
        facturadas[data.ticket_id] = {
          facturaId: f.id,
          numero: data.numero_legal
        };
      }
    });

    /* 2️⃣ VENTAS */
    const q = query(
      collection(db, "sales"),
      orderBy("fecha", "desc")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">No hay ventas registradas</td>
        </tr>`;
      return;
    }

    snap.forEach(docSnap => {
      const v = docSnap.data();
      const saleId = docSnap.id;

      const fecha = v.fecha
        ? v.fecha.toDate().toLocaleString()
        : "";

      const numero = v.numero_legal || "—";
      const total = (v.total ?? 0).toFixed(2) + " €";
      const pago = v.metodo_pago || "—";

      const facturada = facturadas[saleId];
      const estado = facturada ? "✅ Facturada" : "⏳ Sin facturar";

      const botonFactura = facturada
        ? `<button onclick="verFactura('${facturada.facturaId}')">📄 Ver factura</button>`
        : `<button onclick="generarFactura('${saleId}')">📄 Crear factura</button>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fecha}</td>
        <td>${numero}</td>
        <td>${total}</td>
        <td>${pago}</td>
        <td>${estado}</td>
        <td>
          <button onclick="reimprimirTicket('${saleId}')">🧾 Ticket</button>
          ${botonFactura}
        </td>
      `;

      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Error cargando historial:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6">Error cargando historial</td>
      </tr>`;
  }
}

/* =========================
   ACCIONES
========================= */

window.reimprimirTicket = id => {
  window.open(`ticket.html?id=${id}`, "_blank");
};

window.verFactura = facturaId => {
  window.open(`factura.html?id=${facturaId}`, "_blank");
};

window.generarFactura = async saleId => {
  try {
    /* 1️⃣ ¿YA EXISTE? */
    const q = query(
      collection(db, "invoices"),
      where("ticket_id", "==", saleId)
    );

    const snapFactura = await getDocs(q);

    if (!snapFactura.empty) {
      window.open(
        `factura.html?id=${snapFactura.docs[0].id}`,
        "_blank"
      );
      return;
    }

    /* 2️⃣ CARGAR VENTA */
    const saleSnap = await getDoc(doc(db, "sales", saleId));
    if (!saleSnap.exists()) {
      alert("Venta no encontrada");
      return;
    }

    const sale = saleSnap.data();

    /* 3️⃣ NÚMERO FACTURA */
    const numeroFactura = await generarNumeroLegal(db, "facturas");

    /* 4️⃣ CREAR FACTURA */
    const facturaRef = await addDoc(collection(db, "invoices"), {
      fecha: serverTimestamp(),
      numero_legal: numeroFactura,
      ticket_id: saleId,
      ticket_numero: sale.numero_legal || null,
      subtotal: sale.subtotal ?? 0,
      total_iva: sale.total_iva ?? 0,
      total_recargo: sale.total_recargo ?? 0,
      total: sale.total ?? 0,
      metodo_pago: sale.metodo_pago || "",
      lineas: sale.lineas || []
    });

    window.open(`factura.html?id=${facturaRef.id}`, "_blank");

  } catch (err) {
    console.error("Error generando factura:", err);
    alert("Error al generar la factura");
  }
};

/* =========================
   INIT
========================= */

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  cargarVentas();
});
