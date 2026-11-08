# Données de travail

Ce dossier contient vos données de travail sauvegardées automatiquement.

## Fichiers

- **workspace.json** : Contenu de l'affiche (textes, artistes, sponsors, etc.)
- **settings.json** : Réglages créatifs pour chaque concept (couleurs, positions, etc.)

## Synchronisation entre PCs

1. Sur le PC 1 : Travaillez normalement, les modifications sont auto-sauvegardées
2. Commitez et pushez : `git add data/ && git commit -m "Sauvegarde travail" && git push`
3. Sur le PC 2 : `git pull` et rechargez la page
4. Vos données sont là ! ✨

## Notes

- Les fichiers sont automatiquement sauvegardés à chaque modification
- Faites des commits réguliers pour ne pas perdre votre travail
- Le localStorage du navigateur sert de backup temporaire
