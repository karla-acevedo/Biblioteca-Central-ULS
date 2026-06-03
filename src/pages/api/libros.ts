// src/pages/api/libros.ts
// Backend de libros — guarda en data/libros.json

import type { APIRoute } from 'astro';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR  = join(process.cwd(), 'data');
const DATA_FILE = join(DATA_DIR, 'libros.json');

// ── Tipo Libro ─────────────────────────────────────────────────
interface Libro {
  id:          number;
  titulo:      string;
  autor:       string;
  categoria:   string;
  isbn:        string;
  anio:        number;
  descripcion: string;
  copias:      number;
  disponibles: number;
  emoji:       string;
}

// ── Libros iniciales de ejemplo ────────────────────────────────
const LIBROS_INICIALES: Libro[] = [
  { id:1, titulo:'El arte de la programación',     autor:'Donald Knuth',           categoria:'Tecnología',   isbn:'978-0-201-89683-1', anio:1997, descripcion:'La obra definitiva sobre algoritmos.',               copias:3, disponibles:3, emoji:'💻' },
  { id:2, titulo:'Sapiens: De animales a dioses',  autor:'Yuval Noah Harari',      categoria:'Historia',     isbn:'978-0-062-31609-7', anio:2011, descripcion:'Un repaso por la historia de la humanidad.',         copias:4, disponibles:4, emoji:'📜' },
  { id:3, titulo:'Una breve historia del tiempo',  autor:'Stephen Hawking',        categoria:'Ciencias',     isbn:'978-0-553-38016-3', anio:1988, descripcion:'Los grandes misterios del universo.',                copias:2, disponibles:2, emoji:'🔬' },
  { id:4, titulo:'Cien años de soledad',           autor:'Gabriel García Márquez', categoria:'Literatura',   isbn:'978-0-060-88328-7', anio:1967, descripcion:'La obra cumbre del realismo mágico.',                copias:5, disponibles:5, emoji:'📖' },
  { id:5, titulo:'Clean Code',                     autor:'Robert C. Martin',       categoria:'Tecnología',   isbn:'978-0-132-35088-4', anio:2008, descripcion:'Principios para escribir código limpio.',             copias:3, disponibles:3, emoji:'💻' },
  { id:6, titulo:'1984',                           autor:'George Orwell',          categoria:'Literatura',   isbn:'978-0-451-52493-5', anio:1949, descripcion:'Una distopía sobre el totalitarismo.',                copias:4, disponibles:4, emoji:'📖' },
  { id:7, titulo:'El origen de las especies',      autor:'Charles Darwin',         categoria:'Ciencias',     isbn:'978-0-140-43205-3', anio:1859, descripcion:'La teoría de la evolución.',                         copias:2, disponibles:2, emoji:'🔬' },
  { id:8, titulo:'Cálculo diferencial e integral', autor:'James Stewart',          categoria:'Matemáticas',  isbn:'978-0-538-49790-9', anio:2015, descripcion:'Texto de referencia para el cálculo universitario.', copias:6, disponibles:6, emoji:'📐' },
];

// ── Helpers ────────────────────────────────────────────────────
function cargarLibros(): Libro[] {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify(LIBROS_INICIALES, null, 2));
    return LIBROS_INICIALES;
  }
  return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
}

function guardarLibros(libros: Libro[]): void {
  writeFileSync(DATA_FILE, JSON.stringify(libros, null, 2));
}

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── GET — listar libros con filtros opcionales ─────────────────
export const GET: APIRoute = async ({ url }) => {
  const libros = cargarLibros();
  const q         = url.searchParams.get('q')?.toLowerCase()         ?? '';
  const categoria = url.searchParams.get('categoria')                ?? '';
  const soloDisp  = url.searchParams.get('disponibles') === 'true';

  let resultado = libros;

  if (q) {
    resultado = resultado.filter(l =>
      l.titulo.toLowerCase().includes(q) ||
      l.autor.toLowerCase().includes(q)  ||
      l.isbn.includes(q)
    );
  }
  if (categoria) {
    resultado = resultado.filter(l => l.categoria === categoria);
  }
  if (soloDisp) {
    resultado = resultado.filter(l => l.disponibles > 0);
  }

  return jsonResp({ total: resultado.length, libros: resultado });
};

// ── POST — agregar libro (solo admin) ──────────────────────────
export const POST: APIRoute = async ({ request }) => {
  let body: Partial<Libro> = {};
  try { body = await request.json(); } catch {
    return jsonResp({ error: 'Datos inválidos.' }, 400);
  }

  if (!body.titulo || !body.autor)
    return jsonResp({ error: 'Título y autor son obligatorios.' }, 400);

  const libros = cargarLibros();
  const nuevo: Libro = {
    id:          libros.length > 0 ? Math.max(...libros.map(l => l.id)) + 1 : 1,
    titulo:      body.titulo,
    autor:       body.autor,
    categoria:   body.categoria   ?? 'General',
    isbn:        body.isbn        ?? '',
    anio:        body.anio        ?? new Date().getFullYear(),
    descripcion: body.descripcion ?? '',
    copias:      body.copias      ?? 1,
    disponibles: body.copias      ?? 1,
    emoji:       body.emoji       ?? '📚',
  };

  libros.push(nuevo);
  guardarLibros(libros);
  return jsonResp({ success: true, libro: nuevo }, 201);
};

// ── PUT — editar libro ─────────────────────────────────────────
export const PUT: APIRoute = async ({ request, url }) => {
  const id = Number(url.searchParams.get('id'));
  if (!id) return jsonResp({ error: 'ID requerido.' }, 400);

  let body: Partial<Libro> = {};
  try { body = await request.json(); } catch {
    return jsonResp({ error: 'Datos inválidos.' }, 400);
  }

  const libros = cargarLibros();
  const idx = libros.findIndex(l => l.id === id);
  if (idx === -1) return jsonResp({ error: 'Libro no encontrado.' }, 404);

  libros[idx] = { ...libros[idx], ...body, id };
  guardarLibros(libros);
  return jsonResp({ success: true, libro: libros[idx] });
};

// ── DELETE — eliminar libro ────────────────────────────────────
export const DELETE: APIRoute = async ({ url }) => {
  const id = Number(url.searchParams.get('id'));
  if (!id) return jsonResp({ error: 'ID requerido.' }, 400);

  const libros = cargarLibros();
  const nuevos = libros.filter(l => l.id !== id);
  if (nuevos.length === libros.length)
    return jsonResp({ error: 'Libro no encontrado.' }, 404);

  guardarLibros(nuevos);
  return jsonResp({ success: true });
};