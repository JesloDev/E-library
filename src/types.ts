
export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface RegistrationLink {
  id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export enum BookCategory {
  ACADEMIC = 'Academic',
  CHRISTIAN_NOVEL = 'Christian Novel',
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category: BookCategory;
  description: string;
  coverUrl: string;
  downloadUrl: string;
  // Academic specific fields
  department?: string;
  courseCode?: string;
  courseTitle?: string;
  level?: string;
}

export interface FilterState {
  search: string;
  category: BookCategory | 'All';
  department: string;
  level: string;
}
