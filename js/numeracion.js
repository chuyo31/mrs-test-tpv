import {
  doc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Genera un número de factura/ticket correlativo y único por año.
 * Adaptado para cumplir con la trazabilidad requerida por Veri*factu.
 */
export async function generarNumeroLegal(db, tipo) {
  const year = new Date().getFullYear();
  
  // Normalizamos el tipo para evitar errores de prefijo
  // Si viene 'sales' o 'tickets' usamos TCK, si viene 'invoices' o 'facturas' usamos FAC
  const esFactura = (tipo === "invoices" || tipo === "facturas");
  const coleccionContador = esFactura ? "facturas" : "tickets";
  
  const docId = `${coleccionContador}_${year}`;
  const ref = doc(db, "counters", docId);

  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    let ultimo = 0;

    if (snap.exists()) {
      ultimo = snap.data().ultimo || 0;
    }

    const siguiente = ultimo + 1;

    // Actualizamos el contador
    transaction.set(
      ref,
      {
        ultimo: siguiente,
        year: year,
        tipo: coleccionContador,
        updated_at: serverTimestamp()
      },
      { merge: true }
    );

    // Formato Veri*factu: Serie-Año-Número
    // Ejemplo: FAC-2024-000001 o TCK-2024-000001
    const prefijo = esFactura ? "FAC" : "TCK";
    const numeroFormateado = String(siguiente).padStart(6, "0");
    
    return `${prefijo}-${year}-${numeroFormateado}`;
  });
}