import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { getCurrentUser, onAuthStateChange } from '../services/authService';
import { getUserProfile } from '../services/userService';
import { fetchSchoolById } from '../services/schoolService';

const SchoolStateContext = createContext();
const SchoolActionsContext = createContext();

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

  const stateValue = React.useMemo(() => ({ 
    schoolId, 
    schoolData, 
    loadingSchool 
  }), [schoolId, schoolData, loadingSchool]);

  const actionsValue = React.useMemo(() => ({
    setSchoolId, 
    setSchoolData,
    refreshSchoolData: fetchSchoolData
  }), [setSchoolId, setSchoolData, fetchSchoolData]);

  return (
    <SchoolStateContext.Provider value={stateValue}>
      <SchoolActionsContext.Provider value={actionsValue}>
        {children}
      </SchoolActionsContext.Provider>
    </SchoolStateContext.Provider>
  );
};

export const useSchool = () => {
  const state = useContext(SchoolStateContext);
  const actions = useContext(SchoolActionsContext);
  if (!state || !actions) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return { ...state, ...actions };
};

export const useSchoolState = () => {
  const context = useContext(SchoolStateContext);
  if (!context) {
    throw new Error('useSchoolState must be used within a SchoolProvider');
  }
  return context;
};

export const useSchoolActions = () => {
  const context = useContext(SchoolActionsContext);
  if (!context) {
    throw new Error('useSchoolActions must be used within a SchoolProvider');
  }
  return context;
};
