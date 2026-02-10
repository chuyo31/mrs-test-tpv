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
let productosLocal = [];

// NUEVO: Definición de Temas Preestablecidos
const TEMAS_MAESTROS = {
    "modern-blue": { primary: "#3b82f6", card: "#ffffff", text: "#11191f", mode: "light" },
    "dark-emerald": { primary: "#10b981", card: "#1e293b", text: "#ffffff", mode: "dark" },
    "royal-purple": { primary: "#8b5cf6", card: "#2d1b4e", text: "#ffffff", mode: "dark" },
    "minimal-gray": { primary: "#4b5563", card: "#ffffff", text: "#11191f", mode: "light" }
};

async function cargarListasCatalogo() {
    const listaCatUI = document.getElementById("lista-categorias-config");
    const selectCatUI = document.getElementById("prod-cat-select");
    const tablaBody = document.getElementById("tabla-productos-body");

    if (!listaCatUI || !selectCatUI) return;

    listaCatUI.innerHTML = "<li>Cargando...</li>";
    selectCatUI.innerHTML = '<option value="">Selecciona Familia...</option>';

    try {
        const catSnap = await getDocs(collection(db, "categories"));
        categoriasLocal = [];
        listaCatUI.innerHTML = "";

        catSnap.forEach((docSnap) => {
            const cat = { id: docSnap.id, ...docSnap.data() };
            categoriasLocal.push(cat);

            const li = document.createElement("li");
            li.style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; background: var(--secondary-focus); padding: 8px; border-radius: 5px; cursor: pointer;";
            li.innerHTML = `
                <div onclick="prepararEdicionCategoria('${cat.id}')" style="flex-grow: 1;">
                    <strong>${cat.nombre || 'Sin nombre'}</strong> <br>
                    <small style="opacity: 0.7;">${cat.tipoFiscal || 'IVA'}</small>
                </div>
                <button class="outline error" onclick="eliminarCategoria('${cat.id}')" style="padding: 2px 8px; margin: 0; width: auto;">X</button>
            `;
            listaCatUI.appendChild(li);

            const option = document.createElement("option");
            option.value = cat.id;
            option.textContent = cat.nombre || 'Sin nombre';
            selectCatUI.appendChild(option);
        });

        const prodSnap = await getDocs(collection(db, "products"));
        productosLocal = [];
        if (tablaBody) {
            tablaBody.innerHTML = "";
            prodSnap.forEach((docSnap) => {
                const p = { id: docSnap.id, ...docSnap.data() };
                productosLocal.push(p);
                const familia = categoriasLocal.find(c => c.id === p.categoria_id);
                const nombreFamilia = familia ? familia.nombre : "General";
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td onclick="prepararEdicionProducto('${p.id}')"><strong>${p.nombre || 'S/N'}</strong></td>
                    <td onclick="prepararEdicionProducto('${p.id}')">${p.pvp || 0}€</td>
                    <td onclick="prepararEdicionProducto('${p.id}')"><small>${nombreFamilia}</small></td>
                    <td><button class="outline error" onclick="eliminarProducto('${p.id}')" style="padding: 4px; margin:0; width:auto;">🗑️</button></td>
                `;
                tablaBody.appendChild(tr);
            });
        }
    } catch (error) { console.error("Error catálogo:", error); }
}

/* ==========================================
   2. FUNCIONES DE CATEGORÍAS (Tu original)
   ========================================== */
window.limpiarFormCat = function() {
    document.getElementById("cat-id-edit").value = "";
    document.getElementById("cat-nombre").value = "";
    document.getElementById("btn-cat-guardar").innerText = "Guardar Familia";
};

window.prepararEdicionCategoria = function(id) {
    const cat = categoriasLocal.find(c => c.id === id);
    if (!cat) return;
    document.getElementById("cat-id-edit").value = cat.id;
    document.getElementById("cat-nombre").value = cat.nombre;
    document.getElementById("cat-fiscal").value = cat.tipoFiscal;
    document.getElementById("btn-cat-guardar").innerText = "💾 Actualizar Familia";
};

window.crearCategoria = async function() {
    const id = document.getElementById("cat-id-edit").value;
    const nombre = document.getElementById("cat-nombre").value.trim();
    const tipoFiscal = document.getElementById("cat-fiscal").value;
    if (!nombre) return alert("Nombre obligatorio");
    try {
        const data = { nombre, tipoFiscal };
        if (id) { await setDoc(doc(db, "categories", id), data, { merge: true }); }
        else { await addDoc(collection(db, "categories"), data); }
        window.limpiarFormCat();
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
   3. FUNCIONES DE PRODUCTOS (Tu original)
   ========================================== */
window.prepararEdicionProducto = function(id) {
    const p = productosLocal.find(prod => prod.id === id);
    if (!p) return;
    const btn = document.querySelector("button[onclick='guardarProducto()']");
    btn.dataset.editId = p.id;
    btn.innerText = "💾 Actualizar Producto";
    document.getElementById("prod-nombre").value = p.nombre || "";
    document.getElementById("prod-venta").value = p.pvp || "";
    document.getElementById("prod-cat-select").value = p.categoria_id || "";
    document.getElementById("prod-nombre").focus();
};

window.eliminarProducto = async function(id) {
    if (confirm("¿Seguro que quieres eliminar este producto?")) {
        await deleteDoc(doc(db, "products", id));
        cargarListasCatalogo();
    }
};

window.guardarProducto = async function() {
    const btn = document.querySelector("button[onclick='guardarProducto()']");
    const editId = btn.dataset.editId;
    const nombre = document.getElementById("prod-nombre").value.trim();
    const pvp = parseFloat(document.getElementById("prod-venta").value);
    const catId = document.getElementById("prod-cat-select").value;
    const fileInput = document.getElementById("prod-img");

    if (!nombre || isNaN(pvp) || !catId) return alert("Faltan datos");

    const familia = categoriasLocal.find(c => c.id === catId);
    const tieneRE = familia?.tipoFiscal === "IVA_RE";
    const divisor = tieneRE ? 1.262 : 1.21;
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
            cuota_re: tieneRE ? Number((base * 0.052).toFixed(4)) : 0,
            updated_at: new Date()
        };
        if (imgUrl) data.imagen_url = imgUrl;
        if (editId) {
            await setDoc(doc(db, "products", editId), data, { merge: true });
            delete btn.dataset.editId;
            btn.innerText = "✨ Guardar Producto";
        } else {
            data.fecha = new Date();
            await addDoc(collection(db, "products"), data);
        }
        document.getElementById("prod-nombre").value = "";
        document.getElementById("prod-venta").value = "";
        cargarListasCatalogo();
    } catch (e) { alert("Error al guardar producto"); }
};

/* ==========================================
   4. CONFIGURACIÓN INTERFAZ (NUEVAS FUNCIONES)
   ========================================== */

// NUEVO: Función para previsualizar colores en vivo
window.previewColor = function(variable, color) {
    document.documentElement.style.setProperty(variable, color);
};

// NUEVO: Lógica de Temas Preestablecidos
window.aplicarTemaPreestablecido = function(temaId) {
    const config = TEMAS_MAESTROS[temaId];
    if (!config) return;

    // Aplicar a nivel DOM
    document.documentElement.setAttribute('data-theme', config.mode);
    document.documentElement.style.setProperty('--primary', config.primary);
    document.documentElement.style.setProperty('--card-background-color', config.card);
    document.documentElement.style.setProperty('--color', config.text);

    // Sincronizar los inputs del panel
    if(document.getElementById("color")) document.getElementById("color").value = config.primary;
    if(document.getElementById("color-cajas")) document.getElementById("color-cajas").value = config.card;
    if(document.getElementById("color-texto")) document.getElementById("color-texto").value = config.text;
    if(document.getElementById("tema-select")) document.getElementById("tema-select").value = config.mode;
};

// NUEVO: Cálculo de contraste automático
window.actualizarCajaYContraste = function(colorHex) {
    document.documentElement.style.setProperty('--card-background-color', colorHex);
    
    // Fórmula de luminancia YIQ para decidir color de texto
    const r = parseInt(colorHex.substr(1, 2), 16);
    const g = parseInt(colorHex.substr(3, 2), 16);
    const b = parseInt(colorHex.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    
    const colorSugerido = (yiq >= 128) ? '#11191f' : '#ffffff';
    document.documentElement.style.setProperty('--color', colorSugerido);
    
    if(document.getElementById("color-texto")) {
        document.getElementById("color-texto").value = colorSugerido;
    }
};

// NUEVO: Resetear a fábrica
window.restablecerInterfaz = function() {
    if(confirm("¿Quieres restablecer los colores de fábrica?")) {
        window.aplicarTemaPreestablecido('modern-blue');
    }
};

/* ==========================================
   5. CARGA Y GUARDADO GLOBAL (ACTUALIZADO)
   ========================================== */
async function cargarPanelPro() {
    try {
        const snap = await getDoc(doc(db, "settings", "panel_pro"));
        if (!snap.exists()) return;
        const d = snap.data();

        // Empresa e Impresión
        const campos = ["nombre", "razon", "cif", "direccion", "telefono", "email", "pie"];
        campos.forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = d[id] || ""; });

        const checks = {
            "doc-logo": "doc_logo",
            "doc-direccion": "doc_direccion",
            "doc-telefono": "doc_telefono",
            "doc-email": "doc_email",
            "doc-pago": "doc_pago",
            "nav-mostrar-logo": "nav_mostrar_logo"
        };
        Object.entries(checks).forEach(([id, val]) => { if(document.getElementById(id)) document.getElementById(id).checked = d[val] ?? true; });

        // TEMA E INTERFAZ (ACTUALIZADO)
        if(document.getElementById("tema-select")) document.getElementById("tema-select").value = d.tema || "light";
        if(document.getElementById("color")) document.getElementById("color").value = d.color_corporativo || "#3b82f6";
        if(document.getElementById("color-cajas")) document.getElementById("color-cajas").value = d.color_cajas || "#ffffff";
        if(document.getElementById("color-texto")) document.getElementById("color-texto").value = d.color_texto || "#11191f";

        // Aplicar visualmente al cargar (Regla de Oro)
        document.documentElement.setAttribute('data-theme', d.tema || "light");
        document.documentElement.style.setProperty('--primary', d.color_corporativo || "#3b82f6");
        document.documentElement.style.setProperty('--card-background-color', d.color_cajas || "#ffffff");
        document.documentElement.style.setProperty('--color', d.color_texto || "#11191f");

        // Guardar en LocalStorage para otras páginas
        localStorage.setItem('theme', d.tema || "light");
        localStorage.setItem('accent-color', d.color_corporativo || "#3b82f6");
        localStorage.setItem('card-color', d.color_cajas || "#ffffff");
        localStorage.setItem('text-color', d.color_texto || "#11191f");

        if (d.logo_url) {
            const img = document.getElementById("logo-preview");
            if(img) { img.src = d.logo_url; img.style.display = "block"; }
        }
    } catch (e) { console.error("Error cargando panel:", e); }
}

window.guardarPanelPro = async function () {
    const btn = document.querySelector("button[onclick='guardarPanelPro()']");
    if(btn) { btn.innerText = "⌛ Guardando..."; btn.disabled = true; }

    const fileInput = document.getElementById("logo");
    let logoUrl = null;

    try {
        if (fileInput && fileInput.files.length > 0) {
            const storageRef = ref(storage, "empresa/logo.png");
            await uploadBytes(storageRef, fileInput.files[0]);
            logoUrl = await getDownloadURL(storageRef);
        }

        const data = {
            nombre: document.getElementById("nombre")?.value || "",
            razon: document.getElementById("razon")?.value || "",
            cif: document.getElementById("cif")?.value || "",
            direccion: document.getElementById("direccion")?.value || "",
            telefono: document.getElementById("telefono")?.value || "",
            email: document.getElementById("email")?.value || "",
            pie: document.getElementById("pie")?.value || "",
            doc_logo: document.getElementById("doc-logo")?.checked ?? true,
            doc_direccion: document.getElementById("doc-direccion")?.checked ?? true,
            doc_telefono: document.getElementById("doc-telefono")?.checked ?? true,
            doc_email: document.getElementById("doc-email")?.checked ?? false,
            doc_pago: document.getElementById("doc-pago")?.checked ?? true,
            nav_mostrar_logo: document.getElementById("nav-mostrar-logo")?.checked ?? false,
            tema: document.getElementById("tema-select")?.value || "light",
            color_corporativo: document.getElementById("color")?.value || "#3b82f6",
            // NUEVO: Guardar colores de interfaz
            color_cajas: document.getElementById("color-cajas")?.value || "#ffffff",
            color_texto: document.getElementById("color-texto")?.value || "#11191f",
            updated_at: new Date()
        };

        if (logoUrl) data.logo_url = logoUrl;

        await setDoc(doc(db, "settings", "panel_pro"), data, { merge: true });
        
        // Sincronizar LocalStorage inmediatamente
        localStorage.setItem('theme', data.tema);
        localStorage.setItem('accent-color', data.color_corporativo);
        localStorage.setItem('card-color', data.color_cajas);
        localStorage.setItem('text-color', data.color_texto);

        alert("✅ Configuración guardada correctamente.");
        location.reload();
    } catch (error) {
        console.error("Error guardando:", error);
        alert("Error al guardar.");
        if(btn) { btn.innerText = "💾 Guardar Cambios"; btn.disabled = false; }
    }
};

/* ==========================================
   6. INICIALIZACIÓN
   ========================================== */
document.addEventListener("DOMContentLoaded", () => {
    cargarPanelPro();
    cargarListasCatalogo();

    // NUEVO: Listener para previsualizar el logo en el Navbar en tiempo real
    const checkNavLogo = document.getElementById("nav-mostrar-logo");
    if (checkNavLogo) {
        checkNavLogo.addEventListener('change', (e) => {
            // Buscamos el contenedor del branding en el Navbar (usualmente el penúltimo li según tu estructura)
            const brandingLi = document.querySelector('#navbar-app ul:last-child li:nth-last-child(2)');
            if (!brandingLi) return;

            const logoPreview = document.getElementById("logo-preview");
            const nombreEmpresa = document.getElementById("nombre").value || "MRS TPV";

            if (e.target.checked && logoPreview && logoPreview.src && logoPreview.style.display !== "none") {
                brandingLi.innerHTML = `<img src="${logoPreview.src}" alt="Logo" style="height: 35px; width: auto; vertical-align: middle; border-radius: 4px;">`;
            } else {
                brandingLi.innerHTML = `<strong style="font-size: 1.1rem; color: var(--primary);">${nombreEmpresa}</strong>`;
            }
        });
    }

    // NUEVO: Sincronizar nombre en Navbar mientras se escribe
    const inputNombre = document.getElementById("nombre");
    if (inputNombre) {
        inputNombre.addEventListener('input', (e) => {
            const check = document.getElementById("nav-mostrar-logo");
            if (check && !check.checked) {
                const brandingLi = document.querySelector('#navbar-app ul:last-child li:nth-last-child(2)');
                if (brandingLi) brandingLi.innerHTML = `<strong style="font-size: 1.1rem; color: var(--primary);">${e.target.value || 'MRS TPV'}</strong>`;
            }
        });
    }
});