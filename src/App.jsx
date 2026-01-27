import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, FileText, LogOut, Printer, Save, Calendar, Clock, 
  UserCheck, CheckCircle, Search, Trash2, Edit, 
  Settings, Upload, Download, ChevronDown, ChevronRight, Key, 
  RefreshCcw, FileDown, XCircle, Menu, X, LayoutDashboard, Activity, Briefcase, Lock, Shield, Clipboard, ChevronLeft, AlertTriangle, ArrowDownCircle
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  deleteDoc,
  updateDoc, 
  onSnapshot, 
  writeBatch,
  query,
  where,
  getDocs
} from "firebase/firestore";

// --- KONFIGURASI DATABASE (MANUAL) ---
const firebaseConfig = {
  apiKey: "AIzaSyDzbUR3Xmq6YKJ86isokmWqwK5DZ5gYr6U",
  authDomain: "absensi-bpkad-taliabu.firebaseapp.com",
  projectId: "absensi-bpkad-taliabu",
  storageBucket: "absensi-bpkad-taliabu.firebasestorage.app",
  messagingSenderId: "19605510407",
  appId: "1:19605510407:web:0d606b240ed64c0b604da2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Default Data
const DEFAULT_LOGO_URL = "https://play-lh.googleusercontent.com/FXc0mf6YaPS9bgd1JIUN8AHu-y53Ukbz0lW3hmD3F4CR9xXuMO6TrXqxqnm_-PcA9UfD=w600-h300-pc0xffffff-pd";

// Helper Path Firestore
const getCollectionPath = (collName) => {
    return collection(db, 'artifacts', appId, 'public', 'data', collName);
};

// --- INITIAL SEEDING ---
const INITIAL_ADMIN = {
  username: 'admin',
  password: 'admin123',
  role: 'admin',
  nama: 'Administrator BPKAD',
  jabatan: 'Super Admin',
  no: '0'
};

const INITIAL_SETTINGS = {
  opdName: 'Badan Pengelolaan Keuangan dan Aset Daerah',
  opdShort: 'BPKAD',
  parentAgency: 'Pemerintah Kabupaten Pulau Taliabu',
  address: 'Jl. Merdeka No. 1, Bobong, Pulau Taliabu',
  logoUrl: DEFAULT_LOGO_URL,
  kepalaName: '',
  kepalaNip: '',
  kepalaJabatan: 'Kepala BPKAD'
};

// --- UTILS ---
const formatDateIndo = (dateStr) => {
  if (!dateStr) return '';
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString('id-ID', options);
};

const formatDateNoWeekday = (dateStr) => {
  if (!dateStr) return '';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString('id-ID', options);
};

const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return weekNo;
};

const checkAbsensiTime = (session) => {
  const now = new Date();
  const hour = now.getHours();
  // Pagi: 07.00 - 09.00
  if (session === 'Pagi') {
    return hour >= 7 && hour < 9; 
  }
  // Sore: 16.00 - 17.00
  if (session === 'Sore') {
    return hour >= 16 && hour < 17;
  }
  return false;
};

const exportToCSV = (data, filename) => {
  const csvContent = "data:text/csv;charset=utf-8," 
    + data.map(e => Object.values(e).join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- MAIN COMPONENT ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [appUser, setAppUser] = useState(null); 
  
  // Data States
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [holidays, setHolidays] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('admin_dashboard'); 
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Desktop Sidebar State (Default open)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  // Firebase Auth & Listeners
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Login Error:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (user) => { 
        if (user) setFirebaseUser(user); 
    });
    return () => unsubscribe();
  }, []);

  // Seed Admin Check (One Time)
  useEffect(() => {
    if (!firebaseUser) return;
    const seedAdminIfEmpty = async () => {
       try {
         const usersRef = getCollectionPath('users');
         const snapshot = await getDocs(usersRef);
         if (snapshot.empty) {
            const adminRef = doc(usersRef, 'admin_master');
            await setDoc(adminRef, INITIAL_ADMIN);
         }
       } catch (error) { console.error(error); }
    };
    seedAdminIfEmpty();
  }, [firebaseUser]);

  // Fetch Data (Optimized Loading)
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubEmp = onSnapshot(getCollectionPath('users'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(data);
      setLoading(false); // Optimize loading
    }, (error) => console.error("Error fetching users:", error));

    const unsubAtt = onSnapshot(getCollectionPath('attendance'), (snap) => {
      setAttendance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error fetching attendance:", error));

    const unsubSet = onSnapshot(getCollectionPath('settings'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length > 0) setSettings(data[0]);
      else addDoc(getCollectionPath('settings'), INITIAL_SETTINGS);
    }, (error) => console.error("Error fetching settings:", error));

    const unsubHol = onSnapshot(getCollectionPath('holidays'), (snap) => {
       setHolidays(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error fetching holidays:", error));

    return () => { unsubEmp(); unsubAtt(); unsubSet(); unsubHol(); };
  }, [firebaseUser]);

  const handleLogin = (username, password) => {
    const user = employees.find(u => u.username === username && u.password === password);
    if (user) {
      setAppUser(user);
      setActiveTab('admin_dashboard'); 
    } else {
      alert('Username atau password salah!');
    }
  };

  const handleLogout = () => {
    setAppUser(null);
    setActiveTab('admin_dashboard');
    setIsMobileMenuOpen(false);
  };

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="relative flex items-center justify-center mb-8">
         <div className="absolute w-24 h-24 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
         <div className="relative bg-white p-4 rounded-full shadow-xl">
           <img src={DEFAULT_LOGO_URL} className="w-16 h-16 object-contain animate-bounce" alt="Loading" />
         </div>
      </div>
      <h2 className="text-xl font-bold text-slate-700 mb-2 tracking-wide">SI-ABSENSI</h2>
      <div className="flex gap-2">
        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce"></div>
      </div>
      <p className="mt-6 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Memuat Data Aplikasi...</p>
    </div>
  );

  if (!appUser) return <LoginPage onLogin={handleLogin} settings={settings} />;

  const isManagement = ['admin', 'operator', 'pengelola'].includes(appUser.role);
  const pendingCount = attendance.filter(l => l.statusApproval === 'pending').length;
  
  // Tentukan orientasi cetak berdasarkan tab yang aktif
  const isLandscape = activeTab === 'cetak_manual';

  return (
    <div className="h-screen bg-gray-50 flex flex-col md:flex-row print:bg-white print:block print:h-auto text-slate-800 overflow-hidden">
      
      {/* MOBILE HEADER */}
      <div id="mobile-header" className="md:hidden bg-blue-900 text-white p-4 flex justify-between items-center print:hidden shadow-md z-50 flex-shrink-0">
         <div className="flex items-center gap-2">
            <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="w-8 h-8 object-contain bg-white rounded-full p-0.5"/>
            <span className="font-bold text-sm">{settings.opdShort}</span>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="focus:outline-none">
            {isMobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
         </button>
      </div>

      {/* SIDEBAR */}
      <div id="sidebar-container" className={`
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0
          transition-all duration-300 ease-in-out
          ${isDesktopSidebarOpen ? 'md:w-64' : 'md:w-0 md:overflow-hidden'}
          bg-slate-900 
          text-white 
          flex-shrink-0 
          print:hidden 
          shadow-xl 
          z-40
          absolute md:relative 
          w-64 h-full
          flex flex-col
      `}>
         <button 
            onClick={() => setIsDesktopSidebarOpen(false)} 
            className="hidden md:flex absolute top-4 right-[-12px] z-50 bg-slate-800 text-white p-1 rounded-full border border-slate-700 shadow-md hover:bg-slate-700"
            title="Tutup Sidebar"
         >
            <ChevronLeft size={16} />
         </button>

         <SidebarContent 
            user={appUser} 
            activeTab={activeTab} 
            setActiveTab={(tab) => { setActiveTab(tab); setIsMobileMenuOpen(false); }} 
            onLogout={handleLogout} 
            settings={settings} 
            pendingCount={pendingCount}
         />
      </div>
      
      {/* MAIN CONTENT */}
      <main id="main-content" className="flex-1 p-4 md:p-8 overflow-y-auto print:p-0 print:overflow-visible print:h-auto print:block relative">
        {!isDesktopSidebarOpen && (
           <button 
              onClick={() => setIsDesktopSidebarOpen(true)}
              className="hidden md:flex absolute top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-lg shadow-lg hover:bg-slate-800 print:hidden items-center gap-2"
           >
              <Menu size={20} />
              <span className="text-xs font-bold">MENU</span>
           </button>
        )}

        <style>{`
          @media print {
            @page {
               size: ${isLandscape ? 'landscape' : 'portrait'};
               margin: 10mm;
            }
            body { 
               -webkit-print-color-adjust: exact; 
               print-color-adjust: exact;
               height: auto !important;
               overflow: visible !important;
            }
            #sidebar-container, #mobile-header, button {
               display: none !important;
            }
            #main-content {
               width: 100% !important;
               margin: 0 !important;
               padding: 0 !important;
               overflow: visible !important;
               display: block !important;
            }
            .flex-col { display: block !important; }
            .md\\:flex-row { display: block !important; }
          }
        `}</style>

        {isManagement && (
          <>
            {activeTab === 'admin_dashboard' && <AdminDashboard employees={employees} attendance={attendance} settings={settings} />}
            {activeTab === 'input_absensi' && <AdminInputAbsensi employees={employees} attendance={attendance} />}
            {activeTab === 'laporan_harian' && <AdminLaporanHarian employees={employees} attendance={attendance} settings={settings} holidays={holidays} />}
            {activeTab === 'laporan_bulanan' && <AdminRekapanBulanan employees={employees} attendance={attendance} settings={settings} user={appUser} />}
            {activeTab === 'cetak_manual' && <AdminCetakAbsensiManual employees={employees} settings={settings} holidays={holidays} />} 
            {activeTab === 'terima_absensi' && <AdminTerimaAbsensi employees={employees} attendance={attendance} />}
            {activeTab === 'data_pegawai' && <AdminDataPegawai employees={employees} currentUser={appUser} />}
            {activeTab === 'settings' && <AdminSettings settings={settings} holidays={holidays} employees={employees} user={appUser} />}
          </>
        )}

        {appUser.role === 'user' && (
          <>
            {activeTab === 'admin_dashboard' && <AdminDashboard employees={employees} attendance={attendance} settings={settings} />}
            {activeTab === 'user_absensi' && <UserAbsensi user={appUser} attendance={attendance} holidays={holidays} />}
            {activeTab === 'user_laporan_status' && <UserLaporanStatus user={appUser} attendance={attendance} />}
            {activeTab === 'user_laporan_harian' && <AdminLaporanHarian employees={employees} attendance={attendance} settings={settings} isUserView={true} holidays={holidays} />}
            {activeTab === 'user_rekapan' && <UserRekapan user={appUser} attendance={attendance} settings={settings} />}
            {activeTab === 'cetak_manual' && <AdminCetakAbsensiManual employees={employees} settings={settings} holidays={holidays} />}
          </>
        )}
      </main>
    </div>
  );
}

// ... LoginPage & SidebarContent (Same as previous) ...
function LoginPage({ onLogin, settings }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const displayLogo = settings.logoUrl || DEFAULT_LOGO_URL;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-200 p-4" style={{
      backgroundImage: `url('https://www.transparenttextures.com/patterns/cubes.png')`
    }}>
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-8 border-blue-600">
        <div className="text-center mb-8">
           <div className="h-24 w-full flex items-center justify-center mb-4">
              <img src={displayLogo} alt="Logo" className="max-h-full object-contain drop-shadow-md"/>
           </div>
           <h1 className="text-xl font-bold uppercase text-blue-900 tracking-wider">Aplikasi Absensi</h1>
           <p className="text-sm font-semibold text-slate-600 uppercase">{settings.opdName}</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); onLogin(u,p); }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
            <input className="w-full p-3 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              value={u} onChange={e=>setU(e.target.value)} placeholder="Username" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
            <input type="password" className="w-full p-3 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              value={p} onChange={e=>setP(e.target.value)} placeholder="Password" />
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded shadow-lg transition-transform transform hover:scale-105">
            LOGIN APLIKASI
          </button>
        </form>
        <div className="mt-6 text-center text-xs text-gray-400">
           &copy; {new Date().getFullYear()} {settings.opdShort} Taliabu
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ user, activeTab, setActiveTab, onLogout, settings, pendingCount }) {
  const btnClass = (id) => `w-full text-left p-3 mb-1 rounded flex items-center justify-between transition-colors font-medium text-sm
    ${activeTab === id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`;

  const LogoImg = settings.logoUrl || DEFAULT_LOGO_URL;
  const isManagement = ['admin', 'operator', 'pengelola'].includes(user.role);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-5 bg-slate-800 border-b border-slate-700 flex items-center gap-3 flex-shrink-0">
        <img src={LogoImg} className="w-10 h-10 object-contain bg-white rounded-full p-0.5"/>
        <div className="overflow-hidden">
           <h1 className="font-bold text-lg leading-tight truncate">{settings.opdShort}</h1>
           <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-blue-400 uppercase tracking-wide truncate block">{user.role}</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {isManagement ? (
          <>
            <button onClick={()=>setActiveTab('admin_dashboard')} className={btnClass('admin_dashboard')}>
               <div className="flex items-center"><LayoutDashboard size={16} className="mr-3"/> Dashboard</div>
            </button>
            
            <div className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2 px-2 flex items-center"><ChevronDown size={12} className="mr-1"/>Absensi</div>
            <button onClick={()=>setActiveTab('input_absensi')} className={btnClass('input_absensi')}>
               <div className="flex items-center"><UserCheck size={16} className="mr-3"/> Input Absensi</div>
            </button>
            
            {/* BUTTON TERIMA ABSENSI DENGAN BADGE NOTIFIKASI */}
            <button onClick={()=>setActiveTab('terima_absensi')} className={btnClass('terima_absensi')}>
               <div className="flex items-center"><CheckCircle size={16} className="mr-3"/> Terima Absensi</div>
               {pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                     {pendingCount}
                  </span>
               )}
            </button>
            
            <div className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2 px-2 flex items-center"><ChevronDown size={12} className="mr-1"/>Laporan</div>
            <button onClick={()=>setActiveTab('laporan_harian')} className={btnClass('laporan_harian')}>
               <div className="flex items-center"><FileText size={16} className="mr-3"/> Laporan Harian</div>
            </button>
            <button onClick={()=>setActiveTab('laporan_bulanan')} className={btnClass('laporan_bulanan')}>
               <div className="flex items-center"><Calendar size={16} className="mr-3"/> Rekapan Bulanan</div>
            </button>
            <button onClick={()=>setActiveTab('cetak_manual')} className={btnClass('cetak_manual')}>
               <div className="flex items-center"><Clipboard size={16} className="mr-3"/> Cetak Absensi Manual</div>
            </button>
            
            <div className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2 px-2 flex items-center"><ChevronDown size={12} className="mr-1"/>Manajemen</div>
            <button onClick={()=>setActiveTab('data_pegawai')} className={btnClass('data_pegawai')}>
               <div className="flex items-center"><Users size={16} className="mr-3"/> Data Pegawai</div>
            </button>
            <button onClick={()=>setActiveTab('settings')} className={btnClass('settings')}>
               <div className="flex items-center"><Settings size={16} className="mr-3"/> Pengaturan</div>
            </button>
          </>
        ) : (
          <>
             <button onClick={()=>setActiveTab('admin_dashboard')} className={btnClass('admin_dashboard')}>
               <div className="flex items-center"><LayoutDashboard size={16} className="mr-3"/> Dashboard</div>
             </button>
             
             <div className="text-xs font-bold text-slate-500 uppercase mt-2 mb-2 px-2 flex items-center"><ChevronDown size={12} className="mr-1"/>Menu Pegawai</div>
             <button onClick={()=>setActiveTab('user_absensi')} className={btnClass('user_absensi')}>
               <div className="flex items-center"><UserCheck size={16} className="mr-3"/> Absensi Mandiri</div>
             </button>
             <button onClick={()=>setActiveTab('user_laporan_status')} className={btnClass('user_laporan_status')}>
               <div className="flex items-center"><Clock size={16} className="mr-3"/> Status Absensi</div>
             </button>
             <button onClick={()=>setActiveTab('user_laporan_harian')} className={btnClass('user_laporan_harian')}>
               <div className="flex items-center"><FileText size={16} className="mr-3"/> Laporan Harian</div>
             </button>
             <button onClick={()=>setActiveTab('user_rekapan')} className={btnClass('user_rekapan')}>
               <div className="flex items-center"><Calendar size={16} className="mr-3"/> Rekapan Saya</div>
             </button>
             <button onClick={()=>setActiveTab('cetak_manual')} className={btnClass('cetak_manual')}>
               <div className="flex items-center"><Clipboard size={16} className="mr-3"/> Cetak Absensi Manual</div>
             </button>
          </>
        )}
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800 flex-shrink-0">
         <div className="mb-4">
            <p className="text-sm font-semibold truncate">{user.nama}</p>
            <p className="text-xs text-slate-400 truncate">{user.jabatan}</p>
         </div>
         <button onClick={onLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded flex items-center justify-center text-sm transition-colors">
            <LogOut size={16} className="mr-2"/> Log Out
         </button>
      </div>
    </div>
  );
}

// ================= ADMIN PAGES =================

function AdminDashboard({ employees, attendance, settings }) {
  const [date, setDate] = useState(getTodayString());
  const [session, setSession] = useState(() => {
     const h = new Date().getHours();
     return h >= 12 ? 'Sore' : 'Pagi';
  });

  const pegawaiOnly = employees.filter(e => e.role === 'user'); 
  const logs = attendance.filter(l => l.date === date && l.session === session && l.statusApproval === 'approved');
  
  const hadir = logs.filter(l => l.status === 'Hadir').length;
  const sakit = logs.filter(l => l.status === 'Sakit').length;
  const izin = logs.filter(l => l.status === 'Izin').length;
  const cuti = logs.filter(l => l.status === 'Cuti').length;
  const dl = logs.filter(l => l.status === 'Dinas Luar').length;
  
  const recordedIds = logs.map(l => l.userId);
  const alpa = pegawaiOnly.length - recordedIds.length;

  return (
    <div className="p-2 md:p-6">
       <div className="bg-slate-800 text-white p-6 rounded-xl flex items-center gap-6 mb-8 shadow-xl">
          <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="w-20 h-20 bg-white rounded-full p-1 object-contain"/>
          <div>
             <h2 className="text-xl font-bold uppercase">{settings.opdName}</h2>
             <p className="text-slate-400 text-sm uppercase tracking-wide">{settings.parentAgency}</p>
             <p className="text-xs text-slate-500 mt-1">{settings.address}</p>
          </div>
       </div>

       <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <h1 className="text-2xl font-bold text-slate-800">Dashboard Statistik</h1>
             <p className="text-slate-500">Ringkasan Data Absensi: <span className="font-bold text-blue-600">{session}</span></p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm border">
                <span className="text-sm font-bold text-slate-600">Sesi:</span>
                <select value={session} onChange={e=>setSession(e.target.value)} className="outline-none text-slate-700 bg-transparent font-bold">
                   <option>Pagi</option>
                   <option>Sore</option>
                </select>
             </div>
             <div className="flex items-center gap-2 bg-white p-2 rounded shadow-sm border">
                <span className="text-sm font-bold text-slate-600">Tanggal:</span>
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="outline-none text-slate-700"/>
             </div>
          </div>
       </div>

       {/* CARD STATISTICS */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 rounded-xl shadow-lg text-white relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-blue-100 uppercase text-xs tracking-wider">Total Pegawai</h3>
                   <Users className="text-blue-200" size={24}/>
                </div>
                <p className="text-4xl font-bold">{pegawaiOnly.length}</p>
             </div>
             <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-2 translate-y-2">
                <Users size={100}/>
             </div>
          </div>

          <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 rounded-xl shadow-lg text-white relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-green-100 uppercase text-xs tracking-wider">Hadir ({session})</h3>
                   <UserCheck className="text-green-200" size={24}/>
                </div>
                <p className="text-4xl font-bold">{hadir}</p>
             </div>
             <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-2 translate-y-2">
                <UserCheck size={100}/>
             </div>
          </div>

          <div className="bg-gradient-to-r from-red-600 to-red-500 p-6 rounded-xl shadow-lg text-white relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-red-100 uppercase text-xs tracking-wider">Belum Absen</h3>
                   <XCircle className="text-red-200" size={24}/>
                </div>
                <p className="text-4xl font-bold">{alpa}</p>
             </div>
             <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-2 translate-y-2">
                <XCircle size={100}/>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500 flex items-center justify-between">
             <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Sakit</p>
                <p className="text-2xl font-bold text-slate-700">{sakit}</p>
             </div>
             <Activity className="text-yellow-500 opacity-50"/>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500 flex items-center justify-between">
             <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Izin</p>
                <p className="text-2xl font-bold text-slate-700">{izin}</p>
             </div>
             <FileText className="text-orange-500 opacity-50"/>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500 flex items-center justify-between">
             <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Cuti</p>
                <p className="text-2xl font-bold text-slate-700">{cuti}</p>
             </div>
             <Calendar className="text-purple-500 opacity-50"/>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-teal-500 flex items-center justify-between">
             <div>
                <p className="text-xs text-gray-500 font-bold uppercase">Dinas Luar</p>
                <p className="text-2xl font-bold text-slate-700">{dl}</p>
             </div>
             <Briefcase className="text-teal-500 opacity-50"/>
          </div>
       </div>
    </div>
  );
}

function AdminInputAbsensi({ employees, attendance }) {
  const [date, setDate] = useState(getTodayString());
  const [session, setSession] = useState('Pagi');
  const [inputs, setInputs] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const pegawaiList = employees.filter(e => e.role === 'user');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12) setSession('Sore');
  }, []);

  useEffect(() => {
    const map = {};
    attendance.forEach(l => {
      if (l.date === date && l.session === session) {
        map[l.userId] = l.status;
      }
    });
    setInputs(map);
  }, [date, session, attendance]);

  const handleSave = async () => {
    const batch = writeBatch(db);
    let count = 0;

    for (const emp of pegawaiList) {
       const status = inputs[emp.id];
       const existingLog = attendance.find(l => l.date === date && l.session === session && l.userId === emp.id);
       
       if (status) {
         const logData = {
           date, session, userId: emp.id, userName: emp.nama, status,
           statusApproval: 'approved', timestamp: new Date().toISOString()
         };
         if (existingLog) {
            batch.update(doc(getCollectionPath('attendance'), existingLog.id), logData);
         } else {
            batch.set(doc(getCollectionPath('attendance'), `${date}_${session}_${emp.id}`), logData);
         }
         count++;
       } else {
         if (existingLog) {
           batch.delete(doc(getCollectionPath('attendance'), existingLog.id));
         }
       }
    }
    await batch.commit();
    alert('Data absensi berhasil disimpan!');
  };

  const statusOptions = ['Hadir','Izin','Sakit','Cuti','Dinas Luar'];

  // Filter daftar pegawai berdasarkan pencarian DAN URUTKAN ABJAD
  const filteredPegawaiList = pegawaiList
    .filter(emp =>
      emp.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.jabatan.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.nama.localeCompare(b.nama));

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4 flex items-center text-slate-800"><UserCheck className="mr-2"/> Input Absensi Pegawai</h2>
      
      <div className="flex flex-wrap gap-4 mb-6 bg-slate-100 p-4 rounded-lg items-end sticky top-0 z-10 shadow-sm">
        <div>
          <label className="block text-xs font-bold uppercase mb-1">Tanggal</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border p-2 rounded w-40"/>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase mb-1">Sesi</label>
          <select value={session} onChange={e=>setSession(e.target.value)} className="border p-2 rounded w-40">
            <option>Pagi</option>
            <option>Sore</option>
          </select>
        </div>
        {/* Fitur Pencarian Baru */}
        <div className="flex-1 min-w-[200px]">
             <label className="block text-xs font-bold uppercase mb-1">Cari Pegawai</label>
             <div className="relative">
                <Search className="absolute left-2 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Ketik nama pegawai..."
                  className="border p-2 pl-8 rounded w-full"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
        </div>
        <div className="flex ml-auto gap-2">
           <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center font-bold text-sm">
             <Save size={16} className="mr-2"/> Simpan Absensi
           </button>
        </div>
      </div>

      <div className="overflow-x-auto border-2 border-slate-300 rounded-lg">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-200 text-slate-700 uppercase text-xs">
             <tr>
               <th className="p-3 text-left border border-slate-300">Nama Pegawai / Jabatan</th>
               <th className="p-3 text-center border border-slate-300">Status Kehadiran</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
             {filteredPegawaiList.map(emp => (
               <tr key={emp.id} className="hover:bg-slate-50">
                 <td className="p-3 border border-slate-300 bg-slate-50 font-medium">
                   <div className="font-bold text-slate-800">{emp.nama}</div>
                   <div className="text-xs text-slate-500">{emp.jabatan}</div>
                 </td>
                 <td className="p-3 border border-slate-300">
                   <div className="flex justify-center gap-4 flex-wrap">
                     {statusOptions.map(st => (
                       <label key={st} className="flex items-center cursor-pointer space-x-2">
                         <div className="relative flex items-center">
                           <input 
                             type="radio" 
                             name={`status-${emp.id}`}
                             checked={inputs[emp.id] === st}
                             onChange={()=>setInputs({...inputs, [emp.id]: st})}
                             className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                           />
                         </div>
                         <span className={`text-xs font-bold ${inputs[emp.id] === st ? 'text-blue-700' : 'text-slate-600'}`}>
                           {st.toUpperCase()}
                         </span>
                       </label>
                     ))}
                     
                     <label className="flex items-center cursor-pointer space-x-2 border-l pl-4 ml-2 border-slate-300">
                        <div className="relative flex items-center">
                           <input 
                             type="radio" 
                             name={`status-${emp.id}`}
                             checked={!inputs[emp.id]}
                             onChange={()=>{
                               const next = {...inputs};
                               delete next[emp.id];
                               setInputs(next);
                             }}
                             className="w-5 h-5 text-red-600 border-gray-300 focus:ring-red-500 cursor-pointer accent-red-600"
                           />
                        </div>
                        <span className={`text-xs font-bold ${!inputs[emp.id] ? 'text-red-600' : 'text-slate-400'}`}>
                           ALPA
                        </span>
                     </label>
                   </div>
                 </td>
               </tr>
             ))}
             {filteredPegawaiList.length === 0 && (
                <tr>
                    <td colSpan="2" className="p-4 text-center text-slate-500 italic">
                        Tidak ada pegawai dengan nama "{searchTerm}"
                    </td>
                </tr>
             )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
         <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-3 rounded shadow-lg hover:bg-blue-700 flex items-center font-bold text-base transition-transform transform hover:scale-105">
             <Save size={20} className="mr-2"/> Simpan Absensi
         </button>
      </div>
    </div>
  );
}

function AdminLaporanHarian({ employees, attendance, settings, holidays }) {
  const [date, setDate] = useState(getTodayString());
  const [session, setSession] = useState('Pagi');
  const [printTemplate, setPrintTemplate] = useState('v1');
  const pegawaiOnly = employees.filter(e => e.role === 'user').sort((a, b) => a.nama.localeCompare(b.nama));

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12) setSession('Sore');
  }, []);

  // --- LOGIKA HARI LIBUR & WEEKEND ---
  const selectedDate = new Date(date);
  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6; // 0=Minggu, 6=Sabtu
  const holidayData = holidays.find(h => h.date === date);
  
  const isNonEffective = isWeekend || !!holidayData;

  const logs = attendance.filter(l => l.date === date && l.session === session && l.statusApproval === 'approved');
  
  const hadir = logs.filter(l => l.status === 'Hadir').length;
  const izin = logs.filter(l => l.status === 'Izin').length;
  const sakit = logs.filter(l => l.status === 'Sakit').length;
  const cuti = logs.filter(l => l.status === 'Cuti').length;
  const dl = logs.filter(l => l.status === 'Dinas Luar').length;
  
  const recordedIds = logs.map(l => l.userId);
  const alpaList = pegawaiOnly.filter(e => !recordedIds.includes(e.id));
  const alpa = alpaList.length;

  const totalPegawai = pegawaiOnly.length;
  const totalTidakHadir = izin + sakit + cuti + dl + alpa;
  const totalHadirFisik = hadir; 

  const listTidakHadir = pegawaiOnly.map(emp => {
     const log = logs.find(l => l.userId === emp.id);
     if (!log) return { ...emp, status: 'Alpa (Tanpa Ket.)' };
     if (log.status !== 'Hadir') return { ...emp, status: log.status };
     return null; 
  }).filter(Boolean); 

  const statusPriority = {
    'Alpa (Tanpa Ket.)': 1,
    'Dinas Luar': 2,
    'Izin': 3,
    'Sakit': 4,
    'Cuti': 5
  };

  listTidakHadir.sort((a, b) => {
     const pA = statusPriority[a.status] || 99;
     const pB = statusPriority[b.status] || 99;
     return pA - pB;
  });

  // Calculate lists for new rows
  const dlList = pegawaiOnly.filter(e => logs.some(l => l.userId === e.id && l.status === 'Dinas Luar'));
  const sakitList = pegawaiOnly.filter(e => logs.some(l => l.userId === e.id && l.status === 'Sakit'));
  const izinList = pegawaiOnly.filter(e => logs.some(l => l.userId === e.id && l.status === 'Izin'));
  const cutiList = pegawaiOnly.filter(e => logs.some(l => l.userId === e.id && l.status === 'Cuti'));


  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded shadow print:hidden flex flex-wrap items-end gap-4">
         <div>
           <label className="text-xs font-bold block mb-1">Tanggal</label>
           <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border p-2 rounded"/>
         </div>
         <div>
           <label className="text-xs font-bold block mb-1">Sesi</label>
           <select value={session} onChange={e=>setSession(e.target.value)} className="border p-2 rounded w-32">
             <option>Pagi</option>
             <option>Sore</option>
           </select>
         </div>
         <div>
            <label className="text-xs font-bold block mb-1">Model Cetak</label>
            <select value={printTemplate} onChange={e=>setPrintTemplate(e.target.value)} className="border p-2 rounded w-48 bg-yellow-50 border-yellow-300">
               <option value="v1">Model 1 (Standar)</option>
               <option value="v2">Model 2 (Tabel Ringkas)</option>
            </select>
         </div>
         <button onClick={()=>window.print()} className="bg-slate-800 text-white px-4 py-2 rounded flex items-center ml-auto hover:bg-black">
            <Printer size={18} className="mr-2"/> Cetak Laporan
         </button>
      </div>

      <div className="bg-white p-10 rounded shadow-lg print:shadow-none print:w-full print:p-0">
         {/* KOP SURAT */}
         <div className="flex border-b-4 border-double border-black pb-4 mb-6 items-center justify-center relative">
            <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="h-20 absolute left-0"/>
            <div className="text-center px-20">
               <h3 className="text-xl font-bold uppercase">{settings.parentAgency}</h3>
               <h1 className="text-xl font-bold uppercase">{settings.opdName}</h1>
               <p className="text-sm italic">{settings.address}</p>
            </div>
         </div>

         {/* JUDUL */}
         <div className="text-center mb-6">
            <h2 className="text-lg font-bold underline uppercase">Laporan Absensi Harian</h2>
            <p className="font-medium">Hari/Tanggal: {formatDateIndo(date)} - Sesi {session}</p>
         </div>

         {/* KONDISIONAL TAMPILAN BERDASARKAN HARI LIBUR/WEEKEND */}
         {isNonEffective ? (
            <div className="border-2 border-dashed border-red-400 bg-red-50 p-12 rounded-lg text-center my-8">
               <AlertTriangle size={48} className="text-red-500 mx-auto mb-4"/>
               <h3 className="text-xl font-bold text-red-700 uppercase mb-2">
                  {holidayData ? "INFORMASI HARI LIBUR NASIONAL / CUTI BERSAMA" : "HARI NON-EFEKTIF (LIBUR AKHIR PEKAN)"}
               </h3>
               <p className="text-lg font-medium text-slate-700">
                  {holidayData ? `Keterangan: ${holidayData.desc}` : "Tidak Ada Data Absensi untuk Hari Minggu dan Hari Sabtu karena merupakan hari Non-Efektif."}
               </p>
               <p className="text-sm text-slate-500 mt-2 italic">(Sistem tidak mencatat absensi pada hari ini)</p>
            </div>
         ) : (
            <>
               {/* KONTEN TABEL JIKA BUKAN HARI LIBUR */}
               {printTemplate === 'v1' && (
                  <>
                      <div className="grid grid-cols-2 gap-8 mb-6 text-sm">
                          <div className="border border-black p-4">
                          <h3 className="font-bold border-b border-black mb-2 pb-1">Statistik Kehadiran</h3>
                          <div className="flex justify-between mb-1"><span>Total Pegawai</span> <span className="font-bold">{totalPegawai}</span></div>
                          <div className="flex justify-between mb-1"><span>Hadir (Di Kantor)</span> <span>{hadir}</span></div>
                          <div className="flex justify-between mt-2 pt-2 border-t border-dotted border-black font-bold">
                              <span>Total Efektif</span> <span>{totalHadirFisik}</span>
                          </div>
                          </div>
                          <div className="border border-black p-4">
                          <h3 className="font-bold border-b border-black mb-2 pb-1">Statistik Ketidakhadiran</h3>
                          <div className="flex justify-between mb-1"><span>Dinas Luar</span> <span>{dl}</span></div>
                          <div className="flex justify-between mb-1"><span>Izin</span> <span>{izin}</span></div>
                          <div className="flex justify-between mb-1"><span>Sakit</span> <span>{sakit}</span></div>
                          <div className="flex justify-between mb-1"><span>Cuti</span> <span>{cuti}</span></div>
                          <div className="flex justify-between mb-1 font-bold text-red-600 print:text-black"><span>Alpa</span> <span>{alpa}</span></div>
                          <div className="flex justify-between mt-2 pt-2 border-t border-dotted border-black font-bold">
                              <span>Total Tidak Hadir</span> <span>{totalTidakHadir}</span>
                          </div>
                          </div>
                      </div>

                      <div>
                          <h3 className="font-bold mb-2 text-sm uppercase underline">Daftar Pegawai Tidak Hadir:</h3>
                          <table className="w-full border-collapse border border-black text-sm">
                          <thead>
                              <tr className="bg-gray-100 print:bg-transparent">
                                  <th className="border border-black p-2 w-12">No</th>
                                  <th className="border border-black p-2 text-left">Nama Pegawai</th>
                                  <th className="border border-black p-2 text-left">Keterangan</th>
                              </tr>
                          </thead>
                          <tbody>
                              {listTidakHadir.length > 0 ? (
                                  listTidakHadir.map((emp, i) => {
                                      let displayStatus = emp.status;
                                      let cellClass = "border border-black p-2";

                                      if (emp.status === 'Alpa (Tanpa Ket.)') {
                                      cellClass += " font-bold text-red-600";
                                      } else if (emp.status === 'Dinas Luar') {
                                      displayStatus = 'Dinas Luar (Perjalanan Dinas)';
                                      }

                                      return (
                                      <tr key={emp.id}>
                                          <td className="border border-black p-2 text-center">{i+1}</td>
                                          <td className="border border-black p-2 font-bold">{emp.nama}</td>
                                          <td className={cellClass}>{displayStatus}</td>
                                      </tr>
                                      );
                                  })
                              ) : (
                                  <tr><td colSpan="3" className="border border-black p-4 text-center italic">Nihil (Semua Pegawai Hadir)</td></tr>
                              )}
                          </tbody>
                          </table>
                      </div>
                  </>
               )}

               {printTemplate === 'v2' && (
                  <div className="text-sm">
                      <table className="w-full border-collapse border border-black">
                          <tbody>
                              <tr>
                                  <td className="border border-black p-2 font-bold w-1/3 align-top">OPD</td>
                                  <td className="border border-black p-2 font-bold align-top uppercase">{settings.opdName}</td>
                              </tr>
                              <tr>
                                  <td className="border border-black p-2 font-bold align-top">JUMLAH</td>
                                  <td className="border border-black p-2 font-bold align-top">{totalPegawai} Orang</td>
                              </tr>
                              <tr>
                                  <td className="border border-black p-2 font-bold align-top">KURANG</td>
                                  <td className="border border-black p-2 font-bold align-top">{totalTidakHadir} Orang</td>
                              </tr>
                              <tr>
                                  <td className="border border-black p-2 font-bold align-top">HADIR</td>
                                  <td className="border border-black p-2 font-bold align-top">{hadir} Orang</td>
                              </tr>
                              <tr>
                                  <td className="border border-black p-2 font-bold align-top">KETERANGAN</td>
                                  <td className="border border-black p-2 align-top">
                                      <div className="flex flex-col gap-1">
                                          <div>1. TUGAS :  {dl}  ORANG</div>
                                          <div>2. IZIN :  {izin}  ORANG</div>
                                          <div>3. CUTI :  {cuti}  ORANG</div>
                                          <div>4. SAKIT :  {sakit}  ORANG</div>
                                          <div>5. TANPA KETERANGAN : {alpa}  ORANG</div>
                                      </div>
                                  </td>
                              </tr>
                              {/* Baris 6: TANPA KETERANGAN (Alpa) */}
                              <tr>
                                  <td className="border border-black p-2 font-bold align-top">TANPA KETERANGAN</td>
                                  <td className="border border-black p-2 align-top">
                                      {alpaList.length > 0 ? (
                                          <ol className="list-decimal list-inside pl-1">
                                              {alpaList.map(emp => (
                                                  <li key={emp.id} className="uppercase font-medium text-red-600 print:text-black">
                                                      {emp.nama}
                                                  </li>
                                              ))}
                                          </ol>
                                      ) : (
                                          <span className="italic text-gray-500">- Nihil -</span>
                                      )}
                                  </td>
                              </tr>
                              {/* Baris 7: TUGAS / DL */}
                              <tr>
                                  <td className="border border-black p-2 font-bold align-top">TUGAS / Dinas Luar / Perjalanan Dinas</td>
                                  <td className="border border-black p-2 align-top">
                                      {dlList.length > 0 ? (
                                          <ol className="list-decimal list-inside pl-1">
                                              {dlList.map(emp => (
                                                  <li key={emp.id} className="font-medium">
                                                      {emp.nama}
                                                  </li>
                                              ))}
                                          </ol>
                                      ) : (
                                          <span className="italic text-gray-500">- Nihil -</span>
                                      )}
                                  </td>
                              </tr>
                              {/* Baris 8: SAKIT */}
                              <tr>
                                  <td className="border border-black p-2 font-bold align-top">SAKIT</td>
                                  <td className="border border-black p-2 align-top">
                                      {sakitList.length > 0 ? (
                                          <ol className="list-decimal list-inside pl-1">
                                              {sakitList.map(emp => (
                                                  <li key={emp.id} className="font-medium">
                                                      {emp.nama}
                                                  </li>
                                              ))}
                                          </ol>
                                      ) : (
                                          <span className="italic text-gray-500">- Nihil -</span>
                                      )}
                                  </td>
                              </tr>
                              {/* Baris 9: IZIN */}
                              <tr>
                                  <td className="border border-black p-2 font-bold align-top">IZIN</td>
                                  <td className="border border-black p-2 align-top">
                                      {izinList.length > 0 ? (
                                          <ol className="list-decimal list-inside pl-1">
                                              {izinList.map(emp => (
                                                  <li key={emp.id} className="font-medium">
                                                      {emp.nama}
                                                  </li>
                                              ))}
                                          </ol>
                                      ) : (
                                          <span className="italic text-gray-500">- Nihil -</span>
                                      )}
                                  </td>
                              </tr>
                              {/* Baris 10: CUTI */}
                              <tr>
                                  <td className="border border-black p-2 font-bold align-top">CUTI</td>
                                  <td className="border border-black p-2 align-top">
                                      {cutiList.length > 0 ? (
                                          <ol className="list-decimal list-inside pl-1">
                                              {cutiList.map(emp => (
                                                  <li key={emp.id} className="font-medium">
                                                      {emp.nama}
                                                  </li>
                                              ))}
                                          </ol>
                                      ) : (
                                          <span className="italic text-gray-500">- Nihil -</span>
                                      )}
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
               )}
            </>
         )}

         {/* TANDA TANGAN (TETAP MUNCUL MESKI HARI LIBUR) */}
         <div className="mt-16 flex justify-end text-center">
            <div className="min-w-[200px] w-auto px-4">
                <p>Bobong, {formatDateNoWeekday(date)}</p>
                <br/>
                <p>Mengetahui,</p>
                <p>{settings.kepalaJabatan || `Kepala ${settings.opdName}`}</p>
                <br/><br/><br/><br/>
                <p className="font-bold underline whitespace-nowrap">{settings.kepalaName || '_________________________'}</p>
                <p>NIP. {settings.kepalaNip || '..............................'}</p>
            </div>
         </div>
      </div>
    </div>
  );
}

function AdminCetakAbsensiManual({ employees, settings, holidays }) {
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(() => {
     const d = new Date();
     d.setDate(d.getDate() + 4); 
     return d.toISOString().slice(0, 10);
  });
  
  const sortedEmployees = [...employees].filter(e=>e.role === 'user').sort((a, b) => {
    const noA = parseInt(a.no) || 99999;
    const noB = parseInt(b.no) || 99999;
    return noA - noB;
  });

  const getDates = () => {
     const dates = [];
     let current = new Date(startDate);
     const end = new Date(endDate);
     while (current <= end) {
        const day = current.getDay();
        if(day !== 0 && day !== 6) { 
           dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
     }
     return dates;
  };

  const validDates = getDates();
  const chunkArray = (arr, size) => {
     const chunks = [];
     for(let i=0; i<arr.length; i+=size) chunks.push(arr.slice(i, i+size));
     return chunks;
  };
  const datePages = chunkArray(validDates, 5);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded shadow print:hidden flex flex-wrap gap-4 items-end justify-between">
         <div className="flex gap-4">
            <div>
              <label className="text-xs font-bold block mb-1">Mulai Tanggal</label>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="border p-2 rounded"/>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Sampai Tanggal</label>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="border p-2 rounded"/>
            </div>
         </div>
         <div className="text-right">
           <button onClick={()=>window.print()} className="bg-slate-800 text-white px-6 py-2 rounded flex items-center hover:bg-black">
             <Printer size={18} className="mr-2"/> Cetak Tabel Manual
           </button>
           <p className="text-[10px] text-slate-500 mt-1">*Mode Landscape: 5 Hari per Halaman</p>
         </div>
      </div>

      <div className="print:w-full">
         {datePages.map((pageDates, pageIdx) => (
           <div key={pageIdx} className="bg-white p-4 mb-8 rounded shadow print:shadow-none print:w-full print:p-0 print:mb-0" style={{ pageBreakAfter: 'always' }}>
              <div className="flex border-b-2 border-black pb-2 mb-2 items-center justify-center relative">
                  <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="h-12 absolute left-0"/>
                  <div className="text-center px-12">
                     <h3 className="text-base font-bold uppercase">{settings.parentAgency}</h3>
                     <h1 className="text-base font-bold uppercase">{settings.opdName}</h1>
                     <p className="text-base italic">{settings.address}</p>
                  </div>
              </div>
              <div className="text-center mb-4">
                <h2 className="text-base font-bold uppercase underline">DAFTAR HADIR / ABSENSI MANUAL</h2>
                <p className="font-bold text-xs uppercase">PERIODE: {formatDateIndo(startDate)} s/d {formatDateIndo(endDate)}</p>
              </div>
              <table className="w-full border-collapse border border-black text-[10px]">
                 <thead>
                    <tr className="bg-gray-200 print:bg-gray-100">
                       <th className="border border-black p-1 w-6" rowSpan="2">No</th>
                       <th className="border border-black p-1 w-auto" rowSpan="2">Nama Pegawai / Jabatan</th>
                       {pageDates.map((d, i) => (
                          <th key={i} className="border border-black p-1" colSpan="2">
                             {d.toLocaleDateString('id-ID', {weekday:'long'})}, {d.getDate()}/{d.getMonth()+1}
                          </th>
                       ))}
                       <th className="border border-black p-1 w-8" rowSpan="2">Keterangan</th>
                    </tr>
                    <tr className="bg-gray-200 print:bg-gray-100 text-[8px] uppercase">
                       {pageDates.map((_, i) => (
                          <React.Fragment key={i}>
                             <th className="border border-black p-1 w-auto">Pagi</th>
                             <th className="border border-black p-1 w-auto">Sore</th>
                          </React.Fragment>
                       ))}
                    </tr>
                 </thead>
                 <tbody>
                    {sortedEmployees.map((emp, i) => (
                       <tr key={emp.id} className="h-8">
                          <td className="border border-black p-1 text-center">{emp.no || i+1}</td>
                          <td className="border border-black p-1 whitespace-nowrap w-px">
                             <div className="font-bold">{emp.nama}</div>
                             <div className="text-[8px] italic">{emp.jabatan}</div>
                          </td>
                          {pageDates.map((d, idx) => {
                             const isoDate = d.toISOString().slice(0, 10);
                             const isHoliday = holidays.find(h => h.date === isoDate);
                             
                             if(isHoliday) {
                                return (
                                   <td key={idx} colSpan="2" className="border border-black p-1 text-center bg-red-200 print:bg-gray-300">
                                   </td>
                                );
                             }
                             return (
                                <React.Fragment key={idx}>
                                   <td className="border border-black p-1"></td>
                                   <td className="border border-black p-1"></td>
                                </React.Fragment>
                             );
                          })}
                          <td className="border border-black p-1"></td>
                       </tr>
                    ))}
                 </tbody>
              </table>
              
              <div className="mt-4 flex justify-between items-start text-xs break-inside-avoid">
                 <div className="max-w-[60%] text-left">
                    {(() => {
                        const pageHolidayList = pageDates
                            .map(d => {
                                const iso = d.toISOString().slice(0, 10);
                                const h = holidays.find(hol => hol.date === iso);
                                return h ? { date: d, desc: h.desc } : null;
                            })
                            .filter(Boolean);
                        
                        if (pageHolidayList.length > 0) {
                            return (
                                <>
                                    <p className="font-bold underline mb-1">Keterangan Hari Libur Nasional / Cuti Bersama</p>
                                    <ul className="list-none pl-0">
                                        {pageHolidayList.map((h, hIdx) => (
                                            <li key={hIdx} className="mb-0.5">
                                                <span className="font-bold">- {formatDateIndo(h.date.toISOString())}</span> : {h.desc}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            );
                        }
                        return null;
                    })()}
                 </div>

                 <div className="min-w-[200px] w-auto text-center px-4">
                    <p>Mengetahui,</p>
                    <p>{settings.kepalaJabatan || `Kepala ${settings.opdName}`}</p>
                    <br/><br/><br/>
                    <p className="font-bold underline whitespace-nowrap">{settings.kepalaName || '__________________'}</p>
                    <p>NIP. {settings.kepalaNip || '..............................'}</p>
                 </div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}

function AdminRekapanBulanan({ employees, attendance, settings, user }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const pegawaiOnly = employees.filter(e => e.role === 'user');

  const logs = attendance.filter(l => l.date.startsWith(month) && l.statusApproval === 'approved');

  const getStats = (userId) => {
    const userLogs = logs.filter(l => l.userId === userId);
    return {
       hadir: userLogs.filter(l => l.status === 'Hadir').length,
       sakit: userLogs.filter(l => l.status === 'Sakit').length,
       izin: userLogs.filter(l => l.status === 'Izin').length,
       cuti: userLogs.filter(l => l.status === 'Cuti').length,
       dl: userLogs.filter(l => l.status === 'Dinas Luar').length,
    };
  };

  const handleClear = async () => {
    if (confirm(`PERINGATAN: Anda akan menghapus seluruh data absensi bulan ${month}. Lanjutkan?`)) {
       const batch = writeBatch(db);
       logs.forEach(l => {
          batch.delete(doc(getCollectionPath('attendance'), l.id));
       });
       await batch.commit();
       alert('Data bulan ini telah dikosongkan.');
    }
  };

  return (
    <div className="space-y-6">
       <div className="bg-white p-4 rounded shadow print:hidden flex items-end justify-between">
          <div>
             <label className="text-xs font-bold block mb-1">Pilih Bulan</label>
             <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="border p-2 rounded"/>
          </div>
          <div className="flex gap-2">
             {user.role === 'admin' && (
               <button onClick={handleClear} className="bg-red-600 text-white px-4 py-2 rounded flex items-center hover:bg-red-700">
                  <Trash2 size={16} className="mr-2"/> Reset/Kosongkan Data
               </button>
             )}
             <button onClick={()=>window.print()} className="bg-slate-800 text-white px-4 py-2 rounded flex items-center hover:bg-black">
                <Printer size={16} className="mr-2"/> Cetak
             </button>
          </div>
       </div>

       <div className="bg-white p-8 rounded shadow print:shadow-none print:w-full">
          <div className="flex border-b-4 border-double border-black pb-4 mb-6 items-center justify-center relative">
            <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="h-20 absolute left-0"/>
            <div className="text-center px-20">
               <h3 className="text-xl font-bold uppercase">{settings.parentAgency}</h3>
               <h1 className="text-xl font-bold uppercase">{settings.opdName}</h1>
               <p className="text-sm italic">{settings.address}</p>
            </div>
         </div>

          <div className="text-center mb-6">
             <h2 className="text-xl font-bold uppercase underline">Rekapan Bulanan Pegawai</h2>
             <p className="font-medium">{new Date(month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
          </div>

          <table className="w-full border-collapse border border-black text-sm">
             <thead>
                <tr className="bg-slate-100 print:bg-transparent">
                   <th className="border border-black p-2" rowSpan="2">No</th>
                   <th className="border border-black p-2 text-left" rowSpan="2">Nama Pegawai / Jabatan</th>
                   <th className="border border-black p-2" colSpan="5">Rincian</th>
                </tr>
                <tr className="bg-slate-50 print:bg-transparent text-xs">
                   <th className="border border-black p-1">Hadir</th>
                   <th className="border border-black p-1">Sakit</th>
                   <th className="border border-black p-1">Izin</th>
                   <th className="border border-black p-1">Cuti</th>
                   <th className="border border-black p-1">DL</th>
                </tr>
             </thead>
             <tbody>
                {pegawaiOnly.map((emp, i) => {
                   const stats = getStats(emp.id);
                   return (
                      <tr key={emp.id} className="text-center hover:bg-slate-50">
                         <td className="border border-black p-2">{i+1}</td>
                         <td className="border border-black p-2 text-left">
                            <div className="font-medium">{emp.nama}</div>
                            <div className="text-xs italic text-slate-600">{emp.jabatan}</div>
                         </td>
                         <td className="border border-black p-2">{stats.hadir}</td>
                         <td className="border border-black p-2">{stats.sakit}</td>
                         <td className="border border-black p-2">{stats.izin}</td>
                         <td className="border border-black p-2">{stats.cuti}</td>
                         <td className="border border-black p-2">{stats.dl}</td>
                      </tr>
                   );
                })}
             </tbody>
          </table>

          <div className="mt-16 flex justify-end text-center">
            <div className="min-w-[200px] w-auto px-4">
               <p>Bobong, {new Date(month + '-28').toLocaleDateString('id-ID', {month:'long', year:'numeric'})}</p>
               <p className="mb-20">{settings.kepalaJabatan || `Kepala ${settings.opdShort}`}</p>
               <p className="font-bold underline whitespace-nowrap">{settings.kepalaName || '_________________________'}</p>
               <p>NIP. {settings.kepalaNip || '..............................'}</p>
            </div>
         </div>
       </div>
    </div>
  );
}

function AdminTerimaAbsensi({ employees, attendance }) {
  const pending = attendance.filter(l => l.statusApproval === 'pending').sort((a,b) => b.timestamp?.localeCompare(a.timestamp));

  const process = async (id, status) => {
     await updateDoc(doc(getCollectionPath('attendance'), id), { statusApproval: status });
  };

  return (
    <div className="bg-white p-6 rounded shadow-sm">
       <h2 className="text-xl font-bold mb-4 flex items-center"><CheckCircle className="mr-2"/> Terima Absensi Masuk</h2>
       
       {pending.length === 0 ? (
          <div className="text-center p-8 bg-slate-50 text-slate-500 rounded border border-dashed">
             Tidak ada absensi baru yang menunggu persetujuan.
          </div>
       ) : (
          <div className="grid gap-4">
             {pending.map(log => (
                <div key={log.id} className="border p-4 rounded bg-yellow-50 flex justify-between items-center shadow-sm">
                   <div>
                      <div className="font-bold text-lg">{log.userName}</div>
                      <div className="text-sm text-slate-600">
                         {formatDateIndo(log.date)} • Sesi {log.session} • <span className="font-bold text-blue-600">{log.status}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                         Dikirim: {new Date(log.timestamp).toLocaleString()}
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={()=>process(log.id, 'rejected')} className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 font-bold text-sm transition-colors">Tolak</button>
                      <button onClick={()=>process(log.id, 'approved')} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-bold text-sm shadow transition-colors">Terima</button>
                   </div>
                </div>
             ))}
          </div>
       )}
    </div>
  );
}

function AdminDataPegawai({ employees, currentUser }) {
  const [form, setForm] = useState({ nama: '', jabatan: '', role: 'user', username: '', password: '', no: '' });
  const [isEditing, setIsEditing] = useState(null);
  const [isInserting, setIsInserting] = useState(null); // ID pegawai referensi untuk insert
  const [selectedIds, setSelectedIds] = useState([]); // STATE BARU UNTUK CEKLIST
  const formRef = useRef(null);

  // UTILITY: Fungsi untuk mengurutkan ulang seluruh pegawai dari 1 s/d N
  const renumberAllEmployees = async () => {
     // Ambil semua pegawai kecuali admin, urutkan berdasarkan 'no' yang sekarang (convert ke float/int)
     const userEmployees = employees
        .filter(e => e.role === 'user')
        .sort((a,b) => parseFloat(a.no) - parseFloat(b.no));
     
     const batch = writeBatch(db);
     
     userEmployees.forEach((emp, index) => {
        const newNo = (index + 1).toString();
        // Hanya update jika nomornya berubah
        if (emp.no !== newNo) {
           batch.update(doc(getCollectionPath('users'), emp.id), { no: newNo });
        }
     });

     try {
        await batch.commit();
        console.log("Penomoran ulang berhasil.");
     } catch (err) {
        console.error("Gagal menomori ulang:", err);
     }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
       const text = evt.target.result;
       const lines = text.split('\n');
       const batch = writeBatch(db);
       let count = 0;
       
       // Skip header (i=1)
       for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // DETEKSI PEMISAH: Bisa koma (,) atau titik koma (;)
          const delimiter = line.includes(';') ? ';' : ',';
          const parts = line.split(delimiter);
          
          let no, nama, jabatan;

          if (parts.length === 3) {
              // Kasus sederhana: No, Nama, Jabatan
              no = parts[0].trim();
              nama = parts[1].trim();
              jabatan = parts[2].trim();
          } else if (parts.length > 3) {
              // Kasus nama mengandung koma (misal: "Budi, S.Kom")
              no = parts[0].trim();
              jabatan = parts[parts.length - 1].trim();
              // Gabungkan bagian tengah menjadi Nama
              // Slice dari index 1 sampai length-1
              nama = parts.slice(1, parts.length - 1).join(delimiter).trim();
              
              // Hapus tanda kutip jika ada (format CSV Excel standar)
              // Regex: Hapus tanda kutip di awal/akhir, dan ubah double quote ("") jadi single quote (")
              nama = nama.replace(/^"|"$/g, '').replace(/""/g, '"');
              jabatan = jabatan.replace(/^"|"$/g, '').replace(/""/g, '"');
          } else {
              continue; // Baris tidak valid
          }
          
          if (nama && jabatan) {
             const username = nama.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); 
             const password = '123'; // Password default
             const newDocRef = doc(getCollectionPath('users'));
             batch.set(newDocRef, {
                no, nama, jabatan, username, password, role: 'user'
             });
             count++;
          }
       }
       await batch.commit();
       alert(`Berhasil import ${count} data pegawai.`);
       // Jalankan renumber setelah import massal
       setTimeout(() => renumberAllEmployees(), 2000);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,NO,NAMA,JABATAN\n1,Contoh Nama Pegawai,Staf\n2,\"Nama, Gelar\",Kepala Seksi";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "format_data_pegawai.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    const data = employees.filter(e => e.role === 'user').map(e => ({
       NO: e.no || '-',
       NAMA: e.nama,
       JABATAN: e.jabatan
    }));
    exportToCSV(data, 'Data_Pegawai_BPKAD.csv');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
       alert('Username dan Password wajib diisi.');
       return;
    }

    try {
      if (isEditing) {
         await updateDoc(doc(getCollectionPath('users'), isEditing), form);
      } else {
         // LOGIKA BARU: Jika sedang INSERT (Sisip)
         // Kita simpan dulu dengan nomor sementara (misal: "5.5" jika disisip setelah no 5)
         // Nanti fungsi renumberAllEmployees akan merapikannya jadi integer
         await addDoc(getCollectionPath('users'), { ...form });
      }
      
      setForm({ nama: '', jabatan: '', role: 'user', username: '', password: '', no: '' });
      setIsEditing(null);
      setIsInserting(null);

      // JALANKAN AUTO RENUMBER SETELAH SIMPAN
      // Beri jeda sedikit agar Firestore sempat menyimpan data baru
      setTimeout(() => {
         renumberAllEmployees();
      }, 1000);

    } catch (err) {
       console.error(err);
       alert('Terjadi kesalahan saat menyimpan data.');
    }
  };

  const handleInsertClick = (referenceEmp) => {
     // Set mode INSERT
     setIsInserting(referenceEmp.id);
     setIsEditing(null);
     
     // Buat nomor sementara = (Nomor Referensi) + 0.5
     // Contoh: Sisip setelah no 5 -> jadi 5.5
     // Nanti akan diurutkan ulang jadi 6, dan yang lama geser ke 7
     const tempNo = (parseFloat(referenceEmp.no) + 0.5).toString();

     setForm({ 
        nama: '', 
        jabatan: '', 
        role: 'user', 
        username: '', 
        password: '123', // Default pass
        no: tempNo 
     });
     
     if(formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const edit = (emp) => {
    setIsEditing(emp.id);
    setIsInserting(null);
    setForm(emp);
    if(formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const remove = async (id) => {
    if (confirm('Hapus akun ini?')) {
       await deleteDoc(doc(getCollectionPath('users'), id));
       // JALANKAN AUTO RENUMBER SETELAH HAPUS
       setTimeout(() => {
          renumberAllEmployees();
       }, 1000);
    }
  };

  const resetForm = () => {
    setForm({ nama: '', jabatan: '', role: 'user', username: '', password: '', no: '' });
    setIsEditing(null);
    setIsInserting(null);
  };
  
  // --- FITUR BULK DELETE (HAPUS MASSAL) ---
  const handleBulkDelete = async () => {
      if (!confirm(`Yakin ingin menghapus ${selectedIds.length} pegawai terpilih?`)) return;

      const batch = writeBatch(db);
      selectedIds.forEach(id => {
         const docRef = doc(getCollectionPath('users'), id);
         batch.delete(docRef);
      });

      try {
         await batch.commit();
         setSelectedIds([]); // Reset pilihan
         // Auto renumber setelah hapus banyak
         setTimeout(() => renumberAllEmployees(), 1000);
      } catch (error) {
         console.error("Error bulk delete:", error);
         alert("Gagal menghapus data.");
      }
  };

  const toggleSelectAll = () => {
      if (selectedIds.length === sortedEmployees.length) {
         setSelectedIds([]); // Deselect all
      } else {
         setSelectedIds(sortedEmployees.map(e => e.id)); // Select all
      }
  };

  const toggleSelectOne = (id) => {
      if (selectedIds.includes(id)) {
         setSelectedIds(selectedIds.filter(sid => sid !== id));
      } else {
         setSelectedIds([...selectedIds, id]);
      }
  };

  const isReadOnly = currentUser.role === 'pengelola';
  
  // Sort tampilan tabel berdasarkan nomor (float/int)
  const sortedEmployees = [...employees].sort((a, b) => {
     const noA = parseFloat(a.no) || 99999;
     const noB = parseFloat(b.no) || 99999;
     return noA - noB;
  });

  return (
     <div className="bg-white p-6 rounded shadow-sm">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold flex items-center"><Users className="mr-2"/> Data Pegawai</h2>
           {!isReadOnly && (
             <div className="flex gap-2">
                {/* Tombol Hapus Massal Muncul jika ada yang dipilih */}
                {selectedIds.length > 0 && (
                    <button onClick={handleBulkDelete} className="bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 text-sm flex items-center shadow-sm animate-pulse font-bold">
                       <Trash2 size={14} className="mr-1"/> Hapus ({selectedIds.length})
                    </button>
                )}

                <button onClick={downloadTemplate} className="bg-gray-500 text-white px-3 py-1.5 rounded hover:bg-gray-600 text-sm flex items-center shadow-sm">
                   <FileDown size={14} className="mr-1"/> Template CSV
                </button>
                <label className="bg-green-600 text-white px-3 py-1.5 rounded cursor-pointer hover:bg-green-700 text-sm flex items-center shadow-sm">
                   <Upload size={14} className="mr-1"/> Import Data
                   <input type="file" accept=".csv" hidden onChange={handleImport}/>
                </label>
                <button onClick={handleExport} className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm flex items-center shadow-sm">
                   <Download size={14} className="mr-1"/> Export Data
                </button>
             </div>
           )}
        </div>

        {!isReadOnly ? (
          <div ref={formRef} className={`p-4 rounded mb-6 border-l-4 transition-colors ${isInserting ? 'bg-green-50 border-green-500' : 'bg-slate-50 border-blue-500'}`}>
            <h3 className="font-bold text-sm mb-3">
               {isEditing ? 'Edit Data Pegawai' : isInserting ? 'Sisip Pegawai Baru' : 'Tambah Pegawai Baru (Paling Bawah)'}
            </h3>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-6 gap-3">
               <div className="col-span-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">No Urut</label>
                  <input className="w-full p-2 border rounded bg-gray-100" readOnly value={form.no} />
                  <p className="text-[9px] text-gray-500">*Otomatis</p>
               </div>
               <div className="col-span-3">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Nama Pegawai</label>
                  <input placeholder="Nama Lengkap" className="w-full p-2 border rounded" required value={form.nama} onChange={e=>setForm({...form, nama: e.target.value})} />
               </div>
               <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Jabatan</label>
                  <input placeholder="Jabatan" className="w-full p-2 border rounded" required value={form.jabatan} onChange={e=>setForm({...form, jabatan: e.target.value})} />
               </div>
               
               <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Username Login</label>
                  <input placeholder="Username" className="w-full p-2 border rounded bg-yellow-50" required value={form.username} onChange={e=>setForm({...form, username: e.target.value})} />
               </div>
               <div className="col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Password Login</label>
                  <input placeholder="Password" className="w-full p-2 border rounded bg-yellow-50" required value={form.password} onChange={e=>setForm({...form, password: e.target.value})} />
               </div>

               <div className="col-span-2 flex items-end gap-2">
                  <button type="button" onClick={resetForm} className="bg-gray-400 text-white py-2 px-4 rounded font-bold hover:bg-gray-500">Batal</button>
                  <button className={`flex-1 text-white py-2 rounded font-bold ${isInserting ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                     {isInserting ? 'Sisipkan Data' : isEditing ? 'Simpan Perubahan' : 'Tambah'}
                  </button>
               </div>
            </form>
          </div>
        ) : (
          <div className="bg-yellow-50 p-4 mb-6 border-l-4 border-yellow-400 text-yellow-700 text-sm">
             Mode Pengelola: Anda hanya dapat melihat data pegawai.
          </div>
        )}

        <div className="overflow-x-auto">
           <table className="w-full text-sm border">
              <thead className="bg-slate-100">
                 <tr>
                    {!isReadOnly && (
                        <th className="p-2 border w-8 text-center">
                            <input 
                                type="checkbox" 
                                onChange={toggleSelectAll} 
                                checked={selectedIds.length === sortedEmployees.length && sortedEmployees.length > 0}
                            />
                        </th>
                    )}
                    <th className="p-2 border w-10">No</th>
                    <th className="p-2 border text-left">Nama</th>
                    <th className="p-2 border text-left">Jabatan</th>
                    <th className="p-2 border text-left">Role</th>
                    {!isReadOnly && <th className="p-2 border w-32">Aksi</th>}
                 </tr>
              </thead>
              <tbody>
                 {sortedEmployees.map((emp, i) => (
                    <tr key={emp.id} className={`hover:bg-slate-50 ${isInserting === emp.id ? 'bg-green-50 border-b-2 border-green-500' : ''} ${selectedIds.includes(emp.id) ? 'bg-blue-50' : ''}`}>
                       {!isReadOnly && (
                           <td className="p-2 border text-center">
                               <input 
                                   type="checkbox" 
                                   checked={selectedIds.includes(emp.id)} 
                                   onChange={() => toggleSelectOne(emp.id)}
                                   disabled={currentUser.role === 'operator' && emp.role === 'admin'} 
                               />
                           </td>
                       )}
                       <td className="p-2 border text-center font-bold">{emp.no}</td>
                       <td className="p-2 border font-medium">{emp.nama}</td>
                       <td className="p-2 border">{emp.jabatan}</td>
                       <td className="p-2 border uppercase text-xs font-bold">{emp.role}</td>
                       {!isReadOnly && (
                         <td className="p-2 border text-center flex justify-center gap-1">
                            {!(currentUser.role === 'operator' && emp.role === 'admin') && (
                               <>
                                  <button onClick={()=>handleInsertClick(emp)} className="text-green-600 hover:bg-green-100 p-1 rounded" title="Sisip data di bawah ini">
                                     <ArrowDownCircle size={16}/>
                                  </button>
                                  <button onClick={()=>edit(emp)} className="text-blue-600 hover:bg-blue-100 p-1 rounded" title="Edit">
                                     <Edit size={16}/>
                                  </button>
                                  <button onClick={()=>remove(emp.id)} className="text-red-600 hover:bg-red-100 p-1 rounded" title="Hapus">
                                     <Trash2 size={16}/>
                                  </button>
                               </>
                            )}
                         </td>
                       )}
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
     </div>
  );
}

// ... AdminSettings, AdminDashboard, dll ...
function AdminSettings({ settings, holidays, employees, user }) {
  const [tab, setTab] = useState('setup');
  const [formSet, setFormSet] = useState(settings);
  const [holForm, setHolForm] = useState({ date: '', desc: '' });
  const isReadOnly = user.role === 'pengelola';

  const saveSetup = async () => {
    if(isReadOnly) return;
    await updateDoc(doc(getCollectionPath('settings'), settings.id), formSet);
    alert('Pengaturan disimpan.');
  };

  const handleLogoUpload = (e) => {
    if(isReadOnly) return;
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFormSet({...formSet, logoUrl: reader.result});
    reader.readAsDataURL(file);
  };

  const addHol = async () => {
     if(isReadOnly) return;
     if(holForm.date && holForm.desc) {
        await addDoc(getCollectionPath('holidays'), holForm);
        setHolForm({ date: '', desc: '' });
     }
  };
  const delHol = async(id) => {
     if(isReadOnly) return;
     await deleteDoc(doc(getCollectionPath('holidays'), id));
  };
  
  const exportHol = () => {
     const data = holidays.map(h => ({ Tanggal: h.date, Keterangan: h.desc }));
     exportToCSV(data, 'Hari_Libur.csv');
  };
  
  const importHol = (e) => {
     if(isReadOnly) return;
     const file = e.target.files[0];
     if(!file) return;
     const reader = new FileReader();
     reader.onload = async (evt) => {
        const lines = evt.target.result.split('\n').slice(1);
        const batch = writeBatch(db);
        lines.forEach(l => {
           const [date, desc] = l.split(',');
           if(date && desc) {
              batch.set(doc(getCollectionPath('holidays')), { date: date.trim(), desc: desc.trim() });
           }
        });
        await batch.commit();
        alert('Hari libur diimpor.');
     };
     reader.readAsText(file);
  };

  const updateUserCreds = async (id, newU, newP) => {
     if(isReadOnly) return;
     await updateDoc(doc(getCollectionPath('users'), id), { username: newU, password: newP });
  };

  // Filter users for printing
  const usersToPrint = employees.filter(e => e.role === 'user').sort((a,b) => {
     const noA = parseInt(a.no) || 99999;
     const noB = parseInt(b.no) || 99999;
     return noA - noB;
  });

  return (
    <div className="bg-white p-6 rounded shadow-sm">
       {isReadOnly && <div className="bg-yellow-100 text-yellow-800 p-2 text-sm rounded mb-4">Mode Pengelola: Akses Pengaturan Dibatasi (Read Only).</div>}
       <div className="flex border-b mb-6 print:hidden">
          {['setup', 'hari_libur', 'user'].map(t => (
             <button key={t} onClick={()=>setTab(t)} className={`px-6 py-2 capitalize font-bold ${tab === t ? 'border-b-2 border-yellow-500 text-yellow-600' : 'text-slate-400'}`}>
                {t.replace('_', ' ')}
             </button>
          ))}
       </div>

       {tab === 'setup' && (
          <div className="max-w-2xl space-y-4 print:hidden">
             <div><label className="font-bold text-xs uppercase block mb-1">Nama OPD (Panjang)</label>
             <input disabled={isReadOnly} className="w-full border p-2 rounded disabled:bg-gray-100" value={formSet.opdName} onChange={e=>setFormSet({...formSet, opdName: e.target.value})}/></div>
             <div className="grid grid-cols-2 gap-4">
                <div><label className="font-bold text-xs uppercase block mb-1">Nama Pendek (Singkatan)</label>
                <input disabled={isReadOnly} className="w-full border p-2 rounded disabled:bg-gray-100" value={formSet.opdShort} onChange={e=>setFormSet({...formSet, opdShort: e.target.value})}/></div>
                <div><label className="font-bold text-xs uppercase block mb-1">Instansi Induk</label>
                <input disabled={isReadOnly} className="w-full border p-2 rounded disabled:bg-gray-100" value={formSet.parentAgency} onChange={e=>setFormSet({...formSet, parentAgency: e.target.value})}/></div>
             </div>
             <div><label className="font-bold text-xs uppercase block mb-1">Alamat Kantor</label>
             <textarea disabled={isReadOnly} className="w-full border p-2 rounded disabled:bg-gray-100" value={formSet.address} onChange={e=>setFormSet({...formSet, address: e.target.value})}/></div>
             
             {/* TAMBAHAN FORM UNTUK KEPALA OPD */}
             <div className="bg-blue-50 p-4 rounded border border-blue-200">
                 <h3 className="font-bold text-sm text-blue-800 mb-3 uppercase flex items-center"><UserCheck className="mr-2" size={16}/> Data Pimpinan (Penandatangan)</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="font-bold text-xs uppercase block mb-1">Nama Pimpinan / Kepala</label>
                        <input disabled={isReadOnly} className="w-full border p-2 rounded disabled:bg-gray-100" value={formSet.kepalaName || ''} onChange={e=>setFormSet({...formSet, kepalaName: e.target.value})}/>
                    </div>
                    <div>
                        <label className="font-bold text-xs uppercase block mb-1">NIP</label>
                        <input disabled={isReadOnly} className="w-full border p-2 rounded disabled:bg-gray-100" value={formSet.kepalaNip || ''} onChange={e=>setFormSet({...formSet, kepalaNip: e.target.value})}/>
                    </div>
                    <div className="md:col-span-2">
                        <label className="font-bold text-xs uppercase block mb-1">Jabatan Pimpinan</label>
                        <input disabled={isReadOnly} className="w-full border p-2 rounded disabled:bg-gray-100" value={formSet.kepalaJabatan || ''} onChange={e=>setFormSet({...formSet, kepalaJabatan: e.target.value})}/>
                        <span className="text-[10px] text-gray-500">*Contoh: Kepala Badan Pengelolaan Keuangan dan Aset Daerah</span>
                    </div>
                 </div>
             </div>

             <div className="bg-slate-50 p-4 rounded border">
                <label className="font-bold text-xs uppercase block mb-2">Logo Aplikasi</label>
                <div className="flex items-center gap-4">
                   <img src={formSet.logoUrl} className="h-16 w-16 object-contain bg-white border"/>
                   <div className="flex-1">
                      <input disabled={isReadOnly} type="text" placeholder="URL Gambar..." className="w-full p-2 border rounded mb-2 text-xs disabled:bg-gray-100" value={formSet.logoUrl} onChange={e=>setFormSet({...formSet, logoUrl: e.target.value})}/>
                      {!isReadOnly && <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs"/>}
                   </div>
                </div>
             </div>
             {!isReadOnly && <button onClick={saveSetup} className="bg-blue-600 text-white px-6 py-2 rounded">Simpan Setup</button>}
          </div>
       )}

       {tab === 'hari_libur' && (
          <div className="print:hidden">
             {!isReadOnly && (
               <div className="flex gap-2 mb-4">
                  <input type="date" className="border p-2 rounded" value={holForm.date} onChange={e=>setHolForm({...holForm, date: e.target.value})}/>
                  <input placeholder="Keterangan" className="border p-2 rounded flex-1" value={holForm.desc} onChange={e=>setHolForm({...holForm, desc: e.target.value})}/>
                  <button onClick={addHol} className="bg-green-600 text-white px-4 rounded">Tambah</button>
               </div>
             )}
             <div className="flex gap-2 mb-4 text-xs">
                <button onClick={exportHol} className="bg-slate-200 px-3 py-1 rounded">Export Excel</button>
                {!isReadOnly && <label className="bg-slate-200 px-3 py-1 rounded cursor-pointer">Import Excel <input type="file" hidden onChange={importHol}/></label>}
             </div>
             <ul>
                {holidays.map(h => (
                   <li key={h.id} className="flex justify-between border-b py-2 text-sm">
                      <span>{formatDateIndo(h.date)} : {h.desc}</span>
                      {!isReadOnly && <button onClick={()=>delHol(h.id)} className="text-red-500"><Trash2 size={14}/></button>}
                   </li>
                ))}
             </ul>
          </div>
       )}

       {tab === 'user' && (
          <div>
             <div className="print:hidden">
                 <div className="flex justify-between items-center mb-4">
                    <div className="bg-yellow-50 p-3 text-sm text-yellow-800 rounded border border-yellow-200 flex items-center">
                        <Shield className="mr-2" size={16}/>
                        <span>Pengaturan Kredensial (Username & Password)</span>
                    </div>
                     {!isReadOnly && (
                         <button onClick={()=>window.print()} className="bg-slate-800 text-white px-4 py-2 rounded flex items-center hover:bg-black text-sm">
                            <Printer size={16} className="mr-2"/> Cetak Data User
                         </button>
                     )}
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm border">
                       <thead className="bg-slate-100">
                          <tr>
                             <th className="p-2 border text-left">Nama</th>
                             <th className="p-2 border text-left">Role</th>
                             <th className="p-2 border text-left">Username</th>
                             <th className="p-2 border text-left">Password</th>
                             <th className="p-2 border">Simpan</th>
                          </tr>
                       </thead>
                       <tbody>
                          {employees.sort((a,b) => (a.role === 'admin' ? -1 : 1)).map(u => (
                             <UserRow key={u.id} targetUser={u} currentUser={user} onSave={updateUserCreds} isReadOnly={isReadOnly} />
                          ))}
                       </tbody>
                    </table>
                 </div>
             </div>

             {/* Printable Section - Visible Only on Print */}
             <div className="hidden print:block">
                {/* Header / Kop */}
                <div className="flex border-b-2 border-black pb-4 mb-6 items-center justify-center relative">
                    <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="h-20 absolute left-0" alt="Logo"/>
                    <div className="text-center px-20">
                       <h3 className="text-xl font-bold uppercase">{settings.parentAgency}</h3>
                       <h1 className="text-xl font-bold uppercase">{settings.opdName}</h1>
                       <p className="text-sm italic">{settings.address}</p>
                    </div>
                </div>

                <div className="text-center mb-6">
                   <h2 className="text-lg font-bold uppercase underline">DATA AKUN PENGGUNA (PEGAWAI)</h2>
                </div>

                <table className="w-full border-collapse border border-black text-sm">
                   <thead>
                      <tr className="bg-gray-100">
                         <th className="border border-black p-2 w-12 text-center">No</th>
                         <th className="border border-black p-2 text-left">Nama Pegawai</th>
                         <th className="border border-black p-2 text-left">Jabatan</th>
                         <th className="border border-black p-2 text-left">Username</th>
                         <th className="border border-black p-2 text-left">Password</th>
                      </tr>
                   </thead>
                   <tbody>
                      {usersToPrint.map((u, i) => (
                         <tr key={u.id}>
                            <td className="border border-black p-2 text-center">{i + 1}</td>
                            <td className="border border-black p-2 font-bold">{u.nama}</td>
                            <td className="border border-black p-2">{u.jabatan}</td>
                            <td className="border border-black p-2 font-mono">{u.username}</td>
                            <td className="border border-black p-2 font-mono">{u.password}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
       )}
    </div>
  );
}

function UserRow({ targetUser, currentUser, onSave, isReadOnly }) {
   const [u, setU] = useState(targetUser.username);
   const [p, setP] = useState(targetUser.password);
   const [changed, setChanged] = useState(false);

   let canEdit = !isReadOnly && (currentUser.role === 'admin' || (currentUser.role === 'operator' && targetUser.role !== 'admin'));
   const showPassword = currentUser.role === 'admin' || targetUser.role !== 'admin';

   const handleChange = (type, val) => {
      if(type === 'u') setU(val); else setP(val);
      setChanged(true);
   };

   return (
      <tr className={`hover:bg-slate-50 ${targetUser.id === currentUser.id ? 'bg-blue-50' : ''}`}>
         <td className="p-2 border">
            {targetUser.nama}
            {targetUser.id === currentUser.id && <span className="ml-2 text-[10px] bg-blue-600 text-white px-1 rounded">Saya</span>}
         </td>
         <td className="p-2 border uppercase text-xs font-bold">{targetUser.role}</td>
         <td className="p-2 border">
            <input 
               className={`border p-1 rounded w-full ${!canEdit ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white'}`} 
               value={u} 
               onChange={e=>handleChange('u', e.target.value)}
               disabled={!canEdit}
            />
         </td>
         <td className="p-2 border">
            <input 
               className={`border p-1 rounded w-full ${!canEdit ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white'}`} 
               value={showPassword ? p : '******'} 
               onChange={e=>handleChange('p', e.target.value)}
               disabled={!canEdit}
               type="text" 
            />
         </td>
         <td className="p-2 border text-center">
            {changed && canEdit && (
               <button onClick={() => { onSave(targetUser.id, u, p); setChanged(false); }} className="text-green-600 hover:bg-green-100 p-1 rounded">
                  <Save size={16}/>
               </button>
            )}
            {!canEdit && <Lock size={14} className="mx-auto text-gray-300"/>}
         </td>
      </tr>
   );
}

// ... (Sisa komponen lainnya UserAbsensi, UserLaporanStatus, UserRekapan, dll. tetap sama)

function UserAbsensi({ user, attendance, holidays }) {
  const [form, setForm] = useState({ date: getTodayString(), session: 'Pagi', status: 'Hadir' });
  const [done, setDone] = useState(false);
  const [canAbsen, setCanAbsen] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    const sess = h >= 12 ? 'Sore' : 'Pagi';
    setForm(prev => ({ ...prev, session: sess }));
  }, []);

  useEffect(() => {
    // 1. Cek Hari Libur / Weekend Dulu
    const todayDate = new Date(form.date);
    const isWeekend = todayDate.getDay() === 0 || todayDate.getDay() === 6;
    const holiday = holidays.find(h => h.date === form.date);

    if (isWeekend) {
        setCanAbsen(false);
        setBlockMessage("Absensi ditutup. Hari ini adalah hari libur akhir pekan (Sabtu/Minggu).");
        return;
    }

    if (holiday) {
        setCanAbsen(false);
        setBlockMessage(`Absensi ditutup. Hari ini adalah hari libur nasional / cuti bersama: ${holiday.desc}`);
        return;
    }

    // 2. Jika bukan hari libur, baru cek jam
    setBlockMessage(''); // Clear block message if valid day
    const check = checkAbsensiTime(form.session);
    setCanAbsen(check);
  }, [form.session, form.date, holidays]);

  useEffect(() => {
     const exists = attendance.find(l => l.userId === user.id && l.date === form.date && l.session === form.session);
     setDone(!!exists);
  }, [form.date, form.session, attendance]);

  const submit = async (e) => {
     e.preventDefault();
     await addDoc(getCollectionPath('attendance'), {
        ...form, userId: user.id, userName: user.nama, statusApproval: 'pending', timestamp: new Date().toISOString()
     });
     alert('Absensi terkirim.');
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded shadow-lg mt-10">
       <h2 className="text-2xl font-bold text-center mb-6 text-slate-800">Absensi Mandiri</h2>
       
       {/* Pesan Blokir Hari Libur */}
       {blockMessage && !done && (
         <div className="mb-4 bg-red-100 text-red-700 p-4 rounded text-center border border-red-200 shadow-sm animate-pulse">
            <AlertTriangle className="mx-auto mb-2" size={32} />
            <p className="font-bold text-sm">{blockMessage}</p>
         </div>
       )}

       {!canAbsen && !done && !blockMessage && (
         <div className="mb-4 bg-yellow-100 text-yellow-800 p-3 rounded text-sm flex items-center">
           <Lock size={16} className="mr-2"/>
           Waktu absensi {form.session} belum dibuka/sudah lewat.
           <br/>(Pagi: 07.00-09.00, Sore: 16.00-17.00)
         </div>
       )}

       {done ? (
          <div className="text-center p-6 bg-green-50 border border-green-200 rounded">
             <CheckCircle size={48} className="text-green-600 mx-auto mb-2"/>
             <p className="font-bold text-green-800">Anda sudah melakukan absensi.</p>
             <p className="text-sm">Sesi {form.session}, Tanggal {formatDateIndo(form.date)}</p>
          </div>
       ) : (
          <form onSubmit={submit} className="space-y-4">
             <div><label className="font-bold block mb-1">Tanggal</label>
             <input type="date" disabled className="w-full p-2 bg-slate-100 border rounded" value={form.date}/></div>
             <div><label className="font-bold block mb-1">Sesi (Otomatis)</label>
             <input disabled className="w-full p-2 bg-slate-100 border rounded" value={form.session}/></div>
             {!blockMessage && (
                 <div><label className="font-bold block mb-1">Status Kehadiran</label>
                 <select className="w-full p-2 border rounded" value={form.status} onChange={e=>setForm({...form, status: e.target.value})}>
                    <option value="Hadir">Hadir</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Izin">Izin</option>
                    <option value="Cuti">Cuti</option>
                    <option value="Dinas Luar">Dinas Luar / Perjalanan Dinas</option>
                 </select></div>
             )}
             <button disabled={!canAbsen} className={`w-full text-white font-bold py-3 rounded ${canAbsen ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}>
                {canAbsen ? 'KIRIM ABSENSI' : 'WAKTU DITUTUP'}
             </button>
          </form>
       )}
    </div>
  );
}

function UserLaporanStatus({ user, attendance }) {
   const myLogs = attendance.filter(l => l.userId === user.id).sort((a,b) => b.timestamp?.localeCompare(a.timestamp));
   return (
      <div className="bg-white p-6 rounded shadow">
         <h2 className="text-xl font-bold mb-4">Status Laporan Absensi</h2>
         {myLogs.length === 0 ? <p className="text-slate-500">Belum ada riwayat.</p> : (
            <div className="space-y-3">
               {myLogs.map(l => (
                  <div key={l.id} className="border p-4 rounded flex justify-between items-center bg-slate-50">
                     <div>
                        <div className="font-bold">{formatDateIndo(l.date)} ({l.session})</div>
                        <div className="text-sm">Status: {l.status}</div>
                     </div>
                     <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                        ${l.statusApproval === 'approved' ? 'bg-green-100 text-green-700' : 
                          l.statusApproval === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {l.statusApproval}
                     </span>
                  </div>
               ))}
            </div>
         )}
      </div>
   );
}

function UserRekapan({ user, attendance, settings }) {
   const [viewMode, setViewMode] = useState('bulanan');
   const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
   const [week, setWeek] = useState(getTodayString());

   const filteredLogs = attendance.filter(l => {
      const isUser = l.userId === user.id && l.statusApproval === 'approved';
      if(!isUser) return false;
      if(viewMode === 'bulanan') return l.date.startsWith(month);
      else {
         const logWeek = getWeekNumber(new Date(l.date));
         const selectedWeek = getWeekNumber(new Date(week));
         return logWeek === selectedWeek && l.date.substring(0,4) === week.substring(0,4);
      }
   });

   const counts = {
      Hadir: filteredLogs.filter(l => l.status === 'Hadir').length,
      Sakit: filteredLogs.filter(l => l.status === 'Sakit').length,
      Izin: filteredLogs.filter(l => l.status === 'Izin').length,
      Cuti: filteredLogs.filter(l => l.status === 'Cuti').length,
      DL: filteredLogs.filter(l => l.status === 'Dinas Luar').length,
   };

   const rangeText = viewMode === 'bulanan' 
      ? new Date(month+'-01').toLocaleDateString('id-ID', {month:'long', year:'numeric'})
      : `Minggu ke-${getWeekNumber(new Date(week))} (${new Date(week).getFullYear()})`;

   return (
      <div className="space-y-6">
         <div className="bg-white p-4 rounded shadow print:hidden flex flex-wrap gap-4 items-end justify-between">
            <div className="flex gap-4">
               <div>
                  <label className="block text-xs font-bold mb-1">Tipe Rekapan</label>
                  <select className="border p-2 rounded w-32" value={viewMode} onChange={e=>setViewMode(e.target.value)}>
                     <option value="bulanan">Bulanan</option>
                     <option value="mingguan">Mingguan</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold mb-1">{viewMode === 'bulanan' ? 'Pilih Bulan' : 'Pilih Tanggal (Dalam Minggu)'}</label>
                  {viewMode === 'bulanan' ? (
                     <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="border p-2 rounded"/>
                  ) : (
                     <input type="date" value={week} onChange={e=>setWeek(e.target.value)} className="border p-2 rounded"/>
                  )}
               </div>
            </div>
            <button onClick={()=>window.print()} className="bg-slate-800 text-white px-4 py-2 rounded flex items-center"><Printer size={16} className="mr-2"/> Cetak</button>
         </div>

         <div className="bg-white p-10 rounded shadow print:shadow-none print:w-full">
            <div className="flex border-b-4 border-double border-black pb-4 mb-6 items-center justify-center relative">
               <img src={settings.logoUrl || DEFAULT_LOGO_URL} className="h-16 absolute left-0"/>
               <div className="text-center px-16">
                  <h3 className="text-xl font-bold uppercase">{settings.parentAgency}</h3>
                  <h1 className="text-xl font-bold uppercase">{settings.opdName}</h1>
                  <p className="text-xs italic">{settings.address}</p>
               </div>
            </div>
            <div className="text-center pb-4 mb-6">
               <h3 className="text-xl font-bold underline">REKAPAN ABSENSI PEGAWAI</h3>
               <p className="uppercase font-medium">PERIODE: {rangeText}</p>
            </div>
            <div className="mb-6">
               <table className="w-full">
                  <tbody>
                     <tr><td className="w-32 font-bold">Nama</td><td>: {user.nama}</td></tr>
                     <tr><td className="font-bold">Jabatan</td><td>: {user.jabatan}</td></tr>
                     <tr><td className="font-bold">No</td><td>: {user.no || '-'}</td></tr>
                  </tbody>
               </table>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-6 text-center text-sm">
               {Object.entries(counts).map(([k,v]) => (
                  <div key={k} className="bg-slate-50 border p-2 rounded">
                     <span className="block font-bold text-lg">{v}</span> {k}
                  </div>
               ))}
            </div>
            <table className="w-full border-collapse border border-black text-sm">
               <thead className="bg-slate-100">
                  <tr>
                     <th className="border border-black p-2">Tanggal</th>
                     <th className="border border-black p-2">Sesi</th>
                     <th className="border border-black p-2">Status</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredLogs.length > 0 ? (
                     filteredLogs.sort((a,b) => a.date.localeCompare(b.date)).map(l => (
                        <tr key={l.id}>
                           <td className="border border-black p-2 text-center">{formatDateIndo(l.date)}</td>
                           <td className="border border-black p-2 text-center">{l.session}</td>
                           <td className="border border-black p-2 text-center">{l.status}</td>
                        </tr>
                     ))
                  ) : (
                     <tr><td colSpan="3" className="border border-black p-4 text-center italic">Tidak ada data absensi pada periode ini.</td></tr>
                  )}
               </tbody>
            </table>
            <div className="mt-16 flex justify-end text-center">
               <div className="min-w-[200px] w-auto px-4">
                  <p>Bobong, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month:'long', year:'numeric'})}</p>
                  <p className="mb-20">Pegawai Yang Bersangkutan</p>
                  <p className="font-bold underline whitespace-nowrap">{user.nama}</p>
               </div>
            </div>
         </div>
      </div>
   );
}