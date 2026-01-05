import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getCurrentUser, onAuthStateChange } from '../services/authService';
import { getUserProfile } from '../services/userService';
import { fetchSchoolById } from '../services/schoolService';

const SchoolContext = createContext();

export const SchoolProvider = ({ children, session }) => {
  const [schoolId, setSchoolId] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [loadingSchool, setLoadingSchool] = useState(true);

  const fetchSchoolData = useCallback(async () => {
    if (!session?.user?.id) {
      setSchoolId(null);
      setSchoolData(null);
      setLoadingSchool(false);
      return;
    }

    try {
      const userData = await getUserProfile(session.user.id);
      
      if (userData?.school_id) {
        setSchoolId(userData.school_id);
        const data = await fetchSchoolById(userData.school_id);
        setSchoolData(data);
      } else {
        setSchoolId(null);
        setSchoolData(null);
      }
    } catch (err) {
      console.error('Error in SchoolContext:', err);
    } finally {
      setLoadingSchool(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchSchoolData();
  }, [fetchSchoolData]);

  const value = React.useMemo(() => ({ 
    schoolId, 
    schoolData, 
    loadingSchool, 
    setSchoolId, 
    setSchoolData 
  }), [schoolId, schoolData, loadingSchool]);

  return (
    <SchoolContext.Provider value={value}>
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
};
