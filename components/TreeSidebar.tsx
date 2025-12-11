import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FileJson, Settings } from 'lucide-react';
import { JsonValue, Path } from '../types';
import { pathToString } from '../utils/jsonUtils';

interface TreeSidebarProps {
  data: JsonValue;
  onSelect: (path: Path) => void;
  selectedPath: Path;
  checkedPaths: Set<string>;
  onCheck: (path: Path, isChecked: boolean) => void;
}

const TreeNode: React.FC<{
  label: string;
  data: JsonValue;
  path: Path;
  level: number;
  onSelect: (path: Path) => void;
  selectedPath: Path;
  checkedPaths: Set<string>;
  onCheck: (path: Path, isChecked: boolean) => void;
}> = ({ label, data, path, level, onSelect, selectedPath, checkedPaths, onCheck }) => {
  // Determine if this node is expandable (Object or Array)
  const isExpandable = typeof data === 'object' && data !== null;
  const isSelected = selectedPath.join('.') === path.join('.');
  const pathStr = pathToString(path);
  const isChecked = checkedPaths.has(pathStr);
  
  // Auto-expand if the selected path contains this path
  const isChildSelected = selectedPath.join('.').startsWith(pathStr);
  
  const [isOpen, setIsOpen] = useState(level < 1 || isChildSelected);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpandable) {
      setIsOpen(!isOpen);
    }
    onSelect(path);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onCheck(path, e.target.checked);
  }

  // Icon Logic
  const getIcon = () => {
    if (!isExpandable) return <Settings size={14} className="text-black" />;
    if (Array.isArray(data)) return <Folder size={14} className="text-black" />;
    return <FileJson size={14} className="text-black" />;
  };

  return (
    <div className="select-none">
      <div
        className={`
          flex items-center py-1 px-2 cursor-pointer transition-colors duration-150 rounded-none
          ${isSelected ? 'bg-black text-white font-bold' : 'hover:bg-gray-200 text-black'}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleToggle}
      >
        <div className={`mr-2 flex items-center`}>
            {/* Checkbox for Export Selection */}
            <input 
                type="checkbox" 
                checked={isChecked}
                onChange={handleCheckboxChange}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 text-black bg-white border-gray-300 rounded focus:ring-black accent-black"
            />
        </div>

        <div className={`mr-1 ${isSelected ? 'text-white' : 'text-black'}`}>
           {isExpandable ? (
             isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
           ) : <span className="w-3.5 inline-block"></span>}
        </div>
        
        <div className={`mr-2 ${isSelected ? 'text-white' : 'text-black'}`}>
          {React.cloneElement(getIcon() as React.ReactElement<{ className?: string }>, { className: isSelected ? 'text-white' : 'text-black' })}
        </div>
        <span className="truncate text-sm">{label}</span>
      </div>

      {isExpandable && isOpen && (
        <div>
          {Array.isArray(data)
            ? data.map((item, index) => (
                <TreeNode
                  key={index}
                  label={`[${index}]`}
                  data={item}
                  path={[...path, index]}
                  level={level + 1}
                  onSelect={onSelect}
                  selectedPath={selectedPath}
                  checkedPaths={checkedPaths}
                  onCheck={onCheck}
                />
              ))
            : Object.keys(data).map((key) => (
                <TreeNode
                  key={key}
                  label={key}
                  data={(data as any)[key]}
                  path={[...path, key]}
                  level={level + 1}
                  onSelect={onSelect}
                  selectedPath={selectedPath}
                  checkedPaths={checkedPaths}
                  onCheck={onCheck}
                />
              ))}
        </div>
      )}
    </div>
  );
};

export const TreeSidebar: React.FC<TreeSidebarProps> = ({ data, onSelect, selectedPath, checkedPaths, onCheck }) => {
  return (
    <div className="h-full overflow-y-auto py-2 bg-white text-black">
      {typeof data === 'object' && data !== null && Object.keys(data).length > 0 ? (
        Object.keys(data).map((key) => (
          <TreeNode
            key={key}
            label={key}
            data={(data as any)[key]}
            path={[key]}
            level={0}
            onSelect={onSelect}
            selectedPath={selectedPath}
            checkedPaths={checkedPaths}
            onCheck={onCheck}
          />
        ))
      ) : (
        <div className="p-4 text-gray-500 italic text-sm text-center mt-10">
            No data loaded.<br/>Please load a JSON file.
        </div>
      )}
    </div>
  );
};