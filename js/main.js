// import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// async function testFirebaseConnection() {
//   try {
//     console.log("Intentando conectar con Firestore...");
//     const querySnapshot = await getDocs(collection(db, "testConnection"));
//     console.log("✅ Conexión exitosa con Firestore");
//     return true;
//   } catch (error) {
//     console.error("❌ Error de conexión con Firestore:", error);
//     console.log("Código de error:", error.code);
//     console.log("Mensaje:", error.message);
//     return false;
//   }
// }

// // Ejecuta la prueba
// testFirebaseConnection();

// import { auth, db } from './firebase-config.js';
// import { collection, addDoc, getDocs, query, where, getDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// document.addEventListener('DOMContentLoaded', async () => {
//     // Cargar barberos y servicios desde Firebase
//     await cargarBarberos();
//     await cargarServicios();
    
//     // Configurar fecha mínima (hoy)
//     const fechaInput = document.getElementById('fecha');
//     const hoy = new Date().toISOString().split('T')[0];
//     fechaInput.min = hoy;
    
//     // Manejar envío del formulario
//     const reservaForm = document.getElementById('reservaForm');
//     reservaForm.addEventListener('submit', async (e) => {
//         e.preventDefault();
        
//         const nombre = document.getElementById('nombre').value;
//         const telefono = document.getElementById('telefono').value;
//         const barberoId = document.getElementById('barbero').value;
//         const servicioId = document.getElementById('servicio').value;
//         const fecha = document.getElementById('fecha').value;
//         const hora = document.getElementById('hora').value;
        
//         try {
//             // Verificar disponibilidad
//             const disponible = await verificarDisponibilidad(barberoId, fecha, hora);
            
//             if (!disponible) {
//                 document.getElementById('mensaje').textContent = "El barbero no está disponible en ese horario.";
//                 return;
//             }
            
//             // Crear reserva
//             await addDoc(collection(db, "citas"), {
//                 nombre,
//                 telefono,
//                 barberoId,
//                 servicioId,
//                 fecha,
//                 hora,
//                 estado: "pendiente",
//                 fechaCreacion: new Date()
//             });
            
//             document.getElementById('mensaje').textContent = "¡Cita reservada con éxito!";
//             reservaForm.reset();
//         } catch (error) {
//             console.error("Error al reservar cita:", error);
//             document.getElementById('mensaje').textContent = "Error al reservar la cita. Por favor, inténtalo de nuevo.";
//         }
//     });
// });

// async function cargarBarberos() {
//     const barberosSelect = document.getElementById('barbero');
//     const querySnapshot = await getDocs(collection(db, "barberos"));
    
//     querySnapshot.forEach((doc) => {
//         const option = document.createElement('option');
//         option.value = doc.id;
//         option.textContent = doc.data().nombre;
//         barberosSelect.appendChild(option);
//     });
// }

// async function cargarServicios() {
//     const serviciosSelect = document.getElementById('servicio');
//     const querySnapshot = await getDocs(collection(db, "servicios"));
    
//     querySnapshot.forEach((doc) => {
//         const option = document.createElement('option');
//         option.value = doc.id;
//         option.textContent = `${doc.data().nombre} - $${doc.data().precio}`;
//         serviciosSelect.appendChild(option);
//     });
// }

// async function verificarDisponibilidad(barberoId, fecha, hora) {
//     const q = query(
//         collection(db, "citas"),
//         where("barberoId", "==", barberoId),
//         where("fecha", "==", fecha),
//         where("hora", "==", hora)
//     );
    
//     const querySnapshot = await getDocs(q);
//     return querySnapshot.empty;
// }


import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Función para cargar barberos
async function cargarBarberos() {
  try {
    console.log("Cargando barberos...");
    const querySnapshot = await getDocs(collection(db, "barberos"));
    const barberoSelect = document.getElementById('barbero');
    
    querySnapshot.forEach((doc) => {
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = doc.data().nombre;
      barberoSelect.appendChild(option);
    });
    
    console.log("Barberos cargados correctamente");
  } catch (error) {
    console.error("Error al cargar barberos:", error);
    document.getElementById('mensaje').textContent = "Error al cargar la lista de barberos";
  }
}

// Función para cargar servicios
async function cargarServicios() {
  try {
    console.log("Cargando servicios...");
    const querySnapshot = await getDocs(collection(db, "servicios"));
    const servicioSelect = document.getElementById('servicio');
    
    querySnapshot.forEach((doc) => {
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = `${doc.data().nombre} - $${doc.data().precio}`;
      servicioSelect.appendChild(option);
    });
    
    console.log("Servicios cargados correctamente");
  } catch (error) {
    console.error("Error al cargar servicios:", error);
    document.getElementById('mensaje').textContent = "Error al cargar la lista de servicios";
  }
}

// Al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM cargado, iniciando...");
  cargarBarberos();
  cargarServicios();
  
  // Configurar fecha mínima (hoy)
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha').min = hoy;
});