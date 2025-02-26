const tsconfigPaths = require('tsconfig-paths');
const tsConfig = require('./tsconfig.json');

// Vérifier la base et les chemins configurés
console.log('Base URL:', tsConfig.compilerOptions.baseUrl);
console.log('Paths:', tsConfig.compilerOptions.paths);

// Enregistrer les chemins configurés
tsconfigPaths.register({
  baseUrl: tsConfig.compilerOptions.baseUrl || '.',
  paths: tsConfig.compilerOptions.paths || {},
});