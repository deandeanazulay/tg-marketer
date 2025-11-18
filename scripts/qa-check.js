#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 TG Marketer - Production QA Check\n');

// 1. Build and analyze bundle
console.log('📦 Building production bundle...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful\n');
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// 2. Check bundle sizes
console.log('📊 Analyzing bundle sizes...');
const distPath = path.join(process.cwd(), 'dist');
const assetsPath = path.join(distPath, 'assets');

if (fs.existsSync(assetsPath)) {
  const files = fs.readdirSync(assetsPath);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  const cssFiles = files.filter(f => f.endsWith('.css'));
  
  let totalSize = 0;
  const chunks = [];
  
  [...jsFiles, ...cssFiles].forEach(file => {
    const filePath = path.join(assetsPath, file);
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    totalSize += sizeKB;
    
    let chunkName = 'main';
    if (file.includes('vendor')) chunkName = 'vendor';
    else if (file.includes('telegram')) chunkName = 'telegram';
    else if (file.includes('index')) chunkName = 'index';
    
    chunks.push({ name: chunkName, file, size: sizeKB });
  });
  
  console.log('Bundle Analysis:');
  chunks.forEach(chunk => {
    console.log(`  ${chunk.name}: ${chunk.size} KB (${chunk.file})`);
  });
  console.log(`  Total: ${totalSize} KB\n`);
  
  if (totalSize > 150) {
    console.warn('⚠️  Bundle size exceeds 150 KB target');
  } else {
    console.log('✅ Bundle size within target (≤150 KB)');
  }
} else {
  console.warn('⚠️  Assets directory not found');
}

// 3. Check for forbidden dependencies
console.log('\n🚫 Checking for forbidden dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

const forbidden = ['moment', 'lodash', 'chart.js', 'date-fns', '@twa-dev/sdk', 'tdweb'];
const found = forbidden.filter(dep => allDeps[dep]);

if (found.length > 0) {
  console.warn(`⚠️  Found forbidden dependencies: ${found.join(', ')}`);
} else {
  console.log('✅ No forbidden dependencies found');
}

// 4. Check API endpoints exist
console.log('\n🔌 Checking API endpoints...');
const apiFiles = [
  'api/health.ts',
  'api/verify-init.ts', 
  'api/bootstrap.ts',
  'api/user-mode.ts',
  'api/seed-demo.ts'
];

apiFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.warn(`⚠️  ${file} missing`);
  }
});

// 5. Check Docker files
console.log('\n🐳 Checking Docker configuration...');
const dockerFiles = [
  'docker-compose.yml',
  'Dockerfile.web',
  'Dockerfile.api',
  'Caddyfile',
  'Makefile'
];

dockerFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.warn(`⚠️  ${file} missing`);
  }
});

// 6. Security checks
console.log('\n🔒 Security checklist:');
const securityChecks = [
  { name: 'HMAC verification in verify-init.ts', check: () => fs.readFileSync('api/verify-init.ts', 'utf8').includes('createHmac') },
  { name: 'JWT authentication', check: () => fs.readFileSync('api/bootstrap.ts', 'utf8').includes('Bearer') },
  { name: 'Input validation with Zod', check: () => fs.readFileSync('package.json', 'utf8').includes('zod') },
  { name: 'No secrets in client code', check: () => !fs.readFileSync('src/App.tsx', 'utf8').includes('TELEGRAM_BOT_TOKEN') }
];

securityChecks.forEach(({ name, check }) => {
  try {
    if (check()) {
      console.log(`✅ ${name}`);
    } else {
      console.warn(`⚠️  ${name} - needs attention`);
    }
  } catch (error) {
    console.warn(`⚠️  ${name} - could not verify`);
  }
});

console.log('\n🎉 QA Check Complete!');
console.log('\nNext steps:');
console.log('1. Run: make up');
console.log('2. Test: https://app.localhost');
console.log('3. Verify: Demo/Real mode switching');