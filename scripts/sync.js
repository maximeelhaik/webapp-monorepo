import fs from 'fs';
import path from 'path';

console.log("🔄 Synchronisation du code commun vers les applications...");

const appsDir = path.resolve('apps');
const coreSource = path.resolve('packages/core/src/server.ts');

if (fs.existsSync(appsDir)) {
  const apps = fs.readdirSync(appsDir).filter(f => fs.statSync(path.join(appsDir, f)).isDirectory());

  for (const app of apps) {
    const targetDir = path.join(appsDir, app, 'api', 'core');
    const targetFile = path.join(targetDir, 'server.ts');
    
    try {
      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(coreSource, targetFile);
      console.log(`✅ Synchronisé : ${app}/api/core/server.ts`);
    } catch (err) {
      console.error(`❌ Erreur pour l'application ${app} :`, err);
    }
  }
}
console.log("✨ Synchronisation terminée.");
