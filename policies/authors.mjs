// Display metadata lives outside immutable, rated policy manifests.
export function registryAuthors(registry) {
  if (registry?.version !== 1 || !Array.isArray(registry.policies)) throw Error('Invalid author registry');
  const authors = new Map();
  for (const {id, github} of registry.policies) {
    if (typeof id !== 'string' || authors.has(id) || typeof github !== 'string' ||
        !/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(github) || github.includes('--')) {
      throw Error('Each policy needs a valid GitHub handle in registry.github (without @)');
    }
    authors.set(id, github);
  }
  return authors;
}
