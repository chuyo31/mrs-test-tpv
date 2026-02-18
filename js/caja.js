import { db, auth } from "./firebase.js";
import {
  collection, getDocs, getDoc, addDoc, updateDoc, doc,
  serverTimestamp, query, where, limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { generarNumeroLegal } from "./numeracion.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
const storage = getStorage();

let ventaActual = [];
let metodoPago = null;
let cajaActualId = null;
let categoriasLocal = [];
let ultimoDocId = null;
let ultimoDocData = null;
let usuarioActualNombre = "—";
let clientesPopup = [];
let clienteSeleccionado = null;

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
    btn.innerHTML = (cat.imagen_url ? `<img src="${cat.imagen_url}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;display:block;margin:0 auto 6px;">` : ``) + `<div>${cat.nombre}</div>`;
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
    btn.style = "margin: 5px; height: auto; padding: 10px; text-align:center;";
    const img = p.imagen_url ? `<img src="${p.imagen_url}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;display:block;margin:0 auto 6px;">` : "";
    btn.innerHTML = `${img}<div>${p.nombre}</div><div><strong>${parseFloat(p.pvp || 0).toFixed(2)}€</strong></div>`;
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

  let subtotalGeneral = 0, totalIva = 0;

  ventaActual.forEach(i => {
    const pvpTotalFila = i.precio * i.cantidad;
    const divisor = 1.21;
    const baseFila = pvpTotalFila / divisor;
    const ivaFila = baseFila * 0.21;

    subtotalGeneral += baseFila;
    totalIva += ivaFila;

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

  const totalFinal = subtotalGeneral + totalIva;
  document.getElementById("subtotal").innerText = subtotalGeneral.toFixed(2) + " €";
  document.getElementById("total-iva").innerText = totalIva.toFixed(2) + " €";
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

window.addEventListener("DOMContentLoaded", () => {
  cargarUsuarioActual();
  const input = document.getElementById("buscar-producto");
  if (!input) return;
  input.addEventListener("input", async () => {
    const term = input.value.trim().toLowerCase();
    const cont = document.getElementById("productos");
    if (!cont) return;
    if (!term) { cont.innerHTML = ""; return; }
    const snap = await getDocs(collection(db, "products"));
    const matched = [];
    snap.forEach(d => {
      const p = d.data();
      if ((p.nombre || "").toLowerCase().includes(term)) {
        matched.push({ id: d.id, ...p });
      }
    });
    cont.innerHTML = "";
    matched.forEach(p => {
      const btn = document.createElement("button");
      btn.className = "outline";
      btn.style = "margin: 5px; height: auto; padding: 10px; text-align:center;";
      const img = p.imagen_url ? `<img src="${p.imagen_url}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;display:block;margin:0 auto 6px;">` : "";
      btn.innerHTML = `${img}<div>${p.nombre}</div><div><strong>${parseFloat(p.pvp || 0).toFixed(2)}€</strong></div>`;
      btn.onclick = () => agregarProductoVenta(p.id, p);
      cont.appendChild(btn);
    });
  });
});

function renderResultadosClientes(list) {
  const cont = document.getElementById("post-cli-resultados");
  if (!cont) return;
  cont.innerHTML = "";
  list.forEach(c => {
    const btn = document.createElement("button");
    btn.className = "outline";
    btn.style = "margin:4px; display:flex; justify-content:space-between;";
    btn.innerHTML = `<span>${c.nombre}</span><small>${c.movil || ""}</small>`;
    btn.onclick = () => seleccionarCliente(c);
    cont.appendChild(btn);
  });
}

async function cargarClientesPopup() {
  try {
    const snap = await getDocs(collection(db, "clients"));
    clientesPopup = [];
    snap.forEach(d => {
      const c = d.data();
      clientesPopup.push({
        id: d.id,
        nombre: c.nombre || "",
        movil: c.movil || "",
        dni_nie: c.dni_nie || "",
        cif: c.cif || "",
        correo: c.correo || ""
      });
    });
    renderResultadosClientes(clientesPopup);
  } catch(e) {}
}

function filtrarClientesPopup() {
  const campo = document.getElementById("post-cli-filter")?.value || "nombre";
  const term = document.getElementById("post-cli-buscar")?.value.trim().toLowerCase() || "";
  if (!term) { renderResultadosClientes(clientesPopup); return; }
  const f = clientesPopup.filter(c => ((c[campo] || "").toLowerCase().includes(term)));
  renderResultadosClientes(f);
}

function seleccionarCliente(c) {
  clienteSeleccionado = c;
  const el = document.getElementById("post-cli-seleccionado");
  if (el) el.innerText = c.nombre;
  if (!document.getElementById("post-phone").value && c.movil) {
    document.getElementById("post-phone").value = c.movil;
  }
  if (ultimoDocId) {
    updateDoc(doc(db, "sales", ultimoDocId), {
      client_id: c.id,
      client_nombre: c.nombre
    });
  }
}

window.abrirClientes = () => {
  window.open("clientes.html", "_blank");
};

async function cargarUsuarioActual() {
  try {
    const uid = sessionStorage.getItem("uid");
    if (!uid) { document.getElementById("usuario-actual-nombre").innerText = "—"; return; }
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const d = snap.data();
      usuarioActualNombre = d.nombre || d.alias || (d.email?.split("@")[0]) || "Usuario";
    } else {
      usuarioActualNombre = "Usuario";
    }
  } catch(e) {
    usuarioActualNombre = "Usuario";
  }
  const el = document.getElementById("usuario-actual-nombre");
  if (el) el.innerText = usuarioActualNombre;
}

window.cambiarUsuario = () => {
  if (typeof window.logout === "function") window.logout();
};

window.aplicarDescuento = () => {
  if (!ventaActual.length) { alert("No hay líneas en la venta"); return; }
  const totalPvp = ventaActual.reduce((a,b)=>a + (b.precio || 0) * (b.cantidad || 1), 0);
  const entrada = prompt("Introduce % de descuento (0-100)", "10");
  if (entrada === null) return;
  const pct = parseFloat(entrada);
  if (isNaN(pct) || pct <= 0 || pct >= 100) { alert("Porcentaje inválido"); return; }
  const importe = totalPvp * (pct / 100);
  ventaActual.push({
    id: "desc_" + Date.now(),
    nombre: `Descuento (${pct.toFixed(0)}%)`,
    precio: -importe,
    cantidad: 1,
    tipoFiscal: "IVA",
    categoria_id: null
  });
  renderizarTabla();
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
      total: totalVenta,
      metodo_pago: metodoPago,
      caja_id: cajaActualId, // Vínculo para el Cierre Z
      efectivo_entregado: entregado
    });

    ultimoDocId = docRef.id;
    ultimoDocData = {
      numero_legal: num,
      lineas: JSON.parse(JSON.stringify(ventaActual)),
      subtotal: parseFloat(document.getElementById("subtotal").innerText),
      total_iva: parseFloat(document.getElementById("total-iva").innerText),
      total: totalVenta,
      metodo_pago: metodoPago
    };

    // 4. Resetear interfaz
    alert("Venta guardada: " + num);
    ventaActual = [];
    metodoPago = null;
    document.getElementById("pago-seleccionado").innerText = "—";
    document.getElementById("bloque-efectivo").style.display = "none";
    document.getElementById("efectivo-entregado").value = "";
    renderizarTabla();
    
    // 5. Popup post-cobro
    const dlg = document.getElementById("post-cobro");
    const desc = document.getElementById("post-desc");
    const lineas = ultimoDocData.lineas.reduce((a,b)=>a + (b.cantidad || 1), 0);
    desc.innerText = `Venta ${num} · ${lineas} unidades · Total ${ultimoDocData.total.toFixed(2)} € (Base ${ultimoDocData.subtotal.toFixed(2)} €, IVA ${ultimoDocData.total_iva.toFixed(2)} €)`;
    if (dlg?.showModal) {
      dlg.showModal();
      cargarClientesPopup();
      const s = document.getElementById("post-cli-buscar");
      const f = document.getElementById("post-cli-filter");
      if (s) s.addEventListener("input", filtrarClientesPopup);
      if (f) f.addEventListener("change", filtrarClientesPopup);
    }

  } catch (err) {
    console.error("Error al guardar venta:", err);
    alert("Hubo un error al guardar la venta.");
  }
};

window.postCerrar = () => {
  const dlg = document.getElementById("post-cobro");
  if (dlg?.close) dlg.close();
};

window.postImprimirTicket = () => {
  if (!ultimoDocId) return;
  updateDoc(doc(db, "sales", ultimoDocId), { doc_type: "ticket" });
  window.open(`ticket.html?id=${ultimoDocId}`, "_blank");
};

window.postImprimirFactura = () => {
  if (!ultimoDocId) return;
  updateDoc(doc(db, "sales", ultimoDocId), { doc_type: "factura" });
  window.open(`factura.html?id=${ultimoDocId}`, "_blank");
};

function crearNodoDoc(tipo = "ticket") {
  const d = ultimoDocData;
  const el = document.createElement("div");
  el.style.padding = "16px";
  el.style.fontFamily = "Arial, Helvetica, sans-serif";
  el.innerHTML = `
    <h3 style="margin:0 0 6px 0;">${tipo.toUpperCase()} ${d.numero_legal || ""}</h3>
    <p style="margin:0 0 8px 0;">Método: ${d.metodo_pago?.toUpperCase() || ""}</p>
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead><tr>
        <th style="border:1px solid #000; padding:4px; text-align:left;">Producto</th>
        <th style="border:1px solid #000; padding:4px;">Cant.</th>
        <th style="border:1px solid #000; padding:4px; text-align:right;">Total</th>
      </tr></thead>
      <tbody>
        ${d.lineas.map(l => {
          const total = (l.precio || 0) * (l.cantidad || 1);
          return `<tr>
            <td style="border:1px solid #000; padding:4px;">${l.nombre}</td>
            <td style="border:1px solid #000; padding:4px; text-align:center;">${l.cantidad || 1}</td>
            <td style="border:1px solid #000; padding:4px; text-align:right;">${total.toFixed(2)} €</td>
          </tr>`;
        }).join("")}
      </tbody>
      <tfoot>
        <tr><th colspan="2" style="border:1px solid #000; padding:4px; text-align:right;">Base</th><th style="border:1px solid #000; padding:4px; text-align:right;">${d.subtotal.toFixed(2)} €</th></tr>
        <tr><th colspan="2" style="border:1px solid #000; padding:4px; text-align:right;">IVA</th><th style="border:1px solid #000; padding:4px; text-align:right;">${d.total_iva.toFixed(2)} €</th></tr>
        <tr><th colspan="2" style="border:1px solid #000; padding:4px; text-align:right;">Total</th><th style="border:1px solid #000; padding:4px; text-align:right;">${d.total.toFixed(2)} €</th></tr>
      </tfoot>
    </table>
  `;
  return el;
}

window.postEnviarWhatsApp = async () => {
  try {
    if (!ultimoDocData) return alert("No hay venta reciente");
    const phone = (document.getElementById("post-phone")?.value || "").trim();
    const tipo = document.getElementById("post-doc-type")?.value || "ticket";
    if (!phone) return alert("Introduce el número del cliente");
    const node = crearNodoDoc(tipo);
    document.body.appendChild(node);
    const opt = { filename: `${tipo}_${ultimoDocData.numero_legal || "ticket"}.pdf`, margin: 10, image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    const blob = await window.html2pdf().set(opt).from(node).outputPdf('blob');
    node.remove();
    const storageRef = ref(storage, `docs/${opt.filename}`);
    await uploadBytes(storageRef, blob);
    const link = await getDownloadURL(storageRef);
    const text = `Documento ${tipo.toUpperCase()} ${ultimoDocData.numero_legal || ""}\\n${link}`;
    const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  } catch (e) {
    console.error(e);
    alert("No se pudo generar/enviar el PDF.");
  }
};

document.addEventListener("DOMContentLoaded", comprobarCajaAbierta);
