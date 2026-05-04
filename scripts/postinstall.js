import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 1. On compile le workspace core
execSync('npm run build --workspace=@new-app-ia/core', { stdio: 'inherit' });

const appsDir = path.resolve('apps');
const coreSource = path.resolve('packages/core');

if (fs.existsSync(appsDir)) {
  const apps = fs.readdirSync(appsDir).filter(f => fs.statSync(path.join(appsDir, f)).isDirectory());

  for (const app of apps) {
    const targetDir = path.join(appsDir, app, 'node_modules', '@new-app-ia', 'core');
    try {
      // On s'assure que le dossier parent existe
      fs.mkdirSync(path.dirname(targetDir), { recursive: true });
      // On supprime l'ancien dossier ou lien
      fs.rmSync(targetDir, { recursive: true, force: true });
      // On copie physiquement les fichiers du package core
      fs.cpSync(coreSource, targetDir, { recursive: true });
    } catch (err) {
      console.error(`Erreur lors de la copie pour ${app} :`, err);
    }
  }
}
