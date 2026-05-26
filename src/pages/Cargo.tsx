import React, { useState, useEffect } from 'react';
import {
  Navigation, Package, ArrowLeft, ArrowRight, Sparkles, MapPin,
  Shield, AlertTriangle, CheckCircle, Truck, DollarSign, Clock,
  Users, Phone, MessageSquare, Bell, Star, X,
  ChevronDown, ChevronUp, Plus, Mail, Globe, Search, Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Auth } from './Auth';
import type { Page } from './Landing';

type Props = { onNavigate: (page: Page) => void };

// ─── Types ───────────────────────────────────────────────────────────────────

type CargoCompany = {
  id: string;
  company_name: string;
  description: string;
  operating_regions: string[];
  delivery_routes: DeliveryRoute[];
  cargo_types: string[];
  fleet_info: FleetInfo;
  pricing_structure: PricingStructure;
  insurance_info: string;
  warehouse_info: string;
  min_delivery_days: number;
  max_delivery_days: number;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  images: string[];
  policies: string;
  rating: number;
  review_count: number;
  is_verified: boolean;
};

type DeliveryRoute = { from: string; to: string; price_per_kg: number; days: number };
type FleetInfo = { trucks: number; trucks_description: string; max_capacity_kg: number };
type PricingStructure = { base_rate_kes: number; per_kg_kes: number; minimum_charge_kes: number; notes: string };

type ShipmentForm = {
  from: string; to: string; weight: number; description: string;
  is_fragile: boolean; is_hazardous: boolean;
  urgency: 'standard' | 'express' | 'overnight';
  sender_phone: string; receiver_phone: string; receiver_name: string;
  insurance: boolean; cost_share: boolean;
  cargo_category: 'parcel' | 'produce' | 'machinery' | 'livestock' | 'electronics' | 'furniture' | 'other';
};

type Quote = {
  base: number; weight: number; fragile: number; hazardous: number;
  fuel: number; insurance: number; platform: number;
  urgencyMult: number; subtotal: number; vat: number; total: number;
  upfront: number; on_delivery: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const DIST: Record<string, Record<string, number>> = {
  Nairobi: { Mombasa: 480, Kisumu: 350, Nakuru: 160, Meru: 240, Eldoret: 320, Kampala: 670, Dar: 860, Kigali: 720 },
  Mombasa: { Nairobi: 480, Kisumu: 740, Meru: 620, Dar: 490 },
  Kisumu: { Nairobi: 350, Kampala: 220, Eldoret: 150 },
  Nakuru: { Nairobi: 160, Kisumu: 190, Eldoret: 180 },
  Eldoret: { Nairobi: 320, Kampala: 350 },
  Kampala: { Nairobi: 670, Kigali: 500, Dar: 1100 },
  Kigali: { Nairobi: 720, Kampala: 500, Dar: 600 },
  Dar: { Nairobi: 860, Kampala: 1100, Mombasa: 490 },
};

const CARGO_CATEGORIES = [
  { k: 'parcel', label: 'Parcel / Documents' },
  { k: 'produce', label: 'Farm Produce' },
  { k: 'machinery', label: 'Machinery / Tools' },
  { k: 'livestock', label: 'Livestock' },
  { k: 'electronics', label: 'Electronics' },
  { k: 'furniture', label: 'Furniture / Household' },
  { k: 'other', label: 'Other' },
] as const;

const URGENCY = {
  standard: { label: 'Standard', days: '3–5 days', mult: '1×' },
  express: { label: 'Express', days: '1–2 days', mult: '1.5×' },
  overnight: { label: 'Overnight', days: 'Next day', mult: '2×' },
};

const STEPS = ['Details', 'Quote', 'Payment', 'Done'] as const;

const INP = "w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 transition-colors placeholder-gray-400 outline-none";

// Demo companies shown when DB is empty
const DEMO_COMPANIES: CargoCompany[] = [
  {
    id: 'demo-1',
    company_name: 'SwiftCargo Kenya',
    description: 'Fast, reliable cargo logistics across Kenya and East Africa. Specialists in perishables, electronics, and general freight.',
    operating_regions: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Meru'],
    delivery_routes: [
      { from: 'Nairobi', to: 'Mombasa', price_per_kg: 18, days: 1 },
      { from: 'Nairobi', to: 'Kisumu', price_per_kg: 15, days: 1 },
      { from: 'Nairobi', to: 'Eldoret', price_per_kg: 14, days: 1 },
    ],
    cargo_types: ['Parcels', 'Farm Produce', 'Electronics', 'Furniture', 'General Freight'],
    fleet_info: { trucks: 24, trucks_description: '3-tonne vans, 7-tonne lorries, 10-tonne trucks', max_capacity_kg: 10000 },
    pricing_structure: { base_rate_kes: 500, per_kg_kes: 18, minimum_charge_kes: 800, notes: 'Express and overnight rates apply. Bulk discounts above 500kg.' },
    insurance_info: 'Full cargo insurance available at 5.5% of declared value. Covers loss, damage, and theft.',
    warehouse_info: 'Bonded warehouses in Nairobi (Industrial Area) and Mombasa (Shimanzi). 24-hour security.',
    min_delivery_days: 1,
    max_delivery_days: 3,
    contact_name: 'Operations Team',
    contact_email: 'ops@swiftcargo.co.ke',
    contact_phone: '0800720720',
    website: 'swiftcargo.co.ke',
    images: ['https://images.pexels.com/photos/1427541/pexels-photo-1427541.jpeg?w=800'],
    policies: 'Items must be properly packaged. Hazardous materials require prior approval. 24hr notice for cancellations.',
    rating: 4.7,
    review_count: 234,
    is_verified: true,
  },
  {
    id: 'demo-2',
    company_name: 'Trans-Africa Freight',
    description: 'Cross-border logistics specialists covering Kenya, Uganda, Tanzania, Rwanda, and South Sudan. Customs clearance handled end-to-end.',
    operating_regions: ['Nairobi', 'Kampala', 'Dar es Salaam', 'Kigali', 'Juba'],
    delivery_routes: [
      { from: 'Nairobi', to: 'Kampala', price_per_kg: 22, days: 2 },
      { from: 'Nairobi', to: 'Dar es Salaam', price_per_kg: 28, days: 3 },
      { from: 'Nairobi', to: 'Kigali', price_per_kg: 25, days: 2 },
    ],
    cargo_types: ['Machinery', 'Electronics', 'Construction Materials', 'Foodstuffs', 'Textiles'],
    fleet_info: { trucks: 48, trucks_description: 'Flatbeds, refrigerated trucks, 20-tonne semi-trailers', max_capacity_kg: 20000 },
    pricing_structure: { base_rate_kes: 1000, per_kg_kes: 22, minimum_charge_kes: 2000, notes: 'Cross-border clearance included. Insurance mandatory for electronics.' },
    insurance_info: 'Comprehensive cargo insurance. Marine transit cover for all cross-border routes.',
    warehouse_info: 'Warehouses at Nairobi ICD, Namanga border, and Malaba border. Temperature-controlled storage available.',
    min_delivery_days: 2,
    max_delivery_days: 5,
    contact_name: 'Sarah Njoroge',
    contact_email: 'sarah@transafrica.co.ke',
    contact_phone: '0722100200',
    website: 'transafrica.co.ke',
    images: ['https://images.pexels.com/photos/2226458/pexels-photo-2226458.jpeg?w=800'],
    policies: 'All cross-border shipments require commercial invoice and packing list. Customs bond available.',
    rating: 4.9,
    review_count: 456,
    is_verified: true,
  },
  {
    id: 'demo-3',
    company_name: 'Fresh Route Logistics',
    description: 'Specialists in cold-chain and perishables logistics. Serving farmers, supermarkets, and food exporters across East Africa.',
    operating_regions: ['Central Kenya', 'Rift Valley', 'Coast', 'Western Kenya'],
    delivery_routes: [
      { from: 'Meru', to: 'Nairobi', price_per_kg: 12, days: 1 },
      { from: 'Nakuru', to: 'Nairobi', price_per_kg: 10, days: 1 },
      { from: 'Nairobi', to: 'Mombasa', price_per_kg: 16, days: 1 },
    ],
    cargo_types: ['Farm Produce', 'Dairy', 'Meat & Poultry', 'Fish', 'Flowers'],
    fleet_info: { trucks: 16, trucks_description: 'Refrigerated vans, reefer trucks, insulated containers', max_capacity_kg: 5000 },
    pricing_structure: { base_rate_kes: 400, per_kg_kes: 12, minimum_charge_kes: 600, notes: 'Cold-chain surcharge applies. Overnight delivery available for produce.' },
    insurance_info: 'Perishables insurance available. Cold-chain guarantee with temperature monitoring.',
    warehouse_info: 'Cold storage at Nairobi Wakulima Market and Mombasa Port. Temperature logs provided.',
    min_delivery_days: 1,
    max_delivery_days: 2,
    contact_name: 'Peter Kamau',
    contact_email: 'peter@freshroute.co.ke',
    contact_phone: '0734567890',
    website: 'freshroute.co.ke',
    images: ['https://images.pexels.com/photos/2199293/pexels-photo-2199293.jpeg?w=800'],
    policies: 'Perishables must be pre-cooled before handover. Delivery confirmation required within 2 hours.',
    rating: 4.6,
    review_count: 178,
    is_verified: true,
  },
];

// ─── Helper functions ─────────────────────────────────────────────────────────

function dist(from: string, to: string) {
  const a = Object.keys(DIST).find(k => from.toLowerCase().includes(k.toLowerCase()));
  const b = Object.keys(DIST).find(k => to.toLowerCase().includes(k.toLowerCase()));
  if (a && b) return DIST[a]?.[b] ?? DIST[b]?.[a] ?? 350;
  return 350;
}

function calcQuote(f: ShipmentForm): Quote {
  const d = dist(f.from, f.to);
  const base = Math.round(500 + d * 0.85);
  const weight = Math.round(f.weight * 22);
  const fragile = f.is_fragile ? Math.round(base * 0.15) : 0;
  const hazardous = f.is_hazardous ? Math.round(base * 0.28) : 0;
  const fuel = Math.round((base + weight) * 0.13);
  const insurance = f.insurance ? Math.round((base + weight) * 0.055 + 250) : 0;
  const platform = 200;
  const urgencyMult = f.urgency === 'overnight' ? 2.0 : f.urgency === 'express' ? 1.5 : 1.0;
  const subtotal = Math.round((base + weight + fragile + hazardous + fuel + insurance + platform) * urgencyMult);
  const vat = Math.round(subtotal * 0.16);
  const total = subtotal + vat;
  return { base, weight, fragile, hazardous, fuel, insurance, platform, urgencyMult, subtotal, vat, total, upfront: Math.round(total * 0.7), on_delivery: Math.round(total * 0.3) };
}

function trackingCode() {
  return 'SNG-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
}

// ─── Main component ───────────────────────────────────────────────────────────

type Tab = 'book' | 'companies' | 'track';
type CompanyView = 'list' | 'detail' | 'inquire' | 'register' | 'success';

export const Cargo: React.FC<Props> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('book');
  const [companyView, setCompanyView] = useState<CompanyView>('list');
  const [companies, setCompanies] = useState<CargoCompany[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<CargoCompany | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuth, setShowAuth] = useState(false);

  // Book cargo flow
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ShipmentForm>({
    from: '', to: '', weight: 5, description: '',
    is_fragile: false, is_hazardous: false, urgency: 'standard',
    sender_phone: profile?.phone ?? '', receiver_phone: '', receiver_name: '', insurance: false,
    cost_share: false, cargo_category: 'other',
  });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [code] = useState(trackingCode);
  const [saving, setSaving] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState(profile?.phone ?? '');
  const [paymentStep, setPaymentStep] = useState<'pending' | 'stk_sent' | 'confirmed'>('pending');

  // Track
  const [trackCode, setTrackCode] = useState('');
  const [trackResult, setTrackResult] = useState<null | { status: string; route: string; updated: string }>(null);

  // Inquiry
  const [inquiryForm, setInquiryForm] = useState({
    contact_name: profile?.full_name ?? '',
    contact_phone: profile?.phone ?? '',
    contact_email: '',
    origin: '',
    destination: '',
    cargo_type: '',
    weight_kg: 50,
    message: '',
  });
  const [inquirySaving, setInquirySaving] = useState(false);

  // Register company form
  const [regForm, setRegForm] = useState({
    company_name: '',
    description: '',
    operating_regions: '',
    cargo_types: '',
    insurance_info: '',
    warehouse_info: '',
    min_delivery_days: 1,
    max_delivery_days: 5,
    contact_name: profile?.full_name ?? '',
    contact_email: '',
    contact_phone: profile?.phone ?? '',
    website: '',
    policies: '',
    base_rate_kes: 500,
    per_kg_kes: 18,
    minimum_charge_kes: 800,
    pricing_notes: '',
    trucks: 1,
    trucks_description: '',
    max_capacity_kg: 5000,
  });
  const [regRoutes, setRegRoutes] = useState<DeliveryRoute[]>([
    { from: '', to: '', price_per_kg: 0, days: 1 },
  ]);
  const [regSaving, setRegSaving] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (profile) {
      setMpesaPhone(profile.phone);
      setForm(p => ({ ...p, sender_phone: profile.phone }));
      setInquiryForm(f => ({ ...f, contact_name: profile.full_name, contact_phone: profile.phone }));
      setRegForm(f => ({ ...f, contact_name: profile.full_name, contact_phone: profile.phone }));
    }
  }, [profile]);

  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    const { data } = await supabase
      .from('cargo_companies')
      .select('*')
      .eq('is_active', true)
      .order('is_verified', { ascending: false });
    if (data && data.length > 0) {
      setCompanies(data as CargoCompany[]);
    } else {
      setCompanies(DEMO_COMPANIES);
    }
    setLoadingCompanies(false);
  };

  const f = (k: keyof ShipmentForm, v: any) => setForm(p => ({ ...p, [k]: v }));
  const getQuote = (e: React.FormEvent) => { e.preventDefault(); setQuote(calcQuote(form)); setStep(1); };

  const simulateMpesa = () => {
    setPaymentStep('stk_sent');
    setTimeout(() => setPaymentStep('confirmed'), 3000);
  };

  const confirm = async () => {
    if (!user) { setShowAuth(true); return; }
    setSaving(true);
    await supabase.from('cargo_shipments').insert({
      owner_id: user.id, origin: form.from, destination: form.to,
      weight_kg: form.weight, cargo_type: form.description,
      special_handling: [form.is_fragile && 'fragile', form.is_hazardous && 'hazardous'].filter(Boolean).join(', ') || null,
      urgency: form.urgency === 'overnight' ? 'same_day' : form.urgency,
      price_breakdown: { ...quote, meta: { sender_phone: form.sender_phone, receiver_name: form.receiver_name, receiver_phone: form.receiver_phone } },
      price_estimate: quote?.total, tracking_code: code, status: 'pending',
    });
    setSaving(false);
    setStep(3);
  };

  const handleTrack = () => {
    if (!trackCode.trim()) return;
    if (trackCode.toUpperCase().startsWith('SNG-')) {
      setTrackResult({ status: 'In Transit', route: 'Nairobi → Mombasa', updated: '2 hours ago' });
    } else {
      setTrackResult(null);
    }
  };

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setShowAuth(true); return; }
    if (!selectedCompany) return;
    setInquirySaving(true);
    const { error } = await supabase.from('cargo_company_inquiries').insert({
      company_id: selectedCompany.id,
      requester_id: user.id,
      ...inquiryForm,
    });
    setInquirySaving(false);
    if (!error) setCompanyView('success');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setShowAuth(true); return; }
    setRegSaving(true);
    setRegError(null);
    const { error } = await supabase.from('cargo_companies').insert({
      owner_id: user.id,
      company_name: regForm.company_name,
      description: regForm.description,
      operating_regions: regForm.operating_regions.split(',').map(s => s.trim()).filter(Boolean),
      delivery_routes: regRoutes.filter(r => r.from && r.to),
      cargo_types: regForm.cargo_types.split(',').map(s => s.trim()).filter(Boolean),
      fleet_info: { trucks: regForm.trucks, trucks_description: regForm.trucks_description, max_capacity_kg: regForm.max_capacity_kg },
      pricing_structure: { base_rate_kes: regForm.base_rate_kes, per_kg_kes: regForm.per_kg_kes, minimum_charge_kes: regForm.minimum_charge_kes, notes: regForm.pricing_notes },
      insurance_info: regForm.insurance_info,
      warehouse_info: regForm.warehouse_info,
      min_delivery_days: regForm.min_delivery_days,
      max_delivery_days: regForm.max_delivery_days,
      contact_name: regForm.contact_name,
      contact_email: regForm.contact_email,
      contact_phone: regForm.contact_phone,
      website: regForm.website,
      policies: regForm.policies,
    });
    setRegSaving(false);
    if (error) {
      setRegError(error.message || 'Failed to register. Please try again.');
    } else {
      setCompanyView('success');
      fetchCompanies();
    }
  };

  const filteredCompanies = companies.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q || c.company_name.toLowerCase().includes(q) ||
      c.operating_regions.some(r => r.toLowerCase().includes(q)) ||
      c.cargo_types.some(t => t.toLowerCase().includes(q));
  });

  const StepBar = () => (
    <div className="flex items-center gap-1.5 pb-3">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === i ? 'text-[#FF6B00]' : i < step ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2 ${step === i ? 'bg-[#FF6B00] border-[#FF6B00] text-white' : i < step ? 'bg-green-100 border-green-500 text-green-600' : 'bg-gray-100 border-gray-300 text-gray-400'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className="hidden sm:block">{s}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 rounded ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            {companyView !== 'list' && activeTab === 'companies' ? (
              <button onClick={() => setCompanyView('list')} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
            ) : (
              <button onClick={() => onNavigate('landing')} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
            )}
            <div className="w-8 h-8 bg-[#FF6B00] rounded-lg flex items-center justify-center ml-1">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div className="ml-1">
              <div className="text-sm font-black text-gray-900 leading-none">Songa Cargo</div>
              <div className="text-xs text-gray-500">AI-powered logistics</div>
            </div>
          </div>
          {activeTab === 'companies' && companyView === 'list' && (
            <button
              onClick={() => setCompanyView('register')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B00] text-white rounded-xl text-sm font-semibold hover:bg-[#e55f00] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List Company</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex border-t border-gray-100">
          {[
            { id: 'book', label: 'Book Cargo', icon: Package },
            { id: 'companies', label: 'Cargo Companies', icon: Truck },
            { id: 'track', label: 'Track', icon: MapPin },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as Tab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === id ? 'text-[#FF6B00] border-[#FF6B00]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* ── BOOK CARGO TAB ── */}
        {activeTab === 'book' && (
          <div className="max-w-2xl mx-auto">
            <StepBar />

            {step === 0 && (
              <form onSubmit={getQuote} className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-[#FF6B00]" />Route</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">From</label>
                      <input required value={form.from} onChange={e => f('from', e.target.value)} placeholder="e.g. Nairobi" className={INP} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">To</label>
                      <input required value={form.to} onChange={e => f('to', e.target.value)} placeholder="e.g. Kampala" className={INP} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                  <h2 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2"><Package className="w-4 h-4 text-[#FF6B00]" />Cargo Details</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {CARGO_CATEGORIES.map(({ k, label }) => (
                      <button key={k} type="button" onClick={() => f('cargo_category', k)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${form.cargo_category === k ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <input required value={form.description} onChange={e => f('description', e.target.value)} placeholder="Description (e.g. 10 bags of maize, electronics...)" className={INP} />
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Weight</label>
                    <div className="flex items-center gap-3 mb-2">
                      <button type="button" onClick={() => f('weight', Math.max(0.5, +(form.weight - 0.5).toFixed(1)))}
                        className="w-10 h-10 bg-gray-100 rounded-xl text-gray-700 font-bold hover:bg-gray-200 flex items-center justify-center">−</button>
                      <div className="flex-1 text-center text-2xl font-black text-[#FF6B00]">{form.weight} kg</div>
                      <button type="button" onClick={() => f('weight', +(form.weight + 0.5).toFixed(1))}
                        className="w-10 h-10 bg-gray-100 rounded-xl text-gray-700 font-bold hover:bg-gray-200 flex items-center justify-center">+</button>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {[1, 5, 10, 25, 50, 100, 500, 1000].map(n => (
                        <button key={n} type="button" onClick={() => f('weight', n)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${form.weight === n ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'}`}>
                          {n >= 1000 ? `${n / 1000}t` : `${n}kg`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[{ k: 'is_fragile', l: 'Fragile' }, { k: 'is_hazardous', l: 'Hazardous' }].map(({ k, l }) => (
                      <label key={k} className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${(form as any)[k] ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 hover:border-gray-300 text-gray-500'}`}>
                        <input type="checkbox" checked={(form as any)[k]} onChange={e => f(k as any, e.target.checked)} className="hidden" />
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-medium">{l}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-[#FF6B00]" />Speed</h2>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(URGENCY) as [string, typeof URGENCY.standard][]).map(([k, u]) => (
                      <button key={k} type="button" onClick={() => f('urgency', k)}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-0.5 transition-all ${form.urgency === k ? 'border-[#FF6B00] bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
                        <span className={`text-xs font-bold ${form.urgency === k ? 'text-[#FF6B00]' : 'text-gray-600'}`}>{u.label}</span>
                        <span className="text-xs text-gray-400">{u.days}</span>
                        <span className={`text-xs font-semibold ${form.urgency === k ? 'text-orange-400' : 'text-gray-400'}`}>{u.mult}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                  <h2 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2"><Phone className="w-4 h-4 text-[#FF6B00]" />Contacts & Protection</h2>
                  <input required type="tel" value={form.sender_phone} onChange={e => f('sender_phone', e.target.value)} placeholder="Your phone" className={INP} />
                  <div className="grid grid-cols-2 gap-3">
                    <input required value={form.receiver_name} onChange={e => f('receiver_name', e.target.value)} placeholder="Receiver name" className={INP} />
                    <input required type="tel" value={form.receiver_phone} onChange={e => f('receiver_phone', e.target.value)} placeholder="Receiver phone" className={INP} />
                  </div>
                  <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${form.insurance ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={form.insurance} onChange={e => f('insurance', e.target.checked)} className="hidden" />
                    <Shield className="w-5 h-5 flex-shrink-0" style={{ color: form.insurance ? '#16a34a' : '#9ca3af' }} />
                    <div>
                      <div className={`text-sm font-semibold ${form.insurance ? 'text-green-700' : 'text-gray-700'}`}>Add Cargo Insurance</div>
                      <div className="text-xs text-gray-500">Protection against loss or damage</div>
                    </div>
                  </label>
                </div>

                <button type="submit" className="w-full py-4 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />Get AI Quote <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {step === 1 && quote && (
              <div className="space-y-4">
                <div className="bg-[#FF6B00] rounded-2xl p-6 text-white shadow-xl shadow-orange-500/20">
                  <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 opacity-80" /><span className="text-xs font-bold uppercase tracking-wider opacity-80">AI Freight Quote</span></div>
                  <div className="text-5xl font-black mb-1">KES {quote.total.toLocaleString()}</div>
                  <div className="text-orange-100 text-sm">{form.from} → {form.to} · {form.weight}kg · {URGENCY[form.urgency].label}</div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                      <div className="text-xs text-orange-600 font-semibold mb-1">70% Upfront</div>
                      <div className="text-lg font-black text-[#FF6B00]">KES {quote.upfront.toLocaleString()}</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                      <div className="text-xs text-gray-600 font-semibold mb-1">30% on Delivery</div>
                      <div className="text-lg font-black text-gray-700">KES {quote.on_delivery.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      ['Base fare', quote.base], ['Weight charge', quote.weight],
                      quote.fragile > 0 && ['Fragile handling', quote.fragile],
                      quote.hazardous > 0 && ['Hazardous surcharge', quote.hazardous],
                      ['Fuel surcharge', quote.fuel],
                      quote.insurance > 0 && ['Insurance', quote.insurance],
                      ['Platform fee', quote.platform],
                    ].filter(Boolean).map(([k, v]) => (
                      <div key={k as string} className="flex justify-between text-sm">
                        <span className="text-gray-500">{k}</span>
                        <span className="text-gray-900">KES {(v as number).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                      <span className="text-gray-500">VAT (16%)</span><span>KES {quote.vat.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-black text-base border-t border-gray-200 pt-2">
                      <span>Total</span><span className="text-[#FF6B00]">KES {quote.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl text-sm font-semibold">Adjust</button>
                  <button onClick={() => setStep(2)} className="flex-1 py-3 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
                    Pay via M-Pesa <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && quote && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">M-Pesa Payment</div>
                    <div className="text-xs text-gray-500">KES {quote.upfront.toLocaleString()} (70% upfront)</div>
                  </div>
                </div>

                {paymentStep === 'pending' && (
                  <>
                    <input type="tel" value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)} placeholder="07XX XXX XXX" className={`${INP} mb-3`} />
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 space-y-1.5 text-sm">
                      {[['Route', `${form.from} → ${form.to}`], ['Weight', `${form.weight}kg`], ['Tracking', code]].map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-gray-500">{k}</span>
                          <span className={k === 'Tracking' ? 'font-mono text-[#FF6B00] font-bold' : 'font-semibold text-gray-900'}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={simulateMpesa} disabled={!mpesaPhone}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-sm disabled:opacity-50">
                      Send M-Pesa STK Push
                    </button>
                    <button onClick={() => setStep(1)} className="w-full mt-2 py-2 text-gray-500 text-sm">Back</button>
                  </>
                )}

                {paymentStep === 'stk_sent' && (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="w-8 h-8 border-[3px] border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">STK Push Sent</h4>
                    <p className="text-sm text-gray-500">Enter your M-Pesa PIN on <strong>{mpesaPhone}</strong></p>
                  </div>
                )}

                {paymentStep === 'confirmed' && (
                  <div className="text-center py-4">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-400">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">Payment Confirmed!</h4>
                    <p className="text-sm text-gray-500 mb-4">KES {quote.upfront.toLocaleString()} received</p>
                    <button onClick={confirm} disabled={saving}
                      className="w-full py-3 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle className="w-4 h-4" />Confirm Booking</>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-orange-300">
                  <Package className="w-12 h-12 text-[#FF6B00]" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Shipment Booked!</h2>
                <p className="text-gray-500 mb-4">Track using:</p>
                <div className="inline-block bg-orange-100 border border-orange-300 rounded-xl px-6 py-3 font-mono font-bold text-lg text-[#FF6B00] mb-8">{code}</div>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => onNavigate('landing')}
                    className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-semibold text-sm">
                    <Navigation className="w-4 h-4 text-[#FF6B00]" />Home
                  </button>
                  <button onClick={() => { setStep(0); setPaymentStep('pending'); }}
                    className="flex items-center gap-2 bg-[#FF6B00] text-white px-6 py-3 rounded-2xl font-bold text-sm">
                    Ship Again <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CARGO COMPANIES TAB ── */}
        {activeTab === 'companies' && (
          <>
            {/* SUCCESS */}
            {companyView === 'success' && (
              <div className="text-center py-16 max-w-md mx-auto">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 border-2 border-green-300">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">
                  {selectedCompany ? 'Inquiry Sent!' : 'Company Listed!'}
                </h2>
                <p className="text-gray-500 mb-8 text-sm">
                  {selectedCompany ? `${selectedCompany.company_name} will contact you shortly.` : 'Pending verification by our team.'}
                </p>
                <button onClick={() => { setCompanyView('list'); setSelectedCompany(null); }}
                  className="px-8 py-3 bg-[#FF6B00] text-white rounded-2xl font-bold text-sm">
                  Back to Companies
                </button>
              </div>
            )}

            {/* REGISTER */}
            {companyView === 'register' && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-[#FF6B00] rounded-2xl p-6 text-white mb-6 shadow-lg shadow-orange-500/20">
                  <h2 className="text-xl font-black mb-1">Register Your Cargo Company</h2>
                  <p className="text-orange-100 text-sm">Connect with thousands of businesses needing freight services across East Africa.</p>
                </div>
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-gray-900">Company Info</h3>
                    <input required value={regForm.company_name} onChange={e => setRegForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Company name" className={INP} />
                    <textarea required value={regForm.description} onChange={e => setRegForm(f => ({ ...f, description: e.target.value }))} placeholder="What services do you offer? What makes you different?" rows={3}
                      className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none placeholder-gray-400 resize-none" />
                    <input required value={regForm.operating_regions} onChange={e => setRegForm(f => ({ ...f, operating_regions: e.target.value }))} placeholder="Operating regions (comma-separated): Nairobi, Mombasa, Kisumu" className={INP} />
                    <input required value={regForm.cargo_types} onChange={e => setRegForm(f => ({ ...f, cargo_types: e.target.value }))} placeholder="Cargo types (comma-separated): Parcels, Produce, Machinery" className={INP} />
                  </div>

                  {/* Delivery routes */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-900">Delivery Routes & Pricing</h3>
                      <button type="button" onClick={() => setRegRoutes(rs => [...rs, { from: '', to: '', price_per_kg: 0, days: 1 }])}
                        className="text-xs text-[#FF6B00] font-semibold flex items-center gap-1 hover:underline">
                        <Plus className="w-3.5 h-3.5" />Add Route
                      </button>
                    </div>
                    <div className="space-y-3">
                      {regRoutes.map((route, i) => (
                        <div key={i} className="grid grid-cols-4 gap-2 items-center">
                          <input value={route.from} onChange={e => setRegRoutes(rs => rs.map((r, j) => j === i ? { ...r, from: e.target.value } : r))} placeholder="From" className={INP} />
                          <input value={route.to} onChange={e => setRegRoutes(rs => rs.map((r, j) => j === i ? { ...r, to: e.target.value } : r))} placeholder="To" className={INP} />
                          <input type="number" value={route.price_per_kg || ''} onChange={e => setRegRoutes(rs => rs.map((r, j) => j === i ? { ...r, price_per_kg: +e.target.value } : r))} placeholder="KES/kg" className={INP} />
                          <div className="flex items-center gap-1">
                            <input type="number" min={1} value={route.days} onChange={e => setRegRoutes(rs => rs.map((r, j) => j === i ? { ...r, days: +e.target.value } : r))} placeholder="Days" className={INP} />
                            {regRoutes.length > 1 && (
                              <button type="button" onClick={() => setRegRoutes(rs => rs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 p-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fleet */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-gray-900">Fleet Information</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Number of Trucks</label>
                        <input type="number" min={1} value={regForm.trucks} onChange={e => setRegForm(f => ({ ...f, trucks: +e.target.value }))} className={INP} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Max Capacity (kg)</label>
                        <input type="number" min={100} value={regForm.max_capacity_kg} onChange={e => setRegForm(f => ({ ...f, max_capacity_kg: +e.target.value }))} className={INP} />
                      </div>
                    </div>
                    <input value={regForm.trucks_description} onChange={e => setRegForm(f => ({ ...f, trucks_description: e.target.value }))} placeholder="Fleet description (e.g. 3-tonne vans, 10-tonne lorries)" className={INP} />
                  </div>

                  {/* Pricing */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-gray-900">Pricing Structure</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Base Rate (KES)</label>
                        <input type="number" min={0} value={regForm.base_rate_kes} onChange={e => setRegForm(f => ({ ...f, base_rate_kes: +e.target.value }))} className={INP} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Per KG (KES)</label>
                        <input type="number" min={0} value={regForm.per_kg_kes} onChange={e => setRegForm(f => ({ ...f, per_kg_kes: +e.target.value }))} className={INP} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Min Charge (KES)</label>
                        <input type="number" min={0} value={regForm.minimum_charge_kes} onChange={e => setRegForm(f => ({ ...f, minimum_charge_kes: +e.target.value }))} className={INP} />
                      </div>
                    </div>
                    <input value={regForm.pricing_notes} onChange={e => setRegForm(f => ({ ...f, pricing_notes: e.target.value }))} placeholder="Pricing notes (e.g. bulk discounts, express rates)" className={INP} />
                  </div>

                  {/* Other info */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-gray-900">Insurance & Warehousing</h3>
                    <textarea value={regForm.insurance_info} onChange={e => setRegForm(f => ({ ...f, insurance_info: e.target.value }))} placeholder="Insurance details: coverage types, partner insurer, claim process..." rows={2}
                      className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none placeholder-gray-400 resize-none" />
                    <textarea value={regForm.warehouse_info} onChange={e => setRegForm(f => ({ ...f, warehouse_info: e.target.value }))} placeholder="Warehouse locations, capacity, security, temperature control..." rows={2}
                      className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none placeholder-gray-400 resize-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Min Delivery Days</label>
                        <input type="number" min={1} value={regForm.min_delivery_days} onChange={e => setRegForm(f => ({ ...f, min_delivery_days: +e.target.value }))} className={INP} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Max Delivery Days</label>
                        <input type="number" min={1} value={regForm.max_delivery_days} onChange={e => setRegForm(f => ({ ...f, max_delivery_days: +e.target.value }))} className={INP} />
                      </div>
                    </div>
                    <textarea value={regForm.policies} onChange={e => setRegForm(f => ({ ...f, policies: e.target.value }))} placeholder="Booking policies, cancellation terms, packaging requirements..." rows={2}
                      className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none placeholder-gray-400 resize-none" />
                  </div>

                  {/* Contact */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-gray-900">Contact</h3>
                    <input required value={regForm.contact_name} onChange={e => setRegForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Contact person name" className={INP} />
                    <div className="grid grid-cols-2 gap-3">
                      <input required type="email" value={regForm.contact_email} onChange={e => setRegForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="Email" className={INP} />
                      <input required type="tel" value={regForm.contact_phone} onChange={e => setRegForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="Phone" className={INP} />
                    </div>
                    <input value={regForm.website} onChange={e => setRegForm(f => ({ ...f, website: e.target.value }))} placeholder="Website (optional)" className={INP} />
                  </div>

                  {regError && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{regError}</div>}

                  <button type="submit" disabled={regSaving}
                    className="w-full py-4 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                    {regSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle className="w-4 h-4" />Submit Company</>}
                  </button>
                </form>
              </div>
            )}

            {/* INQUIRY */}
            {companyView === 'inquire' && selectedCompany && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm mb-5 flex items-center gap-3">
                  {selectedCompany.images[0] && <img src={selectedCompany.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover" />}
                  <div>
                    <div className="font-bold text-gray-900">{selectedCompany.company_name}</div>
                    <div className="text-xs text-gray-500">{selectedCompany.operating_regions.slice(0, 3).join(' · ')}</div>
                  </div>
                </div>
                <form onSubmit={handleInquiry} className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-gray-900">Your Details</h3>
                    <input required value={inquiryForm.contact_name} onChange={e => setInquiryForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Your name" className={INP} />
                    <div className="grid grid-cols-2 gap-3">
                      <input required type="email" value={inquiryForm.contact_email} onChange={e => setInquiryForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="Email" className={INP} />
                      <input required type="tel" value={inquiryForm.contact_phone} onChange={e => setInquiryForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="Phone" className={INP} />
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-gray-900">Shipment Details</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <input required value={inquiryForm.origin} onChange={e => setInquiryForm(f => ({ ...f, origin: e.target.value }))} placeholder="Origin" className={INP} />
                      <input required value={inquiryForm.destination} onChange={e => setInquiryForm(f => ({ ...f, destination: e.target.value }))} placeholder="Destination" className={INP} />
                    </div>
                    <input required value={inquiryForm.cargo_type} onChange={e => setInquiryForm(f => ({ ...f, cargo_type: e.target.value }))} placeholder="Cargo type" className={INP} />
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setInquiryForm(f => ({ ...f, weight_kg: Math.max(0.5, f.weight_kg - 0.5) }))}
                        className="w-10 h-10 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 flex items-center justify-center">−</button>
                      <div className="flex-1 text-center text-xl font-black text-[#FF6B00]">{inquiryForm.weight_kg} kg</div>
                      <button type="button" onClick={() => setInquiryForm(f => ({ ...f, weight_kg: +(f.weight_kg + 0.5).toFixed(1) }))}
                        className="w-10 h-10 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 flex items-center justify-center">+</button>
                    </div>
                    <textarea required value={inquiryForm.message} onChange={e => setInquiryForm(f => ({ ...f, message: e.target.value }))} placeholder="Additional details, delivery requirements..." rows={3}
                      className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none placeholder-gray-400 resize-none" />
                  </div>
                  <button type="submit" disabled={inquirySaving}
                    className="w-full py-4 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-2xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                    {inquirySaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Mail className="w-4 h-4" />Send Inquiry</>}
                  </button>
                </form>
              </div>
            )}

            {/* COMPANY DETAIL */}
            {companyView === 'detail' && selectedCompany && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-5">
                  {selectedCompany.images[0] && (
                    <div className="h-48 relative overflow-hidden">
                      <img src={selectedCompany.images[0]} alt={selectedCompany.company_name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4">
                        <h1 className="text-xl font-black text-white">{selectedCompany.company_name}</h1>
                        {selectedCompany.is_verified && (
                          <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit mt-1">
                            <CheckCircle className="w-3 h-3" />Verified
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="p-5">
                    {selectedCompany.rating > 0 && (
                      <div className="flex items-center gap-1.5 mb-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < Math.round(selectedCompany.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                        ))}
                        <span className="text-sm font-bold">{selectedCompany.rating}</span>
                        <span className="text-xs text-gray-400">({selectedCompany.review_count})</span>
                      </div>
                    )}
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">{selectedCompany.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {selectedCompany.operating_regions.map(r => (
                        <span key={r} className="bg-orange-50 border border-orange-200 text-[#FF6B00] text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{r}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCompany.cargo_types.map(t => (
                        <span key={t} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Routes */}
                {selectedCompany.delivery_routes.length > 0 && (
                  <div className="mb-5">
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Routes & Rates</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedCompany.delivery_routes.map((r, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Truck className="w-4 h-4 text-[#FF6B00]" />
                            <span className="font-bold text-gray-900 text-sm">{r.from} → {r.to}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs font-bold text-[#FF6B00]">KES {r.price_per_kg}/kg</span>
                            <span className="text-xs text-gray-500">{r.days} day{r.days !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fleet + Pricing grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fleet</div>
                    <div className="text-2xl font-black text-[#FF6B00] mb-1">{selectedCompany.fleet_info.trucks} trucks</div>
                    <p className="text-xs text-gray-500">{selectedCompany.fleet_info.trucks_description}</p>
                    <p className="text-xs text-gray-500 mt-1">Max: {selectedCompany.fleet_info.max_capacity_kg?.toLocaleString()}kg</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pricing</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-gray-500">Base rate</span><span className="font-bold">KES {selectedCompany.pricing_structure.base_rate_kes?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Per kg</span><span className="font-bold">KES {selectedCompany.pricing_structure.per_kg_kes}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Minimum</span><span className="font-bold">KES {selectedCompany.pricing_structure.minimum_charge_kes?.toLocaleString()}</span></div>
                    </div>
                    {selectedCompany.pricing_structure.notes && <p className="text-xs text-gray-400 mt-2">{selectedCompany.pricing_structure.notes}</p>}
                  </div>
                </div>

                {selectedCompany.insurance_info && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                    <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" />Insurance</div>
                    <p className="text-xs text-green-800">{selectedCompany.insurance_info}</p>
                  </div>
                )}

                {selectedCompany.warehouse_info && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                    <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Warehousing</div>
                    <p className="text-xs text-blue-800">{selectedCompany.warehouse_info}</p>
                  </div>
                )}

                {/* Contact */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-5">
                  <h2 className="text-sm font-bold text-gray-900 mb-3">Contact</h2>
                  {selectedCompany.contact_phone && (
                    <a href={`tel:${selectedCompany.contact_phone}`} className="flex items-center gap-2 text-sm text-[#FF6B00] hover:underline mb-1.5">
                      <Phone className="w-4 h-4" />{selectedCompany.contact_phone}
                    </a>
                  )}
                  {selectedCompany.contact_email && (
                    <a href={`mailto:${selectedCompany.contact_email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#FF6B00] mb-1.5">
                      <Mail className="w-4 h-4" />{selectedCompany.contact_email}
                    </a>
                  )}
                  {selectedCompany.website && (
                    <div className="flex items-center gap-2 text-sm text-gray-500"><Globe className="w-4 h-4" />{selectedCompany.website}</div>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (!user) { setShowAuth(true); return; }
                    setCompanyView('inquire');
                  }}
                  className="w-full py-4 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />Send Cargo Inquiry
                </button>
              </div>
            )}

            {/* COMPANY LIST */}
            {companyView === 'list' && (
              <div>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-8 w-32 h-32 border-2 border-white rounded-full" />
                  </div>
                  <div className="relative">
                    <div className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">Cargo Logistics Hub</div>
                    <h1 className="text-2xl font-black mb-2">Verified Cargo Companies</h1>
                    <p className="text-gray-300 text-sm mb-4">Compare freight companies, routes, and pricing across East Africa. Direct inquiry to get quotes.</p>
                    <button onClick={() => setCompanyView('register')}
                      className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white px-5 py-2.5 rounded-xl text-sm font-bold w-fit">
                      <Plus className="w-4 h-4" />Register Your Company
                    </button>
                  </div>
                </div>

                <div className="relative mb-5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, region, cargo type..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500/40 focus:border-[#FF6B00] outline-none"
                  />
                </div>

                {loadingCompanies ? (
                  <div className="flex justify-center py-16">
                    <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredCompanies.map(company => (
                      <div key={company.id} onClick={() => { setSelectedCompany(company); setCompanyView('detail'); }}
                        className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group">
                        <div className="h-40 overflow-hidden relative bg-gray-100">
                          {company.images[0] ? (
                            <img src={company.images[0]} alt={company.company_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Truck className="w-12 h-12 text-gray-300" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          {company.is_verified && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <CheckCircle className="w-2.5 h-2.5" />Verified
                            </div>
                          )}
                          <div className="absolute bottom-2 left-3 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-white opacity-80" />
                            <span className="text-white text-xs font-semibold opacity-90">{company.min_delivery_days}–{company.max_delivery_days} days</span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">{company.company_name}</h3>
                          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{company.description}</p>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {company.operating_regions.slice(0, 3).map(r => (
                              <span key={r} className="text-[10px] bg-orange-50 text-[#FF6B00] border border-orange-100 px-1.5 py-0.5 rounded-full">{r}</span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            {company.rating > 0 ? (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span className="text-xs font-bold text-gray-900">{company.rating}</span>
                                <span className="text-xs text-gray-400">({company.review_count})</span>
                              </div>
                            ) : <div />}
                            <span className="text-xs font-bold text-[#FF6B00]">KES {company.pricing_structure.per_kg_kes}/kg</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── TRACK TAB ── */}
        {activeTab === 'track' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#FF6B00]" />Track Shipment
              </h2>
              <div className="flex gap-2">
                <input value={trackCode} onChange={e => setTrackCode(e.target.value)}
                  placeholder="Enter tracking code (e.g. SNG-ABC123-XYZ)"
                  className={`${INP} flex-1`} />
                <button onClick={handleTrack}
                  className="px-5 py-2.5 bg-[#FF6B00] text-white rounded-xl font-bold text-sm hover:bg-[#e55f00] transition-colors whitespace-nowrap">
                  Track
                </button>
              </div>
              {trackResult && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-gray-900">Shipment Found</span>
                    <span className="text-xs text-gray-400 ml-auto">Updated {trackResult.updated}</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {[['Tracking Code', trackCode.toUpperCase()], ['Route', trackResult.route], ['Status', trackResult.status]].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-500">{k}</span>
                        <span className={`font-semibold ${k === 'Status' ? 'text-green-600' : 'text-gray-900'}`}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {trackCode && !trackResult && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-red-600">No shipment found for this code.</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#FF6B00]" />Recent Notifications
              </h3>
              {[
                { msg: 'Your cargo SNG-A1B2C-XYZ has been picked up from Nairobi.', time: '1h ago', color: 'green' },
                { msg: 'Driver James Mwangi confirmed your booking.', time: '3h ago', color: 'blue' },
                { msg: 'M-Pesa payment of KES 12,540 confirmed.', time: '4h ago', color: 'orange' },
              ].map((n, i) => (
                <div key={i} className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.color === 'green' ? 'bg-green-500' : n.color === 'blue' ? 'bg-blue-500' : 'bg-[#FF6B00]'}`} />
                  <div>
                    <p className="text-sm text-gray-700">{n.msg}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showAuth && <Auth modal onClose={() => setShowAuth(false)} />}
    </div>
  );
};
