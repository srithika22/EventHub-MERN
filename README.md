# 🎉 EventHub - MERN Stack Event Management Platform

![EventHub Banner](https://via.placeholder.com/1200x300/4F46E5/ffffff?text=EventHub+-+Event+Management+Platform)

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🌟 Overview

EventHub is a comprehensive event management platform built with the MERN stack. It enables event organizers to create, manage, and analyze events while providing participants with seamless registration, networking, and engagement features.

**Live Demo**: [Coming Soon]
**Backend API**: [Coming Soon]

## ✨ Features

### 🎯 For Event Organizers
- **Event Management**: Create, edit, and manage events with rich media support
- **Analytics Dashboard**: Real-time insights with revenue charts and participant analytics
- **Live Polling**: Create and manage interactive polls during events
- **Q&A Management**: Handle participant questions in real-time
- **Participant Management**: Track registrations and manage attendees
- **Revenue Tracking**: Monitor ticket sales and financial performance
- **Settings Management**: Customize profile and notification preferences

### 👥 For Participants
- **Event Discovery**: Browse and search upcoming events
- **Easy Registration**: Quick and secure event registration process
- **Digital Networking**: Generate and exchange digital business cards
- **Live Interaction**: Participate in polls and Q&A sessions
- **Event History**: View past events and participation records

### 🔧 Technical Features
- **Real-time Communication**: Socket.io for live updates
- **Secure Authentication**: JWT-based authentication system
- **File Upload**: Cloudinary integration for image management
- **Responsive Design**: Mobile-first responsive UI
- **RESTful API**: Well-structured backend API
- **Database**: MongoDB with Mongoose ODM

## 🛠️ Tech Stack

### Frontend
- **React.js** - UI library
- **Vite** - Build tool and development server
- **CSS3** - Styling with Grid and Flexbox
- **Chart.js** - Data visualization
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Cloudinary** - Image storage and optimization
- **bcryptjs** - Password hashing

### DevOps & Deployment
- **Vercel** - Frontend hosting
- **Render** - Backend hosting
- **MongoDB Atlas** - Database hosting
- **Git** - Version control

## 📁 Project Structure

```
EventHub/
├── 📁 frontend/               # React Frontend Application
│   ├── 📁 public/             # Static assets
│   ├── 📁 src/                # Frontend source code
│   │   ├── 📁 components/     # Reusable React components
│   │   ├── 📁 pages/          # Page components
│   │   ├── 📁 context/        # React Context
│   │   ├── 📁 assets/         # Images and static files
│   │   ├── App.jsx            # Main App component
│   │   └── main.jsx           # Entry point
│   ├── index.html             # HTML template
│   ├── vite.config.js         # Vite configuration
│   ├── eslint.config.js       # ESLint configuration
│   └── package.json           # Frontend dependencies
├── 📁 backend/                # Node.js Backend API
│   ├── 📁 config/             # Configuration files
│   ├── 📁 middleware/         # Express middleware
│   ├── 📁 models/             # MongoDB models
│   ├── 📁 routes/             # API routes
│   ├── server.js              # Express server
│   └── package.json           # Backend dependencies
├── vercel.json                # Vercel deployment config
├── DEPLOYMENT.md              # Deployment guide
└── README.md                  # Project documentation
```

## 🚀 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account
- Cloudinary account (for image uploads)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/eventhub.git
   cd eventhub
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Set up environment variables**
   
   Create `.env` in frontend directory:
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_SOCKET_URL=http://localhost:3001
   ```
   
   Create `.env` in backend directory:
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   PORT=3001
   ```

5. **Start the development servers**
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   npm start
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 🔐 Environment Variables

### Frontend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3001` |
| `VITE_SOCKET_URL` | Socket.io server URL | `http://localhost:3001` |

### Backend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | ✅ |
| `JWT_SECRET` | JWT signing secret | ✅ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | ✅ |
| `CLOUDINARY_API_KEY` | Cloudinary API key | ✅ |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | ✅ |
| `PORT` | Server port | ❌ (default: 3001) |
| `NODE_ENV` | Environment mode | ❌ (default: development) |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Events
- `GET /api/events` - Get all events
- `POST /api/events` - Create new event
- `GET /api/events/:id` - Get event by ID
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Registrations
- `POST /api/registrations` - Register for event
- `GET /api/registrations/user/:userId` - Get user registrations
- `GET /api/registrations/event/:eventId` - Get event registrations

### More endpoints available in the API documentation...

## 🌐 Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

### Quick Deployment Steps:

1. **Database**: Set up MongoDB Atlas
2. **Backend**: Deploy to Render
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
3. **Frontend**: Deploy to Vercel
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Environment**: Configure production variables

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your Profile](https://linkedin.com/in/yourprofile)
- Email: your.email@example.com

## 🙏 Acknowledgments

- Thanks to all contributors and testers
- Inspired by modern event management platforms
- Built with love using the MERN stack

---

⭐ **Star this repository if you find it helpful!**

📧 **Questions?** Feel free to open an issue or contact me directly.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
