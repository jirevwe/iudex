import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dynamic import for the built module
const { createStandaloneDashboardServer } = await import('./dist/server/handlers/http.js');

const server = createStandaloneDashboardServer({
  resultsDir: path.join(__dirname, '.iudex/results'),
  title: 'Iudex Test Dashboard'
});

const PORT = 8888;
server.listen(PORT, () => {
  console.log(`Dashboard server running at http://localhost:${PORT}`);
});
