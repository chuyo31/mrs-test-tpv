import { db } from "./firebase.js";
import {
  collection, addDoc, getDocs, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let clientesLocal = [];

async function cargarClientes() {
  const tbody = document.getElementById("clientes-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  const snap = await getDocs(collection(db, "clients"));
  clientesLocal = [];
  snap.forEach(d => {
    const c = d.data();
    clientesLocal.push({
      id: d.id,
      tipo: c.tipo || "cliente",
      nombre: c.nombre || "",
      movil: c.movil || "",
      razon: c.razon || "",
      cif: c.cif || "",
      correo: c.correo || "",
      dni_nie: c.dni_nie || "",
      direccion: c.direccion || ""
    });
  });
  renderClientes(clientesLocal);
}

function renderClientes(list) {
  const tbody = document.getElementById("clientes-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  list.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.nombre}</td>
      <td>${c.movil}</td>
      <td>${c.dni_nie || ""}</td>
      <td>${c.cif}</td>
      <td>${c.razon || ""}</td>
      <td>${c.correo}</td>
      <td><button class="outline" onclick="editarCliente('${c.id}')">Editar</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function filtrarClientes() {
  const campo = document.getElementById("cliente-filter-campo").value;
  const term = document.getElementById("cliente-buscar").value.trim().toLowerCase();
  if (!term) { renderClientes(clientesLocal); return; }
  const filtered = clientesLocal.filter(c => {
    const v = (c[campo] || "").toString().toLowerCase();
    return v.includes(term);
  });
  renderClientes(filtered);
}

window.guardarCliente = async function() {
  const editId = document.getElementById("edit-id").value;
  const tipoActual = document.getElementById("edit-tipo").value || (document.getElementById("form-empresa").style.display === "none" ? "cliente" : "empresa");
  if (tipoActual === "cliente") {
    const nombre = document.getElementById("cli-nombre").value.trim();
    const dni = document.getElementById("cli-dni").value.trim();
    const movil = document.getElementById("cli-movil").value.trim();
    const correo = document.getElementById("cli-correo").value.trim();
    if (!nombre || !movil) { alert("Nombre y móvil son obligatorios"); return; }
    const data = { tipo: "cliente", nombre, dni_nie: dni, movil, correo };
    if (editId) {
      await updateDoc(doc(db, "clients", editId), data);
    } else {
      await addDoc(collection(db, "clients"), { ...data, created_at: serverTimestamp() });
    }
  } else {
    const nombre = document.getElementById("emp-nombre").value.trim();
    const razon = document.getElementById("emp-razon").value.trim();
    const cif = document.getElementById("emp-cif").value.trim();
    const direccion = document.getElementById("emp-direccion").value.trim();
    const movil = document.getElementById("emp-movil").value.trim();
    const correo = document.getElementById("emp-correo").value.trim();
    if (!nombre || !movil) { alert("Nombre y móvil son obligatorios"); return; }
    const data = { tipo: "empresa", nombre, razon, cif, direccion, movil, correo };
    if (editId) {
      await updateDoc(doc(db, "clients", editId), data);
    } else {
      await addDoc(collection(db, "clients"), { ...data, created_at: serverTimestamp() });
    }
  }
  limpiarFormCliente();
  await cargarClientes();
};

window.limpiarFormCliente = function() {
  document.getElementById("edit-id").value = "";
  document.getElementById("edit-tipo").value = "";
  document.getElementById("cli-nombre").value = "";
  document.getElementById("cli-dni").value = "";
  document.getElementById("cli-movil").value = "";
  document.getElementById("cli-correo").value = "";
  document.getElementById("emp-nombre").value = "";
  document.getElementById("emp-razon").value = "";
  document.getElementById("emp-cif").value = "";
  document.getElementById("emp-direccion").value = "";
  document.getElementById("emp-movil").value = "";
  document.getElementById("emp-correo").value = "";
};

window.switchForm = function(tipo) {
  const isCliente = tipo === "cliente";
  document.getElementById("form-cliente").style.display = isCliente ? "block" : "none";
  document.getElementById("form-empresa").style.display = isCliente ? "none" : "block";
  document.getElementById("btn-form-cliente").classList.toggle("outline", !isCliente);
  document.getElementById("btn-form-empresa").classList.toggle("outline", isCliente);
  document.getElementById("edit-tipo").value = tipo;
};

window.editarCliente = function(id) {
  const c = clientesLocal.find(x => x.id === id);
  if (!c) return;
  document.getElementById("edit-id").value = id;
  document.getElementById("edit-tipo").value = c.tipo;
  switchForm(c.tipo);
  if (c.tipo === "cliente") {
    document.getElementById("cli-nombre").value = c.nombre || "";
    document.getElementById("cli-dni").value = c.dni_nie || "";
    document.getElementById("cli-movil").value = c.movil || "";
    document.getElementById("cli-correo").value = c.correo || "";
  } else {
    document.getElementById("emp-nombre").value = c.nombre || "";
    document.getElementById("emp-razon").value = c.razon || "";
    document.getElementById("emp-cif").value = c.cif || "";
    document.getElementById("emp-direccion").value = c.direccion || "";
    document.getElementById("emp-movil").value = c.movil || "";
    document.getElementById("emp-correo").value = c.correo || "";
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const inp = document.getElementById("cliente-buscar");
  const campoSel = document.getElementById("cliente-filter-campo");
  if (inp) inp.addEventListener("input", filtrarClientes);
  if (campoSel) campoSel.addEventListener("change", filtrarClientes);
  cargarClientes();
});
