process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ||= 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET ||= 'test-jwt-refresh-secret';
process.env.FRONTEND_URL ||= 'http://localhost:8080';
process.env.CORS_ORIGIN ||= 'http://localhost:3000,http://localhost:8080';
