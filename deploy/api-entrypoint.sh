#!/bin/sh
set -eu

# Une seule instance API est prévue au lancement. Avant une montée à plusieurs
# instances, déplacer cette migration vers une tâche de déploiement unique.
node node_modules/@todam/database/dist/migrate.js
exec node dist/index.js
