import { db } from './firebase-config.js';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  getDoc,
  updateDoc,
  doc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Función para formatear la hora
function formatearHora(hora) {
  const [horas, minutos] = hora.split(':');
  const horasNum = parseInt(horas);
  const periodo = horasNum >= 12 ? 'PM' : 'AM';
  const horas12 = horasNum % 12 || 12;
  return `${horas12}:${minutos} ${periodo}`;
}

// Función para cargar barberos (sin cambios)
async function cargarBarberos() {
  try {
    console.log("Cargando barberos...");
    const barberoSelect = document.getElementById('barbero');
    barberoSelect.innerHTML = '<option value="">Selecciona un barbero</option>';
    
    const querySnapshot = await getDocs(collection(db, "barberos"));
    
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
    document.getElementById('mensaje').className = "error";
  }
}

// Función para cargar servicios (sin cambios)
async function cargarServicios() {
  try {
    console.log("Cargando servicios...");
    const querySnapshot = await getDocs(collection(db, "servicios"));
    const servicioSelect = document.getElementById('servicio');
    
    servicioSelect.innerHTML = '<option value="">Selecciona un servicio</option>';
    
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
    document.getElementById('mensaje').className = "error";
  }
}

// Función mejorada para cargar horarios disponibles
async function cargarHorariosDisponibles(barberoId, fecha) {
  const horaSelect = document.getElementById('hora');
  
  try {
    horaSelect.innerHTML = '<option value="">Cargando horarios...</option>';
    horaSelect.disabled = true;
    
    if (!barberoId || !fecha) {
      horaSelect.innerHTML = '<option value="">Selecciona barbero y fecha</option>';
      return;
    }
    
    // 1. Obtener horarios del barbero
    const barberoDoc = await getDoc(doc(db, "barberos", barberoId));
    if (!barberoDoc.exists()) {
      horaSelect.innerHTML = '<option value="">Barbero no encontrado</option>';
      return;
    }
    
    const horariosBarbero = barberoDoc.data().horario || [];
    console.log("Horarios del barbero:", horariosBarbero);
    
    // 2. Obtener citas existentes
    const q = query(
      collection(db, "citas"),
      where("barberoId", "==", barberoId),
      where("fecha", "==", fecha)
    );
    
    const querySnapshot = await getDocs(q);
    const horasOcupadas = querySnapshot.docs
      .filter(doc => {
        const estado = doc.data().estado;
        return estado === "confirmada" || estado === "completada";
      })
      .map(doc => doc.data().hora);
    console.log("Horas ocupadas:", horasOcupadas);
    
    // 3. Filtrar horas disponibles
    const horasDisponibles = horariosBarbero.filter(hora => !horasOcupadas.includes(hora));
    horasDisponibles.sort((a, b) => a.localeCompare(b));
    console.log("Horas disponibles:", horasDisponibles);
    
    // 4. Actualizar el select
    horaSelect.innerHTML = horasDisponibles.length > 0 
      ? '<option value="">Selecciona una hora</option>'
      : '<option value="">No hay horarios disponibles</option>';
    
    horasDisponibles.forEach(hora => {
      const option = document.createElement('option');
      option.value = hora;
      option.textContent = formatearHora(hora);
      horaSelect.appendChild(option);
    });
    
    horaSelect.disabled = horasDisponibles.length === 0;
    
  } catch (error) {
    console.error("Error al cargar horarios:", error);
    horaSelect.innerHTML = '<option value="">Error al cargar horarios</option>';
    document.getElementById('mensaje').textContent = "Error al cargar horarios. Intenta nuevamente.";
    document.getElementById('mensaje').className = "error";
  }
}

// Función para verificar disponibilidad (sin cambios)
async function verificarDisponibilidad(barberoId, fecha, hora) {
  try {
    const q = query(
      collection(db, "citas"),
      where("barberoId", "==", barberoId),
      where("fecha", "==", fecha),
      where("hora", "==", hora)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  } catch (error) {
    console.error("Error al verificar disponibilidad:", error);
    return false;
  }
}

//funcion para validar solo numeros en taelefeono y cedula
function validarNumero(inputElement, longitudesPermitidas = []) {
  inputElement.addEventListener('input', () => {
    // Permitir solo números
    inputElement.value = inputElement.value.replace(/\D/g, '');

    // Si hay longitud definida, validar
    if (longitudesPermitidas.length > 0) {
      const longitudValida = longitudesPermitidas.includes(inputElement.value.length);
      inputElement.setCustomValidity(
        longitudValida || inputElement.value.length === 0 
          ? '' 
          : `Debe tener ${longitudesPermitidas.join(" o ")} dígitos.`
      );
    } else {
      // Si no se define longitud, no poner restricciones
      inputElement.setCustomValidity('');
    }
  });
}


// Al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM cargado, iniciando...");
  
  // Cargar datos iniciales
  cargarBarberos();
  cargarServicios();

  //  validar campos numericos
  validarNumero(document.getElementById('cedula'), [8, 10]);
  validarNumero(document.getElementById('telefono'), [10]);

  
  // Configurar fecha mínima (hoy)
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha').min = hoy;
  document.getElementById('fecha').value = hoy; // Establecer fecha actual por defecto
  
  // Event listeners mejorados
  document.getElementById('barbero').addEventListener('change', function() {
    const fecha = document.getElementById('fecha').value;
    cargarHorariosDisponibles(this.value, fecha);
  });
  
  document.getElementById('fecha').addEventListener('change', function() {
    const barberoId = document.getElementById('barbero').value;
    cargarHorariosDisponibles(barberoId, this.value);
  });
  
  // Manejar envío del formulario (sin cambios)
  const reservaForm = document.getElementById('reservaForm');
  reservaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value.trim();
    const cedula = document.getElementById('cedula').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const barberoId = document.getElementById('barbero').value;
    const servicioId = document.getElementById('servicio').value;
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;
    
    // Validaciones
    if (!nombre || !cedula || !telefono || !barberoId || !servicioId || !fecha || !hora) {
      document.getElementById('mensaje').textContent = "Por favor completa todos los campos.";
      document.getElementById('mensaje').className = "error";
      return;
    }
    
    try {
      const disponible = await verificarDisponibilidad(barberoId, fecha, hora);
      
      if (!disponible) {
        document.getElementById('mensaje').textContent = "Lo sentimos, ese horario ya no está disponible. Por favor selecciona otro.";
        document.getElementById('mensaje').className = "error";
        await cargarHorariosDisponibles(barberoId, fecha);
        return;
      }

      const cedula = document.getElementById('cedula').value.trim();

      if (!/^\d{8}$|^\d{10}$/.test(cedula)) {
        document.getElementById('mensaje').textContent = "La cédula debe tener exactamente 8 o 10 dígitos numéricos.";
        document.getElementById('mensaje').className = "error";
        return;
      }

      // 1. Guardar la cita
      await addDoc(collection(db, "citas"), {
        nombre,
        cedula,
        telefono,
        barberoId,
        servicioId,
        fecha,
        hora,
        estado: "pendiente",
        fechaCreacion: serverTimestamp()
      });

      // 👇 Eliminar la hora reservada del arreglo del barbero
      const barberoRef = doc(db, "barberos", barberoId);
      const barberoDoc = await getDoc(barberoRef);

      if (barberoDoc.exists()) {
        const horarios = barberoDoc.data().horario || [];

        const nuevosHorarios = horarios.filter(h => h !== hora);
        await updateDoc(barberoRef, { horario: nuevosHorarios });
      }

      document.getElementById('mensaje').textContent = "¡Cita reservada con éxito!";
      document.getElementById('mensaje').className = "success";
      reservaForm.reset();
      
      setTimeout(() => {
        document.getElementById('mensaje').textContent = "";
        document.getElementById('mensaje').className = "";
      }, 5000);
      
    } catch (error) {
      console.error("Error al reservar cita:", error);
      document.getElementById('mensaje').textContent = "Error al reservar la cita. Por favor, inténtalo de nuevo.";
      document.getElementById('mensaje').className = "error";
    }
  });
});