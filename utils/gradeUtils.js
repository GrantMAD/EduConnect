import {
    PRIMARY_GRADES,
    HIGH_SCHOOL_GRADES,
    ALL_GRADES,
    DEFAULT_PRIMARY_MIN_GRADE,
    DEFAULT_HIGH_SCHOOL_MIN_GRADE
} from '../constants/GradeConstants';

export const getGradesBySchoolType = (schoolType) => {
    switch (schoolType) {
        case 'Primary School':
            return PRIMARY_GRADES;
        case 'High School':
            return HIGH_SCHOOL_GRADES;
        case 'Combined School':
            return ALL_GRADES;
        case 'College':
        case 'University':
        case 'Other':
            return [];
        default:
            return ALL_GRADES;
    }
};

export const getDefaultMinGrade = (schoolType) => {
    if (schoolType === 'Primary School') return DEFAULT_PRIMARY_MIN_GRADE;
    if (schoolType === 'High School') return DEFAULT_HIGH_SCHOOL_MIN_GRADE;
    return DEFAULT_PRIMARY_MIN_GRADE;
};

export const isGradeRestricted = (grade, minGrade, allGrades = ALL_GRADES) => {
    if (!grade || !minGrade) return false;
    const gradeIndex = allGrades.indexOf(grade);
    const minGradeIndex = allGrades.indexOf(minGrade);

    if (gradeIndex === -1 || minGradeIndex === -1) return false;
    return gradeIndex < minGradeIndex;
};
