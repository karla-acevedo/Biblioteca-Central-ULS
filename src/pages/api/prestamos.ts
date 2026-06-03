// src/pages/api/prestamos.ts
// Backend de préstamos — guarda en data/prestamos.json

import type { APIRoute } from 'astro';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR      = join(process.cwd(), 'data');
const PREST_FILE    = join(DATA_DIR, 'prestamos.json');
const LIBROS_FILE   = join(DATA_DIR, 'libros.json');
const USUARIOS_FILE = join(DATA_DIR, 'usuarios.json');

// ── Tipos ──────────────────────────────────────────────────────
interface Prestamo {
  id:              number;
  usuarioId:       number;
  usuarioNombre:   string;
  libroId:         number;
  libroTitulo:     string;
  libroAutor:      string;
  fechaPrestamo:   string;
  fechaDevolucion: string;
  devuelto:        boolean;
  fechaRetorno:    string | null;
}

interface Libro {
  id: number; titulo: string; autor: string;
  disponibles: number; copias: number;
  [key: string]: unknown;
}

interface Usuario {
  id: number; nombre: string; apellido: string;
  [key: string]: unknown;
}

// ── Helpers ────────────────────────────────────────────────────
function leer<T>(file: string, fallback: T[]): T[] {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(file)) { writeFileSync(file, '[]'); return fallback; }
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function escribir(file: string, data: unknown) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Fecha de hoy + N días
function fechaMas(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

function hoy(): string {
  return new Date().toISOString().split('T')[0];
}

// Estado del préstamo
function estado(p: Prestamo): string {
  if (p.devuelto) return 'devuelto';
  if (p.fechaDevolucion < hoy()) return 'vencido';
  return 'activo';
}

// ── GET — listar préstamos ─────────────────────────────────────
export const GET: APIRoute = async ({ url }) => {
  const prestamos = leer<Prestamo>(PREST_FILE, []);
  const usuarioId = Number(url.searchParams.get('usuarioId')) || null;
  const todos     = url.searchParams.get('todos') === 'true';

  let resultado = prestamos;

  // Si no pide todos, filtra por usuario
  if (!todos && usuarioId) {
    resultado = resultado.filter(p => p.usuarioId === usuarioId);
  }

  // Agregar estado calculado
  const conEstado = resultado.map(p => ({ ...p, estado: estado(p) }));

  return jsonResp({ prestamos: conEstado });
};

// ── POST — solicitar préstamo ──────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  let body: { usuarioId?: number; libroId?: number } = {};
  try { body = await request.json(); } catch {
    return jsonResp({ error: 'Datos inválidos.' }, 400);
  }

  const { usuarioId, libroId } = body;
  if (!usuarioId || !libroId)
    return jsonResp({ error: 'usuarioId y libroId son requeridos.' }, 400);

  // Cargar datos
  const libros   = leer<Libro>(LIBROS_FILE, []);
  const usuarios = leer<Usuario>(USUARIOS_FILE, []);
  const prestamos = leer<Prestamo>(PREST_FILE, []);

  const libro   = libros.find(l => l.id === libroId);
  const usuario = usuarios.find(u => u.id === usuarioId);

  if (!libro)   return jsonResp({ error: 'Libro no encontrado.' }, 404);
  if (!usuario) return jsonResp({ error: 'Usuario no encontrado.' }, 404);

  if (libro.disponibles <= 0)
    return jsonResp({ error: 'No hay copias disponibles de este libro.' }, 400);

  // Verificar que no tenga ya este libro prestado
  const yaTiene = prestamos.find(
    p => p.usuarioId === usuarioId && p.libroId === libroId && !p.devuelto
  );
  if (yaTiene)
    return jsonResp({ error: 'Ya tienes este libro en préstamo.' }, 400);

  // Crear préstamo (14 días)
  const nuevo: Prestamo = {
    id:              prestamos.length > 0 ? Math.max(...prestamos.map(p => p.id)) + 1 : 1,
    usuarioId,
    usuarioNombre:   `${usuario.nombre} ${usuario.apellido}`.trim(),
    libroId,
    libroTitulo:     libro.titulo,
    libroAutor:      libro.autor,
    fechaPrestamo:   hoy(),
    fechaDevolucion: fechaMas(14),
    devuelto:        false,
    fechaRetorno:    null,
  };

  prestamos.push(nuevo);
  escribir(PREST_FILE, prestamos);

  // Reducir disponibles del libro
  libro.disponibles -= 1;
  escribir(LIBROS_FILE, libros);

  return jsonResp({
    success: true,
    mensaje: `Préstamo creado. Devolver antes del ${nuevo.fechaDevolucion}.`,
    prestamo: { ...nuevo, estado: 'activo' },
  }, 201);
};

// ── PUT — devolver libro ───────────────────────────────────────
export const PUT: APIRoute = async ({ url }) => {
  const id = Number(url.searchParams.get('id'));
  if (!id) return jsonResp({ error: 'ID requerido.' }, 400);

  const prestamos = leer<Prestamo>(PREST_FILE, []);
  const libros    = leer<Libro>(LIBROS_FILE, []);

  const prestamo = prestamos.find(p => p.id === id);
  if (!prestamo)        return jsonResp({ error: 'Préstamo no encontrado.' }, 404);
  if (prestamo.devuelto) return jsonResp({ error: 'Este libro ya fue devuelto.' }, 400);

  // Marcar como devuelto
  prestamo.devuelto     = true;
  prestamo.fechaRetorno = new Date().toISOString();
  escribir(PREST_FILE, prestamos);

  // Aumentar disponibles del libro
  const libro = libros.find(l => l.id === prestamo.libroId);
  if (libro) {
    libro.disponibles = Math.min(libro.disponibles + 1, libro.copias);
    escribir(LIBROS_FILE, libros);
  }

  return jsonResp({ success: true, mensaje: 'Libro devuelto correctamente.' });
};