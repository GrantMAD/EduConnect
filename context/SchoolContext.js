import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase'; // Assuming supabase client is available

const SchoolContext = createContext(null);

export const SchoolProvider = ({ children }) => {
  const [schoolId, setSchoolId] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [loadingSchool, setLoadingSchool] = useState(true);

  useEffect(() => {
    const fetchSchoolData = async () => {
      setLoadingSchool(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user && user.user_metadata && user.user_metadata.school_id) {
        const id = user.user_metadata.school_id;
        setSchoolId(id);

        // Fetch school details from your 'schools' table
        const { data, error } = await supabase
          .from('schools') // Assuming you have a 'schools' table
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching school data:', error.message);
          setSchoolData(null);
        } else if (data) {
          setSchoolData(data);
        }
      } else {
        setSchoolId(null);
        setSchoolData(null);
      }
      setLoadingSchool(false);
    };

    fetchSchoolData();

    // Listen for auth state changes to re-fetch school data if user changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchSchoolData();
      } else {
        setSchoolId(null);
        setSchoolData(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <SchoolContext.Provider value={{ schoolId, schoolData, loadingSchool, setSchoolId, setSchoolData }}>
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
