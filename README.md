# Zenith Trade Journal

A comprehensive, desktop-optimized trading journal application built with React and TypeScript. Track your trading performance, manage strategies, and analyze your trades with advanced features like pyramiding, trailing stops, and partial exits.

## Features

- **Trade Tracking**: Record and manage your trades with detailed entry/exit information
- **Strategy Management**: Organize trades by strategies with individual performance metrics
- **Advanced Trading Features**:
  - Pyramiding (scaling into positions)
  - Trailing stops
  - Partial exits
- **Real-time Analytics**: Dashboard with key performance indicators
- **Cloud Sync**: Firebase integration for data persistence and cross-device access
- **Authentication**: Secure user authentication with Firebase Auth
- **Responsive Design**: Optimized for desktop use with a clean, modern interface

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS with custom glass morphism effects
- **Backend**: Firebase (Authentication, Firestore)
- **Icons**: React Icons
- **Build Tool**: Vite

## Installation

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zenith-trade-journal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Configuration**

   The app is pre-configured with Firebase settings. If you need to use your own Firebase project:

   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication and Firestore
   - Update the configuration in `firebase.ts`

4. **Run the development server**
   ```bash
   npm run start
   ```

   The app will be available at `http://localhost:3000`

## Usage

### Getting Started

1. **Sign Up/Login**: Create an account or log in with existing credentials
2. **Create a Strategy**: Start by creating your first trading strategy
3. **Add Trades**: Record your trades with detailed information including entry/exit prices, quantities, and notes
4. **Track Performance**: View analytics on your dashboard and strategy pages

### Key Components

- **Dashboard**: Overview of all trades and strategies
- **Strategy View**: Detailed analysis of individual strategies
- **Trade Details**: Comprehensive trade information with editing capabilities
- **Profile**: User account management and settings

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## Deployment

This application is deployed on Netlify. For custom deployment:

- Build the project: `npm run build`
- Deploy the `dist` folder to your hosting provider
- Configure Firebase security rules for production use

## Project Structure

```
zenith-trade-journal/
├── components/          # React components
│   ├── icons/          # Custom icon components
│   └── ...             # UI components
├── contexts/           # React contexts (Settings)
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── public/             # Static assets
├── types.ts            # TypeScript type definitions
├── firebase.ts         # Firebase configuration
└── ...                 # Configuration files
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and proprietary.
