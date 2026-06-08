# ENGINES JDS

Plataforma web para la gestion operativa de talleres de motocicletas.

## Objetivo

ENGINES JDS busca centralizar los procesos principales de un taller de motocicletas: recepcion de motos, ordenes de trabajo, clientes, servicios, repuestos, usuarios y trazabilidad operativa.

Este repositorio se estructura como un proyecto web separado por responsabilidades, preparado para crecer de forma mantenible hacia un entorno de produccion.

## Stack tecnologico

### Frontend

- React
- Vite
- React Router
- Axios
- CSS Modules

### Backend

- Node.js
- Express
- JWT para autenticacion

### Base de datos

- SQL Server

## Estructura del proyecto

```text
ENGINES-JDS/
├── frontend/    # Aplicacion web React
├── backend/     # API REST Node.js/Express
├── database/    # Scripts, migraciones y documentacion SQL Server
├── docs/        # Documentacion tecnica y funcional
├── README.md
└── .gitignore
```

## Decisiones arquitectonicas iniciales

### Separacion frontend/backend

El frontend y el backend viven en carpetas independientes para mantener limites claros entre interfaz de usuario, API, reglas de negocio y persistencia. Esta separacion permite evolucionar, probar y desplegar cada capa con mayor control.

### API backend como punto central de negocio

El backend sera responsable de exponer endpoints HTTP, validar datos, aplicar reglas de negocio, gestionar autenticacion JWT y comunicarse con SQL Server. El frontend no debe acceder directamente a la base de datos.

### SQL Server como fuente de verdad

La carpeta `database/` concentrara scripts, migraciones, seeds y documentacion del modelo de datos. Esto evita que la estructura de base de datos quede dispersa o dependa solamente del estado local de un servidor.

### Documentacion desde el inicio

La carpeta `docs/` se reserva para decisiones tecnicas, flujos funcionales, seguridad, despliegue y modelo de datos. En proyectos de produccion, la documentacion reduce dependencia de conocimiento informal.

### Configuracion sensible fuera del repositorio

Credenciales, cadenas de conexion, secretos JWT y variables de entorno deben mantenerse en archivos `.env` locales o en gestores de secretos del entorno de despliegue. No deben versionarse.

## Proximos pasos recomendados

1. Definir alcance funcional inicial del MVP.
2. Documentar roles y permisos del sistema.
3. Diseñar el modelo de datos inicial.
4. Crear el proyecto Vite dentro de `frontend/`.
5. Crear la API Express dentro de `backend/`.
6. Definir estrategia de configuracion por entorno.
7. Establecer convenciones de ramas, commits y versionado.

