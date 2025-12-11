import { EditorType, JsonArray, JsonObject, JsonValue, Path } from '../types';

// Helper to determine the input type for a given value and key
export const getEditorType = (key: string, value: JsonValue): EditorType => {
  if (Array.isArray(value)) return EditorType.ARRAY;
  if (value === null) return EditorType.TEXT;
  if (typeof value === 'object') return EditorType.OBJECT;
  if (typeof value === 'boolean') return EditorType.BOOLEAN_SWITCH;
  
  if (typeof value === 'number') return EditorType.NUMBER;

  if (typeof value === 'string') {
    // Heuristics for "0"/"1" booleans
    if ((value === "0" || value === "1")) {
       const lowerKey = key.toLowerCase();
       // If key suggests a flag/switch
       if (
         lowerKey.includes('enable') || 
         lowerKey.includes('switch') || 
         lowerKey.includes('is_') ||
         lowerKey.startsWith('has_') ||
         lowerKey.includes('mode') // e.g. "ALLOW_BY_SSID.Enable" or "SCAN_MODE"
       ) {
         return EditorType.BINARY_SWITCH;
       }
       return EditorType.BINARY_SWITCH;
    }
    // If it looks like a number but is string type (e.g., "60") and not 0/1 (covered above)
    if (!isNaN(Number(value)) && value.trim() !== '') {
        return EditorType.NUMBER;
    }
  }

  return EditorType.TEXT;
};

// Deep clone to avoid mutation issues
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Update a value deep inside the JSON object based on a path array
export const setDeepValue = (obj: any, path: Path, value: any): any => {
  const newObj = Array.isArray(obj) ? [...obj] : { ...obj };
  let current = newObj;

  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    if (i === path.length - 1) {
      current[key] = value;
    } else {
      // Create path if it doesn't exist
      if (current[key] === undefined) {
         // Determine if the NEXT key is a number (array) or string (object)
         // This is important for reconstruction
         const nextKey = path[i+1];
         current[key] = typeof nextKey === 'number' ? [] : {};
      }
      
      // Clone the next level to ensure immutability
      current[key] = Array.isArray(current[key]) 
        ? [...current[key]] 
        : { ...current[key] };
      
      current = current[key];
    }
  }
  return newObj;
};

// Get value at specific path
export const getDeepValue = (obj: any, path: Path): any => {
  let current = obj;
  for (const key of path) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
};

// Convert path array to unique string key
// Using JSON.stringify ensures keys with dots or special chars don't break the path logic
export const pathToString = (path: Path): string => JSON.stringify(path);

// Convert unique string key back to Path array
export const stringToPath = (str: string): Path => {
    if (!str) return [];
    try {
        return JSON.parse(str);
    } catch {
        return [];
    }
};

// Recursively collect all paths in a JSON object relative to a base path
// Returns absolute paths if basePath is provided as absolute
export const collectAllPaths = (data: JsonValue, basePath: Path = []): string[] => {
    let paths: string[] = [pathToString(basePath)];

    if (typeof data === 'object' && data !== null) {
        if (Array.isArray(data)) {
            data.forEach((item, index) => {
                paths = paths.concat(collectAllPaths(item, [...basePath, index]));
            });
        } else {
            Object.keys(data).forEach((key) => {
                paths = paths.concat(collectAllPaths((data as any)[key], [...basePath, key]));
            });
        }
    }
    return paths;
};

// Mutable Set Value for Export (simpler for building from scratch)
export const setMutableValue = (obj: any, path: Path, value: any) => {
    if (path.length === 0) {
        // Special case: setting the root value. 
        // We can't reassign the 'obj' reference passed in, so we must mutate 'obj' properties.
        // Assumes obj and value are same type (Array or Object).
        if (Array.isArray(obj) && Array.isArray(value)) {
            obj.length = 0;
            obj.push(...value);
        } else if (typeof obj === 'object' && obj !== null && typeof value === 'object' && value !== null) {
            // Clear existing keys? result is empty initially so mostly fine.
            // But here we want to MERGE or SET.
            // If value is empty object (initialization), do nothing if obj exists.
            // If value has content, assign.
            Object.assign(obj, value);
        }
        return;
    }

    let current = obj;
    for (let i = 0; i < path.length; i++) {
        const key = path[i];
        if (i === path.length - 1) {
            current[key] = value; 
        } else {
            if (current[key] === undefined) {
                 const nextKey = path[i+1];
                 current[key] = typeof nextKey === 'number' ? [] : {};
            }
            current = current[key];
        }
    }
};

export const reconstructJsonSafe = (originalData: JsonValue, selectedPaths: Set<string>): JsonValue => {
     const rootIsArray = Array.isArray(originalData);
     const result = rootIsArray ? [] : {};
     
     // Convert string paths back to arrays
     const sortedPaths = Array.from(selectedPaths).map(s => stringToPath(s));
     
     // Sort by length (shortest first) to ensure parents are processed before children
     sortedPaths.sort((a, b) => a.length - b.length);
     
     for (const path of sortedPaths) {
         // Verify the value exists
         const value = getDeepValue(originalData, path);
         if (value !== undefined) {
             // If value is a container (Object/Array), we initialize it as empty in the result.
             // We do NOT deep clone the original container because that would include unchecked children.
             // We rely on the loop processing the children later to populate it.
             if (typeof value === 'object' && value !== null) {
                 const emptyContainer = Array.isArray(value) ? [] : {};
                 // Only set if not already set (which handles the root case or if strict sorting order is slightly off, though length sort is safe)
                 // Actually, setMutableValue overwrites. We should check existence?
                 // For root (length 0): result is already initialized. setMutableValue merges/assigns.
                 // For children:
                 if (path.length > 0) {
                     // We intentionally set it to empty. 
                     // Since we sort by length, Parent ALWAYS comes before Child.
                     // So `result.a` is set to `{}` here.
                     // Later `result.a.b` populates it.
                     setMutableValue(result, path, emptyContainer);
                 }
             } else {
                 // Primitive value: Copy it directly.
                 setMutableValue(result, path, value);
             }
         }
     }
     
     return result;
}