import { db } from "./firebase.js";
import {
  collection, getDocs, getDoc, addDoc, updateDoc, doc,
  serverTimestamp, query, where, limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { generarNumeroLegal } from "./numeracion.js";

let ventaActual = [];
let metodoPago = null;
let cajaActualId = null;
let categoriasLocal = [];

async function comprobarCajaAbierta() {
  const q = query(collection(db, "cash_registers"), where("estado", "==", "abierta"), limit(1));
  try {
    const snap = await getDocs(q);
    const abrir = document.getElementById("abrir-caja");
    const zona = document.getElementById("zona-caja");
    
    if (snap.empty) {
      cajaActualId = null;
      if (abrir) abrir.style.display = "block";
      if (zona) zona.style.display = "none";
    } else {
      cajaActualId = snap.docs[0].id;
      if (abrir) abrir.style.display = "none";
      if (zona) zona.style.display = "block";
      cargarCategoriasCaja();
    }
  } catch (e) { console.error("Error al comprobar caja:", e); }
}

async function abrirCaja() {
  const fondoInput = document.getElementById("fondo-inicial");
  const fondo = parseFloat(fondoInput.value);
  if (isNaN(fondo) || fondo < 0) return alert("Por favor, introduce un fondo inicial válido.");
  
  try {
    await addDoc(collection(db, "cash_registers"), {
      fecha_apertura: serverTimestamp(),
      fondo_inicial: fondo,
      estado: "abierta",
    });
    fondoInput.value = "";
    comprobarCajaAbierta();
  } catch (e) { alert("Error al abrir caja"); }
}

async function cargarCategoriasCaja() {
  const divCat = document.getElementById("categorias");
  if (!divCat) return;
  const snap = await getDocs(collection(db, "categories"));
  divCat.innerHTML = "";
  categoriasLocal = [];
  
  snap.forEach(docSnap => {
    const cat = { id: docSnap.id, ...docSnap.data() };
    categoriasLocal.push(cat);
    
    const btn = document.createElement("button");
    btn.className = "btn-categoria-modern";
    
    const imgHtml = cat.imagen_url 
      ? `<img src="${cat.imagen_url}" class="img-caja">`
      : `<div class="img-placeholder"><i data-lucide="layers"></i></div>`;
      
    btn.innerHTML = `
      ${imgHtml}
      <span>${cat.nombre}</span>
    `;
    
    btn.onclick = () => cargarProductosCaja(docSnap.id);
    divCat.appendChild(btn);
  });
  if(window.lucide) window.lucide.createIcons();
}

async function cargarProductosCaja(catId) {
  const divProd = document.getElementById("productos");
  const q = query(collection(db, "products"), where("categoria_id", "==", catId));
  const snap = await getDocs(q);
  divProd.innerHTML = "";
  
  if (snap.empty) {
    divProd.innerHTML = "<div style='padding:20px; opacity:0.6;'>No hay productos en esta familia</div>";
    return;
  }

  snap.forEach(docSnap => {
    const p = docSnap.data();
    const id = docSnap.id;
    const btn = document.createElement("button");
    btn.className = "btn-producto-modern";
    
    const imgHtml = p.imagen_url 
      ? `<img src="${p.imagen_url}" class="img-caja">`
      : `<div class="img-placeholder"><i data-lucide="package"></i></div>`;

    btn.innerHTML = `
      ${imgHtml}
      <div class="info">
        <span class="nombre">${p.nombre}</span>
        <span class="precio">${parseFloat(p.pvp).toFixed(2)}€</span>
      </div>
    `;
    btn.addEventListener("click", () => agregarProductoVenta(id, p));
    divProd.appendChild(btn);
  });
  if(window.lucide) window.lucide.createIcons();
}

function agregarProductoVenta(id, data) {
  const existe = ventaActual.find(i => i.id === id);
  if (existe) {
    existe.cantidad++;
  } else {
    const cat = categoriasLocal.find(c => c.id === data.categoria_id);
    const tipoFiscal = "IVA";
    const pvp = parseFloat(data.pvp) || 0;
    
    const divisor = 1.21;
    const baseUnitativa = pvp / divisor;
    const cuotaIVA = baseUnitativa * 0.21;

    ventaActual.push({
      id: id,
      nombre: data.nombre,
      precio: pvp,
      cantidad: 1,
      tipoFiscal: tipoFiscal,
      categoria_id: data.categoria_id,
      base_imponible: Number(baseUnitativa.toFixed(4)),
      cuota_iva: Number(cuotaIVA.toFixed(4)),
      cuota_re: 0
    });
  }
  renderizarTabla();
}

function editarPrecio(id) {
  const item = ventaActual.find(i => i.id === id);
  if (!item) return;
  const nuevoPVP = prompt(`Editar precio final para: ${item.nombre}`, item.precio);
  if (nuevoPVP !== null && !isNaN(nuevoPVP) && nuevoPVP >= 0) {
    const pvp = parseFloat(nuevoPVP);
    item.precio = pvp;
    const divisor = 1.21;
    const baseUnitativa = pvp / divisor;
    item.base_imponible = Number(baseUnitativa.toFixed(4));
    item.cuota_iva = Number((baseUnitativa * 0.21).toFixed(4));
    item.cuota_re = 0;
    renderizarTabla();
  }
}

function renderizarTabla() {
  const tbody = document.querySelector("#tabla-venta tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  let subtotalGeneral = 0, totalIva = 0;

  ventaActual.forEach(i => {
    const pvpTotalFila = i.precio * i.cantidad;
    const baseFila = i.base_imponible * i.cantidad;
    const ivaFila = i.cuota_iva * i.cantidad;

    subtotalGeneral += baseFila;
    totalIva += ivaFila;

    const tr = document.createElement("tr");
    const tdNombre = document.createElement("td");
    tdNombre.textContent = i.nombre;
    const tdCant = document.createElement("td");
    const acciones = document.createElement("div");
    acciones.className = "acciones";
    acciones.style.display = "flex";
    acciones.style.alignItems = "center";
    acciones.style.gap = "8px";
    const btnMenos = document.createElement("button");
    btnMenos.className = "outline";
    btnMenos.style.padding = "2px 10px";
    btnMenos.textContent = "−";
    btnMenos.addEventListener("click", () => cambiarCantidad(i.id, -1));
    const strongCant = document.createElement("strong");
    strongCant.textContent = String(i.cantidad);
    const btnMas = document.createElement("button");
    btnMas.className = "outline";
    btnMas.style.padding = "2px 10px";
    btnMas.textContent = "+";
    btnMas.addEventListener("click", () => cambiarCantidad(i.id, 1));
    acciones.appendChild(btnMenos);
    acciones.appendChild(strongCant);
    acciones.appendChild(btnMas);
    tdCant.appendChild(acciones);
    const tdPrecio = document.createElement("td");
    tdPrecio.style.cursor = "pointer";
    tdPrecio.style.color = "var(--primary)";
    tdPrecio.style.textDecoration = "underline";
    tdPrecio.textContent = `${i.precio.toFixed(2)}€`;
    tdPrecio.addEventListener("click", () => editarPrecio(i.id));
    const tdTotal = document.createElement("td");
    tdTotal.className = "right";
    tdTotal.textContent = `${pvpTotalFila.toFixed(2)}€`;
    const tdEliminar = document.createElement("td");
    const btnEliminar = document.createElement("button");
    btnEliminar.className = "secondary";
    btnEliminar.style.padding = "4px";
    btnEliminar.style.margin = "0";
    btnEliminar.textContent = "🗑️";
    btnEliminar.addEventListener("click", () => eliminarFila(i.id));
    tdEliminar.appendChild(btnEliminar);
    tr.appendChild(tdNombre);
    tr.appendChild(tdCant);
    tr.appendChild(tdPrecio);
    tr.appendChild(tdTotal);
    tr.appendChild(tdEliminar);
    tbody.appendChild(tr);
  });

  const totalFinal = subtotalGeneral + totalIva;
  document.getElementById("subtotal").innerText = subtotalGeneral.toFixed(2) + " €";
  document.getElementById("total-iva").innerText = totalIva.toFixed(2) + " €";
  document.getElementById("total-venta").innerText = totalFinal.toFixed(2) + " €";
  
  if (metodoPago === 'efectivo') calcularCambio();
}

function cambiarCantidad(id, delta) {
  const item = ventaActual.find(i => i.id === id);
  if (item) {
    item.cantidad += delta;
    if (item.cantidad <= 0) ventaActual = ventaActual.filter(i => i.id !== id);
    renderizarTabla();
  }
}

function eliminarFila(id) {
  ventaActual = ventaActual.filter(i => i.id !== id);
  renderizarTabla();
}

function seleccionarPago(tipo, target) {
  metodoPago = tipo;
  document.querySelectorAll('.btn-pago').forEach(b => b.classList.remove('active'));
  if (target) target.classList.add('active');
  document.getElementById("pago-seleccionado").innerText = tipo.toUpperCase();
  document.getElementById("bloque-efectivo").style.display = (tipo === 'efectivo') ? "block" : "none";
  renderizarTabla();
}

function calcularCambio() {
  const total = parseFloat(document.getElementById("total-venta").innerText) || 0;
  const entregado = parseFloat(document.getElementById("efectivo-entregado").value) || 0;
  const cambio = entregado - total;
  document.getElementById("cambio").innerText = (cambio > 0 ? cambio : 0).toFixed(2) + " €";
}

async function guardarVenta() {
  if (!cajaActualId) return alert("Error: La caja no está abierta.");
  if (ventaActual.length === 0) return alert("Añade productos a la venta.");
  if (!metodoPago) return alert("Selecciona un método de pago.");
  
  const totalVenta = parseFloat(document.getElementById("total-venta").innerText);
  const entregado = parseFloat(document.getElementById("efectivo-entregado")?.value) || totalVenta;

  if (metodoPago === 'efectivo' && entregado < totalVenta) {
      return alert("El efectivo entregado es insuficiente.");
  }

  try {
    const cajaSnap = await getDoc(doc(db, "cash_registers", cajaActualId));
    if (!cajaSnap.exists() || cajaSnap.data().estado !== "abierta") {
        alert("La caja ha sido cerrada desde otro terminal. Reiniciando...");
        location.reload();
        return;
    }

    const num = await generarNumeroLegal(db, "tickets");
    
    const docRef = await addDoc(collection(db, "sales"), {
      numero_legal: num,
      fecha: serverTimestamp(),
      lineas: ventaActual,
      subtotal: Number(parseFloat(document.getElementById("subtotal").innerText).toFixed(4)),
      total_iva: Number(parseFloat(document.getElementById("total-iva").innerText).toFixed(4)),
      total: totalVenta,
      metodo_pago: metodoPago,
      caja_id: cajaActualId,
      efectivo_entregado: entregado
    });

    alert("Venta guardada: " + num);
    ventaActual = [];
    metodoPago = null;
    document.getElementById("pago-seleccionado").innerText = "—";
    document.getElementById("bloque-efectivo").style.display = "none";
    document.getElementById("efectivo-entregado").value = "";
    renderizarTabla();
    
    window.open(`ticket.html?id=${docRef.id}`, "_blank");

  } catch (err) {
    console.error("Error al guardar venta:", err);
    alert("Hubo un error al guardar la venta.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btnAbrir = document.getElementById("btn-abrir-caja");
  if (btnAbrir) btnAbrir.addEventListener("click", abrirCaja);
  document.querySelectorAll(".pago-buttons .btn-pago").forEach(btn => {
    btn.addEventListener("click", () => seleccionarPago(btn.dataset.pagoType || "", btn));
  });
  const entregadoInput = document.getElementById("efectivo-entregado");
  if (entregadoInput) entregadoInput.addEventListener("input", calcularCambio);
  const btnCobrar = document.getElementById("btn-cobrar");
  if (btnCobrar) btnCobrar.addEventListener("click", guardarVenta);
  comprobarCajaAbierta();
});
