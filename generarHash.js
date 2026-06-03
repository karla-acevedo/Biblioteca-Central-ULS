// archivo: generarHash.js
import crypto from "crypto";

// Función para generar el hash con salt
function generarHash(password) {
  const salt = "uls_biblio_salt_"; // el mismo salt que usa tu sistema
  return crypto.createHash("sha256")
               .update(salt + password)
               .digest("hex");
}

// Ejemplo: generar hash para varias contraseñas
const contraseñas = ["123456", "admin123", "biblioteca2026"];

contraseñas.forEach(pass => {
  console.log(`Contraseña: ${pass} → Hash: ${generarHash(pass)}`);
});
