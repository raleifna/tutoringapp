import { errorHandler } from "../middleware/errorHandler";

exports.searchTutors = async (req, res) => {
  let page = req.query.page || 1;
  let limit = req.query.limit || 12;
  let subject = req.query.subject || '';
  let tutors = prisma.tutorProfile.findMany({
      where: {
        status: 'ACTIVE',
        subjects: {
          some: {
            subject: { name: { contains: subject, mode: 'insensitive' } }
          }
        }
      },
      select: tutorProfileSelect,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });
  let total = prisma.tutorProfile.count({ 
      where: {
        status: 'ACTIVE',
        subjects: {
          some: {
            subject: { name: { contains: subject, mode: 'insensitive' } }
          }
        }
      },
    });

  res.json({
    success: true,
    data: {
      tutors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(parseInt(total) / parseInt(limit)),
      },
    },
  });
};

exports.getTutorProfile = async (req, res) => {
  let userId = req.params.id;
  let tutor = await prisma.tutorProfile.findFirst({
    where: {
      userId: userId,
      status: 'ACTIVE',
    }
  });

  if (!tutor) {
    return res.status(400).json({
            success: false,
            message: 'Tutor not found',
        });
  }

  res.json({ success: true, data: tutor });
}

exports.getMyProfile = async (req, res) => {}

exports.updateApplication = async (req, res) => {}

exports.updateProfile = async (req, res) => {}

exports.updateAvailability = async (req, res) => {}

exports.getTutorAvailability = async (req, res) => {
  let userId = req.params.id;
  const profile = await prisma.tutorProfile.findFirst({
    where: { userId: userId },
    include: { availability: true },
  });

  if (!profile) {
    return res.status(400).json({
            success: false,
            message: 'Tutor not found',
        });
  }
  res.json({ success: true, data: profile.availability });
}

exports.addSubject = async (req, res) => {}

exports.removeSubject = async (req, res) => {}