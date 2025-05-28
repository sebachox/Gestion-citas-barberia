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

// Controlador global de eventos para evitar duplicación
const eventListeners = new Map();

function addUniqueListener(element, event, callback) {
    // Eliminar listener existente si hay uno
    const key = `${event}-${element.id || element.className}`;
    const existing = eventListeners.get(key);
    if (existing) {
        element.removeEventListener(event, existing);
    }
    
    // Agregar nuevo listener y guardar referencia
    element.addEventListener(event, callback);
    eventListeners.set(key, callback);
}

document.addEventListener('DOMContentLoaded', () => {
    // Verificar estado de autenticación
    onAuthStateChanged(auth, (user) => {
        if (user) {
            showAdminPanel();
            loadInitialData();
        } else {
            showLoginSection();
        }
    });
    
    // Manejar inicio de sesión
    const loginForm = document.getElementById('loginForm');
    addUniqueListener(loginForm, 'submit', async (e) => {
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
    addUniqueListener(logoutBtn, 'click', async () => {
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

    // Configurar búsquedas
    const busquedaBarbero = document.getElementById('busquedaBarbero');
    addUniqueListener(busquedaBarbero, 'input', (e) => {
        loadBarberos(e.target.value);
    });

    const busquedaServicio = document.getElementById('busquedaServicio');
    addUniqueListener(busquedaServicio, 'input', (e) => {
        loadServicios(e.target.value);
    });

    const busquedaCita = document.getElementById('busquedaCita');
    addUniqueListener(busquedaCita, 'input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
        loadCitas(document.getElementById('fechaFiltro').value, e.target.value);
    });

    // Configurar filtro de fechas
    const filtrarCitas = document.getElementById('filtrarCitas');
    addUniqueListener(filtrarCitas, 'click', () => {
        const fecha = document.getElementById('fechaFiltro').value;
        const cedula = busquedaCita.value;
        loadCitas(fecha, cedula);
    });
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
  const activeTab = document.querySelector('.tab-content.active').id;
  if (activeTab === 'citasTab') await loadCitas();
  if (activeTab === 'barberosTab') await loadBarberos();
  if (activeTab === 'serviciosTab') await loadServicios();
}

function setupTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    
    tabLinks.forEach(link => {
        addUniqueListener(link, 'click', (e) => {
            e.preventDefault();
            const tabId = e.target.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(`${tabId}Tab`).classList.add('active');

            // Cargar datos para la pestaña activa
            if (tabId === 'barberos') loadBarberos(document.getElementById('busquedaBarbero').value);
            if (tabId === 'servicios') loadServicios(document.getElementById('busquedaServicio').value);
            if (tabId === 'citas') loadCitas(document.getElementById('fechaFiltro').value, document.getElementById('busquedaCita').value);
        });
    });
}

function setupModals() {
    // Modal de barberos
    const barberoModal = document.getElementById('barberoModal');
    const agregarBarberoBtn = document.getElementById('agregarBarberoBtn');
    const barberoForm = document.getElementById('barberoForm');
    const barberoClose = barberoModal.querySelector('.close');
    
    addUniqueListener(agregarBarberoBtn, 'click', () => {
        document.getElementById('modalBarberoTitulo').textContent = "Agregar Barbero";
        barberoForm.reset();
        barberoModal.style.display = 'block';
    });
    
    addUniqueListener(barberoClose, 'click', () => {
        barberoModal.style.display = 'none';
    });
    
    addUniqueListener(barberoForm, 'submit', async (e) => {
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
                await updateDoc(doc(db, "barberos", barberoId), barberoData);
            } else {
                await addDoc(collection(db, "barberos"), barberoData);
            }

            barberoModal.style.display = 'none';
            await loadBarberos(document.getElementById('busquedaBarbero').value);
        } catch (error) {
            console.error("Error al guardar barbero:", error);
        }
    });
    
    setupHorariosSelection();

    // Modal de servicios
    const servicioModal = document.getElementById('servicioModal');
    const servicioForm = document.getElementById('servicioForm');
    const servicioClose = servicioModal.querySelector('.close');

    addUniqueListener(document.getElementById('agregarServicioBtn'), 'click', () => {
        document.getElementById('modalServicioTitulo').textContent = "Agregar Servicio";
        servicioForm.reset();
        document.getElementById('servicioId').value = "";
        servicioModal.style.display = 'block';
    });

    addUniqueListener(servicioForm, 'submit', async (e) => {
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
                await updateDoc(doc(db, "servicios", servicioId), servicioData);
            } else {
                await addDoc(collection(db, "servicios"), servicioData);
            }

            servicioModal.style.display = 'none';
            await loadServicios(document.getElementById('busquedaServicio').value);
        } catch (error) {
            console.error("Error al guardar servicio:", error);
            alert("Error al guardar el servicio.");
        }
    });
}

async function loadCitas(fecha = null, cedulaFiltro = "") {
    const citasTable = document.getElementById('citasTable').querySelector('tbody');
    citasTable.innerHTML = '<tr><td colspan="9">Cargando citas...</td></tr>';
    
    try {
        let q;
        if (fecha) {
            q = query(collection(db, "citas"), 
                where("fecha", "==", fecha), 
                orderBy("hora"));
        } else {
            q = query(collection(db, "citas"), 
                orderBy("fecha", "desc"), 
                orderBy("hora"));
        }
        
        const querySnapshot = await getDocs(q);
        citasTable.innerHTML = '';
        
        if (querySnapshot.empty) {
            citasTable.innerHTML = '<tr><td colspan="9">No se encontraron citas</td></tr>';
            return;
        }

        const rows = [];
        const citaActions = [];
        
        for (const citaDoc of querySnapshot.docs) {
            const cita = citaDoc.data();
            if (cedulaFiltro.trim() && !(cita.cedula || "").includes(cedulaFiltro)) {
                continue;
            }

            const [barberoData, servicioData] = await Promise.all([
                getDoc(doc(db, "barberos", cita.barberoId)),
                getDoc(doc(db, "servicios", cita.servicioId))
            ]);

            const rowHTML = `
                <tr class="fila-${cita.estado}">
                    <td>${cita.nombre}</td>
                    <td>${cita.cedula || '—'}</td>
                    <td>${cita.telefono}</td>
                    <td>${barberoData.exists() ? barberoData.data().nombre : "N/A"}</td>
                    <td>${servicioData.exists() ? servicioData.data().nombre : "N/A"}</td>
                    <td>${cita.fecha}</td>
                    <td>${cita.hora}</td>
                    <td><span class="estado ${cita.estado}">${cita.estado}</span></td>
                    <td class="acciones-cita">
                        <button class="btn-estado btn-confirmar" data-id="${citaDoc.id}">Confirmar</button>
                        <button class="btn-estado btn-completar" data-id="${citaDoc.id}">Completar</button>
                        <button class="btn-estado btn-cancelar" data-id="${citaDoc.id}">Cancelar</button>
                    </td>
                </tr>
            `;
            
            rows.push(rowHTML);
            citaActions.push({
                id: citaDoc.id,
                estado: cita.estado
            });
        }

        citasTable.innerHTML = rows.join('');
        setupCitaButtons(citaActions);
        
    } catch (error) {
        console.error("Error al cargar citas:", error);
        citasTable.innerHTML = '<tr><td colspan="9">Error al cargar las citas</td></tr>';
    }
}

function setupCitaButtons(citas) {
    citas.forEach(cita => {
        const confirmarBtn = document.querySelector(`.btn-confirmar[data-id="${cita.id}"]`);
        const completarBtn = document.querySelector(`.btn-completar[data-id="${cita.id}"]`);
        const cancelarBtn = document.querySelector(`.btn-cancelar[data-id="${cita.id}"]`);
        
        if (confirmarBtn) {
            addUniqueListener(confirmarBtn, 'click', () => updateCitaEstado(cita.id, 'confirmada'));
        }
        
        if (completarBtn) {
            addUniqueListener(completarBtn, 'click', () => updateCitaEstado(cita.id, 'completada'));
        }
        
        if (cancelarBtn) {
            addUniqueListener(cancelarBtn, 'click', () => updateCitaEstado(cita.id, 'cancelada'));
        }
    });
}

async function updateCitaEstado(citaId, estado) {
  try {
    const citaRef = doc(db, "citas", citaId);
    const citaDoc = await getDoc(citaRef);

    if (!citaDoc.exists()) return;

    const cita = citaDoc.data();

    if (estado === "cancelada") {
      const barberoRef = doc(db, "barberos", cita.barberoId);
      const barberoDoc = await getDoc(barberoRef);

      if (barberoDoc.exists()) {
        const horarios = barberoDoc.data().horario || [];
        if (!horarios.includes(cita.hora)) {
          horarios.push(cita.hora);
          await updateDoc(barberoRef, { horario: horarios });
        }
      }
    }

    await updateDoc(citaRef, { estado });
    
    // Recargar citas manteniendo filtros
    const fecha = document.getElementById('fechaFiltro').value;
    const cedula = document.getElementById('busquedaCita').value;
    await loadCitas(fecha, cedula);
    
  } catch (error) {
    console.error("Error al actualizar cita:", error);
  }
}

async function loadBarberos(filtro = "") {
    const barberosTable = document.getElementById('barberosTable').querySelector('tbody');
    barberosTable.innerHTML = '<tr><td colspan="4">Cargando barberos...</td></tr>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "barberos"));
        barberosTable.innerHTML = '';
        
        if (querySnapshot.empty) {
            barberosTable.innerHTML = '<tr><td colspan="4">No se encontraron barberos</td></tr>';
            return;
        }

        const rows = [];
        const barberoActions = [];
        
        querySnapshot.forEach((docSnap) => {
            const barbero = docSnap.data();
            if (filtro.trim() && !(barbero.nombre || "").toLowerCase().includes(filtro.toLowerCase())) {
                return;
            }
            
            const rowHTML = `
                <tr>
                    <td>${barbero.nombre}</td>
                    <td>${barbero.especialidad || 'N/A'}</td>
                    <td>${Array.isArray(barbero.horario) ? barbero.horario.join(', ') : 'N/A'}</td>
                    <td>
                        <button class="btn-editar" data-id="${docSnap.id}">Editar</button>
                        <button class="btn-eliminar" data-id="${docSnap.id}">Eliminar</button>
                    </td>
                </tr>
            `;
            
            rows.push(rowHTML);
            barberoActions.push({
                id: docSnap.id,
                nombre: barbero.nombre
            });
        });

        barberosTable.innerHTML = rows.join('');
        setupBarberoButtons(barberoActions);
        
    } catch (error) {
        console.error("Error al cargar barberos:", error);
        barberosTable.innerHTML = '<tr><td colspan="4">Error al cargar barberos</td></tr>';
    }
}

function setupBarberoButtons(barberos) {
    barberos.forEach(barbero => {
        const editarBtn = document.querySelector(`.btn-editar[data-id="${barbero.id}"]`);
        const eliminarBtn = document.querySelector(`.btn-eliminar[data-id="${barbero.id}"]`);
        
        if (editarBtn) {
            addUniqueListener(editarBtn, 'click', async () => {
                try {
                    const docRef = doc(db, "barberos", barbero.id);
                    const barberoDoc = await getDoc(docRef);

                    if (barberoDoc.exists()) {
                        const barberoData = barberoDoc.data();
                        document.getElementById('modalBarberoTitulo').textContent = "Editar Barbero";
                        document.getElementById('barberoId').value = barbero.id;
                        document.getElementById('barberoNombre').value = barberoData.nombre || '';
                        document.getElementById('barberoEspecialidad').value = barberoData.especialidad || '';
                        window.cargarHorariosBarbero(Array.isArray(barberoData.horario) ? barberoData.horario : []);
                        document.getElementById('barberoModal').style.display = 'block';
                    }
                } catch (error) {
                    console.error("Error al cargar barbero:", error);
                }
            });
        }
        
        if (eliminarBtn) {
            addUniqueListener(eliminarBtn, 'click', async () => {
                const confirmacion = confirm(`¿Estás seguro de eliminar a ${barbero.nombre}?`);
                if (confirmacion) {
                    try {
                        await deleteDoc(doc(db, "barberos", barbero.id));
                        await loadBarberos(document.getElementById('busquedaBarbero').value);
                    } catch (error) {
                        console.error("Error al eliminar barbero:", error);
                    }
                }
            });
        }
    });
}

async function loadServicios(filtro = "") {
    const serviciosTable = document.getElementById('serviciosTable').querySelector('tbody');
    serviciosTable.innerHTML = '<tr><td colspan="5">Cargando servicios...</td></tr>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "servicios"));
        serviciosTable.innerHTML = '';
        
        if (querySnapshot.empty) {
            serviciosTable.innerHTML = '<tr><td colspan="5">No se encontraron servicios</td></tr>';
            return;
        }

        const rows = [];
        const servicioActions = [];
        
        querySnapshot.forEach((docSnap) => {
            const servicio = docSnap.data();
            if (filtro.trim() && !(servicio.nombre || '').toLowerCase().includes(filtro.toLowerCase())) {
                return;
            }

            const rowHTML = `
                <tr>
                    <td>${servicio.nombre}</td>
                    <td>${servicio.descripcion || 'N/A'}</td>
                    <td>$${servicio.precio}</td>
                    <td>${servicio.duracion} min</td>
                    <td>
                        <button class="btn-editar" data-id="${docSnap.id}">Editar</button>
                        <button class="btn-eliminar" data-id="${docSnap.id}">Eliminar</button>
                    </td>
                </tr>
            `;
            
            rows.push(rowHTML);
            servicioActions.push({
                id: docSnap.id,
                nombre: servicio.nombre
            });
        });

        serviciosTable.innerHTML = rows.join('');
        setupServicioButtons(servicioActions);
        
    } catch (error) {
        console.error("Error al cargar servicios:", error);
        serviciosTable.innerHTML = '<tr><td colspan="5">Error al cargar servicios</td></tr>';
    }
}

function setupServicioButtons(servicios) {
    servicios.forEach(servicio => {
        const editarBtn = document.querySelector(`.btn-editar[data-id="${servicio.id}"]`);
        const eliminarBtn = document.querySelector(`.btn-eliminar[data-id="${servicio.id}"]`);
        
        if (editarBtn) {
            addUniqueListener(editarBtn, 'click', async () => {
                try {
                    const docRef = doc(db, "servicios", servicio.id);
                    const servicioDoc = await getDoc(docRef);

                    if (servicioDoc.exists()) {
                        const data = servicioDoc.data();
                        document.getElementById('modalServicioTitulo').textContent = "Editar Servicio";
                        document.getElementById('servicioId').value = servicio.id;
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
        }
        
        if (eliminarBtn) {
            addUniqueListener(eliminarBtn, 'click', async () => {
                const confirmar = confirm(`¿Seguro que deseas eliminar el servicio: ${servicio.nombre}?`);
                if (confirmar) {
                    try {
                        await deleteDoc(doc(db, "servicios", servicio.id));
                        await loadServicios(document.getElementById('busquedaServicio').value);
                    } catch (error) {
                        console.error("Error al eliminar servicio:", error);
                    }
                }
            });
        }
    });
}

function setupHorariosSelection() {
    let horariosSeleccionados = [];
    const inputHorarios = document.getElementById('barberoHorarios');

    document.querySelectorAll('.hora-btn').forEach(btn => {
        const hora = btn.getAttribute('data-hora');

        addUniqueListener(btn, 'mouseenter', () => {
            if (btn.classList.contains('seleccionado')) {
                btn.classList.add('por-remover');
            }
        });

        addUniqueListener(btn, 'mouseleave', () => {
            btn.classList.remove('por-remover');
        });

        addUniqueListener(btn, 'click', () => {
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