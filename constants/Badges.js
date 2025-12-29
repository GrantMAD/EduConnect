import {
    faBookOpen, faPencilAlt, faLightbulb, faStar, faGraduationCap,
    faChalkboard, faCompass, faUserTie, faBookReader, faUniversity,
    faHandHoldingHeart, faEye, faShieldAlt, faTrophy, faLandmark,
    faTools, faUserShield, faBuilding, faRocket, faChartLine
} from '@fortawesome/free-solid-svg-icons';

/**
 * BADGES Configuration
 * Categorized by user role.
 * Each badge has:
 * - id: unique identifier
 * - name: Display name
 * - description: Text shown on hover/detail
 * - min_xp: Experience threshold to unlock
 * - icon: FontAwesome icon object
 */
export const BADGES = {
    student: [
        { id: 'student_1', name: 'Freshman', description: 'Just starting the journey.', min_xp: 100, icon: faBookOpen },
        { id: 'student_2', name: 'Diligent Worker', description: 'Consistently completing tasks.', min_xp: 500, icon: faPencilAlt },
        { id: 'student_3', name: 'Honor Roll', description: 'Excellence in all activities.', min_xp: 1000, icon: faStar },
        { id: 'student_4', name: 'Scholar', description: 'A true seeker of knowledge.', min_xp: 2500, icon: faGraduationCap },
        { id: 'student_5', name: 'Valedictorian', description: 'Top tier academic achievement.', min_xp: 5000, icon: faTrophy },
    ],
    teacher: [
        { id: 'teacher_1', name: 'Mentor', description: 'Guiding the next generation.', min_xp: 100, icon: faChalkboard },
        { id: 'teacher_2', name: 'Innovator', description: 'Bringing new ideas to the classroom.', min_xp: 500, icon: faLightbulb },
        { id: 'teacher_3', name: 'Subject Expert', description: 'Mastery of your domain.', min_xp: 1000, icon: faUniversity },
        { id: 'teacher_4', name: 'Inspiring Guide', description: 'Making a real impact on students.', min_xp: 2500, icon: faCompass },
        { id: 'teacher_5', name: 'Academic Legend', description: 'A pillar of the institution.', min_xp: 5000, icon: faBookReader },
    ],
    parent: [
        { id: 'parent_1', name: 'Supporter', description: 'Actively following student progress.', min_xp: 100, icon: faHandHoldingHeart },
        { id: 'parent_2', name: 'Involved', description: 'Engaging with school activities.', min_xp: 500, icon: faEye },
        { id: 'parent_3', name: 'Guardian', description: 'Providing a safe path for learning.', min_xp: 1000, icon: faShieldAlt },
        { id: 'parent_4', name: 'Advocate', description: 'Championing student success.', min_xp: 2500, icon: faTrophy },
        { id: 'parent_5', name: 'Pillar', description: 'Essential support for the community.', min_xp: 5000, icon: faLandmark },
    ],
    admin: [
        { id: 'admin_1', name: 'Coordinator', description: 'Managing the basics efficiently.', min_xp: 100, icon: faTools },
        { id: 'admin_2', name: 'Director', description: 'Overseeing school-wide initiatives.', min_xp: 500, icon: faUserShield },
        { id: 'admin_3', name: 'Strategist', description: 'Planning for long-term growth.', min_xp: 1000, icon: faChartLine },
        { id: 'admin_4', name: 'Superintendent', description: 'Leading the institution to success.', min_xp: 2500, icon: faBuilding },
        { id: 'admin_5', name: 'Visionary', description: 'Defining the future of education.', min_xp: 5000, icon: faRocket },
    ]
};