import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { 
  format, 
  addWeeks, 
  eachWeekOfInterval, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addDays,
  parse,
  isWithinInterval 
} from 'date-fns';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    flexDirection: 'column',
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  titlePage: {
    height: '90%', // Reduced from 100% to avoid pushing footer
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC', 
    border: '1pt solid #E2E8F0',
    margin: 20,
    borderRadius: 4,
    padding: 20
  },
  titleContainer: {
    padding: 30, // Reduced padding
    alignItems: 'center',
    borderTop: '4pt solid #3B82F6', 
    borderBottom: '4pt solid #3B82F6',
    width: '80%',
  },
  title: {
    fontSize: 32,
    marginBottom: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B', // Slate 800
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18, 
    color: '#64748B', // Slate 500
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    marginBottom: 10,
    paddingBottom: 4,
    borderBottom: '2pt solid #E2E8F0',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // ... School Section Styles
  schoolCard: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderLeft: '3pt solid #CBD5E1', // Default, will override
    borderRadius: 2,
  },
  schoolName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: '#1E293B',
  },
  jteRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'center',
  },
  jteName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    width: 80,
    color: '#475569',
  },
  jteClasses: {
    fontSize: 9,
    color: '#64748B',
    flex: 1,
  },

  // ... Schedule Styles
  weekContainer: {
    marginBottom: 20,
    width: '48%', // Slightly wider
  },
  weekHeaderBox: {
    backgroundColor: '#1E293B',
    padding: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginBottom: 0,
  },
  weekTitle: {
    fontSize: 10, // Slightly smaller
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  scheduleGrid: {
    border: '1pt solid #E2E8F0',
    borderTop: 'none',
  },
  schedulesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    width: '100%'
  },
  
  // Day Headers
  dayHeaderRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #E2E8F0',
  },
  dayColumn: {
    width: '20%',
    borderRight: '1pt solid #E2E8F0',
  },
  dayHeader: {
    padding: 6,
    textAlign: 'center',
    backgroundColor: '#F1F5F9',
  },
  dayName: {
    fontSize: 9, 
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
  },
  dayDate: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 2,
  },

  // Cells
  schoolRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #E2E8F0',
    minHeight: 20,
  },
  schoolCell: {
    flex: 1,
    padding: 4,
    borderRight: '1pt solid #E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  schoolText: {  
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: '#1F2937',
  },
  periodRow: {
    flexDirection: 'row',
    minHeight: 50,
    borderBottom: '1pt solid #E2E8F0', 
  },
  periodCell: {
    flex: 1,
    padding: 5,
    fontSize: 8, 
    textAlign: 'center',
    justifyContent: 'flex-start', // Top align content
    borderRight: '1pt solid #E2E8F0', 
  },
  classText: {
    fontSize: 9, // Slightly larger base size
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  classSummary: {
    fontSize: 8, // Increased from 7
    color: '#475569', // Darker gray for better visibility
    marginTop: 1, 
    lineHeight: 1.2,
  },
  specialDayText: {  
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: '#4B5563',
    fontStyle: 'italic',
  },
  periodLabel: { // If used
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRight: '1pt solid #E2E8F0',
  },
  periodLabelText: {
    fontSize: 7,
    color: '#94A3B8',
    transform: 'rotate(-90deg)',
  },

  // ... Tally View Styles
  compactTallyContainer: {
    width: '100%',
    marginTop: 10,
    border: '1pt solid #E2E8F0',
    borderRadius: 4,
    overflow: 'hidden', // for corners
  },
  compactTallyHeader: {
    flexDirection: 'row',
    borderBottom: '1pt solid #CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  headerCell: {
    padding: 6,
    justifyContent: 'center',
    borderRight: '1pt solid #E2E8F0',
  },
  headerText: {
    fontSize: 9,
    textAlign: 'center',
    color: '#475569',
  },
  dataRow: {
    flexDirection: 'row',
    minHeight: 22,
    borderBottom: '1pt solid #F1F5F9', // Lighter internal borders
  },
  dataCell: {
    padding: 4,
    justifyContent: 'center',
    borderRight: '1pt solid #F1F5F9',
  },
  dataCellText: {
    fontSize: 8,
    textAlign: 'center',
    color: '#334155',
  },
  weekLabel: {
    fontSize: 8,
    textAlign: 'center',
    padding: 4,
    color: '#64748B',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderTop: '1pt solid #CBD5E1',
    minHeight: 24,
  },
  totalText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: '#1E293B',
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1pt solid #E2E8F0',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: '#94A3B8',
  },

  lessonPlanTitle: {
    fontSize: 8,
    color: '#2563EB', // Blue-600
    marginTop: 2,
    fontStyle: 'italic',
    marginBottom: 1,
  }
}, { strict: false });

const WeeklySchedule = ({ startDate, schools, schedule, assignments, lessonPlans }) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const endDate = addDays(startDate, 4);

  const formatDateLabel = (date) => {
    return format(date, 'M/d');
  };

  const getDaySchedule = (date, day) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const assignmentKey = `${dateStr}-${day}`;
    const assignment = assignments[assignmentKey];
    
    // Check for special day string or object
    // Handle both old string format and new object format if applicable
    const isSpecialDay = typeof assignment === 'string' ? 
      assignment.startsWith('special_') : 
      assignment?.schoolId?.startsWith('special_');
      
    const specialType = isSpecialDay ? 
      (typeof assignment === 'string' ? 
        assignment.replace('special_', '') : 
        assignment?.schoolId?.replace('special_', '')
      ) : null;
      
    const school = !isSpecialDay ? schools.find(s => 
      String(s.id) === String(assignment?.schoolId || assignment)
    ) : null;
    
    return { school, specialType };
  };

  const getPeriodClass = (date, day, periodNum) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const key = `${dateStr}-${day}-${periodNum}`;
    const periodData = schedule[key];
    
    // If there's a lesson plan, add its title as summary
    if (periodData?.lessonPlanId) {
      const lessonPlan = lessonPlans?.find(p => p.id === periodData.lessonPlanId);
      if (lessonPlan) {
        return {
          ...periodData,
          summary: lessonPlan.title
        };
      }
    }
    
    // Handle other cases as before
    if (periodData?.special === 'Other' && periodData?.summary) {
      return {
        ...periodData,
        special: `Other: ${periodData.summary}`
      };
    }
    
    return periodData;
  };

  return (
    <View style={styles.weekContainer}>
      <View style={styles.weekHeaderBox}>
        <Text style={styles.weekTitle}>
           {format(startDate, 'MMMM do')} - {format(endDate, 'MMMM do')}
        </Text>
      </View>
      
      <View style={styles.scheduleGrid}>
        {/* Days Header */}
        <View style={styles.dayHeaderRow}>
          {days.map((day, index) => {
            const date = addDays(startDate, index);
            const { school, specialType } = getDaySchedule(date, day);
            
            // Background Logic: School -> White (to show content), Special -> Gray, None -> White
            const bg = school ? '#FFFFFF' : (specialType ? '#E2E8F0' : '#FFFFFF');

            return (
              <View key={day} style={[
                styles.dayColumn,
                { backgroundColor: bg }
              ]}>
                <View style={[styles.dayHeader, { backgroundColor: specialType ? '#CBD5E1' : '#F1F5F9' }]}>
                  <Text style={styles.dayName}>
                    {day.slice(0, 3).toUpperCase()}
                  </Text>
                  <Text style={styles.dayDate}>
                    {format(date, 'd')}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* School/Special Day Row */}
        <View style={styles.schoolRow}>
          {days.map((day, index) => {
            const date = addDays(startDate, index);
            const { school, specialType } = getDaySchedule(date, day);
            
            const cellStyle = {
               // Make highlighing stronger: 15% opacity -> 25% or 30%
               backgroundColor: school ? `${school.accentColor}30` : (specialType ? '#E2E8F0' : '#FFFFFF'),
               borderBottomColor: school ? school.accentColor : '#CBD5E1',
               borderBottomWidth: school ? 2 : 1,
            };

            return (
              <View key={`school-${day}`} style={[ styles.schoolCell, cellStyle ]}>
                <Text style={[
                  specialType ? styles.specialDayText : styles.schoolText,
                  school ? { color: school.accentColor } : {}
                ]}>
                  {school?.name || specialType || ' '}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Grid rows */}
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <View key={rowIndex} style={styles.periodRow}>
            {days.map((day, dayIndex) => {
              const date = addDays(startDate, dayIndex);
              const { school, specialType } = getDaySchedule(date, day);
              const periodData = getPeriodClass(date, day, rowIndex + 1);
              const isSpecialPeriod = periodData?.special;
              
              // Special day striping logic
              const isStriped = specialType && (rowIndex % 2 === 0);
              const cellBg = school 
                  ? `${school.accentColor}20` // Stronger highlight (was 05)
                  : (specialType 
                      ? (isStriped ? '#F1F5F9' : '#E2E8F0') // Zebra stripe special days
                      : 'white');

              return (
                <View 
                  key={`${day}-${rowIndex}`} 
                  style={[
                    styles.periodCell,
                    { 
                      backgroundColor: cellBg,
                      borderRight: dayIndex === 4 ? 'none' : '1pt solid #E2E8F0'
                    }
                  ]}
                >
                  <Text 
                    style={isSpecialPeriod ? styles.specialDayText : styles.classText}
                    numberOfLines={1}
                  >
                    {isSpecialPeriod ? periodData.special :
                      periodData?.yearGroup && periodData?.classNumber 
                        ? `${periodData.yearGroup} - ${periodData.classNumber}` 
                        : ' '}
                  </Text>
                  
                  {/* ONLY Show Summary (or Lesson title if summary missing) */}
                  {periodData && !periodData.special && (
                     (() => {
                        // Priority 1: Manual Summary
                        if(periodData.summary) {
                            return (
                                <Text style={styles.classSummary} numberOfLines={2}>
                                    {periodData.summary}
                                </Text>
                            );
                        }
                        // Priority 2: Lesson Plan Title (fallback if no manual summary)
                        if(periodData.lessonPlanId) {
                            const lp = lessonPlans?.find(p => p.id === periodData.lessonPlanId);
                            if(lp) {
                                return (
                                    <Text style={styles.classSummary} numberOfLines={2}>
                                        {lp.title}
                                    </Text>
                                );
                            }
                        }
                        return null;
                     })()
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};


const processTallyData = (schools, schedule, assignments, weeks) => {
  const schoolData = {};
  const classCounts = {};

  
  schools.forEach(school => {
    schoolData[school.id] = {
      name: school.name,
      accentColor: school.accentColor,
      classes: new Set()
    };
  });

  
  weeks.forEach(week => {
    const weekStart = week.start;
    const weekEnd = week.end;
    
    
    eachDayOfInterval({ start: weekStart, end: weekEnd }).forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = format(date, 'EEEE');
      const assignmentKey = `${dateStr}-${dayName}`;
      const assignment = assignments[assignmentKey];

      
      if (!assignment || (typeof assignment === 'string' && assignment.startsWith('special_'))) {
        return;
      }

      const schoolId = assignment?.schoolId || assignment;
      if (!schoolId || !schoolData[schoolId]) return;

      
      Array.from({ length: 6 }).forEach((_, periodNum) => {
        const scheduleKey = `${dateStr}-${dayName}-${periodNum + 1}`;
        const periodData = schedule[scheduleKey];

        if (periodData?.yearGroup && periodData?.classNumber) {
          const classKey = `${periodData.yearGroup}-${periodData.classNumber}`;
          schoolData[schoolId].classes.add(classKey);

          
          if (!classCounts[schoolId]) classCounts[schoolId] = {};
          if (!classCounts[schoolId][classKey]) {
            classCounts[schoolId][classKey] = weeks.reduce((acc, w) => {
              acc[w.start.toISOString()] = 0;
              return acc;
            }, {});
          }

          classCounts[schoolId][classKey][weekStart.toISOString()]++;
        }
      });
    });
  });

  
  return schools
    .filter(school => schoolData[school.id].classes.size > 0)
    .map(school => ({
      id: school.id,
      name: school.name,
      accentColor: school.accentColor,
      classes: Array.from(schoolData[school.id].classes).sort(),
      counts: Array.from(schoolData[school.id].classes).sort().map(classKey => ({
        class: classKey,
        weeks: weeks.map(week => ({
          weekStart: week.start.toISOString(),
          count: classCounts[school.id]?.[classKey]?.[week.start.toISOString()] || 0
        })),
        total: Object.values(classCounts[school.id]?.[classKey] || {}).reduce((a, b) => a + b, 0)
      }))
    }));
};


const CompactTallyView = ({ schools, data, weeks }) => (
  <View style={styles.compactTallyContainer}>
    {/* Header Row */}
    <View style={styles.compactTallyHeader}>
      {/* Week/Class Header Column */}
      <View style={{ width: '15%', borderRight: '1pt solid #CBD5E1' }}>
        <View style={styles.headerCell}>
          <Text style={styles.headerText}>Week / Class</Text>
        </View>
      </View>

      {/* School Columns */}
      {data.map(school => (
        <View key={school.id} style={{ flex: 1 }}>
          {/* School Name with accent color */}
          <View style={[
            styles.headerCell, 
            { 
              backgroundColor: `${school.accentColor}10`, // Very light bg
              borderRight: '1pt solid #CBD5E1',
              borderTop: `3pt solid ${school.accentColor}`
            }
          ]}>
            <Text style={[
              styles.headerText, 
              { 
                fontFamily: 'Helvetica-Bold',
                color: school.accentColor
              }
            ]}>
              {school.name}
            </Text>
          </View>
        </View>
      ))}
    </View>

    {/* Class Numbers Row */}
    <View style={{ flexDirection: 'row', borderBottom: '1pt solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
      {/* Empty cell for Week/Class column */}
      <View style={{ 
        width: '15%', 
        borderRight: '1pt solid #CBD5E1',
      }} />

      {/* Class Numbers */}
      {data.map(school => (
        <View key={`${school.id}-classes`} style={{ flex: 1, flexDirection: 'row' }}>
          {school.classes.map(classKey => (
            <View key={classKey} style={{ 
              flex: 1, 
              padding: 4,
              borderRight: '1pt solid #E2E8F0',
              justifyContent: 'center'
            }}>
              <Text style={{ fontSize: 8, textAlign: 'center', color: '#64748B' }}>{classKey}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>

    {/* Data Rows */}
    {weeks.map((week, i) => (
      <View key={i} style={[
        styles.dataRow,
        // Zebra striping
        i % 2 === 0 ? { backgroundColor: '#FFFFFF' } : { backgroundColor: '#F8FAFC' }
      ]}>
        {/* Week Label with Date Range */}
        <View style={{ 
          width: '15%', 
          borderRight: '1pt solid #CBD5E1',
          justifyContent: 'center',
          paddingLeft: 8
        }}>
          <Text style={styles.weekLabel}>
            {`${format(week.start, 'M/d')} - ${format(week.end, 'M/d')}`}
          </Text>
        </View>

        {/* School Data */}
        {data.map(school => (
          <View key={`${school.id}-${i}`} style={{ flex: 1, flexDirection: 'row' }}>
            {school.counts.map(count => {
              const val = count.weeks.find(w => w.weekStart === week.start.toISOString())?.count || 0;
              return (
                <View key={`${count.class}-${i}`} style={[
                  styles.dataCell,
                  { 
                    flex: 1,
                    // Stronger highlight for non-zero cells
                    backgroundColor: val > 0 ? `${school.accentColor}25` : 'transparent', 
                    borderRight: '1pt solid #F1F5F9',
                  }
                ]}>
                  <Text style={[
                    styles.dataCellText,
                    val === 0 ? { color: '#CBD5E1' } : { fontFamily: 'Helvetica-Bold' }
                  ]}>
                    {val === 0 ? '-' : val}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    ))}

    {/* Totals Row */}
    <View style={styles.totalRow}>
      <View style={{ 
        width: '15%', 
        borderRight: '1pt solid #CBD5E1',
        justifyContent: 'center'
      }}>
        <Text style={[styles.weekLabel, { fontFamily: 'Helvetica-Bold', color: '#1E293B' }]}>TOTAL</Text>
      </View>

      {data.map(school => (
        <View key={`${school.id}-total`} style={{ flex: 1, flexDirection: 'row' }}>
          {school.counts.map(count => (
            <View key={`${count.class}-total`} style={[
              styles.dataCell,
              { 
                flex: 1,
                borderRight: '1pt solid #E2E8F0'
              }
            ]}>
              <Text style={styles.totalText}>
                {count.total}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  </View>
);


const generateWeeks = (startDate, numWeeks) => {
  
  const monday = startOfWeek(startDate, { weekStartsOn: 1 });
  
  return Array.from({ length: numWeeks }, (_, i) => {
    const weekStart = addWeeks(monday, i);
    return {
      start: weekStart,
      end: addDays(weekStart, 4) 
    };
  });
};

export const generateScheduleReport = async (startDate, numWeeks, schools, schedule, assignments, settings, lessonPlans) => {
  const weeks = Array.from({ length: numWeeks }, (_, i) => ({
    start: addWeeks(startOfWeek(startDate, { weekStartsOn: 1 }), i),
    end: endOfWeek(addWeeks(startDate, i), { weekStartsOn: 1 })
  }));

  const tallyData = processTallyData(schools, schedule, assignments, weeks);

  const formatPeriod = (periodData) => {
    if (!periodData) return '';
    
    let result = '';
    if (periodData.type === 'class') {
      result = `${periodData.yearGroup}-${periodData.classNumber}`;
    } else if (periodData.special) {
      result = periodData.special;
    }
    
    
    if (periodData.summary) {
      result += `\n${periodData.summary}`;
    }
    
    return result;
  };

  const renderPeriod = (scheduleItem, period) => {
    if (scheduleItem?.special) {
      return `${scheduleItem.special}${scheduleItem.summary ? ` - ${scheduleItem.summary}` : ''}`;
    }

    if (period.type === 'lunch' && scheduleItem?.yearGroup && scheduleItem?.classNumber) {
      return `Lunch - Year ${scheduleItem.yearGroup}-${scheduleItem.classNumber}`;
    }

    if (scheduleItem?.yearGroup && scheduleItem?.classNumber) {
      return `Year ${scheduleItem.yearGroup}-${scheduleItem.classNumber}${
        scheduleItem.summary ? ` - ${scheduleItem.summary}` : ''
      }`;
    }

    return period.type === 'lunch' ? 'Lunch' : `Period ${period.id}`;
  };

  // Format dates using settings
  const formatDate = (date) => format(date, settings?.dateFormat || 'dd/MM/yyyy');

  const addPeriodDetails = (doc, scheduleItem, lessonPlans) => {
    if (scheduleItem) {
      if (scheduleItem.special) {
        doc.text(scheduleItem.special);
        if (scheduleItem.summary) {
          doc.font('Helvetica').fontSize(9).text(scheduleItem.summary);
        }
      } else {
        doc.text(`Year ${scheduleItem.yearGroup}-${scheduleItem.classNumber}`);
        
        // Add lesson plan title if exists
        if (scheduleItem.lessonPlanId) {
          const lessonPlan = lessonPlans.find(p => p.id === scheduleItem.lessonPlanId);
          if (lessonPlan) {
            doc.font('Helvetica').fontSize(9)
              .text(`Lesson: ${lessonPlan.title}`, {color: 'blue'});
          }
        } else if (scheduleItem.summary) {
          doc.font('Helvetica').fontSize(9).text(scheduleItem.summary);
        }
      }
    } else {
      doc.text('No class scheduled');
    }
  };

  const renderPeriodCell = (dayKey, period, scheduleData, lessonPlans) => {
    if (!scheduleData) return null;
  
    let content = [];
    
    if (scheduleData.type === 'special' || scheduleData.special) {
      content.push(
        <Text key="special" style={styles.periodText}>
          {scheduleData.special}
        </Text>
      );
      if (scheduleData.summary) {
        content.push(
          <Text key="summary" style={styles.summaryText}>
            {scheduleData.summary}
          </Text>
        );
      }
    } else {
      // Main class info
      content.push(
        <Text key="class" style={styles.periodText}>
          Year {scheduleData.yearGroup}-{scheduleData.classNumber}
        </Text>
      );
  
      // Add lesson plan title if exists
      if (scheduleData.lessonPlanId) {
        const lessonPlan = lessonPlans?.find(p => p.id === scheduleData.lessonPlanId);
        if (lessonPlan?.title) {
          content.push(
            <Text key="lessonPlan" style={styles.lessonPlanTitle}>
              {lessonPlan.title}
            </Text>
          );
        }
      }
      // Add summary if no lesson plan but has summary
      else if (scheduleData.summary) {
        content.push(
          <Text key="summary" style={styles.summaryText}>
            {scheduleData.summary}
          </Text>
        );
      }
    }
  
    return (
      <View style={styles.periodCell}>
        {content}
      </View>
    );
  };

  const ScheduleDocument = () => {
    // Calculate total date range
    const totalStart = startDate;
    const totalEnd = addWeeks(startDate, numWeeks);
    const dateRangeStr = `${format(totalStart, 'MMMM do')} - ${format(addDays(totalEnd, -1), 'MMMM do')}`;

    return (
    <Document>
      {/* Title Page */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.titlePage}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Weekly Schedule Record</Text>
            <Text style={styles.subtitle}>{dateRangeStr}</Text>
          </View>
          <Text style={{ marginTop: 20, color: '#94A3B8', fontSize: 14 }}>
            {settings.altName || 'Assistant Language Teacher'}
          </Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by ALT Planner</Text>
        </View>
      </Page>

      {/* School & JTE Summary Page */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.sectionTitle}>School & Staff Overview</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 }}>
          {schools.map(school => (
            <View key={school.id} style={[styles.schoolCard, { width: '48%', borderColor: school.accentColor }]}>
              <Text style={[styles.schoolName, { color: school.accentColor }]}>{school.name}</Text>
              <View>
                {school.jtes?.map((jte, index) => (
                  <View key={index} style={styles.jteRow}>
                    <Text style={styles.jteName}>{jte}</Text>
                    <Text style={styles.jteClasses}>
                      {school.classes
                        ?.filter(c => c.jteIndex === index)
                        .map(c => `${c.yearGroup}-${c.classNumber}`)
                        .join(', ')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
        
        <View style={styles.footer} fixed>
           <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
            `${pageNumber} / ${totalPages}`
          )} />
        </View>
      </Page>

      {/* Weekly Schedule Pages - Two schedules per page */}
      {Array.from({ length: Math.ceil(numWeeks / 2) }).map((_, pageIndex) => (
        <Page key={pageIndex} size="A4" orientation="landscape" style={[styles.page, { padding: 20 }]}>
          <View wrap={false} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1pt solid #E2E8F0', paddingBottom: 5 }}>
              <Text style={{ fontSize: 10, color: '#94A3B8' }}>SCHEDULE RECORD</Text>
              <Text style={{ fontSize: 10, color: '#94A3B8' }}>{format(startDate, 'MMMM yyyy').toUpperCase()}</Text>
            </View>
            
            <View style={styles.schedulesRow}>
              <WeeklySchedule
                startDate={addWeeks(startDate, pageIndex * 2)}
                schools={schools}
                schedule={schedule}
                assignments={assignments}
                lessonPlans={lessonPlans}
              />
              {pageIndex * 2 + 1 < numWeeks && (
                <WeeklySchedule
                  startDate={addWeeks(startDate, pageIndex * 2 + 1)}
                  schools={schools}
                  schedule={schedule}
                  assignments={assignments}
                  lessonPlans={lessonPlans}
                />
              )}
            </View>
          </View>
          
          <View style={styles.footer} fixed>
           <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
            `${pageNumber} / ${totalPages}`
          )} />
        </View>
        </Page>
      ))}

      {/* Tally View Page */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.sectionTitle}>Class Stats Summary</Text>
        <CompactTallyView 
          schools={schools}
          data={tallyData}
          weeks={weeks}
        />
        <View style={styles.footer} fixed>
           <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
            `${pageNumber} / ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
  }

  
  try {
    const blob = await pdf(<ScheduleDocument />).toBlob();
    if (!blob) throw new Error('PDF generation returned empty blob');
    return blob;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
};
