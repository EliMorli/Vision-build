#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔍 Scanning production dependencies...\n');

const lockPath = path.join(__dirname, '..', 'package-lock.json');
const lockContent = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));

const APACHE_2 = fs.readFileSync(path.join(__dirname, 'spdx-templates', 'Apache-2.0.txt'), 'utf-8');
const BLUEOAK = fs.readFileSync(path.join(__dirname, 'spdx-templates', 'BlueOak-1.0.0.txt'), 'utf-8');
const CC0 = fs.readFileSync(path.join(__dirname, 'spdx-templates', 'CC0-1.0.txt'), 'utf-8');
const PYTHON2 = fs.readFileSync(path.join(__dirname, 'spdx-templates', 'Python-2.0.txt'), 'utf-8');
const UNLICENSE = fs.readFileSync(path.join(__dirname, 'spdx-templates', 'Unlicense.txt'), 'utf-8');
const LGPL3 = fs.readFileSync(path.join(__dirname, 'spdx-templates', 'LGPL-3.0.txt'), 'utf-8');
const GPL3 = fs.readFileSync(path.join(__dirname, 'spdx-templates', 'GPL-3.0.txt'), 'utf-8');

const SPDX_TEMPLATES = {
  'MIT': `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,
  
  'ISC': `Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,
  
  'BSD-2-Clause': `Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,
  
  'BSD-3-Clause': `Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,
  
  '0BSD': `Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,
  
  'Apache-2.0': APACHE_2,
  'BlueOak-1.0.0': BLUEOAK,
  'CC0-1.0': CC0,
  'Python-2.0': PYTHON2,
  'Unlicense': UNLICENSE,
  'LGPL-3.0-or-later': LGPL3,
  'GPL-3.0': GPL3,
};

function findLicenseFile(pkgDir) {
  try {
    const entries = fs.readdirSync(pkgDir);
    const licenseFile = entries.find(entry => 
      /^(licen[cs]e|copying)(\..*)?$/i.test(entry)
    );
    if (licenseFile) {
      return path.join(pkgDir, licenseFile);
    }
  } catch (_e) {
    // Directory doesn't exist or can't be read
  }
  return null;
}

function extractCopyright(licenseText) {
  const lines = licenseText.split('\n').slice(0, 20);
  for (const line of lines) {
    if (/copyright|©/i.test(line) && line.trim().length < 200) {
      return line.trim();
    }
  }
  return null;
}

function getCopyrightFromPackageJson(pkg, pkgName) {
  if (pkg.author) {
    if (typeof pkg.author === 'string') {
      return `Copyright (c) ${pkg.author}`;
    } else if (pkg.author.name) {
      return `Copyright (c) ${pkg.author.name}`;
    }
  }
  if (pkg.contributors && pkg.contributors.length > 0) {
    const first = pkg.contributors[0];
    const name = typeof first === 'string' ? first : first.name;
    if (name) return `Copyright (c) ${name}`;
  }
  return `Copyright (c) the ${pkgName} authors`;
}

const packages = new Map();
const workspaceRoot = path.join(__dirname, '..');

if (!lockContent.packages) {
  console.error('❌ No packages found in package-lock.json');
  process.exit(1);
}

for (const [pkgPath, entry] of Object.entries(lockContent.packages)) {
  if (!pkgPath || pkgPath === '') continue;
  if (entry.dev || entry.devOptional) continue;
  if (entry.optional && !entry.resolved) continue;
  
  if (!entry.version || entry.version === '0.0.0') continue;
  
  // Parse package name from path: node_modules/foo or node_modules/@scope/name
  let pkgName = '';
  const pathParts = pkgPath.split('/');
  const nodeModulesIdx = pathParts.lastIndexOf('node_modules');
  if (nodeModulesIdx >= 0 && nodeModulesIdx < pathParts.length - 1) {
    if (pathParts[nodeModulesIdx + 1].startsWith('@')) {
      // Scoped package
      pkgName = pathParts.slice(nodeModulesIdx + 1, nodeModulesIdx + 3).join('/');
    } else {
      // Regular package
      pkgName = pathParts[nodeModulesIdx + 1];
    }
  }
  if (!pkgName) continue;
  
  const key = `${pkgName}@${entry.version}`;
  if (packages.has(key)) continue;
  
  const pkgDir = path.join(workspaceRoot, pkgPath);
  if (!fs.existsSync(pkgDir)) continue;
  
  let pkgInfo = {
    name: pkgName,
    version: entry.version,
    license: 'Unknown',
    copyright: null,
    licenseText: null,
    isStandardTemplate: false,
  };
  
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      
      if (pkg.license) {
        pkgInfo.license = typeof pkg.license === 'string' ? pkg.license : pkg.license.type || 'Unknown';
      } else if (pkg.licenses && Array.isArray(pkg.licenses) && pkg.licenses.length > 0) {
        pkgInfo.license = pkg.licenses[0].type || 'Unknown';
      }
      
      const licensePath = findLicenseFile(pkgDir);
      if (licensePath) {
        pkgInfo.licenseText = fs.readFileSync(licensePath, 'utf-8');
        pkgInfo.copyright = extractCopyright(pkgInfo.licenseText);
      } else if (SPDX_TEMPLATES[pkgInfo.license]) {
        pkgInfo.licenseText = SPDX_TEMPLATES[pkgInfo.license];
        pkgInfo.isStandardTemplate = true;
        if (['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD'].includes(pkgInfo.license)) {
          pkgInfo.copyright = getCopyrightFromPackageJson(pkg, pkgName);
        }
      }
    } catch (_e) {
      // Could not read package.json
    }
  }
  
  packages.set(key, pkgInfo);
}

console.log(`Found ${packages.size} unique production dependencies\n`);

const licenseTextsMap = new Map();
const textToId = new Map();

function getTextId(text) {
  if (!text) return null;
  
  if (textToId.has(text)) {
    return textToId.get(text);
  }
  
  const normalized = text.trim().replace(/\r\n/g, '\n');
  const hash = crypto.createHash('sha1').update(normalized).digest('hex').substring(0, 8);
  
  textToId.set(text, hash);
  licenseTextsMap.set(hash, text);
  
  return hash;
}

const licenseEntries = [];
let withRealText = 0;
let withFallbackText = 0;
let withNoText = 0;

for (const [, pkg] of packages) {
  const textId = pkg.licenseText ? getTextId(pkg.licenseText) : null;
  
  licenseEntries.push({
    name: pkg.name,
    version: pkg.version,
    license: pkg.license,
    copyright: pkg.copyright,
    textId,
  });
  
  if (pkg.licenseText) {
    if (pkg.isStandardTemplate) {
      withFallbackText++;
    } else {
      withRealText++;
    }
  } else {
    withNoText++;
  }
}

licenseEntries.sort((a, b) => {
  const nameCompare = a.name.localeCompare(b.name);
  return nameCompare !== 0 ? nameCompare : a.version.localeCompare(b.version);
});

const tsContent = `/**
 * Generated open-source licenses
 * 
 * Do not edit manually. Generated by scripts/generate-licenses.js
 * Run: node scripts/generate-licenses.js
 */

export interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  copyright: string | null;
  textId: string | null;
}

export const LICENSE_TEXTS: Record<string, string> = ${JSON.stringify(Object.fromEntries(licenseTextsMap), null, 2)};

export const licenses: LicenseEntry[] = ${JSON.stringify(licenseEntries, null, 2)};
`;

const outputDir = path.join(__dirname, '..', 'lib', 'generated');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'licenses.ts');
fs.writeFileSync(outputPath, tsContent);

const fileSize = fs.statSync(outputPath).size;
const fileSizeKB = (fileSize / 1024).toFixed(1);

console.log(`✅ Generated licenses file: ${path.relative(process.cwd(), outputPath)}`);
console.log(`   ${licenseEntries.length} packages`);
console.log(`   ${licenseTextsMap.size} unique license texts`);
console.log(`   ${fileSizeKB} KB\n`);

console.log('📊 Coverage:');
console.log(`   ${withRealText} with real license text`);
console.log(`   ${withFallbackText} with standard SPDX template`);
console.log(`   ${withNoText} with no text\n`);
