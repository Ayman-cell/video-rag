# Pousser Mars Rover vers GitHub

Suis ces étapes **dans l’ordre** pour que le projet soit bien sur GitHub.

## 1. Créer le dépôt sur GitHub (si pas déjà fait)

1. Va sur https://github.com/new  
2. **Repository name** : `mars-rover` (ou `mars_rover`)  
3. **Public**, ne coche pas "Add a README"  
4. Clique sur **Create repository**

## 2. Ouvrir un terminal dans le dossier du projet

- Ouvre **l’explorateur de fichiers** et va dans le dossier **G8_P4_S4** (celui qui contient le dossier `mars rover`).
- Dans la barre d’adresse, tape `cmd` puis Entrée (ou clic droit → "Ouvrir dans le terminal" / "Ouvrir PowerShell ici").

Tu dois être dans le dossier qui contient `mars rover`, pas à l’intérieur de `mars rover`.

## 3. Lancer le script de push

**PowerShell :**
```powershell
powershell -ExecutionPolicy Bypass -File push_to_github.ps1
```

**Ou à la main :**
```powershell
git init
git add "mars rover" .gitignore
git commit -m "Mars Rover: Arduino + Streamlit + QR YOLO"
git branch -M main
git remote add origin https://github.com/Ayman-cell/mars-rover.git
git push -u origin main
```

Remplace `Ayman-cell/mars-rover` par ton vrai compte et le nom du dépôt si différent (ex. `Ayman-cell/robotics` ou un autre repo).

## 4. Si le dépôt existe déjà (avec un README, etc.)

```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

## Authentification GitHub

- Si on te demande **username** : ton pseudo GitHub (ex. `Ayman-cell`).
- Si on te demande **password** : utilise un **Personal Access Token** (plus de mot de passe classique) :
  1. GitHub → Settings → Developer settings → Personal access tokens  
  2. Generate new token (classic), coche `repo`  
  3. Copie le token et colle-le quand Git demande le mot de passe.
