/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Settings, 
  Download, 
  BookOpen, 
  CheckCircle2, 
  Loader2, 
  FileArchive, 
  Image as ImageIcon,
  Clock,
  Trophy,
  ChevronRight,
  Printer,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { generateQuestionPaper, QuestionPaper, Question } from './services/gemini';

type Difficulty = 'Simple' | 'Medium' | 'Complex';
type Marks = 25 | 50 | 80;

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [marks, setMarks] = useState<Marks>(25);
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [paper, setPaper] = useState<QuestionPaper | null>(null);
  const [showSolutions, setShowSolutions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  const onDrop = (acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setError(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/zip': ['.zip']
    }
  } as any);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleGenerate = async () => {
    if (files.length === 0) {
      setError("Please upload at least one file.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPaper(null);

    try {
      const processedFiles: { data: string; mimeType: string }[] = [];

      for (const file of files) {
        if (file.type === 'application/zip') {
          const zip = new JSZip();
          const content = await zip.loadAsync(file);
          for (const [name, zipEntry] of Object.entries(content.files)) {
            if (!zipEntry.dir && (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.pdf'))) {
              const blob = await zipEntry.async('blob');
              const base64 = await fileToBase64(new File([blob], name, { type: name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' }));
              processedFiles.push({ data: base64, mimeType: name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' });
            }
          }
        } else {
          const base64 = await fileToBase64(file);
          processedFiles.push({ data: base64, mimeType: file.type });
        }
      }

      const generatedPaper = await generateQuestionPaper(processedFiles, marks, difficulty);
      setPaper(generatedPaper);
    } catch (err) {
      console.error(err);
      setError("Failed to generate question paper. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    if (!paperRef.current) return;
    
    const canvas = await html2canvas(paperRef.current, {
      scale: 2,
      useCORS: true,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${paper?.title || 'Question_Paper'}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-[#E6E6E6]">
      {/* Header */}
      <header className="border-b border-[#1A1A1A]/10 py-6 px-8 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1A1A1A] rounded-full flex items-center justify-center text-white">
            <BookOpen size={20} />
          </div>
          <h1 className="text-xl font-serif italic tracking-tight">QuestGen</h1>
        </div>
        <div className="flex items-center gap-6 text-[11px] uppercase tracking-widest font-medium opacity-60">
          <span>Skill-Based</span>
          <span>•</span>
          <span>Automated</span>
          <span>•</span>
          <span>Professional</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-10">
          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[10px] font-mono opacity-40 uppercase tracking-tighter">01</span>
              <h2 className="text-sm font-serif italic">Upload Chapter Content</h2>
            </div>
            
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${
                isDragActive ? 'border-[#1A1A1A] bg-[#1A1A1A]/5' : 'border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-12 h-12 rounded-full bg-[#1A1A1A]/5 flex items-center justify-center">
                <Upload size={20} className="opacity-60" />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium">Drop files here or click to upload</p>
                <p className="text-[10px] opacity-40 mt-1 uppercase tracking-widest">PDF, JPEG, ZIP</p>
              </div>
            </div>

            <AnimatePresence>
              {files.length > 0 && (
                <motion.ul 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 space-y-2"
                >
                  {files.map((file, idx) => (
                    <li key={idx} className="flex items-center justify-between p-3 bg-white border border-[#1A1A1A]/5 rounded-xl text-[11px]">
                      <div className="flex items-center gap-3">
                        {file.type === 'application/zip' ? <FileArchive size={14} /> : 
                         file.type.startsWith('image/') ? <ImageIcon size={14} /> : <FileText size={14} />}
                        <span className="truncate max-w-[150px]">{file.name}</span>
                      </div>
                      <button 
                        onClick={() => removeFile(idx)}
                        className="text-[10px] uppercase tracking-widest font-bold opacity-40 hover:opacity-100 transition-opacity"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[10px] font-mono opacity-40 uppercase tracking-tighter">02</span>
              <h2 className="text-sm font-serif italic">Exam Configuration</h2>
            </div>

            <div className="space-y-8">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block mb-4">Total Marks</label>
                <div className="grid grid-cols-3 gap-2">
                  {[25, 50, 80].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMarks(m as Marks)}
                      className={`py-3 rounded-xl text-xs font-medium border transition-all ${
                        marks === m ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30'
                      }`}
                    >
                      {m} Marks
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 block mb-4">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Simple', 'Medium', 'Complex'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d as Difficulty)}
                      className={`py-3 rounded-xl text-xs font-medium border transition-all ${
                        difficulty === d ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white border-[#1A1A1A]/10 hover:border-[#1A1A1A]/30'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-[#1A1A1A]/5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="opacity-60 flex items-center gap-2"><Clock size={12} /> Duration</span>
                  <span className="font-bold">{marks === 25 ? '45 Mins' : marks === 50 ? '90 Mins' : '180 Mins'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="opacity-60 flex items-center gap-2"><Trophy size={12} /> Focus</span>
                  <span className="font-bold">Skill-Based</span>
                </div>
              </div>
            </div>
          </section>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || files.length === 0}
            className="w-full py-4 bg-[#1A1A1A] text-white rounded-2xl text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate Paper
                <ChevronRight size={18} />
              </>
            )}
          </button>

          {error && (
            <p className="text-red-500 text-[10px] uppercase tracking-widest font-bold text-center">{error}</p>
          )}
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono opacity-40 uppercase tracking-tighter">03</span>
              <h2 className="text-sm font-serif italic">Question Paper Preview</h2>
            </div>
            {paper && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowSolutions(!showSolutions)}
                  className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold opacity-60 hover:opacity-100 transition-opacity"
                >
                  {showSolutions ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showSolutions ? 'Hide Answers' : 'Solve Paper'}
                </button>
                <button 
                  onClick={downloadPDF}
                  className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold bg-[#1A1A1A] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Download size={14} />
                  Download PDF
                </button>
              </div>
            )}
          </div>

          <div className="relative min-h-[600px] border border-[#1A1A1A]/10 rounded-3xl bg-white shadow-2xl shadow-[#1A1A1A]/5 overflow-hidden">
            {!paper && !isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 opacity-20">
                <FileText size={64} strokeWidth={1} />
                <p className="mt-4 font-serif italic text-lg">Your generated question paper will appear here.</p>
                <p className="text-[10px] uppercase tracking-[0.2em] mt-2">Upload content to begin</p>
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 bg-white/80 backdrop-blur-sm z-20">
                <Loader2 size={48} className="animate-spin opacity-20" />
                <p className="mt-6 font-serif italic text-xl">Analyzing Chapter Content...</p>
                <p className="text-[10px] uppercase tracking-[0.2em] mt-2 opacity-60">Gemini is crafting skill-based questions</p>
              </div>
            )}

            {paper && (
              <div ref={paperRef} className="p-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Paper Header */}
                <div className="text-center space-y-4 border-b border-[#1A1A1A]/10 pb-8">
                  <h3 className="text-2xl font-serif italic">{paper.title}</h3>
                  <div className="flex justify-center items-center gap-8 text-[11px] uppercase tracking-widest font-bold opacity-60">
                    <span className="flex items-center gap-2"><Clock size={12} /> {paper.timeMinutes} Mins</span>
                    <span>•</span>
                    <span className="flex items-center gap-2"><Trophy size={12} /> {paper.totalMarks} Marks</span>
                    <span>•</span>
                    <span>{paper.difficulty} Level</span>
                  </div>
                </div>

                {/* Questions Sections */}
                <div className="space-y-10">
                  {/* Objective Questions */}
                  {paper.questions.some(q => q.type as string === 'Objective') && (
                    <section className="space-y-6">
                      <div className="flex items-center justify-between border-b border-[#1A1A1A]/5 pb-2">
                        <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">Section A: Objective / Very Short Questions</h4>
                        <span className="text-[10px] font-mono opacity-40">1 Mark Each</span>
                      </div>
                      <div className="space-y-8">
                        {paper.questions.filter(q => q.type as string === 'Objective').map((q, i) => (
                          <div key={i} className="space-y-4">
                            <div className="flex gap-4">
                              <span className="font-mono text-xs opacity-40">Q{i + 1}.</span>
                              <p className="text-sm leading-relaxed">{q.question}</p>
                            </div>
                            {showSolutions && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="ml-10 p-3 bg-green-50 text-green-700 rounded-xl text-[11px] font-medium flex items-center gap-2"
                              >
                                <CheckCircle2 size={12} />
                                Answer: {q.answer}
                              </motion.div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* MCQs */}
                  {paper.questions.some(q => q.type === 'MCQ') && (
                    <section className="space-y-6">
                      <div className="flex items-center justify-between border-b border-[#1A1A1A]/5 pb-2">
                        <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">Section B: Multiple Choice Questions</h4>
                        <span className="text-[10px] font-mono opacity-40">1 Mark Each</span>
                      </div>
                      <div className="space-y-8">
                        {paper.questions.filter(q => q.type === 'MCQ').map((q, i) => (
                          <div key={i} className="space-y-4">
                            <div className="flex gap-4">
                              <span className="font-mono text-xs opacity-40">Q{i + 1}.</span>
                              <p className="text-sm leading-relaxed">{q.question}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 ml-10">
                              {q.options?.map((opt, idx) => (
                                <div key={idx} className="text-[11px] p-3 border border-[#1A1A1A]/5 rounded-xl flex items-center gap-3">
                                  <span className="w-5 h-5 rounded-full bg-[#1A1A1A]/5 flex items-center justify-center text-[9px] font-bold">
                                    {String.fromCharCode(65 + idx)}
                                  </span>
                                  {opt}
                                </div>
                              ))}
                            </div>
                            {showSolutions && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="ml-10 p-3 bg-green-50 text-green-700 rounded-xl text-[11px] font-medium flex items-center gap-2"
                              >
                                <CheckCircle2 size={12} />
                                Answer: {q.answer}
                              </motion.div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Short Answers */}
                  {paper.questions.some(q => q.type === 'Short') && (
                    <section className="space-y-6">
                      <div className="flex items-center justify-between border-b border-[#1A1A1A]/5 pb-2">
                        <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">Section C: Short Answer Type</h4>
                        <span className="text-[10px] font-mono opacity-40">2-3 Marks Each</span>
                      </div>
                      <div className="space-y-8">
                        {paper.questions.filter(q => q.type === 'Short').map((q, i) => (
                          <div key={i} className="space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex gap-4">
                                <span className="font-mono text-xs opacity-40">Q{i + 1}.</span>
                                <p className="text-sm leading-relaxed">{q.question}</p>
                              </div>
                              <span className="text-[10px] font-mono opacity-40 whitespace-nowrap">[{q.marks}]</span>
                            </div>
                            {showSolutions && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="ml-10 p-4 bg-blue-50 text-blue-700 rounded-xl text-[11px] leading-relaxed"
                              >
                                <div className="font-bold mb-1 flex items-center gap-2"><CheckCircle2 size={12} /> Suggested Solution:</div>
                                {q.answer}
                              </motion.div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Long Answers */}
                  {paper.questions.some(q => q.type === 'Long') && (
                    <section className="space-y-6">
                      <div className="flex items-center justify-between border-b border-[#1A1A1A]/5 pb-2">
                        <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">Section D: Long Answer Type (Skill-Based)</h4>
                        <span className="text-[10px] font-mono opacity-40">5-10 Marks Each</span>
                      </div>
                      <div className="space-y-8">
                        {paper.questions.filter(q => q.type === 'Long').map((q, i) => (
                          <div key={i} className="space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex gap-4">
                                <span className="font-mono text-xs opacity-40">Q{i + 1}.</span>
                                <p className="text-sm leading-relaxed">{q.question}</p>
                              </div>
                              <span className="text-[10px] font-mono opacity-40 whitespace-nowrap">[{q.marks}]</span>
                            </div>
                            {showSolutions && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="ml-10 p-4 bg-purple-50 text-purple-700 rounded-xl text-[11px] leading-relaxed"
                              >
                                <div className="font-bold mb-1 flex items-center gap-2"><CheckCircle2 size={12} /> Detailed Solution:</div>
                                {q.answer}
                              </motion.div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-12 border-t border-[#1A1A1A]/10 text-center">
                  <p className="text-[9px] uppercase tracking-[0.3em] opacity-30">End of Question Paper • Generated by QuestGen AI</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-8 py-12 border-t border-[#1A1A1A]/5 flex justify-between items-center opacity-40 text-[10px] uppercase tracking-widest font-medium">
        <p>© 2026 QuestGen AI Studio</p>
        <div className="flex gap-6">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Feedback</span>
        </div>
      </footer>
    </div>
  );
}
