// src/utils/units.js
// Unités optionnelles. Aucune unité par défaut : si elle est choisie, elle
// s'affiche simplement en plus de la quantité.

export const UNITS = ['unité', 'boîte', 'paquet', 'sachet', 'bouteille', 'g', 'kg', 'ml', 'cl', 'L']

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

// Unités de recette qui ont un sens pour faire les courses.
const SHOPPING_UNITS = {
  g: 'g', gr: 'g', gramme: 'g', grammes: 'g',
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogramme: 'kg', kilogrammes: 'kg',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml',
  cl: 'cl', centilitre: 'cl', centilitres: 'cl',
  l: 'L', litre: 'L', litres: 'L',
  boite: 'boîte', boites: 'boîte', boîte: 'boîte', boîtes: 'boîte',
  paquet: 'paquet', paquets: 'paquet',
  sachet: 'sachet', sachets: 'sachet',
  bouteille: 'bouteille', bouteilles: 'bouteille',
  unite: 'unité', unites: 'unité', unité: 'unité', unités: 'unité',
  piece: 'unité', pieces: 'unité', pièce: 'unité', pièces: 'unité',
}

/**
 * Convertit une quantité de recette (texte libre) vers le couple
 * quantité/unité de la liste de courses.
 *
 *   "200 g"        -> { quantity: 200, unit: 'g' }
 *   "1,5 kg"       -> { quantity: 1.5, unit: 'kg' }
 *   "4"            -> { quantity: 4, unit: null }
 *   "2 c. à soupe" -> { quantity: null, unit: null }   (mesure de cuisine :
 *                      on achète un pot d'huile, pas deux cuillères)
 *   "1/2"          -> { quantity: null, unit: null }   (on n'achète pas un demi)
 */
export function parseQuantityForShopping(raw) {
  const empty = { quantity: null, unit: null }
  const text = String(raw || '').trim().toLowerCase()
  if (!text) return empty

  // fractions : on ne les reporte pas sur une liste de courses
  if (/^\d+\s*\/\s*\d+/.test(text)) return empty

  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/)
  if (!match) return empty

  const quantity = parseFloat(match[1].replace(',', '.'))
  if (!quantity || quantity <= 0) return empty

  const rest = match[2]
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!rest) return { quantity, unit: null }

  const unit = SHOPPING_UNITS[rest.split(' ')[0]] || SHOPPING_UNITS[rest]
  if (unit) return { quantity, unit }

  // Mesure de cuisine (cuillère, pincée, gousse, tranche…) : le nombre n'aide
  // pas à acheter, on ajoute simplement le produit.
  return empty
}
