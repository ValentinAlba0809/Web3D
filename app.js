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
let todosLosPedidos = []; // Para el filtro del admin

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

        // LÓGICA DE ROLES
        if (session.user.email === 'valentin@admin.com') {
            adminPanel.classList.remove('oculto');
            adminPedidos.classList.remove('oculto');
            clientePedidos.classList.add('oculto'); // Ocultar panel de cliente
            esAdmin = true;
            cargarPedidos(); // Carga todos los pedidos
        } else {
            adminPanel.classList.add('oculto');
            adminPedidos.classList.add('oculto');
            clientePedidos.classList.remove('oculto'); // Mostrar panel de cliente
            esAdmin = false;
            cargarMisPedidos(session.user.email); // Carga solo sus pedidos
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
        authMensaje.style.color = "#e74c3c";
        authMensaje.textContent = "Error: " + error.message;
    } else {
        authMensaje.style.color = "green";
        authMensaje.textContent = "¡Registro exitoso! Iniciando sesión...";
        await supabase.auth.signInWithPassword({ email, password });
        verificarSesion(); 
    }
});

document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    authMensaje.textContent = "Verificando...";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        authMensaje.style.color = "#e74c3c";
        authMensaje.textContent = "Error: Credenciales incorrectas.";
    } else {
        authMensaje.textContent = "";
        verificarSesion(); 
    }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    carrito = []; 
    renderizarCarrito();
    verificarSesion(); 
});

// ==========================================
// PRODUCTOS
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
        const botonEliminar = esAdmin ? `<button onclick="window.eliminarProducto(${producto.id})" class="btn-rojo" style="margin-top: 10px; width: 100%;">🗑️ Eliminar</button>` : '';

        div.innerHTML = `
            <img src="${producto.imagen_url || 'https://via.placeholder.com/150'}" alt="${producto.nombre}" class="producto-img" onerror="this.src='https://via.placeholder.com/150'">
            <div class="producto-info">
                <h3 style="margin: 0 0 5px 0;">${producto.nombre}</h3>
                <p style="margin: 0 0 10px 0; color: #666; font-size: 0.9em;">${producto.descripcion || 'Sin descripción'}</p>
                <p class="producto-precio">$${producto.precio || 0}</p>
                <p class="stock-info" style="margin: 0;">Stock disponible: ${producto.stock}</p>
            </div>
            <div class="producto-acciones">
                <input type="number" id="cant-${producto.id}" value="1" min="1" max="${producto.stock}" style="width: 50px; margin-bottom: 10px;">
                <button onclick="window.agregarAlCarrito(${producto.id})" ${producto.stock === 0 ? 'disabled' : ''} style="width: 100%;">
                    ${producto.stock === 0 ? 'Sin stock' : 'Agregar al Carrito'}
                </button>
                ${botonEliminar}
            </div>
        `;
        contenedorProductos.appendChild(div);
    });
}

// ==========================================
// CARRITO Y RESERVAS
// ==========================================
window.agregarAlCarrito = function(id) {
    const producto = productosActuales.find(p => p.id === id);
    const inputCantidad = document.getElementById(`cant-${id}`);
    const cantidadPedida = parseInt(inputCantidad.value);
    const cantidadEnCarrito = carrito.filter(item => item.id === id).reduce((acc, item) => acc + item.cantidad, 0);
    
    if ((cantidadPedida + cantidadEnCarrito) > producto.stock) {
        alert(`Stock insuficiente. Ya tienes ${cantidadEnCarrito} en el carrito y solo quedan ${producto.stock} en total.`);
        return;
    }
    carrito.push({ id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: cantidadPedida, subtotal: producto.precio * cantidadPedida });
    inputCantidad.value = 1;
    renderizarCarrito();
}

window.quitarDelCarrito = function(index) {
    carrito.splice(index, 1);
    renderizarCarrito();
}

function renderizarCarrito() {
    const contenedor = document.getElementById('contenido-carrito');
    const spanTotal = document.getElementById('total-carrito');
    const btnConfirmar = document.getElementById('btn-confirmar-reserva');
    
    contenedor.innerHTML = '';
    let total = 0;

    if (carrito.length === 0) {
        contenedor.innerHTML = '<p style="color: #7f8c8d; text-align: center;">El carrito está vacío</p>';
        spanTotal.textContent = '0.00';
        btnConfirmar.disabled = true;
        return;
    }
    carrito.forEach((item, index) => {
        total += item.subtotal;
        const div = document.createElement('div');
        div.className = 'carrito-item';
        div.innerHTML = `
            <div class="carrito-item-info"><h4>${item.nombre}</h4><p>${item.cantidad} un. x $${item.precio} = <strong>$${item.subtotal}</strong></p></div>
            <button onclick="window.quitarDelCarrito(${index})" class="btn-quitar">❌</button>
        `;
        contenedor.appendChild(div);
    });
    spanTotal.textContent = total.toFixed(2);
    btnConfirmar.disabled = false;
}

document.getElementById('btn-confirmar-reserva').addEventListener('click', async () => {
    if (carrito.length === 0) return;
    const btnConfirmar = document.getElementById('btn-confirmar-reserva');
    btnConfirmar.textContent = "Procesando...";
    btnConfirmar.disabled = true;

    const total = carrito.reduce((acc, item) => acc + item.subtotal, 0);
    const { data: { session } } = await supabase.auth.getSession();
    const emailUsuario = session.user.email;

    const { error: errorPedido } = await supabase.from('pedidos').insert([{
        usuario_email: emailUsuario, productos_comprados: carrito, total: total, estado: 'Pendiente'
    }]);

    if (errorPedido) {
        alert("Error al procesar reserva: " + errorPedido.message);
        btnConfirmar.textContent = "Confirmar Reserva";
        btnConfirmar.disabled = false; return;
    }

    for (let item of carrito) {
        const productoOriginal = productosActuales.find(p => p.id === item.id);
        await supabase.from('productos').update({ stock: productoOriginal.stock - item.cantidad }).eq('id', item.id);
    }

    alert("¡Reserva confirmada con éxito!\n\nPor favor, envíanos un mensaje por mensaje privado a nuestro Instagram para confirmar el pago y coordinar la entrega.\n\nTu pedido ha sido guardado.");
    
    carrito = [];
    renderizarCarrito();
    cargarProductos(); 
    
    // Actualizar la lista correspondiente según quién compró
    if (esAdmin) cargarPedidos();
    else cargarMisPedidos(emailUsuario);

    btnConfirmar.textContent = "Confirmar Reserva";
});

// ==========================================
// GESTIÓN DE PEDIDOS (COMPARTIDO)
// ==========================================
window.cancelarPedido = async function(idPedido) {
    if(!confirm("¿Seguro que quieres cancelar este pedido? El stock será devuelto.")) return;
    const { data: pedido, error: errorPedido } = await supabase.from('pedidos').select('*').eq('id', idPedido).single();
    if (errorPedido) { alert("Error al buscar el pedido."); return; }
    
    await supabase.from('pedidos').update({ estado: 'Cancelado' }).eq('id', idPedido);
    
    for (let item of pedido.productos_comprados) {
        const { data: prodActual } = await supabase.from('productos').select('stock').eq('id', item.id).single();
        if (prodActual) {
            await supabase.from('productos').update({ stock: prodActual.stock + item.cantidad }).eq('id', item.id);
        }
    }
    alert("Pedido cancelado exitosamente.");
    
    cargarProductos(); // Refresca inventario
    
    // Refresca la lista de la persona que esté logueada
    if (esAdmin) {
        cargarPedidos();
    } else {
        const { data: { session } } = await supabase.auth.getSession();
        cargarMisPedidos(session.user.email);
    }
}

// ==========================================
// GESTIÓN DE PEDIDOS (VISTA ADMIN)
// ==========================================
async function cargarPedidos() {
    if (!esAdmin) return;
    const { data: pedidos, error } = await supabase.from('pedidos').select('*').order('fecha', { ascending: false });
    if (error) return;
    todosLosPedidos = pedidos;
    renderizarPedidos();
}

function renderizarPedidos() {
    const contenedorPedidos = document.getElementById('lista-pedidos');
    const filtroActual = document.getElementById('filtro-pedidos').value;
    contenedorPedidos.innerHTML = '';

    const pedidosFiltrados = todosLosPedidos.filter(pedido => {
        if (filtroActual === 'Todos') return true;
        return pedido.estado === filtroActual;
    });

    if (pedidosFiltrados.length === 0) {
        contenedorPedidos.innerHTML = '<p style="color: #666; text-align: center;">No hay pedidos.</p>'; return;
    }

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
        div.innerHTML = `
            <div style="margin-bottom: 8px;"><strong>Orden #${pedido.id}</strong><br><span style="color: #666;">👤 ${pedido.usuario_email}</span><br>
            <span style="color: #555; display: block; margin: 5px 0;">🛒 ${resumenProductos}</span><span style="color: #27ae60; font-weight: bold; font-size: 1.1em;">Total: $${pedido.total}</span></div>
            <div style="display: flex; gap: 5px; justify-content: space-between; border-top: 1px solid #eee; padding-top: 8px;">${botones}</div>
        `;
        contenedorPedidos.appendChild(div);
    });
}

document.getElementById('filtro-pedidos').addEventListener('change', renderizarPedidos);

window.cambiarEstadoPedido = async function(idPedido, nuevoEstado) {
    if(!confirm("¿Marcar este pedido como pagado y completado?")) return;
    const { error } = await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', idPedido);
    if (error) alert("Error: " + error.message);
    else cargarPedidos(); 
}

// ==========================================
// GESTIÓN DE PEDIDOS (VISTA CLIENTE)
// ==========================================
async function cargarMisPedidos(email) {
    const { data: misPedidos, error } = await supabase.from('pedidos').select('*').eq('usuario_email', email).order('fecha', { ascending: false });
    if (error) return;

    const contenedor = document.getElementById('lista-mis-pedidos');
    contenedor.innerHTML = '';

    if (misPedidos.length === 0) {
        contenedor.innerHTML = '<p style="color: #666; text-align: center;">No tienes pedidos aún.</p>'; return;
    }

    misPedidos.forEach(pedido => {
        let resumenProductos = pedido.productos_comprados.map(p => `${p.cantidad}x ${p.nombre}`).join(', ');
        let estadoHtml = '';
        let botonCancelar = '';
        
        if (pedido.estado === 'Pendiente') {
            estadoHtml = `<span style="color: #d35400; font-weight: bold;">⏳ Pendiente</span>`;
            botonCancelar = `<button onclick="window.cancelarPedido(${pedido.id})" class="btn-rojo" style="padding: 5px; font-size: 0.8em; width: 100%; margin-top: 5px;">❌ Cancelar Pedido</button>`;
        } else if (pedido.estado === 'Completado') {
            estadoHtml = `<span style="color: green; font-weight: bold;">✔ Completado</span>`;
        } else {
            estadoHtml = `<span style="color: red; font-weight: bold;">✖ Cancelado</span>`;
        }

        const div = document.createElement('div');
        div.style.cssText = "background: #f8f9f9; padding: 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 0.9em;";
        div.innerHTML = `
            <div style="margin-bottom: 5px;"><strong>Orden #${pedido.id}</strong><br>
            <span style="color: #555; display: block; margin: 3px 0;">🛒 ${resumenProductos}</span><span style="color: #27ae60; font-weight: bold;">Total: $${pedido.total}</span></div>
            <div style="border-top: 1px solid #eee; padding-top: 5px; text-align: center;">${estadoHtml}${botonCancelar}</div>
        `;
        contenedor.appendChild(div);
    });
}

// ==========================================
// ADMIN: AGREGAR / ELIMINAR PRODUCTOS
// ==========================================
window.eliminarProducto = async function(id) {
    if (confirm("¿Estás súper seguro de que quieres eliminar este producto para siempre?")) {
        const { error } = await supabase.from('productos').delete().eq('id', id);
        if (error) alert("Error al eliminar: " + error.message);
        else cargarProductos(); 
    }
}

document.getElementById('btn-agregar').addEventListener('click', async () => {
    const nombre = document.getElementById('nuevo-nombre').value;
    const descripcion = document.getElementById('nuevo-descripcion').value || 'Sin descripción';
    const precio = parseFloat(document.getElementById('nuevo-precio').value);
    const stock = parseInt(document.getElementById('nuevo-stock').value);
    let imagen_url = document.getElementById('nuevo-imagen').value;
    if (!imagen_url) imagen_url = 'https://via.placeholder.com/150';

    if (!nombre || isNaN(stock) || isNaN(precio)) { alert("Completa al menos nombre, precio y stock."); return; }

    const { error } = await supabase.from('productos').insert([{ nombre, descripcion, precio, stock, imagen_url }]);
    if (error) alert("Error al guardar: " + error.message);
    else {
        alert("¡Producto agregado!");
        document.getElementById('nuevo-nombre').value = '';
        document.getElementById('nuevo-descripcion').value = '';
        document.getElementById('nuevo-precio').value = '';
        document.getElementById('nuevo-stock').value = '';
        document.getElementById('nuevo-imagen').value = '';
        cargarProductos(); 
    }
});

verificarSesion();