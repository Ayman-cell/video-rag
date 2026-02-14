# 🎬 Video RAG avec Gemini -- Analyse Vidéo Intelligente

**Une application d'analyse vidéo basée sur l'IA générative et la
Retrieval-Augmented Generation (RAG) avec Google Gemini**

🚀 **Application Streamlit interactive pour comprendre et interroger vos
vidéos avec précision**

------------------------------------------------------------------------

## 📋 Vue d'ensemble

**Video RAG avec Gemini** est une application intelligente de
compréhension vidéo développée avec **Streamlit** et propulsée par l'API
**Google Gemini**.

Elle combine :

-   🎥 Analyse multimodale des vidéos\
-   💬 Interaction conversationnelle en langage naturel\
-   🔎 Récupération intelligente de segments pertinents (RAG)\
-   🧠 Génération de réponses contextualisées

### 🎯 Objectif

Uploader une vidéo → Poser une question → Obtenir une réponse précise
basée sur son contenu réel.

------------------------------------------------------------------------

## ✨ Fonctionnalités principales

### 1️⃣ Analyse Vidéo avec Gemini

-   🎥 Upload direct depuis l'interface web
-   🧠 Compréhension multimodale via Google Gemini
-   📊 Analyse contextuelle du contenu vidéo
-   ⚡ Génération intelligente de réponses

------------------------------------------------------------------------

### 2️⃣ Système RAG Vidéo (Retrieval-Augmented Generation)

-   🔎 Extraction des segments les plus pertinents
-   🎯 Sélection des passages liés à la question
-   🧩 Génération augmentée par récupération
-   📈 Amélioration significative de la précision

------------------------------------------------------------------------

### 3️⃣ Interface Conversationnelle Interactive

-   💬 Questions en langage naturel
-   🔄 Interaction continue avec la vidéo analysée
-   🧠 Compréhension contextuelle
-   📋 Réponses détaillées et structurées

------------------------------------------------------------------------

### 4️⃣ Interface Web Moderne (Streamlit)

-   🎨 Design clair et intuitif
-   📱 Responsive et fluide
-   🎯 Barre latérale pour configuration API
-   ⚡ Expérience utilisateur optimisée

------------------------------------------------------------------------

### 5️⃣ Support Multi-Formats

Formats compatibles :

-   MP4\
-   AVI\
-   MOV\
-   MKV\
-   WEBM

Taille recommandée : \~100MB maximum par vidéo.

------------------------------------------------------------------------

### 6️⃣ Sécurité et Gestion des Clés API

-   🔐 Support des variables d'environnement (.env)
-   ❌ Aucune clé API stockée dans le code
-   🔒 Respect des bonnes pratiques de sécurité

------------------------------------------------------------------------

## 🛠️ Technologies utilisées

  Technologie         Utilisation
  ------------------- -------------------------------------------------
  Streamlit           Interface web interactive
  Google Gemini API   Analyse vidéo et génération IA
  Python              Backend
  python-dotenv       Gestion sécurisée des variables d'environnement
  Pillow              Traitement d'images
  Architecture RAG    Génération augmentée par récupération

------------------------------------------------------------------------

## 📋 Prérequis

-   Python 3.8 ou supérieur
-   pip installé
-   Une clé API Google Gemini
-   Connexion Internet stable

Obtenir une clé API :\
https://aistudio.google.com/app/apikey

------------------------------------------------------------------------

## 🚀 Installation et démarrage

### 1️⃣ Cloner le dépôt

``` bash
git clone https://github.com/Ayman-cell/video-rag.git
cd video-rag
```

### 2️⃣ Installer les dépendances

``` bash
pip install -r requirements.txt
```

### 3️⃣ Tester votre installation

``` bash
python test_setup.py
```

### 4️⃣ Configurer la clé API

Option A --- Variable d'environnement :

``` bash
cp .env.example .env
```

Ajouter ensuite :

GEMINI_API_KEY=votre-cle-api

------------------------------------------------------------------------

### 5️⃣ Lancer l'application

``` bash
streamlit run app.py
```

Accessible sur : http://localhost:8501

------------------------------------------------------------------------

## 📁 Structure du projet

    video-rag/
    ├── app.py
    ├── demo.py
    ├── requirements.txt
    ├── env.example
    ├── test_setup.py
    ├── USAGE.md
    └── README.md

------------------------------------------------------------------------

## 🤝 Contribution

Les contributions sont les bienvenues !

------------------------------------------------------------------------

## 📝 Licence

Licence MIT

------------------------------------------------------------------------

## 👨‍💻 Auteur

Ayman\
https://github.com/Ayman-cell

------------------------------------------------------------------------

Dernière mise à jour : 14 février 2026\
Version : 1.0.0

Développé avec ❤️ pour les passionnés d'IA vidéo.
