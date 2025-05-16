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
            horario: document.getElementById('barberoHorario').value,
            fechaCreacion: serverTimestamp()
        };
        
        try {
            await addDoc(collection(db, "barberos"), barberoData);
            barberoModal.style.display = 'none';
            await loadBarberos();
        } catch (error) {
            console.error("Error al guardar barbero:", error);
        }
    });
    
    // Modal de servicios (configuración similar)
    // ...
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
    
    querySnapshot.forEach(async (doc) => {
        const cita = doc.data();
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
            <td>${cita.telefono}</td>
            <td>${nombreBarbero}</td>
            <td>${nombreServicio}</td>
            <td>${cita.fecha}</td>
            <td>${cita.hora}</td>
            <td>${cita.estado}</td>
            <td>
                <button class="btn-completar" data-id="${doc.id}">Completar</button>
                <button class="btn-cancelar" data-id="${doc.id}">Cancelar</button>
            </td>
        `;
    });
    
    // Configurar botones de acciones
    document.querySelectorAll('.btn-completar').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            await updateCitaEstado(e.target.getAttribute('data-id'), "completada");
        });
    });
    
    document.querySelectorAll('.btn-cancelar').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            await updateCitaEstado(e.target.getAttribute('data-id'), "cancelada");
        });
    });
}

async function updateCitaEstado(citaId, estado) {
    try {
        await updateDoc(doc(db, "citas", citaId), {
            estado: estado
        });
        await loadCitas();
    } catch (error) {
        console.error("Error al actualizar cita:", error);
    }
}

async function loadBarberos() {
    const barberosTable = document.getElementById('barberosTable').querySelector('tbody');
    barberosTable.innerHTML = '';
    
    const querySnapshot = await getDocs(collection(db, "barberos"));
    
    querySnapshot.forEach((doc) => {
        const barbero = doc.data();
        const row = barberosTable.insertRow();
        
        row.innerHTML = `
            <td>${barbero.nombre}</td>
            <td>${barbero.especialidad || 'N/A'}</td>
            <td>${barbero.horario || 'N/A'}</td>
            <td>
                <button class="btn-editar" data-id="${doc.id}">Editar</button>
                <button class="btn-eliminar" data-id="${doc.id}">Eliminar</button>
            </td>
        `;
    });
    
    // Configurar botones de editar/eliminar
    // ...
}

async function loadServicios() {
    const serviciosTable = document.getElementById('serviciosTable').querySelector('tbody');
    serviciosTable.innerHTML = '';
    
    const querySnapshot = await getDocs(collection(db, "servicios"));
    
    querySnapshot.forEach((doc) => {
        const servicio = doc.data();
        const row = serviciosTable.insertRow();
        
        row.innerHTML = `
            <td>${servicio.nombre}</td>
            <td>${servicio.descripcion || 'N/A'}</td>
            <td>$${servicio.precio}</td>
            <td>${servicio.duracion} min</td>
            <td>
                <button class="btn-editar" data-id="${doc.id}">Editar</button>
                <button class="btn-eliminar" data-id="${doc.id}">Eliminar</button>
            </td>
        `;
    });
    
    // Configurar botones de editar/eliminar
    // ...
}