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

/* =========================
   ESTADO DE CAJA
========================= */
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

window.abrirCaja = async () => {
  const fondoInput = document.getElementById("fondo-inicial");
  const fondo = parseFloat(fondoInput.value);
  if (isNaN(fondo) || fondo < 0) return alert("Por favor, introduce un fondo inicial válido.");
  
  try {
    await addDoc(collection(db, "cash_registers"), {
      fecha_apertura: serverTimestamp(),
      fondo_inicial: fondo,
      estado: "abierta",
      // Aquí podrías añadir el email del usuario si usas Auth
    });
    fondoInput.value = "";
    comprobarCajaAbierta();
  } catch (e) { alert("Error al abrir caja"); }
};

/* =========================
   GESTIÓN DE PRODUCTOS
========================= */
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
    btn.innerText = cat.nombre;
    btn.className = "secondary";
    btn.style = "margin: 5px; min-width: 120px;";
    btn.onclick = () => cargarProductosCaja(docSnap.id);
    divCat.appendChild(btn);
  });
}

async function cargarProductosCaja(catId) {
  const divProd = document.getElementById("productos");
  const q = query(collection(db, "products"), where("categoria_id", "==", catId));
  const snap = await getDocs(q);
  divProd.innerHTML = "";
  
  if (snap.empty) divProd.innerHTML = "<small>No hay productos en esta familia</small>";

  snap.forEach(docSnap => {
    const p = docSnap.data();
    const id = docSnap.id;
    const btn = document.createElement("button");
    btn.className = "outline";
    btn.style = "margin: 5px; height: auto; padding: 10px;";
    btn.innerHTML = `${p.nombre}<br><strong>${parseFloat(p.pvp).toFixed(2)}€</strong>`;
    btn.onclick = () => agregarProductoVenta(id, p);
    divProd.appendChild(btn);
  });
}

function agregarProductoVenta(id, data) {
  const existe = ventaActual.find(i => i.id === id);
  if (existe) {
    existe.cantidad++;
  } else {
    const cat = categoriasLocal.find(c => c.id === data.categoria_id);
    ventaActual.push({
      id: id,
      nombre: data.nombre,
      precio: parseFloat(data.pvp) || 0,
      cantidad: 1,
      tipoFiscal: cat ? cat.tipoFiscal : "IVA",
      categoria_id: data.categoria_id
    });
  }
  renderizarTabla();
}

window.editarPrecio = (id) => {
    const item = ventaActual.find(i => i.id === id);
    if (!item) return;
    const nuevoPVP = prompt(`Editar precio final para: ${item.nombre}`, item.precio);
    if (nuevoPVP !== null && !isNaN(nuevoPVP) && nuevoPVP >= 0) {
        item.precio = parseFloat(nuevoPVP);
        renderizarTabla();
    }
};

/* =========================
   RENDER Y CÁLCULOS
========================= */
function renderizarTabla() {
  const tbody = document.querySelector("#tabla-venta tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  let subtotalGeneral = 0, totalIva = 0, totalRec = 0;

  ventaActual.forEach(i => {
    const pvpTotalFila = i.precio * i.cantidad;
    const divisor = (i.tipoFiscal === "IVA_RE") ? 1.262 : 1.21;
    const baseFila = pvpTotalFila / divisor;
    const ivaFila = baseFila * 0.21;
    const reFila = (i.tipoFiscal === "IVA_RE") ? (baseFila * 0.052) : 0;

    subtotalGeneral += baseFila;
    totalIva += ivaFila;
    totalRec += reFila;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i.nombre}</td>
      <td>
        <div class="acciones" style="display:flex; align-items:center; gap:8px;">
          <button class="outline" onclick="cambiarCantidad('${i.id}', -1)" style="padding:2px 10px;">−</button>
          <strong>${i.cantidad}</strong>
          <button class="outline" onclick="cambiarCantidad('${i.id}', 1)" style="padding:2px 10px;">+</button>
        </div>
      </td>
      <td onclick="editarPrecio('${i.id}')" style="cursor:pointer; color: var(--primary); text-decoration: underline;">
        ${i.precio.toFixed(2)}€
      </td>
      <td class="right">${pvpTotalFila.toFixed(2)}€</td>
      <td><button class="secondary" onclick="eliminarFila('${i.id}')" style="padding:4px; margin:0;">🗑️</button></td>
    `;
    tbody.appendChild(tr);
  });

  const totalFinal = subtotalGeneral + totalIva + totalRec;
  document.getElementById("subtotal").innerText = subtotalGeneral.toFixed(2) + " €";
  document.getElementById("total-iva").innerText = totalIva.toFixed(2) + " €";
  document.getElementById("total-recargo").innerText = totalRec.toFixed(2) + " €";
  document.getElementById("total-venta").innerText = totalFinal.toFixed(2) + " €";
  
  if (metodoPago === 'efectivo') calcularCambio();
}

/* =========================
   ACCIONES DE COBRO
========================= */
window.cambiarCantidad = (id, delta) => {
  const item = ventaActual.find(i => i.id === id);
  if (item) {
    item.cantidad += delta;
    if (item.cantidad <= 0) ventaActual = ventaActual.filter(i => i.id !== id);
    renderizarTabla();
  }
};

window.eliminarFila = (id) => {
  ventaActual = ventaActual.filter(i => i.id !== id);
  renderizarTabla();
};

window.seleccionarPago = (tipo) => {
  metodoPago = tipo;
  document.querySelectorAll('.btn-pago').forEach(b => b.classList.add('outline'));
  event.currentTarget.classList.remove('outline');
  document.getElementById("pago-seleccionado").innerText = tipo.toUpperCase();
  document.getElementById("bloque-efectivo").style.display = (tipo === 'efectivo') ? "block" : "none";
  renderizarTabla();
};

window.calcularCambio = () => {
  const total = parseFloat(document.getElementById("total-venta").innerText) || 0;
  const entregado = parseFloat(document.getElementById("efectivo-entregado").value) || 0;
  const cambio = entregado - total;
  document.getElementById("cambio").innerText = (cambio > 0 ? cambio : 0).toFixed(2) + " €";
};

/* =========================
   GUARDAR VENTA (FINAL)
========================= */
window.guardarVenta = async () => {
  // 1. Validaciones previas
  if (!cajaActualId) return alert("Error: La caja no está abierta.");
  if (ventaActual.length === 0) return alert("Añade productos a la venta.");
  if (!metodoPago) return alert("Selecciona un método de pago.");
  
  const totalVenta = parseFloat(document.getElementById("total-venta").innerText);
  const entregado = parseFloat(document.getElementById("efectivo-entregado")?.value) || totalVenta;

  if (metodoPago === 'efectivo' && entregado < totalVenta) {
      return alert("El efectivo entregado es insuficiente.");
  }

  try {
    // 2. Comprobar que la caja sigue abierta (Seguridad Verifactu)
    const cajaSnap = await getDoc(doc(db, "cash_registers", cajaActualId));
    if (!cajaSnap.exists() || cajaSnap.data().estado !== "abierta") {
        alert("La caja ha sido cerrada desde otro terminal. Reiniciando...");
        location.reload();
        return;
    }

    // 3. Generar número legal y guardar
    const num = await generarNumeroLegal(db, "tickets");
    
    const docRef = await addDoc(collection(db, "sales"), {
      numero_legal: num,
      fecha: serverTimestamp(),
      lineas: ventaActual,
      subtotal: parseFloat(document.getElementById("subtotal").innerText),
      total_iva: parseFloat(document.getElementById("total-iva").innerText),
      total_recargo: parseFloat(document.getElementById("total-recargo").innerText),
      total: totalVenta,
      metodo_pago: metodoPago,
      caja_id: cajaActualId, // Vínculo para el Cierre Z
      efectivo_entregado: entregado
    });

    // 4. Resetear interfaz
    alert("Venta guardada: " + num);
    ventaActual = [];
    metodoPago = null;
    document.getElementById("pago-seleccionado").innerText = "—";
    document.getElementById("bloque-efectivo").style.display = "none";
    document.getElementById("efectivo-entregado").value = "";
    renderizarTabla();
    
    // 5. Imprimir
    window.open(`ticket.html?id=${docRef.id}`, "_blank");

  } catch (err) {
    console.error("Error al guardar venta:", err);
    alert("Hubo un error al guardar la venta.");
  }
};

document.addEventListener("DOMContentLoaded", comprobarCajaAbierta);