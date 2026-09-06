// src/utils/rayons.js
// Liste des rayons + détection automatique à partir du nom de l'article.

import { normalizeName } from './normalize'

export const RAYON_AUTRE = 'autre'

/** Rayons disponibles. L'ordre ici n'est qu'un défaut : il est réordonnable dans l'appli. */
export const RAYONS = [
  { id: 'fruits-legumes', label: 'Fruits & Légumes' },
  { id: 'boucherie', label: 'Boucherie' },
  { id: 'poissonnerie', label: 'Poissonnerie' },
  { id: 'cremerie', label: 'Crèmerie' },
  { id: 'boulangerie', label: 'Boulangerie' },
  { id: 'epicerie', label: 'Épicerie' },
  { id: 'surgeles', label: 'Surgelés' },
  { id: 'boissons', label: 'Boissons' },
  { id: 'hygiene', label: 'Hygiène' },
  { id: 'entretien', label: 'Entretien' },
  { id: RAYON_AUTRE, label: 'Autre' },
]

export const DEFAULT_RAYON_ORDER = RAYONS.map(r => r.id)

export function rayonLabel(id) {
  return RAYONS.find(r => r.id === id)?.label || 'Autre'
}

/**
 * Mots-clés par rayon. La détection cherche le mot-clé le plus long d'abord,
 * pour que "lait de coco" (épicerie) ne soit pas capté par "lait" (crèmerie).
 */
const KEYWORDS = {
  'fruits-legumes': [
    'pomme de terre', 'pommes de terre', 'patate douce', 'haricot vert', 'petit pois',
    'chou-fleur', 'chou fleur', 'citron vert', 'salade verte', 'herbes fraiches',
    'pomme', 'poire', 'banane', 'orange', 'citron', 'fraise', 'framboise', 'myrtille',
    'raisin', 'kiwi', 'ananas', 'melon', 'pasteque', 'peche', 'abricot', 'cerise',
    'prune', 'mangue', 'avocat', 'clementine', 'mandarine', 'pamplemousse', 'figue',
    'tomate', 'salade', 'laitue', 'carotte', 'patate', 'oignon', 'ail', 'echalote',
    'courgette', 'aubergine', 'poivron', 'concombre', 'radis', 'poireau', 'chou',
    'brocoli', 'epinard', 'champignon', 'betterave', 'navet', 'celeri', 'fenouil',
    'courge', 'potiron', 'persil', 'basilic', 'coriandre', 'menthe', 'ciboulette',
    'legume', 'fruit', 'endive', 'artichaut', 'asperge', 'mais', 'gingembre',
  ],
  boucherie: [
    'blanc de poulet', 'cuisse de poulet', 'viande hachee', 'steak hache',
    'poulet', 'boeuf', 'steak', 'viande', 'porc', 'agneau', 'veau', 'dinde',
    'jambon', 'saucisse', 'saucisson', 'merguez', 'lardon', 'bacon', 'escalope',
    'roti', 'chipolata', 'canard', 'boudin', 'pate', 'charcuterie', 'cote de porc',
    'entrecote', 'bavette', 'chorizo', 'rillette',
  ],
  poissonnerie: [
    'poisson pane', 'poisson', 'saumon', 'thon frais', 'cabillaud', 'colin',
    'crevette', 'moule', 'huitre', 'sardine', 'maquereau', 'truite', 'lieu',
    'dorade', 'calamar', 'crabe', 'surimi', 'saint-jacques', 'bar',
  ],
  cremerie: [
    'fromage blanc', 'petit suisse', 'creme fraiche', 'lait de vache', 'lait entier',
    'lait demi', 'yaourt', 'fromage', 'beurre', 'comte', 'gruyere', 'emmental',
    'camembert', 'mozzarella', 'chevre', 'roquefort', 'parmesan', 'oeuf', 'skyr',
    'raclette', 'feta', 'ricotta', 'mascarpone', 'creme', 'lait', 'brie', 'cancoillotte',
  ],
  boulangerie: [
    'pain de mie', 'pain', 'baguette', 'brioche', 'croissant', 'viennoiserie',
    'biscotte', 'tortilla', 'wrap', 'pita', 'buns', 'pain au chocolat',
  ],
  epicerie: [
    'lait de coco', 'thon en boite', 'pate a tartiner', 'sucre vanille',
    'huile d olive', 'pois chiche', 'lait concentre', 'sauce tomate',
    'pates', 'riz', 'farine', 'sucre', 'sel', 'poivre', 'huile', 'vinaigre',
    'moutarde', 'ketchup', 'mayonnaise', 'sauce', 'conserve', 'lentille',
    'semoule', 'couscous', 'quinoa', 'boulgour', 'cafe', 'the', 'tisane',
    'chocolat', 'biscuit', 'gateau', 'cereales', 'confiture', 'miel', 'nutella',
    'compote', 'bonbon', 'chips', 'levure', 'epice', 'curry', 'paprika', 'cumin',
    'bouillon', 'olive', 'cornichon', 'soupe', 'puree', 'ravioli', 'maizena',
    'chapelure', 'noix', 'amande', 'noisette', 'cacahuete', 'pistache', 'thon',
    'apero', 'gaufre', 'madeleine', 'sirop d erable',
  ],
  surgeles: [
    'legumes surgeles', 'poisson surgele', 'pizza surgelee', 'glacon',
    'surgele', 'glace', 'sorbet', 'frite', 'nugget', 'pizza',
  ],
  boissons: [
    'jus de fruit', 'jus d orange', 'eau gazeuse', 'eau petillante', 'ice tea',
    'eau', 'jus', 'soda', 'coca', 'limonade', 'biere', 'vin', 'champagne',
    'sirop', 'perrier', 'orangina', 'cidre', 'schweppes', 'pepsi', 'fanta',
  ],
  hygiene: [
    'papier toilette', 'brosse a dent', 'gel douche', 'mousse a raser',
    'serviette hygienique', 'gel hydroalcoolique', 'creme solaire', 'coton tige',
    'savon', 'shampoing', 'dentifrice', 'deodorant', 'mouchoir', 'coton',
    'rasoir', 'tampon', 'couche', 'lingette', 'apres-shampoing',
  ],
  entretien: [
    'liquide vaisselle', 'sac poubelle', 'essuie-tout', 'essuie tout',
    'tablette lave-vaisselle', 'produit vaisselle', 'papier cuisson',
    'film alimentaire', 'papier aluminium',
    'lessive', 'adoucissant', 'eponge', 'sopalin', 'javel', 'nettoyant',
    'desodorisant', 'balai', 'aluminium', 'serpillere',
  ],
}

// Aplatit en une liste triée du mot-clé le plus long au plus court.
const FLAT_KEYWORDS = Object.entries(KEYWORDS)
  .flatMap(([rayon, words]) => words.map(word => ({ rayon, word })))
  .sort((a, b) => b.word.length - a.word.length)

/**
 * Devine le rayon d'un article à partir de son nom.
 * Retourne 'autre' si rien ne correspond (l'utilisateur peut corriger ensuite).
 */
export function detectRayon(name) {
  const key = normalizeName(name)
  if (!key) return RAYON_AUTRE
  for (const { rayon, word } of FLAT_KEYWORDS) {
    if (key === word) return rayon
    // mot-clé présent en tant que mot entier (évite "the" dans "theiere")
    const re = new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|x)?($|\\s)`)
    if (re.test(key)) return rayon
  }
  return RAYON_AUTRE
}

/** Ordre courant des rayons, complété si de nouveaux rayons ont été ajoutés au code. */
export function resolveRayonOrder(savedOrder) {
  const known = DEFAULT_RAYON_ORDER
  const valid = (savedOrder || []).filter(id => known.includes(id))
  const missing = known.filter(id => !valid.includes(id))
  return [...valid, ...missing]
}
