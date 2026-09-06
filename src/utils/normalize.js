// src/utils/normalize.js
// Normalisation des noms d'articles + détection de quasi-doublons.

/**
 * Clé de comparaison : minuscules, sans accents, sans espaces superflus.
 * Sert uniquement à comparer, jamais à afficher.
 */
export function normalizeName(name = '') {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Forme d'affichage : tout en minuscules, puis première lettre en majuscule.
 * "TOMATE", "tomate", "ToMaTe" donnent tous "Tomate" — l'historique reste
 * visuellement homogène quelle que soit la façon dont chacun a tapé.
 */
export function toDisplayName(name = '') {
  const clean = name.replace(/\s+/g, ' ').trim().toLowerCase()
  if (!clean) return ''
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

/** Retire un pluriel simple en fin de mot (tomates -> tomate, choux -> chou). */
function singularize(word) {
  if (word.length > 3 && /(s|x)$/.test(word)) return word.slice(0, -1)
  return word
}

function singularizeAll(key) {
  return key.split(' ').map(singularize).join(' ')
}

/** Distance de Levenshtein (bornée, suffisante pour des noms d'articles). */
function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = curr
  }
  return prev[b.length]
}

/**
 * Cherche un article existant identique (casse/accents ignorés).
 * @returns l'article trouvé ou null
 */
export function findExact(items, name) {
  const key = normalizeName(name)
  return items.find(i => normalizeName(i.name) === key) || null
}

/**
 * Cherche un article existant très proche (pluriel, faute de frappe légère).
 * N'est appelé que si findExact n'a rien trouvé.
 * @returns l'article ressemblant ou null
 */
export function findNearDuplicate(items, name) {
  const key = normalizeName(name)
  if (key.length < 3) return null
  const keySingular = singularizeAll(key)

  for (const item of items) {
    const other = normalizeName(item.name)
    // Même mot au singulier/pluriel près
    if (singularizeAll(other) === keySingular) return item
    // Faute de frappe légère sur un mot suffisamment long
    if (key.length >= 5 && Math.abs(other.length - key.length) <= 2) {
      if (levenshtein(other, key) === 1) return item
    }
  }
  return null
}
