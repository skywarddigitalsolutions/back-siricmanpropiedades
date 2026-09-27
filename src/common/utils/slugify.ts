/**
 * Convierte un texto libre en un slug URL-safe: normaliza acentos (incluida
 * la ñ) via NFD, pasa a minúsculas, reemplaza cualquier run de caracteres
 * que no sean [a-z0-9] por un único guion, y recorta guiones de los bordes.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
