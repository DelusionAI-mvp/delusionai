import serverApp from '../dist/server.cjs';

// Extract the app instance from the bundled server module (esbuild CJS format compatibility)
const app = (serverApp as any).default || serverApp;

export default app;
