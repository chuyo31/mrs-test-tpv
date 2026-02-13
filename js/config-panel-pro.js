import { db, storage } from "./firebase.js";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    getDocs,
    addDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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

            const imgTag = cat.imagen_url 
                ? `<img src="${cat.imagen_url}" class="product-img-small" style="margin-right:12px; width:40px; height:40px;">`
                : `<div class="product-img-small" style="margin-right:12px; width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:var(--muted-border-color); opacity:0.3;"><i data-lucide="layers" style="width:18px;"></i></div>`;

            const li = document.createElement("li");
            li.className = "modern-list-item";
            li.style.marginBottom = "0"; 
            li.innerHTML = `
                <div onclick="prepararEdicionCategoria('${cat.id}')" style="display:flex; align-items:center; flex-grow: 1; cursor: pointer;">
                    ${imgTag}
                    <div>
                        <div style="font-weight: 700; font-size: 0.95rem;">${cat.nombre || 'Sin nombre'}</div>
                    </div>
                </div>
                <div class="actions-cell">
                    <button class="btn-icon-modern delete" onclick="eliminarCategoria('${cat.id}')">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
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
            let totalUnidades = 0;
            let productosAPedir = 0;
            prodSnap.forEach((docSnap) => {
                const p = { id: docSnap.id, ...docSnap.data() };
                productosLocal.push(p);
                const familia = categoriasLocal.find(c => c.id === p.categoria_id);
                const nombreFamilia = familia ? familia.nombre : "General";
                const stock = Number(p.stock || 0);
                const min = Number(p.min_stock || 0);
                const pedir = Math.max(0, min - stock);
                totalUnidades += stock;
                if (stock < min) productosAPedir++;
                
                const imgTag = p.imagen_url 
                    ? `<img src="${p.imagen_url}" class="product-img-small">`
                    : `<div class="product-img-small" style="display:flex; align-items:center; justify-content:center; background:var(--muted-border-color); opacity:0.3;"><i data-lucide="package" style="width:20px;"></i></div>`;

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${imgTag}</td>
                    <td>
                        <div style="font-weight: 700;">${p.nombre || 'S/N'}</div>
                        <small style="opacity:0.6;">ID: ${p.id.substring(0,6)}</small>
                    </td>
                    <td><span class="badge-fiscal">${nombreFamilia}</span></td>
                    <td style="text-align: right; font-weight: 800; font-family: monospace;">${p.pvp.toFixed(2)}€</td>
                    <td style="text-align: right; font-family: monospace; ${stock < min ? 'color: var(--primary); font-weight: 700;' : ''}">${stock}</td>
                    <td style="text-align: right; font-family: monospace;">${min}</td>
                    <td style="text-align: right; font-family: monospace; ${pedir > 0 ? 'color: var(--primary); font-weight: 700;' : ''}">${pedir}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="btn-icon-modern" title="Editar" onclick="prepararEdicionProducto('${p.id}')">
                                <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                            </button>
                            <button class="btn-icon-modern" title="Entrada" onclick="ajustarStockEntrada('${p.id}')">
                                <i data-lucide="arrow-down-circle" style="width: 14px; height: 14px;"></i>
                            </button>
                            <button class="btn-icon-modern" title="Salida" onclick="ajustarStockSalida('${p.id}')">
                                <i data-lucide="arrow-up-circle" style="width: 14px; height: 14px;"></i>
                            </button>
                            <button class="btn-icon-modern delete" title="Eliminar" onclick="eliminarProducto('${p.id}')">
                                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                            </button>
                        </div>
                    </td>
                `;
                tablaBody.appendChild(tr);
            });
            const totalProdEl = document.getElementById("inv-total-prod");
            const totalUnidEl = document.getElementById("inv-total-unid");
            const aPedirEl = document.getElementById("inv-a-pedir");
            if (totalProdEl) totalProdEl.textContent = String(productosLocal.length);
            if (totalUnidEl) totalUnidEl.textContent = String(totalUnidades);
            if (aPedirEl) aPedirEl.textContent = String(productosAPedir);
        }
        if(window.lucide) window.lucide.createIcons();
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
    document.getElementById("btn-cat-guardar").innerText = "💾 Actualizar Familia";
};

window.crearCategoria = async function() {
    const id = document.getElementById("cat-id-edit").value;
    const nombre = document.getElementById("cat-nombre").value.trim();
    const fileInput = document.getElementById("cat-img");

    if (!nombre) return alert("Nombre obligatorio");

    try {
        let imgUrl = null;
        if (fileInput && fileInput.files.length > 0) {
            const storageRef = ref(storage, `categories/${Date.now()}_${fileInput.files[0].name}`);
            await uploadBytes(storageRef, fileInput.files[0]);
            imgUrl = await getDownloadURL(storageRef);
        }

        const data = { nombre };
        if (imgUrl) data.imagen_url = imgUrl;

        if (id) {
            await setDoc(doc(db, "categories", id), data, { merge: true });
        } else {
            await addDoc(collection(db, "categories"), data);
        }

        window.limpiarFormCat();
        if (fileInput) fileInput.value = "";

        const btn = document.getElementById("btn-cat-guardar");
        if (btn) {
            btn.innerHTML = `<i data-lucide="plus-circle"></i> Guardar Familia`;
            if(window.lucide) window.lucide.createIcons();
        }

        cargarListasCatalogo();
    } catch (e) {
        console.error("Error al guardar familia:", e);
        alert("Error al guardar familia");
    }
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
    btn.innerHTML = `<i data-lucide="refresh-cw"></i>`;
    if(window.lucide) window.lucide.createIcons();
    
    document.getElementById("prod-nombre").value = p.nombre || "";
    document.getElementById("prod-venta").value = p.pvp || "";
    document.getElementById("prod-cat-select").value = p.categoria_id || "";
    if (document.getElementById("prod-stock")) document.getElementById("prod-stock").value = Number(p.stock || 0);
    if (document.getElementById("prod-min-stock")) document.getElementById("prod-min-stock").value = Number(p.min_stock || 0);
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
    const stockVal = parseInt(document.getElementById("prod-stock")?.value || "0", 10);
    const minVal = parseInt(document.getElementById("prod-min-stock")?.value || "0", 10);

    if (!nombre || isNaN(pvp) || !catId) return alert("Faltan datos");

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
            stock: Number.isFinite(stockVal) ? Math.max(0, stockVal) : 0,
            min_stock: Number.isFinite(minVal) ? Math.max(0, minVal) : 0,
            // Sin RE
            updated_at: new Date()
        };
        if (imgUrl) data.imagen_url = imgUrl;
        if (editId) {
            await setDoc(doc(db, "products", editId), data, { merge: true });
            delete btn.dataset.editId;
            btn.innerHTML = `<i data-lucide="save"></i>`;
            if(window.lucide) window.lucide.createIcons();
        } else {
            data.fecha = new Date();
            await addDoc(collection(db, "products"), data);
        }
        document.getElementById("prod-nombre").value = "";
        document.getElementById("prod-venta").value = "";
        if (document.getElementById("prod-stock")) document.getElementById("prod-stock").value = "";
        if (document.getElementById("prod-min-stock")) document.getElementById("prod-min-stock").value = "";
        cargarListasCatalogo();
    } catch (e) { alert("Error al guardar producto"); }
};

// NUEVO: Ajustes de stock (Entrada/Salida)
window.ajustarStockEntrada = async function(id) {
    const qty = parseInt(prompt("Cantidad de entrada (unid):") || "0", 10);
    if (!Number.isFinite(qty) || qty <= 0) return;
    const ref = doc(db, "products", id);
    const snap = await getDoc(ref);
    const cur = Number(snap.data()?.stock || 0);
    const next = cur + qty;
    await setDoc(ref, { stock: next, updated_at: new Date() }, { merge: true });
    cargarListasCatalogo();
};

window.ajustarStockSalida = async function(id) {
    const qty = parseInt(prompt("Cantidad de salida (unid):") || "0", 10);
    if (!Number.isFinite(qty) || qty <= 0) return;
    const ref = doc(db, "products", id);
    const snap = await getDoc(ref);
    const cur = Number(snap.data()?.stock || 0);
    const next = Math.max(0, cur - qty);
    await setDoc(ref, { stock: next, updated_at: new Date() }, { merge: true });
    cargarListasCatalogo();
};

/* ==========================================
   4. CONFIGURACIÓN INTERFAZ (NUEVAS FUNCIONES)
   ========================================== */

// NUEVO: Función para previsualizar colores en vivo
window.previewColor = function(variable, color) {
    document.documentElement.style.setProperty(variable, color);
    
    // Actualizar el texto del input hexadecimal
    if (variable === '--primary' && document.getElementById("color-hex")) {
        document.getElementById("color-hex").value = color.toUpperCase();
    }
    if (variable === '--color' && document.getElementById("color-texto-hex")) {
        document.getElementById("color-texto-hex").value = color.toUpperCase();
    }
    
    // Si cambiamos el primary, recalculamos su inverso
    if (variable === '--primary') {
        const r = parseInt(color.substr(1, 2), 16);
        const g = parseInt(color.substr(3, 2), 16);
        const b = parseInt(color.substr(5, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        document.documentElement.style.setProperty('--primary-inverse', (yiq >= 128) ? '#11191f' : '#ffffff');
    }
};

// NUEVO: Temas preestablecidos actualizados
window.aplicarTemaPreestablecido = function(tema) {
    const themes = {
        "modern-blue": { 
            primary: "#3b82f6", 
            card: "#ffffff", 
            text: "#11191f", 
            theme: "light",
            bg: "#f4f7f9"
        },
        "dark-emerald": { 
            primary: "#10b981", 
            card: "#1a2e28", 
            text: "#ffffff", 
            theme: "dark",
            bg: "#060f0c"
        },
        "royal-purple": { 
            primary: "#8b5cf6", 
            card: "#211b2e", 
            text: "#ffffff", 
            theme: "dark",
            bg: "#0f0c14"
        },
        "minimal-gray": { 
            primary: "#6366f1", 
            card: "#ffffff", 
            text: "#11191f", 
            theme: "light",
            bg: "#f4f7f9"
        },
        "oled-dark": { 
            primary: "#ffffff", 
            card: "#000000", 
            text: "#ffffff", 
            theme: "dark",
            bg: "#000000"
        }
    };
    const t = themes[tema];
    if (t) {
        document.documentElement.setAttribute('data-theme', t.theme);
        document.documentElement.style.setProperty('--primary', t.primary);
        document.documentElement.style.setProperty('--card-background-color', t.card);
        document.documentElement.style.setProperty('--color', t.text);
        if(t.bg) document.documentElement.style.setProperty('--background-color', t.bg);
        
        // Recalcular inversos
        const r = parseInt(t.primary.substr(1, 2), 16);
        const g = parseInt(t.primary.substr(3, 2), 16);
        const b = parseInt(t.primary.substr(5, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        document.documentElement.style.setProperty('--primary-inverse', (yiq >= 128) ? '#11191f' : '#ffffff');

        // Actualizar inputs del panel
        if(document.getElementById("color")) document.getElementById("color").value = t.primary;
        if(document.getElementById("color-hex")) document.getElementById("color-hex").value = t.primary.toUpperCase();
        if(document.getElementById("color-cajas")) document.getElementById("color-cajas").value = t.card;
        if(document.getElementById("color-cajas-hex")) document.getElementById("color-cajas-hex").value = t.card.toUpperCase();
        if(document.getElementById("tema-select")) document.getElementById("tema-select").value = t.theme;
        
        // Efecto visual en las cards de previsualización
        document.querySelectorAll('.theme-preview-card').forEach(c => c.classList.remove('active'));
    }
};

// NUEVO: Cálculo de contraste automático
window.actualizarCajaYContraste = function(colorHex) {
    document.documentElement.style.setProperty('--card-background-color', colorHex);
    if (document.getElementById("color-cajas-hex")) {
        document.getElementById("color-cajas-hex").value = colorHex.toUpperCase();
    }
    
    // Fórmula de luminancia YIQ para decidir color de texto
    const r = parseInt(colorHex.substr(1, 2), 16);
    const g = parseInt(colorHex.substr(3, 2), 16);
    const b = parseInt(colorHex.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    
    // Si el fondo es oscuro (yiq < 128), el texto debe ser claro (#ffffff)
    // Si el fondo es claro (yiq >= 128), el texto debe ser oscuro (#11191f)
    const colorSugerido = (yiq >= 128) ? '#11191f' : '#ffffff';
    document.documentElement.style.setProperty('--color', colorSugerido);
    
    // También ajustamos el color inverso del primary para botones
    const primaryColor = document.getElementById("color")?.value || "#3b82f6";
    const pr = parseInt(primaryColor.substr(1, 2), 16);
    const pg = parseInt(primaryColor.substr(3, 2), 16);
    const pb = parseInt(primaryColor.substr(5, 2), 16);
    const pyiq = ((pr * 299) + (pg * 587) + (b * 114)) / 1000;
    document.documentElement.style.setProperty('--primary-inverse', (pyiq >= 128) ? '#11191f' : '#ffffff');
    
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
        if (document.getElementById("pie-factura")) document.getElementById("pie-factura").value = d.pie_factura || "";

        const checks = {
            "doc-logo": "doc_logo",
            "doc-direccion": "doc_direccion",
            "doc-telefono": "doc_telefono",
            "doc-email": "doc_email",
            "doc-razon": "doc_razon",
            "doc-cif": "doc_cif",
            "doc-pago": "doc_pago",
            "nav-mostrar-logo": "nav_mostrar_logo"
        };
        Object.entries(checks).forEach(([id, val]) => { if(document.getElementById(id)) document.getElementById(id).checked = d[val] ?? true; });

        // TEMA E INTERFAZ (ACTUALIZADO)
        if(document.getElementById("tema-select")) document.getElementById("tema-select").value = d.tema || "light";
        if(document.getElementById("color")) document.getElementById("color").value = d.color_corporativo || "#3b82f6";
        if(document.getElementById("color-hex")) document.getElementById("color-hex").value = (d.color_corporativo || "#3B82F6").toUpperCase();
        if(document.getElementById("color-cajas")) document.getElementById("color-cajas").value = d.color_cajas || "#ffffff";
        if(document.getElementById("color-cajas-hex")) document.getElementById("color-cajas-hex").value = (d.color_cajas || "#FFFFFF").toUpperCase();
        if(document.getElementById("color-texto")) {
            // No hay input color-texto en el nuevo HTML pero lo mantenemos por si acaso
        }

        // Aplicar visualmente al cargar (Regla de Oro)
        document.documentElement.setAttribute('data-theme', d.tema || "light");
        document.documentElement.style.setProperty('--primary', d.color_corporativo || "#3b82f6");
        document.documentElement.style.setProperty('--card-background-color', d.color_cajas || "#ffffff");
        document.documentElement.style.setProperty('--color', d.color_texto || "#11191f");
        if(d.color_fondo) document.documentElement.style.setProperty('--background-color', d.color_fondo);

        // Guardar en LocalStorage para otras páginas
        localStorage.setItem('theme', d.tema || "light");
        localStorage.setItem('accent-color', d.color_corporativo || "#3b82f6");
        localStorage.setItem('card-color', d.color_cajas || "#ffffff");
        localStorage.setItem('text-color', d.color_texto || "#11191f");
        if(d.color_fondo) localStorage.setItem('bg-color', d.color_fondo);

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
            pie_factura: document.getElementById("pie-factura")?.value || "",
            doc_logo: document.getElementById("doc-logo")?.checked ?? true,
            doc_direccion: document.getElementById("doc-direccion")?.checked ?? true,
            doc_telefono: document.getElementById("doc-telefono")?.checked ?? true,
            doc_email: document.getElementById("doc-email")?.checked ?? false,
            doc_razon: document.getElementById("doc-razon")?.checked ?? true,
            doc_cif: document.getElementById("doc-cif")?.checked ?? true,
            doc_pago: document.getElementById("doc-pago")?.checked ?? true,
            nav_mostrar_logo: document.getElementById("nav-mostrar-logo")?.checked ?? false,
            tema: document.getElementById("tema-select")?.value || "light",
            color_corporativo: document.getElementById("color")?.value || "#3b82f6",
            color_cajas: document.getElementById("color-cajas")?.value || "#ffffff",
            color_texto: getComputedStyle(document.documentElement).getPropertyValue('--color').trim(),
            color_fondo: getComputedStyle(document.documentElement).getPropertyValue('--background-color').trim(),
            updated_at: new Date()
        };

        if (logoUrl) data.logo_url = logoUrl;

        await setDoc(doc(db, "settings", "panel_pro"), data, { merge: true });
        
        // Sincronizar LocalStorage inmediatamente
        localStorage.setItem('theme', data.tema);
        localStorage.setItem('accent-color', data.color_corporativo);
        localStorage.setItem('card-color', data.color_cajas);
        localStorage.setItem('text-color', data.color_texto);
        localStorage.setItem('bg-color', data.color_fondo);

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
