import { cargarEmpresaDocs } from "./empresa-docs.js";

// Barra superior horizontal con navegación de páginas
// Inyecta una topbar uniforme en todas las páginas del TPV
async function injectTopbar() {
  const mount = document.getElementById("topbar-app");
  if (!mount) return;

  const empresa = await cargarEmpresaDocs();
  const company = empresa.nombre || sessionStorage.getItem("empresaNombre") || "MovilRING";

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
