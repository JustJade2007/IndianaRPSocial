import React, { useState, useEffect, useRef, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "./src/lib/supabase";
import { IS_LOCAL_TESTING } from "./local-testing";
import {
  Home,
  Hash,
  Mail,
  User,
  ShieldAlert,
  LogOut,
  PlusCircle,
  Image as ImageIcon,
  Send,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Repeat,
  CheckCircle,
  XCircle,
  Sparkles,
  Loader2,
  Users,
  Search
} from "lucide-react";

// --- Configuration & Types ---

const GENAI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: GENAI_API_KEY });

const IS_TEST_MODE = IS_LOCAL_TESTING || (import.meta as any).env.VITE_TEST_MODE === 'true' || !(import.meta as any).env.VITE_SUPABASE_URL;

// Data Types
interface User {
  id: string;
  handle: string;
  name: string;
  avatar: string;
  bio: string;
  isModerator: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  joinedAt: number;
  followers: string[]; // User IDs
  following: string[]; // User IDs
  roblox_username?: string;
  discord_username?: string;
}

interface Post {
  id: string;
  authorId: string;
  content: string;
  media?: string; // URL or Base64
  mediaType?: 'image' | 'video';
  hashtags: string[];
  likes: string[]; // User IDs
  timestamp: number;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  read: boolean;
}

// Initial Mock Data
const INITIAL_USERS: User[] = [
  {
    id: "u_admin",
    handle: "@moderator",
    name: "System Admin",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
    bio: "Keeping the platform safe. 🛡️",
    isModerator: true,
    status: 'APPROVED',
    joinedAt: Date.now(),
    followers: [],
    following: []
  },
  {
    id: "u_alice",
    handle: "@alice_w",
    name: "Alice Wonderland",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
    bio: "Digital artist & dreamer. ✨",
    isModerator: false,
    status: 'APPROVED',
    joinedAt: Date.now(),
    followers: [],
    following: []
  }
];

const INITIAL_POSTS: Post[] = [
  {
    id: "p_1",
    authorId: "u_admin",
    content: "Welcome to Mimic Social! This is a safe space for everyone. #welcome #community",
    hashtags: ["welcome", "community"],
    likes: [],
    timestamp: Date.now() - 100000
  },
  {
    id: "p_2",
    authorId: "u_alice",
    content: "Just finished a new sketch! What do you think?",
    hashtags: ["art", "sketch"],
    likes: [],
    timestamp: Date.now() - 50000
  }
];

// --- Utilities ---

const generateId = () => Math.random().toString(36).substring(2, 9);

const extractHashtags = (text: string) => {
  const matches = text.match(/#[a-z0-9_]+/gi);
  return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// --- Components ---

// 1. App Layout Wrapper
const Layout = ({ children, currentUser, onNavigate, currentView, onSwitchAccount, pendingCount }: any) => {
  if (!currentUser) return (
    <>
      {children}
      {IS_TEST_MODE && (
        <div className="fixed bottom-0 left-0 right-0 bg-orange-600 text-white text-center py-2 font-bold z-[100] text-sm uppercase tracking-wider">
          THIS IS A LOCAL TESTING BUILD, IF YOU ARE ONLINE AND CAN SEE THIS, LET THE REPO OWNER KNOW
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 pb-10">
      {IS_TEST_MODE && (
        <div className="fixed bottom-0 left-0 right-0 bg-orange-600 text-white text-center py-2 font-bold z-[100] text-sm uppercase tracking-wider">
          THIS IS A LOCAL TESTING BUILD, IF YOU ARE ONLINE AND CAN SEE THIS, LET THE REPO OWNER KNOW
        </div>
      )}
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 fixed h-screen border-r border-slate-800 flex flex-col justify-between p-4 bg-slate-950 z-50">
        <div className="space-y-6">
          <div className="flex items-center justify-center lg:justify-start gap-3 px-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
              <span className="font-bold text-white">M</span>
            </div>
            <span className="hidden lg:block text-xl font-bold">Mimic</span>
          </div>

          <nav className="space-y-2">
            <NavItem icon={Home} label="Home" active={currentView === 'home'} onClick={() => onNavigate('home')} />
            <NavItem icon={Hash} label="Explore" active={currentView === 'explore'} onClick={() => onNavigate('explore')} />
            <NavItem icon={Mail} label="Messages" active={currentView === 'messages'} onClick={() => onNavigate('messages')} />
            <NavItem icon={User} label="Profile" active={currentView === 'profile'} onClick={() => onNavigate('profile')} />
            {currentUser.isModerator && (
              <NavItem 
                icon={ShieldAlert} 
                label="Moderator" 
                active={currentView === 'moderator'} 
                onClick={() => onNavigate('moderator')} 
                badge={pendingCount > 0 ? pendingCount : undefined}
              />
            )}
          </nav>

          <button 
            onClick={() => onNavigate('compose')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3 lg:py-3 lg:px-4 font-bold shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle size={24} />
            <span className="hidden lg:inline">Post</span>
          </button>
        </div>

        <div className="relative group">
           <button className="flex items-center gap-3 w-full p-2 hover:bg-slate-900 rounded-full transition-colors" onClick={onSwitchAccount}>
              <img src={currentUser.avatar} alt="avatar" className="w-10 h-10 rounded-full bg-slate-800" />
              <div className="hidden lg:block text-left overflow-hidden">
                 <p className="font-bold truncate">{currentUser.name}</p>
                 <p className="text-slate-500 text-sm truncate">{currentUser.handle}</p>
              </div>
              <MoreHorizontal className="hidden lg:block ml-auto text-slate-500" />
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-20 lg:ml-64 flex-1 min-h-screen border-r border-slate-800 max-w-2xl">
        {children}
      </main>

      {/* Right Sidebar (Desktop) */}
      <aside className="hidden xl:block w-80 p-6 fixed right-0 h-screen overflow-y-auto">
        <div className="bg-slate-900 rounded-xl p-4 mb-6">
          <h2 className="font-bold text-lg mb-4">What's happening</h2>
          <div className="space-y-4">
             <div className="text-sm text-slate-400">Trending in Tech</div>
             <div className="font-bold">#GeminiAPI</div>
             <div className="text-sm text-slate-400">12.5K posts</div>
          </div>
          <div className="mt-4 space-y-4">
             <div className="text-sm text-slate-400">Trending Worldwide</div>
             <div className="font-bold">#MimicSocial</div>
             <div className="text-sm text-slate-400">5.2K posts</div>
          </div>
        </div>
      </aside>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-4 w-full p-3 rounded-full transition-all ${active ? 'font-bold bg-slate-900 text-indigo-400' : 'hover:bg-slate-900 text-slate-300'}`}
  >
    <div className="relative">
      <Icon size={26} />
      {badge && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">{badge}</span>}
    </div>
    <span className="hidden lg:inline text-lg">{label}</span>
  </button>
);

// 2. Auth & Registration Screen
const AuthScreen = ({ onLogin, onRegister }: any) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [regData, setRegData] = useState({ name: '', handle: '', bio: '', roblox: '', discord: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(loginData.identifier, loginData.password);
    setLoading(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onRegister(regData);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center">
            <span className="font-bold text-2xl text-white">M</span>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-8">
          {mode === 'login' ? 'Sign in to Mimic' : 'Create your account'}
        </h1>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Discord or Roblox Username</label>
              <input 
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={loginData.identifier}
                onChange={e => setLoginData({...loginData, identifier: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
              <input 
                type="password"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={loginData.password}
                onChange={e => setLoginData({...loginData, password: e.target.value})}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              Login
            </button>
            <div className="pt-4 border-t border-slate-800 text-center">
              <button type="button" onClick={() => setMode('register')} className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold">
                Don't have an account? Apply now
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Display Name</label>
                <input 
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={regData.name}
                  onChange={e => setRegData({...regData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Handle (@user)</label>
                <input 
                  required
                  pattern="^@[a-zA-Z0-9_]+$"
                  placeholder="@username"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={regData.handle}
                  onChange={e => setRegData({...regData, handle: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Roblox User</label>
                <input 
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={regData.roblox}
                  onChange={e => setRegData({...regData, roblox: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Discord User</label>
                <input 
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={regData.discord}
                  onChange={e => setRegData({...regData, discord: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Bio</label>
              <textarea 
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                value={regData.bio}
                onChange={e => setRegData({...regData, bio: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
              <input 
                type="password"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={regData.password}
                onChange={e => setRegData({...regData, password: e.target.value})}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              Submit Application
            </button>
            <button type="button" onClick={() => setMode('login')} className="w-full text-slate-400 hover:text-slate-300 text-sm mt-2">
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// 3. Post Feed & Creation
const Feed = ({ posts, users, currentUser, onLike, onPostCreated }: any) => {
  return (
    <div>
      <div className="sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-4 z-40">
        <h2 className="text-xl font-bold">Home</h2>
      </div>
      
      {/* Create Post Widget */}
      <div className="p-4 border-b border-slate-800">
         <CreatePostWidget currentUser={currentUser} onPostCreated={onPostCreated} />
      </div>

      {/* Posts List */}
      <div>
        {posts.map((post: Post) => {
          const author = users.find((u: User) => u.id === post.authorId);
          if (!author) return null;
          return <PostItem key={post.id} post={post} author={author} currentUser={currentUser} onLike={onLike} />;
        })}
      </div>
    </div>
  );
};

const CreatePostWidget = ({ currentUser, onPostCreated }: any) => {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        setMedia(base64);
        setMediaType(file.type.startsWith('video') ? 'video' : 'image');
      } catch (err) {
        console.error("File upload failed", err);
      }
    }
  };

  const handleMagicCompose = async () => {
    if (!content && !media) return;
    setIsGenerating(true);
    try {
      const prompt = `You are a social media assistant. Rewrite the following draft to be more engaging and add relevant hashtags. Keep it under 280 characters. Draft: "${content}"`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      if (response.text) {
        setContent(response.text.trim());
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate content.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = () => {
    if (!content.trim() && !media) return;
    onPostCreated({ content, media, mediaType });
    setContent("");
    setMedia(null);
    setMediaType(null);
  };

  return (
    <div className="flex gap-4">
      <img src={currentUser.avatar} className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <textarea
          placeholder="What is happening?!"
          className="w-full bg-transparent text-xl placeholder-slate-500 border-none focus:ring-0 resize-none p-2"
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {media && (
          <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-800">
            {mediaType === 'image' ? (
              <img src={media} className="w-full max-h-96 object-cover" />
            ) : (
              <video src={media} controls className="w-full max-h-96" />
            )}
            <button 
              onClick={() => { setMedia(null); setMediaType(null); }}
              className="absolute top-2 right-2 bg-black/70 p-1 rounded-full text-white hover:bg-black"
            >
              <XCircle size={20} />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
          <div className="flex gap-2 text-indigo-400">
             <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-indigo-500/10 rounded-full transition-colors">
               <ImageIcon size={20} />
             </button>
             <button 
                onClick={handleMagicCompose} 
                disabled={isGenerating}
                className={`p-2 hover:bg-indigo-500/10 rounded-full transition-colors flex items-center gap-1 ${isGenerating ? 'animate-pulse' : ''}`}
                title="AI Magic Compose"
             >
               <Sparkles size={20} />
               {isGenerating && <span className="text-xs font-bold">Thinking...</span>}
             </button>
             <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" onChange={handleFile} />
          </div>
          <button 
            onClick={handleSubmit}
            disabled={!content.trim() && !media}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-full transition-all"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
};

const PostItem = ({ post, author, currentUser, onLike }: any) => {
  const isLiked = post.likes.includes(currentUser.id);

  return (
    <div className="p-4 border-b border-slate-800 hover:bg-slate-900/40 transition-colors cursor-pointer">
      <div className="flex gap-3">
        <img src={author.avatar} className="w-10 h-10 rounded-full bg-slate-800" />
        <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2 mb-1">
             <span className="font-bold truncate">{author.name}</span>
             <span className="text-slate-500 text-sm truncate">{author.handle}</span>
             <span className="text-slate-500 text-sm">· {new Date(post.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
           </div>
           
           <p className="whitespace-pre-wrap text-slate-200 text-base mb-3 leading-relaxed">{post.content}</p>
           
           {post.media && (
             <div className="rounded-xl overflow-hidden border border-slate-800 mb-3">
               {post.mediaType === 'image' ? (
                 <img src={post.media} className="w-full object-cover max-h-[500px]" loading="lazy" />
               ) : (
                 <video src={post.media} controls className="w-full" />
               )}
             </div>
           )}

           <div className="flex justify-between text-slate-500 max-w-md mt-2">
             <button className="flex items-center gap-2 hover:text-indigo-400 group">
               <MessageCircle size={18} className="group-hover:bg-indigo-500/10 rounded-full p-0.5 box-content" />
               <span className="text-sm">0</span>
             </button>
             <button className="flex items-center gap-2 hover:text-green-400 group">
               <Repeat size={18} className="group-hover:bg-green-500/10 rounded-full p-0.5 box-content" />
               <span className="text-sm">0</span>
             </button>
             <button 
                onClick={() => onLike(post.id)}
                className={`flex items-center gap-2 group transition-colors ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}
             >
               <Heart fill={isLiked ? "currentColor" : "none"} size={18} className="group-hover:bg-pink-500/10 rounded-full p-0.5 box-content" />
               <span className="text-sm">{post.likes.length}</span>
             </button>
             <button className="flex items-center gap-2 hover:text-indigo-400 group">
               <Send size={18} className="group-hover:bg-indigo-500/10 rounded-full p-0.5 box-content" />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

// 4. Moderator Dashboard
const ModeratorDashboard = ({ users, onReview }: any) => {
  const pendingUsers = users.filter((u: User) => u.status === 'PENDING');

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <ShieldAlert className="text-indigo-500" />
        Pending Requests
      </h2>
      
      {pendingUsers.length === 0 ? (
        <div className="text-center text-slate-500 mt-20">
          <CheckCircle size={48} className="mx-auto mb-4 opacity-50" />
          <p>All caught up! No pending requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingUsers.map((u: User) => (
             <PendingRequestItem key={u.id} user={u} onReview={onReview} />
          ))}
        </div>
      )}
    </div>
  );
};

const PendingRequestItem = ({ user, onReview }: any) => {
  const [safetyAnalysis, setSafetyAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const analyzeUser = async () => {
    setAnalyzing(true);
    try {
      const prompt = `Analyze this user application for a social media site.
      Handle: ${user.handle}
      Name: ${user.name}
      Bio: ${user.bio}
      
      Provide a brief 1-sentence risk assessment. Is this user likely safe, suspicious, or unsafe?`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setSafetyAnalysis(response.text?.trim() || "Could not analyze.");
    } catch (e) {
      setSafetyAnalysis("AI Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold">
           {user.name[0]}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
             <div>
               <h3 className="font-bold text-lg">{user.name}</h3>
               <p className="text-indigo-400">{user.handle}</p>
             </div>
             <div className="flex gap-2">
               <button onClick={() => onReview(user.id, 'APPROVED')} className="p-2 bg-green-600/20 text-green-400 rounded-full hover:bg-green-600/30 transition-colors">
                 <CheckCircle size={20} />
               </button>
               <button onClick={() => onReview(user.id, 'REJECTED')} className="p-2 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/30 transition-colors">
                 <XCircle size={20} />
               </button>
             </div>
          </div>
          
          <div className="mt-3 p-3 bg-slate-950 rounded-lg text-slate-300 text-sm">
            {user.bio}
          </div>

          <div className="mt-4 border-t border-slate-800 pt-3">
             {safetyAnalysis ? (
               <div className="flex gap-2 items-start text-sm">
                 <Sparkles size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                 <p className="text-indigo-200 italic">{safetyAnalysis}</p>
               </div>
             ) : (
               <button 
                 onClick={analyzeUser} 
                 disabled={analyzing}
                 className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
               >
                 {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                 RUN AI SAFETY CHECK
               </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. Explore / Trending
const Explore = ({ posts }: any) => {
  const trends = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((p: Post) => {
      p.hashtags.forEach(h => {
        counts[h] = (counts[h] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 10);
  }, [posts]);

  return (
    <div>
      <div className="sticky top-0 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-4 z-40">
        <h2 className="text-xl font-bold">Explore</h2>
      </div>
      <div className="p-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search Mimic" 
            className="w-full bg-slate-900 border border-transparent focus:border-indigo-500 rounded-full py-2.5 pl-10 pr-4 text-white outline-none"
          />
        </div>
        
        <h3 className="font-bold text-lg mb-4 text-slate-200">Trending Hashtags</h3>
        <div className="grid gap-4">
          {trends.map(([tag, count], i) => (
            <div key={tag} className="flex justify-between items-center p-4 bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
              <div>
                <div className="text-sm text-slate-500">{i+1} · Trending</div>
                <div className="font-bold text-lg">#{tag}</div>
                <div className="text-xs text-slate-400">{count} posts</div>
              </div>
              <MoreHorizontal size={18} className="text-slate-500" />
            </div>
          ))}
          {trends.length === 0 && <p className="text-slate-500">No trends yet.</p>}
        </div>
      </div>
    </div>
  );
};

// 6. Messaging
const Messages = ({ users, currentUser }: any) => {
    // A simplified view for messaging
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    // In a real app, we'd filter messages by thread. Here we just mock the UI.
    
    const contacts = users.filter((u: User) => u.id !== currentUser.id && u.status === 'APPROVED');

    return (
        <div className="flex h-[calc(100vh-60px)]">
            <div className={`w-full md:w-1/3 border-r border-slate-800 ${selectedUser ? 'hidden md:block' : 'block'}`}>
                <div className="p-4 border-b border-slate-800 font-bold text-xl">Messages</div>
                <div className="overflow-y-auto h-full">
                    {contacts.map((u: User) => (
                        <div key={u.id} onClick={() => setSelectedUser(u.id)} className="flex items-center gap-3 p-4 hover:bg-slate-900 cursor-pointer border-b border-slate-900">
                             <img src={u.avatar} className="w-12 h-12 rounded-full" />
                             <div>
                                 <div className="font-bold">{u.name}</div>
                                 <div className="text-slate-500 text-sm">Click to chat</div>
                             </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className={`flex-1 flex flex-col ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
                {selectedUser ? (
                    <>
                        <div className="p-3 border-b border-slate-800 flex items-center gap-3 bg-slate-900/50">
                            <button className="md:hidden" onClick={() => setSelectedUser(null)}><XCircle /></button>
                            <span className="font-bold">Chat</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center text-slate-500">
                            <p>Messaging simulation (Not fully implemented in this demo)</p>
                        </div>
                        <div className="p-3 border-t border-slate-800">
                            <input placeholder="Type a message..." className="w-full bg-slate-900 p-3 rounded-full outline-none" />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                        <h2 className="text-2xl font-bold mb-2">Select a message</h2>
                        <p>Choose from your existing conversations, start a new one, or just keep swiping.</p>
                        <button className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded-full font-bold">New Message</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Application ---

const App = () => {
  // Global State
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => localStorage.getItem("mimic_user_id"));
  const [view, setView] = useState('home'); // home, explore, messages, profile, moderator, compose
  const [loading, setLoading] = useState(true);

  const currentUser = users.find(u => u.id === currentUserId);

  // Data Loading
  const fetchData = async () => {
    try {
      const [profilesRes, postsRes, likesRes, followsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('posts').select('*').order('created_at', { ascending: false }),
        supabase.from('likes').select('*'),
        supabase.from('follows').select('*')
      ]);

      if (profilesRes.data) {
        const mappedUsers: User[] = profilesRes.data.map((p: any) => ({
          id: p.id,
          handle: p.handle,
          name: p.display_name,
          avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.handle}`,
          bio: p.bio,
          isModerator: p.is_moderator,
          status: p.status,
          joinedAt: new Date(p.joined_at).getTime(),
          roblox_username: p.roblox_username,
          discord_username: p.discord_username,
          followers: followsRes.data?.filter(f => f.following_id === p.id).map(f => f.follower_id) || [],
          following: followsRes.data?.filter(f => f.follower_id === p.id).map(f => f.following_id) || []
        }));
        setUsers(mappedUsers);
      }

      if (postsRes.data) {
        const mappedPosts: Post[] = postsRes.data.map((p: any) => ({
          id: p.id,
          authorId: p.author_id,
          content: p.content,
          media: p.media_url,
          mediaType: p.media_type,
          hashtags: p.hashtags || [],
          timestamp: new Date(p.created_at).getTime(),
          likes: likesRes.data?.filter(l => l.post_id === p.id).map(l => l.user_id) || []
        }));
        setPosts(mappedPosts);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Actions
  const handleRegister = async (data: any) => {
    const { data: profile, error } = await supabase.from('profiles').insert({
      display_name: data.name,
      handle: data.handle,
      bio: data.bio,
      roblox_username: data.roblox,
      discord_username: data.discord,
      password: data.password,
      status: 'PENDING'
    }).select().single();

    if (error) {
      alert("Error: " + error.message);
      return;
    }

    fetchData();
    alert("Application submitted! Please wait for a moderator to approve your account.");
  };

  const handleLogin = async (identifier: string, password: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`roblox_username.eq."${identifier}",discord_username.eq."${identifier}"`)
      .eq('password', password)
      .single();

    if (error || !data) {
      alert("Invalid credentials.");
      return;
    }

    if (data.status !== 'APPROVED') {
      alert("Your account is " + data.status.toLowerCase() + ".");
      return;
    }

    setCurrentUserId(data.id);
    localStorage.setItem("mimic_user_id", data.id);
    setView('home');
  };

  const handlePostCreate = async (data: { content: string, media?: string, mediaType?: 'image' | 'video' }) => {
    if (!currentUser) return;
    
    const { data: post, error } = await supabase.from('posts').insert({
      author_id: currentUser.id,
      content: data.content,
      media_url: data.media,
      media_type: data.mediaType,
      hashtags: extractHashtags(data.content)
    }).select().single();

    if (error) {
      alert("Post failed: " + error.message);
      return;
    }
    
    fetchData();
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.likes.includes(currentUser.id);

    if (isLiked) {
      await supabase.from('likes').delete().match({ post_id: postId, user_id: currentUser.id });
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: currentUser.id });
    }
    
    fetchData();
  };

  const handleModeration = async (userId: string, action: 'APPROVED' | 'REJECTED') => {
    const { error } = await supabase.from('profiles').update({ status: action }).eq('id', userId);
    if (error) {
      alert("Moderation failed: " + error.message);
    }
    fetchData();
  };

  const pendingCount = users.filter(u => u.status === 'PENDING').length;

  // Render Logic
  if (!currentUser) {
    return <AuthScreen users={users} onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <Layout 
      currentUser={currentUser} 
      currentView={view} 
      onNavigate={setView}
      onSwitchAccount={() => setCurrentUserId(null)}
      pendingCount={pendingCount}
    >
      {view === 'home' && (
        <Feed 
          posts={posts} 
          users={users} 
          currentUser={currentUser} 
          onLike={handleLike} 
          onPostCreated={handlePostCreate} 
        />
      )}
      {view === 'explore' && <Explore posts={posts} />}
      {view === 'messages' && <Messages users={users} currentUser={currentUser} />}
      {view === 'moderator' && currentUser.isModerator && (
        <ModeratorDashboard users={users} onReview={handleModeration} />
      )}
      {view === 'profile' && (
        <div className="p-4 text-center">
            <img src={currentUser.avatar} className="w-32 h-32 rounded-full mx-auto mb-4 bg-slate-800" />
            <h1 className="text-2xl font-bold">{currentUser.name}</h1>
            <p className="text-slate-500">{currentUser.handle}</p>
            <p className="mt-4">{currentUser.bio}</p>
            <div className="flex justify-center gap-6 mt-6 border-t border-slate-800 pt-4">
                <div className="text-center"><span className="font-bold block text-xl">{currentUser.following.length}</span> <span className="text-slate-500 text-sm">Following</span></div>
                <div className="text-center"><span className="font-bold block text-xl">{currentUser.followers.length}</span> <span className="text-slate-500 text-sm">Followers</span></div>
            </div>
            <div className="mt-8 border-t border-slate-800">
                <h3 className="font-bold text-lg py-4 text-left">Your Posts</h3>
                {posts.filter(p => p.authorId === currentUser.id).map(p => (
                    <div key={p.id} className="text-left"><PostItem post={p} author={currentUser} currentUser={currentUser} onLike={handleLike} /></div>
                ))}
            </div>
        </div>
      )}
      {view === 'compose' && (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Create Post</h2>
            <CreatePostWidget currentUser={currentUser} onPostCreated={(d: any) => { handlePostCreate(d); setView('home'); }} />
        </div>
      )}
    </Layout>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
