import { obtenerDatosFiltrados } from '../services/dataService.js';

export function actualizarSubcontratos() {
    const datos = obtenerDatosFiltrados();
    const container = document.getElementById('subcontratosContent');

    if (!container) return;

    if (datos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-building"></i>
                <p>No hay datos para mostrar</p>
            </div>
        `;
        return;
    }

    const agrupados = agruparPorSubcontrato(datos);
    const subcontratosOrdenados = Object.values(agrupados)
        .sort((a, b) => b.items.length - a.items.length);

    let html = '<table class="subcontratos-table"><thead><tr>';
    html += '<th>Subcontrato</th><th>Cantidad</th><th>Incorporadas</th><th>En Proceso</th><th>Atrasos</th><th>Estados</th></tr></thead><tbody>';

    subcontratosOrdenados.forEach(sub => {
        const incorporadas = sub.estados['Incorporada'] || 0;
        const enProceso = sub.items.length - incorporadas;

        html += `<tr>
            <td><strong>${sub.nombre}</strong></td>
            <td>${sub.items.length}</td>
            <td><span class="text-green">${incorporadas}</span></td>
            <td><span class="text-orange">${enProceso}</span></td>
            <td><span class="text-red">${sub.atrasos}</span></td>
            <td>${Object.entries(sub.estados).map(([estado, cant]) => `${estado}: ${cant}`).join(', ')}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function agruparPorSubcontrato(datos) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const porSubcontrato = {};

    datos.forEach(d => {
        const sub = d.Subcontrato || 'Sin subcontrato';
        if (!porSubcontrato[sub]) {
            porSubcontrato[sub] = {
                nombre: sub,
                items: [],
                estados: {},
                atrasos: 0
            };
        }
        porSubcontrato[sub].items.push(d);

        const estado = d.Estado || 'Sin estado';
        porSubcontrato[sub].estados[estado] = (porSubcontrato[sub].estados[estado] || 0) + 1;

        if (d.FechaEntrega && d.Estado !== 'Incorporada') {
            const fechaEntrega = new Date(d.FechaEntrega);
            fechaEntrega.setHours(0, 0, 0, 0);
            if (fechaEntrega < hoy) {
                porSubcontrato[sub].atrasos += 1;
            }
        }
    });

    return porSubcontrato;
}

