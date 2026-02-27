import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

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
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
        <h2 style="color: #059669;">Welcome to DLCF E-Library!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Great news! Your account has been approved by the administrator.</p>
        <p>You can now log in to access all academic materials and Christian novels in our library.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-t: 1px solid #e2e8f0;">
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
  const PORT = 3000;

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
        return res.status(403).json({ error: 'Account pending approval' });
      }

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

      if (new Date(link.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Registration link expired' });
      }

      // Create user
      const { error: regError } = await supabase
        .from('users')
        .insert([{ id: uuidv4(), email, password, name, is_approved: false, is_admin: false }]);
      
      if (regError) throw regError;

      // Delete the used link
      await supabase.from('registration_links').delete().eq('token', token);
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed' });
    }
  });

  // Admin
  app.get('/api/admin/pending-users', async (req, res) => {
    try {
      const supabase = getSupabase();
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('is_approved', false)
        .eq('is_admin', false);
      
      if (error) throw error;
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/approve-user', async (req, res) => {
    const { userId } = req.body;
    try {
      const supabase = getSupabase();
      
      // 1. Get user details first
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single();
      
      if (fetchError) throw fetchError;

      // 2. Update approval status
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_approved: true })
        .eq('id', userId);
      
      if (updateError) throw updateError;

      // 3. Send notification email (async)
      if (user) {
        sendApprovalEmail(user.email, user.name);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/generate-link', async (req, res) => {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry
    
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
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('registration_links')
        .delete()
        .eq('id', req.params.id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

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
      const bookData = { ...req.body, id: uuidv4() };
      const { data, error } = await supabase
        .from('books')
        .insert([bookData])
        .select()
        .single();
      
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/books/:id', async (req, res) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', req.params.id);
      
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // File Upload to Supabase Storage
  app.post('/api/admin/upload', upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const supabase = getSupabase();
      const bucketName = 'materials';

      // Ensure bucket exists (best effort)
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.find((b: any) => b.name === bucketName);
        if (!exists) {
          console.log(`Bucket "${bucketName}" not found. Attempting to create...`);
          const { error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 52428800, // 50MB
          });
          if (createError) {
            console.warn('Could not create bucket automatically:', createError.message);
            console.warn('Please ensure you have created a public bucket named "materials" in your Supabase dashboard.');
          }
        }
      } catch (e) {
        console.warn('Error checking/creating bucket:', e);
      }

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
