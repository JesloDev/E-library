/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Book as BookIcon, 
  GraduationCap, 
  Library, 
  Download, 
  Filter,
  X,
  ChevronRight,
  BookOpen,
  Lock,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  Copy,
  Plus,
  FileUp,
  Loader2,
  Menu,
  Eye,
  EyeOff
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { Book, BookCategory, FilterState, User, RegistrationLink } from './types';
import { INITIAL_BOOKS, DEPARTMENTS, LEVELS } from './constants';

// Set worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'login' | 'register' | 'library' | 'admin'>('login');
  const [regToken, setRegToken] = useState<string | null>(null);
  
  // Library State
  const [books, setBooks] = useState<Book[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: BookCategory.ACADEMIC, // Default to Academic
    department: 'All',
    level: 'All',
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Admin State
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [adminLinks, setAdminLinks] = useState<RegistrationLink[]>([]);
  const [adminTab, setAdminTab] = useState<'users' | 'books'>('users');
  const [formCategory, setFormCategory] = useState<BookCategory>(BookCategory.ACADEMIC);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/books');
      if (!res.ok) {
        const errorData = await res.json();
        console.warn('Backend books API error:', errorData.error);
        if (errorData.error?.includes('SUPABASE_URL')) {
          setDbError('Database not configured. Showing demo materials.');
        }
        setBooks(INITIAL_BOOKS);
        return;
      }
      
      const data = await res.json();
      setDbError(null);
      if (!Array.isArray(data)) {
        setBooks(INITIAL_BOOKS);
        return;
      }

      const normalized = data.map((b: any) => ({
        ...b,
        coverUrl: b.cover_url || b.coverUrl,
        downloadUrl: b.download_url || b.downloadUrl,
        courseCode: b.course_code || b.courseCode,
        courseTitle: b.course_title || b.courseTitle
      }));
      setBooks(normalized.length > 0 ? normalized : INITIAL_BOOKS);
    } catch (err) {
      console.error('Failed to fetch books:', err);
      setBooks(INITIAL_BOOKS);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // Check for registration token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setRegToken(token);
      setView('register');
    }
  }, []);

  // API Calls
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (res.status === 404) {
        showToast('Login API not found. Please ensure the server is running correctly.', 'error');
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setView(data.user.isAdmin ? 'admin' : 'library');
        showToast(`Welcome back, ${data.user.name}!`);
      } else {
        showToast(data.error || 'Login failed', 'error');
      }
    } catch (err) {
      console.error('Login error:', err);
      showToast('Could not connect to the server. Please wait a moment and try again.', 'error');
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');
    const name = formData.get('name');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, token: regToken }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Registration successful! Please wait for admin approval.');
        setView('login');
        setShowPassword(false);
        setRegToken(null);
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast('Registration failed', 'error');
    }
  };

  const fetchAdminData = async () => {
    if (!user?.isAdmin) return;
    try {
      const [usersRes, linksRes, booksRes] = await Promise.all([
        fetch('/api/admin/pending-users'),
        fetch('/api/admin/links'),
        fetch('/api/books')
      ]);

      if (usersRes.ok) setPendingUsers(await usersRes.json());
      if (linksRes.ok) setAdminLinks(await linksRes.json());
      
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        if (Array.isArray(booksData)) {
          setBooks(booksData.map((b: any) => ({
            ...b,
            coverUrl: b.cover_url || b.coverUrl,
            downloadUrl: b.download_url || b.downloadUrl,
            courseCode: b.course_code || b.courseCode,
            courseTitle: b.course_title || b.courseTitle
          })));
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    }
  };

  useEffect(() => {
    if (view === 'admin') fetchAdminData();
  }, [view]);

  const generateLink = async () => {
    try {
      const res = await fetch('/api/admin/generate-link', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate link');
      const data = await res.json();
      
      // Optimistic update (though we need the token from server)
      // We just fetch again to be safe but we could also add it manually if we had the full object
      fetchAdminData();
      showToast('Registration link generated successfully');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const approveUser = async (userId: string) => {
    // Optimistic Update
    const previousUsers = [...pendingUsers];
    setPendingUsers(prev => prev.filter(u => u.id !== userId));
    
    try {
      const res = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error('Failed to approve user');
      showToast('User approved successfully');
    } catch (err: any) {
      setPendingUsers(previousUsers); // Rollback
      showToast(err.message, 'error');
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this registration link?')) return;
    
    // Optimistic Update
    const previousLinks = [...adminLinks];
    setAdminLinks(prev => prev.filter(l => l.id !== id));

    try {
      const res = await fetch(`/api/admin/links/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete link');
      showToast('Link revoked successfully');
    } catch (err: any) {
      setAdminLinks(previousLinks); // Rollback
      showToast(err.message, 'error');
    }
  };

  const handleAddBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get('pdf_file') as File;
    
    if (!file) {
      showToast('Please select a PDF file', 'error');
      return;
    }

    setLoading(true);
    setUploadProgress('Generating thumbnail...');

    try {
      // 1. Generate Thumbnail from PDF
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      if (context) {
        await page.render({ canvasContext: context, viewport } as any).promise;
      }
      
      const thumbnailBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      if (!thumbnailBlob) throw new Error('Failed to generate thumbnail');

      // 2. Upload PDF
      setUploadProgress('Uploading PDF...');
      const pdfUploadFormData = new FormData();
      pdfUploadFormData.append('file', file);
      const pdfRes = await fetch('/api/admin/upload', {
        method: 'POST',
        body: pdfUploadFormData
      });
      
      let pdfData;
      const pdfText = await pdfRes.text();
      try {
        pdfData = JSON.parse(pdfText);
      } catch (e) {
        throw new Error(`Server returned non-JSON response during PDF upload (${pdfRes.status})`);
      }
      
      if (!pdfRes.ok) throw new Error(pdfData.error || 'PDF upload failed');

      // 3. Upload Thumbnail
      setUploadProgress('Uploading thumbnail...');
      const thumbUploadFormData = new FormData();
      thumbUploadFormData.append('file', new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' }));
      const thumbRes = await fetch('/api/admin/upload', {
        method: 'POST',
        body: thumbUploadFormData
      });
      
      let thumbData;
      const thumbText = await thumbRes.text();
      try {
        thumbData = JSON.parse(thumbText);
      } catch (e) {
        throw new Error(`Server returned non-JSON response during thumbnail upload (${thumbRes.status})`);
      }
      
      if (!thumbRes.ok) throw new Error(thumbData.error || 'Thumbnail upload failed');

      // 4. Save Book Record
      setUploadProgress('Saving record...');
      const category = formData.get('category') as BookCategory;
      const title = category === BookCategory.ACADEMIC 
        ? formData.get('course_title') 
        : formData.get('title');

      const bookData = {
        title,
        author: 'DLCF Library', // Default author
        category,
        cover_url: thumbData.url,
        download_url: pdfData.url,
        department: formData.get('department'),
        level: formData.get('level'),
        course_code: formData.get('course_code'),
        course_title: formData.get('course_title')
      };

      const res = await fetch('/api/admin/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      let responseData;
      const responseText = await res.text();
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server returned non-JSON response during record save (${res.status})`);
      }

      if (res.ok) {
        showToast('Book added successfully!');
        form.reset();
        setFormCategory(BookCategory.ACADEMIC);
        const label = document.getElementById('pdf-label');
        if (label) label.innerText = 'Select PDF from local storage';
        fetchAdminData();
      } else {
        showToast(responseData.error || 'Failed to add book', 'error');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const deleteBook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;
    
    // Optimistic Update
    const previousBooks = [...books];
    setBooks(prev => prev.filter(b => b.id !== id));

    try {
      const res = await fetch(`/api/admin/books/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete book');
      showToast('Book deleted successfully');
    } catch (err: any) {
      setBooks(previousBooks); // Rollback
      showToast(err.message, 'error');
    }
  };

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesSearch = 
        book.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        book.author.toLowerCase().includes(filters.search.toLowerCase()) ||
        book.courseCode?.toLowerCase().includes(filters.search.toLowerCase()) ||
        book.courseTitle?.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesCategory = book.category === filters.category;
      
      const matchesDept = 
        filters.department === 'All' || 
        (book.category === BookCategory.ACADEMIC && book.department === filters.department);
      
      const matchesLevel = 
        filters.level === 'All' || 
        (book.category === BookCategory.ACADEMIC && book.level === filters.level);

      return matchesSearch && matchesCategory && matchesDept && matchesLevel;
    });
  }, [books, filters]);

  // --- Views ---

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-emerald-600 p-3 rounded-2xl mb-4 shadow-lg shadow-emerald-200">
              <Library className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Welcome Back</h1>
            <p className="text-slate-500 text-sm">Sign in to access the DLCF E-Library</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  name="email"
                  type="email" 
                  required
                  placeholder="admin@dlcf.org"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  name="password"
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98]"
            >
              Sign In
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Need access? Contact your DLCF admin for a registration link.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'register') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-emerald-600 p-3 rounded-2xl mb-4 shadow-lg shadow-emerald-200">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Member Registration</h1>
            <p className="text-slate-500 text-sm text-center">Create your account to join the community</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
              <input 
                name="name"
                type="text" 
                required
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
              <input 
                name="email"
                type="email" 
                required
                placeholder="john@example.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  name="password"
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98]"
            >
              Register Account
            </button>
          </form>
          
          <button 
            onClick={() => { setView('login'); setShowPassword(false); }}
            className="w-full mt-4 text-sm text-slate-500 hover:text-emerald-600 transition-colors"
          >
            Already have an account? Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <X size={20} />}
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        {dbError && (
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 text-center">
            <p className="text-xs font-medium text-amber-700 flex items-center justify-center gap-2">
              <Clock className="w-3 h-3" />
              {dbError}
            </p>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsNavOpen(true)}
                className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2">
                <div className="bg-emerald-600 p-2 rounded-lg">
                  <Library className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-emerald-900">DLCF <span className="text-emerald-600">E-Library</span></span>
              </div>
            </div>

            {view === 'library' && (
              <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button 
                  onClick={() => setFilters({ ...filters, category: BookCategory.ACADEMIC })}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filters.category === BookCategory.ACADEMIC ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Academic Section
                </button>
                <button 
                  onClick={() => setFilters({ ...filters, category: BookCategory.CHRISTIAN_NOVEL })}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filters.category === BookCategory.CHRISTIAN_NOVEL ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Christian Novels
                </button>
              </div>
            )}
            
            <div className="hidden md:flex items-center gap-4">
              {user?.isAdmin && (
                <button 
                  onClick={() => setView(view === 'admin' ? 'library' : 'admin')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${view === 'admin' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  {view === 'admin' ? 'Exit Admin' : 'Admin Panel'}
                </button>
              )}
              <div className="h-6 w-px bg-slate-200 mx-2" />
              <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-xs font-bold text-slate-700">{user?.name}</span>
                <button 
                  onClick={() => { setUser(null); setView('login'); setShowPassword(false); }}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="md:hidden flex items-center gap-2">
              {view === 'library' && (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"
                >
                  <Filter className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {view === 'admin' ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Admin Tabs */}
          <div className="flex gap-4 mb-8">
            <button 
              onClick={() => setAdminTab('users')}
              className={`px-6 py-3 rounded-2xl font-bold transition-all ${adminTab === 'users' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
            >
              Member Management
            </button>
            <button 
              onClick={() => setAdminTab('books')}
              className={`px-6 py-3 rounded-2xl font-bold transition-all ${adminTab === 'books' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}
            >
              Library Management
            </button>
          </div>

          {adminTab === 'users' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Pending Approvals */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-100 p-2 rounded-xl">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-800">Pending Approvals</h2>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full">
                      {pendingUsers.length} Requests
                    </span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {pendingUsers.length > 0 ? pendingUsers.map(u => (
                      <div key={u.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">{u.name}</h4>
                            <p className="text-sm text-slate-400">{u.email}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => approveUser(u.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </button>
                      </div>
                    )) : (
                      <div className="p-12 text-center">
                        <p className="text-slate-400 text-sm">No pending registration requests.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Registration Links */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-xl">
                        <LinkIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-800">Registration Links</h2>
                    </div>
                    <button 
                      onClick={generateLink}
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    {adminLinks.length > 0 ? adminLinks.map(link => (
                      <div key={link.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expires in 24h</span>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                const url = `${window.location.origin}/?token=${link.token}`;
                                navigator.clipboard.writeText(url);
                                showToast('Link copied to clipboard!');
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                              title="Copy Link"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteLink(link.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                              title="Revoke Link"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs font-mono text-slate-500 break-all line-clamp-1">{link.token}</p>
                      </div>
                    )) : (
                      <div className="text-center py-8">
                        <p className="text-slate-400 text-sm">No active links. Generate one to invite members.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Add Book Form */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden sticky top-24">
                  <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-xl">
                      <Plus className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800">Add New Material</h2>
                  </div>
                  <form onSubmit={handleAddBook} className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Category</label>
                      <select 
                        name="category" 
                        required 
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value as BookCategory)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                      >
                        <option value={BookCategory.ACADEMIC}>Academic</option>
                        <option value={BookCategory.CHRISTIAN_NOVEL}>Christian Novel</option>
                      </select>
                    </div>

                    {formCategory === BookCategory.CHRISTIAN_NOVEL && (
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Book Title</label>
                        <input name="title" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="e.g. The Pilgrim's Progress" />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">PDF File</label>
                      <div className="relative">
                        <input 
                          type="file" 
                          name="pdf_file" 
                          accept=".pdf" 
                          required 
                          className="hidden" 
                          id="pdf-upload"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const label = document.getElementById('pdf-label');
                              if (label) label.innerText = file.name;
                            }
                          }}
                        />
                        <label 
                          htmlFor="pdf-upload" 
                          className="flex items-center gap-3 w-full px-4 py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-sm cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                          <FileUp className="w-5 h-5 text-slate-400" />
                          <span id="pdf-label" className="text-slate-500 truncate">Select PDF from local storage</span>
                        </label>
                      </div>
                    </div>
                    
                    {formCategory === BookCategory.ACADEMIC && (
                      <div className="pt-4 border-t border-slate-50 space-y-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Academic Details (Compulsory)</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Dept</label>
                            <select name="department" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none">
                              <option value="">Select Dept</option>
                              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Level</label>
                            <select name="level" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none">
                              <option value="">Select Level</option>
                              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Course Code</label>
                            <input name="course_code" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none" placeholder="CSC 101" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Course Title</label>
                            <input name="course_title" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none" placeholder="Intro to CS" />
                          </div>
                        </div>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {uploadProgress || 'Processing...'}
                        </>
                      ) : (
                        'Upload Material'
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Books List */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded-xl">
                        <Library className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-800">Current Materials</h2>
                    </div>
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                      {books.length} Items
                    </span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {books.map(book => (
                      <div key={book.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <img src={book.coverUrl || book.cover_url} className="w-12 h-16 object-cover rounded-lg shadow-sm" referrerPolicy="no-referrer" />
                          <div>
                            <h4 className="font-bold text-slate-800">{book.title}</h4>
                            <p className="text-xs text-slate-400">{book.author} • {book.category}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteBook(book.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Filters - Desktop */}
            <aside className="hidden md:block w-64 flex-shrink-0">
              <div className="sticky top-24 space-y-8">
                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Search</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Title, author, code..."
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Current Section</h3>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-3 text-emerald-700">
                      {filters.category === BookCategory.ACADEMIC ? <GraduationCap className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                      <span className="font-bold text-sm">{filters.category}</span>
                    </div>
                  </div>
                </section>

                {filters.category !== BookCategory.CHRISTIAN_NOVEL && (
                  <>
                    <section>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Departments</h3>
                      <select 
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        value={filters.department}
                        onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                      >
                        <option value="All">All Departments</option>
                        {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                      </select>
                    </section>

                    <section>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Level</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {['All', ...LEVELS].map(level => (
                          <button
                            key={level}
                            onClick={() => setFilters({ ...filters, level })}
                            className={`px-2 py-1.5 rounded-lg text-xs border transition-all ${filters.level === level ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-500'}`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </aside>

            {/* Book Grid */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                  {filters.category === 'All' ? 'All Resources' : filters.category}
                  <span className="ml-2 text-sm font-normal text-slate-400">({filteredBooks.length} books)</span>
                </h2>
              </div>

              {filteredBooks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredBooks.map((book) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={book.id}
                        className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
                          <img 
                            src={book.coverUrl} 
                            alt={book.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                            <a 
                              href={book.downloadUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="w-full bg-white text-emerald-700 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              Download PDF
                            </a>
                          </div>
                          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${book.category === BookCategory.ACADEMIC ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}`}>
                              {book.category === BookCategory.ACADEMIC ? 'Academic' : 'Novel'}
                            </span>
                            {book.level && (
                              <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur text-slate-700">
                                {book.level}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="mb-1">
                            {book.courseCode && (
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{book.courseCode}</span>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">{book.title}</h3>
                          <p className="text-sm text-slate-500 mb-3">{book.author}</p>
                          
                          {book.category === BookCategory.ACADEMIC && (
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 border-t border-slate-100 pt-3">
                              <GraduationCap className="w-3 h-3" />
                              <span className="truncate">{book.department}</span>
                            </div>
                          )}
                          {book.category === BookCategory.CHRISTIAN_NOVEL && (
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 border-t border-slate-100 pt-3">
                              <BookOpen className="w-3 h-3" />
                              <span>Christian Literature</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                  <div className="bg-slate-50 p-4 rounded-full mb-4">
                    <BookIcon className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">No books found</h3>
                  <p className="text-slate-500 text-sm">Try adjusting your filters or search terms.</p>
                  <button 
                    onClick={() => setFilters({ search: '', category: 'All', department: 'All', level: 'All' })}
                    className="mt-4 text-emerald-600 font-medium hover:underline text-sm"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Left Navigation Sidebar */}
      <AnimatePresence>
        {isNavOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNavOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-600 p-2 rounded-lg">
                    <Library className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-slate-800">DLCF Library</span>
                </div>
                <button onClick={() => setIsNavOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <button 
                  onClick={() => { setView('library'); setIsNavOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${view === 'library' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <BookOpen className="w-5 h-5" />
                  Library
                </button>
                
                {user?.isAdmin && (
                  <button 
                    onClick={() => { setView('admin'); setIsNavOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${view === 'admin' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                    Admin Panel
                  </button>
                )}

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Sections</p>
                  <button 
                    onClick={() => { setFilters({ ...filters, category: BookCategory.ACADEMIC }); setView('library'); setIsNavOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${filters.category === BookCategory.ACADEMIC && view === 'library' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <GraduationCap className="w-5 h-5" />
                    Academic
                  </button>
                  <button 
                    onClick={() => { setFilters({ ...filters, category: BookCategory.CHRISTIAN_NOVEL }); setView('library'); setIsNavOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${filters.category === BookCategory.CHRISTIAN_NOVEL && view === 'library' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <BookIcon className="w-5 h-5" />
                    Christian Novels
                  </button>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100">
                <div className="flex items-center gap-3 px-4 py-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { 
                    if (confirm('Are you sure you want to sign out?')) {
                      setUser(null); 
                      setView('login'); 
                      setIsNavOpen(false); 
                      setShowPassword(false); 
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-white z-50 p-6 shadow-2xl md:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-slate-800">Filters</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="space-y-8">
                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Search</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Title, author, code..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Switch Section</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => setFilters({ ...filters, category: BookCategory.ACADEMIC })}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${filters.category === BookCategory.ACADEMIC ? 'bg-emerald-600 text-white font-medium' : 'bg-slate-50 text-slate-600'}`}
                    >
                      Academic Section
                    </button>
                    <button
                      onClick={() => setFilters({ ...filters, category: BookCategory.CHRISTIAN_NOVEL })}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${filters.category === BookCategory.CHRISTIAN_NOVEL ? 'bg-emerald-600 text-white font-medium' : 'bg-slate-50 text-slate-600'}`}
                    >
                      Christian Novels
                    </button>
                  </div>
                </section>

                {filters.category !== BookCategory.CHRISTIAN_NOVEL && (
                  <>
                    <section>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Departments</h3>
                      <select 
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                        value={filters.department}
                        onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                      >
                        <option value="All">All Departments</option>
                        {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                      </select>
                    </section>

                    <section>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Level</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {['All', ...LEVELS].map(level => (
                          <button
                            key={level}
                            onClick={() => setFilters({ ...filters, level })}
                            className={`px-2 py-2 rounded-xl text-xs border transition-all ${filters.level === level ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </section>
                  </>
                )}

                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-600/20 mt-8"
                >
                  Show {filteredBooks.length} Results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Library className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-slate-800">DLCF E-Library</span>
            </div>
            <p className="text-sm text-slate-400">© {new Date().getFullYear()} Deeper Life Campus Fellowship. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="text-xs font-semibold text-slate-400 hover:text-emerald-600 uppercase tracking-widest">About</a>
              <a href="#" className="text-xs font-semibold text-slate-400 hover:text-emerald-600 uppercase tracking-widest">Contribute</a>
              <a href="#" className="text-xs font-semibold text-slate-400 hover:text-emerald-600 uppercase tracking-widest">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
