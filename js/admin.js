import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    doc, 
    getDoc, 
    updateDoc, 
    deleteDoc,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // Verificar estado de autenticación
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuario autenticado
            showAdminPanel();
            loadInitialData();
        } else {
            // No autenticado
            showLoginSection();
        }
    });
    
    // Manejar inicio de sesión
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert("Error al iniciar sesión: " + error.message);
        }
    });
    
    // Manejar cierre de sesión
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    });
    
    // Configurar pestañas
    setupTabs();
    
    // Configurar modales
    setupModals();
});

function showAdminPanel() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
}

function showLoginSection() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
}

async function loadInitialData() {
    await loadCitas();
    await loadBarberos();
    await loadServicios();
}

function setupTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = e.target.getAttribute('data-tab');
            
            // Ocultar todas las pestañas
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Mostrar la pestaña seleccionada
            document.getElementById(`${tabId}Tab`).classList.add('active');
        });
    });
}

function setupModals() {
    // Modal de barberos
    const barberoModal = document.getElementById('barberoModal');
    const agregarBarberoBtn = document.getElementById('agregarBarberoBtn');
    const barberoForm = document.getElementById('barberoForm');
    const barberoClose = barberoModal.querySelector('.close');
    
    agregarBarberoBtn.addEventListener('click', () => {
        document.getElementById('modalBarberoTitulo').textContent = "Agregar Barbero";
        barberoForm.reset();
        barberoModal.style.display = 'block';
    });
    
    barberoClose.addEventListener('click', () => {
        barberoModal.style.display = 'none';
    });
    
    barberoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const barberoData = {
            nombre: document.getElementById('barberoNombre').value,
            especialidad: document.getElementById('barberoEspecialidad').value,
            horario: JSON.parse(document.getElementById('barberoHorarios').value),
            fechaCreacion: serverTimestamp()
        };
        
        try {
            const barberoId = document.getElementById('barberoId').value;

            if (barberoId) {
                // Actualizar barbero existente
                await updateDoc(doc(db, "barberos", barberoId), barberoData);
            } else {
                // Crear nuevo barbero
                await addDoc(collection(db, "barberos"), barberoData);
            }

            barberoModal.style.display = 'none';
            await loadBarberos();
        } catch (error) {
            console.error("Error al guardar barbero:", error);
        }
    });
    setupHorariosSelection(); // <-- ACTIVAR la selección de horarios

    // Modal de servicios (configuración similar)
    // ...
    const servicioModal = document.getElementById('servicioModal');
    const servicioForm = document.getElementById('servicioForm');
    const servicioClose = servicioModal.querySelector('.close');

    document.getElementById('agregarServicioBtn').addEventListener('click', () => {
        document.getElementById('modalServicioTitulo').textContent = "Agregar Servicio";
        servicioForm.reset();
        document.getElementById('servicioId').value = "";
        servicioModal.style.display = 'block';
    });

    servicioForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const servicioId = document.getElementById('servicioId').value;
        const nombre = document.getElementById('servicioNombre').value.trim();
        const descripcion = document.getElementById('servicioDescripcion').value.trim();
        const precio = parseFloat(document.getElementById('servicioPrecio').value);
        const duracion = parseInt(document.getElementById('servicioDuracion').value);

        const servicioData = {
            nombre,
            descripcion,
            precio,
            duracion,
            fechaCreacion: serverTimestamp()
        };

        try {
            if (servicioId) {
                // Actualizar servicio existente
                await updateDoc(doc(db, "servicios", servicioId), servicioData);
            } else {
                // Crear nuevo servicio
                await addDoc(collection(db, "servicios"), servicioData);
            }

            servicioModal.style.display = 'none';
            await loadServicios();
        } catch (error) {
            console.error("Error al guardar servicio:", error);
            alert("Error al guardar el servicio.");
        }
    });



}

async function loadCitas(fecha = null) {
    const citasTable = document.getElementById('citasTable').querySelector('tbody');
    citasTable.innerHTML = '';
    
    let q;
    if (fecha) {
        q = query(collection(db, "citas"), where("fecha", "==", fecha), orderBy("hora"));
    } else {
        q = query(collection(db, "citas"), orderBy("fecha"), orderBy("hora"));
    }
    
    const querySnapshot = await getDocs(q);
    
    for (const citaDoc of querySnapshot.docs) {
        const cita = citaDoc.data();
        const row = citasTable.insertRow();

        // Obtener nombre del barbero
        let nombreBarbero = "N/A";
        try {
            const barberoDoc = await getDoc(doc(db, "barberos", cita.barberoId));
            if (barberoDoc.exists()) {
            nombreBarbero = barberoDoc.data().nombre;
            }
        } catch (error) {
            console.error("Error al obtener barbero:", error);
        }

        // Obtener nombre del servicio
        let nombreServicio = "N/A";
        try {
            const servicioDoc = await getDoc(doc(db, "servicios", cita.servicioId));
            if (servicioDoc.exists()) {
            nombreServicio = servicioDoc.data().nombre;
            }
        } catch (error) {
            console.error("Error al obtener servicio:", error);
        }

        row.innerHTML = `
            <td>${cita.nombre}</td>
            <td>${cita.cedula || '—'}</td>
            <td>${cita.telefono}</td>
            <td>${nombreBarbero}</td>
            <td>${nombreServicio}</td>
            <td>${cita.fecha}</td>
            <td>${cita.hora}</td>
            <td><span class="estado ${cita.estado}">${cita.estado}</span></td>
            <td class="acciones-cita">
            <button class="btn-estado btn-confirmar" data-id="${citaDoc.id}">Confirmar</button>
            <button class="btn-estado btn-completar" data-id="${citaDoc.id}">Completar</button>
            <button class="btn-estado btn-cancelar" data-id="${citaDoc.id}">Cancelar</button>
            </td>
        `;

        // Colorea la fila según el estado
        row.classList.add(`fila-${cita.estado}`);
     }

    
    document.querySelectorAll('.btn-completar').forEach(btn => {
    btn.addEventListener('click', () => updateCitaEstado(btn.dataset.id, 'completada'));
    });
    document.querySelectorAll('.btn-confirmar').forEach(btn => {
    btn.addEventListener('click', () => updateCitaEstado(btn.dataset.id, 'confirmada'));
    });
    document.querySelectorAll('.btn-cancelar').forEach(btn => {
    btn.addEventListener('click', () => updateCitaEstado(btn.dataset.id, 'cancelada'));
    });


}

async function updateCitaEstado(citaId, estado) {
  try {
    const citaRef = doc(db, "citas", citaId);
    const citaDoc = await getDoc(citaRef);

    if (!citaDoc.exists()) return;

    const cita = citaDoc.data();

    // Si se cancela una cita, elimina la hora ocupada
    if (estado === "cancelada") {
      const barberoRef = doc(db, "barberos", cita.barberoId);
      const barberoDoc = await getDoc(barberoRef);

      if (barberoDoc.exists()) {
        const horarios = barberoDoc.data().horario || [];

        // Agrega el horario de vuelta solo si no estaba
        if (!horarios.includes(cita.hora)) {
          horarios.push(cita.hora);
          await updateDoc(barberoRef, { horario: horarios });
        }
      }
    }

    await updateDoc(citaRef, { estado });
    await loadCitas();
  } catch (error) {
    console.error("Error al actualizar cita:", error);
  }
}



async function loadBarberos() {
    const barberosTable = document.getElementById('barberosTable').querySelector('tbody');
    barberosTable.innerHTML = '';

    const querySnapshot = await getDocs(collection(db, "barberos"));

    querySnapshot.forEach((docSnap) => {
        const barbero = docSnap.data();
        const row = barberosTable.insertRow();

        row.innerHTML = `
            <td>${barbero.nombre}</td>
            <td>${barbero.especialidad || 'N/A'}</td>
            <td>${Array.isArray(barbero.horario) ? barbero.horario.join(', ') : 'N/A'}</td>
            <td>
                <button class="btn-editar" data-id="${docSnap.id}">Editar</button>
                <button class="btn-eliminar" data-id="${docSnap.id}">Eliminar</button>
            </td>
        `;

        // === Agregar el evento de "Editar" ===
        row.querySelector('.btn-editar').addEventListener('click', async () => {
            try {
                const docRef = doc(db, "barberos", docSnap.id);
                const barberoDoc = await getDoc(docRef);

                if (barberoDoc.exists()) {
                    const barberoData = barberoDoc.data();

                    document.getElementById('modalBarberoTitulo').textContent = "Editar Barbero";
                    document.getElementById('barberoId').value = docSnap.id;
                    document.getElementById('barberoNombre').value = barberoData.nombre || '';
                    document.getElementById('barberoEspecialidad').value = barberoData.especialidad || '';

                    // Cargar horarios
                    window.cargarHorariosBarbero(Array.isArray(barberoData.horario) ? barberoData.horario : []);

                    // Mostrar modal
                    document.getElementById('barberoModal').style.display = 'block';
                }
            } catch (error) {
                console.error("Error al cargar barbero:", error);
            }
        });

        // === Agregar el evento de "Eliminar" ===
        row.querySelector('.btn-eliminar').addEventListener('click', async () => {
            const confirmacion = confirm("¿Estás seguro de que deseas eliminar este barbero? Esta acción no se puede deshacer.");

            if (confirmacion) {
                try {
                    await deleteDoc(doc(db, "barberos", docSnap.id));
                    alert("Barbero eliminado correctamente.");
                    await loadBarberos();
                } catch (error) {
                    console.error("Error al eliminar barbero:", error);
                    alert("Ocurrió un error al eliminar el barbero.");
                }
            }
        });
    });
}


async function loadServicios() {
    const serviciosTable = document.getElementById('serviciosTable').querySelector('tbody');
    serviciosTable.innerHTML = '';
    
    const querySnapshot = await getDocs(collection(db, "servicios"));
    
    querySnapshot.forEach((docSnap) => {
        const servicio = docSnap.data();
        const row = serviciosTable.insertRow();

        row.innerHTML = `
            <td>${servicio.nombre}</td>
            <td>${servicio.descripcion || 'N/A'}</td>
            <td>$${servicio.precio}</td>
            <td>${servicio.duracion} min</td>
            <td>
            <button class="btn-editar" data-id="${docSnap.id}">Editar</button>
            <button class="btn-eliminar" data-id="${docSnap.id}">Eliminar</button>
            </td>
        `;

        // 👉 Evento editar
        row.querySelector('.btn-editar').addEventListener('click', async () => {
            try {
            const docRef = doc(db, "servicios", docSnap.id);
            const servicioDoc = await getDoc(docRef);

            if (servicioDoc.exists()) {
                const data = servicioDoc.data();

                document.getElementById('modalServicioTitulo').textContent = "Editar Servicio";
                document.getElementById('servicioId').value = docSnap.id;
                document.getElementById('servicioNombre').value = data.nombre || '';
                document.getElementById('servicioDescripcion').value = data.descripcion || '';
                document.getElementById('servicioPrecio').value = data.precio || '';
                document.getElementById('servicioDuracion').value = data.duracion || '';

                document.getElementById('servicioModal').style.display = 'block';
            }
            } catch (error) {
            console.error("Error al cargar servicio:", error);
            }
        });

        // 👉 Evento eliminar
        row.querySelector('.btn-eliminar').addEventListener('click', async () => {
            const confirmar = confirm("¿Seguro que deseas eliminar este servicio?");
            if (confirmar) {
            try {
                await deleteDoc(doc(db, "servicios", docSnap.id));
                await loadServicios();
            } catch (error) {
                console.error("Error al eliminar servicio:", error);
            }
            }
        });
    });

    
    // Configurar botones de editar/eliminar
    // ...
}

function setupHorariosSelection() {
    let horariosSeleccionados = [];

    // Referencia al input oculto
    const inputHorarios = document.getElementById('barberoHorarios');

    // Inicializar eventos para cada botón de horario
    document.querySelectorAll('.hora-btn').forEach(btn => {
        const hora = btn.getAttribute('data-hora');

        // Hover: mostrar rojo si ya está seleccionado
        btn.addEventListener('mouseenter', () => {
            if (btn.classList.contains('seleccionado')) {
                btn.classList.add('por-remover'); // Se verá rojo
            }
        });

        btn.addEventListener('mouseleave', () => {
            btn.classList.remove('por-remover');
        });

        // Clic: alternar selección
        btn.addEventListener('click', () => {
            if (btn.classList.contains('seleccionado')) {
                btn.classList.remove('seleccionado');
                horariosSeleccionados = horariosSeleccionados.filter(h => h !== hora);
            } else {
                btn.classList.add('seleccionado');
                horariosSeleccionados.push(hora);
            }

            inputHorarios.value = JSON.stringify(horariosSeleccionados);
        });
    });

    // Función pública para cargar horarios desde la base de datos (editar barbero)
    window.cargarHorariosBarbero = function(horarios) {
        horariosSeleccionados = horarios || [];
        inputHorarios.value = JSON.stringify(horariosSeleccionados);

        document.querySelectorAll('.hora-btn').forEach(btn => {
            const hora = btn.getAttribute('data-hora');
            if (horariosSeleccionados.includes(hora)) {
                btn.classList.add('seleccionado');
            } else {
                btn.classList.remove('seleccionado');
            }
        });
    };
}
