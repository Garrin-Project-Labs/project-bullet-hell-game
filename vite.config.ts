import { defineConfig } from 'vite';

// GitHub Pages serves project sites from /<repo-name>/.
// Keeping the base path explicit makes production asset URLs work there while
// Vite dev/preview still run normally on localhost.
export default defineConfig({
  base: '/project-bullet-hell-game/'
});
