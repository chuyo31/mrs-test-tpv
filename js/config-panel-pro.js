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

// ======= DaisyUI Theme Mapping a variables de la app =======
function readMappedColors() {
    const cs = getComputedStyle(document.documentElement);
    const primary = (cs.getPropertyValue('--color-primary') || cs.getPropertyValue('--p') || '#3b82f6').trim();
    const card = (cs.getPropertyValue('--color-base-100') || cs.getPropertyValue('--b1') || '#ffffff').trim();
    const text = (cs.getPropertyValue('--color-base-content') || cs.getPropertyValue('--bc') || '#11191f').trim();
    return { primary, card, text };
}

function mapDaisyToAppVariables() {
    const { primary, card, text } = readMappedColors();
    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--card-background-color', card);
    document.documentElement.style.setProperty('--color', text);
}

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

        // Aplicar tema DaisyUI y mapear a variables de la app
        document.documentElement.setAttribute('data-theme', d.tema || "light");
        mapDaisyToAppVariables();
        // Fondo de la aplicación (color/imagen)
        const bgMode = d.bg_mode || 'color';
        const bgColor = d.bg_color || '#f4f7f9';
        const bgImage = d.bg_image_url || null;
        const bgSize = d.bg_size || 'cover';
        const bgPosition = d.bg_position || 'center';
        const bgRepeat = d.bg_repeat || 'no-repeat';
        const bgAttach = d.bg_attach || 'fixed';
        const bgOverlayColor = d.bg_overlay_color || '#000000';
        const bgOverlayOpacity = Number.isFinite(d.bg_overlay_opacity) ? d.bg_overlay_opacity : 0.2;
        const selMode = document.getElementById('bg-mode');
        const inputColor = document.getElementById('bg-color');
        const inputImage = document.getElementById('bg-image');
        const preview = document.getElementById('bg-preview');
        const selSize = document.getElementById('bg-size');
        const selPosition = document.getElementById('bg-position');
        const selRepeat = document.getElementById('bg-repeat');
        const selAttach = document.getElementById('bg-attach');
        const inputOverlayColor = document.getElementById('bg-overlay-color');
        const inputOverlayOpacity = document.getElementById('bg-overlay-opacity');
        if (selMode) selMode.value = bgMode;
        if (inputColor) inputColor.value = bgColor;
        if (selSize) selSize.value = bgSize;
        if (selPosition) selPosition.value = bgPosition;
        if (selRepeat) selRepeat.value = bgRepeat;
        if (selAttach) selAttach.value = bgAttach;
        if (inputOverlayColor) inputOverlayColor.value = bgOverlayColor;
        if (inputOverlayOpacity) inputOverlayOpacity.value = Math.round(bgOverlayOpacity * 100);
        if (preview) {
            preview.style.backgroundImage = bgMode === 'image' && bgImage ? `url(${bgImage})` : 'none';
            preview.style.backgroundColor = bgMode === 'color' ? bgColor : '';
            preview.style.backgroundSize = bgSize === 'stretch' ? '100% 100%' : bgSize;
            preview.style.backgroundPosition = bgPosition;
            preview.style.backgroundRepeat = bgRepeat;
        }
        aplicarFondo({ mode: bgMode, color: bgColor, imageUrl: bgImage, size: bgSize, position: bgPosition, repeat: bgRepeat, attach: bgAttach, overlayColor: bgOverlayColor, overlayOpacity: bgOverlayOpacity });

        // Guardar en LocalStorage para otras páginas
        localStorage.setItem('theme', d.tema || "light");
        const mappedLoad = readMappedColors();
        localStorage.setItem('accent-color', mappedLoad.primary);
        localStorage.setItem('card-color', mappedLoad.card);
        localStorage.setItem('text-color', mappedLoad.text);
        // Sidebar overlay (oscurecer)
        const sideEnable = d.side_overlay_enabled ?? true;
        const sideColor = d.side_overlay_color || '#000000';
        const sideOpacity = Number.isFinite(d.side_overlay_opacity) ? d.side_overlay_opacity : 0.06;
        const chkSide = document.getElementById('side-overlay-enable');
        const inpSideColor = document.getElementById('side-overlay-color');
        const inpSideOpacity = document.getElementById('side-overlay-opacity');
        if (chkSide) chkSide.checked = !!sideEnable;
        if (inpSideColor) inpSideColor.value = sideColor;
        if (inpSideOpacity) inpSideOpacity.value = Math.round((sideOpacity) * 100) / 100 * 100; // 0.06 => 6
        document.documentElement.style.setProperty('--side-overlay-color', sideColor);
        document.documentElement.style.setProperty('--side-overlay-opacity', String(sideEnable ? sideOpacity : 0));
        localStorage.setItem('side-overlay-enable', String(sideEnable));
        localStorage.setItem('side-overlay-color', sideColor);
        localStorage.setItem('side-overlay-opacity', String(sideOpacity));
        localStorage.setItem('bg-mode', bgMode);
        localStorage.setItem('bg-size', bgSize);
        localStorage.setItem('bg-position', bgPosition);
        localStorage.setItem('bg-repeat', bgRepeat);
        localStorage.setItem('bg-attach', bgAttach);
        localStorage.setItem('bg-overlay-color', bgOverlayColor);
        localStorage.setItem('bg-overlay-opacity', String(bgOverlayOpacity));
        if (bgMode === 'color') {
            localStorage.setItem('bg-color', bgColor);
            localStorage.removeItem('bg-image-url');
        } else if (bgMode === 'image' && bgImage) {
            localStorage.setItem('bg-image-url', bgImage);
        }

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
    const bgFileInput = document.getElementById("bg-image");
    let bgImageUrl = null;

    try {
        if (fileInput && fileInput.files.length > 0) {
            const storageRef = ref(storage, "empresa/logo.png");
            await uploadBytes(storageRef, fileInput.files[0]);
            logoUrl = await getDownloadURL(storageRef);
        }
        if (bgFileInput && bgFileInput.files.length > 0) {
            const storageRef = ref(storage, "fondo/app-background.jpg");
            await uploadBytes(storageRef, bgFileInput.files[0]);
            bgImageUrl = await getDownloadURL(storageRef);
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
            bg_mode: document.getElementById("bg-mode")?.value || "color",
            bg_color: document.getElementById("bg-color")?.value || "#f4f7f9",
            bg_size: document.getElementById("bg-size")?.value || "cover",
            bg_position: document.getElementById("bg-position")?.value || "center",
            bg_repeat: document.getElementById("bg-repeat")?.value || "no-repeat",
            bg_attach: document.getElementById("bg-attach")?.value || "fixed",
            bg_overlay_color: document.getElementById("bg-overlay-color")?.value || "#000000",
            bg_overlay_opacity: (parseInt(document.getElementById("bg-overlay-opacity")?.value || "20", 10) / 100),
            side_overlay_enabled: document.getElementById("side-overlay-enable")?.checked ?? true,
            side_overlay_color: document.getElementById("side-overlay-color")?.value || "#000000",
            side_overlay_opacity: (parseInt(document.getElementById("side-overlay-opacity")?.value || "6", 10) / 100),
            updated_at: new Date()
        };

        if (logoUrl) data.logo_url = logoUrl;
        if (bgImageUrl) data.bg_image_url = bgImageUrl;

        await setDoc(doc(db, "settings", "panel_pro"), data, { merge: true });
        
        // Aplicar y sincronizar LocalStorage con DaisyUI
        document.documentElement.setAttribute('data-theme', data.tema);
        mapDaisyToAppVariables();
        const mappedSave = readMappedColors();
        localStorage.setItem('theme', data.tema);
        localStorage.setItem('accent-color', mappedSave.primary);
        localStorage.setItem('card-color', mappedSave.card);
        localStorage.setItem('text-color', mappedSave.text);
        localStorage.setItem('bg-mode', data.bg_mode);
        localStorage.setItem('bg-size', data.bg_size);
        localStorage.setItem('bg-position', data.bg_position);
        localStorage.setItem('bg-repeat', data.bg_repeat);
        localStorage.setItem('bg-attach', data.bg_attach);
        localStorage.setItem('bg-overlay-color', data.bg_overlay_color);
        localStorage.setItem('bg-overlay-opacity', String(data.bg_overlay_opacity));
        localStorage.setItem('side-overlay-enable', String(data.side_overlay_enabled));
        localStorage.setItem('side-overlay-color', data.side_overlay_color);
        localStorage.setItem('side-overlay-opacity', String(data.side_overlay_opacity));
        if (data.bg_mode === 'color') {
            localStorage.setItem('bg-color', data.bg_color);
            localStorage.removeItem('bg-image-url');
        } else if (data.bg_mode === 'image' && (bgImageUrl || localStorage.getItem('bg-image-url'))) {
            const url = bgImageUrl || localStorage.getItem('bg-image-url');
            localStorage.setItem('bg-image-url', url);
        }
        aplicarFondo({ mode: data.bg_mode, color: data.bg_color, imageUrl: bgImageUrl || localStorage.getItem('bg-image-url') || null, size: data.bg_size, position: data.bg_position, repeat: data.bg_repeat, attach: data.bg_attach, overlayColor: data.bg_overlay_color, overlayOpacity: data.bg_overlay_opacity });
        document.documentElement.style.setProperty('--side-overlay-color', data.side_overlay_color);
        document.documentElement.style.setProperty('--side-overlay-opacity', String(data.side_overlay_enabled ? data.side_overlay_opacity : 0));

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

    // Cambio inmediato de tema desde el selector
    const sel = document.getElementById('tema-select');
    if (sel) {
        sel.addEventListener('change', () => {
            document.documentElement.setAttribute('data-theme', sel.value);
            mapDaisyToAppVariables();
        });
    }
    // Vista previa de fondo
    const bgMode = document.getElementById('bg-mode');
    const bgColor = document.getElementById('bg-color');
    const bgImage = document.getElementById('bg-image');
    const bgPreview = document.getElementById('bg-preview');
    const bgSize = document.getElementById('bg-size');
    const bgPosition = document.getElementById('bg-position');
    const bgRepeat = document.getElementById('bg-repeat');
    const bgAttach = document.getElementById('bg-attach');
    const bgOverlayColor = document.getElementById('bg-overlay-color');
    const bgOverlayOpacity = document.getElementById('bg-overlay-opacity');
    const sideEnable = document.getElementById('side-overlay-enable');
    const sideColor = document.getElementById('side-overlay-color');
    const sideOpacity = document.getElementById('side-overlay-opacity');
    function updatePreview() {
        const mode = bgMode?.value || 'color';
        if (mode === 'image' && bgImage && bgImage.files.length > 0) {
            const file = bgImage.files[0];
            const url = URL.createObjectURL(file);
            if (bgPreview) {
                bgPreview.style.backgroundImage = `url(${url})`;
                bgPreview.style.backgroundColor = '';
            }
        } else {
            if (bgPreview) {
                bgPreview.style.backgroundImage = 'none';
                bgPreview.style.backgroundColor = bgColor?.value || '#f4f7f9';
            }
        }
        if (bgPreview) {
            const size = bgSize?.value || 'cover';
            bgPreview.style.backgroundSize = size === 'stretch' ? '100% 100%' : size;
            bgPreview.style.backgroundPosition = bgPosition?.value || 'center';
            bgPreview.style.backgroundRepeat = bgRepeat?.value || 'no-repeat';
        }
        document.documentElement.style.setProperty('--bg-overlay-color', bgOverlayColor?.value || '#000000');
        document.documentElement.style.setProperty('--bg-overlay-opacity', String((parseInt(bgOverlayOpacity?.value || '20', 10) / 100)));
        document.documentElement.style.setProperty('--side-overlay-color', sideColor?.value || '#000000');
        document.documentElement.style.setProperty('--side-overlay-opacity', String((sideEnable?.checked ? (parseInt(sideOpacity?.value || '6', 10) / 100) : 0)));
    }
    if (bgMode) bgMode.addEventListener('change', updatePreview);
    if (bgColor) bgColor.addEventListener('input', updatePreview);
    if (bgImage) bgImage.addEventListener('change', updatePreview);
    if (bgSize) bgSize.addEventListener('change', updatePreview);
    if (bgPosition) bgPosition.addEventListener('change', updatePreview);
    if (bgRepeat) bgRepeat.addEventListener('change', updatePreview);
    if (bgAttach) bgAttach.addEventListener('change', updatePreview);
    if (bgOverlayColor) bgOverlayColor.addEventListener('input', updatePreview);
    if (bgOverlayOpacity) bgOverlayOpacity.addEventListener('input', updatePreview);
    if (sideEnable) sideEnable.addEventListener('change', updatePreview);
    if (sideColor) sideColor.addEventListener('input', updatePreview);
    if (sideOpacity) sideOpacity.addEventListener('input', updatePreview);
});

// ======= Fondo de la aplicación (color/imagen) =======
function aplicarFondo({ mode, color, imageUrl, size, position, repeat, attach, overlayColor, overlayOpacity }) {
    if (mode === 'image' && imageUrl) {
        document.body.style.backgroundImage = `url(${imageUrl})`;
        document.body.style.backgroundSize = (size === 'stretch') ? '100% 100%' : (size || 'cover');
        document.body.style.backgroundPosition = position || 'center';
        document.body.style.backgroundRepeat = repeat || 'no-repeat';
        document.body.style.backgroundAttachment = attach || 'fixed';
        document.documentElement.style.setProperty('--background-color', 'transparent');
    } else {
        document.body.style.backgroundImage = 'none';
        document.documentElement.style.setProperty('--background-color', color || '#f4f7f9');
    }
    document.documentElement.style.setProperty('--bg-overlay-color', overlayColor || '#000000');
    document.documentElement.style.setProperty('--bg-overlay-opacity', String(overlayOpacity ?? 0));
}
