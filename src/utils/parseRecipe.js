// src/utils/parseRecipe.js
//
// Analyse un texte de recette collé, quel qu'en soit le format.
//
// POINT D'EXTENSION : toute l'appli passe par parseRecipeText(). Pour brancher
// une IA plus tard (fonction serverless qui renverrait le même objet), il suffit
// de remplacer le corps de cette fonction — aucun composant n'a à changer.

const BULLET = /^[-–—•*·+>◦▪]\s*/
const ORDINAL = /^\(?\d+[.)°]\s+/

const SECTION_INGREDIENTS = /^(ingr[ée]dients?|il (te|vous) faut|liste des courses)\s*:?\s*$/i
const SECTION_STEPS = /^([ée]tapes?|pr[ée]parations?|instructions?|m[ée]thodes?|r[ée]alisations?|recette)\s*:?\s*$/i
const SECTION_NOTES = /^(notes?|remarques?|astuces?|conseils?|infos?)\s*:?\s*$/i

// Unités reconnues, des formes les plus longues aux plus courtes : l'ordre compte,
// "cuillères à soupe" doit être testé avant "cuillères".
const UNIT_WORDS = '(?:' + [
  // cuillères sous toutes leurs formes : "c. à s.", "c à café", "cuillère à soupe"…
  'c(?:uill?[eè]res?)?\\.?\\s*[àa]\\.?\\s*(?:soupe|caf[ée]|dessert|s|c|d)\\.?',
  'cuill?[eè]res?',
  // mesures approximatives courantes en cuisine
  'pinc[ée]es?', 'poign[ée]es?', 'noix', 'filets?', 'traits?', 'zestes?',
  'gousses?', 'brins?', 'branches?', 'feuilles?', 'tranches?', 'bottes?',
  'bo[iî]tes?', 'sachets?', 'paquets?', 'tasses?', 'verres?', 'pots?',
  'briques?', 'bouteilles?', 'tiges?', 'morceaux?', 'portions?',
  'pi[èe]ces?', 'unit[ée]s?', 'bocaux', 'bocal', 'rouleaux?',
  // unités métriques : les plus longues d'abord
  'litres?', 'kg', 'mg', 'ml', 'cl', 'dl', 'gr', 'g', 'l', 'cs', 'cc',
].join('|') + ')'

// Articles de liaison à retirer devant le nom ("200 g DE farine", "3 gousses D'ail").
// Gère l'apostrophe droite et l'apostrophe typographique.
const LINKING_ARTICLE = /^(?:de\s+la\s+|de\s+l['’]\s*|des\s+|du\s+|de\s+|d['’]\s*)/i

/** Retire puces et numérotation en début de ligne. */
function stripLead(line) {
  return line.replace(BULLET, '').replace(ORDINAL, '').trim()
}

/**
 * Découpe une ligne en quantité + nom, en acceptant les deux ordres.
 * "200 g de farine" -> { quantity: '200 g', name: 'farine' }
 * "farine 200g"     -> { quantity: '200g',  name: 'farine' }
 * "3 oeufs"         -> { quantity: '3',     name: 'oeufs' }
 * "sel"             -> { quantity: '',      name: 'sel' }
 */
export function parseIngredientLine(raw) {
  let line = stripLead(String(raw || '')).replace(/\s+/g, ' ').trim()
  if (!line) return null

  // "farine : 200 g" / "farine - 200 g"
  const splitMatch = line.match(/^(.+?)\s*[:–—-]\s*(\d[^:]*)$/)
  if (splitMatch && /\d/.test(splitMatch[2])) {
    return { quantity: splitMatch[2].trim(), name: splitMatch[1].trim() }
  }

  // quantité en tête : "200 g de farine", "1/2 citron", "2 c. à soupe d'huile"
  const leading = line.match(
    new RegExp(`^(\\d+(?:[.,/]\\d+)?\\s*${UNIT_WORDS}?)\\s+(.*)$`, 'i')
  )
  if (leading && leading[2]) {
    const name = leading[2].replace(LINKING_ARTICLE, '').trim()
    if (name) return { quantity: leading[1].trim(), name }
  }

  // quantité en fin : "farine 200 g", "lait 50cl"
  const trailing = line.match(
    new RegExp(`^(.+?)\\s+(\\d+(?:[.,/]\\d+)?\\s*${UNIT_WORDS})$`, 'i')
  )
  if (trailing) {
    return { quantity: trailing[2].trim(), name: trailing[1].trim() }
  }

  return { quantity: '', name: line }
}

/** Une ligne qui contient plusieurs ingrédients séparés par · ou des virgules. */
function explodeIngredientLine(line) {
  if (line.includes('·')) return line.split('·')
  if (line.includes(';')) return line.split(';')
  // "farine, sucre, oeufs" : on ne découpe que si ça ressemble vraiment à une énumération
  const commas = (line.match(/,/g) || []).length
  if (commas >= 2 && line.length < 200) return line.split(',')
  return [line]
}

/** Transforme un bloc de texte en liste d'ingrédients. */
export function parseIngredientsText(text) {
  return String(text || '')
    .split(/\r?\n/)
    .flatMap(explodeIngredientLine)
    .map(parseIngredientLine)
    .filter(ing => ing && ing.name)
}

/** Transforme un bloc de texte en liste d'étapes. */
export function parseStepsText(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(stripLead)
    .filter(Boolean)
}

/** Remet une liste d'ingrédients sous forme de texte éditable. */
export function ingredientsToText(ingredients = []) {
  return ingredients
    .map(i => [i.quantity, i.name].filter(Boolean).join(' ').trim())
    .filter(Boolean)
    .join('\n')
}

/** Une ligne ressemble-t-elle davantage à une étape qu'à un ingrédient ? */
function looksLikeStep(line) {
  const clean = stripLead(line)
  const words = clean.split(/\s+/).filter(Boolean).length

  // Une ligne qui commence par une quantité est un ingrédient, même si elle
  // contient des points d'abréviation ("2 c. à soupe de miel").
  if (/^\d/.test(clean) && words <= 12) return false

  if (clean.length > 70) return true
  // vraie ponctuation de phrase : point suivi d'une majuscule (et non "c. à s.")
  if (/[.!?]\s+[A-ZÀ-Þ]/.test(clean)) return true
  // phrase terminée par un point et assez longue pour ne pas être un ingrédient
  if (/[.!?]$/.test(clean) && words >= 6) return true
  return words > 12
}

/**
 * Analyse un texte de recette complet.
 * @returns {{title, ingredients, steps, notes, tags, imageUrl}}
 */
export function parseRecipeText(text) {
  const recipe = { title: '', ingredients: [], steps: [], notes: '', tags: [], imageUrl: '' }
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
  if (!lines.length) return recipe

  // ---- Titre : première ligne, éventuellement "Titre (4 personnes)"
  let first = lines.shift().replace(/^(recette|titre)\s*:\s*/i, '')
  const paren = first.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  if (paren) {
    recipe.title = paren[1].trim()
    recipe.notes = paren[2].trim()
  } else {
    recipe.title = first.trim()
  }

  // ---- Repérage des sections explicites
  const buckets = { ingredients: [], steps: [], notes: [] }
  let current = null
  let sawSection = false

  for (const line of lines) {
    // en-tête de section éventuellement suivie de contenu sur la même ligne
    const headerMatch = line.match(/^([^:]{2,30}):\s*(.*)$/)
    const headerWord = headerMatch ? `${headerMatch[1].trim()}:` : line

    if (SECTION_INGREDIENTS.test(headerWord) || SECTION_INGREDIENTS.test(line)) {
      current = 'ingredients'; sawSection = true
      if (headerMatch && headerMatch[2]) buckets.ingredients.push(headerMatch[2])
      continue
    }
    if (SECTION_STEPS.test(headerWord) || SECTION_STEPS.test(line)) {
      current = 'steps'; sawSection = true
      if (headerMatch && headerMatch[2]) buckets.steps.push(headerMatch[2])
      continue
    }
    if (SECTION_NOTES.test(headerWord) || SECTION_NOTES.test(line)) {
      current = 'notes'; sawSection = true
      if (headerMatch && headerMatch[2]) buckets.notes.push(headerMatch[2])
      continue
    }
    if (current) buckets[current].push(line)
    else buckets.ingredients.push(line) // avant toute section : probablement des ingrédients
  }

  // ---- Pas de section explicite : on devine où basculent les étapes
  if (!sawSection) {
    const all = buckets.ingredients
    let cut = all.findIndex(looksLikeStep)
    if (cut === -1) cut = all.length
    buckets.ingredients = all.slice(0, cut)
    buckets.steps = all.slice(cut)
  }

  recipe.ingredients = parseIngredientsText(buckets.ingredients.join('\n'))
  recipe.steps = parseStepsText(buckets.steps.join('\n'))

  const extraNotes = buckets.notes.join(' ').trim()
  if (extraNotes) {
    recipe.notes = recipe.notes ? `${recipe.notes} — ${extraNotes}` : extraNotes
  }

  return recipe
}
