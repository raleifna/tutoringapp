const express = require('express');

const router = express.Router();

// Get all tutors
router.get('/', (_req, res) => {
  res.json([]);
});

// Get a tutor by id
router.get('/:id', (_req, res) => {
  res.json([]);
});

// Get a tutor's availability by id
router.get('/:id/availability', (_req, res) => {
  res.json([]);
});

// Get the current tutor's profile
router.get('/me/profile', (_req, res) => {
  res.json([]);
});

// Update the current tutor's application
router.put('/me/application', (_req, res) => {
  res.json([]);
});

// Update the current tutor's profile
router.put('/me/profile', (_req, res) => {
  res.json([]);
});

// Update the current tutor's availability
router.put('/me/availability', (_req, res) => {
  res.json([]);
});

// Add subjects to the current tutor's profile
router.post('/me/subjects', (_req, res) => {
  res.json([]);
});

// Delete a subject from the current tutor's profile
router.delete('/me/subjects/:subjectId', (_req, res) => {
  res.json([]);
});

module.exports = router;
