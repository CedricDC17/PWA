// src/utils/tags.js
// Liste fixe de tags de recettes (pas de création libre).

export const TAG_GROUPS = [
  { group: 'Moment', tags: ['Matin', 'Midi', 'Soir', 'Apéro'] },
  { group: 'Type', tags: ['Entrée', 'Plat', 'Accompagnement', 'Sauce', 'Dessert', 'Gâteau'] },
  { group: 'Contrainte', tags: ['Rapide', 'Végé'] },
]

export const ALL_TAGS = TAG_GROUPS.flatMap(g => g.tags)
