import { db, auth } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* =========================
   CARGAR HISTORIAL
========================= */

async function cargarVentas() {
  const tbody = document.getElementById("lista-ventas");
  tbody.innerHTML = "";

  const q = query(
    collection(db, "sales"),
    orderBy("fecha", "desc")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">No hay ventas registradas</td>
      </tr>
    `;
    return;
  }

  snap.forEach(docSnap => {
    const v = docSnap.data();

    const fecha = v.fecha
      ? v.fecha.toDate().toLocaleString()
      : "";

    const numero = v.numero_legal || `TCK-${String(v.ticket_numero).padStart(4, "0")}`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${fecha}</td>
      <td>${numero}</td>
      <td>${v.total.toFixed(2)} €</td>
      <td>${v.metodo_pago}</td>
      <td>
        <button onclick="reimprimirTicket('${docSnap.id}')">🧾 Ticket</button>
        <button onclick="imprimirFactura('${docSnap.id}')">📄 Factura</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* =========================
   ACCIONES
========================= */

window.reimprimirTicket = id => {
  window.open(`ticket.html?id=${id}`, "_blank");
};

window.imprimirFactura = id => {
  window.open(`factura.html?id=${id}`, "_blank");
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
