// src/pages/api/auth.ts
// Backend de autenticación
// Los usuarios se guardan en: data/usuarios.json

import type { APIRoute } from 'astro';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

// ── Rutas ──────────────────────────────────────────────────────
const DATA_DIR  = join(process.cwd(), 'data');
const DATA_FILE = join(DATA_DIR, 'usuarios.json');

// ── Tipo de usuario ────────────────────────────────────────────
interface Usuario {
  id:       number;
  nombre:   string;
  apellido: string;
  email:    string;
  password: string;   // guardado como hash, nunca en texto plano
  rol:      'admin' | 'usuario';
  activo:   boolean;
  creado:   string;
}

// ── Encriptar contraseña ───────────────────────────────────────
function hashPass(pass: string): string {
  return createHash('sha256')
    .update('uls_biblio_salt_' + pass)
    .digest('hex');
}

// ── Leer usuarios del archivo ──────────────────────────────────
function cargarUsuarios(): Usuario[] {
  // Crear carpeta data/ si no existe
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  // Crear archivo con usuario admin por defecto si no existe
  if (!existsSync(DATA_FILE)) {
    const iniciales: Usuario[] = [
      {
        id:       1,
        nombre:   'Administrador',
        apellido: 'Sistema',
        email:    'admin@biblio.uls.edu.sv',
        password: hashPass('admin123'),
        rol:      'admin',
        activo:   true,
        creado:   new Date().toISOString(),
      },
    ];
    writeFileSync(DATA_FILE, JSON.stringify(iniciales, null, 2));
    return iniciales;
  }

  return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
}

// ── Guardar usuarios en el archivo ────────────────────────────
function guardarUsuarios(users: Usuario[]): void {
  writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}

// ── Respuesta JSON helper ──────────────────────────────────────
function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Datos públicos del usuario (sin contraseña) ────────────────
function usuarioPublico(u: Usuario) {
  return {
    id:       u.id,
    nombre:   `${u.nombre} ${u.apellido}`.trim(),
    email:    u.email,
    rol:      u.rol,
  };
}

// ══════════════════════════════════════════════════════════════
//  POST — /api/auth?action=register | login
// ══════════════════════════════════════════════════════════════
export const POST: APIRoute = async ({ request, url }) => {
  const action = url.searchParams.get('action') ?? '';

  let body: Record<string, string> = {};
  try {
    body = await request.json();
  } catch {
    return jsonResp({ error: 'Datos inválidos.' }, 400);
  }

  // ── REGISTRO ────────────────────────────────────────────────
  if (action === 'register') {
    const nombre   = body.nombre?.trim()   ?? '';
    const apellido = body.apellido?.trim() ?? '';
    const email    = body.email?.trim().toLowerCase() ?? '';
    const password = body.password ?? '';

    // Validaciones del lado del servidor
    if (!nombre || !apellido || !email || !password)
      return jsonResp({ error: 'Todos los campos son obligatorios.' }, 400);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return jsonResp({ error: 'El correo electrónico no es válido.' }, 400);

    if (password.length < 6)
      return jsonResp({ error: 'La contraseña debe tener al menos 6 caracteres.' }, 400);

    const usuarios = cargarUsuarios();

    // Verificar que el correo no esté ya registrado
    if (usuarios.find(u => u.email === email))
      return jsonResp({ error: 'Este correo ya está registrado. Inicia sesión.' }, 409);

    // Crear nuevo usuario
    const nuevo: Usuario = {
      id:       usuarios.length > 0 ? Math.max(...usuarios.map(u => u.id)) + 1 : 1,
      nombre,
      apellido,
      email,
      password: hashPass(password),
      rol:      'usuario',
      activo:   true,
      creado:   new Date().toISOString(),
    };

    usuarios.push(nuevo);
    guardarUsuarios(usuarios);

    return jsonResp({
      success: true,
      mensaje: 'Cuenta creada exitosamente.',
      usuario: usuarioPublico(nuevo),
    }, 201);
  }

  // ── LOGIN ────────────────────────────────────────────────────
  if (action === 'login') {
    const email    = body.email?.trim().toLowerCase() ?? '';
    const password = body.password ?? '';

    if (!email || !password)
      return jsonResp({ error: 'Correo y contraseña son requeridos.' }, 400);

    const usuarios = cargarUsuarios();

    // Buscar usuario por correo
    const usuario = usuarios.find(u => u.email === email);

    // Verificar que existe y que la contraseña es correcta
    if (!usuario || usuario.password !== hashPass(password))
      return jsonResp({ error: 'Correo o contraseña incorrectos.' }, 401);

    // Verificar que la cuenta está activa
    if (!usuario.activo)
      return jsonResp({ error: 'Tu cuenta está desactivada. Contacta al administrador.' }, 403);

    // Guardar en localStorage desde el frontend
    return jsonResp({
      success: true,
      mensaje: 'Sesión iniciada correctamente.',
      usuario: usuarioPublico(usuario),
    });
  }

  return jsonResp({ error: 'Acción no reconocida.' }, 404);
};

// ══════════════════════════════════════════════════════════════
//  GET — /api/auth?action=me  (verificar sesión)
//  GET — /api/auth?action=usuarios  (listar todos — solo admin)
// ══════════════════════════════════════════════════════════════
export const GET: APIRoute = async ({ url }) => {
  const action = url.searchParams.get('action') ?? '';

  if (action === 'usuarios') {
    const usuarios = cargarUsuarios();
    // Devolver lista sin contraseñas
    const lista = usuarios.map(u => ({
      id: u.id,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      rol: u.rol,
      activo: u.activo,
      creado: u.creado,
    }));
    return jsonResp({ success: true, usuarios: lista });
  }

  // La sesión se maneja en el frontend con localStorage
  // Este endpoint puede usarse para validaciones futuras
  return jsonResp({ mensaje: 'API de autenticación activa.' });
};