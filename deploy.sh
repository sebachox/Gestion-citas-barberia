#!/bin/bash

echo "Agregando archivos al staging area..."
git add .

echo "Escribe el mensaje del commit: "
read commit_message

echo "Haciendo commit..."
git commit -m "$commit_message"

echo "Subiendo cambios a la rama main..."
git push -u origin main

echo "¡Todo listo!"
