// Importamos Supabase directamente desde la nube (sin instalar nada)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// 1. Configurar la conexión
const supabaseUrl = 'https://xtrkozrfdaepxllbcpol.supabase.co';
const supabaseKey = 'sb_publishable_IMeBYPRYyBUGAuA68qnUNw_4HRdSXkO';
const supabase = createClient(supabaseUrl, supabaseKey);

const contenedorProductos = document.getElementById('lista-productos');

// 2. Función para leer los productos de la base de datos
async function cargarProductos() {
    const { data: productos, error } = await supabase
        .from('productos')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Error al cargar:', error);
        return;
    }

    renderizarProductos(productos);
}

// 3. Mostrar los productos en el HTML
function renderizarProductos(productos) {
    contenedorProductos.innerHTML = ''; // Limpiar el "cargando..."

    productos.forEach(producto => {
        const div = document.createElement('div');
        div.className = 'producto-card';
        div.innerHTML = `
            <div>
                <h3>${producto.nombre}</h3>
                <p class="stock-info">Stock disponible: ${producto.stock}</p>
            </div>
            <div>
                <input type="number" id="cant-${producto.id}" value="1" min="1" max="${producto.stock}">
                <button onclick="window.reservar(${producto.id}, ${producto.stock})" ${producto.stock === 0 ? 'disabled' : ''}>
                    ${producto.stock === 0 ? 'Sin stock' : 'Reservar'}
                </button>
            </div>
        `;
        contenedorProductos.appendChild(div);
    });
}

// 4. Función para reservar (restar stock)
window.reservar = async function(id, stockActual) {
    const inputCantidad = document.getElementById(`cant-${id}`);
    const cantidadAReservar = parseInt(inputCantidad.value);

    if (cantidadAReservar > stockActual) {
        alert("No hay suficiente stock para esa reserva.");
        return;
    }

    const nuevoStock = stockActual - cantidadAReservar;

    // Actualizamos el stock en Supabase
    const { error } = await supabase
        .from('productos')
        .update({ stock: nuevoStock })
        .eq('id', id);

    if (error) {
        alert("Hubo un error al reservar.");
        console.error(error);
    } else {
        alert("¡Reserva exitosa!");
        cargarProductos(); // Recargar la lista para ver el stock actualizado
    }
}

// Iniciar la carga al abrir la página
cargarProductos();