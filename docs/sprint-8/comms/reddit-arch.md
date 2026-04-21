# Reddit — r/architecture

*Draft. r/architecture est **strict** sur l'auto-promo. Vérifier les règles de la sub, ne pas poster en tant que « annonce produit ». Publier **J+2 en fin d'après-midi**, **uniquement si on est loggé avec un compte ayant participé à des discussions non-promo avant**. Si on n'a pas l'historique, laisser tomber cette sub ou passer par r/ArchitecturalTools (plus permissif).*

---

## Titre

```
I'm an architect who built an AI-assisted BIM tool on top of FreeCAD — thoughts on LLMs in the design workflow?
```

*Alternative (si on craint le ban pour self-promo) :*
- `LLMs in BIM workflows — where have you found them actually useful?`

---

## Body

```
Architect here, 20 years in practice in France. Over the past 18 months
I built a tool (Buildoto — MIT, open source) that lets me talk to an AI
agent that drives FreeCAD directly. Just released v1.0.

Before anyone flags this as self-promo — I'd rather frame this as a
question to the community. Two things I want to discuss:

**1. Where does AI actually help in the design workflow?**

Personally I've found LLMs most useful for:
- Batch repetitive geometry (place 47 columns on a grid; align 20
  parapets).
- Writing FreeCAD Python scripts I'd otherwise spend 45 min debugging.
- Explaining a norm or regulation quickly (with the caveat that I
  always verify from source).

What I've found LLMs **bad** at, even with RAG:
- Actual creative design. Zero. They produce the mean of whatever
  trained them.
- Nuance in contextual fit (site, client, tradition).
- Any judgment call where two regulations compete.

What's your experience?

**2. The trust problem.**

When I let an AI write to my model, I need a way back. My tool
auto-commits every AI change to Git, so "undo" is a checkout. Sources
are shown under each answer so I can verify before using in a
deliverable. But the responsibility stays with me as the arch on the
permit.

How are others solving this? Do you even let AI touch production
files, or just use it for brainstorming at concept stage?

Tool is open source (MIT) if curious: github.com/buildoto/buildoto —
happy to discuss architecture choices, or just your experience with
LLMs in the workflow, regardless of the tool.
```

---

## Flag important

**Cette sub bannit pour bien moins.** Si la modération vous signale, retirer le post volontairement avant qu'il ne soit retiré — ça protège le compte.

Si bannissement, pivoter vers :
- r/ArchitectsLounge (plus détendu)
- r/ArchitectsOffice (plus pro)
- r/SketchUp (audience adjacente curieuse d'alternatives)

## Ton

- Ne **pas** poster en mode « launch ». Poster en mode « pratique professionnelle ».
- **Vraie question** dans le corps — les mods tolèrent l'auto-promo si elle est un moyen vers une discussion réelle.
- Pas de vidéo démo en image principale (flag auto-promo évident). Image de capture avec une question ouverte, ou texte seulement.

## Commentaires attendus

- « Another AI hype » → répondre en listant ce que l'AI **ne sait pas faire** (voir body).
- « Why FreeCAD? Archicad/Revit > » → respecter le choix, expliquer pourquoi FreeCAD + argument open-source.
- « Tried it, it's buggy » → remercier, demander l'issue GitHub précise, fixer vite, mentionner le fix dans un follow-up commentaire.
