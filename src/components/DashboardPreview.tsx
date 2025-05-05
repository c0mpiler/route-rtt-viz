/**
 * DashboardPreview - Shows a static preview of the optimized Dashboard layout
 * 
 * This component displays a visual preview of the new streamlined Dashboard
 * with all path cards displayed in full width for consistency.
 */
import React from "react";

export const DashboardPreview: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-lg shadow-xl p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-secondary-800 mb-2">
          Optimized Dashboard (Beta)
        </h2>
        <p className="text-secondary-600">
          Consistent full-width path cards for predictable user experience
        </p>
      </div>

      {/* Compact filter controls */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-lg shadow-sm mb-6">
        <button className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-cyan-600 text-white shadow-sm">
          <div className="w-2 h-2 rounded-full bg-white mr-2" />
          Fastest
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-white/20">3</span>
        </button>
        <button className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-secondary-50 text-secondary-700 hover:bg-secondary-100">
          <div className="w-2 h-2 rounded-full bg-indigo-400 mr-2" />
          Alternative
        </button>
        <button className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-secondary-50 text-secondary-700 hover:bg-secondary-100">
          <div className="w-2 h-2 rounded-full bg-amber-400 mr-2" />
          Longest Selected
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-secondary-200">1</span>
        </button>
        <button className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-secondary-50 text-secondary-700 hover:bg-secondary-100">
          <div className="w-2 h-2 rounded-full bg-rose-400 mr-2" />
          Overall Longest
        </button>
      </div>

      {/* Geographic View - Full width */}
      <div className="mb-6">
        <div className="bg-white border border-secondary-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="inline-block w-3 h-6 bg-primary-500 rounded mr-3"></span>
            Geographic Overview
          </h3>
          
          {/* World map mockup */}
          <div className="h-96 bg-blue-50 rounded relative overflow-hidden">
            {/* World continents */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="100%" height="100%" viewBox="0 0 800 400" className="text-blue-200">
                <path d="M100,200 Q200,180 300,200 T500,190 Q600,180 700,200 L700,300 Q600,290 500,300 T300,290 Q200,300 100,290 Z" 
                  fill="currentColor" opacity="0.3"/>
              </svg>
            </div>
            
            {/* Location markers and paths */}
            <div className="absolute w-2 h-2 bg-emerald-600 rounded-full top-1/3 left-1/4"></div>
            <div className="absolute w-2 h-2 bg-secondary-400 rounded-full top-1/3 left-3/5"></div>
            <div className="absolute w-2 h-2 bg-ruby-600 rounded-full top-2/5 right-1/4"></div>
            
            {/* Path arcs */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <path d="M200,133 Q400,50 480,133" 
                stroke="#06b6d4" strokeWidth="3" fill="none" strokeDasharray="8 6"/>
              <path d="M480,133 Q560,100 608,160" 
                stroke="#06b6d4" strokeWidth="3" fill="none" strokeDasharray="8 6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Network Paths - Full width layout */}
      <div className="mb-6">
        <div className="bg-white border border-secondary-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="inline-block w-3 h-6 bg-primary-500 rounded mr-3"></span>
            Network Paths
          </h3>
          
          <div className="flex flex-col gap-4">
            {/* Fastest Path card 1 - Full width */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-semibold text-green-700">Fastest Path</h4>
                  <p className="text-secondary-600">us-south → eu-gb</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-700">12.4 ms</span>
                  <p className="text-sm text-secondary-600">Total RTT</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-secondary-600 mt-4">
                <div className="bg-secondary-50 rounded p-2 text-center">
                  <div className="font-semibold">2</div>
                  <div className="text-xs">Hops</div>
                </div>
                <div className="bg-secondary-50 rounded p-2 text-center">
                  <div className="font-semibold">6.2 ms</div>
                  <div className="text-xs">Avg per hop</div>
                </div>
                <div className="bg-secondary-50 rounded p-2 text-center">
                  <div className="font-semibold">24%</div>
                  <div className="text-xs">Of max</div>
                </div>
              </div>
            </div>
            
            {/* Alternative Path card 2 - Full width */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-semibold text-indigo-700">Alternative Path</h4>
                  <p className="text-secondary-600">us-south → eu-central → eu-gb</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-indigo-700">15.8 ms</span>
                  <p className="text-sm text-secondary-600">Total RTT</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-secondary-600 mt-4">
                <div className="bg-secondary-50 rounded p-2 text-center">
                  <div className="font-semibold">3</div>
                  <div className="text-xs">Hops</div>
                </div>
                <div className="bg-secondary-50 rounded p-2 text-center">
                  <div className="font-semibold">5.3 ms</div>
                  <div className="text-xs">Avg per hop</div>
                </div>
                <div className="bg-secondary-50 rounded p-2 text-center">
                  <div className="font-semibold">31%</div>
                  <div className="text-xs">Of max</div>
                </div>
              </div>
            </div>
            
            {/* Alternative Path card 3 - Full width */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-semibold text-indigo-700">Alternative Path</h4>
                  <p className="text-secondary-600">us-south → eu-de → eu-gb</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-indigo-700">18.2 ms</span>
                  <p className="text-sm text-secondary-600">Total RTT</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-secondary-600 mt-4">
                <div className="bg-secondary-50 rounded p-2 text-center">
                  <div className="font-semibold">3</div>
                  <div className="text-xs">Hops</div>
                </div>
                <div className="bg-secondary-50 rounded p-2 text-center">
                  <div className="font-semibold">6.1 ms</div>
                  <div className="text-xs">Avg per hop</div>
                </div>
                <div className="bg-secondary-50 rounded p-2 text-center">
                  <div className="font-semibold">36%</div>
                  <div className="text-xs">Of max</div>
                </div>
              </div>
            </div>
            
            {/* Longest Path Between Selected - Full width */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-semibold text-amber-700">Longest Path Between Selected</h4>
                  <p className="text-secondary-600">us-south → au-syd → eu-gb</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-amber-700">32.5 ms</span>
                  <p className="text-sm text-secondary-600">Total RTT</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-secondary-600 mt-4">
                <div className="bg-secondary-50 rounded p-2 text-center">
                  <div className="font-semibold">3</div>
                  <div className="text-xs">Hops</div>
                </div>
                <div className="bg-secondary-50 rounded p-2 text-center">
                  <div className="font-semibold">10.8 ms</div>
                  <div className="text-xs">Avg per hop</div>
                </div>
                <div className="bg-secondary-50 rounded p-2 text-center">
                  <div className="font-semibold">63%</div>
                  <div className="text-xs">Of max</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Latency Analysis - Full width */}
      <div className="mb-6">
        <div className="bg-white border border-secondary-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="inline-block w-3 h-6 bg-primary-500 rounded mr-3"></span>
            Latency Analysis
          </h3>
          
          {/* Sample bar chart */}
          <div className="h-64 relative">
            <div className="absolute inset-0 flex items-end justify-between gap-8 px-8">
              <div className="flex flex-col items-center">
                <div className="w-10 h-16 bg-cyan-500 opacity-80 rounded-t-sm" />
                <span className="text-xs mt-1 text-center">Fastest</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-24 bg-indigo-500 opacity-80 rounded-t-sm" />
                <span className="text-xs mt-1 text-center">Alt 1</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-32 bg-indigo-600 opacity-80 rounded-t-sm" />
                <span className="text-xs mt-1 text-center">Alt 2</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-40 bg-amber-500 opacity-80 rounded-t-sm" />
                <span className="text-xs mt-1 text-center">Longest Sel</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-full bg-rose-500 opacity-80 rounded-t-sm" />
                <span className="text-xs mt-1 text-center">Overall</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Topology - Full width */}
      <div className="mb-6">
        <div className="bg-white border border-secondary-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="inline-block w-3 h-6 bg-primary-500 rounded mr-3"></span>
            Network Topology
          </h3>
          
          {/* Network graph mockup */}
          <div className="h-80 bg-secondary-50 rounded relative overflow-hidden">
            {/* Nodes */}
            <div className="absolute w-4 h-4 bg-emerald-600 rounded-full top-24 left-24"></div>
            <div className="absolute w-3 h-3 bg-secondary-400 rounded-full top-40 left-40"></div>
            <div className="absolute w-3 h-3 bg-secondary-400 rounded-full top-32 left-64"></div>
            <div className="absolute w-3 h-3 bg-secondary-400 rounded-full top-48 left-48"></div>
            <div className="absolute w-4 h-4 bg-ruby-600 rounded-full top-64 right-24"></div>
            
            {/* Connections with latency labels */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line x1="96" y1="96" x2="160" y2="160" 
                stroke="#06b6d4" strokeWidth="3" strokeDasharray="6 4"/>
              <line x1="160" y1="160" x2="256" y2="128" 
                stroke="#334155" strokeWidth="2"/>
              <line x1="256" y1="128" x2="552" y2="256" 
                stroke="#06b6d4" strokeWidth="3" strokeDasharray="6 4"/>
              <text x="180" y="150" font-family="Arial" font-size="12" fill="#334155">12ms</text>
              <text x="350" y="200" font-family="Arial" font-size="12" fill="#334155">16ms</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h4 className="font-semibold text-secondary-800">Consistent Layout</h4>
          <p className="text-sm text-secondary-600">All path cards display with same width</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <h4 className="font-semibold text-secondary-800">Predictable UX</h4>
          <p className="text-sm text-secondary-600">User knows what to expect</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <h4 className="font-semibold text-secondary-800">Design Harmony</h4>
          <p className="text-sm text-secondary-600">Visual coherence throughout</p>
        </div>
      </div>
    </div>
  );
};
