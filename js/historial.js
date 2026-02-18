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
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { generarNumeroLegal } from "./numeracion.js";

let ventasCache = [];
let facturadasIndex = {};
let mostrarTodos = false;

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
    facturadasIndex = facturadas;

    // 2. Obtener todas las ventas (tickets y rectificativas)
    const q = query(collection(db, "sales"), orderBy("fecha", "desc"));
    const snap = await getDocs(q);

    tbody.innerHTML = "";
    if (snap.empty) {
      tbody.innerHTML = "<tr><td colspan='6'>No hay ventas registradas</td></tr>";
      return;
    }

    ventasCache = [];
    snap.forEach(docSnap => {
      ventasCache.push({ id: docSnap.id, data: docSnap.data() });
    });
    renderVentas();

  } catch (err) {
    console.error(err);
    tbody.innerHTML = "<tr><td colspan='6'>Error al cargar datos</td></tr>";
  }
}

function renderVentas() {
  const tbody = document.getElementById("lista-ventas");
  if (!tbody) return;
  tbody.innerHTML = "";
  const lista = mostrarTodos ? ventasCache : ventasCache.slice(0, 5);
  if (!lista.length) {
    tbody.innerHTML = "<tr><td colspan='6'>Sin resultados</td></tr>";
    return;
  }
  lista.forEach(({ id: saleId, data: v }) => {
    const fecha = v.fecha ? v.fecha.toDate().toLocaleString() : "—";
    const numero = v.numero_legal || "—";
    const total = (v.total ?? 0).toFixed(2) + " €";
    const pago = v.metodo_pago || "—";
    const esRectificativa = v.tipo === "rectificativa" || (v.total < 0);
    const facturada = facturadasIndex[saleId];
    const estado = esRectificativa ? "⚠️ RECTIFICATIVA" : (facturada ? "✅ Facturada" : "⏳ Sin facturar");
    const botonFactura = facturada
      ? `<button class="outline" onclick="verFactura('${facturada.facturaId}')">📄 Ver Fac</button>`
      : (esRectificativa ? "" : `<button class="outline" onclick="generarFactura('${saleId}')">📄 Crear Fac</button>`);
    const botonRectificar = esRectificativa 
      ? `<small>Abono de ${v.referencia_original || 'origen'}</small>` 
      : `<button class="outline error" onclick="rectificarVenta('${saleId}')">✖ Abono</button>`;
    const clienteBadge = v.client_nombre ? `<br><small style="color:#666;">👥 ${v.client_nombre}</small>` : "";
    const tr = document.createElement("tr");
    if (esRectificativa) tr.setAttribute("style", "background-color: #fff5f5;");
    tr.innerHTML = `
      <td>${fecha}</td>
      <td><strong>${numero}</strong></td>
      <td>${total}</td>
      <td>${pago}</td>
      <td>${estado}${clienteBadge}</td>
      <td>
        <div style="display: flex; gap: 5px;">
          <button class="outline" onclick="abrirAsignarCliente('${saleId}', '${numero}')">👥 Asignar Cliente</button>
          <button class="outline" onclick="reimprimirTicket('${saleId}')">🧾 TCK</button>
          ${botonFactura}
          ${botonRectificar}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function buscarHistorial(term) {
  const t = term.trim().toLowerCase();
  const tbody = document.getElementById("lista-ventas");
  if (!tbody) return;
  if (!t) { mostrarTodos = false; renderVentas(); return; }
  const filtered = ventasCache.filter(({ id, data: v }) => {
    const numero = (v.numero_legal || "").toLowerCase();
    const cliente = (v.client_nombre || "").toLowerCase();
    const pago = (v.metodo_pago || "").toLowerCase();
    const estado = (v.tipo === "rectificativa") ? "rectificativa" : (facturadasIndex[id] ? "facturada" : "sin facturar");
    return numero.includes(t) || cliente.includes(t) || pago.includes(t) || estado.includes(t);
  });
  tbody.innerHTML = "";
  if (!filtered.length) { tbody.innerHTML = "<tr><td colspan='6'>Sin resultados</td></tr>"; return; }
  filtered.forEach(({ id: saleId, data: v }) => {
    const fecha = v.fecha ? v.fecha.toDate().toLocaleString() : "—";
    const numero = v.numero_legal || "—";
    const total = (v.total ?? 0).toFixed(2) + " €";
    const pago = v.metodo_pago || "—";
    const esRectificativa = v.tipo === "rectificativa" || (v.total < 0);
    const facturada = facturadasIndex[saleId];
    const estado = esRectificativa ? "⚠️ RECTIFICATIVA" : (facturada ? "✅ Facturada" : "⏳ Sin facturar");
    const clienteBadge = v.client_nombre ? `<br><small style="color:#666;">👥 ${v.client_nombre}</small>` : "";
    const botonFactura = facturada
      ? `<button class="outline" onclick="verFactura('${facturada.facturaId}')">📄 Ver Fac</button>`
      : (esRectificativa ? "" : `<button class="outline" onclick="generarFactura('${saleId}')">📄 Crear Fac</button>`);
    const botonRectificar = esRectificativa 
      ? `<small>Abono de ${v.referencia_original || 'origen'}</small>` 
      : `<button class="outline error" onclick="rectificarVenta('${saleId}')">✖ Abono</button>`;
    const tr = document.createElement("tr");
    if (esRectificativa) tr.setAttribute("style", "background-color: #fff5f5;");
    tr.innerHTML = `
      <td>${fecha}</td>
      <td><strong>${numero}</strong></td>
      <td>${total}</td>
      <td>${pago}</td>
      <td>${estado}${clienteBadge}</td>
      <td>
        <div style="display: flex; gap: 5px;">
          <button class="outline" onclick="abrirAsignarCliente('${saleId}', '${numero}')">👥 Asignar Cliente</button>
          <button class="outline" onclick="reimprimirTicket('${saleId}')">🧾 TCK</button>
          ${botonFactura}
          ${botonRectificar}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* =========================
   ACCIONES
========================= */

window.reimprimirTicket = id => window.open(`ticket.html?id=${id}`, "_blank");
window.verFactura = id => window.open(`factura.html?id=${id}`, "_blank");

/* =========================
   ASIGNAR CLIENTE (SIN CAMBIAR IMPORTES/FECHA)
========================= */
let ventaParaAsignar = null;
let clientesAsignar = [];

window.abrirAsignarCliente = async (saleId, numero) => {
  ventaParaAsignar = { saleId, numero };
  const dlg = document.getElementById("dlg-asignar-cliente");
  if (dlg?.showModal) dlg.showModal();
  await cargarClientesAsignar();
  const s = document.getElementById("asig-cli-buscar");
  const f = document.getElementById("asig-cli-filter");
  if (s) s.addEventListener("input", filtrarClientesAsignar);
  if (f) f.addEventListener("change", filtrarClientesAsignar);
};

window.cerrarAsignarCliente = () => {
  const dlg = document.getElementById("dlg-asignar-cliente");
  if (dlg?.close) dlg.close();
  ventaParaAsignar = null;
};

async function cargarClientesAsignar() {
  try {
    const snap = await getDocs(collection(db, "clients"));
    clientesAsignar = [];
    snap.forEach(d => {
      const c = d.data();
      clientesAsignar.push({
        id: d.id,
        nombre: c.nombre || "",
        movil: c.movil || "",
        dni_nie: c.dni_nie || "",
        cif: c.cif || "",
        correo: c.correo || ""
      });
    });
    renderResultadosAsignar(clientesAsignar);
  } catch(e) {}
}

function renderResultadosAsignar(list) {
  const cont = document.getElementById("asig-cli-resultados");
  if (!cont) return;
  cont.innerHTML = "";
  list.forEach(c => {
    const item = document.createElement("div");
    item.style = "display:flex; justify-content:space-between; align-items:center; padding:4px 6px;";
    item.innerHTML = `<div><strong>${c.nombre}</strong><br><small>${c.movil || ""}</small></div>`;
    const btn = document.createElement("button");
    btn.className = "outline";
    btn.innerText = "Asignar";
    btn.onclick = () => asignarClienteAVenta(c);
    item.appendChild(btn);
    cont.appendChild(item);
  });
}

function filtrarClientesAsignar() {
  const campo = document.getElementById("asig-cli-filter")?.value || "nombre";
  const term = document.getElementById("asig-cli-buscar")?.value.trim().toLowerCase() || "";
  if (!term) { renderResultadosAsignar(clientesAsignar); return; }
  const f = clientesAsignar.filter(c => ((c[campo] || "").toLowerCase().includes(term)));
  renderResultadosAsignar(f);
}

async function asignarClienteAVenta(c) {
  if (!ventaParaAsignar) return;
  try {
    await updateDoc(doc(db, "sales", ventaParaAsignar.saleId), {
      client_id: c.id,
      client_nombre: c.nombre
    });
    alert(`Cliente asignado a ${ventaParaAsignar.numero}: ${c.nombre}`);
    cerrarAsignarCliente();
    cargarVentas();
  } catch (e) {
    alert("Error al asignar cliente");
  }
}

window.abrirModuloClientes = () => {
  window.open("clientes.html", "_blank");
};

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
      lineas: sale.lineas || [],
      client_id: sale.client_id || null,
      client_nombre: sale.client_nombre || null
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
  const inp = document.getElementById("hist-buscar");
  const btn5 = document.getElementById("btn-mostrar-5");
  const btnAll = document.getElementById("btn-mostrar-todo");
  if (inp) inp.addEventListener("input", e => buscarHistorial(e.target.value));
  if (btn5) btn5.addEventListener("click", () => { mostrarTodos = false; document.getElementById("hist-buscar").value = ""; renderVentas(); });
  if (btnAll) btnAll.addEventListener("click", () => { mostrarTodos = true; renderVentas(); });
});
