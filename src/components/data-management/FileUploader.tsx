/**
 * FileUploader - Component for uploading custom RTT data files
 * 
 * This component allows users to upload their own RTT data in JSON or CSV format.
 * It provides validation and error handling to ensure data integrity.
 * 
 * Supported formats:
 * - JSON: { "connections": [{"source": "region1", "target": "region2", "rtt": 100}] }
 * - CSV: source,target,rtt (with headers)
 */
import React, { useCallback, useState } from 'react';
import { RttData, Connection } from '@utils/loadLatencyData';
import type { NetworkData } from '@types/network';

interface FileUploaderProps {
  onDataLoaded: (data: NetworkData) => void;
  onError: (error: Error) => void;
}

type FileType = 'json' | 'csv' | null;

const FileUploader: React.FC<FileUploaderProps> = ({ onDataLoaded, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filePreview, setFilePreview] = useState<{
    name: string;
    type: FileType;
    size: number;
  } | null>(null);

  const parseJSONFile = async (file: File): Promise<RttData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          
          // Validate JSON structure
          if (!parsed.connections || !Array.isArray(parsed.connections)) {
            throw new Error('Invalid JSON format: missing connections array');
          }
          
          // Validate each connection
          for (const conn of parsed.connections) {
            if (!conn.source || !conn.target || typeof conn.rtt !== 'number') {
              throw new Error('Invalid connection object: missing required fields');
            }
          }
          
          resolve(parsed);
        } catch (err) {
          reject(new Error(`JSON parsing error: ${err.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  };

  const parseCSVFile = async (file: File): Promise<RttData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split('\n');
          
          // Check if file has header
          const firstLine = lines[0].toLowerCase();
          const hasHeader = firstLine.includes('source') && 
                           firstLine.includes('target') && 
                           firstLine.includes('rtt');
          
          const startLine = hasHeader ? 1 : 0;
          const connections: Connection[] = [];
          
          for (let i = startLine; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const parts = line.split(',');
            if (parts.length !== 3) {
              throw new Error(`Invalid CSV format at line ${i + 1}: expected 3 columns`);
            }
            
            const [source, target, rttStr] = parts;
            const rtt = parseFloat(rttStr.trim());
            
            if (isNaN(rtt)) {
              throw new Error(`Invalid RTT value at line ${i + 1}: ${rttStr}`);
            }
            
            connections.push({
              source: source.trim(),
              target: target.trim(),
              rtt: rtt
            });
          }
          
          resolve({ connections });
        } catch (err) {
          reject(new Error(`CSV parsing error: ${err.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  };

  const convertToNetworkData = (data: RttData): NetworkData => {
    const networkData: NetworkData = {};
    
    for (const connection of data.connections) {
      const { source, target, rtt } = connection;
      
      // Initialize source and target if they don't exist
      if (!networkData[source]) networkData[source] = {};
      if (!networkData[target]) networkData[target] = {};
      
      // Add bidirectional edges
      networkData[source][target] = rtt;
      
      // Only add reverse direction if it doesn't already exist
      if (networkData[target][source] === undefined) {
        networkData[target][source] = rtt;
      }
    }
    
    return networkData;
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setFilePreview({
      name: file.name,
      type: file.name.endsWith('.json') ? 'json' : 
            file.name.endsWith('.csv') ? 'csv' : null,
      size: file.size
    });
    
    try {
      let rttData: RttData;
      
      if (file.name.endsWith('.json')) {
        rttData = await parseJSONFile(file);
      } else if (file.name.endsWith('.csv')) {
        rttData = await parseCSVFile(file);
      } else {
        throw new Error('Unsupported file type. Please upload a JSON or CSV file.');
      }
      
      const networkData = convertToNetworkData(rttData);
      onDataLoaded(networkData);
      
      console.log(`Successfully loaded ${rttData.connections.length} connections from ${file.name}`);
    } catch (err) {
      onError(err as Error);
      setFilePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    },
    [onDataLoaded, onError]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
          isDragging
            ? 'border-primary-400 bg-primary-50'
            : 'border-secondary-300 hover:border-secondary-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="text-center">
          <svg
            className={`mx-auto h-12 w-12 ${
              isDragging ? 'text-primary-400' : 'text-secondary-400'
            }`}
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="mt-1 text-sm text-secondary-600">
            Drag and drop your RTT data file here, or
            <label className="relative ml-1 cursor-pointer font-medium text-primary-600 hover:text-primary-500">
              browse
              <input
                type="file"
                className="sr-only"
                accept=".json,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
              />
            </label>
          </p>
          <p className="mt-1 text-xs text-secondary-500">
            Supports JSON and CSV formats (max 5MB)
          </p>
        </div>
        
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent"></div>
              <span className="text-sm font-medium text-secondary-700">
                Processing file...
              </span>
            </div>
          </div>
        )}
      </div>
      
      {filePreview && (
        <div className="bg-secondary-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {filePreview.type === 'json' ? (
                  <svg className="h-8 w-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h7v2H4v14h14v-7h2v9H2V4h2z"/>
                    <path d="M18 2h4v4h-4zM15 18h1v-3.5h1.5V13H17v-1.5h-1.5V15h-1.5v-3h-2v4.5h2v1.5zm-3-8V8h1V7h1V6h-3v4h1zm-4 6h3v-1h-2v-1h2V13h-3v1h2v1h-2v1zm-2-4H5v-1H4v3h3v-1H6v1h1v-2z"/>
                  </svg>
                ) : (
                  <svg className="h-8 w-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 2h16v20H4V2z"/>
                    <path fill="white" d="M5 4v16h14V4H5zm6 2h2v2h-2V6zm-4 0h2v2H7V6zm0 6h2v-2H7v2zm0 4h2v-2H7v2zm4 0h2v-2h-2v2zm4 0h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V6h-2v2z"/>
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-secondary-900">{filePreview.name}</p>
                <p className="text-sm text-secondary-500">
                  {(filePreview.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilePreview(null)}
              className="text-secondary-400 hover:text-secondary-500"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <div className="text-xs text-secondary-500">
        <p className="font-medium mb-1">File format requirements:</p>
        <p className="ml-2">• JSON: {"{"}"connections": [{"{"}"source": "...", "target": "...", "rtt": number{"}"}, ...]{"}"}</p>
        <p className="ml-2">• CSV: Required columns - source, target, rtt (with or without headers)</p>
      </div>
    </div>
  );
};

export default FileUploader;
