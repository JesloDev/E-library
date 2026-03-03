import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB limit
});

// Email Transporter
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
};

const sendApprovalEmail = async (email: string, name: string) => {
  if (!process.env.SMTP_HOST) {
    console.warn('SMTP not configured. Skipping email notification.');
    return;
  }

  const transporter = getTransporter();
  const mailOptions = {
    from: `"DLCF E-Library" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Account Approved - DLCF E-Library',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #059669;">Welcome to DLCF E-Library!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Great news! Your account has been approved by the administrator.</p>
        <p>You can now log in to access all academic materials and Christian novels in our library.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 14px; color: #64748b;">Best regards,<br>DLCF Admin Team</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Approval email sent to ${email}`);
  } catch (err: any) {
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      console.error('SMTP Authentication Failed: The username or password was rejected.');
      console.error('TIP: If using Gmail, you MUST use an "App Password", not your regular account password.');
      console.error('Visit: https://myaccount.google.com/apppasswords');
    } else {
      console.error('Failed to send approval email:', err.message);
    }
  }
};

const sendLoginNotification = async (email: string, name: string) => {
  if (!process.env.SMTP_HOST) return;
  const transporter = getTransporter();
  const mailOptions = {
    from: `"DLCF E-Library" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'New Login Detected - DLCF E-Library',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #1e293b;">New Login Notification</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>This is to inform you that a new login was detected on your DLCF E-Library account at ${new Date().toLocaleString()}.</p>
        <p>If this wasn't you, please contact the administrator immediately.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 14px; color: #64748b;">Best regards,<br>DLCF Admin Team</p>
        </div>
      </div>
    `,
  };
  try { 
    await transporter.sendMail(mailOptions);
    console.log(`Login notification sent to ${email}`);
  } catch (err: any) { 
    console.error('Login notification failed:', err.message); 
  }
};

const sendWelcomeEmail = async (email: string, name: string) => {
  if (!process.env.SMTP_HOST) return;
  const transporter = getTransporter();
  const mailOptions = {
    from: `"DLCF E-Library" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Welcome to DLCF E-Library - Pending Approval',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #059669;">Welcome, ${name}!</h2>
        <p>Thank you for registering with the DLCF E-Library.</p>
        <p>Your account has been successfully created and is currently <strong>pending approval</strong> by our administrator.</p>
        <p>You will receive another email once your account has been approved and is ready for use.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 14px; color: #64748b;">Best regards,<br>DLCF Admin Team</p>
        </div>
      </div>
    `,
  };
  try { 
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
  } catch (err: any) { 
    console.error('Welcome email failed:', err.message); 
  }
};

// Lazy Supabase Client Initialization
let supabaseClient: any = null;

function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      // During development in AI Studio, these might be missing until configured.
      // We'll throw a descriptive error when an API is actually called.
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required. Please configure them in your environment variables.');
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // --- API Routes ---

  // Global API Error Handler
  const apiErrorHandler = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({ 
      error: err.message || 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  };

  // Auth
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const supabase = getSupabase();
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();
      
      if (error || !user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      if (!user.is_approved && !user.is_admin) {
        return res.status(403).json({ 
          error: 'Access Revoked', 
          message: 'Your access to the DLCF E-Library has been revoked by the administrator. Please contact the admin team if you believe this is an error.' 
        });
      }

      // Send login notification (async)
      sendLoginNotification(user.email, user.name);

      res.json({ user: { id: user.id, email: user.email, name: user.name, isAdmin: !!user.is_admin } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, token } = req.body;
    
    try {
      const supabase = getSupabase();
      
      // Validate token
      const { data: link, error: linkError } = await supabase
        .from('registration_links')
        .select('*')
        .eq('token', token)
        .single();

      if (linkError || !link) {
        return res.status(400).json({ error: 'Invalid registration link' });
      }

      // Create user (Automatically approved)
      const { error: regError } = await supabase
        .from('users')
        .insert([{ id: uuidv4(), email, password, name, is_approved: true, is_admin: false }]);
      
      if (regError) throw regError;

      // Send welcome email (async)
      sendWelcomeEmail(email, name);
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    console.log(`[Auth] Forgot password request for: ${email}`);
    try {
      const supabase = getSupabase();
      const { data: user, error } = await supabase
        .from('users')
        .select('name, password')
        .eq('email', email)
        .single();
      
      if (error || !user) {
        console.warn(`[Auth] Forgot password: Email not found (${email})`);
        return res.status(404).json({ error: 'Email not found', message: 'No account was found with this email address. Please check and try again.' });
      }

      if (!process.env.SMTP_HOST) {
        console.error('[Auth] SMTP_HOST is not configured');
        return res.status(500).json({ error: 'Email service not configured', message: 'The email service is not configured. Please contact the administrator to retrieve your password.' });
      }

      console.log(`[Auth] Attempting to send recovery email to: ${email} via ${process.env.SMTP_HOST}`);
      const transporter = getTransporter();
      
      try {
        await transporter.sendMail({
          from: `"DLCF E-Library" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Password Recovery - DLCF E-Library',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #059669;">Password Recovery</h2>
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>You requested to recover your password for the DLCF E-Library.</p>
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 14px; color: #64748b;">Your Password:</p>
                <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 18px; font-bold; color: #1e293b;">${user.password}</p>
              </div>
              <p style="font-size: 12px; color: #94a3b8;">If you didn't request this, please change your password immediately or contact an admin.</p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 14px; color: #64748b;">Best regards,<br>DLCF Admin Team</p>
              </div>
            </div>
          `
        });
        console.log(`[Auth] Recovery email sent successfully to: ${email}`);
        res.json({ success: true, message: 'Your password has been sent to your email address.' });
      } catch (mailErr: any) {
        console.error(`[Auth] Mail delivery failed for ${email}:`, mailErr.message);
        res.status(500).json({ 
          error: 'Email delivery failed', 
          message: `We couldn't send the email. Technical error: ${mailErr.message}. Please contact the admin.` 
        });
      }
    } catch (err: any) {
      console.error(`[Auth] Forgot password exception for ${email}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/user/profile', async (req, res) => {
    const { userId, email, password, name } = req.body;
    try {
      const supabase = getSupabase();
      
      // Check if email is already taken by another user
      if (email) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .neq('id', userId)
          .single();
        
        if (existingUser) {
          return res.status(400).json({ error: 'Email already in use' });
        }
      }

      const updates: any = {};
      if (email) updates.email = email;
      if (password) updates.password = password;
      if (name) updates.name = name;

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      res.json({ user: { id: data.id, email: data.email, name: data.name, isAdmin: !!data.is_admin } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin
  app.get('/api/admin/users', async (req, res) => {
    try {
      const supabase = getSupabase();
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, name, is_approved, is_admin, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/demote-self', async (req, res) => {
    const { userId } = req.body;
    try {
      const supabase = getSupabase();
      
      // Get user info for email
      const { data: user } = await supabase.from('users').select('email, name').eq('id', userId).single();

      const { error } = await supabase
        .from('users')
        .update({ is_admin: false })
        .eq('id', userId);
      
      if (error) throw error;

      // Send notification
      if (user && process.env.SMTP_HOST) {
        const transporter = getTransporter();
        await transporter.sendMail({
          from: `"DLCF E-Library" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: 'Admin Rights Revoked - DLCF E-Library',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #f43f5e;">Admin Rights Revoked</h2>
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>This is to confirm that you have successfully revoked your own administrative rights. You are now a standard user.</p>
              <p>If you need admin access again, please contact another administrator.</p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 14px; color: #64748b;">Best regards,<br>DLCF Admin Team</p>
              </div>
            </div>
          `
        });
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/promote-user', async (req, res) => {
    const { userId } = req.body;
    try {
      const supabase = getSupabase();
      
      // Get user info
      const { data: user } = await supabase.from('users').select('email, name').eq('id', userId).single();
      if (!user) return res.status(404).json({ error: 'User not found' });

      const { error } = await supabase
        .from('users')
        .update({ is_admin: true, is_approved: true })
        .eq('id', userId);
      
      if (error) throw error;

      // Send notification
      if (process.env.SMTP_HOST) {
        const transporter = getTransporter();
        await transporter.sendMail({
          from: `"DLCF E-Library" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: 'You have been promoted to Admin - DLCF E-Library',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #059669;">Admin Promotion</h2>
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>Congratulations! You have been promoted to an <strong>Administrator</strong> for the DLCF E-Library.</p>
              <p>You now have access to the Admin Dashboard where you can manage books, users, and registration links.</p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 14px; color: #64748b;">Best regards,<br>DLCF Admin Team</p>
              </div>
            </div>
          `
        });
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/toggle-user-access', async (req, res) => {
    const { userId, isApproved } = req.body;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('users')
        .update({ is_approved: isApproved })
        .eq('id', userId);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/generate-link', async (req, res) => {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 100); // 100 years expiry (effectively permanent)
    
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('registration_links')
        .insert([{ id: uuidv4(), token, expires_at: expiresAt.toISOString() }]);
      
      if (error) throw error;
      res.json({ token });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/links', async (req, res) => {
    try {
      const supabase = getSupabase();
      const { data: links, error } = await supabase
        .from('registration_links')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(links);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/links/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`[Admin] Attempting to delete link: ${id}`);
    try {
      if (!id) {
        return res.status(400).json({ error: 'Link ID is required' });
      }
      const supabase = getSupabase();
      const { error, count } = await supabase
        .from('registration_links')
        .delete({ count: 'exact' })
        .eq('id', id);
      
      if (error) {
        console.error(`[Admin] Error deleting link ${id}:`, error.message);
        throw error;
      }
      
      console.log(`[Admin] Successfully deleted link: ${id}. Rows affected: ${count}`);
      res.json({ success: true, deleted: count });
    } catch (err: any) {
      console.error(`[Admin] Exception in delete link ${id}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // Helper to ensure bucket exists and has correct settings
  async function ensureBucket(supabase: any) {
    const bucketName = 'materials';
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const exists = buckets?.find((b: any) => b.name === bucketName);
      
      const bucketOptions = {
        public: true,
        fileSizeLimit: 209715200, // 200MB
      };

      if (!exists) {
        console.log(`Bucket "${bucketName}" not found. Attempting to create...`);
        const { error: createError } = await supabase.storage.createBucket(bucketName, bucketOptions);
        if (createError) {
          console.warn('Could not create bucket automatically:', createError.message);
        }
      } else {
        // Update existing bucket to ensure it has the 200MB limit
        const { error: updateError } = await supabase.storage.updateBucket(bucketName, bucketOptions);
        if (updateError) {
          console.warn('Could not update bucket settings:', updateError.message);
        }
      }
    } catch (e) {
      console.warn('Error checking/ensuring bucket:', e);
    }
  }

  // Helper to insert book with fallback for missing columns
  async function insertBookResilient(supabase: any, bookData: any) {
    // Try full insert first
    const { data, error } = await supabase
      .from('books')
      .insert([bookData])
      .select()
      .single();

    if (!error) return { data, error: null };

    // If error is about missing columns, try fallback
    if (error.message?.includes('Could not find') || error.code === '42703') {
      console.warn('[Supabase] Missing columns detected, falling back to description metadata');
      
      const safeColumns = ['id', 'title', 'author', 'category', 'cover_url', 'download_url', 'description', 'created_at'];
      const fallbackData: any = {};
      const metadata: any = {};

      Object.keys(bookData).forEach(key => {
        if (safeColumns.includes(key)) {
          fallbackData[key] = bookData[key];
        } else {
          metadata[key] = bookData[key];
        }
      });

      // Pack metadata into description
      const metaString = `JSON_META:${JSON.stringify(metadata)}`;
      fallbackData.description = fallbackData.description 
        ? `${fallbackData.description}\n\n${metaString}`
        : metaString;

      return await supabase
        .from('books')
        .insert([fallbackData])
        .select()
        .single();
    }

    return { data: null, error };
  }

  // Books Management
  app.get('/api/books', async (req, res) => {
    try {
      const supabase = getSupabase();
      const { data: books, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(books);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/books', async (req, res) => {
    try {
      const supabase = getSupabase();
      const { title, category, course_code } = req.body;

      // Duplicate Check
      const { data: existingBooks } = await supabase
        .from('books')
        .select('id')
        .eq('title', title)
        .eq('category', category)
        .eq('course_code', course_code || '');

      if (existingBooks && existingBooks.length > 0) {
        return res.status(400).json({ error: 'A material with this title and course code already exists.' });
      }

      const bookData = { ...req.body, id: uuidv4() };
      const { data, error } = await insertBookResilient(supabase, bookData);
      
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/books/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`[Admin] Attempting to delete book: ${id}`);
    try {
      if (!id) {
        return res.status(400).json({ error: 'Book ID is required' });
      }
      const supabase = getSupabase();
      const { error, count } = await supabase
        .from('books')
        .delete({ count: 'exact' })
        .eq('id', id);
      
      if (error) {
        console.error(`[Admin] Error deleting book ${id}:`, error.message);
        throw error;
      }
      
      console.log(`[Admin] Successfully deleted book: ${id}. Rows affected: ${count}`);
      res.json({ success: true, deleted: count });
    } catch (err: any) {
      console.error(`[Admin] Exception in delete book ${id}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // File Upload to Supabase Storage
  app.post('/api/admin/upload', upload.single('file'), async (req: any, res) => {
    console.log(`[Upload] Received upload request: ${req.file?.originalname} (${req.file?.size} bytes)`);
    try {
      if (!req.file) {
        console.error('[Upload] No file in request');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const supabase = getSupabase();
      await ensureBucket(supabase);
      const bucketName = 'materials';

      const fileName = `${uuidv4()}-${req.file.originalname}`;
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true
        });

      if (error) {
        if (error.message.includes('Bucket not found')) {
          throw new Error('The storage bucket "materials" was not found. Please create a PUBLIC bucket named "materials" in your Supabase dashboard under Storage.');
        }
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      res.json({ url: publicUrl });
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/mass-upload-gdrive', async (req, res) => {
    let { folderId, department, level, category, courseCode: manualCourseCode, materialType } = req.body;
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

    console.log(`[Mass Upload] Starting request for folder: ${folderId}, Course: ${manualCourseCode}, Type: ${materialType}`);

    if (!apiKey) {
      console.error('[Mass Upload] GOOGLE_DRIVE_API_KEY missing');
      return res.status(400).json({ error: 'GOOGLE_DRIVE_API_KEY is not configured in the environment.' });
    }

    if (!folderId) {
      return res.status(400).json({ error: 'Folder ID is required.' });
    }

    // Extract ID from URL if user pasted a full link
    if (folderId.includes('drive.google.com')) {
      const match = folderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (match) {
        folderId = match[1];
        console.log(`[Mass Upload] Extracted folder ID from URL: ${folderId}`);
      }
    }

    try {
      const drive = google.drive({ version: 'v3', auth: apiKey });
      
      console.log('[Mass Upload] Fetching file list from GDrive...');
      // List files in the folder
      const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/pdf' and trashed = false`,
        fields: 'files(id, name, size, mimeType)',
      }).catch(err => {
        console.error('[Mass Upload] GDrive API List Error:', err.message);
        if (err.message.includes('File not found')) {
          throw new Error('Google Drive Folder not found. Please check the ID and ensure the folder is shared as "Public".');
        }
        throw err;
      });

      const files = response.data.files || [];
      console.log(`[Mass Upload] Found ${files.length} PDF files`);

      if (files.length === 0) {
        return res.json({ success: true, message: 'No PDF files found in the specified folder.', count: 0 });
      }

      const supabase = getSupabase();
      await ensureBucket(supabase);
      const bucketName = 'materials';
      const results = [];

      for (const file of files) {
        try {
          // Download from GDrive
          const fileResponse = await drive.files.get(
            { fileId: file.id!, alt: 'media' },
            { responseType: 'arraybuffer' }
          );

          const sanitizedOriginalName = file.name?.replace(/[^a-zA-Z0-9.-]/g, '_');
          const fileName = `${uuidv4()}-${sanitizedOriginalName}`;
          const buffer = Buffer.from(fileResponse.data as ArrayBuffer);

          // Upload to Supabase
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, buffer, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

          // Create book record
          // Try to extract course code from file name if not manually provided
          const nameParts = file.name?.split(' - ') || [];
          let courseCode = manualCourseCode || (nameParts.length > 1 ? nameParts[0].trim().toUpperCase() : 'GENERAL');
          let title = nameParts.length > 1 ? nameParts[1].replace('.pdf', '').trim() : file.name?.replace('.pdf', '').trim();

          // If it's a Christian Novel, use filename as title and clear courseCode
          if (category === 'Christian Novel') {
            title = file.name?.replace('.pdf', '').trim();
            courseCode = ''; // Novels don't have course codes
          }

          // Duplicate Check
          const { data: existingBooks } = await supabase
            .from('books')
            .select('id')
            .eq('title', title)
            .eq('category', category)
            .eq('course_code', courseCode || '');

          if (existingBooks && existingBooks.length > 0) {
            console.log(`[Mass Upload] Skipping duplicate: ${title} (${courseCode})`);
            results.push({ name: file.name, status: 'skipped', message: 'Duplicate found' });
            continue;
          }

          const bookData = {
            id: uuidv4(),
            title,
            author: 'DLCF Library',
            category,
            department,
            level,
            course_code: courseCode,
            course_title: title,
            material_type: materialType || 'Course Material',
            download_url: publicUrl,
            cover_url: 'https://picsum.photos/seed/book/400/600', // Default cover for mass upload
            description: `Mass uploaded from Google Drive: ${file.name}`
          };

          const { data: dbData, error: dbError } = await insertBookResilient(supabase, bookData);

          if (dbError) throw dbError;

          results.push({ name: file.name, status: 'success' });
        } catch (err: any) {
          console.error(`Failed to process file ${file.name}:`, err.message);
          results.push({ name: file.name, status: 'failed', error: err.message });
        }
      }

      res.json({ success: true, results, count: results.filter(r => r.status === 'success').length });
    } catch (err: any) {
      console.error('Mass upload error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Apply API error handler to all /api routes
  app.use('/api', apiErrorHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
