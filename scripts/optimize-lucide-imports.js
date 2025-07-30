#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TypeScript/JavaScript files
const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
  ignore: ['**/node_modules/**']
});

let totalUpdated = 0;
let totalIcons = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;

  // Match lucide-react imports
  const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]lucide-react['"]/g;
  
  const matches = [...content.matchAll(importRegex)];
  
  matches.forEach(match => {
    const fullImport = match[0];
    const iconsString = match[1];
    
    // Split icons and clean them
    const icons = iconsString
      .split(',')
      .map(icon => icon.trim())
      .filter(icon => icon);
    
    if (icons.length > 0) {
      // Generate new imports
      const newImports = icons
        .map(icon => `import { ${icon} } from 'lucide-react/dist/esm/icons/${icon.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}'`)
        .join(';\n');
      
      // Replace the old import with new ones
      content = content.replace(fullImport, newImports);
      updated = true;
      totalIcons += icons.length;
    }
  });
  
  if (updated) {
    fs.writeFileSync(file, content);
    totalUpdated++;
    console.log(`✅ Updated ${file}`);
  }
});

console.log(`\n🎉 Optimization complete!`);
console.log(`📊 Updated ${totalUpdated} files with ${totalIcons} icon imports`);
console.log(`💾 This should significantly reduce the lucide-react bundle size`);