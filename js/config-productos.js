window.guardarProducto = async function() {
    const nombre = document.getElementById("prod-nombre").value;
    const pvp = parseFloat(document.getElementById("prod-venta").value);
    const catId = document.getElementById("prod-cat-select").value;
    const file = document.getElementById("prod-img").files[0];

    if (!nombre || !pvp || !catId) return alert("Rellena los campos obligatorios");

    // 1. Buscamos la familia para saber su fiscalidad
    // (Asumimos que 'categoriasLocal' es un array con tus categorías de Firestore)
    const familia = categoriasLocal.find(c => c.id === catId);

    // 2. APLICAMOS LA PRUEBA (DESGLOSE LEGAL)
    const divisor = 1.21;
    const baseImponible = pvp / divisor;
    const cuotaIVA = baseImponible * 0.21;

    // 3. Subida de imagen (Opcional)
    let imgUrl = "";
    if (file) {
        const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        imgUrl = await getDownloadURL(storageRef);
    }

    // 4. Guardar en Firestore
    const producto = {
        nombre,
        pvp,
        base_imponible: Number(baseImponible.toFixed(4)), // Guardamos con precisión para evitar errores
        tipo_iva: 21,
        cuota_iva: Number(cuotaIVA.toFixed(4)),
        imagen_url: imgUrl,
        categoria_id: catId,
        fecha_creacion: new Date()
    };

    await addDoc(collection(db, "productos"), producto);
    alert("✅ Producto registrado con desglose legal");
    location.reload();
};
