import { readFile, assert } from './utils';

console.log('Running Test 2: MongoDB usage verification');

const packageJson = readFile('package.json');
assert(packageJson !== null, 'package.json not found');

if (packageJson) {
    const pkg = JSON.parse(packageJson);
    const deps = pkg.dependencies || {};
    assert(!!deps['mongodb'], 'mongodb should be in dependencies');
}

const mongoFile = readFile('src/lib/mongodb.ts');
assert(mongoFile !== null, 'src/lib/mongodb.ts not found');
if (mongoFile) {
    assert(mongoFile.includes('MongoClient'), 'Should use MongoClient in lib/mongodb.ts');
}

const authFile = readFile('src/lib/auth.ts');
if (authFile) {
    assert(authFile.includes('mongodbAdapter'), 'Auth config must use a MongoDB adapter');
}

console.log('Test 2 Passed');
