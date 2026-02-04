import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { generarNumeroLegal } from "./numeracion.js";

/* =========================
   ESTADO GLOBAL
========================= */

let ventaActual = [];
let metodoPago = null;
let efectivoEntregado = 0;
let cajaActualId = null;

/* =========================
   CAJA DIARIA
========================= */

async function comprobarCajaAbierta() {
  const q = query(
    collection(db, "cash_registers"),
    where("estado", "==", "abierta"),
    limit(1)
  );

  const snap = await getDocs(q);

  const abrir = document.getElementById("abrir-caja");
  const zona = document.getElementById("zona-caja");

  if (snap.empty) {
    abrir.style.display = "block";
    zona.style.display = "none";
    cajaActualId = null;
  } else {
    cajaActualId = snap.docs[0].id;
    abrir.style.display = "none";
    zona.style.display = "block";
  }
}

window.abrirCaja = async function () {
  if (sessionStorage.getItem("rol") !== "admin") {
    alert("Solo el administrador puede abrir la caja");
    return;
  }

  const fondo = Number(document.getElementById("fondo-inicial").value);
  if (isNaN(fondo) || fondo < 0) {
    alert("Fondo inicial inválido");
    return;
  }

  await addDoc(collection(db, "cash_registers"), {
    fecha_apertura: serverTimestamp(),
    usuario_apertura: sessionStorage.getItem("uid"),
    fondo_inicial: fondo,
    estado: "abierta"
  });

  await comprobarCajaAbierta();
};

/* =========================
   CATEGORÍAS / PRODUCTOS
========================= */

async function cargarCategorias() {
  const cont = document.getElementById("categorias");
  cont.innerHTML = "";

  const snap = await getDocs(collection(db, "categories"));
  snap.forEach(d => {
    const c = d.data();
    if (!c.activa) return;

    const btn = document.createElement("button");
    btn.textContent = c.nombre;
    btn.onclick = () => cargarProductos(d.id);
    cont.appendChild(btn);
  });
}

async function cargarProductos(categoryId) {
  const cont = document.getElementById("productos");
  cont.innerHTML = "";

  const snap = await getDocs(collection(db, "products"));
  snap.forEach(d => {
    const p = d.data();
    if (!p.activo || p.category_id !== categoryId) return;

    const btn = document.createElement("button");
    btn.textContent = `${p.nombre} (${p.precio_venta}€)`;
    btn.onclick = () => añadirProducto(d.id, p);
    cont.appendChild(btn);
  });
}

/* =========================
   VENTA
========================= */

function añadirProducto(id, producto) {
  if (!cajaActualId) {
    alert("Debes abrir la caja");
    return;
  }

  const item = ventaActual.find(i => i.id === id);
  if (item) {
    item.cantidad++;
  } else {
    ventaActual.push({
      id,
      nombre: producto.nombre,
      precio: producto.precio_venta,
      iva: producto.iva,
      recargo: producto.recargo,
      cantidad: 1
    });
  }

  renderVenta();
  calcularCambio();
}

function cambiarPrecio(id, nuevoPrecio) {
  const item = ventaActual.find(i => i.id === id);
  const p = Number(nuevoPrecio);
  if (!item || isNaN(p) || p <= 0) return;

  item.precio = p;
  renderVenta();
  calcularCambio();
}

function aumentarCantidad(id) {
  const item = ventaActual.find(i => i.id === id);
  if (!item) return;
  item.cantidad++;
  renderVenta();
  calcularCambio();
}

function disminuirCantidad(id) {
  const item = ventaActual.find(i => i.id === id);
  if (!item) return;

  item.cantidad--;
  if (item.cantidad <= 0) {
    eliminarLinea(id);
  } else {
    renderVenta();
    calcularCambio();
  }
}

function eliminarLinea(id) {
  ventaActual = ventaActual.filter(i => i.id !== id);
  renderVenta();
  calcularCambio();
}

/* =========================
   PAGO
========================= */

window.seleccionarPago = function (tipo) {
  metodoPago = tipo;

  document.getElementById("pago-seleccionado").innerText =
    tipo === "efectivo" ? "Efectivo" : "Tarjeta";

  document.getElementById("bloque-efectivo").style.display =
    tipo === "efectivo" ? "block" : "none";
};

function calcularCambio() {
  if (metodoPago !== "efectivo") return;

  efectivoEntregado = Number(
    document.getElementById("efectivo-entregado").value || 0
  );

  const total = Number(
    document.getElementById("total-venta").innerText.replace(" €", "")
  );

  document.getElementById("cambio").innerText =
    efectivoEntregado >= total
      ? (efectivoEntregado - total).toFixed(2) + " €"
      : "—";
}

/* =========================
   GUARDAR VENTA + TICKET
========================= */

window.guardarVenta = async function () {
  if (!cajaActualId) return alert("Caja no abierta");
  if (!ventaActual.length) return alert("No hay productos");
  if (!metodoPago) return alert("Selecciona forma de pago");

  let subtotal = 0, totalIVA = 0, totalRecargo = 0;

  const lineas = ventaActual.map(i => {
    const base = i.precio * i.cantidad;
    subtotal += base;
    totalIVA += base * (i.iva / 100);
    totalRecargo += base * (i.recargo / 100);

    return {
      nombre: i.nombre,
      cantidad: i.cantidad,
      precio: i.precio,
      base
    };
  });

  const total = subtotal + totalIVA + totalRecargo;

  if (metodoPago === "efectivo" && efectivoEntregado < total) {
    return alert("Efectivo insuficiente");
  }

  const numeroLegal = await generarNumeroLegal(db, "tickets");

  const ventaRef = await addDoc(collection(db, "sales"), {
    fecha: serverTimestamp(),
    caja_id: cajaActualId,
    tipo_documento: "ticket",
    numero_legal: numeroLegal,
    metodo_pago: metodoPago,
    efectivo_entregado: metodoPago === "efectivo" ? efectivoEntregado : null,
    cambio: metodoPago === "efectivo" ? efectivoEntregado - total : null,
    subtotal,
    total_iva: totalIVA,
    total_recargo: totalRecargo,
    total,
    lineas
  });

  window.open(`ticket.html?id=${ventaRef.id}`, "_blank");

  ventaActual = [];
  metodoPago = null;
  efectivoEntregado = 0;
  document.getElementById("pago-seleccionado").innerText = "—";
  document.getElementById("bloque-efectivo").style.display = "none";
  renderVenta();
};

/* =========================
   RENDER
========================= */

function renderVenta() {
  const tbody = document.getElementById("venta-lista");
  tbody.innerHTML = "";

  let subtotal = 0, totalIVA = 0, totalRecargo = 0;

  ventaActual.forEach(i => {
    const base = i.precio * i.cantidad;
    subtotal += base;
    totalIVA += base * (i.iva / 100);
    totalRecargo += base * (i.recargo / 100);

    tbody.innerHTML += `
      <tr>
        <td>${i.nombre}</td>
        <td>
          <button onclick="disminuirCantidad('${i.id}')">−</button>
          ${i.cantidad}
          <button onclick="aumentarCantidad('${i.id}')">+</button>
        </td>
        <td>
          <input type="number" step="0.01" value="${i.precio}"
            style="width:70px"
            onchange="cambiarPrecio('${i.id}', this.value)"> €
        </td>
        <td>${base.toFixed(2)} €</td>
        <td>
          <button onclick="eliminarLinea('${i.id}')">🗑️</button>
        </td>
      </tr>
    `;
  });

  document.getElementById("subtotal").innerText = subtotal.toFixed(2) + " €";
  document.getElementById("total-iva").innerText = totalIVA.toFixed(2) + " €";
  document.getElementById("total-recargo").innerText = totalRecargo.toFixed(2) + " €";
  document.getElementById("total-venta").innerText =
    (subtotal + totalIVA + totalRecargo).toFixed(2) + " €";
}

/* =========================
   EXPONER
========================= */

window.cambiarPrecio = cambiarPrecio;
window.aumentarCantidad = aumentarCantidad;
window.disminuirCantidad = disminuirCantidad;
window.eliminarLinea = eliminarLinea;
window.calcularCambio = calcularCambio;

/* =========================
   INIT
========================= */

document.addEventListener("DOMContentLoaded", async () => {
  await comprobarCajaAbierta();
  cargarCategorias();
});
