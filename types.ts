export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];

export interface BreadcrumbItem {
  key: string;
  index?: number;
}

export type Path = (string | number)[];

export enum EditorType {
  TEXT = 'TEXT',
  BOOLEAN_SWITCH = 'BOOLEAN_SWITCH', // True/False
  BINARY_SWITCH = 'BINARY_SWITCH',   // "0"/"1"
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
  NUMBER = 'NUMBER'
}