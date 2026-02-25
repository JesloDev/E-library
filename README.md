# DLCF E-Library Setup & Deployment Guide

This project is a full-stack application built with **React (Vite)**, **Express**, and **SQLite**.

## 🚀 Local Development

To run this project on your local machine, follow these steps:

### 1. Prerequisites
- Install [Node.js](https://nodejs.org/) (v18 or higher recommended).
- A terminal (Command Prompt, PowerShell, or Bash).

### 2. Installation
Extract the files and run the following command in the project root:
```bash
npm install
```

### 3. Running the App
Start the development server (both frontend and backend):
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### 4. Admin Access
Use these credentials to log in as an administrator:
- **Email:** `admin@dlcf.org`
- **Password:** `admin123`

---

## ☁️ Hosting on Vercel + Supabase

This app is now configured to use **Supabase** for permanent data storage, making it fully compatible with Vercel's serverless environment.

### 1. Supabase Setup
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard and run the following script to create the tables:

```sql
-- Create Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Registration Links Table
CREATE TABLE registration_links (
  id UUID PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Books Table
CREATE TABLE books (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL, -- 'Academic' or 'Christian Novel'
  description TEXT,
  cover_url TEXT,
  download_url TEXT,
  department TEXT,
  course_code TEXT,
  course_title TEXT,
  level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Initial Admin (Change 'admin123' to a secure password!)
INSERT INTO users (id, email, password, name, is_approved, is_admin)
VALUES (
  gen_random_uuid(), 
  'admin@dlcf.org', 
  'admin123', 
  'System Admin', 
  TRUE, 
  TRUE
);
```

### 2. Storage Setup (Supabase Dashboard)
1. Go to **Storage** in your Supabase dashboard.
2. Create a new bucket named `materials`.
3. Set the bucket to **Public**.
4. Add a **Policy** to allow uploads:
   - Select "Allow access to all users" (or restrict to authenticated users).
   - Check **INSERT** and **SELECT** permissions for the `materials` bucket.

### 3. Environment Variables
In your Vercel project settings (or local `.env` file), add:
- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_ANON_KEY`: Your Supabase "anon" public key.

### 3. Deployment
- Connect your GitHub repository to Vercel.
- Vercel will automatically detect the Vite project and deploy it.
- The Express server will run as a serverless function.

## 🛠️ Modifying Modules
- **Adding Books:** Edit `src/constants.ts`.
- **Changing Auth Logic:** Edit `server.ts`.
- **UI Changes:** Most components are in `src/App.tsx` using Tailwind CSS.
