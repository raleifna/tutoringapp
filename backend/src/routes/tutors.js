/**
 * Routes for tutors
 * 
 * @route GET /api/v1/tutors
 * @route GET /api/v1/tutors/:id
 * @route GET /api/v1/tutors/:id/availability
 * @route GET /api/v1/tutors/me/profile
 * @route PUT /api/v1/tutors/me/application
 * @route PUT /api/v1/tutors/me/profile
 * @route PUT /api/v1/tutors/me/availability
 * @route POST /api/v1/tutors/me/subjects
 * @route DELETE /api/v1/tutors/me/subjects/:subjectId
 */
const express = require('express');

const router = express.Router();

// Get all tutors
router.get('/', (_req, res) => {
  let tutors = [];
  // make fake tutors
  for (let i = 0; i < 1000; i++) {
    tutors.push({
      id: i,
      name: `Tutor ${i}`,
      email: `tutor${i}@example.com`,
      phone: `1234567890${i}`,
      subjects: [],
      availability: [],
    });
  }
  
  // result is page 1 current
  res.json({
    success: true,
    data: {
      tutors,
      pagination: {
        page: 1,
        limit: 100,
        total: tutors.length,
        totalPages: Math.ceil(tutors.length / 100),
      },
    },
  });
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
