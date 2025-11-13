import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faChalkboard, faCheckCircle, faTimesCircle, faChevronDown, faChevronUp, faTag, faGraduationCap, faCalendarCheck } from '@fortawesome/free-solid-svg-icons';
import MyChildrenScreenSkeleton from '../components/skeletons/MyChildrenScreenSkeleton';


const defaultUserImage = require('../assets/user.png');

const ChildItem = ({ child, theme }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchChildData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: classMembersData, error: classMembersError } = await supabase
        .from('class_members')
        .select('id, attendance, class_id, classes (id, name, teacher:users(full_name))')
        .eq('user_id', child.id);

      if (classMembersError) throw classMembersError;

      const processedClasses = await Promise.all(classMembersData.map(async (member) => {
        const { data: schedules, error: schedulesError } = await supabase
          .from('class_schedules')
          .select('start_time')
          .eq('class_id', member.class_id)
          .order('start_time', { ascending: true });

        if (schedulesError) throw schedulesError;

        const { data: marks, error: marksError } = await supabase
          .from('student_marks')
          .select('assessment_name, mark')
          .eq('student_id', child.id)
          .eq('class_id', member.class_id);

        if (marksError) throw marksError;

        const fullAttendance = schedules.map(schedule => {
          const scheduleDate = new Date(schedule.start_time).toISOString().split('T')[0]; // YYYY-MM-DD
          const isPresent = member.attendance?.[scheduleDate]; // true, false, or undefined

          return {
            date: scheduleDate,
            status: isPresent === true ? 'present' : (isPresent === false ? 'absent' : 'unmarked')
          };
        });

        return {
          ...member,
          fullAttendance: fullAttendance,
          marks: marks || [],
        };
      }));

      setClasses(processedClasses || []);
    } catch (error) {
      console.error('Error fetching child classes:', error.message);
    } finally {
      setLoading(false);
    }
  }, [child.id]);

  const toggleExpansion = () => {
    const newExpandedState = !expanded;
    setExpanded(newExpandedState);
    if (newExpandedState && classes.length === 0) {
      fetchChildData();
    }
  };

  return (
    <View style={[styles.childCard, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
      <TouchableOpacity onPress={toggleExpansion} style={styles.childHeader}>
        <Image source={child.avatar_url ? { uri: child.avatar_url } : defaultUserImage} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.childName, { color: theme.colors.text }]}>{child.full_name}</Text>
          <Text style={[styles.childEmail, { color: theme.colors.placeholder }]}>{child.email}</Text>
        </View>
        <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} size={20} color={theme.colors.primary} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.detailsContainer}>
          {loading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            classes.map((classInfo, index) => {
              return (
                <View key={index} style={[styles.classContainer, { backgroundColor: theme.colors.background }]}>
                  <View style={styles.classHeader}>
                    <FontAwesomeIcon icon={faChalkboard} size={16} color={theme.colors.primary} />
                    <View style={{flex: 1, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap'}}>
                      <Text style={[styles.className, { color: theme.colors.text }]}>{classInfo.classes?.name || 'Unknown Class'}</Text>
                      {classInfo.classes?.teacher?.full_name && (
                        <Text style={[styles.teacherName, { color: theme.colors.placeholder }]}> (Teacher: {classInfo.classes.teacher.full_name})</Text>
                      )}
                    </View>
                  </View>

                  {classInfo.fullAttendance.length > 0 ? (
                    <>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <FontAwesomeIcon icon={faCalendarCheck} size={16} color={theme.colors.primary} style={{marginRight: 5}} />
                        <Text style={[styles.attendanceSectionTitle, { color: theme.colors.text }]}>Attendance</Text>
                      </View>
                      <Text style={[styles.sectionDescription, {color: theme.colors.placeholder}]}>Here is the attendance for this class.</Text>
                      <View style={styles.attendanceGrid}>
                        {classInfo.fullAttendance.map((entry) => {
                          const isPresent = entry.status === 'present';
                          const isAbsent = entry.status === 'absent';
                          const isUnmarked = entry.status === 'unmarked';

                          const itemBackgroundColor = isPresent ? theme.colors.success + '20' :
                                                      isAbsent ? theme.colors.error + '20' :
                                                      theme.colors.placeholder + '20'; // Light gray for unmarked
                          const itemTextColor = isPresent ? theme.colors.success :
                                                isAbsent ? theme.colors.error :
                                                theme.colors.placeholder; // Gray for unmarked
                          const itemIcon = isPresent ? faCheckCircle :
                                           isAbsent ? faTimesCircle :
                                           faUser; // A generic user icon for unmarked

                          return (
                            <View key={entry.date} style={[styles.attendanceItem, { backgroundColor: itemBackgroundColor }]}>
                              <FontAwesomeIcon icon={itemIcon} size={12} color={itemTextColor} style={{ marginRight: 4 }} />
                              <Text style={[styles.attendanceDate, { color: itemTextColor }]}>
                                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                      <Text style={[styles.attendanceLegend, { color: theme.colors.placeholder, marginTop: 10 }]}>
                        <FontAwesomeIcon icon={faCheckCircle} size={12} color={theme.colors.success} /> = Present{' '}
                        <FontAwesomeIcon icon={faTimesCircle} size={12} color={theme.colors.error} /> = Absent{' '}
                        <FontAwesomeIcon icon={faUser} size={12} color={theme.colors.placeholder} /> = Unmarked
                      </Text>
                    </>
                  ) : (
                    <Text style={{ color: theme.colors.placeholder, textAlign: 'center', marginVertical: 10 }}>No scheduled sessions for this class.</Text>
                  )}

                  {classInfo.marks.length > 0 && (
                    <>
                      <View style={styles.horizontalRule} />
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <FontAwesomeIcon icon={faGraduationCap} size={16} color={theme.colors.primary} style={{marginRight: 5}} />
                        <Text style={[styles.marksSectionTitle, { color: theme.colors.text }]}>Marks</Text>
                      </View>
                      <Text style={[styles.sectionDescription, {color: theme.colors.placeholder}]}>Here are the marks for this class.</Text>
                      <Text style={[styles.marksHeader, { color: theme.colors.text }]}>Tests</Text>
                      {classInfo.marks.filter(m => m.assessment_name.toLowerCase().startsWith('test:')).length > 0 ? (
                        classInfo.marks.filter(m => m.assessment_name.toLowerCase().startsWith('test:')).map((mark, index) => (
                          <View key={index} style={styles.markItem}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                              <FontAwesomeIcon icon={faTag} size={14} color={theme.colors.placeholder} style={{marginRight: 5}} />
                              <Text style={[styles.markAssessmentName, {color: theme.colors.text}]}>{mark.assessment_name.replace(/test: /i, '')}</Text>
                            </View>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                              <FontAwesomeIcon icon={faGraduationCap} size={14} color={theme.colors.placeholder} style={{marginRight: 5}} />
                              <Text style={[styles.markValue, {color: theme.colors.primary}]}>{mark.mark}</Text>
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.emptyText, {color: theme.colors.placeholder}]}>No tests recorded.</Text>
                      )}

                      <Text style={[styles.marksHeader, { color: theme.colors.text, marginTop: 10 }]}>Assignments</Text>
                      {classInfo.marks.filter(m => m.assessment_name.toLowerCase().startsWith('assignment:')).length > 0 ? (
                        classInfo.marks.filter(m => m.assessment_name.toLowerCase().startsWith('assignment:')).map((mark, index) => (
                          <View key={index} style={styles.markItem}>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                              <FontAwesomeIcon icon={faTag} size={14} color={theme.colors.placeholder} style={{marginRight: 5}} />
                              <Text style={[styles.markAssessmentName, {color: theme.colors.text}]}>{mark.assessment_name.replace(/assignment: /i, '')}</Text>
                            </View>
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                              <FontAwesomeIcon icon={faGraduationCap} size={14} color={theme.colors.placeholder} style={{marginRight: 5}} />
                              <Text style={[styles.markValue, {color: theme.colors.primary}]}>{mark.mark}</Text>
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.emptyText, {color: theme.colors.placeholder}]}>No assignments recorded.</Text>
                      )}
                    </>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
};

export default function MyChildrenScreen() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  const fetchAssociatedChildren = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated.");

      const { data: relationships, error: relError } = await supabase
        .from('parent_child_relationships')
        .select('child_id')
        .eq('parent_id', user.id);

      if (relError) throw relError;

      const childIds = relationships.map(rel => rel.child_id);

      if (childIds.length > 0) {
        const { data: childrenData, error: childrenError } = await supabase
          .from('users')
          .select('id, full_name, email, avatar_url')
          .in('id', childIds);

        if (childrenError) throw childrenError;
        setChildren(childrenData || []);
      }
    } catch (error) {
      console.error('Error fetching children:', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssociatedChildren();
  }, [fetchAssociatedChildren]);

  if (loading) {
    return <MyChildrenScreenSkeleton />;
  }

  return (
    <FlatList
      data={children}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ChildItem child={item} theme={theme} />}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <>
          <Text style={[styles.header, { color: theme.colors.text }]}>My Children</Text>
          <Text style={[styles.description, { color: theme.colors.placeholder }]}>
            Here you can view the classes and attendance for your associated children.
          </Text>
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>You have no children associated with your account.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  childCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  childName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  childEmail: {
    fontSize: 14,
  },
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  classContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  teacherName: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  attendanceSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 10,
  },
  attendanceLegend: {
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'left',
  },
  attendanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  attendanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  attendanceDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 10,
  },
  horizontalRule: {
    borderTopWidth: 1,
    borderColor: '#eee',
    marginVertical: 10,
  },
  marksSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  marksHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  markItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingLeft: 10,
  },
  markAssessmentName: {
    fontSize: 14,
    fontWeight: '500',
  },
  markValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
