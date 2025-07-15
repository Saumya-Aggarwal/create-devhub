"use client";

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [services, setServices] = useState({
    web: { status: 'checking', responseTime: null },
    docs: { status: 'checking', responseTime: null },
    api: { status: 'checking', responseTime: null },
    ws: { status: 'checking', responseTime: null }
  });

  const checkService = async (serviceId: string, url: string, type: 'http' | 'websocket' = 'http') => {
    try {
      const startTime = Date.now();
      
      if (type === 'websocket') {
        return new Promise((resolve, reject) => {
          const ws = new WebSocket(url);
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Timeout'));
          }, 5000);
          
          ws.onopen = () => {
            clearTimeout(timeout);
            ws.close();
            const responseTime = Date.now() - startTime;
            setServices(prev => ({
              ...prev,
              [serviceId]: { status: 'running', responseTime }
            }));
            resolve(true);
          };
          
          ws.onerror = () => {
            clearTimeout(timeout);
            setServices(prev => ({
              ...prev,
              [serviceId]: { status: 'stopped', responseTime: null }
            }));
            reject(new Error('Connection failed'));
          };
        });
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        try {
          await fetch(url, { 
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          setServices(prev => ({
            ...prev,
            [serviceId]: { status: 'running', responseTime }
          }));
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            setServices(prev => ({
              ...prev,
              [serviceId]: { status: 'stopped', responseTime: null }
            }));
          } else {
            // CORS error usually means service is running
            const responseTime = Date.now() - startTime;
            setServices(prev => ({
              ...prev,
              [serviceId]: { status: 'running', responseTime }
            }));
          }
        }
      }
    } catch (error) {
      setServices(prev => ({
        ...prev,
        [serviceId]: { status: 'stopped', responseTime: null }
      }));
    }
  };

  const checkAllServices = async () => {
    await Promise.all([
      checkService('web', 'http://localhost:3000'),
      checkService('docs', 'http://localhost:3002'),
      checkService('api', 'http://localhost:8000'),
      checkService('ws', 'ws://localhost:8080', 'websocket')
    ]);
  };

  useEffect(() => {
    checkAllServices();
    const interval = setInterval(checkAllServices, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleDashboardClick = () => {
    // Open the dashboard in the public folder
    window.open('/dashboard/index.html', '_blank');
  };

  const handleGitHubClick = () => {
    window.open('https://github.com/Saumya-Aggarwal/create-devhub', '_blank');
  };

  const getStatusDisplay = (service: any) => {
    switch (service.status) {
      case 'running':
        return { text: 'Running', className: 'bg-green-500/20 text-green-400' };
      case 'stopped':
        return { text: 'Stopped', className: 'bg-red-500/20 text-red-400' };
      case 'checking':
        return { text: 'Checking...', className: 'bg-yellow-500/20 text-yellow-400' };
      default:
        return { text: 'Unknown', className: 'bg-gray-500/20 text-gray-400' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1F2023] to-[#121317] text-[#ECEFF4]">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-mono font-bold tracking-tight text-white mb-6">
            Monitor & Manage Your
            <br />
            <span className="text-[#4FD1FF]">Monorepo in One Click</span>
          </h1>
          <p className="text-lg md:text-xl text-[#C0C0C0] max-w-3xl mx-auto leading-relaxed mb-8">
            After scaffolding, launch a real-time dashboard to control all your services 
            and view health at <code className="bg-[#2A2C30] px-2 py-1 rounded text-[#4FD1FF]">http://localhost:4000</code>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button 
              onClick={handleDashboardClick}
              className="px-8 py-4 text-lg font-semibold bg-[#4FD1FF] text-white rounded-lg hover:bg-[#4FD1FF]/90 hover:shadow-lg hover:shadow-[#4FD1FF]/25 transition-all transform hover:scale-105"
            >
              Open Dev Dashboard
            </button>
            <button 
              onClick={handleGitHubClick}
              className="px-8 py-4 text-lg font-semibold border-2 border-[#A3E635] text-[#A3E635] rounded-lg hover:bg-[#A3E635] hover:text-black transition-all transform hover:scale-105"
            >
              View on GitHub
            </button>
          </div>

          {/* Code Preview */}
          <div className="bg-[#1B1D21] border border-[#3C3F46] rounded-lg p-6 max-w-2xl mx-auto">
            <div className="text-sm text-[#A3E635] mb-2">$ npx create-devhub my-app --dashboard</div>
            <div className="text-sm text-[#4FD1FF]">$ cd my-app && pnpm dev</div>
            <div className="text-xs text-[#777] mt-4 italic">One command to rule them all.</div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-20">
          <div className="bg-[#2A2C30] border border-[#3C3F46] rounded-lg p-6 hover:shadow-lg hover:shadow-black/20 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-lg bg-[#4FD1FF]/10 flex items-center justify-center mb-4 group-hover:bg-[#4FD1FF]/20 transition-all">
              <span className="text-[#4FD1FF] text-2xl">🚀</span>
            </div>
            <h3 className="font-mono text-white text-xl mb-4">Startup Launcher</h3>
            <p className="text-[#C0C0C0] text-sm">
              Spin up all services with one command.
            </p>
          </div>

          <div className="bg-[#2A2C30] border border-[#3C3F46] rounded-lg p-6 hover:shadow-lg hover:shadow-black/20 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-lg bg-[#4FD1FF]/10 flex items-center justify-center mb-4 group-hover:bg-[#4FD1FF]/20 transition-all">
              <span className="text-[#4FD1FF] text-2xl">💚</span>
            </div>
            <h3 className="font-mono text-white text-xl mb-4">Health Checks</h3>
            <p className="text-[#C0C0C0] text-sm">
              Validate ports & dependencies automatically.
            </p>
          </div>

          <div className="bg-[#2A2C30] border border-[#3C3F46] rounded-lg p-6 hover:shadow-lg hover:shadow-black/20 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-lg bg-[#4FD1FF]/10 flex items-center justify-center mb-4 group-hover:bg-[#4FD1FF]/20 transition-all">
              <span className="text-[#4FD1FF] text-2xl">📊</span>
            </div>
            <h3 className="font-mono text-white text-xl mb-4">Logs & Metrics</h3>
            <p className="text-[#C0C0C0] text-sm">
              View real-time logs and performance charts.
            </p>
          </div>

          <div className="bg-[#2A2C30] border border-[#3C3F46] rounded-lg p-6 hover:shadow-lg hover:shadow-black/20 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-lg bg-[#4FD1FF]/10 flex items-center justify-center mb-4 group-hover:bg-[#4FD1FF]/20 transition-all">
              <span className="text-[#4FD1FF] text-2xl">⌨️</span>
            </div>
            <h3 className="font-mono text-white text-xl mb-4">Interactive CLI</h3>
            <p className="text-[#C0C0C0] text-sm">
              Run commands directly from your browser.
            </p>
          </div>
        </div>

        {/* Dynamic Dashboard Preview */}
        <div className="mb-20">
          <div className="relative bg-gradient-radial from-[#2A2C30]/20 to-transparent rounded-2xl p-8">
            <div className="bg-[#1B1D21] border border-[#3C3F46] rounded-lg shadow-2xl max-w-4xl mx-auto">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#3C3F46]">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-4 text-sm text-[#777]">DevHub Dashboard - Live Status</span>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-mono text-white">Service Status</h3>
                  <span className="text-xs text-[#777]">Auto-updating every 10s</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-[#2A2C30] rounded border border-[#3C3F46]">
                    <span className="text-[#ECEFF4]">Web App</span>
                    <span className={`px-2 py-1 rounded text-sm ${getStatusDisplay(services.web).className}`}>
                      {getStatusDisplay(services.web).text}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#2A2C30] rounded border border-[#3C3F46]">
                    <span className="text-[#ECEFF4]">Docs Site</span>
                    <span className={`px-2 py-1 rounded text-sm ${getStatusDisplay(services.docs).className}`}>
                      {getStatusDisplay(services.docs).text}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#2A2C30] rounded border border-[#3C3F46]">
                    <span className="text-[#ECEFF4]">API Server</span>
                    <span className={`px-2 py-1 rounded text-sm ${getStatusDisplay(services.api).className}`}>
                      {getStatusDisplay(services.api).text}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#2A2C30] rounded border border-[#3C3F46]">
                    <span className="text-[#ECEFF4]">WebSocket</span>
                    <span className={`px-2 py-1 rounded text-sm ${getStatusDisplay(services.ws).className}`}>
                      {getStatusDisplay(services.ws).text}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#3C3F46]">
                  <button 
                    onClick={handleDashboardClick}
                    className="w-full px-4 py-2 bg-[#4FD1FF]/10 text-[#4FD1FF] border border-[#4FD1FF]/20 rounded hover:bg-[#4FD1FF]/20 transition-all text-sm"
                  >
                    Open Dashboard →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <div className="bg-[#2A2C30] border border-[#3C3F46] rounded-lg p-8 max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-mono text-white mb-2">Ready to Start Building?</h2>
            <p className="text-[#C0C0C0]">
              Your development environment is fully configured and ready to go
            </p>
          </div>
          <div className="text-center space-y-6">
            <div className="grid gap-4 md:grid-cols-2 text-left max-w-2xl mx-auto">
              <div className="space-y-2">
                <h4 className="font-mono font-semibold text-sm text-[#4FD1FF]">⚡ Start Development</h4>
                <code className="block text-xs bg-[#1B1D21] p-3 rounded font-mono text-[#A3E635] border border-[#3C3F46]">
                  pnpm run dev
                </code>
              </div>
              <div className="space-y-2">
                <h4 className="font-mono font-semibold text-sm text-[#4FD1FF]">🏗️ Build for Production</h4>
                <code className="block text-xs bg-[#1B1D21] p-3 rounded font-mono text-[#A3E635] border border-[#3C3F46]">
                  pnpm run build
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0F1012] border-t border-[#3C3F46] py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex gap-6 mb-4 md:mb-0">
              <a 
                href="https://www.npmjs.com/package/create-devhub" 
                className="text-[#777] hover:text-[#4FD1FF] transition-colors text-sm"
                aria-label="NPM Package"
              >
                📦 NPM
              </a>
              <a 
                href="https://github.com/Saumya-Aggarwal/create-devhub" 
                className="text-[#777] hover:text-[#4FD1FF] transition-colors text-sm"
                aria-label="GitHub Repository"
              >
                🐙 GitHub
              </a>
            </div>
            <div className="text-[#777] text-sm">
              © 2025 create-devhub. Built with ❤️
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
