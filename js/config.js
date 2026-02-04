import { db } from "./firebase.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* 🔧 FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyBqnNgjPsEhxCX2kxvW4OUjLme0IqG8pTQ",
  authDomain: "mrs-test-tpv.firebaseapp.com",
  projectId: "mrs-test-tpv",
  storageBucket: "mrs-test-tpv.appspot.com",
  messagingSenderId: "912692824915",
  appId: "1:912692824915:web:9d79acbbc7bcaf3cdb6fa6"
};



/* =========================
   CATEGORÍAS
========================= */

window.crearCategoria = async function () {
  const nombre = document.getElementById("cat-nombre").value.trim();
  const tipo = document.getElementById("cat-fiscal").value;

  if (!nombre) return alert("Nombre obligatorio");

  await addDoc(collection(db, "categories"), {
    nombre,
    tipo_fiscal: tipo,
    iva: 21,
    recargo: tipo === "IVA_RE" ? 5.2 : 0,
    activa: true,
    fecha_creacion: serverTimestamp()
  });

  document.getElementById("cat-nombre").value = "";
  cargarCategorias();
  cargarSelectCategorias();
};

async function cargarCategorias() {
  const ul = document.getElementById("lista-categorias");
  ul.innerHTML = "";

  const snap = await getDocs(collection(db, "categories"));
  snap.forEach(d => {
    const c = d.data();
    ul.innerHTML += `<li>${c.nombre} (${c.tipo_fiscal})</li>`;
  });
}

/* =========================
   SUBCATEGORÍAS (ADMIN)
========================= */

window.crearSubcategoria = async function () {
  const nombre = document.getElementById("sub-nombre").value;
  const catId = document.getElementById("sub-categoria").value;

  if (!nombre || !catId) return alert("Datos incompletos");

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
  ul.innerHTML = "";

  const snap = await getDocs(collection(db, "subcategories"));
  snap.forEach(d => {
    const s = d.data();
    if (!s.activa) return;
    ul.innerHTML += `<li>${s.nombre}</li>`;
  });
}

/* =========================
   SUBCATEGORÍAS (PRODUCTOS)
========================= */

async function cargarSubcategoriasFiltradas(categoryId) {
  const select = document.getElementById("prod-subcategoria");
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

/* =========================
   PRODUCTOS
========================= */

window.crearProducto = async function () {
  const nombre = document.getElementById("prod-nombre").value;
  const desc = document.getElementById("prod-desc").value;
  const cat = document.getElementById("prod-categoria").value;
  const sub = document.getElementById("prod-subcategoria").value;
  const coste = Number(document.getElementById("prod-coste").value);
  const venta = Number(document.getElementById("prod-venta").value);
  const tipo = document.getElementById("prod-tipo").value;

  if (!nombre || !cat || !venta) return alert("Faltan datos");

  await addDoc(collection(db, "products"), {
    nombre,
    descripcion: desc,
    category_id: cat,
    subcategory_id: sub || null,
    tipo,
    precio_coste: coste || 0,
    precio_venta: venta,
    iva: 21,
    recargo: tipo === "producto" ? 5.2 : 0,
    activo: true,
    fecha_creacion: serverTimestamp()
  });

  alert("Producto creado");
};

/* =========================
   SELECTS
========================= */

async function cargarSelectCategorias() {
  const sub = document.getElementById("sub-categoria");
  const prod = document.getElementById("prod-categoria");

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

/* =========================
   INIT
========================= */

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

