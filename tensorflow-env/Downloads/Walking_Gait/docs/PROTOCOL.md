# 📡 Protocole de Communication

## Configuration Série

**Vitesse** : 115200 baud  
**Bits de données** : 8  
**Parité** : Aucune  
**Bits d'arrêt** : 1  

---

## Format des Commandes

Chaque commande suit le format :
```
<CARACTÈRE><PARAMÈTRES>\n
```

Les paramètres sont séparés par des espaces.

---

## Commandes Détaillées

### 1️⃣ Centrer Servo - `c`

**Syntaxe** : `c<servo_index>`

**Description** : Place un servomoteur à la position neutre (90°)

**Paramètres** :
- `servo_index` (0-5) : Numéro du servo (-1 pour tous)

**Exemples** :
```
c0     → Centre servo 0 (hanche droite)
c1     → Centre servo 1 (genou droit)
c-1    → Centre tous les 6 servos
```

**Réponse** :
```
Pin 0 Centered
```

---

### 2️⃣ Bouger Servo - `s`

**Syntaxe** : `s<servo_index> <angle>`

**Description** : Bouge un servo vers un angle absolu

**Paramètres** :
- `servo_index` (0-5) : Numéro du servo
- `angle` (0-180) : Angle en degrés

**Exemples** :
```
s0 45   → Servo 0 à 45°
s0 135  → Servo 0 à 135°
s2 90   → Servo 2 à 90°
```

**Réponse** :
```
Servo 0 angle 45 pwm 819
```

**Contraintes Appliquées** :
- Angle minimum : défini par `angleLimit[servo][0]`
- Angle maximum : défini par `angleLimit[servo][1]`
- Correction : `jointCorrection[servo]` appliquée automatiquement
- Non inversé : angle tel quel si `Orientation[servo] == HIGH`
- Inversé : angle = 180 - angle si `Orientation[servo] == LOW`

---

### 3️⃣ Contrôle de Jambe - `l`

**Syntaxe** : `l<x> <y>`

**Description** : Positionne la jambe droite à des coordonnées (x, y) en mm

**Paramètres** :
- `x` : Horizontal (mm), positif = vers l'avant
- `y` : Vertical (mm), positif = vers le haut

**Système de Coordonnées** :
```
        +y (haut)
        |
    ----+----→ +x (avant)
        
o = articulación de la cadera
```

**Exemples** :
```
l20 138    → Jambe droite à (20mm avant, 138mm haut)
l-20 138   → Jambe droite à (20mm arrière, 138mm haut)
l0 140     → Jambe droite directement devant à 140mm
```

**Plages Valides** :
- **X** : -30 à +30 mm
- **Y** : ~120 à ~150 mm (selon L1, L2)

**Réponse Succès** :
```
(x,y) = (20.00, 138.00) → (Theta1, Theta2) = (90.00, 90.00)
```

**Erreurs Possibles** :
```
Target Too Far         → Distance > L1 + L2 (138mm)
Target Too Close       → Distance < |L1 - L2| (12mm)
Target Unreachable     → Calcul de cos(theta2) invalide
HIP LIMIT Reached      → Hanche dépasserait 124°
Limit Violation        → Theta1 ou Theta2 hors 0-180°
```

---

### 4️⃣ Progression de Marche - `p`

**Syntaxe** : `p<progress>`

**Description** : Positionne manuellement le cycle de marche

**Paramètres** :
- `progress` (0.0 - 1.0) : Position dans le cycle (0 = début, 1 = fin)

**Exemples** :
```
p0.0    → Début du cycle (jambe droite en swing)
p0.25   → 25% du cycle
p0.5    → Milieu (jambe gauche en swing)
p1.0    → Fin du cycle (= 0.0)
```

**Utilité** : Tester manuellement la progression du cycle sans l'activation de marche

---

### 5️⃣ Marche Automatique - `w`

**Syntaxe** : `w`

**Description** : Active/désactive le cycle de marche automatique

**Paramètres** : Aucun

**Exemples** :
```
w       → Active la marche
w       → Désactive la marche (centre les servos)
```

**Comportement** :
- Activation : Enregistre l'heure, commence le cycle
- Désactivation : Centre tous les servos à 90°

**Réponse** : Variable (`zid_asa7bi`) basculée, pas de message

---

### 6️⃣ Configuration Genou - `k`

**Syntaxe** : `k`

**Description** : Bascule la configuration des genoux entre haut et bas

**Paramètres** : Aucun

**Exemples** :
```
k       → Bascule le mode genou
k       → Rebascule le mode genou
```

**Modes** :
- `kneeUp = true` : Genoux pliés vers le haut (theta2 négatif)
- `kneeUp = false` : Genoux pliés vers le bas (theta2 positif)

**Réponse** :
```
Knee Up: 1
Knee Up: 0
```

---

## Calcul Mathématique (Cinématique Inverse)

### Formule Utilisée

Pour passer de (x, y) en mm à (θ₁, θ₂) en degrés :

**Étape 1 : Distance**
$$d = \sqrt{x^2 + y^2}$$

**Étape 2 : Angle du coude (Theta2)**
$$\cos(\theta_2) = \frac{x^2 + y^2 - L1^2 - L2^2}{2 \cdot L1 \cdot L2}$$

$$\theta_2 = \arccos(\cos(\theta_2))$$

Si `kneeUp == true` : $\theta_2 = -\theta_2$

**Étape 3 : Angle de la hanche (Theta1)**
$$\theta_1 = \text{atan2}(y, x) - \text{atan2}(L2 \sin(\theta_2), L1 + L2 \cos(\theta_2))$$

**Étape 4 : Conversion en degrés**
$$\theta_1 = \theta_1 \cdot \frac{180}{\pi} + 180$$
$$\theta_2 = \theta_2 \cdot \frac{180}{\pi} + 90$$

---

## Gestion des Erreurs

| Erreur | Code | Cause | Solution |
|--------|------|-------|----------|
| Invalid servo | print | Index servo hors 0-5 | Vérifier l'index (0-5 ou -1) |
| Invalid pin | print | Pin PWM invalide | Vérifier la configuration des pins |
| Target Too Far | print + return false | Distance > 138mm | Réduire la distance cible |
| Target Too Close | print + return false | Distance < 12mm | Augmenter la distance cible |
| Target Unreachable | print + return false | Cos(θ₂) > 1 | Vérifier les limites de travail |
| HIP LIMIT Reached | print + return false | Hanche > 124° | Réduire le déplacement avant/arrière |
| Limit Violation | print + return false | θ₁ ou θ₂ > 180° | Position hors limites de l'articulation |

---

## Exemple de Session Complète

```
// Connexion établie
→ Serial Communication Established

// Centrer tous les servos
c-1
→ Pin 0 Centered
→ Pin 1 Centered
→ Pin 2 Centered
→ Pin 3 Centered
→ Pin 4 Centered
→ Pin 6 Centered

// Placer la jambe
l25 135
→ (x,y) = (25.00, 135.00) → (Theta1, Theta2) = (92.45, 88.73)

// Démarrer la marche
w

// Après quelques secondes, arrêter
w
→ Pin 0 Centered
→ Pin 1 Centered
...
```

---

## Dépannage du Protocole

| Symptôme | Diagnostic | Correction |
|----------|-----------|-----------|
| Pas de réponse | Vitesse incorrecte ? | Vérifier 115200 baud |
| Commande ignorée | Format incorrect ? | Ajouter `\n` à la fin |
| Servo ne bouge pas | Pin invalide ? | Vérifier la config des pins |
| Mouvement erratique | Calcul IK invalide | Vérifier les limites (x, y) |

---

**Dernière mise à jour** : 5 février 2026
