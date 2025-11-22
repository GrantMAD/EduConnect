import {
    faBookOpen, faPencilAlt, faLightbulb, faStar, faGraduationCap,
    faChalkboard, faCompass, faUserTie, faBookReader, faUniversity,
    faHandHoldingHeart, faEye, faShieldAlt, faTrophy, faLandmark
} from '@fortawesome/free-solid-svg-icons';

export const BADGES = {
    student: [
        { id: 'student_novice', name: 'Novice Scholar', description: 'Earn 100 XP', min_xp: 100, icon: faBookOpen },
        { id: 'student_apprentice', name: 'Apprentice', description: 'Earn 500 XP', min_xp: 500, icon: faPencilAlt },
        { id: 'student_seeker', name: 'Knowledge Seeker', description: 'Earn 1000 XP', min_xp: 1000, icon: faLightbulb },
        { id: 'student_star', name: 'Classroom Star', description: 'Earn 2500 XP', min_xp: 2500, icon: faStar },
        { id: 'student_master', name: 'Academic Master', description: 'Earn 5000 XP', min_xp: 5000, icon: faGraduationCap },
    ],
    teacher: [
        { id: 'teacher_mentor', name: 'New Mentor', description: 'Earn 100 XP', min_xp: 100, icon: faChalkboard },
        { id: 'teacher_guide', name: 'Guide', description: 'Earn 500 XP', min_xp: 500, icon: faCompass },
        { id: 'teacher_leader', name: 'Inspiring Leader', description: 'Earn 1000 XP', min_xp: 1000, icon: faUserTie },
        { id: 'teacher_educator', name: 'Master Educator', description: 'Earn 2500 XP', min_xp: 2500, icon: faBookReader },
        { id: 'teacher_legend', name: 'Legendary Professor', description: 'Earn 5000 XP', min_xp: 5000, icon: faUniversity },
    ],
    parent: [
        { id: 'parent_supporter', name: 'Supporter', description: 'Earn 100 XP', min_xp: 100, icon: faHandHoldingHeart },
        { id: 'parent_guardian', name: 'Involved Guardian', description: 'Earn 500 XP', min_xp: 500, icon: faEye },
        { id: 'parent_super', name: 'Super Parent', description: 'Earn 1000 XP', min_xp: 1000, icon: faShieldAlt },
        { id: 'parent_champion', name: 'Family Champion', description: 'Earn 2500 XP', min_xp: 2500, icon: faTrophy },
        { id: 'parent_pillar', name: 'Education Pillar', description: 'Earn 5000 XP', min_xp: 5000, icon: faLandmark },
    ]
};
