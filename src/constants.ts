import { Book, BookCategory } from './types';

export const DEPARTMENTS = [
  // Faculty of Social Sciences
  'Economics',
  'Sociology',
  'Geography',
  'Political Science',
  'Psychology',

  // Faculty of Arts
  'English Language',
  'Portuguese',
  'Linguistics',
  'History and International Studies',
  'Music',
  'French',
  'Theatre Art',
  'Foreign Language',
  'Christian Religion',
  'Islamic Religion',
  'Arabic',

  // Faculty of Sciences
  'Computer Science',
  'Chemistry',
  'Botany',
  'Zoology',
  'Biochemistry',
  'Medicine and Surgery',
  'Nursing',
  'Mathematics',
  'Pharmacy',
  'Pharmacology',
  'Medical Laboratory Science',
  'Fishery',
  'Physics',
  'Chemical Engineering',
  'Mechanical Engineering',

  // Faculty of Communication
  'Broadcasting',
  'Journalism',
  'Public Relations and Advertisement',

  // Faculty of Education
  'Educational Foundations',
  'Educational Management',
  'Human Kinetic & Health Education',
  'Lang, Arts AND Sciences',
  'Science and Tech. Education',

  // Schools of Transport
  'Transport Management',
  'Transport Planning',
  'Transport Technology',

  // Faculty of Law
  'Common Law',
  'Commercial Law',
  'Islamic Law',
  'Criminal Law',

  // Faculty of Management Science
  'Accounting',
  'Business Administration',
  'Public Administration',
  'Insurance',
  'Marketing',
  'Management Technology',
  'Industrial Relations',
  'Local Government Administration',
];

export const LEVELS = ['100L', '200L', '300L', '400L', '500L', 'Postgraduate'];

export const INITIAL_BOOKS: Book[] = [
  {
    id: '1',
    title: 'Introduction to Algorithms',
    category: BookCategory.ACADEMIC,
    description: 'A comprehensive guide to algorithms and data structures.',
    coverUrl: 'https://picsum.photos/seed/algo/400/600',
    downloadUrl: '#',
    department: 'Computer Science',
    courseCode: 'CSC 201',
    courseTitle: 'Data Structures and Algorithms',
    level: '200L',
  },
  {
    id: '2',
    title: 'The Pilgrim\'s Progress',
    category: BookCategory.CHRISTIAN_NOVEL,
    description: 'A classic Christian allegory of the soul\'s journey.',
    coverUrl: 'https://picsum.photos/seed/pilgrim/400/600',
    downloadUrl: '#',
  },
  {
    id: '3',
    title: 'Calculus: Early Transcendentals',
    category: BookCategory.ACADEMIC,
    description: 'Essential calculus concepts for science and engineering.',
    coverUrl: 'https://picsum.photos/seed/calc/400/600',
    downloadUrl: '#',
    department: 'Mathematics',
    courseCode: 'MTH 101',
    courseTitle: 'General Mathematics I',
    level: '100L',
  },
  {
    id: '4',
    title: 'In His Steps',
    category: BookCategory.CHRISTIAN_NOVEL,
    description: 'What would Jesus do? A challenge to modern discipleship.',
    coverUrl: 'https://picsum.photos/seed/steps/400/600',
    downloadUrl: '#',
  },
  {
    id: '5',
    title: 'Digital Logic Design',
    category: BookCategory.ACADEMIC,
    description: 'Fundamentals of digital systems and logic gates.',
    coverUrl: 'https://picsum.photos/seed/logic/400/600',
    downloadUrl: '#',
    department: 'Mechanical Engineering',
    courseCode: 'EEG 202',
    courseTitle: 'Digital Electronics',
    level: '200L',
  },
  {
    id: '6',
    title: 'The Screwtape Letters',
    category: BookCategory.CHRISTIAN_NOVEL,
    description: 'A satirical look at spiritual warfare through demonic correspondence.',
    coverUrl: 'https://picsum.photos/seed/screwtape/400/600',
    downloadUrl: '#',
  },
];
