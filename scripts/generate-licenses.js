#!/usr/bin/env node
/**
 * Generate open-source licenses file from production dependencies
 * 
 * Usage: node scripts/generate-licenses.js
 * 
 * Output: lib/generated/licenses.ts
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔍 Scanning production dependencies...\n');

// Get production dependencies with full metadata
const depsJson = execSync('npm ls --omit=dev --all --json --long', { 
  encoding: 'utf-8', 
  maxBuffer: 20 * 1024 * 1024 
});
const depsTree = JSON.parse(depsJson);

// SPDX license templates
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
  
  'Apache-2.0': `Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.`,
  
  '0BSD': `Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,
  
  'BlueOak-1.0.0': `This software is licensed under the Blue Oak Model License 1.0.0. The license text can be found at https://blueoakcouncil.org/license/1.0.0`,
  
  'CC0-1.0': `The person who associated a work with this deed has dedicated the work to the public domain by waiving all of his or her rights to the work worldwide under copyright law, including all related and neighboring rights, to the extent allowed by law.

You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission.`,
  
  'Python-2.0': `This LICENSE AGREEMENT is between the Python Software Foundation ("PSF"), and the Individual or Organization ("Licensee") accessing and otherwise using this software ("Python") in source or binary form and its associated documentation.`,
  
  'Unlicense': `This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this software, either in source code form or as a compiled binary, for any purpose, commercial or non-commercial, and by any means.`,
};

// Collect unique packages
const packages = new Map();

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

function collectPackages(node, parentPath = '') {
  if (!node.dependencies) return;
  
  for (const [name, info] of Object.entries(node.dependencies)) {
    // Skip packages that aren't installed
    if (info.extraneous || info.missing || !info.version || info.version === '0.0.0') {
      continue;
    }
    
    const key = `${name}@${info.version}`;
    if (packages.has(key)) {
      continue;
    }
    
    // Use the 'path' field from npm ls if available
    let pkgDir = null;
    if (info.path) {
      pkgDir = info.path;
    } else {
      // Fallback: try to resolve via require.resolve
      try {
        const pkgJsonPath = require.resolve(`${name}/package.json`, {
          paths: [parentPath || process.cwd()]
        });
        pkgDir = path.dirname(pkgJsonPath);
      } catch (_e) {
        // Can't resolve, skip this package
        continue;
      }
    }
    
    let pkgInfo = {
      name,
      version: info.version,
      license: 'Unknown',
      copyright: null,
      licenseText: null,
      isStandardTemplate: false,
    };
    
    // Read package.json
    const pkgJsonPath = path.join(pkgDir, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        
        // Get license from package.json (license or legacy licenses field)
        if (pkg.license) {
          pkgInfo.license = typeof pkg.license === 'string' ? pkg.license : pkg.license.type || 'Unknown';
        } else if (pkg.licenses && Array.isArray(pkg.licenses) && pkg.licenses.length > 0) {
          pkgInfo.license = pkg.licenses[0].type || 'Unknown';
        }
        
        // Find license file
        const licensePath = findLicenseFile(pkgDir);
        if (licensePath) {
          pkgInfo.licenseText = fs.readFileSync(licensePath, 'utf-8');
          pkgInfo.copyright = extractCopyright(pkgInfo.licenseText);
        } else if (SPDX_TEMPLATES[pkgInfo.license]) {
          // Use standard SPDX template
          pkgInfo.licenseText = SPDX_TEMPLATES[pkgInfo.license];
          pkgInfo.isStandardTemplate = true;
        }
      } catch (_e) {
        // Could not read package.json
      }
    }
    
    packages.set(key, pkgInfo);
    
    // Recurse into dependencies
    collectPackages(info, pkgDir);
  }
}

collectPackages(depsTree);

console.log(`Found ${packages.size} unique production dependencies\n`);

// Deduplicate license texts
const licenseTextsMap = new Map();
const textToId = new Map();

function getTextId(text) {
  if (!text) return null;
  
  if (textToId.has(text)) {
    return textToId.get(text);
  }
  
  // Normalize text for hashing (remove trailing whitespace, normalize line endings)
  const normalized = text.trim().replace(/\r\n/g, '\n');
  const hash = crypto.createHash('sha1').update(normalized).digest('hex').substring(0, 8);
  
  textToId.set(text, hash);
  licenseTextsMap.set(hash, text);
  
  return hash;
}

// Process packages and build output
const licenseEntries = [];
let withRealText = 0;
let withFallbackText = 0;
let withNoText = 0;
const unknownPackages = [];

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
  
  if (pkg.license === 'Unknown') {
    unknownPackages.push(pkg);
  }
}

// Sort deterministically
licenseEntries.sort((a, b) => {
  const nameCompare = a.name.localeCompare(b.name);
  return nameCompare !== 0 ? nameCompare : a.version.localeCompare(b.version);
});

// Generate TypeScript file
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

// Ensure output directory exists
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
console.log(`   ${withNoText} with no text`);

if (unknownPackages.length > 0) {
  console.log(`\n⚠️  ${unknownPackages.length} packages with Unknown license:`);
  unknownPackages.forEach(pkg => {
    console.log(`   - ${pkg.name}@${pkg.version}`);
  });
}

console.log('');
