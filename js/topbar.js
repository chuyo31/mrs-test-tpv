import { cargarEmpresaDocs } from "./empresa-docs.js";

// Barra superior horizontal con navegación de páginas
// Inyecta una topbar uniforme en todas las páginas del TPV
async function injectTopbar() {
  const mount = document.getElementById("topbar-app");
  if (!mount) return;

  const empresa = await cargarEmpresaDocs();
  const company = empresa.nombre || sessionStorage.getItem("empresaNombre") || "MovilRING";

  // Aplicar tema global y color corporativo
  if (!window.cambiarModo) {
    window.cambiarModo = function(modo) {
      if (modo === "oscuro") {
        document.documentElement.style.setProperty('--bg-app', '#1a202c');
        document.documentElement.style.setProperty('--bg-card', '#2d3748');
        document.documentElement.style.setProperty('--text-main', '#f7fafc');
        document.documentElement.style.setProperty('--text-muted', '#9ca3af');
        document.documentElement.style.setProperty('--border-color', '#4a5568');
      } else {
        document.documentElement.style.setProperty('--bg-app', '#f4f7f9');
        document.documentElement.style.setProperty('--bg-card', '#ffffff');
        document.documentElement.style.setProperty('--text-main', '#2d3748');
        document.documentElement.style.setProperty('--text-muted', '#64748b');
        document.documentElement.style.setProperty('--border-color', '#e2e8f0');
      }
    };
  }
  if (empresa.color) document.documentElement.style.setProperty('--accent', empresa.color);
  window.cambiarModo(empresa.tema || "claro");

  const pages = [
    { href: "caja.html", icon: "🛒", label: "Caja" },
    { href: "historial.html", icon: "📜", label: "Historial" },
    { href: "exportes.html", icon: "📊", label: "Exportes" },
    { href: "configuracion.html", icon: "⚙️", label: "Ajustes" },
    { href: "cierre.html", icon: "🔒", label: "Cierre" },
  ];
  const current = location.pathname.split("/").pop();

  mount.innerHTML = `
    <nav class="topbar">
      <div class="topbar-inner container">
        <div class="topbar-pages">
          ${pages
            .map(
              p => `<a href="${p.href}" class="topbar-link${
                p.href === current ? " active" : ""
              }"><span class="topbar-link-icon">${p.icon}</span><span class="topbar-link-text">${p.label}</span></a>`
            )
            .join("")}
        </div>
        <div class="topbar-right">
          <span class="topbar-divider"></span>
          ${
            empresa.mostrarLogoNavbar && empresa.logo
              ? `<img src="${empresa.logo}" alt="Logo" class="topbar-logo">`
              : `<span class="topbar-user">${company}</span>`
          }
        </div>
      </div>
    </nav>
  `;

  document.addEventListener("click", e => {
    const back = e.target.closest("[data-topbar-back]");
    if (back) {
      e.preventDefault();
      if (history.length > 1) history.back();
    }
  });
}

document.addEventListener("DOMContentLoaded", injectTopbar);
