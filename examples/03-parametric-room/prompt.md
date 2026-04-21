Crée une pièce rectangulaire paramétrique. Procède comme suit :

1. Crée une feuille de calcul nommée `Parameters` avec ces cellules aliasées :
   - `A1: length = 4000` (mm) → alias `length`
   - `A2: width = 3000` → alias `width`
   - `A3: height = 2500` → alias `height`
   - `A4: wall_thickness = 200` → alias `wall_thickness`

2. Crée un étage (`arch_create_floor`) qui portera les 4 murs.

3. Crée 4 murs formant un rectangle ferméé. Chaque mur référence les alias du spreadsheet
   (`Parameters.length`, etc.) pour sa longueur et sa hauteur. L'épaisseur vient de
   `Parameters.wall_thickness`.

4. Regroupe les 4 murs dans l'étage.

5. Enregistre dans `room.FCStd`.

À la fin, liste les 4 IDs de mur créés et explique comment changer la longueur de la pièce
(une seule cellule à modifier dans le spreadsheet).
