/**
 * Main application component for Vidu video generation
 */
import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { VideoGenerator } from './components/VideoGenerator';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Vidu Video Generator
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your ideas into stunning videos using AI. Simply describe what you want to see, 
            and watch as your vision comes to life.
          </p>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto">
          {/* Video Generator */}
          <VideoGenerator />
        </main>

        {/* Footer */}
        <footer className="text-center mt-16 py-8 border-t border-gray-200">
          <p className="text-gray-500">
            Powered by <span className="font-semibold">Vidu AI</span> • Built with React & TypeScript
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;