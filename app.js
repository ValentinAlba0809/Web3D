import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://xtrkozrfdaepxllbcpol.supabase.co';
const supabaseKey = 'sb_publishable_IMeBYPRYyBUGAuA68qnUNw_4HRdSXkO';
const supabase = createClient(supabaseUrl, supabaseKey);

const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authMensaje = document.getElementById('auth-mensaje');
const contenedorProductos = document.getElementById('lista-productos');

let esAdmin = false;
let productosActuales = []; 
let carrito = []; 
let todosLosPedidos = [];

// ==========================================
// AUTENTICACIÓN
// ==========================================
async function verificarSesion() {
    const { data: { session } } = await supabase.auth.getSession();
    const adminPanel = document.getElementById('admin-panel');
    const adminPedidos = document.getElementById('admin-pedidos');
    const clientePedidos = document.getElementById('cliente-pedidos');

    if (session) {
        authContainer.classList.add('oculto');
        appContainer.classList.remove('oculto');

        if (session.user.email === 'valentin@admin.com') {
            adminPanel.classList.remove('oculto');
            adminPedidos.classList.remove('oculto');
            clientePedidos.classList.add('oculto');
            esAdmin = true;
            cargarPedidos();
        } else {
            adminPanel.classList.add('oculto');
            adminPedidos.classList.add('oculto');
            clientePedidos.classList.remove('oculto');
            esAdmin = false;
            cargarMisPedidos(session.user.email);
        }
        cargarProductos();
    } else {
        authContainer.classList.remove('oculto');
        appContainer.classList.add('oculto');
    }
}

document.getElementById('btn-register').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    authMensaje.textContent = "Registrando...";
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
        authMensaje.style.color = "#e74c3c"; authMensaje.textContent = "Error: " + error.message;
    } else {
        authMensaje.style.color = "green"; authMensaje.textContent = "¡Registro exitoso! Iniciando sesión...";
        await supabase.auth.signInWithPassword({ email, password });
        verificarSesion(); 
    }
});

document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    authMensaje.textContent = "Verificando...";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { authMensaje.style.color = "#e74c3c"; authMensaje.textContent = "Error: Credenciales incorrectas."; } 
    else { authMensaje.textContent = ""; verificarSesion(); }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    carrito = []; renderizarCarrito(); verificarSesion(); 
});

// ==========================================
// PRODUCTOS Y COLORES EN PANTALLA
// ==========================================
async function cargarProductos() {
    const { data: productos, error } = await supabase.from('productos').select('*').order('id', { ascending: true });
    if (error) return;
    productosActuales = productos;
    renderizarProductos(productosActuales);
}

function renderizarProductos(productos) {
    contenedorProductos.innerHTML = ''; 
    productos.forEach(producto => {
        const div = document.createElement('div');
        div.className = 'producto-card';
        
        // BOTONES DE ADMIN (AHORA INCLUYE EDITAR)
        const botonesAdmin = esAdmin ? `
            <div style="display: flex; gap: 5px; margin-top: 10px;">
                <button onclick="window.editarProducto(${producto.id})" class="btn-verde" style="flex: 1; background: #f39c12; padding: 8px;">✏️ Editar</button>
                <button onclick="window.eliminarProducto(${producto.id})" class="btn-rojo" style="flex: 1; padding: 8px;">🗑️ Eliminar</button>
            </div>
        ` : '';

        let selectColoresHTML = '';
        let hasColors = producto.stock_colores && Object.keys(producto.stock_colores).length > 0;
        let botonDeshabilitado = producto.stock === 0 ? 'disabled' : '';
        let textoBoton = producto.stock === 0 ? 'Sin stock' : 'Agregar al Carrito';

        if (hasColors) {
            let opciones = '';
            for (const [color, cant] of Object.entries(producto.stock_colores)) {
                if (cant > 0) opciones += `<option value="${color}">${color} (Disponibles: ${cant})</option>`;
            }
            if (opciones === '') {
                opciones = `<option disabled>Agotado en todos los colores</option>`;
                botonDeshabilitado = 'disabled';
                textoBoton = 'Agotado';
            }
            selectColoresHTML = `<select id="color-${producto.id}" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 6px;">${opciones}</select>`;
        }

        div.innerHTML = `
            <img src="${producto.imagen_url || 'https://via.placeholder.com/300x250'}" alt="${producto.nombre}" class="producto-img" onerror="this.src='https://via.placeholder.com/300x250?text=Sin+Imagen'">
            <div class="producto-info">
                <h3>${producto.nombre}</h3>
                <p>${producto.descripcion || 'Sin descripción'}</p>
                <p class="producto-precio">$${producto.precio || 0}</p>
                <p class="stock-info">Stock total: ${producto.stock}</p>
            </div>
            <div class="producto-acciones">
                ${selectColoresHTML}
                <input type="number" id="cant-${producto.id}" value="1" min="1" max="${producto.stock}" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box;">
                <button onclick="window.agregarAlCarrito(${producto.id})" ${botonDeshabilitado} class="btn-verde" style="width: 100%;">
                    ${textoBoton}
                </button>
                ${botonesAdmin}
            </div>
        `;
        contenedorProductos.appendChild(div);
    });
}

// ==========================================
// CARRITO CON VARIANTES DE COLOR
// ==========================================
window.agregarAlCarrito = function(id) {
    const producto = productosActuales.find(p => p.id === id);
    const inputCantidad = document.getElementById(`cant-${id}`);
    const cantidadPedida = parseInt(inputCantidad.value);
    
    let colorSeleccionado = null;
    let hasColors = producto.stock_colores && Object.keys(producto.stock_colores).length > 0;
    
    if (hasColors) {
        const selectColor = document.getElementById(`color-${id}`);
        colorSeleccionado = selectColor.value;
        if (!colorSeleccionado) { alert("Color agotado o no seleccionado."); return; }
    }

    let stockDisponible = hasColors ? producto.stock_colores[colorSeleccionado] : producto.stock;
    const idEnCarrito = colorSeleccionado ? `${id}-${colorSeleccionado}` : `${id}`;
    const cantidadEnCarrito = carrito.filter(item => item.cartItemId === idEnCarrito).reduce((acc, item) => acc + item.cantidad, 0);
    
    if ((cantidadPedida + cantidadEnCarrito) > stockDisponible) {
        alert(`Stock insuficiente de esa variante. Solo quedan ${stockDisponible}.`); return;
    }

    const nombreCart = colorSeleccionado ? `${producto.nombre} (${colorSeleccionado})` : producto.nombre;

    carrito.push({ cartItemId: idEnCarrito, id: producto.id, color: colorSeleccionado, nombre: nombreCart, precio: producto.precio, cantidad: cantidadPedida, subtotal: producto.precio * cantidadPedida });
    inputCantidad.value = 1;
    renderizarCarrito();
}

window.quitarDelCarrito = function(index) { carrito.splice(index, 1); renderizarCarrito(); }

function renderizarCarrito() {
    const contenedor = document.getElementById('contenido-carrito');
    const spanTotal = document.getElementById('total-carrito');
    const btnConfirmar = document.getElementById('btn-confirmar-reserva');
    
    contenedor.innerHTML = ''; let total = 0;

    if (carrito.length === 0) {
        contenedor.innerHTML = '<p style="color: #7f8c8d; text-align: center;">El carrito está vacío</p>';
        spanTotal.textContent = '0.00'; btnConfirmar.disabled = true; return;
    }
    carrito.forEach((item, index) => {
        total += item.subtotal;
        const div = document.createElement('div'); div.className = 'carrito-item';
        div.innerHTML = `<div class="carrito-item-info"><h4>${item.nombre}</h4><p>${item.cantidad} un. x $${item.precio} = <strong>$${item.subtotal}</strong></p></div>
            <button onclick="window.quitarDelCarrito(${index})" class="btn-quitar">✖</button>`;
        contenedor.appendChild(div);
    });
    spanTotal.textContent = total.toFixed(2); btnConfirmar.disabled = false;
}

// ==========================================
// PROCESAR Y GESTIONAR PEDIDOS
// ==========================================
document.getElementById('btn-confirmar-reserva').addEventListener('click', async () => {
    if (carrito.length === 0) return;
    const btnConfirmar = document.getElementById('btn-confirmar-reserva');
    btnConfirmar.textContent = "Procesando..."; btnConfirmar.disabled = true;

    const total = carrito.reduce((acc, item) => acc + item.subtotal, 0);
    const { data: { session } } = await supabase.auth.getSession();
    
    const { error: errorPedido } = await supabase.from('pedidos').insert([{
        usuario_email: session.user.email, productos_comprados: carrito, total: total, estado: 'Pendiente'
    }]);

    if (errorPedido) { alert("Error al procesar reserva."); btnConfirmar.textContent = "Confirmar Reserva"; btnConfirmar.disabled = false; return; }

    for (let item of carrito) {
        const productoOriginal = productosActuales.find(p => p.id === item.id);
        let nuevoStock = productoOriginal.stock - item.cantidad;
        let nuevosColores = { ...productoOriginal.stock_colores };
        
        if (item.color && nuevosColores[item.color] !== undefined) nuevosColores[item.color] -= item.cantidad;
        await supabase.from('productos').update({ stock: nuevoStock, stock_colores: nuevosColores }).eq('id', item.id);
    }

    alert("¡Reserva confirmada con éxito!\n\nPor favor, envíanos un mensaje por Instagram para coordinar la entrega.\n\nTu pedido ha sido guardado.");
    carrito = []; renderizarCarrito(); cargarProductos(); 
    if (esAdmin) cargarPedidos(); else cargarMisPedidos(session.user.email);
    btnConfirmar.textContent = "Confirmar Reserva";
});

window.cancelarPedido = async function(idPedido) {
    if(!confirm("¿Seguro que quieres cancelar este pedido? El stock será devuelto.")) return;
    const { data: pedido, error: errorPedido } = await supabase.from('pedidos').select('*').eq('id', idPedido).single();
    if (errorPedido) return;
    
    await supabase.from('pedidos').update({ estado: 'Cancelado' }).eq('id', idPedido);
    
    for (let item of pedido.productos_comprados) {
        const { data: prodActual } = await supabase.from('productos').select('stock, stock_colores').eq('id', item.id).single();
        if (prodActual) {
            let nuevosColores = { ...prodActual.stock_colores };
            if (item.color && nuevosColores[item.color] !== undefined) nuevosColores[item.color] += item.cantidad;
            await supabase.from('productos').update({ stock: prodActual.stock + item.cantidad, stock_colores: nuevosColores }).eq('id', item.id);
        }
    }
    alert("Pedido cancelado exitosamente. Stock devuelto.");
    cargarProductos(); 
    if (esAdmin) cargarPedidos(); else { const { data: { session } } = await supabase.auth.getSession(); cargarMisPedidos(session.user.email); }
}

async function cargarPedidos() {
    if (!esAdmin) return;
    const { data: pedidos, error } = await supabase.from('pedidos').select('*').order('fecha', { ascending: false });
    if (error) return;
    todosLosPedidos = pedidos; renderizarPedidos();
}

function renderizarPedidos() {
    const contenedorPedidos = document.getElementById('lista-pedidos');
    const filtroActual = document.getElementById('filtro-pedidos').value;
    contenedorPedidos.innerHTML = '';
    const pedidosFiltrados = todosLosPedidos.filter(pedido => { if (filtroActual === 'Todos') return true; return pedido.estado === filtroActual; });

    if (pedidosFiltrados.length === 0) { contenedorPedidos.innerHTML = '<p style="color: #666; text-align: center;">No hay pedidos.</p>'; return; }

    pedidosFiltrados.forEach(pedido => {
        let resumenProductos = pedido.productos_comprados.map(p => `${p.cantidad}x ${p.nombre}`).join(', ');
        let botones = '';
        if (pedido.estado === 'Pendiente') {
            botones = `<button onclick="window.cambiarEstadoPedido(${pedido.id}, 'Completado')" class="btn-verde" style="padding: 5px; font-size: 0.85em; flex: 1;">✅ Confirmar</button>
                       <button onclick="window.cancelarPedido(${pedido.id})" class="btn-rojo" style="padding: 5px; font-size: 0.85em; flex: 1;">❌ Cancelar</button>`;
        } else if (pedido.estado === 'Completado') {
            botones = `<span style="color: green; font-weight: bold; font-size: 0.9em; text-align: center; width: 100%;">✔ Completado</span>`;
        } else {
            botones = `<span style="color: red; font-weight: bold; font-size: 0.9em; text-align: center; width: 100%;">✖ Cancelado</span>`;
        }
        const div = document.createElement('div');
        div.style.cssText = "background: white; padding: 12px; border-radius: 6px; border: 1px solid #ccc; font-size: 0.9em;";
        div.innerHTML = `<div style="margin-bottom: 8px;"><strong>Orden #${pedido.id}</strong><br><span style="color: #666;">👤 ${pedido.usuario_email}</span><br>
            <span style="color: #555; display: block; margin: 5px 0;">🛒 ${resumenProductos}</span><span style="color: #27ae60; font-weight: bold; font-size: 1.1em;">Total: $${pedido.total}</span></div>
            <div style="display: flex; gap: 5px; justify-content: space-between; border-top: 1px solid #eee; padding-top: 8px;">${botones}</div>`;
        contenedorPedidos.appendChild(div);
    });
}
document.getElementById('filtro-pedidos').addEventListener('change', renderizarPedidos);

window.cambiarEstadoPedido = async function(idPedido, nuevoEstado) {
    if(!confirm("¿Marcar este pedido como pagado y completado?")) return;
    const { error } = await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', idPedido);
    if (!error) cargarPedidos(); 
}

async function cargarMisPedidos(email) {
    const { data: misPedidos, error } = await supabase.from('pedidos').select('*').eq('usuario_email', email).order('fecha', { ascending: false });
    if (error) return;
    const contenedor = document.getElementById('lista-mis-pedidos'); contenedor.innerHTML = '';
    if (misPedidos.length === 0) { contenedor.innerHTML = '<p style="color: #666; text-align: center;">No tienes pedidos aún.</p>'; return; }

    misPedidos.forEach(pedido => {
        let resumenProductos = pedido.productos_comprados.map(p => `${p.cantidad}x ${p.nombre}`).join(', ');
        let estadoHtml = ''; let botonCancelar = '';
        if (pedido.estado === 'Pendiente') {
            estadoHtml = `<span style="color: #d35400; font-weight: bold;">⏳ Pendiente</span>`;
            botonCancelar = `<button onclick="window.cancelarPedido(${pedido.id})" class="btn-rojo" style="padding: 5px; font-size: 0.8em; width: 100%; margin-top: 5px;">❌ Cancelar Pedido</button>`;
        } else if (pedido.estado === 'Completado') { estadoHtml = `<span style="color: green; font-weight: bold;">✔ Completado</span>`; } 
        else { estadoHtml = `<span style="color: red; font-weight: bold;">✖ Cancelado</span>`; }
        
        const div = document.createElement('div');
        div.style.cssText = "background: #f8f9f9; padding: 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 0.9em;";
        div.innerHTML = `<div style="margin-bottom: 5px;"><strong>Orden #${pedido.id}</strong><br><span style="color: #555; display: block; margin: 3px 0;">🛒 ${resumenProductos}</span><span style="color: #27ae60; font-weight: bold;">Total: $${pedido.total}</span></div>
            <div style="border-top: 1px solid #eee; padding-top: 5px; text-align: center;">${estadoHtml}${botonCancelar}</div>`;
        contenedor.appendChild(div);
    });
}

// ==========================================
// ADMIN: EDITAR Y PUBLICAR PRODUCTO
// ==========================================
window.eliminarProducto = async function(id) {
    if (confirm("¿Estás seguro de que quieres eliminar este producto?")) {
        const { error } = await supabase.from('productos').delete().eq('id', id);
        if (!error) cargarProductos(); 
    }
}

// 1. Botón "Editar" en la tarjeta
window.editarProducto = function(id) {
    const producto = productosActuales.find(p => p.id === id);
    if (!producto) return;

    // Llenamos el formulario
    document.getElementById('edit-producto-id').value = producto.id;
    document.getElementById('titulo-panel-admin').textContent = "✏️ Editar Producto 3D";
    document.getElementById('nuevo-nombre').value = producto.nombre;
    document.getElementById('nuevo-descripcion').value = producto.descripcion;
    document.getElementById('nuevo-precio').value = producto.precio;

    // Llenamos los colores
    const contenedorColores = document.getElementById('contenedor-colores');
    contenedorColores.innerHTML = '';
    
    if (producto.stock_colores && Object.keys(producto.stock_colores).length > 0) {
        for (const [color, cant] of Object.entries(producto.stock_colores)) {
            const div = document.createElement('div');
            div.className = 'color-item';
            div.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';
            div.innerHTML = `<input type="text" value="${color}" class="input-color" style="flex: 2; padding: 10px; border: 1px solid #ccc; border-radius: 4px; margin: 0;">
                <input type="number" value="${cant}" min="0" class="input-stock" style="flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 4px; margin: 0;">
                <button onclick="this.parentElement.remove()" style="background: transparent; border: none; color: #e74c3c; font-size: 16px; cursor: pointer; padding: 0 10px;">✖</button>`;
            contenedorColores.appendChild(div);
        }
    } else {
        document.getElementById('btn-add-color').click(); // Agrega una fila vacía si no hay colores
    }

    // Cambiamos los botones
    document.getElementById('btn-agregar').textContent = "Guardar Cambios";
    document.getElementById('btn-cancelar-edicion').classList.remove('oculto');
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Subimos la pantalla
}

// 2. Botón "Cancelar Edición"
document.getElementById('btn-cancelar-edicion').addEventListener('click', () => {
    document.getElementById('edit-producto-id').value = '';
    document.getElementById('titulo-panel-admin').textContent = "Publicar Nuevo Producto 3D";
    document.getElementById('nuevo-nombre').value = '';
    document.getElementById('nuevo-descripcion').value = '';
    document.getElementById('nuevo-precio').value = '';
    document.getElementById('nuevo-imagen').value = '';
    document.getElementById('contenedor-colores').innerHTML = `<div class="color-item" style="display: flex; gap: 10px;">
            <input type="text" placeholder="Color (Ej: PLA Blanco)" class="input-color" style="flex: 2; padding: 10px; border: 1px solid #ccc; border-radius: 4px; margin: 0;">
            <input type="number" placeholder="Stock" min="0" class="input-stock" style="flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 4px; margin: 0;">
        </div>`;
    document.getElementById('btn-agregar').textContent = "Publicar Producto";
    document.getElementById('btn-cancelar-edicion').classList.add('oculto');
});

document.getElementById('btn-add-color').addEventListener('click', () => {
    const contenedor = document.getElementById('contenedor-colores');
    const div = document.createElement('div');
    div.className = 'color-item';
    div.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';
    div.innerHTML = `<input type="text" placeholder="Color (Ej: PLA Negro)" class="input-color" style="flex: 2; padding: 10px; border: 1px solid #ccc; border-radius: 4px; margin: 0;">
        <input type="number" placeholder="Stock" min="0" class="input-stock" style="flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 4px; margin: 0;">
        <button onclick="this.parentElement.remove()" style="background: transparent; border: none; color: #e74c3c; font-size: 16px; cursor: pointer; padding: 0 10px;">✖</button>`;
    contenedor.appendChild(div);
});

// 3. Guardar o Actualizar el producto
document.getElementById('btn-agregar').addEventListener('click', async () => {
    const btn = document.getElementById('btn-agregar');
    const idEdit = document.getElementById('edit-producto-id').value; // Sabremos si estamos editando
    
    btn.textContent = idEdit ? "Guardando cambios..." : "Subiendo imagen y guardando..."; 
    btn.disabled = true;

    const nombre = document.getElementById('nuevo-nombre').value;
    const descripcion = document.getElementById('nuevo-descripcion').value || 'Sin descripción';
    const precio = parseFloat(document.getElementById('nuevo-precio').value);

    const itemsColor = document.querySelectorAll('.color-item');
    let stock_colores = {}; let stockTotal = 0;
    itemsColor.forEach(item => {
        const color = item.querySelector('.input-color').value.trim();
        const cant = parseInt(item.querySelector('.input-stock').value);
        if (color && !isNaN(cant)) { stock_colores[color] = cant; stockTotal += cant; }
    });

    if (!nombre || isNaN(precio) || stockTotal === 0) {
        alert("Completa el nombre, precio y al menos un color con stock válido.");
        btn.textContent = idEdit ? "Guardar Cambios" : "Publicar Producto"; 
        btn.disabled = false; return;
    }

    const inputImagen = document.getElementById('nuevo-imagen');
    let imagen_url = 'https://via.placeholder.com/300x250?text=Sin+Imagen'; 
    
    // Si estamos editando, conservamos la imagen vieja a menos que suba una nueva
    if (idEdit) {
        const productoOriginal = productosActuales.find(p => p.id == idEdit);
        imagen_url = productoOriginal.imagen_url;
    }

    if (inputImagen.files.length > 0) {
        const archivo = inputImagen.files[0];
        const extension = archivo.name.split('.').pop();
        const nombreArchivo = `${Date.now()}.${extension}`; 

        const { data, error: errorUpload } = await supabase.storage.from('productos').upload(nombreArchivo, archivo);
        if (errorUpload) {
            alert("Error al subir la foto: " + errorUpload.message);
            btn.textContent = idEdit ? "Guardar Cambios" : "Publicar Producto"; 
            btn.disabled = false; return;
        }
        const { data: dataUrl } = supabase.storage.from('productos').getPublicUrl(nombreArchivo);
        imagen_url = dataUrl.publicUrl;
    }

    let errorGuardado;
    if (idEdit) {
        // ACTUALIZAR (UPDATE)
        const { error } = await supabase.from('productos').update({ nombre, descripcion, precio, stock: stockTotal, stock_colores, imagen_url }).eq('id', idEdit);
        errorGuardado = error;
    } else {
        // CREAR NUEVO (INSERT)
        const { error } = await supabase.from('productos').insert([{ nombre, descripcion, precio, stock: stockTotal, stock_colores, imagen_url }]);
        errorGuardado = error;
    }

    if (errorGuardado) {
        alert("Hubo un error al guardar: " + errorGuardado.message);
    } else {
        alert(idEdit ? "¡Producto actualizado con éxito!" : "¡Pieza 3D publicada con éxito!");
        document.getElementById('btn-cancelar-edicion').click(); // Reutilizamos el botón de cancelar para limpiar todo
        cargarProductos();
    }
    
    btn.textContent = idEdit ? "Guardar Cambios" : "Publicar Producto"; 
    btn.disabled = false;
});

verificarSesion();