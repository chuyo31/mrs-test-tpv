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

/* 🔧 FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyBqnNgjPsEhxCX2kxvW4OUjLme0IqG8pTQ",
  authDomain: "mrs-test-tpv.firebaseapp.com",
  projectId: "mrs-test-tpv"
};

let ventasFiltradas = [];

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

  snap.forEach(d => {
    const v = d.data();
    totalVentas += v.total;
    totalIVA += v.total_iva;
    baseIVA += v.subtotal || 0;

    ventasFiltradas.push({
      fecha: v.fecha.toDate().toLocaleDateString(),
      ticket: v.ticket_numero,
      total: v.total.toFixed(2),
      iva: v.total_iva.toFixed(2)
    });
  });

  document.getElementById("res-total").innerText =
    totalVentas.toFixed(2) + " €";
  document.getElementById("res-base-iva").innerText =
    baseIVA.toFixed(2) + " €";
  document.getElementById("res-iva").innerText =
    totalIVA.toFixed(2) + " €";

  document.getElementById("resultado").style.display = "block";
};

/* =========================
   EXPORTAR CSV
========================= */

window.exportarCSV = function () {
  if (!ventasFiltradas.length) {
    alert("No hay datos");
    return;
  }

  let csv = "Fecha;Ticket;Total;IVA\n";

  ventasFiltradas.forEach(v => {
    csv += `${v.fecha};${v.ticket};${v.total};${v.iva}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "exporte_tpv.csv";
  a.click();

  URL.revokeObjectURL(url);
};
