import {
  doc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function generarNumeroLegal(db, tipo) {
  const year = new Date().getFullYear();
  const docId = `${tipo}_${year}`;
  const ref = doc(db, "counters", docId);

  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    let ultimo = 0;

    if (snap.exists()) {
      ultimo = snap.data().ultimo || 0;
    }

    const siguiente = ultimo + 1;

    transaction.set(
      ref,
      {
        ultimo: siguiente,
        updated_at: serverTimestamp()
      },
      { merge: true }
    );

    const prefijo = tipo === "facturas" ? "FAC" : "TCK";
    return `${prefijo}-${year}-${String(siguiente).padStart(6, "0")}`;
  });
}
