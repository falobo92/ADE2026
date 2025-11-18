# Control ADE - Aplicación de Gestión de Datos

Aplicación web moderna y funcional para la gestión y visualización de datos de Adenda Excepcional (ADE) del proyecto Aguas Marítimas de CRAMSA.

## Características

- **Carga de Datos ADE**: Carga única de datos fijos de la Adenda Excepcional
- **Carga de Reportes Diarios**: Carga múltiple de reportes JSON con seguimiento por fecha y semana
- **Correlación Automática**: Los datos se correlacionan automáticamente mediante el campo "Correlativo" (N°)
- **Filtros Avanzados**: Filtrado por Semana, Fecha de Reporte, Temática, Ítem, Persona, Estado y Origen
- **Dashboard Interactivo**: 
  - KPIs en tiempo real (Incorporadas, En Proceso, Atrasos, Por Vencer, Total)
  - Visualización de distribución por estado con gráficos tipo donut
  - Diseño moderno y atractivo visualmente
- **Control de Atrasos**: 
  - Vista dedicada para control de atrasos
  - Análisis por persona (elaborador)
  - Cálculo de días de atraso
  - Clasificación por nivel de criticidad (Crítico, Alto, Moderado)
  - Detalle completo de atrasos con todas las métricas
- **Evolución Temporal**: Gráficos de línea que muestran la evolución de estados a lo largo del tiempo
- **Vista de Subcontratos**: Análisis detallado por subcontrato con métricas de incorporadas, en proceso y atrasos
- **Exportación a Excel**: Exportación de datos filtrados a formato Excel
- **Almacenamiento Local**: Los datos se guardan automáticamente en el navegador (localStorage)
- **Diseño Moderno**: Interfaz atractiva con gradientes, animaciones y colores profesionales

## Estructura de Archivos

```
APP ADE/
├── index.html               # Estructura HTML principal
├── styles.css               # Estilos globales
├── js/
│   ├── main.js              # Punto de entrada
│   ├── state.js             # Estado global
│   ├── constants.js         # Constantes compartidas
│   ├── controllers/
│   │   └── viewController.js  # Gestión centralizada de pestañas/vistas
│   ├── services/
│   │   ├── dataLoader.js       # Carga y validación de archivos
│   │   ├── dataService.js      # Correlación y filtros de datos
│   │   ├── programacionService.js
│   │   └── storageService.js
│   ├── views/                # Render de cada vista (dashboard, listado, etc.)
│   ├── utils/                # Utilidades (fechas, tablas, etc.)
│   └── export/
│       └── excelExporter.js
├── Datos_fijos_ADE.json
├── Reporte_Semana46_2025-11-13.json
└── README.md
```

## Uso

### 1. Cargar Datos ADE (Una vez)

1. Hacer clic en el botón **"Cargar Datos"** en la parte superior
2. Seleccionar **"Aceptar"** cuando se pregunte qué cargar
3. Seleccionar el archivo JSON con los datos fijos ADE

**Formato esperado del archivo ADE:**
```json
[
  {
    "Correlativo": 1,
    "ID": "01.01",
    "Item": "DESCRIPCIÓN DEL PROYECTO",
    "Pregunta": "...",
    ...
  }
]
```

### 2. Cargar Reportes Diarios

1. Hacer clic en el botón **"Cargar Datos"**
2. Seleccionar **"Cancelar"** cuando se pregunte qué cargar
3. Seleccionar el archivo JSON del reporte diario

**Formato esperado del reporte:**
```json
{
  "FechaReporte": "2025-11-13",
  "SemanaReporte": 46,
  "Registros": [
    {
      "Correlativo": 1,
      "Tematica": "Cartografía",
      "Subcontrato": "OWNER TEAM",
      "Estado": "En elaboración",
      ...
    }
  ]
}
```

### 3. Usar Filtros

Los filtros se actualizan automáticamente con los valores disponibles en los datos cargados. Puede filtrar por:

- **Semana**: Semana del reporte
- **Fecha de Reporte**: Fecha específica del reporte
- **Temática**: Temática del registro
- **Ítem**: Ítem específico
- **Persona**: Elaborador o Revisor
- **Estado**: Estado actual del registro
- **Origen**: Subcontrato responsable

### 4. Configurar un token personal de GitHub (opcional pero recomendado)

Debido a los límites públicos de la API de GitHub, es posible que obtenga un error **403** al intentar sincronizar los reportes en línea. Para evitarlo:

1. Abra **"Cargar Datos"** en la aplicación y vaya al bloque **"Token personal de GitHub"**.
2. Cree un token clásico desde [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens).
   - Basta con otorgar permisos de solo lectura para repos públicos (`repo:public_repo`).
3. Copie el token (formato `ghp_xxxxx`) y péguelo en el campo correspondiente; pulse **"Guardar token"**.
4. El token se almacena únicamente en su navegador (localStorage) y se usa para firmar las peticiones a la API.
5. Puede eliminarlo en cualquier momento con el botón **"Eliminar token"** si desea volver al modo público.
6. Si prefiere no usar token, la aplicación limitará la descarga a los **últimos 25 reportes** para mantenerse por debajo del límite anónimo de GitHub.

### 5. Visualizar Dashboard

El dashboard muestra:
- **KPIs en tiempo real**: Tarjetas con métricas clave (Incorporadas, En Proceso, Atrasos, Por Vencer, Total)
- **Gráfico tipo donut**: Distribución por estado con porcentajes
- **Tabla detallada**: Cantidad y porcentaje por estado
- **Total de preguntas**: Resumen general

### 6. Control de Atrasos

La pestaña "Atrasos" proporciona:
- **Resumen de atrasos**: Total de atrasos, personas afectadas y días promedio
- **Atrasos por persona**: Tabla con cantidad y días promedio por elaborador
- **Clasificación de criticidad**: Niveles Crítico (>30 días), Alto (14-30 días), Moderado (<14 días)
- **Detalle completo**: Lista de todas las preguntas con atraso, incluyendo N°, Ítem, Elaborador, Subcontrato, Estado, Fecha de Entrega y Días de Atraso

### 7. Evolución Temporal

La pestaña "Evolución" muestra:
- **Gráfico de línea**: Evolución de estados a lo largo del tiempo
- **Múltiples series**: Total, Incorporadas y En Proceso
- **Análisis temporal**: Visualización de tendencias y progreso

### 8. Vista de Subcontratos

La pestaña "Subcontratos" incluye:
- **Análisis por subcontrato**: Cantidad total, incorporadas, en proceso y atrasos
- **Distribución de estados**: Desglose por estado para cada subcontrato
- **Ordenamiento**: Subcontratos ordenados por cantidad de preguntas

### 9. Exportar a Excel

1. Aplicar los filtros deseados (opcional)
2. Hacer clic en **"Exportar a Excel"**
3. El archivo se descargará automáticamente con los datos filtrados

## Estados Disponibles

- En elaboración
- En cartografía
- En revisor técnico
- En editorial
- Incorporada
- Subcontrato
- Pendiente

## Subcontratos

Los siguientes subcontratos están configurados en el sistema:

- OWNER TEAM
- Medio Humano
- AMS - Chinchilla
- HUGO DÍAZ - Microrruteo y avifauna
- FISIOAQUA - Medio marino
- EDZ - Remoción en masa
- MARISOL - Medio marino
- SEDNA - Arqueología
- SUBCONTRATO PAS138
- SUBCONTRATO CALIDAD DEL AIRE
- RUIDO AMBIENTAL - Ruido
- PAISAJE AMBIENTAL - Paisaje

## Notas Técnicas

- Los datos se almacenan en `localStorage` del navegador
- La aplicación utiliza Chart.js para los gráficos
- La exportación a Excel utiliza la librería SheetJS (xlsx)
- La codificación de archivos debe ser UTF-8
- Los datos se correlacionan automáticamente por el campo "Correlativo"
- La navegación entre pestañas se gestiona desde `js/controllers/viewController.js`, lo que centraliza la renderización de vistas y evita duplicidad de lógica

## Requisitos

- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- No requiere servidor web (funciona como archivo local)
- Conexión a internet para cargar librerías CDN (Chart.js, Font Awesome, SheetJS)

## Fecha de Entrega

12 de enero de 2026

