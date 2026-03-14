require('dotenv').config();

const app = require('./src/app');

const PORT = Number(process.env.PORT || 5000);

const server = app.listen(PORT, () => {
  console.log(`TutorConnect backend is running at http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
