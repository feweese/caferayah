# Vercel Deployment Guide for CafeRayah

This guide will help you deploy your CafeRayah project to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Your Neon PostgreSQL database connection string
3. GitHub repository with your code

## Step 1: Push Your Code to GitHub

Make sure your code is pushed to a GitHub repository.

## Step 2: Connect Vercel to Your Repository

1. Log in to your Vercel account
2. Click "Add New..." → "Project"
3. Select your GitHub repository
4. Click "Import"

## Step 3: Configure Project Settings

1. In the project configuration screen, set the following:
   - **Framework Preset**: Next.js
   - **Build Command**: Keep default (npm run build)
   - **Output Directory**: Keep default (.next)
   - **Install Command**: npm install

## Step 4: Set Environment Variables

Add these environment variables in the Vercel dashboard:

```
DATABASE_URL=postgresql://neondb_owner:npg_OgUDESdRW4c1@ep-autumn-darkness-a1f37xuw-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_SECRET=your-production-secret-key
NEXTAUTH_URL=https://your-vercel-deployment-url.vercel.app
EMAIL_FROM=wexw767@gmail.com
EMAIL_USER=wexw767@gmail.com
EMAIL_PASSWORD=your-email-password
GOOGLE_CLIENT_ID=88215109895-plov7n6sb75p514eg6aded3sacq1ki52.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
CLOUDINARY_NAME=dnorqvstw
CLOUDINARY_SECRET=ZpdbsC3zGVgIiLLHjC8QVwK9U6w
```

> **Important**: Replace `your-production-secret-key` with a strong random string, and `https://your-vercel-deployment-url.vercel.app` with your actual Vercel deployment URL.

## Step 5: Deploy

Click "Deploy" and wait for the build to complete.

## Step 6: Database Migration

After deployment is successful, you need to run the Prisma migrations on your production database. 

There are two ways to do this:

### Option 1: Use Vercel CLI to run migrations

1. Install Vercel CLI: `npm i -g vercel`
2. Login to Vercel CLI: `vercel login`
3. Pull environment variables: `vercel env pull .env.production`
4. Run migrations: `npx prisma migrate deploy --schema=./prisma/schema.prisma`

### Option 2: Use Vercel's Build Step

Add this to your package.json's build script:

```json
"build": "prisma generate && prisma migrate deploy && next build"
```

## Step 7: Verify Deployment

1. Visit your deployed site
2. Test all key functionality
3. Check for any console errors

## Troubleshooting Common Issues

### Database Connection Issues

If you encounter database connection issues:

1. Verify your DATABASE_URL is correct in Vercel environment variables
2. Check if your Neon database allows connections from Vercel's IP ranges
3. Consider setting the connection pool settings in your Prisma configuration

### Next.js Build Failures

If your build fails:

1. Check the build logs for specific errors
2. Make sure all required environment variables are set
3. If TypeScript errors are causing build failures, consider using `typescript.ignoreBuildErrors: true` in next.config.js (as we've already added)

### Authentication Issues

If authentication doesn't work:

1. Ensure NEXTAUTH_URL is set correctly to your production URL
2. Check that NEXTAUTH_SECRET is properly set
3. Verify your Google OAuth credentials are configured for your production domain

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Prisma with Vercel](https://www.prisma.io/docs/orm/prisma-client/deployment/serverless/deploy-to-vercel) 