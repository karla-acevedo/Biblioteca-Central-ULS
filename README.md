# Biblioteca Central ULS — Sitio web institucional

Proyecto de cátedra para la asignatura **Herramientas de Inteligencia Artificial para el Desarrollo Web**.
Universidad Luterana Salvadoreña.

Autora: Karla Mariana Acevedo Guadrón (AG24165)

---

## Descripción

Sitio web institucional de la Biblioteca Central ULS, con catálogo digital,
gestión de préstamos, autenticación de usuarios y panel de administración.

Construido con **Astro Framework**, **TailwindCSS** y **TypeScript**, con
persistencia en archivos JSON (carpeta `data/`).

## Requisitos

- Node.js 22.12.0 o superior
- npm 9 o superior

## Instalación y ejecución

    # 1. Instalar las dependencias
    npm install

    # 2. Ejecutar el servidor de desarrollo
    npm run dev
    # El sitio queda disponible en http://localhost:4321

    # 3. (Opcional) Construir para producción
    npm run build
    node ./dist/server/entry.mjs

## Cuentas de prueba

| Correo                      | Rol           |
|-----------------------------|---------------|
| eliseo.gomez@gmail.com      | Usuario       |
| acevedokarly654@gmail.com   | Administrador |

Las contrasenas se gestionan con hash SHA-256. Solicitelas al equipo
o registre una cuenta nueva desde la pagina de registro.

## Estructura

    biblioteca-site/
    |- astro.config.mjs     # Configuracion de Astro + adaptador Node
    |- package.json         # Dependencias y scripts
    |- data/                # Base de datos en archivos JSON
    |  |- libros.json
    |  |- usuarios.json
    |  |- prestamos.json
    |- public/              # Recursos estaticos (logo, imagenes)
    |- src/
       |- components/       # Componentes reutilizables
       |- layouts/          # Plantillas de pagina
       |- styles/           # Estilos globales
       |- pages/            # Rutas del sitio y endpoints API

Consulte el Manual de Programador para detalles tecnicos completos.
