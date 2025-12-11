import React, { useState, useEffect, useCallback } from 'react';
import { TreeSidebar } from './components/TreeSidebar';
import { FormEditor } from './components/FormEditor';
import { DEFAULT_JSON_DATA } from './constants';
import { JsonValue, Path } from './types';
import { deepClone, getDeepValue, setDeepValue, collectAllPaths, reconstructJsonSafe, pathToString } from './utils/jsonUtils';
import { Upload, Download, RefreshCw, FileText, CheckSquare, Square } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<JsonValue>(DEFAULT_JSON_DATA);
  const [selectedPath, setSelectedPath] = useState<Path>([]);
  const [selectedData, setSelectedData] = useState<JsonValue | undefined>(undefined);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Set of paths (stringified) that are selected for export
  const [checkedPaths, setCheckedPaths] = useState<Set<string>>(new Set());

  // Sync selectedData when data or path changes
  useEffect(() => {
    if (selectedPath.length === 0) {
        // If empty path, try to find first key if available, else root
        if (typeof data === 'object' && data !== null && Object.keys(data).length > 0) {
             // Stay at root or select first? Let's select root undefined for editor
             setSelectedData(data); 
        } else {
             setSelectedData(undefined);
        }
        return;
    }
    const val = getDeepValue(data, selectedPath);
    setSelectedData(val);
  }, [data, selectedPath]);

  const handleUpdate = useCallback((path: Path, value: JsonValue) => {
    setData((prevData) => {
      const cloned = deepClone(prevData);
      return setDeepValue(cloned, path, value);
    });
  }, []);

  const handleCheck = useCallback((path: Path, isChecked: boolean) => {
      // Logic: If checking a node, automatically check all its descendants.
      // If unchecking, uncheck all descendants.
      
      const targetValue = getDeepValue(data, path);
      // collectAllPaths now returns absolute string paths when base path is provided
      const absolutePaths = collectAllPaths(targetValue, path);
      
      setCheckedPaths(prev => {
          const next = new Set(prev);
          
          if (isChecked) {
               absolutePaths.forEach(p => next.add(p));
          } else {
              absolutePaths.forEach(p => next.delete(p));
          }
          return next;
      });
  }, [data]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);
        setData(json);
        
        // Default: Select All for export
        const allPaths = collectAllPaths(json);
        setCheckedPaths(new Set(allPaths));

        // Select first item for view
        if (typeof json === 'object' && json !== null) {
            const keys = Object.keys(json);
            if (keys.length > 0) setSelectedPath([keys[0]]);
        }
        
        setNotification('File loaded successfully!');
        setTimeout(() => setNotification(null), 3000);
      } catch (error) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    if (checkedPaths.size === 0) {
        if(!confirm("No items selected. This will export an empty file. Continue?")) return;
    }

    try {
        const exportData = reconstructJsonSafe(data, checkedPaths);
        
        const jsonString = JSON.stringify(exportData, null, 4);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'config_settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setNotification('Selected items exported!');
        setTimeout(() => setNotification(null), 3000);
    } catch (e) {
        console.error(e);
        alert("Failed to export JSON. See console for details.");
    }
  };

  const handleReset = () => {
      if(confirm("Clear all data and reset?")) {
          setData({});
          setCheckedPaths(new Set());
          setSelectedPath([]);
          setNotification('Workspace cleared.');
          setTimeout(() => setNotification(null), 3000);
      }
  }

  const handleSelectAll = () => {
      const allPaths = collectAllPaths(data);
      setCheckedPaths(new Set(allPaths));
  }

  const handleDeselectAll = () => {
      setCheckedPaths(new Set());
  }

  const isEmpty = typeof data === 'object' && data !== null && Object.keys(data).length === 0;

  return (
    <div className="flex flex-col h-screen bg-white text-black font-sans">
      {/* Header */}
      <header className="bg-white border-b border-black px-6 py-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-black p-2 rounded-md text-white">
             <SettingsIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black tracking-tight">ConfigJSON <span className="text-black font-normal">Editor</span></h1>
            <p className="text-xs text-black">Universal Configuration Tool</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
           {notification && (
               <span className="text-sm text-black font-bold animate-pulse px-3 py-1 border border-black">
                   {notification}
               </span>
           )}
          <label className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-black bg-white border border-black rounded hover:bg-black hover:text-white transition-colors cursor-pointer">
            <Upload size={16} />
            <span>Load</span>
            <input type="file" accept=".json,.txt" className="hidden" onChange={handleFileUpload} />
          </label>
          <button 
             onClick={handleReset}
             className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-black bg-white border border-black rounded hover:bg-black hover:text-white transition-colors"
          >
            <RefreshCw size={16} />
            Clear
          </button>
          <button
            onClick={handleDownload}
            disabled={isEmpty}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold text-white border border-black rounded shadow-md transition-colors 
                ${isEmpty ? 'bg-gray-400 cursor-not-allowed border-gray-400' : 'bg-black hover:bg-gray-800 active:transform active:scale-95'}
            `}
          >
            <Download size={16} />
            <span>Export Selected</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-96 bg-white border-r border-black flex flex-col">
          <div className="p-4 border-b border-black bg-white flex justify-between items-center">
            <h2 className="text-xs font-bold text-black uppercase tracking-wider">Explorer</h2>
            {!isEmpty && (
                <div className="flex gap-2">
                    <button onClick={handleSelectAll} title="Select All" className="p-1 hover:bg-gray-200 rounded">
                        <CheckSquare size={16} />
                    </button>
                    <button onClick={handleDeselectAll} title="Deselect All" className="p-1 hover:bg-gray-200 rounded">
                        <Square size={16} />
                    </button>
                </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
             <TreeSidebar 
               data={data} 
               onSelect={setSelectedPath} 
               selectedPath={selectedPath} 
               checkedPaths={checkedPaths}
               onCheck={handleCheck}
             />
          </div>
        </aside>

        {/* Editor Area */}
        <main className="flex-1 overflow-y-auto bg-white p-8">
            <div className="max-w-5xl mx-auto">
                {/* Breadcrumbs */}
                <nav className="flex mb-6 text-sm text-black overflow-x-auto pb-2 whitespace-nowrap min-h-[30px]">
                    {selectedPath.map((item, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <span className="mx-2 text-black">/</span>}
                        <span className={`flex items-center gap-1 ${index === selectedPath.length - 1 ? 'font-bold text-black border-b-2 border-black' : 'hover:underline cursor-pointer'}`}
                              onClick={() => setSelectedPath(selectedPath.slice(0, index + 1))}
                        >
                            {index === 0 ? <FileText size={14} /> : null}
                            {item}
                        </span>
                    </React.Fragment>
                    ))}
                </nav>

                <div className="bg-white rounded-none border border-black min-h-[500px] p-6 relative">
                    {!isEmpty && selectedData !== undefined ? (
                        <FormEditor 
                            path={selectedPath} 
                            data={selectedData} 
                            onUpdate={handleUpdate} 
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-black absolute inset-0">
                            {isEmpty ? (
                                <>
                                    <Upload size={48} className="mb-4 text-black opacity-20" />
                                    <p className="font-bold text-lg">No Configuration Loaded</p>
                                    <p className="text-gray-500">Please load a JSON file to begin.</p>
                                </>
                            ) : (
                                <>
                                    <FileText size={48} className="mb-4 text-black opacity-20" />
                                    <p>Select an item from the sidebar to edit settings.</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
      </div>
    </div>
  );
}

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
)