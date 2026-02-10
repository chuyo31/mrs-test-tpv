import { cargarEmpresaDocs } from "./empresa-docs.js";
import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- REGLA DE ORO: CARGA DE TEMAS INMEDIATA ---
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

const savedAccent = localStorage.getItem('accent-color') || '#3b82f6';
document.documentElement.style.setProperty('--primary', savedAccent);
// -----------------------------------------------------------------

async function inyectarNavbar() {
    const contenedor = document.getElementById("navbar-app");
    if (!contenedor) return;

    // Traemos datos de Firestore
    const empresa = await cargarEmpresaDocs();

    // CORRECCIÓN: Forzamos la validación del booleano
    // A veces Firebase devuelve el valor como string o el check no viene definido
    const mostrarLogo = empresa.nav_mostrar_logo === true || empresa.nav_mostrar_logo === "true";
    const tieneUrl = empresa.logo_url && empresa.logo_url !== "";

    const brandingContent = (mostrarLogo && tieneUrl) 
        ? `<img src="${empresa.logo_url}" alt="Logo" style="height: 35px; width: auto; vertical-align: middle; border-radius: 4px;">`
        : `<strong style="font-size: 1.1rem; color: var(--primary);">${empresa.nombre || 'MRS TPV'}</strong>`;

    contenedor.innerHTML = `
    <nav class="container-fluid" style="background: var(--card-background-color); border-bottom: 1px solid var(--muted-border-color); margin-bottom: 2rem; padding: 0.5rem 1rem;">
      <ul>
        <li><a href="caja.html" class="secondary">📦 Caja</a></li>
        <li><a href="historial.html" class="secondary">📜 Ventas</a></li>
        <li><a href="exportes.html" class="secondary">📑 Exportar</a></li>
        <li><a href="configuracion.html" class="secondary">⚙️ Config</a></li>
        <li><a href="cierre.html" class="contrast" style="font-weight: bold;">🔒 Cierre Z</a></li>
      </ul>
      <ul>
        <li>
            <details role="list" dir="rtl" style="margin-bottom: 0;">
                <summary aria-haspopup="listbox" role="link" class="secondary" style="padding: 0 10px;">🌓</summary>
                <ul role="listbox">
                    <li><a href="#" data-theme-switcher="light">☀️ Claro</a></li>
                    <li><a href="#" data-theme-switcher="dark">🌙 Oscuro</a></li>
                </ul>
            </details>
        </li>
        <li style="margin-left: 15px; display: flex; align-items: center;">${brandingContent}</li>
        <li style="margin-left: 15px;">
            <button class="outline contrast" id="btn-logout" style="padding: 4px 12px; margin-bottom: 0; font-size: 0.8rem;">Salir</button>
        </li>
      </ul>
    </nav>`;

    // Listener de Logout
    const btnLogout = document.getElementById("btn-logout");
    if(btnLogout) {
        btnLogout.onclick = async () => {
            await signOut(auth);
            window.location.href = "login.html";
        };
    }
}

document.addEventListener('click', e => {
    const switcher = e.target.closest('[data-theme-switcher]');
    if (switcher) {
        e.preventDefault();
        const theme = switcher.dataset.themeSwitcher;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        const selectConfig = document.getElementById("tema-select");
        if(selectConfig) selectConfig.value = theme;
    }
});

document.addEventListener("DOMContentLoaded", inyectarNavbar);