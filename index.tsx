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
  Search,
  Share2,
  History,
  Settings,
  Moon,
  Sun,
  Type,
  Ban,
  LifeBuoy,
  Edit2,
  Save,
  Trash2,
  Lock,
  Unlock
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
  accountType: 'USER' | 'CHARACTER';
  parentUserId?: string;
  maxCharacters?: number;
  bannedUntil?: number;
  joinedAt: number;
  followers: string[]; // User IDs
  following: string[]; // User IDs
  roblox_username?: string;
  discord_username?: string;
  pronouns?: string;
  customFields?: { label: string; value: string }[];
  themePreference?: 'light' | 'dark';
  fontSizePreference?: 'small' | 'medium' | 'large';
  blockedUsers?: string[]; // User IDs
}

interface Post {
  id: string;
  authorId: string;
  content: string;
  media?: string; // URL or Base64
  mediaType?: 'image' | 'video';
  hashtags: string[];
  likes: string[]; // User IDs
  commentsCount: number;
  timestamp: number;
}

interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  timestamp: number;
  likes: string[]; // User IDs
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  read: boolean;
}

interface Maintenance {
  id: string;
  isActive: boolean;
  message: string;
  scheduledRestart?: number;
}

interface BannedWord {
  id: string;
  word: string;
  userId?: string;
}

interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  reportedPostId?: string;
  reason: string;
  status: 'PENDING' | 'REVIEWED' | 'ACTIONED';
  createdAt: number;
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
    accountType: 'USER',
    maxCharacters: 5,
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
    accountType: 'USER',
    maxCharacters: 5,
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
    commentsCount: 0,
    timestamp: Date.now() - 100000
  },
  {
    id: "p_2",
    authorId: "u_alice",
    content: "Just finished a new sketch! What do you think?",
    hashtags: ["art", "sketch"],
    likes: [],
    commentsCount: 0,
    timestamp: Date.now() - 50000
  }
];

// --- Utilities ---

const generateId = () => Math.random().toString(36).substring(2, 9);

const extractHashtags = (text: string) => {
  const matches = text.match(/#[a-z0-9_]+/gi);
  return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
};

const formatHandle = (handle: string) => {
  if (!handle) return "";
  return handle.startsWith("@") ? handle : `@${handle}`;
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
const Layout = ({ children, currentUser, onNavigate, currentView, onSwitchAccount, pendingCount, posts = [], maintenance }: any) => {
  const isDark = currentUser?.themePreference === 'dark' || !currentUser?.themePreference;

  const trends = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((p: Post) => {
      p.hashtags?.forEach(h => {
        counts[h] = (counts[h] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [posts]);

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
    <div className={`flex min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'} pb-10 transition-colors duration-200`}>
      {maintenance?.isActive && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-[101] flex flex-col items-center justify-center animate-pulse">
           <div className="flex items-center gap-2 font-bold">
             <ShieldAlert size={20} />
             <span>SYSTEM MAINTENANCE: {maintenance.message}</span>
           </div>
           {maintenance.scheduledRestart && (
             <div className="text-xs mt-1">
               Imminent restart scheduled for {new Date(maintenance.scheduledRestart).toLocaleTimeString()}
             </div>
           )}
        </div>
      )}
      {IS_TEST_MODE && (
        <div className="fixed bottom-0 left-0 right-0 bg-orange-600 text-white text-center py-2 font-bold z-[100] text-sm uppercase tracking-wider">
          THIS IS A LOCAL TESTING BUILD, IF YOU ARE ONLINE AND CAN SEE THIS, LET THE REPO OWNER KNOW
        </div>
      )}
      {/* Sidebar */}
      <aside className={`w-20 lg:w-64 fixed h-screen border-r ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'} flex flex-col justify-between p-4 z-50`}>
        <div className="space-y-6">
          <div className="flex items-center justify-center lg:justify-start gap-3 px-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
              <span className="font-bold text-white">M</span>
            </div>
            <span className="hidden lg:block text-xl font-bold">Mimic</span>
          </div>

          <nav className="space-y-2">
            <NavItem icon={Home} label="Home" active={currentView === 'home'} onClick={() => onNavigate('home')} currentUser={currentUser} />
            <NavItem icon={Hash} label="Explore" active={currentView === 'explore'} onClick={() => onNavigate('explore')} currentUser={currentUser} />
            <NavItem icon={Mail} label="Messages" active={currentView === 'messages'} onClick={() => onNavigate('messages')} currentUser={currentUser} />
            <NavItem icon={User} label="Profile" active={currentView === 'profile'} onClick={() => onNavigate('profile')} currentUser={currentUser} />
            <NavItem icon={Settings} label="Settings" active={currentView === 'settings'} onClick={() => onNavigate('settings')} currentUser={currentUser} />
            <NavItem icon={History} label="Changelog" active={currentView === 'changelog'} onClick={() => onNavigate('changelog')} currentUser={currentUser} />
            {currentUser.isModerator && (
              <NavItem 
                icon={ShieldAlert} 
                label="Moderator" 
                active={currentView === 'moderator'} 
                onClick={() => onNavigate('moderator')} 
                badge={pendingCount > 0 ? pendingCount : undefined}
                currentUser={currentUser}
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
           <button className={`flex items-center gap-3 w-full p-2 ${isDark ? 'hover:bg-slate-900' : 'hover:bg-slate-100'} rounded-full transition-colors`} onClick={onSwitchAccount}>
              <img src={currentUser.avatar} alt="avatar" className={`w-10 h-10 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
              <div className="hidden lg:block text-left overflow-hidden">
                 <p className="font-bold truncate">{currentUser.name}</p>
                 <p className="text-slate-500 text-sm truncate">{formatHandle(currentUser.handle)}</p>
              </div>
              <MoreHorizontal className="hidden lg:block ml-auto text-slate-500" />
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`ml-20 lg:ml-64 flex-1 min-h-screen border-r ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'} max-w-2xl`}>
        {children}
      </main>

      {/* Right Sidebar (Desktop) */}
      <aside className={`hidden xl:block w-80 p-6 fixed right-0 h-screen overflow-y-auto ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
        <div className={`rounded-xl p-4 mb-6 border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
          <h2 className="font-bold text-lg mb-4">What's happening</h2>
          <div className="space-y-4">
             {trends.map(([tag, count]) => (
               <div key={tag} className="cursor-pointer hover:bg-slate-800/50 p-2 rounded-lg transition-colors" onClick={() => onNavigate('explore')}>
                 <div className="text-sm text-slate-400">Trending</div>
                 <div className="font-bold">#{tag}</div>
                 <div className="text-sm text-slate-400">{count} {count === 1 ? 'post' : 'posts'}</div>
               </div>
             ))}
             {trends.length === 0 && <p className="text-slate-500 text-sm">No trends yet.</p>}
          </div>
        </div>
      </aside>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active, onClick, badge, currentUser }: any) => {
  const isDark = currentUser?.themePreference === 'dark' || !currentUser?.themePreference;
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 w-full p-3 rounded-full transition-all ${
        active 
          ? 'font-bold bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400' 
          : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300'
      }`}
    >
      <div className="relative">
        <Icon size={26} />
        {badge && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">{badge}</span>}
      </div>
      <span className="hidden lg:inline text-lg">{label}</span>
    </button>
  );
};

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

      <div className="mb-6 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
        <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Rules & Disclaimers</h2>
        <div className="text-xs text-slate-400 h-32 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
          <p>1. Respect all users. Harassment, hate speech, and bullying are strictly prohibited.</p>
          <p>2. This is a Roleplay (RP) focused platform. Stay in character when using Character accounts.</p>
          <p>3. Do not share personal information (doxing) of yourself or others.</p>
          <p>4. No NSFW content. Keep it appropriate for the community.</p>
          <p>5. System abuse or exploitation will lead to a permanent ban.</p>
          <p className="font-bold text-slate-300 italic">By submitting an application, you agree to these rules and acknowledge that your account is subject to moderator approval.</p>
        </div>
        <label className="flex items-center gap-3 cursor-pointer group">
          <input 
            type="checkbox" 
            required 
            className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-slate-300 group-hover:text-white transition-colors">I accept the rules and disclaimers</span>
        </label>
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
              placeholder="@username"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={regData.handle}
              onChange={e => {
                let val = e.target.value;
                if (val && !val.startsWith("@")) val = "@" + val;
                setRegData({...regData, handle: val});
              }}
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
const Feed = ({ posts, users, currentUser, onLike, onPostCreated, onCommentClick, onBlockUser, onReport }: any) => {
  const isDark = currentUser?.themePreference === 'dark' || !currentUser?.themePreference;
  return (
    <div>
      <div className={`sticky top-0 backdrop-blur-md border-b ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'} p-4 z-40`}>
        <h2 className="text-xl font-bold">Home</h2>
      </div>
      
      {/* Create Post Widget */}
      <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
         <CreatePostWidget currentUser={currentUser} onPostCreated={onPostCreated} />
      </div>

      {/* Posts List */}
      <div>
        {posts
          .filter((p: Post) => !currentUser.blockedUsers?.includes(p.authorId))
          .map((post: Post) => {
            const author = users.find((u: User) => u.id === post.authorId);
            if (!author) return null;
            return (
              <PostItem 
                key={post.id} 
                post={post} 
                author={author} 
                currentUser={currentUser} 
                onLike={onLike} 
                onCommentClick={onCommentClick} 
                onBlockUser={() => onBlockUser(post.authorId)}
                onReport={onReport}
              />
            );
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

  const handleSubmit = () => {
    if (!content.trim() && !media) return;
    onPostCreated({ content, media, mediaType });
    setContent("");
    setMedia(null);
    setMediaType(null);
  };

  return (
    <div className="flex gap-4">
      <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800" />
      <div className="flex-1">
        <textarea
          placeholder="What is happening?!"
          className="w-full bg-transparent text-xl placeholder-slate-500 border-none focus:ring-0 resize-none p-2 text-slate-900 dark:text-slate-100"
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {media && (
          <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
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
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex gap-2 text-indigo-600 dark:text-indigo-400">
             <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-indigo-500/10 rounded-full transition-colors">
               <ImageIcon size={20} />
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

const PostItem = ({ post, author, currentUser, onLike, onCommentClick, onBlockUser, onReport }: any) => {
  const isLiked = post.likes.includes(currentUser.id);
  const isDark = currentUser?.themePreference === 'dark' || !currentUser?.themePreference;
  const [showOptions, setShowOptions] = useState(false);

  const handleCommentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCommentClick(post.id);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike(post.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = window.location.origin + "?post=" + post.id;
    if (navigator.share) {
      navigator.share({
        title: 'Mimic Social Post',
        text: post.content,
        url: url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert("Link copied to clipboard!");
      });
    }
  };

  return (
    <div className={`p-4 border-b ${isDark ? 'border-slate-800 hover:bg-slate-900/40' : 'border-slate-200 hover:bg-slate-50'} transition-colors cursor-pointer`}>
      <div className="flex gap-3">
        <img src={author.avatar} className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800" />
        <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2 mb-1">
             <span className="font-bold truncate text-slate-900 dark:text-slate-100">{author.name}</span>
             <span className="text-slate-500 text-sm truncate">{formatHandle(author.handle)}</span>
             <span className="text-slate-500 text-sm">· {new Date(post.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
           </div>
           
           <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-200 text-base mb-3 leading-relaxed">{post.content}</p>
           
           {post.media && (
             <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 mb-3">
               {post.mediaType === 'image' ? (
                 <img src={post.media} className="w-full object-cover max-h-[500px]" loading="lazy" />
               ) : (
                 <video src={post.media} controls className="w-full" />
               )}
             </div>
           )}

           <div className="flex justify-between text-slate-500 max-w-md mt-2">
             <div 
               onClick={handleCommentClick}
               className="flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 group cursor-pointer"
             >
               <MessageCircle size={18} className="group-hover:bg-indigo-500/10 rounded-full p-0.5 box-content" />
               <span className="text-sm">{post.commentsCount || 0}</span>
             </div>
             <button 
                onClick={handleLikeClick}
                className={`flex items-center gap-2 group transition-colors ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}
             >
               <Heart fill={isLiked ? "currentColor" : "none"} size={18} className="group-hover:bg-pink-500/10 rounded-full p-0.5 box-content" />
               <span className="text-sm">{post.likes.length}</span>
             </button>
             <div className="relative">
               <button onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }} className="flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 group">
                 <MoreHorizontal size={18} className="group-hover:bg-indigo-500/10 rounded-full p-0.5 box-content" />
               </button>
               {showOptions && (
                 <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                   <button onClick={handleShare} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors text-slate-700 dark:text-slate-300">
                     <Share2 size={16} /> Share Post
                   </button>
                   {currentUser.id !== author.id && (
                     <button 
                       onClick={(e) => { e.stopPropagation(); onBlockUser(); setShowOptions(false); }} 
                       className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-800"
                     >
                       <Ban size={16} /> Block {formatHandle(author.handle)}
                     </button>
                   )}
                   {currentUser.id !== author.id && (
                     <button 
                       onClick={(e) => { e.stopPropagation(); onReport('POST', post.id); setShowOptions(false); }} 
                       className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-800"
                     >
                       <ShieldAlert size={16} /> Report Post
                     </button>
                   )}
                 </div>
               )}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

// 4. Moderator Dashboard
const ModeratorDashboard = ({ users, onReview, maintenance, onUpdateMaintenance, bannedWords, onAddBannedWord, onRemoveBannedWord, reports, onReviewReport }: any) => {
  const pendingUsers = users.filter((u: User) => u.status === 'PENDING');
  const characterUsers = users.filter((u: User) => u.accountType === 'CHARACTER');
  const [maintMsg, setMaintMsg] = useState(maintenance?.message || "");
  const [restartIn, setRestartIn] = useState("");
  const [newWord, setNewWord] = useState("");
  const [activeTab, setActiveTab] = useState('pending');

  const handleMaintUpdate = (active: boolean) => {
    let restartTime = undefined;
    if (restartIn) {
      restartTime = Date.now() + (parseInt(restartIn) * 60000);
    }
    onUpdateMaintenance({ isActive: active, message: maintMsg, scheduledRestart: restartTime });
  };

  return (
    <div className="p-4 space-y-10">
      <div className="flex border-b border-slate-800 mb-6 overflow-x-auto whitespace-nowrap">
        {['pending', 'characters', 'maintenance', 'banned-words', 'reports'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 capitalize font-bold transition-colors ${activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {activeTab === 'pending' && (
      <section>
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <ShieldAlert className="text-indigo-500" />
          Pending Requests
        </h2>
        
        {pendingUsers.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
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
      </section>
      )}

      {activeTab === 'characters' && (
      <section>
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Users className="text-indigo-500" />
          Character Account Tracking
        </h2>
        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead className="bg-slate-800/50 text-slate-400 text-sm uppercase">
              <tr>
                <th className="p-4">Character</th>
                <th className="p-4">Owner (User Account)</th>
                <th className="p-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {characterUsers.map((u: User) => {
                const parent = users.find((p: User) => p.id === u.parentUserId);
                return (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar} className="w-8 h-8 rounded-full" />
                        <div>
                          <p className="font-bold">{u.name}</p>
                          <p className="text-slate-500 text-xs">{formatHandle(u.handle)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {parent ? (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-indigo-400">{parent.name}</span>
                          <span className="text-slate-500 text-xs">{formatHandle(parent.handle)}</span>
                        </div>
                      ) : (
                        <span className="text-red-400 text-xs italic">Unknown Owner</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 text-sm">
                      {new Date(u.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
              {characterUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-10 text-center text-slate-500 italic">
                    No character accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {activeTab === 'maintenance' && (
        <section className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="text-orange-500" />
            Maintenance Settings
          </h2>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-400">Maintenance Message</label>
            <input 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 outline-none"
              value={maintMsg}
              onChange={e => setMaintMsg(e.target.value)}
              placeholder="e.g. Warning: Detected push/pull request. Imminent restart."
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-400">Restart In (Minutes - Optional)</label>
            <input 
              type="number"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 outline-none"
              value={restartIn}
              onChange={e => setRestartIn(e.target.value)}
              placeholder="5"
            />
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => handleMaintUpdate(true)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg"
            >
              Activate
            </button>
            <button 
              onClick={() => handleMaintUpdate(false)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg"
            >
              Deactivate
            </button>
          </div>
        </section>
      )}

      {activeTab === 'banned-words' && (
        <section className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Ban className="text-red-500" />
            Banned Words (Global)
          </h2>
          <div className="flex gap-2">
            <input 
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 outline-none"
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              placeholder="Add word..."
            />
            <button 
              onClick={() => { if(newWord) { onAddBannedWord(newWord); setNewWord(""); } }}
              className="bg-indigo-600 hover:bg-indigo-700 px-6 font-bold rounded-lg"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2 pt-4">
            {bannedWords.map((bw: BannedWord) => (
              <span key={bw.id} className="bg-slate-800 text-slate-200 px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-700">
                {bw.word}
                <button onClick={() => onRemoveBannedWord(bw.id)} className="hover:text-red-500"><XCircle size={14} /></button>
              </span>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'reports' && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="text-indigo-500" />
            User Reports
          </h2>
          {reports.length === 0 ? (
            <p className="text-slate-500 py-10 text-center bg-slate-900 rounded-xl border border-dashed border-slate-800">No reports found.</p>
          ) : (
            reports.map((report: Report) => {
              const reporter = users.find((u: User) => u.id === report.reporterId);
              const reportedUser = users.find((u: User) => u.id === report.reportedUserId);
              return (
                <div key={report.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-slate-500 uppercase font-bold">From: {reporter?.name}</span>
                      <h3 className="font-bold">Report on: {reportedUser?.name}</h3>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => onReviewReport(report.id, 'ACTIONED')}
                        className="bg-red-600/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold hover:bg-red-600/30"
                       >
                         Take Action
                       </button>
                       <button 
                        onClick={() => onReviewReport(report.id, 'REVIEWED')}
                        className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold hover:bg-slate-700"
                       >
                         Dismiss
                       </button>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg text-slate-300 text-sm">
                    {report.reason}
                  </div>
                </div>
              );
            })
          )}
        </section>
      )}
    </div>
  );
};

const PendingRequestItem = ({ user, onReview }: any) => {
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
               <p className="text-indigo-400">{formatHandle(user.handle)}</p>
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
        </div>
      </div>
    </div>
  );
};

// 5. Changelog
const Changelog = ({ currentUser }: any) => {
  const [changelog, setChangelog] = useState("");
  const isDark = currentUser?.themePreference === 'dark' || !currentUser?.themePreference;

  useEffect(() => {
    fetch('/changelog.md')
      .then(res => res.text())
      .then(setChangelog)
      .catch(err => setChangelog("# Changelog\nError loading changelog."));
  }, []);

  return (
    <div>
      <div className={`sticky top-0 backdrop-blur-md border-b ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'} p-4 z-40`}>
        <h2 className="text-xl font-bold">Changelog</h2>
      </div>
      <div className={`p-6 prose ${isDark ? 'prose-invert text-slate-300' : 'text-slate-700'} max-w-none`}>
        <pre className="whitespace-pre-wrap font-sans leading-relaxed text-current">
          {changelog}
        </pre>
      </div>
    </div>
  );
};

// 6. Explore / Trending
const Explore = ({ posts, currentUser }: any) => {
  const isDark = currentUser?.themePreference === 'dark' || !currentUser?.themePreference;
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
      <div className={`sticky top-0 backdrop-blur-md border-b ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'} p-4 z-40`}>
        <h2 className="text-xl font-bold">Explore</h2>
      </div>
      <div className="p-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search Mimic" 
            className={`w-full ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'} border border-transparent focus:border-indigo-500 rounded-full py-2.5 pl-10 pr-4 outline-none`}
          />
        </div>
        
        <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Trending Hashtags</h3>
        <div className="grid gap-4">
          {trends.map(([tag, count], i) => (
            <div key={tag} className={`flex justify-between items-center p-4 ${isDark ? 'bg-slate-900 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'} rounded-xl transition-colors cursor-pointer`}>
              <div>
                <div className="text-sm text-slate-500">{i+1} · Trending</div>
                <div className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>#{tag}</div>
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
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
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

// 7. Modals
const CommentModal = ({ post, author, users, currentUser, onClose, onCommentSubmit }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    const { data: commentData } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    const { data: likeData } = await supabase
      .from('comment_likes')
      .select('*')
      .in('comment_id', commentData?.map(c => c.id) || []);

    if (commentData) {
      setComments(commentData.map((c: any) => ({
        id: c.id,
        postId: c.post_id,
        authorId: c.author_id,
        content: c.content,
        timestamp: new Date(c.created_at).getTime(),
        likes: likeData?.filter(l => l.comment_id === c.id).map(l => l.user_id) || []
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [post.id]);

  const handleLikeComment = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment || !currentUser) return;
    const isLiked = comment.likes.includes(currentUser.id);
    if (isLiked) {
      await supabase.from('comment_likes').delete().match({ comment_id: commentId, user_id: currentUser.id });
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: currentUser.id });
    }
    fetchComments();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const commentText = newComment.trim();
    setNewComment("");
    try {
      const { data, error } = await supabase.from('comments').insert({
        post_id: post.id,
        author_id: currentUser.id,
        content: commentText
      }).select().single();
      if (error) {
        alert("Error posting comment: " + error.message);
        return;
      }
      if (data) {
        fetchComments();
        onCommentSubmit();
      }
    } catch (err: any) {
      alert("Unexpected error: " + err.message);
    }
  };

  return (
    <Modal onClose={onClose} title="Post Comments" large>
      <div className="flex flex-col h-[80vh]">
        <div className="flex gap-3 mb-6 pb-6 border-b border-slate-800">
          <img src={author.avatar} className="w-12 h-12 rounded-full bg-slate-800" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-lg">{author.name}</span>
              <span className="text-slate-500">{formatHandle(author.handle)}</span>
            </div>
            <p className="text-slate-200 text-base leading-relaxed">{post.content}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2">
          {loading ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-indigo-500" /></div>
          ) : comments.length === 0 ? (
            <p className="text-center text-slate-500 py-10">No comments yet. Be the first to reply!</p>
          ) : (
            comments.map(comment => {
              const commentAuthor = users.find((u: any) => u.id === comment.authorId);
              const isLiked = comment.likes?.includes(currentUser.id);
              return (
                <div key={comment.id} className="flex gap-3 group">
                  <img src={commentAuthor?.avatar} className="w-10 h-10 rounded-full bg-slate-800 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm truncate">{commentAuthor?.name}</span>
                      <span className="text-slate-400 text-xs truncate">{formatHandle(commentAuthor?.handle)}</span>
                      <span className="text-slate-500 text-xs flex-shrink-0">· {new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-slate-200 text-sm mb-2 break-words">{comment.content}</p>
                    <div className="flex items-center gap-4 text-slate-500">
                      <button 
                        onClick={() => handleLikeComment(comment.id)}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}
                      >
                        <Heart fill={isLiked ? "currentColor" : "none"} size={14} />
                        <span>{comment.likes?.length || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-4 pt-6 border-t border-slate-800">
          <img src={currentUser.avatar} className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-3">
            <textarea 
              placeholder="Post your reply" 
              className="w-full bg-slate-950/50 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-sm outline-none resize-none min-h-[100px]"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
            />
            <div className="flex justify-end">
              <button 
                disabled={!newComment.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-full text-sm transition-all flex items-center gap-2"
              >
                <Send size={16} />
                Reply
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

const Modal = ({ children, onClose, title, large }: any) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
    <div className={`bg-slate-900 border border-slate-800 w-full ${large ? 'max-w-2xl' : 'max-w-md'} rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200`}>
      <div className="flex justify-between items-center p-4 border-b border-slate-800">
        <h3 className="font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full transition-colors">
          <XCircle size={24} />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  </div>
);

const SwitchAccountModal = ({ authUser, users, currentUser, onSwitch, onCreate, onLogout, onClose }: any) => {
  const characters = users.filter((u: User) => u.parentUserId === authUser.id);
  const allLinked = [authUser, ...characters];

  return (
    <Modal onClose={onClose} title="Switch Account">
      <div className="space-y-2">
        {allLinked.map((u: User) => (
          <button 
            key={u.id}
            onClick={() => onSwitch(u.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${currentUser.id === u.id ? 'bg-indigo-600/20 border border-indigo-500' : 'hover:bg-slate-800 border border-transparent'}`}
          >
            <img src={u.avatar} className="w-10 h-10 rounded-full bg-slate-800" />
            <div className="text-left flex-1 overflow-hidden">
              <p className="font-bold truncate">{u.name}</p>
              <p className="text-slate-500 text-sm truncate">{formatHandle(u.handle)}</p>
            </div>
            {currentUser.id === u.id && <CheckCircle size={20} className="text-indigo-400" />}
          </button>
        ))}
        
        <div className="pt-2 border-t border-slate-800 mt-2 space-y-2">
          <button 
            onClick={onCreate}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-all text-indigo-400 font-semibold"
          >
            <PlusCircle size={20} />
            Create Character Account
          </button>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-900/20 transition-all text-red-400 font-semibold"
          >
            <LogOut size={20} />
            Logout {formatHandle(authUser.handle)}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const CreateCharacterModal = ({ onSubmit, onClose }: any) => {
  const [data, setData] = useState({ name: '', handle: '', bio: '' });

  return (
    <Modal onClose={onClose} title="Create Character">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(data); }} className="space-y-4 text-slate-900 dark:text-slate-100">
        <div>
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Character Name</label>
          <input 
            required
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={data.name}
            onChange={e => setData({...data, name: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Handle (@char)</label>
          <input 
            required
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            value={data.handle}
            onChange={e => {
              let val = e.target.value;
              if (val && !val.startsWith("@")) val = "@" + val;
              setData({...data, handle: val});
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Bio</label>
          <textarea 
            required
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
            value={data.bio}
            onChange={e => setData({...data, bio: e.target.value})}
          />
        </div>
        <button 
          type="submit" 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all"
        >
          Create Character
        </button>
      </form>
    </Modal>
  );
};

// 8. Settings View
const SettingsView = ({ currentUser, onUpdateProfile, onUnblockUser, users }: any) => {
  const [supportMessage, setSupportMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const isDark = currentUser?.themePreference === 'dark' || !currentUser?.themePreference;
  const blockedUsersList = users.filter((u: User) => currentUser.blockedUsers?.includes(u.id));

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        user_id: currentUser.id,
        content: supportMessage
      });
      if (error) throw error;
      alert("Support message sent! We'll get back to you soon.");
      setSupportMessage("");
    } catch (err: any) {
      alert("Error sending message: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (key: string, value: string) => {
    onUpdateProfile({ [key]: value });
  };

  return (
    <div className="flex flex-col h-full">
      <div className={`sticky top-0 backdrop-blur-md border-b ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'} p-4 z-40 flex items-center gap-4`}>
        <h2 className="text-xl font-bold">Settings</h2>
      </div>
      <div className={`flex border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        {['general', 'privacy', 'support'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 font-bold capitalize transition-colors ${activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-400' : `text-slate-500 ${isDark ? 'hover:bg-slate-900' : 'hover:bg-slate-100'}`}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="p-6 space-y-8 overflow-y-auto">
        {activeTab === 'general' && (
          <>
            <section className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100"><Moon size={20} className="text-indigo-400" /> Appearance</h3>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => updatePreference('themePreference', 'light')} className={`p-4 rounded-xl border flex items-center justify-center gap-2 ${currentUser.themePreference === 'light' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}><Sun size={18} /> Light</button>
                <button onClick={() => updatePreference('themePreference', 'dark')} className={`p-4 rounded-xl border flex items-center justify-center gap-2 ${currentUser.themePreference === 'dark' || !currentUser.themePreference ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}><Moon size={18} /> Dark</button>
              </div>
            </section>
            <section className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100"><Type size={20} className="text-indigo-400" /> Font Size</h3>
              <div className="grid grid-cols-3 gap-3">
                {['small', 'medium', 'large'].map((size) => (
                  <button key={size} onClick={() => updatePreference('fontSizePreference', size)} className={`p-3 rounded-xl border capitalize ${currentUser.fontSizePreference === size || (!currentUser.fontSizePreference && size === 'medium') ? 'bg-indigo-600 border-indigo-500 text-white font-bold' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>{size}</button>
                ))}
              </div>
            </section>
          </>
        )}
        {activeTab === 'privacy' && (
          <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-red-400"><Ban size={20} /> Blocked Users</h3>
            <div className="space-y-2">
              {blockedUsersList.length === 0 ? <p className="text-slate-500 italic p-4 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">No users blocked yet.</p> : blockedUsersList.map((u: User) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar} className="w-10 h-10 rounded-full" />
                    <div><p className="font-bold">{u.name}</p><p className="text-slate-500 text-xs">{formatHandle(u.handle)}</p></div>
                  </div>
                  <button onClick={() => onUnblockUser(u.id)} className="px-4 py-1.5 bg-slate-800 hover:bg-red-900/30 text-red-400 border border-red-900/50 rounded-full text-sm font-bold transition-all">Unblock</button>
                </div>
              ))}
            </div>
          </section>
        )}
        {activeTab === 'support' && (
          <section className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2"><LifeBuoy size={20} className="text-indigo-400" /> Support</h3>
            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <textarea required placeholder="Describe your issue..." className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-4 text-sm outline-none resize-none min-h-[150px]" value={supportMessage} onChange={e => setSupportMessage(e.target.value)} />
              <button disabled={loading || !supportMessage.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">{loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />} Send</button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
};

// 9. Profile Edit Modal
const EditProfileModal = ({ currentUser, onClose, onSave }: any) => {
  const [data, setData] = useState({
    name: currentUser.name,
    handle: currentUser.handle,
    bio: currentUser.bio,
    avatar: currentUser.avatar,
    pronouns: currentUser.pronouns || "",
    customFields: currentUser.customFields || []
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await fileToBase64(e.target.files[0]);
      setData({ ...data, avatar: base64 });
    }
  };

  const addField = () => setData({ ...data, customFields: [...data.customFields, { label: "", value: "" }] });
  const updateField = (index: number, key: 'label' | 'value', val: string) => {
    const newFields = [...data.customFields];
    newFields[index][key] = val;
    setData({ ...data, customFields: newFields });
  };
  const removeField = (index: number) => setData({ ...data, customFields: data.customFields.filter((_, i) => i !== index) });

  return (
    <Modal onClose={onClose} title="Edit Profile" large>
      <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <img src={data.avatar} className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-full transition-opacity"><ImageIcon className="text-white" size={32} /></div>
          </div>
          <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarChange} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 outline-none" value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder="Name" />
          <input className="bg-slate-950 border border-slate-700 rounded-lg p-2.5 outline-none" value={data.handle} onChange={e => setData({...data, handle: e.target.value})} placeholder="Handle" />
        </div>
        <input className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 outline-none" value={data.pronouns} onChange={e => setData({...data, pronouns: e.target.value})} placeholder="Pronouns" />
        <textarea className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 outline-none h-24 resize-none" value={data.bio} onChange={e => setData({...data, bio: e.target.value})} placeholder="Bio" />
        <div className="space-y-3">
          <div className="flex justify-between items-center"><label className="text-sm font-medium text-slate-400">Fields</label><button onClick={addField} className="text-xs bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded-full">+ Add</button></div>
          {data.customFields.map((field: any, i: number) => (
            <div key={i} className="flex gap-2"><input className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm" value={field.label} onChange={e => updateField(i, 'label', e.target.value)} /><input className="flex-[2] bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm" value={field.value} onChange={e => updateField(i, 'value', e.target.value)} /><button onClick={() => removeField(i)} className="p-2 text-red-500"><Trash2 size={18} /></button></div>
          ))}
        </div>
        <button onClick={() => onSave(data)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Save size={20} /> Save</button>
      </div>
    </Modal>
  );
};

// --- Main Application ---

const App = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);
  const [bannedWords, setBannedWords] = useState<BannedWord[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [authUserId, setAuthUserId] = useState<string | null>(() => localStorage.getItem("mimic_user_id"));
  const [activeAccountId, setActiveAccountId] = useState<string | null>(() => localStorage.getItem("mimic_active_id"));
  const [view, setView] = useState('home');
  const [loading, setLoading] = useState(true);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showCharacterCreate, setShowCharacterCreate] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);

  const authUser = users.find(u => u.id === authUserId);
  const currentUser = users.find(u => u.id === (activeAccountId || authUserId)) || authUser;

  const fetchData = async () => {
    try {
      const [profilesRes, postsRes, likesRes, followsRes, commentsRes, blocksRes, maintRes, bwRes, reportsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('posts').select('*').order('created_at', { ascending: false }),
        supabase.from('likes').select('*'),
        supabase.from('follows').select('*'),
        supabase.from('comments').select('id, post_id'),
        supabase.from('blocks').select('*'),
        supabase.from('maintenance').select('*').limit(1).maybeSingle(),
        supabase.from('banned_words').select('*'),
        supabase.from('reports').select('*').eq('status', 'PENDING')
      ]);

      if (maintRes?.data) setMaintenance({ id: maintRes.data.id, isActive: maintRes.data.is_active, message: maintRes.data.message, scheduledRestart: maintRes.data.scheduled_restart ? new Date(maintRes.data.scheduled_restart).getTime() : undefined });
      if (bwRes?.data) setBannedWords(bwRes.data.map((b: any) => ({ id: b.id, word: b.word, userId: b.user_id })));
      if (reportsRes?.data) setReports(reportsRes.data.map((r: any) => ({ id: r.id, reporterId: r.reporter_id, reportedUserId: r.reported_user_id, reportedPostId: r.reported_post_id, reason: r.reason, status: r.status, createdAt: new Date(r.created_at).getTime() })));

      if (profilesRes.data) {
        setUsers(profilesRes.data.map((p: any) => ({
          id: p.id, handle: p.handle, name: p.display_name, avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.handle}`, bio: p.bio, isModerator: p.is_moderator, status: p.status, accountType: p.account_type || 'USER', parentUserId: p.parent_user_id, maxCharacters: p.max_characters, bannedUntil: p.banned_until ? new Date(p.banned_until).getTime() : undefined, joinedAt: new Date(p.joined_at).getTime(), roblox_username: p.roblox_username, discord_username: p.discord_username, pronouns: p.pronouns, customFields: p.custom_fields || [], themePreference: p.theme_preference, fontSizePreference: p.font_size_preference, blockedUsers: blocksRes.data?.filter(b => b.blocker_id === p.id).map(b => b.blocked_id) || [], followers: followsRes.data?.filter(f => f.following_id === p.id).map(f => f.follower_id) || [], following: followsRes.data?.filter(f => f.follower_id === p.id).map(f => f.following_id) || []
        })));
      }
      if (postsRes.data) {
        setPosts(postsRes.data.map((p: any) => ({
          id: p.id, authorId: p.author_id, content: p.content, media: p.media_url, mediaType: p.media_type, hashtags: p.hashtags || [], timestamp: new Date(p.created_at).getTime(), likes: likesRes.data?.filter(l => l.post_id === p.id).map(l => l.user_id) || [], commentsCount: commentsRes.data?.filter(c => c.post_id === p.id).length || 0
        })));
      }
    } catch (error) { console.error("Error fetching data:", error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!currentUser) return;
    const isDark = currentUser.themePreference === 'dark' || !currentUser.themePreference;
    document.documentElement.classList.toggle('dark', isDark);
    const sizeMap: Record<string, string> = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizeMap[currentUser.fontSizePreference || 'medium'];
  }, [currentUser?.themePreference, currentUser?.fontSizePreference]);

  const handleRegister = async (data: any) => {
    const { error } = await supabase.from('profiles').insert({ display_name: data.name, handle: data.handle, bio: data.bio, roblox_username: data.roblox, discord_username: data.discord, password: data.password, status: 'PENDING' });
    if (error) alert("Error: " + error.message);
    else { fetchData(); alert("Application submitted!"); }
  };

  const handleLogin = async (identifier: string, password: string) => {
    const { data, error } = await supabase.from('profiles').select('*').or(`roblox_username.eq."${identifier}",discord_username.eq."${identifier}"`).eq('password', password).single();
    if (error || !data) alert("Invalid credentials.");
    else if (data.status !== 'APPROVED') alert("Your account is " + data.status.toLowerCase() + ".");
    else if (data.banned_until && new Date(data.banned_until) > new Date()) alert(`Banned until ${new Date(data.banned_until).toLocaleString()}.`);
    else { setAuthUserId(data.id); setActiveAccountId(data.id); localStorage.setItem("mimic_user_id", data.id); localStorage.setItem("mimic_active_id", data.id); setView('home'); }
  };

  const handleSwitchAccount = (accountId: string) => { setActiveAccountId(accountId); localStorage.setItem("mimic_active_id", accountId); setShowSwitchModal(false); setView('home'); };
  const handleLogout = () => { setAuthUserId(null); setActiveAccountId(null); localStorage.removeItem("mimic_user_id"); localStorage.removeItem("mimic_active_id"); setView('home'); };

  const handleCreateCharacter = async (data: any) => {
    if (!authUser) return;
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('parent_user_id', authUser.id);
    if (count !== null && count >= (authUser.maxCharacters || 5)) return alert("Limit reached.");
    const { data: profile, error } = await supabase.from('profiles').insert({ display_name: data.name, handle: data.handle, bio: data.bio, roblox_username: `${authUser.roblox_username}_char_${generateId()}`, discord_username: `${authUser.discord_username}_char_${generateId()}`, password: 'character_account', status: 'APPROVED', account_type: 'CHARACTER', parent_user_id: authUser.id }).select().single();
    if (error) alert("Error: " + error.message);
    else { await fetchData(); setShowCharacterCreate(false); handleSwitchAccount(profile.id); }
  };

  const handlePostCreate = async (data: any) => {
    if (!currentUser) return;
    const lowerContent = data.content.toLowerCase();
    const foundBanned = bannedWords.find(bw => (!bw.userId || bw.userId === currentUser.id) && lowerContent.includes(bw.word.toLowerCase()));
    if (foundBanned) return alert(`Banned word: "${foundBanned.word}".`);
    const { error } = await supabase.from('posts').insert({ author_id: currentUser.id, content: data.content, media_url: data.media, media_type: data.mediaType, hashtags: extractHashtags(data.content) });
    if (error) alert("Post failed: " + error.message);
    else fetchData();
  };

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !currentUser) return;
    if (post.likes.includes(currentUser.id)) await supabase.from('likes').delete().match({ post_id: postId, user_id: currentUser.id });
    else await supabase.from('likes').insert({ post_id: postId, user_id: currentUser.id });
    fetchData();
  };

  const handleUpdateProfile = async (updatedData: any) => {
    if (!currentUser) return;
    const update: any = {};
    if (updatedData.name) update.display_name = updatedData.name;
    if (updatedData.handle) update.handle = updatedData.handle;
    if (updatedData.bio !== undefined) update.bio = updatedData.bio;
    if (updatedData.avatar) update.avatar_url = updatedData.avatar;
    if (updatedData.pronouns !== undefined) update.pronouns = updatedData.pronouns;
    if (updatedData.customFields) update.custom_fields = updatedData.customFields;
    if (updatedData.themePreference) update.theme_preference = updatedData.themePreference;
    if (updatedData.fontSizePreference) update.font_size_preference = updatedData.fontSizePreference;
    const { error } = await supabase.from('profiles').update(update).eq('id', currentUser.id);
    if (error) alert("Update failed: " + error.message);
    else fetchData();
  };

  const handleBlockUser = async (targetUserId: string) => {
    if (!currentUser) return;
    await supabase.from('blocks').insert({ blocker_id: currentUser.id, blocked_id: targetUserId });
    fetchData();
  };

  const handleUnblockUser = async (targetUserId: string) => {
    if (!currentUser) return;
    await supabase.from('blocks').delete().match({ blocker_id: currentUser.id, blocked_id: targetUserId });
    fetchData();
  };

  const handleModeration = async (userId: string, action: string) => {
    await supabase.from('profiles').update({ status: action }).eq('id', userId);
    fetchData();
  };

  const handleUpdateMaintenance = async (data: any) => {
    const payload = { is_active: data.isActive, message: data.message, scheduled_restart: data.scheduledRestart ? new Date(data.scheduledRestart).toISOString() : null };
    if (!maintenance) await supabase.from('maintenance').insert(payload);
    else await supabase.from('maintenance').update(payload).eq('id', maintenance.id);
    fetchData();
  };

  const handleAddBannedWord = async (word: string) => { await supabase.from('banned_words').insert({ word }); fetchData(); };
  const handleRemoveBannedWord = async (id: string) => { await supabase.from('banned_words').delete().eq('id', id); fetchData(); };

  const handleReport = async (type: string, id: string) => {
    const reason = prompt(`Reason for reporting ${type.toLowerCase()}:`);
    if (reason) { await supabase.from('reports').insert({ reporter_id: currentUser.id, [type === 'USER' ? 'reported_user_id' : 'reported_post_id']: id, reason }); alert("Reported."); fetchData(); }
  };

  const handleReviewReport = async (reportId: string, status: string) => {
    const report = reports.find(r => r.id === reportId);
    if (status === 'ACTIONED' && report?.reportedUserId) {
      const duration = prompt("Ban minutes:", "60");
      if (duration) await supabase.from('profiles').update({ banned_until: new Date(Date.now() + parseInt(duration) * 60000).toISOString() }).eq('id', report.reportedUserId);
    }
    await supabase.from('reports').update({ status }).eq('id', reportId);
    fetchData();
  };

  if (!currentUser) return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />;

  return (
    <>
      <Layout currentUser={currentUser} currentView={view} onNavigate={setView} onSwitchAccount={() => setShowSwitchModal(true)} pendingCount={users.filter(u => u.status === 'PENDING').length} posts={posts} maintenance={maintenance}>
        {view === 'home' && <Feed posts={posts} users={users} currentUser={currentUser} onLike={handleLike} onPostCreated={handlePostCreate} onCommentClick={setCommentingPostId} onBlockUser={handleBlockUser} onReport={handleReport} />}
        {view === 'explore' && <Explore posts={posts} currentUser={currentUser} />}
        {view === 'changelog' && <Changelog currentUser={currentUser} />}
        {view === 'messages' && <Messages users={users} currentUser={currentUser} />}
        {view === 'moderator' && currentUser.isModerator && <ModeratorDashboard users={users} onReview={handleModeration} maintenance={maintenance} onUpdateMaintenance={handleUpdateMaintenance} bannedWords={bannedWords} onAddBannedWord={handleAddBannedWord} onRemoveBannedWord={handleRemoveBannedWord} reports={reports} onReviewReport={handleReviewReport} />}
        {view === 'profile' && (
          <div className="p-4 text-center">
            <div className="flex justify-end mb-4"><button onClick={() => setShowEditProfile(true)} className="flex items-center gap-2 px-4 py-2 border dark:border-slate-800 rounded-full font-bold text-sm"><Edit2 size={16} /> Edit</button></div>
            <img src={currentUser.avatar} className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white shadow-xl" />
            <h1 className="text-2xl font-bold">{currentUser.name}</h1>
            <p className="text-slate-500">{formatHandle(currentUser.handle)}</p>
            {currentUser.id !== authUserId && <button onClick={() => handleReport('USER', currentUser.id)} className="mt-2 text-red-500 text-sm flex items-center gap-1 mx-auto hover:underline"><ShieldAlert size={14} /> Report</button>}
            <p className="mt-4">{currentUser.bio}</p>
            <div className="mt-8 border-t dark:border-slate-800">
              <h3 className="font-bold text-lg py-4 text-left">Posts</h3>
              {posts.filter(p => p.authorId === currentUser.id).map(p => <PostItem key={p.id} post={p} author={currentUser} currentUser={currentUser} onLike={handleLike} onCommentClick={setCommentingPostId} onReport={handleReport} />)}
            </div>
          </div>
        )}
        {view === 'compose' && <div className="p-4"><h2 className="text-xl font-bold mb-4">Post</h2><CreatePostWidget currentUser={currentUser} onPostCreated={(d: any) => { handlePostCreate(d); setView('home'); }} /></div>}
        {view === 'settings' && <SettingsView currentUser={currentUser} users={users} onUpdateProfile={handleUpdateProfile} onUnblockUser={handleUnblockUser} />}
        {showSwitchModal && <SwitchAccountModal authUser={authUser} users={users} currentUser={currentUser} onSwitch={handleSwitchAccount} onCreate={() => { setShowSwitchModal(false); setShowCharacterCreate(true); }} onLogout={handleLogout} onClose={() => setShowSwitchModal(false)} />}
        {showCharacterCreate && <CreateCharacterModal onSubmit={handleCreateCharacter} onClose={() => setShowCharacterCreate(false)} />}
        {showEditProfile && <EditProfileModal currentUser={currentUser} onClose={() => setShowEditProfile(false)} onSave={(d: any) => { handleUpdateProfile(d); setShowEditProfile(false); }} />}
      </Layout>
      {commentingPostId && <CommentModal post={posts.find(p => p.id === commentingPostId)} author={users.find(u => u.id === posts.find(p => p.id === commentingPostId)?.authorId)} users={users} currentUser={currentUser} onClose={() => setCommentingPostId(null)} onCommentSubmit={fetchData} />}
    </>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
