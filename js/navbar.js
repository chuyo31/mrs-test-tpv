import { cargarEmpresaDocs } from "./empresa-docs.js";
import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- REGLA DE ORO: CARGA DE TEMAS INMEDIATA ---
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
// DaisyUI -> variables de la app
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
  let autoText = text;
  if (card && card.startsWith('#') && card.length === 7) {
    const r = parseInt(card.substr(1, 2), 16);
    const g = parseInt(card.substr(3, 2), 16);
    const b = parseInt(card.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    autoText = (yiq >= 150) ? '#11191f' : '#ffffff';
  }
  document.documentElement.style.setProperty('--color', autoText);
}
mapDaisyToAppVariables();
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
    <nav class="container-fluid" style="background: var(--card-background-color); border-bottom: 1px solid var(--muted-border-color); margin-bottom: 2rem; padding: 0.75rem 1.5rem; border-radius: 0 0 15px 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      <ul>
        <li><a href="caja.html" class="nav-link-modern" title="Ventas"><i data-lucide="shopping-cart"></i> <span>Caja</span></a></li>
        <li><a href="historial.html" class="nav-link-modern" title="Ventas"><i data-lucide="history"></i> <span>Ventas</span></a></li>
        <li><a href="exportes.html" class="nav-link-modern" title="Exportar"><i data-lucide="file-text"></i> <span>Exportar</span></a></li>
        <li><a href="configuracion.html" class="nav-link-modern active" title="Configuración"><i data-lucide="settings"></i> <span>Config</span></a></li>
        <li><a href="cierre.html" class="nav-link-modern highlight" title="Cierre de Caja"><i data-lucide="lock"></i> <span>Cierre Z</span></a></li>
      </ul>
      <ul>
        <li>
            <details role="list" dir="rtl" style="margin-bottom: 0;">
                <summary aria-haspopup="listbox" role="link" class="secondary" style="padding: 0 10px; border: 1px solid var(--muted-border-color); background: var(--input-background-color); border-radius: 10px;"><i data-lucide="palette"></i></summary>
                <ul role="listbox" class="theme-switcher-menu" style="background: var(--card-background-color); border: 1px solid var(--muted-border-color); border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); z-index: 1000;">
                    <li><a href="#" data-theme-switcher="light"><i data-lucide="sun"></i> Claro</a></li>
                    <li><a href="#" data-theme-switcher="dark"><i data-lucide="moon"></i> Oscuro</a></li>
                </ul>
            </details>
        </li>
        <li style="margin-left: 20px; display: flex; align-items: center;">${brandingContent}</li>
        <li style="margin-left: 20px;">
            <button class="btn-modern-small logout" id="btn-logout"><i data-lucide="log-out"></i></button>
        </li>
      </ul>
    </nav>`;

    // Inicializar iconos de Lucide
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Aplicar tema guardado inmediatamente al cargar el navbar (Regla de Oro)
  const theme = localStorage.getItem('theme') || 'light';
  const { primary: accent, card, text } = readMappedColors();
  const bg = localStorage.getItem('bg-color');

  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.setProperty('--primary', accent);
  document.documentElement.style.setProperty('--card-background-color', card);
  let autoText = text;
  if (card && card.startsWith('#') && card.length === 7) {
    const r2 = parseInt(card.substr(1, 2), 16);
    const g2 = parseInt(card.substr(3, 2), 16);
    const b2 = parseInt(card.substr(5, 2), 16);
    const yiq2 = ((r2 * 299) + (g2 * 587) + (b2 * 114)) / 1000;
    autoText = (yiq2 >= 150) ? '#11191f' : '#ffffff';
  }
  document.documentElement.style.setProperty('--color', autoText);
  if (bg) document.documentElement.style.setProperty('--background-color', bg);
  const bgMode = localStorage.getItem('bg-mode');
  const bgImageUrl = localStorage.getItem('bg-image-url');
  const bgSize = localStorage.getItem('bg-size') || 'cover';
  const bgPosition = localStorage.getItem('bg-position') || 'center';
  const bgRepeat = localStorage.getItem('bg-repeat') || 'no-repeat';
  const bgAttach = localStorage.getItem('bg-attach') || 'fixed';
  const overlayColor = localStorage.getItem('bg-overlay-color') || '#000000';
  const overlayOpacity = parseFloat(localStorage.getItem('bg-overlay-opacity') || '0') || 0;
  if (bgMode === 'image' && bgImageUrl) {
    document.body.style.backgroundImage = `url(${bgImageUrl})`;
    document.body.style.backgroundSize = (bgSize === 'stretch') ? '100% 100%' : bgSize;
    document.body.style.backgroundRepeat = bgRepeat;
    document.body.style.backgroundPosition = bgPosition;
    document.body.style.backgroundAttachment = bgAttach;
    document.documentElement.style.setProperty('--background-color', 'transparent');
  } else if (bgMode === 'color' && bg) {
    document.body.style.backgroundImage = 'none';
    document.documentElement.style.setProperty('--background-color', bg);
  }
  document.documentElement.style.setProperty('--bg-overlay-color', overlayColor);
  document.documentElement.style.setProperty('--bg-overlay-opacity', String(overlayOpacity));

    // Recalcular inversos por si acaso
    const r = parseInt(accent.substr(1, 2), 16);
    const g = parseInt(accent.substr(3, 2), 16);
    const b = parseInt(accent.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    document.documentElement.style.setProperty('--primary-inverse', (yiq >= 128) ? '#11191f' : '#ffffff');

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
        mapDaisyToAppVariables();
    }
});

document.addEventListener("DOMContentLoaded", inyectarNavbar);
