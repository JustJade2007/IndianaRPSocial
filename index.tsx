import React, { useState, useEffect, useRef, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "./src/lib/supabase";
import { IS_LOCAL_TESTING } from "./local-testing";
import {
  Home, Hash, Mail, User, ShieldAlert, LogOut, PlusCircle, Image as ImageIcon, Send, MoreHorizontal,
  Heart, MessageCircle, CheckCircle, XCircle, Users, Search, Share2, History, Settings as SettingsIcon,
  Moon, Sun, Type, Ban, LifeBuoy, Edit2, Save, Trash2, Lock, Unlock, Repeat, Sparkles, Loader2,
  Briefcase, Home as HomeIcon
} from "lucide-react";

const GENAI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: GENAI_API_KEY });
const IS_TEST_MODE = IS_LOCAL_TESTING || (import.meta as any).env.VITE_TEST_MODE === 'true' || !(import.meta as any).env.VITE_SUPABASE_URL;

interface User { id: string; handle: string; name: string; avatar: string; banner?: string; bio: string; isModerator: boolean; status: 'PENDING' | 'APPROVED' | 'REJECTED'; accountType: 'USER' | 'CHARACTER'; parentUserId?: string; maxCharacters?: number; bannedUntil?: number; joinedAt: number; followers: string[]; following: string[]; roblox_username?: string; discord_username?: string; pronouns?: string; customFields?: { label: string; value: string }[]; themePreference?: 'light' | 'dark'; fontSizePreference?: 'small' | 'medium' | 'large'; blockedUsers?: string[]; isDeceased?: boolean; deathDate?: number; isImprisoned?: boolean; imprisonmentDate?: number; isArchived?: boolean; pastNames?: string[]; career?: string; homeAddress?: string; showDiscord?: boolean; showRoblox?: boolean; }
interface Post { id: string; authorId: string; content: string; media?: string; mediaType?: 'image' | 'video'; hashtags: string[]; likes: string[]; commentsCount: number; timestamp: number; }
interface Comment { id: string; postId: string; authorId: string; content: string; timestamp: number; likes: string[]; }
interface Maintenance { id: string; isActive: boolean; message: string; scheduledRestart?: number; }
interface BannedWord { id: string; word: string; userId?: string; }
interface Report { id: string; reporterId: string; reportedUserId?: string; reportedPostId?: string; reason: string; status: 'PENDING' | 'REVIEWED' | 'ACTIONED'; createdAt: number; }
interface DirectMessage { id: string; sender_id: string; receiver_id: string; content: string; is_read: boolean; created_at: number; }
interface Conversation { participant: User; lastMessage: DirectMessage; unreadCount: number; }

const generateId = () => Math.random().toString(36).substring(2, 9);
const extractHashtags = (text: string) => { const matches = text.match(/#[a-z0-9_]+/gi); return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : []; };
const formatHandle = (handle: string) => handle ? (handle.startsWith("@") ? handle : `@${handle}`) : "";
const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result as string); reader.onerror = error => reject(error); });

const Modal = ({ children, onClose, title, large }: any) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-slate-100">
    <div className={`bg-slate-900 border border-slate-800 w-full ${large ? 'max-w-2xl' : 'max-w-md'} rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200`}>
      <div className="flex justify-between items-center p-4 border-b border-slate-800">
        <h3 className="font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full transition-colors"><XCircle size={24} /></button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  </div>
);

const NavItem = ({ icon: Icon, label, active, onClick, badge, currentUser }: any) => {
  return (
    <button onClick={onClick} className={`flex items-center gap-4 w-full p-3 rounded-full transition-all ${active ? 'font-bold bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300'}`}>
      <div className="relative"><Icon size={26} />{badge && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">{badge}</span>}</div>
      <span className="hidden lg:inline text-lg">{label}</span>
    </button>
  );
};

const Layout = ({ children, currentUser, onNavigate, currentView, onSwitchAccount, pendingCount, posts = [], maintenance }: any) => {
  const isDark = currentUser?.themePreference === 'dark' || !currentUser?.themePreference;
  const trends = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((p: Post) => { p.hashtags?.forEach(h => { counts[h] = (counts[h] || 0) + 1; }); });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [posts]);
  if (!currentUser) return (<div className="min-h-screen bg-slate-950 text-slate-100">{children}{IS_TEST_MODE && <div className="fixed bottom-0 left-0 right-0 bg-orange-600 text-white text-center py-2 font-bold z-[100] text-sm uppercase tracking-wider">THIS IS A LOCAL TESTING BUILD</div>}</div>);
  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'} pb-10 transition-colors duration-200`}>
      {maintenance?.isActive && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-[101] flex flex-col items-center animate-pulse">
           <div className="flex items-center gap-2 font-bold"><ShieldAlert size={20} /><span>SYSTEM MAINTENANCE: {maintenance.message}</span></div>
        </div>
      )}
      <aside className={`w-20 lg:w-64 fixed h-screen border-r ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'} flex flex-col justify-between p-4 z-50`}>
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2"><div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center"><span className="font-bold text-white">M</span></div><span className="hidden lg:block text-xl font-bold text-slate-100">Mimic</span></div>
          <nav className="space-y-2">
            <NavItem icon={Home} label="Home" active={currentView === 'home'} onClick={() => onNavigate('home')} currentUser={currentUser} />
            <NavItem icon={Hash} label="Explore" active={currentView === 'explore'} onClick={() => onNavigate('explore')} currentUser={currentUser} />
            <NavItem icon={Mail} label="Messages" active={currentView === 'messages'} onClick={() => onNavigate('messages')} currentUser={currentUser} />
            <NavItem icon={User} label="Profile" active={currentView === 'profile'} onClick={() => onNavigate('profile')} currentUser={currentUser} />
            <NavItem icon={SettingsIcon} label="Settings" active={currentView === 'settings'} onClick={() => onNavigate('settings')} currentUser={currentUser} />
            <NavItem icon={History} label="Changelog" active={currentView === 'changelog'} onClick={() => onNavigate('changelog')} currentUser={currentUser} />
            {currentUser.isModerator && <NavItem icon={ShieldAlert} label="Moderator" active={currentView === 'moderator'} onClick={() => onNavigate('moderator')} badge={pendingCount > 0 ? pendingCount : undefined} currentUser={currentUser} />}
          </nav>
          <button onClick={() => onNavigate('compose')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3 lg:py-3 lg:px-4 font-bold shadow-lg transition-all flex items-center justify-center gap-2"><PlusCircle size={24} /><span className="hidden lg:inline">Post</span></button>
        </div>
        <button className={`flex items-center gap-3 w-full p-2 ${isDark ? 'hover:bg-slate-900' : 'hover:bg-slate-100'} rounded-full text-left`} onClick={onSwitchAccount}>
          <img src={currentUser.avatar} alt="avatar" className="w-10 h-10 rounded-full" />
          <div className="hidden lg:block overflow-hidden text-slate-100"><p className="font-bold truncate">{currentUser.name}</p><p className="text-slate-500 text-sm truncate">{formatHandle(currentUser.handle)}</p></div>
        </button>
      </aside>
      <main className="ml-20 lg:ml-64 flex-1 min-h-screen border-r border-slate-800 max-w-2xl text-slate-100">{children}</main>
      <aside className="hidden xl:block w-80 p-6 fixed right-0 h-screen overflow-y-auto text-slate-100">
        <div className="rounded-xl p-4 border border-slate-800"><h2 className="font-bold text-lg mb-4">Trending</h2><div className="space-y-4">{trends.map(([tag, count]) => (<div key={tag}>#{tag} ({count})</div>))}</div></div>
      </aside>
    </div>
  );
};

const CreatePostWidget = ({ currentUser, onPostCreated }: any) => {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const fRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex gap-4">
      <img src={currentUser.avatar} className="w-10 h-10 rounded-full border border-slate-800" alt="avatar" />
      <div className="flex-1 text-slate-100">
        <textarea placeholder="What is happening?!" className="w-full bg-transparent text-xl border-none focus:ring-0 resize-none p-2 text-slate-100" rows={2} value={content} onChange={(e) => setContent(e.target.value)} />
        {media && (
          <div className="relative mt-2 rounded-xl overflow-hidden">
            {mediaType === 'image' ? <img src={media} className="w-full max-h-96 object-cover" alt="post" /> : <video src={media} controls className="w-full max-h-96" />}
            <button onClick={() => { setMedia(null); setMediaType(null); }} className="absolute top-2 right-2 bg-black/70 p-1 rounded-full text-white text-white"><XCircle size={20} /></button>
          </div>
        )}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800 text-slate-100 text-slate-100 text-slate-100">
          <button onClick={() => fRef.current?.click()} className="p-2 hover:bg-indigo-500/10 rounded-full text-indigo-400"><ImageIcon size={20} /></button>
          <input type="file" ref={fRef} hidden accept="image/*,video/*" onChange={async (e) => { if(e.target.files?.[0]) { setMedia(await fileToBase64(e.target.files[0])); setMediaType(e.target.files[0].type.startsWith('video') ? 'video' : 'image'); } }} />
          <button onClick={() => { onPostCreated({ content, media, mediaType }); setContent(""); setMedia(null); }} disabled={!content.trim() && !media} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-full text-slate-100 font-bold">Post</button>
        </div>
      </div>
    </div>
  );
};

const PostItem = ({ post, author, currentUser, onLike, onCommentClick, onBlockUser, onReport }: any) => {
  const isLiked = post.likes?.includes(currentUser.id);
  return (
    <div className="p-4 border-b border-slate-800 hover:bg-slate-900/40 transition-colors cursor-pointer text-slate-100 text-slate-100">
      <div className="flex gap-3">
        <img src={author.avatar} className="w-10 h-10 rounded-full border border-slate-800" alt="avatar" />
        <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2 mb-1"><span className="font-bold truncate text-slate-100 text-slate-100">{author.name}</span><span className="text-slate-500 text-sm truncate">{formatHandle(author.handle)}</span></div>
           <p className="whitespace-pre-wrap text-slate-200 mb-3">{post.content}</p>
           {post.media && ( <div className="rounded-xl overflow-hidden border border-slate-800 mb-3">{post.mediaType === 'image' ? <img src={post.media} className="w-full object-cover max-h-[500px]" alt="media" /> : <video src={post.media} controls className="w-full" />}</div> )}
           <div className="flex justify-between text-slate-500 max-w-md mt-2">
             <div onClick={(e) => { e.stopPropagation(); onCommentClick(post.id); }} className="flex items-center gap-2 hover:text-indigo-400 cursor-pointer"><MessageCircle size={18} /><span>{post.commentsCount || 0}</span></div>
             <button onClick={(e) => { e.stopPropagation(); onLike(post.id); }} className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}><Heart size={18} fill={isLiked ? "currentColor" : "none"} /><span>{post.likes?.length || 0}</span></button>
           </div>
        </div>
      </div>
    </div>
  );
};

const Feed = ({ posts, users, currentUser, onLike, onPostCreated, onCommentClick, onBlockUser, onReport }: any) => (
  <div className="text-slate-100">
    <div className="sticky top-0 backdrop-blur-md border-b border-slate-800 p-4 z-40 bg-slate-950/80 text-slate-100 text-slate-100 text-slate-100"><h2 className="text-xl font-bold">Home</h2></div>
    {((currentUser.accountType === 'CHARACTER' && !currentUser.isArchived) || currentUser.isModerator) && <div className="p-4 border-b border-slate-800"><CreatePostWidget currentUser={currentUser} onPostCreated={onPostCreated} /></div>}
    {posts.filter((p: Post) => !currentUser.blockedUsers?.includes(p.authorId)).map((post: Post) => {
      const author = users.find((u: User) => u.id === post.authorId);
      return author ? <PostItem key={post.id} post={post} author={author} currentUser={currentUser} onLike={onLike} onCommentClick={onCommentClick} onBlockUser={onBlockUser} onReport={onReport} /> : null;
    })}
  </div>
);

const ModeratorDashboard = ({ users, onReview }: any) => (
    <div className="p-4 space-y-6 text-slate-100 text-slate-100">
      <h2 className="text-xl font-bold">Pending Requests</h2>
      {users.filter((u: User) => u.status === 'PENDING').map((u: User) => (
        <div key={u.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center text-slate-100 text-slate-100 text-slate-100 text-slate-100">
          <div><p className="font-bold text-slate-100 text-slate-100 text-slate-100 text-slate-100 text-slate-100">{u.name}</p><p className="text-sm text-slate-500">{u.bio}</p></div>
          <div className="flex gap-2">
            <button onClick={() => onReview(u.id, 'APPROVED')} className="p-2 bg-green-900/20 text-green-400 rounded-full"><CheckCircle /></button>
            <button onClick={() => onReview(u.id, 'REJECTED')} className="p-2 bg-red-900/20 text-red-400 rounded-full"><XCircle /></button>
          </div>
        </div>
      ))}
    </div>
);

const CommentModal = ({ post, author, users, currentUser, onClose, onCommentSubmit }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const fetchComments = async () => {
    const { data: c } = await supabase.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
    if (c) setComments(c.map((x: any) => ({ id: x.id, postId: x.post_id, authorId: x.author_id, content: x.content, timestamp: new Date(x.created_at).getTime(), likes: [] })));
  };
  useEffect(() => { fetchComments(); }, [post.id]);
  return (
    <Modal onClose={onClose} title="Comments" large>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto text-slate-100 text-slate-100">
        <div className="pb-4 border-b border-slate-800"><p className="font-bold">{author.name}</p><p>{post.content}</p></div>
        {comments.map(c => { const a = users.find((u: User) => u.id === c.authorId); return a ? <div key={c.id} className="flex gap-3 text-slate-100"><img src={a.avatar} className="w-8 h-8 rounded-full" alt="avatar" /><div><p className="font-bold text-sm text-slate-100 text-slate-100">{a.name}</p><p className="text-sm text-slate-100 text-slate-100">{c.content}</p></div></div> : null; })}
        <form onSubmit={async (e) => { e.preventDefault(); if (!newComment.trim()) return; await supabase.from('comments').insert({ post_id: post.id, author_id: currentUser.id, content: newComment.trim() }); setNewComment(""); fetchComments(); onCommentSubmit(); }} className="pt-4 border-t border-slate-800 flex gap-2"><input className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-slate-100 text-slate-100" placeholder="Reply..." value={newComment} onChange={e => setNewComment(e.target.value)} /><button className="bg-indigo-600 px-4 rounded-lg font-bold text-white text-white">Reply</button></form>
      </div>
    </Modal>
  );
};

const MessagesView = ({ currentUser, users, initialRecipientId }: any) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(initialRecipientId);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const msgEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    const { data: msgs } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (msgs) {
      const convosMap = new Map<string, Conversation>();
      msgs.forEach((m: any) => {
        const otherId = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id;
        if (!convosMap.has(otherId)) {
          const otherUser = users.find((u: User) => u.id === otherId);
          if (otherUser) {
            convosMap.set(otherId, {
              participant: otherUser,
              lastMessage: { ...m, created_at: new Date(m.created_at).getTime() },
              unreadCount: m.receiver_id === currentUser.id && !m.is_read ? 1 : 0
            });
          }
        } else if (m.receiver_id === currentUser.id && !m.is_read) {
          convosMap.get(otherId)!.unreadCount++;
        }
      });
      setConversations(Array.from(convosMap.values()));
    }
  };

  const fetchMessages = async (recipientId: string) => {
    const { data: msgs } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (msgs) {
      setMessages(msgs.map((m: any) => ({ ...m, created_at: new Date(m.created_at).getTime() })));
      // Mark as read
      const unread = msgs.filter((m: any) => m.receiver_id === currentUser.id && !m.is_read);
      if (unread.length > 0) {
        await supabase.from('direct_messages').update({ is_read: true }).in('id', unread.map((m: any) => m.id));
        fetchConversations();
      }
    }
  };

  useEffect(() => { fetchConversations(); }, [currentUser.id]);
  useEffect(() => { if (selectedRecipientId) fetchMessages(selectedRecipientId); }, [selectedRecipientId]);
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const subscription = supabase
      .channel('direct_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload: any) => {
        const nm = payload.new as any;
        if (nm.sender_id === currentUser.id || nm.receiver_id === currentUser.id) {
          fetchConversations();
          if (selectedRecipientId && (nm.sender_id === selectedRecipientId || nm.receiver_id === selectedRecipientId)) {
            setMessages(prev => [...prev, { ...nm, created_at: new Date(nm.created_at).getTime() }]);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [currentUser.id, selectedRecipientId]);

  const handleSendMessage = async (e: any) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRecipientId) return;
    const content = newMessage.trim();
    setNewMessage("");
    await supabase.from('direct_messages').insert({
      sender_id: currentUser.id,
      receiver_id: selectedRecipientId,
      content
    });
  };

  const recipient = users.find((u: User) => u.id === selectedRecipientId);

  return (
    <div className="flex h-[calc(100vh-4rem)] text-slate-100">
      <div className={`w-full md:w-80 border-r border-slate-800 flex flex-col ${selectedRecipientId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-800"><h2 className="text-xl font-bold">Messages</h2></div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500"><Mail size={48} className="mx-auto mb-4 opacity-20" /><p>No conversations yet</p></div>
          ) : conversations.map(c => (
            <button key={c.participant.id} onClick={() => setSelectedRecipientId(c.participant.id)} className={`w-full flex items-center gap-3 p-4 hover:bg-slate-900 transition-colors ${selectedRecipientId === c.participant.id ? 'bg-slate-900 border-r-2 border-indigo-500' : ''}`}>
              <div className="relative">
                <img src={c.participant.avatar} className="w-12 h-12 rounded-full" alt="avatar" />
                {c.unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">{c.unreadCount}</span>}
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex justify-between items-baseline"><p className="font-bold truncate">{c.participant.name}</p><span className="text-[10px] text-slate-500">{new Date(c.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                <p className="text-sm text-slate-500 truncate">{c.lastMessage.content}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={`flex-1 flex flex-col ${!selectedRecipientId ? 'hidden md:flex' : 'flex'}`}>
        {recipient ? (
          <>
            <div className="p-3 border-b border-slate-800 flex items-center gap-3">
              <button onClick={() => setSelectedRecipientId(null)} className="md:hidden p-2 hover:bg-slate-800 rounded-full"><XCircle size={20} /></button>
              <img src={recipient.avatar} className="w-10 h-10 rounded-full" alt="avatar" />
              <div><p className="font-bold">{recipient.name}</p><p className="text-xs text-slate-500">{formatHandle(recipient.handle)}</p></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${m.sender_id === currentUser.id ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none'}`}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <p className="text-[10px] opacity-50 mt-1 text-right">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
              <div ref={msgEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2">
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Start a new message" className="flex-1 bg-slate-900 border border-slate-800 rounded-full px-4 py-2 outline-none focus:border-indigo-500 transition-colors" />
              <button type="submit" disabled={!newMessage.trim()} className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-full transition-all"><Send size={20} /></button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-center items-center justify-center p-8 text-center text-slate-500">
            <div><Mail size={64} className="mx-auto mb-4 opacity-10" /><h3 className="text-xl font-bold text-slate-400">Select a message</h3><p>Choose from your existing conversations or start a new one.</p></div>
          </div>
        )}
      </div>
    </div>
  );
};

const ApplyModal = ({ onClose, onApply }: any) => {
  const [data, setData] = useState({ 
    discord: '', 
    roblox: '', 
    name: '', 
    bio: '', 
    password: '',
    acceptedRules: false 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Modal onClose={onClose} title="Apply for an Account" large>
      <form onSubmit={async (e) => {
        e.preventDefault();
        if (!data.acceptedRules) return alert("You must accept the rules.");
        setIsSubmitting(true);
        await onApply(data);
        setIsSubmitting(false);
      }} className="space-y-4 text-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-slate-400">Discord Username</label>
            <input required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100" value={data.discord} onChange={e => setData({...data, discord: e.target.value})} placeholder="user#0000" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-400">Roblox Username</label>
            <input required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100" value={data.roblox} onChange={e => setData({...data, roblox: e.target.value})} placeholder="RobloxUser" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-400">Display Name</label>
          <input required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100" value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder="John Doe" />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-400">Why do you want to join?</label>
          <textarea required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 h-24 resize-none" value={data.bio} onChange={e => setData({...data, bio: e.target.value})} placeholder="Tell us about your roleplay experience..." />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-400">Password</label>
          <input type="password" required className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100" value={data.password} onChange={e => setData({...data, password: e.target.value})} placeholder="••••••••" />
        </div>

        <div className="p-4 bg-slate-800/50 rounded-xl space-y-2">
          <h4 className="font-bold text-sm uppercase tracking-wider text-slate-300">Rules & Disclaimers</h4>
          <div className="text-xs text-slate-400 h-24 overflow-y-auto border border-slate-700 p-2 rounded bg-slate-950 mb-2">
            <p>1. Respect all members of the community.</p>
            <p>2. No OOC toxicity or drama.</p>
            <p>3. Follow the realistic roleplay guidelines at all times.</p>
            <p>4. Your account is subject to moderator review and can be suspended at any time.</p>
            <p>5. By applying, you agree to our terms of service and community rules.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={data.acceptedRules} onChange={e => setData({...data, acceptedRules: e.target.checked})} className="rounded bg-slate-950 border-slate-700 text-indigo-600" />
            <span className="text-sm text-slate-300">I have read and agree to the rules and disclaimers.</span>
          </label>
        </div>

        <button disabled={isSubmitting || !data.acceptedRules} className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2">
          {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Application"}
        </button>
      </form>
    </Modal>
  );
};

const AuthScreen = ({ onLogin, onApply }: any) => {
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [showApply, setShowApply] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-3xl font-bold text-white">M</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2 text-white">Welcome back</h1>
        <p className="text-slate-500 text-center mb-8">Sign in to your account to continue</p>
        
        <form onSubmit={(e) => { e.preventDefault(); onLogin(loginData.identifier, loginData.password); }} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-400 ml-1">Account Identifier</label>
            <input required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 outline-none text-slate-100 focus:border-indigo-500 transition-colors" placeholder="Discord or Roblox name" value={loginData.identifier} onChange={e => setLoginData({...loginData, identifier: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-400 ml-1">Password</label>
            <input type="password" required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 outline-none text-slate-100 focus:border-indigo-500 transition-colors" placeholder="••••••••" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
          </div>
          <button className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-lg font-bold text-white shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]">Login</button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-slate-500 mb-4">Don't have an account yet?</p>
          <button onClick={() => setShowApply(true)} className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">Apply for a new account</button>
        </div>
      </div>
      
      {showApply && <ApplyModal onClose={() => setShowApply(false)} onApply={onApply} />}
      
      {IS_TEST_MODE && (
        <div className="mt-8 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl max-w-md text-center">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-1">Testing Mode Active</p>
          <p className="text-slate-400 text-sm">Supabase connection is optional. Applications will be simulated if not connected.</p>
        </div>
      )}
    </div>
  );
};

const SettingsView = ({ currentUser, onUpdateProfile, onLogout, authUser }: any) => {
  const [deleteReason, setDeleteReason] = useState<string | null>(null);
  const [deathDate, setDeathDate] = useState("");
  return (
    <div className="p-4 space-y-8 text-slate-100 text-slate-100 text-slate-100 text-slate-100 text-slate-100 text-slate-100 text-slate-100">
      <h2 className="text-xl font-bold text-white text-white text-white text-white">Settings</h2>
      <section className="space-y-4 text-slate-100 text-slate-100 text-slate-100 text-slate-100">
        <h3 className="font-bold text-slate-100 text-slate-100 text-slate-100 text-slate-100 text-slate-100 text-slate-100">Account Management</h3>
        {currentUser.accountType === 'CHARACTER' ? (
          <div className="p-4 bg-red-900/10 border border-red-900/20 rounded-xl space-y-4 text-slate-100 text-slate-100 text-slate-100 text-slate-100">
            <h4 className="font-bold text-red-400 text-red-400 text-red-400">Danger Zone</h4>
            {!deleteReason ? (
              <div className="grid gap-2 text-slate-100 text-slate-100 text-slate-100 text-slate-100"><button onClick={() => setDeleteReason('DECEASED')} className="w-full p-3 bg-slate-900 rounded-lg text-left text-slate-100 text-slate-100 text-slate-100 text-slate-100 text-slate-100">Deceased</button><button onClick={() => setDeleteReason('LIFE_SENTENCE')} className="w-full p-3 bg-slate-900 rounded-lg text-left text-slate-100 text-slate-100 text-slate-100 text-slate-100 text-slate-100">Life Sentence</button><button onClick={() => setDeleteReason('MISC')} className="w-full p-3 bg-slate-900 rounded-lg text-left text-slate-100 text-slate-100 text-slate-100 text-slate-100 text-slate-100">Misc / Delete</button></div>
            ) : (
              <div className="space-y-4 text-slate-100 text-slate-100">
                {deleteReason === 'DECEASED' && (<div className="space-y-2"><label className="text-sm">Death Date</label><input type="date" className="w-full bg-slate-950 p-2 rounded border border-slate-800 text-slate-100 text-slate-100 text-slate-100 text-slate-100 text-slate-100 text-slate-100" value={deathDate} onChange={e => setDeathDate(e.target.value)} /><button onClick={() => onUpdateProfile({ isDeceased: true, deathDate: new Date(deathDate).getTime(), isArchived: true })} className="w-full bg-red-600 p-2 rounded font-bold text-white text-white text-white text-white">Mark Deceased</button></div>)}
                {deleteReason === 'LIFE_SENTENCE' && (<button onClick={() => onUpdateProfile({ isImprisoned: true, imprisonmentDate: Date.now(), isArchived: true })} className="w-full bg-red-600 p-2 rounded font-bold text-white text-white text-white text-white text-white text-white">Confirm Life Sentence</button>)}
                {deleteReason === 'MISC' && (<div className="flex gap-2 text-white"><button onClick={() => { const n = Math.floor(Math.random()*9999); onUpdateProfile({ name: `[DELETED USER#${n}]`, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${n}`, bio: "", isArchived: true }); }} className="flex-1 bg-red-600 p-2 rounded font-bold text-white text-white text-white text-white text-white text-white text-white text-white">Full Delete</button><button onClick={() => onUpdateProfile({ isArchived: true })} className="flex-1 bg-slate-800 p-2 rounded font-bold text-white text-white text-white text-white text-white text-white text-white text-white">Archive</button></div>)}
                <button onClick={() => setDeleteReason(null)} className="w-full text-slate-500 text-sm">Cancel</button>
              </div>
            )}
          </div>
        ) : <p className="text-slate-500">Character settings only.</p>}
        {currentUser.isModerator && currentUser.isArchived && <button onClick={() => onUpdateProfile({ isArchived: false, isDeceased: false, isImprisoned: false })} className="w-full bg-green-600 p-3 rounded-xl font-bold text-white text-white text-white text-white text-white text-white">Unlock Account</button>}
      </section>
      <button onClick={onLogout} className="w-full bg-red-900/20 text-red-400 p-3 rounded-xl font-bold border border-red-900/50">Logout</button>
    </div>
  );
};

const EditProfileModal = ({ currentUser, onClose, onSave }: any) => {
  const [data, setData] = useState({ 
    name: currentUser.name, 
    bio: currentUser.bio, 
    avatar: currentUser.avatar,
    banner: currentUser.banner || "",
    career: currentUser.career || "",
    homeAddress: currentUser.homeAddress || "",
    showDiscord: currentUser.showDiscord,
    showRoblox: currentUser.showRoblox
  });
  const pfpRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  return (
    <Modal onClose={onClose} title="Edit Profile" large>
      <div className="space-y-6 text-slate-100 max-h-[80vh] overflow-y-auto pr-2">
        <div className="space-y-4">
           <div className="relative">
             <div className="h-32 w-full bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
               {data.banner && <img src={data.banner} className="w-full h-full object-cover" alt="banner" />}
             </div>
             <button onClick={() => bannerRef.current?.click()} className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 p-2 rounded-full text-white transition-colors">
               <ImageIcon size={20} />
             </button>
             <input type="file" ref={bannerRef} hidden accept="image/*" onChange={async (e) => { if(e.target.files?.[0]) setData({...data, banner: await fileToBase64(e.target.files[0])}); }} />
             
             <div className="absolute -bottom-6 left-4 flex items-end gap-2">
               <div className="relative">
                 <img src={data.avatar} className="w-20 h-20 rounded-full border-4 border-slate-900 bg-slate-800" alt="pfp" />
                 <button onClick={() => pfpRef.current?.click()} className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 hover:opacity-100 transition-opacity text-white">
                   <Edit2 size={20} />
                 </button>
               </div>
               <input type="file" ref={pfpRef} hidden accept="image/*" onChange={async (e) => { if(e.target.files?.[0]) setData({...data, avatar: await fileToBase64(e.target.files[0])}); }} />
             </div>
           </div>
        </div>

        <div className="mt-10 space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-400 ml-1">Display Name</label>
            <input className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none" value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder="Name" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-400 ml-1">Bio</label>
            <textarea className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 h-24 focus:ring-1 focus:ring-indigo-500 outline-none resize-none" value={data.bio} onChange={e => setData({...data, bio: e.target.value})} placeholder="Tell us about yourself..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-400 ml-1">Career</label>
              <input className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none" value={data.career} onChange={e => setData({...data, career: e.target.value})} placeholder="Your profession" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-400 ml-1">Home Address</label>
              <input className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none" value={data.homeAddress} onChange={e => setData({...data, homeAddress: e.target.value})} placeholder="Free text address" />
            </div>
          </div>
          
          <div className="p-4 bg-slate-800/50 rounded-xl space-y-3">
            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Visibility Settings</h4>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={data.showDiscord} onChange={e => setData({...data, showDiscord: e.target.checked})} className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-slate-200 group-hover:text-white transition-colors">Show Discord Handle</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={data.showRoblox} onChange={e => setData({...data, showRoblox: e.target.checked})} className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-slate-200 group-hover:text-white transition-colors">Show Roblox Username</span>
              </label>
            </div>
          </div>
        </div>
        
        <button onClick={() => onSave(data)} className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-xl font-bold text-white transition-all shadow-lg">Save Changes</button>
      </div>
    </Modal>
  );
};

const App = () => {
  console.log("App component rendering...");
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);
  const [bannedWords, setBannedWords] = useState<BannedWord[]>([]);
  const [authUserId, setAuthUserId] = useState<string | null>(() => localStorage.getItem("mimic_user_id"));
  const [activeAccountId, setActiveAccountId] = useState<string | null>(() => localStorage.getItem("mimic_active_id"));
  const [view, setView] = useState('home');
  const [messagingRecipientId, setMessagingRecipientId] = useState<string | null>(null);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showCharacterCreate, setShowCharacterCreate] = useState(false);
  const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const authUser = users.find(u => u.id === authUserId);
  const currentUser = users.find(u => u.id === (activeAccountId || authUserId)) || authUser;

  const fetchData = async () => {
    try {
      console.log("Fetching data from Supabase...");
      const [profilesRes, postsRes, maintRes, bwRes] = await Promise.all([
        supabase.from('profiles').select('*'), supabase.from('posts').select('*').order('created_at', { ascending: false }),
        supabase.from('maintenance').select('*').limit(1).maybeSingle(), supabase.from('banned_words').select('*')
      ]);
      if (profilesRes.data) setUsers(profilesRes.data.map((p: any) => ({
        id: p.id, handle: p.handle, name: p.display_name, avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.handle}`, banner: p.banner_url, bio: p.bio, isModerator: p.is_moderator, status: p.status, accountType: p.account_type || 'USER', parentUserId: p.parent_user_id, maxCharacters: p.max_characters, joinedAt: new Date(p.joined_at).getTime(), followers: [], following: [], isDeceased: p.is_deceased, deathDate: p.death_date ? new Date(p.death_date).getTime() : undefined, isImprisoned: p.is_imprisoned, imprisonmentDate: p.imprisonment_date ? new Date(p.imprisonment_date).getTime() : undefined, isArchived: p.is_archived, pastNames: p.past_names || [], themePreference: p.theme_preference, fontSizePreference: p.font_size_preference, blockedUsers: [], career: p.career, homeAddress: p.home_address, showDiscord: p.show_discord !== false, showRoblox: p.show_roblox !== false
      })));
      if (postsRes.data) setPosts(postsRes.data.map((p: any) => ({ id: p.id, authorId: p.author_id, content: p.content, media: p.media_url, mediaType: p.media_type, hashtags: p.hashtags || [], timestamp: new Date(p.created_at).getTime(), likes: [], commentsCount: 0 })));
      if (maintRes?.data) setMaintenance({ id: maintRes.data.id, isActive: maintRes.data.is_active, message: maintRes.data.message });
      if (bwRes?.data) setBannedWords(bwRes.data.map((b: any) => ({ id: b.id, word: b.word })));
      console.log("Data fetch complete.");
    } catch (e) {
      console.error("Data fetch failed:", e);
    }
  };
  useEffect(() => { fetchData(); }, []);
  const handleLogout = () => { setAuthUserId(null); setActiveAccountId(null); localStorage.removeItem("mimic_user_id"); localStorage.removeItem("mimic_active_id"); };
  const handleLogin = async (i: string, p: string) => {
    const { data } = await supabase.from('profiles').select('*').or(`roblox_username.eq."${i}",discord_username.eq."${i}"`).eq('password', p).single();
    
    if (!data) {
      alert("Invalid credentials. Please check your username and password.");
      return;
    }

    if (data.status === 'PENDING') {
      alert("Your application is still being processed. Please check back later!");
      return;
    }

    if (data.status === 'REJECTED') {
      alert("Your application has been rejected. Please contact a moderator for more information.");
      return;
    }

    if (data.status === 'APPROVED') {
      setAuthUserId(data.id);
      setActiveAccountId(data.id);
      localStorage.setItem("mimic_user_id", data.id);
      localStorage.setItem("mimic_active_id", data.id);
      fetchData();
    } else {
      alert("An unexpected error occurred with your account status.");
    }
  };
  const handleUpdateProfile = async (u: any) => {
    if (!currentUser) return;
    const upd: any = { ...u };
    if (u.name && u.name !== currentUser.name) { upd.display_name = u.name; upd.past_names = [...(currentUser.pastNames || []), currentUser.name]; }
    await supabase.from('profiles').update(upd).eq('id', currentUser.id); fetchData();
  };

  const handleCreateCharacter = async (e: any) => {
    e.preventDefault();
    if (!authUserId || !authUser) return;

    // Check character limit
    const existingCharacters = users.filter(u => u.parentUserId === authUserId);
    const limit = authUser.maxCharacters || 5;
    if (existingCharacters.length >= limit) {
      alert(`You have reached the maximum amount of characters (${limit}). Please delete a profile or DM an admin.`);
      return;
    }

    setIsCreatingCharacter(true);
    const d = new FormData(e.target);
    const name = d.get('name') as string;
    const rawHandle = d.get('handle') as string;
    const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
    const bio = d.get('bio') as string;

    try {
      const { error } = await supabase.from('profiles').insert({
        display_name: name,
        handle: handle,
        bio: bio,
        password: 'char',
        status: 'APPROVED',
        account_type: 'CHARACTER',
        parent_user_id: authUserId
      });

      if (error) {
        if (error.code === '23505') alert("This handle is already taken.");
        else alert("Error creating character: " + error.message);
      } else {
        setShowCharacterCreate(false);
        fetchData();
      }
    } catch (err: any) {
      alert("An unexpected error occurred: " + err.message);
    } finally {
      setIsCreatingCharacter(false);
    }
  };

  const handleApply = async (data: any) => {
    try {
      const handle = `@${data.name.toLowerCase().replace(/\s+/g, '')}${Math.floor(Math.random() * 999)}`;
      const { error } = await supabase.from('profiles').insert({
        display_name: data.name,
        handle: handle,
        bio: data.bio,
        discord_username: data.discord,
        roblox_username: data.roblox,
        password: data.password,
        status: 'PENDING',
        account_type: 'USER'
      });

      if (error) {
        if (error.code === '23505') alert("An account with this Discord or Roblox username already exists.");
        else alert("Error submitting application: " + error.message);
        return;
      }

      alert("Application submitted successfully! Please wait for a moderator to review your request.");
    } catch (err: any) {
      alert("Application failed: " + err.message);
    }
  };

  if (!currentUser) {
    console.log("No current user, showing AuthScreen");
    return <AuthScreen onLogin={handleLogin} onApply={handleApply} />;
  }

  console.log("Current user found, showing main layout");
  return (
    <Layout currentUser={currentUser} currentView={view} onNavigate={setView} onSwitchAccount={() => setShowSwitchModal(true)} pendingCount={users.filter(u => u.status === 'PENDING').length} posts={posts} maintenance={maintenance}>
      {view === 'home' && <Feed posts={posts} users={users} currentUser={currentUser} onLike={()=>{}} onPostCreated={async(d:any)=>{await supabase.from('posts').insert({ author_id: currentUser.id, content: d.content, media_url: d.media, media_type: d.mediaType, hashtags: extractHashtags(d.content) }); fetchData();}} onCommentClick={setCommentingPostId} onBlockUser={()=>{}} onReport={()=>{}} />}
      {view === 'messages' && <MessagesView currentUser={currentUser} users={users} initialRecipientId={messagingRecipientId} />}
      {view === 'profile' && (
        <div className="text-slate-100">
          <div className="relative">
            <div className="h-48 w-full bg-slate-800 overflow-hidden">
              {currentUser.banner && <img src={currentUser.banner} className="w-full h-full object-cover" alt="banner" />}
            </div>
            <div className="absolute -bottom-16 left-4">
              <img src={currentUser.avatar} className="w-32 h-32 rounded-full border-4 border-slate-950 bg-slate-800" alt="avatar" />
            </div>
            <div className="flex justify-end p-4 gap-2">
              {activeAccountId && activeAccountId !== currentUser.id && (
                <button onClick={() => { setMessagingRecipientId(currentUser.id); setView('messages'); }} className="border border-slate-700 hover:bg-slate-900 px-4 py-2 rounded-full font-bold transition-colors flex items-center gap-2"><Mail size={18} /> Message</button>
              )}
              {!currentUser.isArchived ? (
                <button onClick={() => setShowEditProfile(true)} className="border border-slate-700 hover:bg-slate-900 px-4 py-2 rounded-full font-bold transition-colors">Edit Profile</button>
              ) : (
                <span className="bg-slate-900/80 backdrop-blur px-4 py-2 rounded-full text-slate-500 font-bold border border-slate-800">Archived</span>
              )}
            </div>
          </div>
          
          <div className="mt-16 p-4 space-y-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {currentUser.name}
                {currentUser.isModerator && <ShieldAlert size={20} className="text-indigo-400" />}
              </h1>
              <p className="text-slate-500">{formatHandle(currentUser.handle)}</p>
            </div>

            {currentUser.bio && <p className="text-slate-200 whitespace-pre-wrap">{currentUser.bio}</p>}

            <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-slate-400">
              {currentUser.career && (
                <div className="flex items-center gap-1">
                  <Briefcase size={16} />
                  <span>{currentUser.career}</span>
                </div>
              )}
              {currentUser.homeAddress && (
                <div className="flex items-center gap-1">
                  <HomeIcon size={16} />
                  <span>{currentUser.homeAddress}</span>
                </div>
              )}
              {currentUser.showDiscord && currentUser.discord_username && (
                <div className="flex items-center gap-1">
                  <Mail size={16} />
                  <span>{currentUser.discord_username}</span>
                </div>
              )}
              {currentUser.showRoblox && currentUser.roblox_username && (
                <div className="flex items-center gap-1 text-indigo-400">
                  <Users size={16} />
                  <span>{currentUser.roblox_username}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <History size={16} />
                <span>Joined {new Date(currentUser.joinedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {currentUser.isDeceased && (
              <div className="p-3 bg-red-900/20 border border-red-900/30 rounded-xl text-red-400 flex items-center gap-2 font-bold">
                <Ban size={18} />
                <span>Deceased {currentUser.deathDate && `· ${new Date(currentUser.deathDate).toLocaleDateString()}`}</span>
              </div>
            )}
            {currentUser.isImprisoned && (
              <div className="p-3 bg-orange-900/20 border border-orange-900/30 rounded-xl text-orange-400 flex items-center gap-2 font-bold">
                <Lock size={18} />
                <span>Imprisoned in the Indiana State Pen</span>
              </div>
            )}

            {currentUser.pastNames && currentUser.pastNames.length > 0 && (
              <div className="text-xs text-slate-500 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                <span className="font-bold">Past Names:</span> {currentUser.pastNames.join(", ")}
              </div>
            )}

            <div className="mt-8 border-t border-slate-800">
              <div className="p-4 border-b border-slate-800 text-center font-bold text-indigo-400">Posts</div>
              {posts.filter(p => p.authorId === currentUser.id).map(p => <PostItem key={p.id} post={p} author={currentUser} currentUser={currentUser} onLike={()=>{}} onCommentClick={setCommentingPostId} />)}
            </div>
          </div>
        </div>
      )}
      {view === 'settings' && <SettingsView currentUser={currentUser} users={users} onUpdateProfile={handleUpdateProfile} authUser={authUser} onLogout={handleLogout} />}
      {view === 'moderator' && <ModeratorDashboard users={users} onReview={async(id:string,s:string)=>{await supabase.from('profiles').update({status:s}).eq('id',id);fetchData();}} />}
      {view === 'changelog' && ( <div className="p-4 text-slate-100 text-slate-100"><h2 className="text-xl font-bold mb-4">Changelog</h2><History /></div> )}
      {showSwitchModal && (
        <Modal onClose={() => setShowSwitchModal(false)} title="Switch Account">
          <div className="space-y-2">
            {[authUser, ...users.filter((u: User) => u.parentUserId === authUserId)].map((u: any) => {
              if (!u) return null;
              const isArchived = u.isArchived && !currentUser.isModerator;
              return (
                <button key={u.id} disabled={isArchived} onClick={()=>{setActiveAccountId(u.id); localStorage.setItem("mimic_active_id", u.id); setShowSwitchModal(false);}} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${currentUser.id === u.id ? 'bg-indigo-600/20 border border-indigo-500' : 'hover:bg-slate-800 border border-transparent'} ${isArchived ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
                  <img src={u.avatar} className="w-10 h-10 rounded-full bg-slate-800" alt="avatar" />
                  <div className="text-left flex-1 overflow-hidden"><p className="font-bold truncate">{u.name}</p><p className="text-slate-500 text-sm truncate">{formatHandle(u.handle)} {u.isArchived && "(Archived)"}</p></div>
                  {currentUser.id === u.id && <CheckCircle size={20} className="text-indigo-400" />}{isArchived && <Lock size={16} className="text-slate-500" />}
                </button>
              );
            })}
            <div className="pt-2 border-t border-slate-800 mt-2 space-y-2"><button onClick={()=>{setShowSwitchModal(false); setShowCharacterCreate(true);}} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-all text-indigo-400 font-semibold"><PlusCircle size={20} /> Create Character Account</button></div>
          </div>
        </Modal>
      )}
      {showCharacterCreate && (
        <Modal onClose={() => !isCreatingCharacter && setShowCharacterCreate(false)} title="Create Character">
          <form onSubmit={handleCreateCharacter} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-400 ml-1">Character Name</label>
              <input name="name" required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 outline-none text-slate-100 focus:border-indigo-500 transition-colors" placeholder="e.g. John Doe" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-400 ml-1">Handle</label>
              <input name="handle" required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 outline-none text-slate-100 focus:border-indigo-500 transition-colors" placeholder="@handle" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-400 ml-1">Bio</label>
              <textarea name="bio" required className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 outline-none h-24 text-slate-100 focus:border-indigo-500 transition-colors resize-none" placeholder="Tell us about your character..." />
            </div>
            <button disabled={isCreatingCharacter} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
              {isCreatingCharacter ? <Loader2 className="animate-spin" /> : "Create Character"}
            </button>
          </form>
        </Modal>
      )}
      {showEditProfile && (
        <EditProfileModal 
          currentUser={currentUser} 
          onClose={() => setShowEditProfile(false)} 
          onSave={async (data: any) => {
            await handleUpdateProfile({
              display_name: data.name,
              bio: data.bio,
              avatar_url: data.avatar,
              banner_url: data.banner,
              career: data.career,
              home_address: data.homeAddress,
              show_discord: data.showDiscord,
              show_roblox: data.showRoblox
            });
            setShowEditProfile(false);
          }} 
        />
      )}
      {commentingPostId && <CommentModal post={posts.find(p=>p.id===commentingPostId)} author={users.find(u=>u.id===posts.find(p=>p.id===commentingPostId)?.authorId)} users={users} currentUser={currentUser} onClose={()=>setCommentingPostId(null)} onCommentSubmit={fetchData} />}
    </Layout>
  );
};

try {
  console.log("Initializing React root...");
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Failed to find the root element");
  }
  createRoot(rootElement).render(<App />);
  console.log("React root rendered.");
} catch (error) {
  console.error("CRITICAL ERROR during initialization:", error);
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `<div style="padding: 20px; color: white; background: red;"><h1>Critical Error</h1><p>${(error as any).message}</p></div>`;
  }
}
