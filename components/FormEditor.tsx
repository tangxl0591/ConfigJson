import React from 'react';
import { JsonValue, Path, EditorType } from '../types';
import { getEditorType } from '../utils/jsonUtils';
import { ToggleLeft, ToggleRight, Hash, Type, Settings, List, Box } from 'lucide-react';

interface FormEditorProps {
  path: Path;
  data: JsonValue;
  onUpdate: (path: Path, value: JsonValue) => void;
}

const FieldLabel: React.FC<{ label: string; subLabel?: string }> = ({ label, subLabel }) => (
  <div className="mb-1">
    <label className="block text-sm font-bold text-black break-words">{label}</label>
    {subLabel && <span className="text-xs text-gray-600">{subLabel}</span>}
  </div>
);

const BinarySwitch: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const isEnabled = value === "1";
  return (
    <button
      onClick={() => onChange(isEnabled ? "0" : "1")}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 border border-black
        ${isEnabled ? 'bg-black' : 'bg-white'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full transition-transform border border-black
          ${isEnabled ? 'translate-x-5 bg-white' : 'translate-x-0.5 bg-black'}
        `}
      />
    </button>
  );
};

const BooleanSwitch: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 border border-black
        ${value ? 'bg-black' : 'bg-white'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full transition-transform border border-black
          ${value ? 'translate-x-5 bg-white' : 'translate-x-0.5 bg-black'}
        `}
      />
    </button>
  );
};

const ArrayEditor: React.FC<{ value: any[]; onChange: (v: any[]) => void }> = ({ value, onChange }) => {
    const [text, setText] = React.useState(JSON.stringify(value, null, 2));
    const [error, setError] = React.useState<string | null>(null);

    const handleBlur = () => {
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                onChange(parsed);
                setError(null);
            } else {
                setError("Input must be an array");
            }
        } catch (e) {
            setError("Invalid JSON format");
        }
    };

    return (
        <div>
            <textarea 
                className={`w-full font-mono text-sm border rounded-none p-2 bg-white text-black ${error ? 'border-red-600' : 'border-black'}`}
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={handleBlur}
            />
            {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
        </div>
    )
}

export const FormEditor: React.FC<FormEditorProps> = ({ path, data, onUpdate }) => {
  
  // Smart Title Generation
  const getHeaderInfo = () => {
      if (path.length === 0) return { title: 'Global Configuration', subtitle: 'Root', icon: Settings };
      
      const lastKey = path[path.length - 1];
      
      // If array item (key is number)
      if (typeof lastKey === 'number') {
          const parentKey = path.length > 1 ? path[path.length - 2] : 'List';
          
          // Try to identify the item
          let itemName = `Item ${lastKey}`;
          if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
               // Look for common name fields
               const keys = Object.keys(data);
               const nameField = keys.find(k => /^(name|title|label|id|slug)$/i.test(k));
               if (nameField) {
                   const val = (data as any)[nameField];
                   if (typeof val === 'string' || typeof val === 'number') {
                       itemName = String(val);
                   }
               }
          }
          
          return { 
              title: String(parentKey), 
              subtitle: itemName,
              icon: Box 
          };
      }
      
      return { 
          title: String(lastKey), 
          subtitle: '', 
          icon: Array.isArray(data) ? List : Settings 
      };
  };

  const { title, subtitle, icon: HeaderIcon } = getHeaderInfo();

  // If the selected data is an Object (and not an Array), render a list of its properties as inputs
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return (
      <div className="space-y-6">
        <div className="border-b border-black pb-3">
            <h2 className="text-2xl font-bold text-black flex items-center gap-2">
                <HeaderIcon className="w-6 h-6" />
                <span>{title}</span>
            </h2>
            {subtitle && (
                <div className="ml-8 text-sm text-gray-500 font-mono bg-gray-100 inline-block px-2 py-0.5 rounded">
                    {subtitle}
                </div>
            )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(data).map(([key, value]) => {
            const type = getEditorType(key, value as JsonValue);
            
            if (type === EditorType.OBJECT) {
                 return (
                    <div key={key} className="col-span-1 lg:col-span-2 p-4 bg-white border rounded-none border-dashed border-black">
                        <FieldLabel label={key} subLabel="Nested Object" />
                        <p className="text-sm text-black italic mt-1">Select this item in the sidebar to edit its properties.</p>
                    </div>
                 );
            }

            return (
              <div key={key} className="bg-white p-4 rounded-none border border-black hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                    <FieldLabel label={key} />
                    <span className="text-black opacity-50" title={type}>
                        {type === EditorType.BINARY_SWITCH && <ToggleLeft size={16} />}
                        {type === EditorType.BOOLEAN_SWITCH && <ToggleRight size={16} />}
                        {type === EditorType.TEXT && <Type size={16} />}
                        {type === EditorType.NUMBER && <Hash size={16} />}
                    </span>
                </div>

                {type === EditorType.BINARY_SWITCH && (
                  <div className="flex items-center gap-3">
                      <BinarySwitch 
                        value={value as string} 
                        onChange={(v) => onUpdate([...path, key], v)} 
                      />
                      <span className="text-sm font-bold font-mono text-black">{value === "1" ? "ON" : "OFF"}</span>
                  </div>
                )}

                {type === EditorType.BOOLEAN_SWITCH && (
                   <div className="flex items-center gap-3">
                    <BooleanSwitch 
                        value={value as boolean} 
                        onChange={(v) => onUpdate([...path, key], v)} 
                    />
                    <span className="text-sm font-bold font-mono text-black">{value ? "True" : "False"}</span>
                   </div>
                )}

                {type === EditorType.TEXT && (
                  <input
                    type="text"
                    className="w-full border-black border rounded-none shadow-sm focus:border-black focus:ring-1 focus:ring-black sm:text-sm p-2 bg-white text-black placeholder-gray-400"
                    value={value as string || ''}
                    onChange={(e) => onUpdate([...path, key], e.target.value)}
                  />
                )}
                
                {type === EditorType.NUMBER && (
                   <input
                    type="text"
                    inputMode="numeric"
                    className="w-full border-black border rounded-none shadow-sm focus:border-black focus:ring-1 focus:ring-black sm:text-sm p-2 font-mono bg-white text-black"
                    value={value as string}
                    onChange={(e) => onUpdate([...path, key], e.target.value)}
                  /> 
                )}

                {type === EditorType.ARRAY && (
                    <ArrayEditor 
                        value={value as any[]}
                        onChange={(v) => onUpdate([...path, key], v)}
                    />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (Array.isArray(data)) {
      return (
        <div className="space-y-4">
            <div className="border-b border-black pb-3">
                <h2 className="text-2xl font-bold text-black flex items-center gap-2">
                    <List className="w-6 h-6" />
                    <span>{title}</span>
                </h2>
                <div className="ml-8 text-sm text-gray-500 font-mono">List (Array)</div>
            </div>

            <div className="bg-white border border-black text-black p-4 rounded-none">
                <p>To edit individual items, expand <strong>{title}</strong> in the sidebar.</p>
            </div>
            <ArrayEditor value={data} onChange={(v) => onUpdate(path, v)} />
        </div>
      )
  }

  // Primitive value selected directly
  return (
    <div className="p-4 bg-white border border-black rounded-none">
      <h2 className="text-lg font-bold mb-4 text-black">{title}</h2>
      <input
        type="text"
        className="w-full border border-black rounded-none p-2 bg-white text-black"
        value={String(data)}
        onChange={(e) => onUpdate(path, e.target.value)}
      />
    </div>
  );
};