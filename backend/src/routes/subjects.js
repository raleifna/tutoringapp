const express = require('express');
const prisma = require('../prisma');
const router = express.Router();

router.get('/', async (req, res) => {
  let category = req.query.category;
  let whereCondition = {};
  if (category) {
    whereCondition.category = category;
  }

  // read subjects
  let subjects = await prisma.subject.findMany({
    where: whereCondition,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  // group subjects
  let grouped = {};
  for (let i = 0; i < subjects.length; i++) {
    let currentSubject = subjects[i];
    let currentCategory = currentSubject.category;
    if (!grouped[currentCategory]) {
      grouped[currentCategory] = [];
    }
    grouped[currentCategory].push(currentSubject);
  }

  res.json({
    success: true,
    data: {
      subjects: subjects,
      grouped: grouped
    }
  });
});

router.get('/categories', async (req, res) => {
  let categories = await prisma.subject.findMany({
    distinct: ['category'],
    select: { category: true },
    orderBy: { category: 'asc' },
  });

  let list = [];
  for (let i = 0; i < categories.length; i++) {
    let currentCategory = categories[i].category;
    list.push(currentCategory);
  }

  res.json({
    success: true, 
    data: list
  });
});
module.exports = router;
