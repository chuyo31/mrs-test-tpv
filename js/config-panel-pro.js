import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const storage = getStorage();

/* ==========================================
   1. VARIABLES Y CARGA DE CATÁLOGO
   ========================================== */
let categoriasLocal = [];
let productosLocal = []; // Para manejar la edición de productos

async function cargarListasCatalogo() {
    const listaCatUI = document.getElementById("lista-categorias-config");
    const selectCatUI = document.getElementById("prod-cat-select");
    const tablaBody = document.getElementById("tabla-productos-body");

    if (!listaCatUI || !selectCatUI) return;

    listaCatUI.innerHTML = "<li>Cargando...</li>";
    selectCatUI.innerHTML = '<option value="">Selecciona Familia...</option>';

    try {
        // Cargar Categorías (categories)
        const catSnap = await getDocs(collection(db, "categories")); 
        categoriasLocal = [];
        listaCatUI.innerHTML = "";

        catSnap.forEach((docSnap) => {
            const cat = { id: docSnap.id, ...docSnap.data() };
            categoriasLocal.push(cat);

            const li = document.createElement("li");
            li.style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; background: #eee; padding: 8px; border-radius: 5px; cursor: pointer; color: #333;";
            li.innerHTML = `
                <div onclick="prepararEdicionCategoria('${cat.id}')" style="flex-grow: 1;">
                    <strong>${cat.nombre || 'Sin nombre'}</strong> <br>
                    <small style="color: #666;">${cat.tipoFiscal || 'IVA'}</small>
                </div>
                <button class="outline error" onclick="eliminarCategoria('${cat.id}')" style="padding: 2px 8px; margin: 0; font-size: 0.7rem; width: auto; height: auto;">X</button>
            `;
            listaCatUI.appendChild(li);

            const option = document.createElement("option");
            option.value = cat.id;
            option.textContent = cat.nombre || 'Sin nombre';
            selectCatUI.appendChild(option);
        });

        // Cargar Productos (products)
        if (tablaBody) {
            const prodSnap = await getDocs(collection(db, "products")); 
            productosLocal = [];
            tablaBody.innerHTML = "";
            
            prodSnap.forEach((docSnap) => {
                const p = { id: docSnap.id, ...docSnap.data() };
                productosLocal.push(p);
                
                const familia = categoriasLocal.find(c => c.id === p.categoria_id);
                const nombreFamilia = familia ? familia.nombre : "General";
                
                const tr = document.createElement("tr");
                tr.style = "cursor: pointer;";
                tr.innerHTML = `
                    <td onclick="prepararEdicionProducto('${p.id}')"><strong>${p.nombre || 'S/N'}</strong></td>
                    <td onclick="prepararEdicionProducto('${p.id}')">${p.pvp || 0}€</td>
                    <td onclick="prepararEdicionProducto('${p.id}')"><small>${nombreFamilia}</small></td>
                    <td><button class="outline error" onclick="eliminarProducto('${p.id}')" style="padding: 4px; margin:0; width:auto;">🗑️</button></td>
                `;
                tablaBody.appendChild(tr);
            });
        }
    } catch (error) { console.error("Error:", error); }
}

/* ==========================================
   2. FUNCIONES DE CATEGORÍAS
   ========================================== */
window.limpiarFormCat = function() {
    document.getElementById("cat-id-edit").value = "";
    document.getElementById("cat-nombre").value = "";
    document.getElementById("cat-img").value = "";
    document.getElementById("btn-cat-guardar").innerText = "Crear / Guardar Familia";
    document.getElementById("btn-cat-cancelar").style.display = "none";
};

window.prepararEdicionCategoria = function(id) {
    const cat = categoriasLocal.find(c => c.id === id);
    if (!cat) return;
    document.getElementById("cat-id-edit").value = cat.id;
    document.getElementById("cat-nombre").value = cat.nombre;
    document.getElementById("cat-fiscal").value = cat.tipoFiscal || "IVA";
    document.getElementById("btn-cat-guardar").innerText = "💾 Actualizar Familia";
    document.getElementById("btn-cat-cancelar").style.display = "block";
};

window.crearCategoria = async function() {
    const id = document.getElementById("cat-id-edit").value;
    const nombre = document.getElementById("cat-nombre").value.trim();
    const tipoFiscal = "IVA";
    const fileInput = document.getElementById("cat-img");

    if (!nombre) return alert("Nombre obligatorio");

    try {
        let imgUrl = "";
        if (fileInput.files.length > 0) {
            const storageRef = ref(storage, `categorias/${Date.now()}_${fileInput.files[0].name}`);
            await uploadBytes(storageRef, fileInput.files[0]);
            imgUrl = await getDownloadURL(storageRef);
        }

        const data = { nombre, tipoFiscal };
        if (imgUrl) data.imagen_url = imgUrl;

        if (id) {
            await setDoc(doc(db, "categories", id), data, { merge: true });
        } else {
            await addDoc(collection(db, "categories"), data);
        }

        limpiarFormCat();
        cargarListasCatalogo();
    } catch (e) { alert("Error al guardar categoría"); }
};

window.eliminarCategoria = async function(id) {
    if (confirm("¿Seguro que quieres eliminar esta familia?")) {
        await deleteDoc(doc(db, "categories", id));
        cargarListasCatalogo(); 
    }
};

/* ==========================================
   3. FUNCIONES DE PRODUCTOS (EDICIÓN AÑADIDA)
   ========================================== */

// Nueva función para preparar edición de producto
window.prepararEdicionProducto = function(id) {
    const p = productosLocal.find(prod => prod.id === id);
    if (!p) return;

    // Usamos un atributo de datos en el botón o un input oculto si lo tienes. 
    // Como no tenemos input oculto de producto en tu HTML, lo guardaremos en una variable global temporal o en el dataset del botón.
    const btn = document.querySelector("button[onclick='guardarProducto()']");
    btn.dataset.editId = p.id;
    btn.innerText = "💾 Actualizar Producto";

    document.getElementById("prod-nombre").value = p.nombre || "";
    document.getElementById("prod-venta").value = p.pvp || "";
    document.getElementById("prod-cat-select").value = p.categoria_id || "";
    
    // Desplazar al formulario para que el usuario vea que está editando
    document.getElementById("prod-nombre").focus();
};

window.eliminarProducto = async function(id) {
    if (confirm("¿Seguro que quieres eliminar este producto?")) {
        await deleteDoc(doc(db, "products", id));
        cargarListasCatalogo();
    }
};

window.guardarProducto = async function() {
    const btn = event.currentTarget;
    const editId = btn.dataset.editId; // Verificamos si estamos editando

    const nombre = document.getElementById("prod-nombre").value.trim();
    const pvp = parseFloat(document.getElementById("prod-venta").value);
    const catId = document.getElementById("prod-cat-select").value;
    const fileInput = document.getElementById("prod-img");

    if (!nombre || isNaN(pvp) || !catId) return alert("Faltan datos");

    const familia = categoriasLocal.find(c => c.id === catId);
    const divisor = 1.21;
    const base = pvp / divisor;

    try {
        let imgUrl = "";
        if (fileInput.files.length > 0) {
            const storageRef = ref(storage, `products/${Date.now()}_${fileInput.files[0].name}`);
            await uploadBytes(storageRef, fileInput.files[0]);
            imgUrl = await getDownloadURL(storageRef);
        }

        const data = {
            nombre, pvp, categoria_id: catId,
            base_imponible: Number(base.toFixed(4)),
            cuota_iva: Number((base * 0.21).toFixed(4)),
            updated_at: new Date()
        };

        if (imgUrl) data.imagen_url = imgUrl;

        if (editId) {
            await setDoc(doc(db, "products", editId), data, { merge: true });
            delete btn.dataset.editId;
            btn.innerText = "✨ Guardar Producto";
            alert("✅ Producto actualizado");
        } else {
            data.fecha = new Date();
            await addDoc(collection(db, "products"), data);
            alert("✅ Producto creado");
        }

        // Limpiar formulario
        document.getElementById("prod-nombre").value = "";
        document.getElementById("prod-venta").value = "";
        document.getElementById("prod-img").value = "";
        
        cargarListasCatalogo();
    } catch (e) { alert("Error al guardar producto"); }
};

/* =========================
   4. CONFIGURACIÓN GENERAL EMPRESA
========================= */
async function cargarPanelPro() {
  const snap = await getDoc(doc(db, "settings", "panel_pro"));
  if (!snap.exists()) return;
  const d = snap.data();

  document.getElementById("nombre").value = d.nombre || "";
  document.getElementById("razon").value = d.razon || "";
  document.getElementById("cif").value = d.cif || "";
  document.getElementById("direccion").value = d.direccion || "";
  document.getElementById("telefono").value = d.telefono || "";
  document.getElementById("email").value = d.email || "";
  document.getElementById("pie").value = d.pie || "";
  document.getElementById("doc-logo").checked = d.doc_logo ?? true;
  document.getElementById("doc-direccion").checked = d.doc_direccion ?? true;
  document.getElementById("doc-telefono").checked = d.doc_telefono ?? true;
  document.getElementById("doc-email").checked = d.doc_email ?? false;
  if(document.getElementById("doc-web")) document.getElementById("doc-web").checked = d.doc_web ?? false;
  document.getElementById("doc-pago").checked = d.doc_pago ?? true;
  document.getElementById("nav-mostrar-logo").checked = d.nav_mostrar_logo ?? false;
  document.getElementById("tema").value = d.tema || "claro";
  document.getElementById("color").value = d.color_corporativo || "#3b82f6";
  
  if (d.color_corporativo) document.documentElement.style.setProperty('--accent', d.color_corporativo);
  if (typeof window.cambiarModo === "function") window.cambiarModo(d.tema || "claro");
  if (d.logo_url) {
    const img = document.getElementById("logo-preview");
    img.src = d.logo_url;
    img.style.display = "block";
  }
}

window.guardarPanelPro = async function () {
  const btn = event.currentTarget;
  btn.innerText = "⌛ Guardando...";
  btn.disabled = true;
  const fileInput = document.getElementById("logo");
  let logoUrl = null;
  try {
    if (fileInput.files.length > 0) {
      const storageRef = ref(storage, "empresa/logo.png");
      await uploadBytes(storageRef, fileInput.files[0]);
      logoUrl = await getDownloadURL(storageRef);
    }
    const data = {
      nombre: document.getElementById("nombre").value.trim(),
      razon: document.getElementById("razon").value.trim(),
      cif: document.getElementById("cif").value.trim(),
      direccion: document.getElementById("direccion").value.trim(),
      telefono: document.getElementById("telefono").value.trim(),
      email: document.getElementById("email").value.trim(),
      pie: document.getElementById("pie").value.trim(),
      doc_logo: document.getElementById("doc-logo").checked,
      doc_direccion: document.getElementById("doc-direccion").checked,
      doc_telefono: document.getElementById("doc-telefono").checked,
      doc_email: document.getElementById("doc-email").checked,
      doc_pago: document.getElementById("doc-pago").checked,
      nav_mostrar_logo: document.getElementById("nav-mostrar-logo").checked,
      tema: document.getElementById("tema").value,
      color_corporativo: document.getElementById("color").value,
      updated_at: new Date()
    };
    if (logoUrl) data.logo_url = logoUrl;
    await setDoc(doc(db, "settings", "panel_pro"), data, { merge: true });
    alert("✅ Configuración guardada.");
    location.reload();
  } catch (error) { alert("❌ Error."); }
};

document.addEventListener("DOMContentLoaded", () => {
    cargarPanelPro();
    cargarListasCatalogo();
});
