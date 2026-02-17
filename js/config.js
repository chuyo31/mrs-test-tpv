console.log("config.js CARGADO");

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ==================================================
   CATEGORÍAS
================================================== */

window.crearCategoria = async function () {
  const nombre = document.getElementById("cat-nombre")?.value.trim();
  const tipo = document.getElementById("cat-fiscal")?.value;

  if (!nombre) return alert("Nombre obligatorio");

  await addDoc(collection(db, "categories"), {
    nombre,
    tipo_fiscal: "IVA",
    iva: 21,
    activa: true,
    fecha_creacion: serverTimestamp()
  });

  document.getElementById("cat-nombre").value = "";
  cargarCategorias();
  cargarSelectCategorias();
};

async function cargarCategorias() {
  const ul = document.getElementById("lista-categorias");
  if (!ul) return;

  ul.innerHTML = "";

  const snap = await getDocs(collection(db, "categories"));
  snap.forEach(d => {
    const c = d.data();
    if (!c.activa) return;

    ul.innerHTML += `<li>${c.nombre} (${c.tipo_fiscal})</li>`;
  });
}

/* ==================================================
   SUBCATEGORÍAS
================================================== */

window.crearSubcategoria = async function () {
  const nombre = document.getElementById("sub-nombre")?.value.trim();
  const catId = document.getElementById("sub-categoria")?.value;

  if (!nombre || !catId) {
    alert("Datos incompletos");
    return;
  }

  await addDoc(collection(db, "subcategories"), {
    nombre,
    category_id: catId,
    activa: true,
    fecha_creacion: serverTimestamp()
  });

  document.getElementById("sub-nombre").value = "";
  cargarSubcategoriasAdmin();
};

async function cargarSubcategoriasAdmin() {
  const ul = document.getElementById("lista-subcategorias");
  if (!ul) return;

  ul.innerHTML = "";

  const snap = await getDocs(collection(db, "subcategories"));
  snap.forEach(d => {
    const s = d.data();
    if (!s.activa) return;

    ul.innerHTML += `<li>${s.nombre}</li>`;
  });
}

/* ==================================================
   PRODUCTOS
================================================== */

window.crearProducto = async function () {
  const nombre = document.getElementById("prod-nombre")?.value.trim();
  const desc = document.getElementById("prod-desc")?.value.trim();
  const cat = document.getElementById("prod-categoria")?.value;
  const sub = document.getElementById("prod-subcategoria")?.value || null;
  const coste = Number(document.getElementById("prod-coste")?.value || 0);
  const venta = Number(document.getElementById("prod-venta")?.value);
  const tipo = document.getElementById("prod-tipo")?.value;

  if (!nombre || !cat || !venta) {
    alert("Faltan datos");
    return;
  }

  await addDoc(collection(db, "products"), {
    nombre,
    descripcion: desc,
    category_id: cat,
    subcategory_id: sub,
    tipo,
    precio_coste: coste,
    precio_venta: venta,
    iva: 21,
    activo: true,
    fecha_creacion: serverTimestamp()
  });

  alert("Producto creado");
};

/* ==================================================
   SELECTS
================================================== */

async function cargarSelectCategorias() {
  const sub = document.getElementById("sub-categoria");
  const prod = document.getElementById("prod-categoria");

  if (!sub || !prod) return;

  sub.innerHTML = "";
  prod.innerHTML = "";

  const snap = await getDocs(collection(db, "categories"));
  snap.forEach(d => {
    const c = d.data();
    if (!c.activa) return;

    const opt = `<option value="${d.id}">${c.nombre}</option>`;
    sub.innerHTML += opt;
    prod.innerHTML += opt;
  });
}

async function cargarSubcategoriasFiltradas(categoryId) {
  const select = document.getElementById("prod-subcategoria");
  if (!select) return;

  select.innerHTML = "<option value=''>Sin subcategoría</option>";

  if (!categoryId) return;

  const snap = await getDocs(collection(db, "subcategories"));
  snap.forEach(d => {
    const s = d.data();
    if (!s.activa) return;
    if (s.category_id !== categoryId) return;

    select.innerHTML += `<option value="${d.id}">${s.nombre}</option>`;
  });
}

/* ==================================================
   INIT
================================================== */

document.addEventListener("DOMContentLoaded", () => {
  cargarCategorias();
  cargarSelectCategorias();
  cargarSubcategoriasAdmin();

  const prodCategoria = document.getElementById("prod-categoria");
  if (prodCategoria) {
    prodCategoria.addEventListener("change", e => {
      cargarSubcategoriasFiltradas(e.target.value);
    });
  }
});
