import { obtenerDatosFiltrados } from '../services/dataService.js';
import { formatearFechaParaMostrar } from '../utils/date.js';

export function exportarExcel() {
    const datos = obtenerDatosFiltrados();

    if (datos.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const datosExcel = datos.map(d => ({
        'N°': d.Correlativo || '',
        'ID': d.ID || '',
        'Ítem': d.Item || '',
        'Temática General': d.TematicaGeneral || '',
        'Temática': d.Tematica || '',
        'Componente': d.Componente || '',
        'Subcontrato': d.Subcontrato || '',
        'Elaborador': d.Elaborador || '',
        'Revisor': d.Revisor || '',
        'Estado': d.Estado || '',
        'Fecha Entrega': formatearFechaParaMostrar(d.FechaEntrega, d.FechaEntrega || ''),
        'Fecha Reporte': formatearFechaParaMostrar(d.FechaReporte, d.FechaReporte || ''),
        'Semana Reporte': d.SemanaReporte || '',
        'Pregunta': d.Pregunta || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    XLSX.utils.book_append_sheet(wb, ws, 'Datos ADC');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Control_ADC_${fecha}.xlsx`);

    alert('Datos exportados correctamente');
}

