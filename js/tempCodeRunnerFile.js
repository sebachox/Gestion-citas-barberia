// // // // // // // // function actualizarHorariosVisuales() {
    // // // // // // // //     const container = document.getElementById('horariosSeleccionados');
    // // // // // // // //     container.innerHTML = '';
        
    // // // // // // // //     horariosSeleccionados.forEach(hora => {
    // // // // // // // //         const tag = document.createElement('div');
    // // // // // // // //         tag.className = 'horario-tag';
    // // // // // // // //         tag.innerHTML = `
    // // // // // // // //             ${formatearHora(hora)}
    // // // // // // // //             <button type="button" data-hora="${hora}">&times;</button>
    // // // // // // // //         `;
    // // // // // // // //         container.appendChild(tag);
    // // // // // // // //     });
        
    // // // // // // // //     // Agregar eventos a los botones de eliminar
    // // // // // // // //     container.querySelectorAll('button').forEach(btn => {
    // // // // // // // //         btn.addEventListener('click', (e) => {
    // // // // // // // //             e.stopPropagation();
    // // // // // // // //             const horaAEliminar = btn.getAttribute('data-hora');
    // // // // // // // //             horariosSeleccionados = horariosSeleccionados.filter(h => h !== horaAEliminar);
    // // // // // // // //             actualizarHorariosVisuales();
                
    // // // // // // // //             // Deseleccionar el botón correspondiente
    // // // // // // // //             document.querySelectorAll('.hora-btn').forEach(btn => {
    // // // // // // // //                 if (btn.getAttribute('data-hora') === horaAEliminar) {
    // // // // // // // //                     btn.classList.remove('seleccionado');
    // // // // // // // //                 }
    // // // // // // // //             });
    // // // // // // // //         });
    // // // // // // // //     });
        
    // // // // // // // //     // Actualizar el campo oculto con los horarios como string JSON
    // // // // // // // //     document.getElementById('barberoHorarios').value = JSON.stringify(horariosSeleccionados);
    // // // // // // // // }