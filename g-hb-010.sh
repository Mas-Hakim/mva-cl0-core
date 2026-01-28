#!/bin/bash
cd /media/hakim/HDD/f-docker/my-web-server/sys/esm/CL0
git init
# Игнорируем логи, чтобы не спамить в репозиторий
echo "logs/" > .gitignore
git add .
git commit -m "feat: CL0 Level-0 Driver and Specs"
git branch -M main
