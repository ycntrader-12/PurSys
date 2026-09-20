# PurSys - Modular Cross-Platform Desktop System Maintenance

PurSys est une suite logicielle desktop d'ingénierie système conçue pour l'optimisation des performances, le nettoyage des résidus temporaires et la gestion fine du démarrage sur systèmes d'exploitation modernes (Windows, Linux, macOS).

---

## 🏗️ Architecture Technique

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PurSys UI (Electron DOM)                        │
│   • Dashboard Cyber Cyan: Métriques CPU/RAM & Jauges SVG               │
│   • Deep Cleaner: Analyse granulaire, détection des caches             │
│   • Startup Manager: Registre de boot & switches d'activation          │
│   • Memory Optimizer: Libération de la mémoire de travail              │
│   • Licensing: HWID machine SHA-256 & validation token Ed25519         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ window.purSysApi (Preload Typed Bridge)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Sécurité & Sandboxing Preload                       │
│   • contextIsolation: true | nodeIntegration: false | sandbox: true    │
│   • Content Security Policy (CSP) stricte sans eval                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ ipcRenderer.invoke / ipcMain.handle
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Electron Main Process (Node.js)                     │
│   • Cycle de vie de la fenêtre & contrôle des navigations externes     │
│   • Validation de schéma des requêtes IPC                              │
│   • Pont adaptatif Rust Bridge (Process Spawner + Engine Résilient)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Stdio IPC JSON-RPC / C-ABI
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Moteur Natif Rust (`pursys-core`)                     │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │   Cleaner Engine        │  │       Optimizer Engine               │  │
│  │  • Rayon multi-thread   │  │  • EmptyWorkingSet Win32 sys-calls   │  │
│  │  • TOCTOU & Symlink safe│  │  • Sysinfo CPU / RAM kernel tables   │  │
│  └─────────────────────────┘  └──────────────────────────────────────┘  │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │   Startup Manager       │  │    Licensing & Freemium Guard        │  │
│  │  • HKCU / HKLM Registry │  │  • Ed25519 asymetric check & HWID   │  │
│  │  • Sauvegarde PurSys    │  │  • Gating matériel au niveau Rust    │  │
│  └─────────────────────────┘  └──────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Sécurité & Robustesse

1. **Zéro-Cost Abstraction & Thread Safety** :
   - Le moteur Rust utilise `rayon` pour paralléliser l'analyse arborescente des dossiers de caches et fichiers temporaires sans ralentir le système.
   - Utilisation d'atomiques (`AtomicU64`, `AtomicUsize`) pour le décompte des fichiers sans verrous superflus.

2. **Mitigation TOCTOU & Anti-Traversée Symlink** :
   - La traversée récursive utilise `.follow_links(false)` via `WalkDir` pour interdire toute traversée malveillante hors des dossiers cibles.
   - La suppression d'un lien symbolique supprime le lien lui-même sans altérer la cible.
   - Les fichiers verrouillés par des processus en cours d'exécution sont interceptés élégamment sans faire crasher le batch de nettoyage.

3. **Gating Freemium dans le Kernel Rust** :
   - La distinction entre l'édition **Free** et l'édition **Pro** n'est pas simplement graphique : le binaire Rust (`pursys-core`) contrôle cryptographiquement chaque appel et rejette nativement toute tentative d'exécution non autorisée (ex: nettoyage système en profondeur ou compaction de RAM).

---

### Assistant d'Installation Wizard (.exe)
Un installeur complet avec assistant pas-à-pas (choix du dossier de destination, création des raccourcis Bureau et Menu Démarrer) est disponible :
- **Fichier généré** : `PurSys-Installer-Wizard.exe` (ou dans `dist-installer/PurSys Setup 1.0.0.exe`)
- **Dossier d'installation par défaut** : `D:\PurSys` (configurable directement dans l'assistant).

Pour re-générer l'installeur à tout moment :
```bash
npm run build:installer
```

### Lancement en un clic (Windows portable / dev)
Double-cliquez simplement sur :
```bat
start_all.bat
```
Ce script :
1. Vérifie la présence de Node.js.
2. Installe automatiquement les dépendances si `node_modules` est manquant.
3. Vérifie la présence du compilateur Rust (`cargo`) et compile le binaire release s'il est disponible.
4. Lance l'application desktop PurSys.

### Lancement en mode Développeur (Terminal)
```bash
npm start
# ou avec les outils de développement ouverts :
npm run dev
```

### Compilation du Moteur Natif Rust
Dès que la chaîne de compilation Rust (`rustup` / `cargo`) est configurée :
```bash
# Compilation optimisée release
npm run build:rust

# Tests unitaires du moteur Rust
npm run test:rust
```

Le pont `rust-bridge.js` détecte automatiquement la présence du binaire compilé (`src-rust/target/release/pursys-core.exe`) et bascule instantanément sur l'exécution binaire native. En l'absence temporaire du compilateur, il active automatiquement son moteur d'émulation haute-fidélité pour garantir la disponibilité complète de l'interface.

---

## 🔑 Clés de Test pour Démonstration

- **Clé Démo Pro** : `PUR-PRO-DEMO-2026`
- **Format Valide** : `PUR-PRO-<ID_CLIENT>-<SIGNATURE>`
