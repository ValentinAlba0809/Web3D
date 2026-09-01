import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://xtrkozrfdaepxllbcpol.supabase.co';
const supabaseKey = 'sb_publishable_IMeBYPRYyBUGAuA68qnUNw_4HRdSXkO';
const supabase = createClient(supabaseUrl, supabaseKey);

const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authMensaje = document.getElementById('auth-mensaje');
const contenedorProductos = document.getElementById('lista-productos');

// LISTA DE ADMINISTRADORES (Puedes agregar más correos separados por comas)
const correosAdmin = ['valentin@admin.com', 'sebastian.3d.vg@gmail.com'];

let esAdmin = false;
let modoInvitado = true; 
let productosActuales = []; 
let carrito = []; 
let todosLosPedidos = [];

// ==========================================
// INTERFAZ DE LOGIN / REGISTRO
// ==========================================
let modoRegistro = false;
document.getElementById('btn-toggle-auth').addEventListener('click', () => {
    modoRegistro = !modoRegistro;
    document.getElementById('campos-registro').classList.toggle('oculto');
    if (modoRegistro) {
        document.getElementById('auth-titulo').textContent = "Crear Cuenta";
        document.getElementById('auth-subtitulo').textContent = "Completa tus datos para registrarte";
        document.getElementById('btn-login').classList.add('oculto');
        document.getElementById('btn-register').classList.remove('oculto');
        document.getElementById('btn-toggle-auth').textContent = "¿Ya tienes cuenta? Inicia sesión";
    } else {
        document.getElementById('auth-titulo').textContent = "Iniciar Sesión";
        document.getElementById('auth-subtitulo').textContent = "Ingresa para confirmar tu reserva y ver tus pedidos";
        document.getElementById('btn-login').classList.remove('oculto');
        document.getElementById('btn-register').classList.add('oculto');
        document.getElementById('btn-toggle-auth').textContent = "¿No tienes cuenta? Regístrate";
    }
});

document.getElementById('btn-nav-login').addEventListener('click', () => {
    appContainer.classList.add('oculto'); authContainer.classList.remove('oculto'); authMensaje.textContent = "";
});
document.getElementById('btn-volver-tienda').addEventListener('click', () => {
    authContainer.classList.add('oculto'); appContainer.classList.remove('oculto');
});

// ==========================================
// AUTENTICACIÓN Y PERFIL
// ==========================================
async function verificarSesion() {
    const { data: { session } } = await supabase.auth.getSession();
    const adminPanel = document.getElementById('admin-panel');
    const adminPedidos = document.getElementById('admin-pedidos');
    const clientePedidos = document.getElementById('cliente-pedidos');
    const btnNavLogin = document.getElementById('btn-nav-login');
    const btnPerfil = document.getElementById('btn-perfil');

    authContainer.classList.add('oculto'); appContainer.classList.remove('oculto');

    if (session) {
        modoInvitado = false;
        btnNavLogin.classList.add('oculto');
        btnPerfil.classList.remove('oculto');
        document.getElementById('panel-derecho-usuario').classList.remove('oculto');
        
        // Cargar los datos del cliente, incluyendo los nuevos (teléfono e instagram)
        const meta = session.user.user_metadata || {};
        document.getElementById('perfil-nombre').value = meta.nombre || '';
        document.getElementById('perfil-apellido').value = meta.apellido || '';
        document.getElementById('perfil-telefono').value = meta.telefono || '';
        document.getElementById('perfil-instagram').value = meta.instagram || '';
        document.getElementById('perfil-email').textContent = session.user.email;

        // VERIFICAMOS SI EL USUARIO ESTÁ EN LA LISTA DE ADMINS
        if (correosAdmin.includes(session.user.email)) {
            adminPanel.classList.remove('oculto'); adminPedidos.classList.remove('oculto'); clientePedidos.classList.add('oculto');
            esAdmin = true; cargarPedidos();
        } else {
            adminPanel.classList.add('oculto'); adminPedidos.classList.add('oculto'); clientePedidos.classList.remove('oculto');
            esAdmin = false; cargarMisPedidos(session.user.email);
        }
    } else {
        modoInvitado = true; esAdmin = false;
        btnNavLogin.classList.remove('oculto'); btnPerfil.classList.add('oculto');
        adminPanel.classList.add('oculto'); adminPedidos.classList.add('oculto'); clientePedidos.classList.add('oculto');
    }
    cargarProductos();
}

document.getElementById('btn-register').addEventListener('click', async () => {
    const email = document.getElementById('email').value; const password = document.getElementById('password').value;
    const nombre = document.getElementById('reg-nombre').value; const apellido = document.getElementById('reg-apellido').value;
    if (!nombre || !apellido || !email || !password) { authMensaje.style.color = "#e74c3c"; authMensaje.textContent = "Por favor, completa todos los campos."; return; }

    authMensaje.style.color = "#333"; authMensaje.textContent = "Registrando...";
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nombre, apellido } } });

    if (error) { authMensaje.style.color = "#e74c3c"; authMensaje.textContent = "Error: " + error.message; } 
    else {
        if (!data.session) { authMensaje.style.color = "green"; authMensaje.textContent = "¡Registro exitoso! Revisa tu correo para verificar tu cuenta."; } 
        else { authMensaje.style.color = "green"; authMensaje.textContent = "¡Registro exitoso! Iniciando sesión..."; verificarSesion(); }
    }
});

document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('email').value; const password = document.getElementById('password').value;
    authMensaje.textContent = "Verificando...";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { authMensaje.style.color = "#e74c3c"; authMensaje.textContent = (error.message.includes("Email not confirmed")) ? "Debes verificar tu correo antes de entrar." : "Credenciales incorrectas."; } 
    else { authMensaje.textContent = ""; verificarSesion(); }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    document.getElementById('email').value = ''; document.getElementById('password').value = '';
    document.getElementById('perfil-modal').classList.add('oculto');
    carrito = []; renderizarCarrito(); verificarSesion(); 
});

document.getElementById('btn-perfil').addEventListener('click', () => { document.getElementById('perfil-modal').classList.toggle('oculto'); });
document.getElementById('btn-cerrar-perfil').addEventListener('click', () => { document.getElementById('perfil-modal').classList.add('oculto'); });

// Guardar los nuevos datos de contacto
document.getElementById('btn-guardar-perfil').addEventListener('click', async () => {
    const btn = document.getElementById('btn-guardar-perfil'); btn.textContent = "Guardando..."; btn.disabled = true;
    const { data, error } = await supabase.auth.updateUser({ 
        data: { 
            nombre: document.getElementById('perfil-nombre').value, 
            apellido: document.getElementById('perfil-apellido').value,
            telefono: document.getElementById('perfil-telefono').value,
            instagram: document.getElementById('perfil-instagram').value
        } 
    });
    if (error) alert("Error al guardar: " + error.message); else alert("¡Perfil actualizado con éxito!");
    btn.textContent = "Guardar Cambios"; btn.disabled = false;
});

// ==========================================
// PRODUCTOS EN PANTALLA
// ==========================================
async function cargarProductos() {
    const { data: productos, error } = await supabase.from('productos').select('*').order('id', { ascending: true });
    if (error) return; productosActuales = productos; renderizarProductos(productosActuales);
}

function renderizarProductos(productos) {
    contenedorProductos.innerHTML = ''; 
    productos.forEach(producto => {
        const div = document.createElement('div'); div.className = 'producto-card';
        const botonesAdmin = esAdmin ? `
            <div style="display: flex; gap: 5px; margin-top: 10px;">
                <button onclick="window.editarProducto(${producto.id})" class="btn-verde" style="flex: 1; background: #f39c12; padding: 8px;">✏️ Editar</button>
                <button onclick="window.eliminarProducto(${producto.id})" class="btn-rojo" style="flex: 1; padding: 8px;">🗑️ Eliminar</button>
            </div>` : '';

        let selectColoresHTML = ''; let botonDeshabilitado = producto.stock === 0 ? 'disabled' : ''; let textoBoton = producto.stock === 0 ? 'Sin stock' : 'Agregar al Carrito';
        let hasColors = producto.stock_colores && Object.keys(producto.stock_colores).length > 0;
        
        if (hasColors) {
            let opciones = '';
            for (const [color, cant] of Object.entries(producto.stock_colores)) {
                if (cant > 0) opciones += `<option value="${color}">${color} (Disponibles: ${cant})</option>`;
            }
            if (opciones === '') { opciones = `<option disabled>Agotado en todos los colores</option>`; botonDeshabilitado = 'disabled'; textoBoton = 'Agotado'; }
            selectColoresHTML = `<select id="color-${producto.id}" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 6px;">${opciones}</select>`;
        }

        div.innerHTML = `
            <img src="${producto.imagen_url || 'https://via.placeholder.com/300x250'}" alt="${producto.nombre}" class="producto-img" onerror="this.src='https://via.placeholder.com/300x250?text=Sin+Imagen'">
            <div class="producto-info">
                <h3>${producto.nombre}</h3><p>${producto.descripcion || 'Sin descripción'}</p><p class="producto-precio">$${producto.precio || 0}</p><p class="stock-info">Stock total: ${producto.stock}</p>
            </div>
            <div class="producto-acciones">
                ${selectColoresHTML}
                <input type="number" id="cant-${producto.id}" value="1" min="1" max="${producto.stock}" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box;">
                <button onclick="window.agregarAlCarrito(${producto.id})" ${botonDeshabilitado} class="btn-verde" style="width: 100%;">${textoBoton}</button>
                ${botonesAdmin}
            </div>
        `;
        contenedorProductos.appendChild(div);
    });
}

// ==========================================
// CARRITO Y RESERVAS
// ==========================================
window.agregarAlCarrito = function(id) {
    const producto = productosActuales.find(p => p.id === id); const inputCantidad = document.getElementById(`cant-${id}`); const cantidadPedida = parseInt(inputCantidad.value);
    let colorSeleccionado = null; let hasColors = producto.stock_colores && Object.keys(producto.stock_colores).length > 0;
    if (hasColors) {
        colorSeleccionado = document.getElementById(`color-${id}`).value;
        if (!colorSeleccionado) { alert("Color agotado o no seleccionado."); return; }
    }
    let stockDisponible = hasColors ? producto.stock_colores[colorSeleccionado] : producto.stock;
    const idEnCarrito = colorSeleccionado ? `${id}-${colorSeleccionado}` : `${id}`;
    const cantidadEnCarrito = carrito.filter(item => item.cartItemId === idEnCarrito).reduce((acc, item) => acc + item.cantidad, 0);
    
    if ((cantidadPedida + cantidadEnCarrito) > stockDisponible) { alert(`Stock insuficiente de esa variante. Solo quedan ${stockDisponible}.`); return; }

    const nombreCart = colorSeleccionado ? `${producto.nombre} (${colorSeleccionado})` : producto.nombre;
    carrito.push({ cartItemId: idEnCarrito, id: producto.id, color: colorSeleccionado, nombre: nombreCart, precio: producto.precio, cantidad: cantidadPedida, subtotal: producto.precio * cantidadPedida });
    inputCantidad.value = 1; renderizarCarrito();
}

window.quitarDelCarrito = function(index) { carrito.splice(index, 1); renderizarCarrito(); }

function renderizarCarrito() {
    const contenedor = document.getElementById('contenido-carrito'); const spanTotal = document.getElementById('total-carrito'); const btnConfirmar = document.getElementById('btn-confirmar-reserva');
    const btnFlotante = document.getElementById('btn-flotante-carrito'); 
    const burbujaNotificacion = document.getElementById('cantidad-flotante'); 
    contenedor.innerHTML = ''; let total = 0;

    if (carrito.length === 0) {
        contenedor.innerHTML = '<p style="color: #7f8c8d; text-align: center;">El carrito está vacío</p>';
        spanTotal.textContent = '0.00'; btnConfirmar.disabled = true;
        btnFlotante.classList.remove('mostrar'); burbujaNotificacion.textContent = '0';
        return;
    }
    
    btnFlotante.classList.add('mostrar');
    let unidadesTotales = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    burbujaNotificacion.textContent = unidadesTotales;

    carrito.forEach((item, index) => {
        total += item.subtotal;
        const div = document.createElement('div'); div.className = 'carrito-item';
        div.innerHTML = `<div class="carrito-item-info"><h4>${item.nombre}</h4><p>${item.cantidad} un. x $${item.precio} = <strong>$${item.subtotal}</strong></p></div>
            <button onclick="window.quitarDelCarrito(${index})" class="btn-quitar">✖</button>`;
        contenedor.appendChild(div);
    });
    spanTotal.textContent = total.toFixed(2); btnConfirmar.disabled = false;
}

document.getElementById('btn-confirmar-reserva').addEventListener('click', async () => {
    if (carrito.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        alert("¡Tu carrito está listo! Por favor, inicia sesión o regístrate para confirmar tu reserva.");
        appContainer.classList.add('oculto'); authContainer.classList.remove('oculto');
        document.getElementById('auth-mensaje').style.color = "#3483fa"; document.getElementById('auth-mensaje').textContent = "Inicia sesión para completar tu compra.";
        return;
    }

    const btnConfirmar = document.getElementById('btn-confirmar-reserva'); btnConfirmar.textContent = "Procesando..."; btnConfirmar.disabled = true;
    const total = carrito.reduce((acc, item) => acc + item.subtotal, 0);
    
    // Obtenemos los datos completos del cliente
    const meta = session.user.user_metadata || {};
    const nombreCompleto = ((meta.nombre || '') + " " + (meta.apellido || '')).trim();
    const emailMostrar = nombreCompleto ? `${nombreCompleto} (${session.user.email})` : session.user.email;
    
    // Creamos el JSON con sus datos de contacto
    const contactoInfo = {
        email: session.user.email,
        telefono: meta.telefono || 'No especificó',
        instagram: meta.instagram || 'No especificó'
    };

    const { error: errorPedido } = await supabase.from('pedidos').insert([{ 
        usuario_email: emailMostrar, 
        contacto: contactoInfo, 
        productos_comprados: carrito, 
        total: total, 
        estado: 'Pendiente' 
    }]);

    if (errorPedido) { alert("Error al procesar reserva. Asegúrate de haber ejecutado el código SQL para agregar la columna 'contacto'."); btnConfirmar.textContent = "Confirmar Reserva"; btnConfirmar.disabled = false; return; }

    for (let item of carrito) {
        const productoOriginal = productosActuales.find(p => p.id === item.id); let nuevoStock = productoOriginal.stock - item.cantidad; let nuevosColores = { ...productoOriginal.stock_colores };
        if (item.color && nuevosColores[item.color] !== undefined) nuevosColores[item.color] -= item.cantidad;
        await supabase.from('productos').update({ stock: nuevoStock, stock_colores: nuevosColores }).eq('id', item.id);
    }

    alert("¡Reserva confirmada con éxito!\n\nPor favor, contáctate con nosotros para confirmar el método de pago y coordinar la entrega:\n\n📱 WhatsApp: +54 9 2255-410841\n📸 Instagram: @sebastian.3d.vg\n✉️ Correo: sebastian.3d.vg@gmail.com\n\nTu pedido ha sido guardado en tu panel.");
    
    carrito = []; renderizarCarrito(); cargarProductos(); 
    if (esAdmin) cargarPedidos(); else {
        cargarMisPedidos(session.user.email);
        setTimeout(() => { document.getElementById('cliente-pedidos').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    }
    btnConfirmar.textContent = "Confirmar Reserva";
});

// ==========================================
// GESTIÓN Y LIMPIEZA DE PEDIDOS
// ==========================================
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

window.eliminarRegistroPedido = async function(idPedido) {
    if(!confirm("¿Seguro que quieres borrar este pedido del historial permanentemente?")) return;
    const { error } = await supabase.from('pedidos').delete().eq('id', idPedido);
    if (error) alert("Error al eliminar: " + error.message);
    else {
        if (esAdmin) cargarPedidos(); 
        else { const { data: { session } } = await supabase.auth.getSession(); cargarMisPedidos(session.user.email); }
    }
}

async function cargarPedidos() {
    if (!esAdmin) return;
    const { data: pedidos, error } = await supabase.from('pedidos').select('*').order('fecha', { ascending: false });
    if (error) return; todosLosPedidos = pedidos; renderizarPedidos();
}

function renderizarPedidos() {
    const contenedorPedidos = document.getElementById('lista-pedidos'); const filtroActual = document.getElementById('filtro-pedidos').value; contenedorPedidos.innerHTML = '';
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
        
        const botonBorrarRegistro = `<button onclick="window.eliminarRegistroPedido(${pedido.id})" style="background: transparent; border: none; color: #e74c3c; cursor: pointer; font-size: 13px; text-decoration: underline; margin-top: 10px; width: 100%;">🗑️ Eliminar del registro</button>`;

        let tel = pedido.contacto?.telefono || 'No especificó';
        let ig = pedido.contacto?.instagram || 'No especificó';
        let email = pedido.contacto?.email || pedido.usuario_email;
        
        let contactoHtml = `
            <details style="margin-top: 10px; cursor: pointer; background: #f4f6f7; padding: 8px; border-radius: 4px; border: 1px solid #d5dbdb;">
                <summary style="color: #2980b9; font-weight: bold; font-size: 0.9em; outline: none;">📞 Ver datos de contacto</summary>
                <div style="margin-top: 8px; font-size: 0.85em; color: #333; display: flex; flex-direction: column; gap: 5px;">
                    <span>✉️ <strong>Correo:</strong> ${email}</span>
                    <span>📱 <strong>Teléfono:</strong> ${tel}</span>
                    <span>📸 <strong>Instagram:</strong> ${ig}</span>
                </div>
            </details>
        `;

        const div = document.createElement('div'); div.style.cssText = "background: white; padding: 12px; border-radius: 6px; border: 1px solid #ccc; font-size: 0.9em;";
        div.innerHTML = `<div style="margin-bottom: 8px;"><strong>Orden #${pedido.id}</strong><br><span style="color: #666;">👤 ${pedido.usuario_email}</span><br>
            <span style="color: #555; display: block; margin: 5px 0;">🛒 ${resumenProductos}</span><span style="color: #27ae60; font-weight: bold; font-size: 1.1em;">Total: $${pedido.total}</span></div>
            <div style="display: flex; gap: 5px; justify-content: space-between; border-top: 1px solid #eee; padding-top: 8px;">${botones}</div>
            ${contactoHtml}
            ${botonBorrarRegistro}`;
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
    const { data: misPedidos, error } = await supabase.from('pedidos').select('*').ilike('usuario_email', `%${email}%`).order('fecha', { ascending: false });
    if (error) return; const contenedor = document.getElementById('lista-mis-pedidos'); contenedor.innerHTML = '';
    if (misPedidos.length === 0) { contenedor.innerHTML = '<p style="color: #666; text-align: center;">No tienes pedidos aún.</p>'; return; }

    misPedidos.forEach(pedido => {
        let resumenProductos = pedido.productos_comprados.map(p => `${p.cantidad}x ${p.nombre}`).join(', '); 
        let estadoHtml = ''; let botonCancelar = ''; let botonEliminar = '';
        
        if (pedido.estado === 'Pendiente') {
            estadoHtml = `<span style="color: #d35400; font-weight: bold;">⏳ Pendiente</span>`;
            botonCancelar = `<button onclick="window.cancelarPedido(${pedido.id})" class="btn-rojo" style="padding: 5px; font-size: 0.8em; width: 100%; margin-top: 5px;">❌ Cancelar Pedido</button>`;
        } else if (pedido.estado === 'Completado') { 
            estadoHtml = `<span style="color: green; font-weight: bold;">✔ Completado</span>`; 
        } else { 
            estadoHtml = `<span style="color: red; font-weight: bold;">✖ Cancelado</span>`; 
            botonEliminar = `<button onclick="window.eliminarRegistroPedido(${pedido.id})" style="background: transparent; border: none; color: #e74c3c; cursor: pointer; font-size: 13px; text-decoration: underline; margin-top: 10px; width: 100%;">🗑️ Eliminar historial</button>`;
        }
        
        const div = document.createElement('div'); div.style.cssText = "background: #f8f9f9; padding: 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 0.9em;";
        div.innerHTML = `<div style="margin-bottom: 5px;"><strong>Orden #${pedido.id}</strong><br><span style="color: #555; display: block; margin: 3px 0;">🛒 ${resumenProductos}</span><span style="color: #27ae60; font-weight: bold;">Total: $${pedido.total}</span></div>
            <div style="border-top: 1px solid #eee; padding-top: 5px; text-align: center;">${estadoHtml}${botonCancelar}${botonEliminar}</div>`;
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
window.editarProducto = function(id) {
    const producto = productosActuales.find(p => p.id === id); if (!producto) return;
    document.getElementById('edit-producto-id').value = producto.id; document.getElementById('titulo-panel-admin').textContent = "✏️ Editar Producto 3D";
    document.getElementById('nuevo-nombre').value = producto.nombre; document.getElementById('nuevo-descripcion').value = producto.descripcion; document.getElementById('nuevo-precio').value = producto.precio;
    const contenedorColores = document.getElementById('contenedor-colores'); contenedorColores.innerHTML = '';
    
    if (producto.stock_colores && Object.keys(producto.stock_colores).length > 0) {
        for (const [color, cant] of Object.entries(producto.stock_colores)) {
            const div = document.createElement('div'); div.className = 'color-item';
            div.innerHTML = `<input type="text" value="${color}" class="input-color" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
                <input type="number" value="${cant}" min="0" class="input-stock" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
                <button onclick="this.parentElement.remove()" style="background: transparent; border: none; color: #e74c3c; font-size: 16px; cursor: pointer; padding: 0 10px;">✖</button>`;
            contenedorColores.appendChild(div);
        }
    } else { document.getElementById('btn-add-color').click(); }
    document.getElementById('btn-agregar').textContent = "Guardar Cambios"; document.getElementById('btn-cancelar-edicion').classList.remove('oculto');
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

document.getElementById('btn-cancelar-edicion').addEventListener('click', () => {
    document.getElementById('edit-producto-id').value = ''; document.getElementById('titulo-panel-admin').textContent = "Publicar Nuevo Producto 3D";
    document.getElementById('nuevo-nombre').value = ''; document.getElementById('nuevo-descripcion').value = ''; document.getElementById('nuevo-precio').value = ''; document.getElementById('nuevo-imagen').value = '';
    document.getElementById('contenedor-colores').innerHTML = `<div class="color-item">
            <input type="text" placeholder="Color (Ej: PLA Blanco)" class="input-color" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
            <input type="number" placeholder="Stock" min="0" class="input-stock" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
        </div>`;
    document.getElementById('btn-agregar').textContent = "Publicar Producto"; document.getElementById('btn-cancelar-edicion').classList.add('oculto');
});

document.getElementById('btn-add-color').addEventListener('click', () => {
    const contenedor = document.getElementById('contenedor-colores'); const div = document.createElement('div'); div.className = 'color-item'; 
    div.innerHTML = `<input type="text" placeholder="Color (Ej: PLA Negro)" class="input-color" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
        <input type="number" placeholder="Stock" min="0" class="input-stock" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
        <button onclick="this.parentElement.remove()" style="background: transparent; border: none; color: #e74c3c; font-size: 16px; cursor: pointer; padding: 0 10px;">✖</button>`;
    contenedor.appendChild(div);
});

document.getElementById('btn-agregar').addEventListener('click', async () => {
    const btn = document.getElementById('btn-agregar'); const idEdit = document.getElementById('edit-producto-id').value; 
    btn.textContent = idEdit ? "Guardando cambios..." : "Subiendo imagen y guardando..."; btn.disabled = true;

    const nombre = document.getElementById('nuevo-nombre').value; const descripcion = document.getElementById('nuevo-descripcion').value || 'Sin descripción'; const precio = parseFloat(document.getElementById('nuevo-precio').value);
    const itemsColor = document.querySelectorAll('.color-item'); let stock_colores = {}; let stockTotal = 0;
    itemsColor.forEach(item => {
        const color = item.querySelector('.input-color').value.trim(); const cant = parseInt(item.querySelector('.input-stock').value);
        if (color && !isNaN(cant)) { stock_colores[color] = cant; stockTotal += cant; }
    });

    if (!nombre || isNaN(precio) || stockTotal === 0) { alert("Completa el nombre, precio y al menos un color con stock válido."); btn.textContent = idEdit ? "Guardar Cambios" : "Publicar Producto"; btn.disabled = false; return; }

    const inputImagen = document.getElementById('nuevo-imagen'); let imagen_url = 'https://via.placeholder.com/300x250?text=Sin+Imagen'; 
    if (idEdit) { const productoOriginal = productosActuales.find(p => p.id == idEdit); imagen_url = productoOriginal.imagen_url; }

    if (inputImagen.files.length > 0) {
        const archivo = inputImagen.files[0]; const extension = archivo.name.split('.').pop(); const nombreArchivo = `${Date.now()}.${extension}`; 
        const { data, error: errorUpload } = await supabase.storage.from('productos').upload(nombreArchivo, archivo);
        if (errorUpload) { alert("Error al subir la foto: " + errorUpload.message); btn.textContent = idEdit ? "Guardar Cambios" : "Publicar Producto"; btn.disabled = false; return; }
        const { data: dataUrl } = supabase.storage.from('productos').getPublicUrl(nombreArchivo); imagen_url = dataUrl.publicUrl;
    }

    let errorGuardado;
    if (idEdit) { const { error } = await supabase.from('productos').update({ nombre, descripcion, precio, stock: stockTotal, stock_colores, imagen_url }).eq('id', idEdit); errorGuardado = error; } 
    else { const { error } = await supabase.from('productos').insert([{ nombre, descripcion, precio, stock: stockTotal, stock_colores, imagen_url }]); errorGuardado = error; }

    if (errorGuardado) alert("Hubo un error al guardar: " + errorGuardado.message);
    else { alert(idEdit ? "¡Producto actualizado con éxito!" : "¡Pieza 3D publicada con éxito!"); document.getElementById('btn-cancelar-edicion').click(); cargarProductos(); }
    btn.textContent = idEdit ? "Guardar Cambios" : "Publicar Producto"; btn.disabled = false;
});

verificarSesion();