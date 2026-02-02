
export interface IchiDictionaryEntry {
  code: string;
  description: string;
}

export interface IchiResult {
  fullCode: string;
  stemResults: IchiDictionaryEntry[];
  extensionResults: IchiDictionaryEntry[];
  aiInterpretation?: string;
}

export enum SearchMode {
  COMBINED = 'COMBINED',
  SEPARATE = 'SEPARATE'
}
