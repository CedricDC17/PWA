// src/utils/units.js
// Unités optionnelles. Aucune unité par défaut : si elle est choisie, elle
// s'affiche simplement en plus de la quantité.

export const UNITS = ['unité', 'boîte', 'paquet', 'sachet', 'bouteille', 'g', 'kg', 'L', 'cl']

/**
 * Badge affiché à côté du nom d'un article.
 * - quantité seule > 1        -> "×2"
 * - quantité + unité          -> "×500 g"
 * - rien à signaler           -> null
 */
export function formatQuantity(quantity, unit) {
  const qty = Number(quantity)
  if (!qty || qty < 1) return null
  if (unit) return `×${qty} ${unit}`
  if (qty > 1) return `×${qty}`
  return null
}
