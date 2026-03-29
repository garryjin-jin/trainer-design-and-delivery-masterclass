import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  signInAnonymously,
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp,
  limit,
  orderBy,
  OperationType,
  handleFirestoreError,
  FirebaseUser
} from './firebase';
import { UserProfile, Scenario, QuizAttempt, UserRole } from './types';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { 
  LogOut, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  BookOpen, 
  Lightbulb, 
  ChevronRight, 
  Trophy, 
  Settings, 
  Brain, 
  MessageSquare, 
  RefreshCw,
  Trash2,
  Check,
  AlertCircle,
  Search,
  ArrowLeft,
  Copy,
  FileText,
  Database
} from 'lucide-react';
import { cn } from './lib/utils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// --- Components ---

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
      />
    </div>
  );
}

function ErrorBoundary({ error, reset }: { error: string, reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-white text-center">
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-6 max-w-md">{error}</p>
      <button
        onClick={reset}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isGuest, setIsGuest] = useState(false);
  const [showExitScreen, setShowExitScreen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const path = `users/${u.uid}`;
        try {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            const isDefaultInstructor = u.email === "anhem123443219@gmail.com";
            const newProfile: UserProfile = {
              uid: u.uid,
              email: u.email || '',
              role: isDefaultInstructor ? 'instructor' : 'student'
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
          setLoading(false);
        } catch (err) {
          console.error("Profile load error:", err);
          handleFirestoreError(err, OperationType.GET, path);
          setError("Failed to load user profile.");
          setLoading(false);
        }
      } else {
        // Automatically enter guest mode if not logged in
        let guestId = localStorage.getItem('guestId');
        if (!guestId) {
          guestId = `guest_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('guestId', guestId);
        }
        setIsGuest(true);
        setProfile({
          uid: guestId,
          email: 'guest@example.com',
          role: 'student'
        });
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setIsGuest(false);
    } catch (err) {
      setError("Login failed. Please try again.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setIsGuest(true);
    setProfile({
      uid: 'guest',
      email: 'guest@example.com',
      role: 'student'
    });
  };

  if (loading || !profile) return <LoadingSpinner />;
  if (error) return <ErrorBoundary error={error} reset={() => setError(null)} />;

  if (showExitScreen) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md"
        >
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-gray-600 mb-8">
            You have successfully completed the training. You can now safely close this browser tab.
          </p>
          <button 
            onClick={() => setShowExitScreen(false)}
            className="text-blue-600 font-bold hover:underline"
          >
            Go back to start
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg hidden sm:block">TrainerMaster</span>
          </div>
          
          <div className="flex items-center gap-4">
            {isGuest ? (
              <button
                onClick={handleLogin}
                className="text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors"
              >
                Instructor Login
              </button>
            ) : (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user?.displayName || 'Instructor'}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {profile?.role === 'instructor' ? (
          <InstructorDashboard profile={profile} />
        ) : (
          <StudentDashboard profile={profile!} onLogout={handleLogout} onExit={() => setShowExitScreen(true)} />
        )}
      </main>
    </div>
  );
}

// --- Instructor Dashboard ---

function InstructorDashboard({ profile }: { profile: UserProfile }) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState(profile.knowledgeBase || '');
  const [activeTab, setActiveTab] = useState<'list' | 'generate' | 'playtest'>('list');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const q = query(collection(db, 'scenarios'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setScenarios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scenario)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'scenarios'));
    return unsubscribe;
  }, []);

  const saveKB = async () => {
    try {
      await updateDoc(doc(db, 'users', profile.uid), { knowledgeBase });
      setToast({ message: "Knowledge base saved!", type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const generateScenario = async () => {
    if (!knowledgeBase) {
      setToast({ message: "Please provide a knowledge base first.", type: 'error' });
      return;
    }
    setIsGenerating(true);
    try {
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on the following knowledge base about trainer design and delivery, generate a realistic training scenario and a multiple-choice question (4 options, 1 correct).
        
        Knowledge Base:
        ${knowledgeBase}
        
        Return the result in JSON format with the following structure:
        {
          "title": "A short descriptive title",
          "content": "The scenario description (realistic and professional)",
          "question": "The question to ask based on the scenario",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "optionExplanations": [
            "Detailed analysis of why Option A is correct or incorrect. If incorrect, explain the logical flaw.",
            "Detailed analysis of why Option B is correct or incorrect. If incorrect, explain the logical flaw.",
            "Detailed analysis of why Option C is correct or incorrect. If incorrect, explain the logical flaw.",
            "Detailed analysis of why Option D is correct or incorrect. If incorrect, explain the logical flaw."
          ],
          "optionConsequences": [
            "If Option A is wrong, what are the specific negative consequences or harms in a real training environment? If correct, put 'N/A'.",
            "If Option B is wrong, what are the specific negative consequences or harms in a real training environment? If correct, put 'N/A'.",
            "If Option C is wrong, what are the specific negative consequences or harms in a real training environment? If correct, put 'N/A'.",
            "If Option D is wrong, what are the specific negative consequences or harms in a real training environment? If correct, put 'N/A'."
          ],
          "references": ["Provide 2-3 real or highly relevant website URLs for further reading on these specific concepts"],
          "correctAnswerIndex": 0,
          "explanation": "A comprehensive summary of the scenario's learning objective",
          "concepts": "The core pedagogical or delivery concepts involved",
          "applications": "How a trainer should apply this knowledge in practice"
        }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              optionExplanations: { type: Type.ARRAY, items: { type: Type.STRING } },
              optionConsequences: { type: Type.ARRAY, items: { type: Type.STRING } },
              references: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              concepts: { type: Type.STRING },
              applications: { type: Type.STRING }
            },
            required: ["title", "content", "question", "options", "optionExplanations", "optionConsequences", "references", "correctAnswerIndex", "explanation", "concepts", "applications"]
          }
        }
      });

      const response = await model;
      const data = JSON.parse(response.text);
      
      await addDoc(collection(db, 'scenarios'), {
        ...data,
        status: 'pending',
        createdAt: serverTimestamp(),
        instructorId: profile.uid
      });
      setActiveTab('list');
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to generate scenario.", type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const approveScenario = async (id: string) => {
    try {
      await updateDoc(doc(db, 'scenarios', id), { status: 'approved' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `scenarios/${id}`);
    }
  };

  const saveScenarioChanges = async () => {
    if (!selectedScenario) return;
    setIsSaving(true);
    try {
      const { id, ...data } = selectedScenario;
      await updateDoc(doc(db, 'scenarios', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      setToast({ message: "Scenario updated successfully!", type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `scenarios/${selectedScenario.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveAndApproveScenario = async () => {
    if (!selectedScenario) return;
    setIsSaving(true);
    try {
      const { id, ...data } = selectedScenario;
      await updateDoc(doc(db, 'scenarios', id), {
        ...data,
        status: 'approved',
        updatedAt: serverTimestamp()
      });
      setToast({ message: "Scenario saved and approved!", type: 'success' });
      setSelectedScenario(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `scenarios/${selectedScenario.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteScenario = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'scenarios', id));
      if (selectedScenario?.id === id) setSelectedScenario(null);
      setConfirmDeleteId(null);
      setToast({ message: "Scenario deleted successfully", type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `scenarios/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Instructor Dashboard</h2>
          <p className="text-gray-500 mt-1">Design, manage, and playtest training scenarios.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm self-start">
          <button
            onClick={() => setActiveTab('list')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === 'list' ? "bg-gray-900 text-white shadow-md" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            All Scenarios
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === 'generate' ? "bg-gray-900 text-white shadow-md" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            Generate New
          </button>
          <button
            onClick={() => setActiveTab('playtest')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === 'playtest' ? "bg-gray-900 text-white shadow-md" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            Playtest Mode
          </button>
        </div>
      </div>

      {activeTab === 'playtest' ? (
        <div className="min-h-[80vh]">
          <StudentDashboard profile={profile} onLogout={() => setActiveTab('list')} onExit={() => setActiveTab('list')} />
        </div>
      ) : activeTab === 'generate' ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  Knowledge Base
                </h3>
                <button 
                  onClick={saveKB}
                  className="text-sm text-blue-600 font-medium hover:underline"
                >
                  Save Draft
                </button>
              </div>
              <textarea
                value={knowledgeBase}
                onChange={(e) => setKnowledgeBase(e.target.value)}
                placeholder="Paste your trainer design and delivery knowledge base here... (e.g. content from NotebookLM)"
                className="w-full h-96 p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 resize-none text-gray-700 leading-relaxed"
              />
            </div>
            <button
              onClick={generateScenario}
              disabled={isGenerating}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              {isGenerating ? "AI is crafting a scenario..." : "Generate AI Scenario"}
            </button>
          </div>
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                How it works
              </h4>
              <p className="text-sm text-blue-800 leading-relaxed">
                The AI uses your knowledge base to create realistic, context-aware training scenarios. 
                Each scenario includes a multiple-choice question, detailed explanation, and key concepts.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-blue-700">
                <li className="flex gap-2">• <span>Paste your theory or notes</span></li>
                <li className="flex gap-2">• <span>Click generate to create a draft</span></li>
                <li className="flex gap-2">• <span>Review and approve for students</span></li>
              </ul>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {scenarios.map((s) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                    s.status === 'approved' ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                  )}>
                    {s.status}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedScenario(s)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setConfirmDeleteId(s.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete Scenario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{s.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-3 mb-6 flex-grow">{s.content}</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                  <span className="text-xs text-gray-400">
                    {s.createdAt?.toDate().toLocaleDateString()}
                  </span>
                  {s.status === 'pending' && (
                    <button
                      onClick={() => approveScenario(s.id)}
                      className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {scenarios.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 font-medium">No scenarios found. Start by generating one!</p>
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3",
              toast.type === 'success' ? "bg-gray-900 text-white" : "bg-red-600 text-white"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDeleteId(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Scenario?</h3>
              <p className="text-gray-500 mb-8">This action cannot be undone. All student progress for this scenario will be lost.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteScenario(confirmDeleteId)}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scenario Detail Modal */}
      <AnimatePresence>
        {selectedScenario && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedScenario(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-xl font-bold text-gray-900">Scenario Details</h3>
                <button 
                  onClick={() => setSelectedScenario(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto space-y-8">
                <section className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Title & Content</h4>
                  <input 
                    type="text"
                    value={selectedScenario.title}
                    onChange={(e) => setSelectedScenario({...selectedScenario, title: e.target.value})}
                    className="w-full text-2xl font-bold text-gray-900 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 p-3"
                    placeholder="Scenario Title"
                  />
                  <textarea 
                    value={selectedScenario.content}
                    onChange={(e) => setSelectedScenario({...selectedScenario, content: e.target.value})}
                    className="w-full h-40 text-gray-600 leading-relaxed bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 p-4 resize-none"
                    placeholder="Scenario Content"
                  />
                </section>

                <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-6">
                  <h4 className="text-sm font-bold text-blue-600 uppercase tracking-widest">Question & Options Analysis</h4>
                  <input 
                    type="text"
                    value={selectedScenario.question}
                    onChange={(e) => setSelectedScenario({...selectedScenario, question: e.target.value})}
                    className="w-full font-bold text-gray-900 text-lg bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500 p-3"
                    placeholder="Question"
                  />
                  <div className="space-y-6">
                    {selectedScenario.options.map((opt, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "p-6 rounded-2xl border-2 transition-all space-y-4",
                          i === selectedScenario.correctAnswerIndex 
                            ? "border-green-500 bg-green-50/50" 
                            : "border-gray-200 bg-white"
                        )}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-grow flex items-center gap-3">
                            <input 
                              type="radio"
                              checked={i === selectedScenario.correctAnswerIndex}
                              onChange={() => setSelectedScenario({...selectedScenario, correctAnswerIndex: i})}
                              className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                            />
                            <input 
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOptions = [...selectedScenario.options];
                                newOptions[i] = e.target.value;
                                setSelectedScenario({...selectedScenario, options: newOptions});
                              }}
                              className="flex-grow font-bold text-gray-900 bg-transparent border-none focus:ring-0 p-0"
                              placeholder={`Option ${i + 1}`}
                            />
                          </div>
                          {i === selectedScenario.correctAnswerIndex && (
                            <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md uppercase">Correct Answer</span>
                          )}
                        </div>
                        
                        <div className="space-y-3 pt-4 border-t border-gray-100">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                              {i === selectedScenario.correctAnswerIndex ? "Why it's Correct" : "Why it's Incorrect"}
                            </label>
                            <textarea 
                              value={selectedScenario.optionExplanations?.[i] || ""}
                              onChange={(e) => {
                                const newExps = [...(selectedScenario.optionExplanations || [])];
                                newExps[i] = e.target.value;
                                setSelectedScenario({...selectedScenario, optionExplanations: newExps});
                              }}
                              className="w-full text-sm text-gray-600 italic bg-white/50 border-none rounded-lg focus:ring-1 focus:ring-blue-500 p-2 resize-none h-20"
                              placeholder="Explanation for this option..."
                            />
                          </div>
                          
                          {i !== selectedScenario.correctAnswerIndex && (
                            <div>
                              <label className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1 block">Potential Harm / Consequence</label>
                              <textarea 
                                value={selectedScenario.optionConsequences?.[i] || ""}
                                onChange={(e) => {
                                  const newCons = [...(selectedScenario.optionConsequences || [])];
                                  newCons[i] = e.target.value;
                                  setSelectedScenario({...selectedScenario, optionConsequences: newCons});
                                }}
                                className="w-full text-sm text-red-700 bg-red-50/50 border-none rounded-lg focus:ring-1 focus:ring-red-500 p-2 resize-none h-20"
                                placeholder="What happens if the student chooses this?"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Detailed Overall Explanation</h4>
                    <textarea 
                      value={selectedScenario.explanation}
                      onChange={(e) => setSelectedScenario({...selectedScenario, explanation: e.target.value})}
                      className="w-full h-32 text-gray-700 leading-relaxed bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 p-4 resize-none"
                      placeholder="Overall explanation..."
                    />
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">References (URLs)</h4>
                    <div className="space-y-2">
                      {selectedScenario.references?.map((ref, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input 
                            type="text"
                            value={ref}
                            onChange={(e) => {
                              const newRefs = [...selectedScenario.references];
                              newRefs[i] = e.target.value;
                              setSelectedScenario({...selectedScenario, references: newRefs});
                            }}
                            className="flex-grow text-xs text-blue-600 bg-white border-none rounded-lg focus:ring-1 focus:ring-blue-500 p-2"
                            placeholder="https://..."
                          />
                          <button 
                            onClick={() => {
                              const newRefs = selectedScenario.references.filter((_, idx) => idx !== i);
                              setSelectedScenario({...selectedScenario, references: newRefs});
                            }}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => setSelectedScenario({...selectedScenario, references: [...(selectedScenario.references || []), ""]})}
                        className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 mt-2"
                      >
                        <Plus className="w-3 h-3" /> Add Reference
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                      <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Core Concepts</h4>
                      <textarea 
                        value={selectedScenario.concepts}
                        onChange={(e) => setSelectedScenario({...selectedScenario, concepts: e.target.value})}
                        className="w-full h-24 text-sm text-gray-700 bg-transparent border-none focus:ring-0 p-0 resize-none"
                        placeholder="Core concepts..."
                      />
                    </div>
                    <div className="bg-green-50/50 p-5 rounded-2xl border border-green-100">
                      <h4 className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3">Application Methods</h4>
                      <textarea 
                        value={selectedScenario.applications}
                        onChange={(e) => setSelectedScenario({...selectedScenario, applications: e.target.value})}
                        className="w-full h-24 text-sm text-gray-700 bg-transparent border-none focus:ring-0 p-0 resize-none"
                        placeholder="Application methods..."
                      />
                    </div>
                  </div>
                </section>
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between gap-4">
                <button
                  onClick={() => setConfirmDeleteId(selectedScenario.id)}
                  className="px-6 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Scenario
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={saveScenarioChanges}
                    disabled={isSaving}
                    className="px-6 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
                  >
                    {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                  <button
                    onClick={saveAndApproveScenario}
                    disabled={isSaving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
                  >
                    {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {selectedScenario.status === 'approved' ? "Update & Keep Approved" : "Save & Approve"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Student Dashboard ---

function StudentDashboard({ profile, onLogout, onExit }: { profile: UserProfile, onLogout: () => void, onExit: () => void }) {
  const [activeQuiz, setActiveQuiz] = useState<QuizAttempt | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [inspectedOptionIndex, setInspectedOptionIndex] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyConcepts, setKeyConcepts] = useState<string | null>(null);
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const seedScenarios = async () => {
    if (profile?.role !== 'instructor') return;
    setIsStarting(true);
    try {
      const sampleScenarios: Partial<Scenario>[] = [
        {
          title: "The Over-Promised Delivery",
          content: "A major client is expecting a delivery by 5 PM today. Your logistics team informs you at 2 PM that the shipment is delayed by 24 hours due to a technical glitch. How do you handle the communication?",
          question: "What is the most effective first step in managing this crisis?",
          options: [
            "Wait until 4:45 PM to see if the glitch is fixed before calling.",
            "Call the client immediately, explain the situation transparently, and offer a solution.",
            "Email the client's junior assistant so the news filters up slowly.",
            "Blame the logistics team and tell the client it's out of your hands."
          ],
          correctAnswerIndex: 1,
          explanation: "Immediate, transparent communication builds trust even in failure. Offering a solution shows proactive management.",
          concepts: "Crisis Communication, Transparency, Client Relations",
          applications: "Logistics, Client Management, Project Delivery",
          status: 'approved',
          createdAt: Timestamp.now(),
          instructorId: profile.uid
        },
        {
          title: "The Ethical Dilemma",
          content: "You discover that a top-performing salesperson is using slightly misleading tactics to close deals. Their numbers are essential for the quarterly target.",
          question: "How should you address this situation?",
          options: [
            "Ignore it as long as the targets are met.",
            "Publicly shame the salesperson to set an example.",
            "Have a private coaching session to realign their tactics with company ethics.",
            "Encourage others to follow their lead to boost overall sales."
          ],
          correctAnswerIndex: 2,
          explanation: "Long-term success depends on ethical integrity. Coaching corrects the behavior without destroying morale.",
          concepts: "Business Ethics, Leadership, Sales Management",
          applications: "HR, Sales, Corporate Governance",
          status: 'approved',
          createdAt: Timestamp.now(),
          instructorId: profile.uid
        }
      ];

      for (const s of sampleScenarios) {
        await addDoc(collection(db, 'scenarios'), s);
      }
      alert("Sample scenarios seeded successfully!");
    } catch (err) {
      console.error("Seeding error:", err);
      setError("Failed to seed scenarios.");
    } finally {
      setIsStarting(false);
    }
  };

  const startQuiz = async () => {
    console.log("startQuiz function called");
    setIsStarting(true);
    setError(null);
    try {
      console.log("Querying scenarios...");
      let snapshot;
      const scenariosPath = 'scenarios';
      try {
        const qAll = query(collection(db, 'scenarios'), limit(100));
        const snapAll = await getDocs(qAll);
        console.log(`Total scenarios in DB: ${snapAll.docs.length}`);
        
        const q = query(collection(db, 'scenarios'), where('status', '==', 'approved'), limit(20));
        snapshot = await getDocs(q);
        console.log(`Found ${snapshot.docs.length} approved scenarios`);
      } catch (sErr: any) {
        console.error("Error fetching scenarios:", sErr);
        handleFirestoreError(sErr, OperationType.LIST, scenariosPath);
        throw new Error(`Failed to fetch scenarios: ${sErr.message}`);
      }

      const allScenarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scenario));
      
      // Pick 5 random
      const shuffled = allScenarios.sort(() => 0.5 - Math.random()).slice(0, 5);
      
      if (shuffled.length < 1) {
        console.warn("No approved scenarios found in database.");
        setError("No scenarios available yet. Please wait for the instructor to approve some.");
        return;
      }

      const newQuiz: Partial<QuizAttempt> = {
        studentId: profile.uid,
        scenarioIds: shuffled.map(s => s.id),
        answers: [],
        score: 0,
        completed: false,
        createdAt: Timestamp.now()
      };

      console.log("Quiz payload:", JSON.stringify(newQuiz, null, 2));
      console.log("Current profile:", JSON.stringify(profile, null, 2));
      
      console.log("Creating quiz document...");
      const quizzesPath = 'quizzes';
      try {
        const docRef = await addDoc(collection(db, 'quizzes'), newQuiz);
        console.log(`Quiz created with ID: ${docRef.id}`);
        setActiveQuiz({ id: docRef.id, ...newQuiz } as QuizAttempt);
        setScenarios(shuffled);
        setCurrentScenarioIndex(0);
        setSelectedOption(null);
        setShowFeedback(false);
        setAiHint(null);
      } catch (qErr: any) {
        console.error("Error creating quiz:", qErr);
        handleFirestoreError(qErr, OperationType.CREATE, quizzesPath);
        throw new Error(`Failed to create quiz: ${qErr.message}`);
      }
    } catch (err: any) {
      console.error("Error starting quiz:", err);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'quizzes');
      } catch (e: any) {
        // Extract a readable message from the JSON error if possible
        try {
          const parsed = JSON.parse(e.message);
          setError(`Permission denied: ${parsed.error || 'Check your access rights.'}`);
        } catch {
          setError("Failed to start quiz. Please check your connection or permissions.");
        }
      }
    } finally {
      setIsStarting(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectOption = (index: number) => {
    if (showFeedback) return;
    setSelectedOption(index);
  };

  const submitAnswer = async () => {
    if (selectedOption === null || isSubmitting) return;
    setIsSubmitting(true);
    
    const index = selectedOption;
    setInspectedOptionIndex(index);
    setShowFeedback(true);

    const currentScenario = scenarios[currentScenarioIndex];
    const isCorrect = index === currentScenario.correctAnswerIndex;

    const updatedAnswers = [...(activeQuiz?.answers || []), {
      scenarioId: currentScenario.id,
      selectedIndex: index,
      isCorrect
    }];

    const newScore = updatedAnswers.filter(a => a.isCorrect).length * 20;

    try {
      await updateDoc(doc(db, 'quizzes', activeQuiz!.id), {
        answers: updatedAnswers,
        score: newScore,
        completed: currentScenarioIndex === scenarios.length - 1
      });
      setActiveQuiz(prev => prev ? { ...prev, answers: updatedAnswers, score: newScore, completed: currentScenarioIndex === scenarios.length - 1 } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `quizzes/${activeQuiz!.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextQuestion = () => {
    if (currentScenarioIndex < scenarios.length - 1) {
      setCurrentScenarioIndex(prev => prev + 1);
      setSelectedOption(null);
      setInspectedOptionIndex(null);
      setShowFeedback(false);
      setAiHint(null);
    } else {
      // For the last question, clicking "Next" hides feedback to reveal the final summary
      setShowFeedback(false);
    }
  };

  const askAiTeacher = async () => {
    if (isAskingAi) return;
    setIsAskingAi(true);
    try {
      const currentScenario = scenarios[currentScenarioIndex];
      console.log("Asking AI Teacher for scenario:", currentScenario.id);
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `I am a student working on a training scenario. I need a hint or a suggestion on where to find information to answer this question. 
        Do NOT give me the answer directly. 

        Instead, please:
        1. Point out the key concepts to be applied in this scenario question.
        2. Directly provide website hyperlinks to let the students access for answer research by themselves. Use Google Search to find relevant and reliable resources.

        Scenario: ${currentScenario.content}
        Question: ${currentScenario.question}
        Options: ${currentScenario.options.join(', ')}`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      console.log("AI Teacher response received");
      setAiHint(response.text);
    } catch (err: any) {
      console.error("AI Teacher Error:", err);
      setAiHint(`Sorry, I couldn't connect to the AI teacher right now. (Error: ${err.message || 'Unknown error'})`);
    } finally {
      setIsAskingAi(false);
    }
  };

  const generateKeyConcepts = async () => {
    setIsGeneratingConcepts(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `I am a student who just finished a quiz with 5 scenarios about trainer design and delivery. 
        Please provide a concise list of key concepts and their definitions based on these scenarios.
        Format it as a clean, bulleted list with bold concepts.
        
        Scenarios:
        ${scenarios.map((s, i) => `Scenario ${i+1}: ${s.content}`).join('\n\n')}`,
      });
      setKeyConcepts(response.text);
    } catch (err) {
      console.error(err);
      setError("Failed to generate key concepts summary.");
    } finally {
      setIsGeneratingConcepts(false);
    }
  };

  const copyToClipboard = () => {
    if (keyConcepts) {
      navigator.clipboard.writeText(keyConcepts);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleBack = () => {
    if (activeQuiz?.completed && !showFeedback) {
      // From summary page back to last feedback
      setCurrentScenarioIndex(scenarios.length - 1);
      const lastAnswer = activeQuiz.answers.find(a => a.scenarioId === scenarios[scenarios.length - 1].id);
      if (lastAnswer) {
        setSelectedOption(lastAnswer.selectedIndex);
        setInspectedOptionIndex(lastAnswer.selectedIndex);
      }
      setShowFeedback(true);
      return;
    }

    if (showFeedback) {
      // From feedback back to question
      setShowFeedback(false);
    } else {
      // From question back to previous feedback
      if (currentScenarioIndex > 0) {
        const prevIndex = currentScenarioIndex - 1;
        setCurrentScenarioIndex(prevIndex);
        setShowFeedback(true);
        const prevAnswer = activeQuiz?.answers.find(a => a.scenarioId === scenarios[prevIndex].id);
        if (prevAnswer) {
          setSelectedOption(prevAnswer.selectedIndex);
          setInspectedOptionIndex(prevAnswer.selectedIndex);
        }
      } else {
        // From first question back to start screen
        setActiveQuiz(null);
      }
    }
  };

  if (!activeQuiz) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 rounded-3xl border border-gray-200 shadow-xl text-center relative"
        >
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Trophy className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Ready for your challenge?</h2>
          <p className="text-gray-600 mb-10 text-lg leading-relaxed">
            You'll face 5 random scenarios designed to test your trainer design and delivery skills. 
            Think carefully, use the AI teacher if needed, and aim for a perfect score!
          </p>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 font-bold text-sm mb-8">
              {error}
            </div>
          )}

          <button
            id="start-quiz-button"
            onClick={() => {
              console.log("Start Quiz button clicked");
              startQuiz();
            }}
            disabled={isStarting}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
          >
            {isStarting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Loading Scenarios...</span>
              </>
            ) : (
              <>
                <span>Start Masterclass Quiz</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  if (activeQuiz.completed && !showFeedback) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 py-12">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-bold text-gray-900">Final Results</h3>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Quiz Summary</p>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-3xl border border-gray-200 shadow-2xl text-center"
        >
          <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <Trophy className="w-12 h-12 text-yellow-500" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">Quiz Completed!</h2>
          <p className="text-gray-500 mb-8">Great job finishing the challenge.</p>
          
          <div className="text-7xl font-black text-blue-600 mb-4">
            {activeQuiz.score}<span className="text-2xl text-gray-400">/100</span>
          </div>
          <p className="text-lg font-medium text-gray-700 mb-10">
            You got {activeQuiz.answers.filter(a => a.isCorrect).length} out of {scenarios.length} questions correct.
          </p>
          
          <div className="space-y-4">
            {!keyConcepts ? (
              <button
                onClick={generateKeyConcepts}
                disabled={isGeneratingConcepts}
                className="w-full py-4 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isGeneratingConcepts ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                {isGeneratingConcepts ? "Generating Concepts..." : "Get Key Concepts Summary"}
              </button>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-left bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-500" />
                    Key Concepts & Definitions
                  </h4>
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {isCopied ? "Copied!" : "Copy List"}
                  </button>
                </div>
                <div className="markdown-body text-sm text-gray-700 leading-relaxed">
                  <Markdown>{keyConcepts}</Markdown>
                </div>
              </motion.div>
            )}
            
            <button
              onClick={onExit}
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Finish & Leave Website
            </button>

            <button
              onClick={() => {
                setActiveQuiz(null);
                setKeyConcepts(null);
              }}
              className="w-full py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Start
            </button>
            {profile?.role === 'instructor' && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-widest font-mono">Instructor Tools</p>
                <button
                  onClick={seedScenarios}
                  disabled={isStarting}
                  className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 group"
                >
                  <Database className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                  <span className="font-medium">Seed Sample Scenarios</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const currentScenario = scenarios[currentScenarioIndex];

  if (showFeedback) {
    const isCorrect = selectedOption === currentScenario.correctAnswerIndex;
    const currentInspectedIndex = inspectedOptionIndex !== null ? inspectedOptionIndex : selectedOption!;
    const isInspectedCorrect = currentInspectedIndex === currentScenario.correctAnswerIndex;

    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Scenario Review</h3>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Question {currentScenarioIndex + 1} Result</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="font-bold text-gray-900">{activeQuiz.score}</span>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-gray-200 shadow-xl"
        >
          <div className="flex flex-col items-center text-center mb-12">
            <div className={cn(
              "w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-lg",
              isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
            )}>
              {isCorrect ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>
            <h2 className={cn(
              "text-3xl font-black tracking-tight mb-2",
              isCorrect ? "text-green-600" : "text-red-600"
            )}>
              {isCorrect ? "Correct! +20 Points" : "Incorrect +0 Points"}
            </h2>
            <p className="text-gray-500 font-medium">
              Your choice: <span className="text-gray-900 font-bold">{currentScenario.options[selectedOption!]}</span>
            </p>
            <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 max-w-2xl">
              <p className="text-sm text-blue-700 font-medium leading-relaxed">
                💡 Instruction: Please click each option to understand the reasoning behind correct or incorrect choices, and click the AI Teacher's "Key Concept" to review relevant key concepts and websites.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Option Analysis</h4>
                <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-1 rounded-md">Click to inspect</span>
              </div>
              <div className="space-y-3">
                {currentScenario.options.map((opt, i) => (
                  <button 
                    key={i}
                    onClick={() => setInspectedOptionIndex(i)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border-2 transition-all",
                      i === currentInspectedIndex
                        ? (i === currentScenario.correctAnswerIndex ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50")
                        : (i === currentScenario.correctAnswerIndex ? "border-green-100 bg-green-50/20" : "border-gray-50 bg-gray-50/30 hover:border-gray-200")
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">{opt}</span>
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                        i === currentScenario.correctAnswerIndex ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                      )}>
                        {i === currentScenario.correctAnswerIndex ? "Correct" : "Incorrect"}
                      </span>
                    </div>
                    {i === selectedOption && (
                      <div className="text-[10px] font-bold text-gray-400 mt-1 italic">Your Selection</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className={cn(
                "p-6 rounded-3xl border transition-all",
                isInspectedCorrect ? "bg-green-50/50 border-green-100" : "bg-red-50/50 border-red-100"
              )}>
                <h4 className={cn(
                  "text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2",
                  isInspectedCorrect ? "text-green-600" : "text-red-600"
                )}>
                  <Lightbulb className="w-4 h-4" />
                  Expert Insight: {currentScenario.options[currentInspectedIndex]}
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <h5 className={cn(
                      "text-xs font-bold uppercase tracking-wider mb-1",
                      isInspectedCorrect ? "text-green-400" : "text-red-400"
                    )}>
                      {isInspectedCorrect ? "Why it's Correct" : "Why it's Incorrect"}
                    </h5>
                    <p className="text-gray-700 leading-relaxed">
                      {currentScenario.optionExplanations?.[currentInspectedIndex] || "No detailed explanation provided."}
                    </p>
                  </div>

                  {!isInspectedCorrect && currentScenario.optionConsequences?.[currentInspectedIndex] && (
                    <div className="bg-red-100/30 p-4 rounded-xl border border-red-100">
                      <h5 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Potential Harm / Consequence
                      </h5>
                      <p className="text-sm text-red-900 leading-relaxed">
                        {currentScenario.optionConsequences[currentInspectedIndex]}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100 space-y-4">
                    <div>
                      <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Core Concept</h5>
                      <p className="text-sm text-gray-900">{currentScenario.concepts}</p>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Practical Application</h5>
                      <p className="text-sm text-gray-900">{currentScenario.applications}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="my-10 border-gray-100" />

          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">AI Teacher</h4>
                <p className="text-xs text-gray-500">Click the 'Key Concept' to review the key concepts and reading materials</p>
              </div>
            </div>

            <button
              onClick={askAiTeacher}
              disabled={isAskingAi}
              className="w-full sm:w-auto px-8 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isAskingAi ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {isAskingAi ? "Thinking..." : "Key Concept"}
            </button>

            {aiHint && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 p-6 rounded-2xl text-sm text-blue-800 border border-blue-100"
              >
                <div className="markdown-body">
                  <Markdown>{aiHint}</Markdown>
                </div>
              </motion.div>
            )}
          </div>

          <button
            onClick={nextQuestion}
            className="w-full py-5 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 mt-12 shadow-xl hover:shadow-2xl"
          >
            {currentScenarioIndex === scenarios.length - 1 ? "Finish Quiz & View Results" : "Next Step"}
            <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  const hasAnsweredCurrent = activeQuiz?.answers.some(a => a.scenarioId === scenarios[currentScenarioIndex].id);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-bold text-gray-900">Training Challenge</h3>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Question {currentScenarioIndex + 1} of {scenarios.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="font-bold text-gray-900">{activeQuiz.score}</span>
        </div>
      </div>

      <div className="space-y-8">
        <motion.div 
          key={currentScenario.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm"
        >
          <h4 className="text-xl font-bold text-gray-900 mb-4">{currentScenario.title}</h4>
          <p className="text-gray-600 leading-relaxed mb-8 whitespace-pre-wrap">{currentScenario.content}</p>
          
          <div className="pt-6 border-t border-gray-50">
            <p className="font-bold text-gray-900 mb-6 text-lg">{currentScenario.question}</p>
            <div className="space-y-3">
              {currentScenario.options.map((option, idx) => {
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={cn(
                      "w-full p-4 rounded-xl text-left transition-all border-2 group",
                      selectedOption === idx 
                        ? "border-blue-500 bg-blue-50/50" 
                        : "border-gray-100 hover:border-blue-300 hover:bg-blue-50/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        selectedOption === idx ? "border-blue-500 bg-blue-500 text-white" : "border-gray-200"
                      )}>
                        {selectedOption === idx && <Check className="w-4 h-4" />}
                      </div>
                      <span className="font-medium">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex justify-end">
              {hasAnsweredCurrent ? (
                <button
                  onClick={() => setShowFeedback(true)}
                  className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <ChevronRight className="w-5 h-5" />
                  View Feedback
                </button>
              ) : (
                <button
                  onClick={submitAnswer}
                  disabled={selectedOption === null || isSubmitting}
                  className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  {isSubmitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Submit Answer
                </button>
              )}
            </div>
          </div>

          <hr className="my-10 border-gray-100" />

          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">AI Teacher</h4>
                <p className="text-xs text-gray-500">Stuck? Ask the AI Teacher for a hint or where to find more information.</p>
              </div>
            </div>
            
            {aiHint ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-blue-50 p-6 rounded-2xl text-sm text-blue-800 mb-6 border border-blue-100"
              >
                <div className="markdown-body">
                  <Markdown>{aiHint}</Markdown>
                </div>
              </motion.div>
            ) : null}

            <button
              onClick={askAiTeacher}
              disabled={isAskingAi || showFeedback}
              className="w-full sm:w-auto px-8 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isAskingAi ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
              {isAskingAi ? "Thinking..." : "Get a Hint"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
