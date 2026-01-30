import { useState, useEffect } from 'react';
import type { ResumeData } from './types';
import { ResumePreview } from './components/ResumePreview';
import { ResumeForm } from './components/ResumeForm';
import { Download, FileText } from 'lucide-react';

const initialResume: ResumeData = {
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    linkedin: '',
  },
  summary: '',
  experience: [],
  education: [],
  skills: '',
  projects: [],
  sections: [
    { id: 'personal', title: 'Personal Info', isVisible: true, type: 'personal' },
    { id: 'summary', title: 'Professional Summary', isVisible: true, type: 'summary' },
    { id: 'experience', title: 'Work Experience', isVisible: true, type: 'experience' },
    { id: 'education', title: 'Education', isVisible: true, type: 'education' },
    { id: 'skills', title: 'Skills', isVisible: true, type: 'skills' },
    { id: 'projects', title: 'Projects', isVisible: true, type: 'projects' },
  ],
};

function App() {
  const [resume, setResume] = useState<ResumeData>(() => {
    const saved = localStorage.getItem('resume-data');
    return saved ? JSON.parse(saved) : initialResume;
  });

  useEffect(() => {
    localStorage.setItem('resume-data', JSON.stringify(resume));
  }, [resume]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 print:hidden shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Resume<span className="text-blue-600">Builder</span></h1>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 gap-8 grid grid-cols-1 lg:grid-cols-2">
        <div className="space-y-6 h-full print:hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 pb-4 border-b border-gray-100">
              <FileText className="w-5 h-5 text-gray-500" /> Editor
            </h2>
            <ResumeForm resume={resume} setResume={setResume} />
          </div>
        </div>

        <div className="lg:h-[calc(100vh-140px)] lg:sticky lg:top-24">
          <div className="bg-gray-200/50 rounded-xl border border-gray-200 p-4 lg:p-8 overflow-hidden h-full flex justify-center items-start lg:block overflow-y-auto">
            <div className="bg-white shadow-xl w-[210mm] min-h-[297mm] p-[10mm] mx-auto origin-top transform scale-[0.45] sm:scale-[0.6] lg:scale-[0.65] xl:scale-[0.75] 2xl:scale-[0.85] transition-transform print:transform-none print:shadow-none print:p-0 print:m-0 print:w-full print:h-auto print:mx-0">
              <ResumePreview resume={resume} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
