/**
 * Small, made-up legacy files covering each format the importer accepts.
 * (Real personal data lives in fixtures/private/, which is never committed.)
 */

const school = {
  id: '1736124347140.98',
  name: 'Sakura ES',
  accentColor: '#E11D48',
  lunchPeriod: 4,
  jtes: ['Ms. Sato', 'Mr. Ito'],
  classes: [
    { yearGroup: 5, classNumber: 1, jteIndex: 0 },
    { yearGroup: 5, classNumber: 2, jteIndex: 1 },
  ],
  timeSchedules: [
    {
      id: 1736123669007,
      name: 'A',
      periods: [
        { id: 1, startTime: '08:45', endTime: '09:30' },
        { id: 2, startTime: '09:40', endTime: '10:25' },
      ],
      lunchTime: { startTime: '12:20', endTime: '13:05' },
    },
  ],
}

/** Original ALT Planner export (6 stores, sections embedded in textbooks). */
export const originalPlannerExport = {
  schools: [school],
  assignments: {
    '2025-01-06-Monday': { schoolId: school.id, scheduleId: 1736123669007 },
    '2025-01-07-Tuesday': { schoolId: school.id, scheduleId: 999 },
    '2025-01-13-Monday': { schoolId: 'special_Public Holiday', scheduleId: null },
  },
  schedule: {
    '2025-01-06-Monday-1': {
      yearGroup: 5,
      classNumber: 1,
      summary: 'Unit 1 greetings',
      type: 'class',
      special: null,
      lessonPlanId: 1739750270090,
    },
    '2025-01-06-Monday-2': { special: 'Other', summary: 'Lesson Planning', type: 'special', yearGroup: null, classNumber: null },
    '2025-01-06-Monday-lunch': { yearGroup: 5, classNumber: 8, summary: '', type: 'class', special: null },
    '2025-01-07-Tuesday-3': { special: 'Marking', summary: 'Worksheets', type: 'special', yearGroup: null, classNumber: null },
    '2025-01-07-Tuesday-4': { yearGroup: 5, classNumber: 2, summary: '', type: 'class', special: null, lessonPlanId: 424242 },
  },
  textbooks: [
    {
      id: 'textbook_1',
      title: 'New Horizon 1',
      image: '',
      digitalLink: 'https://example.com/nh1',
      altopediaLink: 'https://www.altopedia.net/textbooks/32-new-horizon',
      sections: [{ id: 1736200000000.5, pageNumber: 12, title: 'Unit 1', topic: 'be-verbs', dateCreated: '2025-01-06T00:00:00.000Z' }],
      dateCreated: '2025-01-06T00:51:38.142Z',
    },
  ],
  lessonPlans: [
    {
      id: 1739750270090,
      title: 'Greetings review',
      school: school.id,
      yearGroup: 5,
      textbook: 'textbook_1',
      section: '1736200000000.5',
      content: '<p>Warm-up: <strong>Hello song</strong></p>',
      tags: ['review'],
      resources: [{ id: 'r1', type: 'url', name: 'Song', url: 'https://example.com/song' }],
      dateCreated: '2025-02-16T23:57:50.090Z',
      dateModified: '2025-03-01T00:00:00.000Z',
    },
    {
      id: 1739750270091,
      title: 'Old delta plan',
      school: 'deleted-school',
      yearGroup: '6',
      textbook: '',
      section: '',
      content: '{"ops":[{"insert":"Line one\\nLine <two>\\n"}]}',
      tags: [],
      resources: [],
    },
  ],
  settings: { accentColor: '#2563eb', dateFormat: 'dd/MM/yyyy', altName: 'Test Teacher' },
}

/** Dashboard-embedded planner export (adds todos, sections, curriculums). */
export const dashboardPlannerExport = {
  ...originalPlannerExport,
  todos: [{ id: 1, text: 'Print flashcards', completed: false, createdAt: '2026-09-01T00:00:00.000Z' }],
  sections: [{ id: 's1', sectionId: '1736200000000.5', notes: 'Use the song', digitalLink: 'https://example.com/p12' }],
  curriculums: [
    {
      id: '1757000000000',
      name: 'Grade 5 plan',
      dateCreated: '2026-09-01T00:00:00.000Z',
      items: [
        { id: 'a', text: 'Unit 1', completed: true },
        { id: 'b', text: 'Unit 2', completed: false },
      ],
    },
  ],
}

/** Old dashboard IndexedDB (`livepoll`) + bookmarks, as read by browser.ts. */
export const legacyDashboardSnapshot = {
  workspaces: [
    {
      id: 'workspace-1',
      name: 'Workspace 1',
      bgIndex: 3,
      widgets: [{ id: 'timer-1', type: 'Timer', x: 60, y: 40, width: 212, height: 220, z: 1, locked: false }],
    },
    {
      id: 'workspace-2',
      name: 'Grade 6',
      bgIndex: 0,
      widgets: [
        { id: 'rn-1', type: 'Random Name', x: 10, y: 10, width: 248, height: 264, z: 2 },
        { type: 'Spinner', x: 'bad', y: null, width: 0, height: 0 },
      ],
    },
  ],
  settings: [
    { key: 'activeWorkspace', value: 'workspace-2' },
    { key: 'rotateDailyBackground', value: false },
    {
      key: 'classes',
      value: [
        { id: 'class-1', name: '6-1', type: 'names', students: ['Aoi', 'Haruto', ' '], count: 3 },
        { id: 'class-2', name: '5-2', type: 'number', students: [], count: 4 },
      ],
    },
  ],
  templates: [{ id: 'tmpl-1', name: 'Quiz day', workspaceName: 'Workspace 1', widgets: [], bgIndex: 2, createdAt: 1757000000000 }],
  textbooks: [
    { id: 'tb-1', title: 'new horizon 1', url: 'https://example.com/digital-nh1', thumbnail: '' },
    { id: 'tb-2', title: 'Blue Sky', url: 'https://example.com/bluesky', thumbnail: '' },
  ],
  bookmarks: [{ name: 'Quizlet', url: 'https://quizlet.com', image: '' }],
}

/** A single workspace exported from the old dashboard's settings. */
export const workspaceTemplateFile = {
  version: 2,
  name: 'Phonics corner',
  widgets: [{ id: 'dice-1', type: 'Dice', x: 100, y: 100, width: 212, height: 220, z: 1, locked: true }],
  bgIndex: 5,
  exportedAt: 1757000000000,
}
