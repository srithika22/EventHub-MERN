# EventHub MERN Stack Deployment Guide

## 📋 Pre-Deployment Checklist

✅ Fixed MongoDB connection with proper timeout settings
✅ Updated CORS configuration for production
✅ Created environment variable templates
✅ Added Vercel configuration

## 🚀 Deployment Steps

### 1. Database Setup (MongoDB Atlas)

1. **Create MongoDB Atlas Account**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. **Create a Cluster**: Choose your preferred cloud provider and region
3. **Create Database User**: 
   - Go to Database Access → Add New Database User
   - Choose username/password authentication
   - Grant `readWriteAnyDatabase` role
4. **Configure Network Access**:
   - Go to Network Access → Add IP Address
   - Add `0.0.0.0/0` (Allow access from anywhere) for deployment
5. **Get Connection String**:
   - Go to Clusters → Connect → Connect your application
   - Copy the connection string format

### 2. Backend Deployment (Render)

1. **Prepare Backend**:
   ```bash
   cd server
   npm install
   ```

2. **Push to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/eventhub.git
   git push -u origin main
   ```

3. **Deploy to Render**:
   - Go to [Render](https://render.com) and sign up
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure deployment:
     - **Name**: eventhub-backend
     - **Root Directory**: `server`
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Free (for testing)

4. **Set Environment Variables in Render**:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/eventhub?retryWrites=true&w=majority
   JWT_SECRET=your-super-secure-jwt-secret-key-min-32-characters
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   ```

### 3. Frontend Deployment (Vercel)

1. **Update Frontend Environment**:
   - Create `.env.production` in root directory:
   ```
   VITE_API_URL=https://your-backend-domain.onrender.com
   VITE_SOCKET_URL=https://your-backend-domain.onrender.com
   ```

2. **Deploy to Vercel**:
   - Go to [Vercel](https://vercel.com) and sign up
   - Click "New Project"
   - Import your GitHub repository
   - Configure deployment:
     - **Framework Preset**: Vite
     - **Root Directory**: Leave empty (uses root)
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`

3. **Set Environment Variables in Vercel**:
   ```
   VITE_API_URL=https://your-backend-domain.onrender.com
   VITE_SOCKET_URL=https://your-backend-domain.onrender.com
   ```

### 4. Final Configuration

1. **Update CORS in Backend**:
   - Replace `https://your-frontend-domain.vercel.app` with your actual Vercel domain
   - Redeploy backend on Render

2. **Test the Application**:
   - Visit your Vercel frontend URL
   - Test user registration/login
   - Create an event and verify database connection
   - Test real-time features (polling, Q&A)

## 🔧 Environment Variables Reference

### Backend (.env in server directory):
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/eventhub?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-characters
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Frontend (.env in root directory):
```
VITE_API_URL=https://your-backend-domain.onrender.com
VITE_SOCKET_URL=https://your-backend-domain.onrender.com
```

## 📱 Alternative Hosting Options

### Netlify (Alternative to Vercel):
1. Drag and drop `dist` folder after running `npm run build`
2. Set environment variables in Site Settings
3. Configure redirects for SPA routing

### Railway (Alternative to Render):
1. Connect GitHub repository
2. Select server directory as root
3. Railway auto-detects Node.js and deploys

## 🐛 Common Issues & Solutions

### 1. MongoDB Connection Timeout:
- Ensure IP address `0.0.0.0/0` is whitelisted
- Verify connection string format
- Check database user permissions

### 2. CORS Errors:
- Update `allowedOrigins` in server.js
- Ensure frontend URL is correctly configured
- Check environment variables are set

### 3. Build Failures:
- Run `npm install` and `npm run build` locally first
- Check for any TypeScript/ESLint errors
- Verify all dependencies are in package.json

### 4. Socket.io Connection Issues:
- Ensure same domain for API and Socket URLs
- Check if hosting provider supports WebSockets
- Verify CORS settings include Socket.io origins

## 🔄 CI/CD Pipeline (Optional)

Set up automatic deployments:
1. **GitHub Actions** for automated testing
2. **Vercel Git Integration** for frontend auto-deployment
3. **Render GitHub Integration** for backend auto-deployment

## 📊 Monitoring & Analytics

After deployment, consider adding:
- **Error tracking**: Sentry for production error monitoring
- **Analytics**: Google Analytics for user behavior
- **Performance**: Lighthouse CI for performance monitoring
- **Uptime monitoring**: UptimeRobot for service availability

---

**🎉 Congratulations!** Your EventHub MERN application is now live and accessible worldwide!

**Frontend URL**: `https://your-project.vercel.app`
**Backend API**: `https://your-backend.onrender.com`
**Admin Dashboard**: `https://your-project.vercel.app/organizer-dashboard`