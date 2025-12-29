# Control ADE

Sistema de gestión y visualización de datos de Adenda Excepcional (ADE) del proyecto Aguas Marítimas.

## Características

- **Dashboard Interactivo**: KPIs en tiempo real, gráficos de distribución por estado
- **Listado de Preguntas**: Tabla ordenable y filtrable con búsqueda
- **Control de Atrasos**: Análisis de preguntas vencidas por persona
- **Filtros Avanzados**: Por semana, fecha, temática, persona, estado y subcontrato
- **Sincronización Automática**: Datos desde repositorio GitHub
- **Exportación Excel**: Descarga de datos filtrados
- **Almacenamiento Local**: Persistencia en navegador

## Estructura del Proyecto

```
ADE2026/
├── index.html              # Estructura HTML
├── styles.css              # Estilos (diseño minimalista)
├── js/
│   ├── main.js             # Punto de entrada
│   ├── state.js            # Estado global
│   ├── constants.js        # Configuración
│   ├── controllers/
│   │   └── viewController.js
│   ├── services/
│   │   ├── dataLoader.js
│   │   ├── dataService.js
│   │   ├── githubService.js
│   │   ├── programacionService.js
│   │   └── storageService.js
│   ├── views/
│   │   ├── dashboardView.js
│   │   ├── listadoView.js
│   │   ├── atrasosView.js
│   │   ├── evolucionView.js
│   │   ├── subcontratosView.js
│   │   ├── modalView.js
│   │   ├── menuCarga.js
│   │   └── filterControls.js
│   ├── utils/
│   │   ├── date.js
│   │   └── table.js
│   ├── ui/
│   │   └── statusBar.js
│   └── export/
│       └── excelExporter.js
├── reportes/               # Reportes JSON
├── Datos_fijos_ADE.json    # Datos base
└── README.md
```

## Uso

### Sincronización de Datos

1. Clic en **Sincronizar** (footer)
2. Seleccionar **Actualizar Datos ADE** o **Actualizar Reportes**

### Filtros

Los filtros se actualizan automáticamente con los valores disponibles:
- **Semana**: Semana del reporte
- **Fecha**: Fecha específica
- **Temática**: Clasificación temática
- **Persona**: Elaborador o revisor
- **Estado**: Estado actual
- **Origen**: Subcontrato

### Token de GitHub (Opcional)

Para evitar límites de la API pública:
1. Crear token en [GitHub Settings](https://github.com/settings/tokens)
2. Ingresar en el menú de sincronización
3. El token se guarda localmente

## Estados

| Estado | Descripción |
|--------|-------------|
| En elaboración | En proceso de redacción |
| En revisor técnico | Revisión técnica |
| En cartografía | Procesamiento cartográfico |
| En editorial | Revisión editorial |
| Incorporada | Completada |
| Pendiente | Sin iniciar |
| Subcontrato | Asignada a subcontrato |

## Tecnologías

- HTML5, CSS3 (Variables CSS, Flexbox, Grid)
- JavaScript ES6+ (Módulos)
- Chart.js (Gráficos)
- SheetJS (Exportación Excel)
- Font Awesome (Iconos)

## Requisitos

- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Conexión a internet (para CDN y sincronización)

## Fecha de Entrega

27 de febrero de 2026
