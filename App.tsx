
import React, { useState, useEffect, useRef } from 'react';
import { SearchMode, IchiResult, IchiDictionaryEntry } from './types';
import { IchiDecoder } from './components/IchiDecoder';
import { DictionaryService } from './services/dictionaryService';

const App: React.FC = () => {
  const [mode, setMode] = useState<SearchMode>(SearchMode.COMBINED);
  const [combinedInput, setCombinedInput] = useState('');
  const [stems, setStems] = useState(['', '', '']);
  const [extensions, setExtensions] = useState(['', '', '', '', '']);
  const [result, setResult] = useState<IchiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dictSize, setDictSize] = useState(0);
  const [generatedSnippet, setGeneratedSnippet] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const size = DictionaryService.init();
    setDictSize(size);
  }, []);

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const count = DictionaryService.addFromCSV(text);
      setDictSize(DictionaryService.getSize());
      alert(`${count}件のコードをロードしました。下に「内蔵用コードを生成」ボタンが表示されます。`);
      setGeneratedSnippet(null); // 新しく読み込んだらリセット
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // 辞書MapからTypeScriptの配列形式テキストを生成する
  const generateTSCode = () => {
    const entries: string[] = [];
    // DictionaryServiceの内部キャッシュにアクセス（Mapをループ）
    // DictionaryService.tsにgetAllEntriesを設ける代わりに、ここで簡易的に生成
    const size = DictionaryService.getSize();
    if (size === 0) return;

    // DictionaryServiceから全データを取得して整形
    const rawData = (DictionaryService as any).cache as Map<string, string>;
    rawData.forEach((desc, code) => {
      // シングルクォートをエスケープ
      const escapedDesc = desc.replace(/'/g, "\\'");
      const escapedCode = code.replace(/'/g, "\\'");
      entries.push(`  { code: '${escapedCode}', description: '${escapedDesc}' }`);
    });

    setGeneratedSnippet(entries.join(',\n'));
  };

  const copyToClipboard = () => {
    if (generatedSnippet) {
      navigator.clipboard.writeText(generatedSnippet);
      alert("コピーしました！ constants/dictionary.ts の配列内に貼り付けてください。");
    }
  };

  const handleSearch = () => {
    setIsLoading(true);
    let finalStems: string[] = [];
    let finalExtensions: string[] = [];
    let fullCode = '';

    if (mode === SearchMode.COMBINED) {
      fullCode = combinedInput;
      const parts = combinedInput.split('&').map(p => p.trim());
      parts.forEach(p => {
        if (p.includes('.')) finalStems.push(p);
        else if (p !== '') finalExtensions.push(p);
      });
    } else {
      finalStems = stems.filter(s => s.trim() !== '');
      finalExtensions = extensions.filter(e => e.trim() !== '');
      fullCode = [...finalStems, ...finalExtensions].join(' & ');
    }

    if (finalStems.length === 0 && finalExtensions.length === 0) {
      alert("コードを入力してください。");
      setIsLoading(false);
      return;
    }

    const stemResults: IchiDictionaryEntry[] = finalStems.map(s => {
      const desc = DictionaryService.lookup(s);
      return { code: s, description: desc || '（辞書にデータがありません）' };
    });

    const extensionResults: IchiDictionaryEntry[] = finalExtensions.map(e => {
      const desc = DictionaryService.lookup(e);
      return { code: e, description: desc || '（辞書にデータがありません）' };
    });

    setResult({ fullCode, stemResults, extensionResults });
    setIsLoading(false);
  };

  const handleClear = () => {
    setCombinedInput('');
    setStems(['', '', '']);
    setExtensions(['', '', '', '', '']);
    setResult(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 md:px-10">
      <header className="mb-10 text-center max-w-2xl w-full">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="bg-slate-800 text-white p-3 rounded-lg shadow-lg">
            <i className="fas fa-book-medical text-2xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">ICHI Code Explorer</h1>
        </div>
        <p className="text-slate-600 mb-6 text-sm">内蔵辞書データに基づき、ICHIコードを処置内容に変換します。</p>
        
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-4 py-2 px-6 bg-white border border-slate-200 rounded-full shadow-sm text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <i className="fas fa-database text-blue-500"></i>
              <span>登録コード: <strong className="text-slate-900">{dictSize.toLocaleString()}</strong> 件</span>
            </div>
            <div className="w-px h-4 bg-slate-200"></div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-800 font-bold transition-colors flex items-center gap-1"
            >
              <i className="fas fa-upload"></i>
              CSVを読み込む
            </button>
            <input type="file" ref={fileInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />
          </div>

          {dictSize > 0 && (
            <button 
              onClick={generateTSCode}
              className="text-[10px] text-slate-400 hover:text-slate-600 underline"
            >
              [管理者用] 内蔵用のTSコードを生成する
            </button>
          )}
        </div>
      </header>

      {generatedSnippet && (
        <div className="w-full max-w-4xl mb-8 p-6 bg-slate-900 rounded-xl shadow-2xl overflow-hidden relative">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-400 text-xs font-mono">constants/dictionary.ts 用のデータ</span>
            <button 
              onClick={copyToClipboard}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded transition-colors"
            >
              全コピー
            </button>
          </div>
          <textarea 
            readOnly 
            className="w-full h-40 bg-slate-800 text-blue-300 font-mono text-[10px] p-4 rounded border border-slate-700 outline-none"
            value={generatedSnippet}
          />
          <p className="text-slate-500 text-[10px] mt-2 italic">※これをコピーして、dictionary.ts の ICHI_DICTIONARY = [ ここ ] に貼り付けてください。</p>
        </div>
      )}

      <main className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="flex border-b bg-slate-50">
          <button onClick={() => setMode(SearchMode.COMBINED)} className={`flex-1 py-4 font-bold text-sm transition-all ${mode === SearchMode.COMBINED ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}>連結コード検索</button>
          <button onClick={() => setMode(SearchMode.SEPARATE)} className={`flex-1 py-4 font-bold text-sm transition-all ${mode === SearchMode.SEPARATE ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}>個別コード入力</button>
        </div>

        <div className="p-8">
          <IchiDecoder mode={mode} combinedInput={combinedInput} setCombinedInput={setCombinedInput} stems={stems} setStems={setStems} extensions={extensions} setExtensions={setExtensions} />
          <div className="flex flex-col sm:flex-row gap-4 mt-10">
            <button onClick={handleSearch} disabled={isLoading} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">
              <i className="fas fa-search"></i>辞書を参照する
            </button>
            <button onClick={handleClear} className="px-8 py-4 border border-slate-200 rounded-xl font-semibold text-slate-500 hover:bg-slate-50 transition-colors">リセット</button>
          </div>
        </div>

        {result && (
          <div className="bg-slate-50 border-t border-slate-200 p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xl font-black text-slate-800 mb-8"><i className="fas fa-file-alt mr-2 text-slate-400"></i>結果: {result.fullCode}</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest px-2 border-l-4 border-blue-600">Stem Codes</h3>
                {result.stemResults.map((r, i) => (
                  <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <code className="text-blue-700 font-bold text-sm block mb-2">{r.code}</code>
                    <p className="text-slate-800 text-sm leading-relaxed">{r.description}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest px-2 border-l-4 border-purple-600">Extension Codes</h3>
                {result.extensionResults.map((r, i) => (
                  <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <code className="text-purple-700 font-bold text-sm block mb-2">{r.code}</code>
                    <p className="text-slate-800 text-sm leading-relaxed">{r.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className="mt-12 text-slate-400 text-[10px] text-center max-w-md">
        <p>WHO International Classification of Health Interventions (ICHI) Decoder</p>
      </footer>
    </div>
  );
};

export default App;
