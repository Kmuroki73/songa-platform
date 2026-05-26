import React, { useState, useEffect } from 'react';
import {
  Navigation, Briefcase, ArrowLeft, Building2, Car, Plane,
  Utensils, MapPin, Phone, Mail, Globe, Star, ChevronRight,
  Plus, X, CheckCircle, Search, Filter, Users, DollarSign,
  Camera, Upload, Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Auth } from './Auth';
import type { Page } from './Landing';

type Props = { onNavigate: (page: Page) => void };

type Category = 'hotel' | 'tour_operator' | 'travel_agency' | 'conference_venue' | 'car_hire';

type Provider = {
  id: string;
  category: Category;
  company_name: string;
  description: string;
  destinations: string[];
  locations: string[];
  packages: Package[];
  accommodation_types: string[];
  transport_options: string[];
  food_options: string[];
  min_price_kes: number;
  max_price_kes: number;
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

type Package = {
  name: string;
  description: string;
  price_kes: number;
  duration: string;
  includes: string[];
};

const CATEGORY_META: Record<Category, { label: string; icon: React.ElementType; color: string }> = {
  hotel:            { label: 'Hotel / Lodge',       icon: Building2, color: 'blue' },
  tour_operator:    { label: 'Tour Operator',        icon: MapPin,    color: 'green' },
  travel_agency:    { label: 'Travel Agency',        icon: Plane,     color: 'sky' },
  conference_venue: { label: 'Conference Venue',     icon: Briefcase, color: 'amber' },
  car_hire:         { label: 'Car Hire',             icon: Car,       color: 'orange' },
};

const CATEGORY_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  sky: 'bg-sky-100 text-sky-700',
  amber: 'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-[#FF6B00]',
};

const INP = "w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 transition-colors placeholder-gray-400 outline-none";

// Demo providers for when DB is empty
const DEMO_PROVIDERS: Provider[] = [
  {
    id: 'demo-1',
    category: 'hotel',
    company_name: 'Serena Nairobi Hotel',
    description: 'Award-winning luxury hotel in the heart of Nairobi. Ideal for corporate conferences, executive retreats, and team building events.',
    destinations: ['Nairobi'],
    locations: ['Nairobi CBD'],
    packages: [
      { name: 'Corporate Day Conference', description: 'Full-day conference package with AV equipment, lunch and refreshments', price_kes: 12000, duration: '1 day', includes: ['Conference room', 'Lunch', 'Tea breaks', 'AV equipment', 'WiFi'] },
      { name: 'Corporate Retreat (3 nights)', description: '3-night executive retreat with all meals and team-building activities', price_kes: 48000, duration: '3 nights', includes: ['Accommodation', 'All meals', 'Meeting rooms', 'Team activities', 'Airport transfer'] },
    ],
    accommodation_types: ['Executive Rooms', 'Suites', 'Conference Rooms'],
    transport_options: ['Airport Transfers', 'City Transfers'],
    food_options: ['Breakfast', 'Lunch', 'Dinner', 'Coffee Breaks', 'Cocktail Reception'],
    min_price_kes: 12000,
    max_price_kes: 120000,
    contact_name: 'Corporate Sales',
    contact_email: 'corporate@serena.co.ke',
    contact_phone: '0722202000',
    website: 'serena.co.ke',
    images: ['https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?w=800'],
    policies: 'Cancellation 48 hours in advance. Corporate accounts available.',
    rating: 4.8,
    review_count: 312,
    is_verified: true,
  },
  {
    id: 'demo-2',
    category: 'tour_operator',
    company_name: 'Kenya Voyages Tours',
    description: 'Specialist corporate group tours across Kenya and East Africa. Safari, culture, and adventure packages tailored for companies.',
    destinations: ['Masai Mara', 'Amboseli', 'Diani', 'Zanzibar', 'Kilimanjaro'],
    locations: ['Nairobi', 'Mombasa'],
    packages: [
      { name: 'Masai Mara Safari (2 days)', description: 'All-inclusive 2-day safari, perfect for team building', price_kes: 35000, duration: '2 days', includes: ['Transport', 'Lodge', 'Game drives', 'Full board', 'Park fees'] },
      { name: 'Diani Beach Retreat (3 days)', description: 'Corporate beach retreat on the Kenyan coast', price_kes: 42000, duration: '3 days', includes: ['Flights', 'Beach hotel', 'Team activities', 'Full board'] },
    ],
    accommodation_types: ['Safari Lodges', 'Beach Hotels', 'Tented Camps'],
    transport_options: ['Safari Vehicles', 'Domestic Flights', 'Luxury Coaches'],
    food_options: ['Full Board', 'Half Board', 'BBQ Evenings'],
    min_price_kes: 25000,
    max_price_kes: 150000,
    contact_name: 'James Mwangi',
    contact_email: 'james@kenyavoyages.co.ke',
    contact_phone: '0712334455',
    website: 'kenyavoyages.co.ke',
    images: ['https://images.pexels.com/photos/631317/pexels-photo-631317.jpeg?w=800'],
    policies: 'Group bookings of 10+ get 10% discount. Full payment required 14 days before.',
    rating: 4.7,
    review_count: 189,
    is_verified: true,
  },
  {
    id: 'demo-3',
    category: 'travel_agency',
    company_name: 'Prestige Corporate Travel',
    description: 'Full-service corporate travel management for East African businesses. Flights, visas, hotels, and ground transport handled end-to-end.',
    destinations: ['Nairobi', 'Kampala', 'Kigali', 'Dar es Salaam', 'Addis Ababa', 'Dubai', 'London'],
    locations: ['Nairobi'],
    packages: [
      { name: 'Corporate Flight + Hotel Package', description: 'Business class flights with 4-star hotels', price_kes: 85000, duration: 'Per trip', includes: ['Flights', '4-star hotel', 'Visa assistance', 'Travel insurance', '24/7 support'] },
    ],
    accommodation_types: ['4-Star Hotels', '5-Star Hotels', 'Serviced Apartments'],
    transport_options: ['Business Class Flights', 'Airport Transfers', 'Car Hire'],
    food_options: [],
    min_price_kes: 50000,
    max_price_kes: 500000,
    contact_name: 'Susan Kamau',
    contact_email: 'susan@prestigetravel.co.ke',
    contact_phone: '0733221100',
    website: 'prestigetravel.co.ke',
    images: ['https://images.pexels.com/photos/2026324/pexels-photo-2026324.jpeg?w=800'],
    policies: 'Corporate accounts with monthly billing available. 24/7 emergency travel support.',
    rating: 4.9,
    review_count: 567,
    is_verified: true,
  },
];

type View = 'browse' | 'detail' | 'register' | 'inquire' | 'success';

export const Corporate: React.FC<Props> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [view, setView] = useState<View>('browse');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [showAuth, setShowAuth] = useState(false);

  // Registration form
  const [regForm, setRegForm] = useState({
    category: 'hotel' as Category,
    company_name: '',
    description: '',
    destinations: '',
    locations: '',
    accommodation_types: '',
    transport_options: '',
    food_options: '',
    min_price_kes: 5000,
    max_price_kes: 50000,
    contact_name: profile?.full_name ?? '',
    contact_email: '',
    contact_phone: profile?.phone ?? '',
    website: '',
    policies: '',
  });
  const [regPackages, setRegPackages] = useState<Package[]>([
    { name: '', description: '', price_kes: 0, duration: '', includes: [] },
  ]);
  const [regSaving, setRegSaving] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Inquiry form
  const [inquiryForm, setInquiryForm] = useState({
    company_name: '',
    contact_name: profile?.full_name ?? '',
    contact_email: '',
    contact_phone: profile?.phone ?? '',
    destination: '',
    travel_dates: '',
    employee_count: 5,
    message: '',
  });
  const [inquirySaving, setInquirySaving] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (profile) {
      setRegForm(f => ({ ...f, contact_name: profile.full_name, contact_phone: profile.phone }));
      setInquiryForm(f => ({ ...f, contact_name: profile.full_name, contact_phone: profile.phone }));
    }
  }, [profile]);

  const fetchProviders = async () => {
    setLoadingProviders(true);
    const { data } = await supabase
      .from('corporate_providers')
      .select('*')
      .eq('is_active', true)
      .order('is_verified', { ascending: false });
    if (data && data.length > 0) {
      setProviders(data as Provider[]);
    } else {
      setProviders(DEMO_PROVIDERS);
    }
    setLoadingProviders(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setShowAuth(true); return; }
    setRegSaving(true);
    setRegError(null);
    const { error } = await supabase.from('corporate_providers').insert({
      owner_id: user.id,
      category: regForm.category,
      company_name: regForm.company_name,
      description: regForm.description,
      destinations: regForm.destinations.split(',').map(s => s.trim()).filter(Boolean),
      locations: regForm.locations.split(',').map(s => s.trim()).filter(Boolean),
      packages: regPackages.filter(p => p.name),
      accommodation_types: regForm.accommodation_types.split(',').map(s => s.trim()).filter(Boolean),
      transport_options: regForm.transport_options.split(',').map(s => s.trim()).filter(Boolean),
      food_options: regForm.food_options.split(',').map(s => s.trim()).filter(Boolean),
      min_price_kes: regForm.min_price_kes,
      max_price_kes: regForm.max_price_kes,
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
      setView('success');
      fetchProviders();
    }
  };

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { setShowAuth(true); return; }
    if (!selectedProvider) return;
    setInquirySaving(true);
    const { error } = await supabase.from('corporate_provider_inquiries').insert({
      provider_id: selectedProvider.id,
      requester_id: user.id,
      ...inquiryForm,
    });
    setInquirySaving(false);
    if (!error) setView('success');
  };

  const filtered = providers.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      p.company_name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.destinations.some(d => d.toLowerCase().includes(q));
    const matchCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            {view !== 'browse' ? (
              <button
                onClick={() => setView('browse')}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
            ) : (
              <button
                onClick={() => onNavigate('landing')}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-600" />
              </button>
            )}
            <div className="w-7 h-7 bg-[#FF6B00] rounded-lg flex items-center justify-center ml-1">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <div className="ml-1">
              <div className="text-sm font-black text-gray-900 leading-none">Corporate Travel</div>
              <div className="text-xs text-gray-500">Hotels · Tours · Travel Agencies</div>
            </div>
          </div>
          <button
            onClick={() => view === 'register' ? setView('browse') : setView('register')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
              view === 'register'
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-[#FF6B00] text-white hover:bg-[#e55f00]'
            }`}
          >
            {view === 'register' ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {view === 'register' ? 'Cancel' : <span className="hidden sm:inline">List Your Company</span>}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* SUCCESS VIEW */}
        {view === 'success' && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-300">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              {selectedProvider ? 'Inquiry Sent!' : 'Company Listed!'}
            </h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              {selectedProvider
                ? `${selectedProvider.company_name} will reach out to you shortly.`
                : 'Your company is now listed. Our team will verify and activate it within 24 hours.'}
            </p>
            <button
              onClick={() => { setView('browse'); setSelectedProvider(null); }}
              className="px-8 py-3 bg-[#FF6B00] text-white rounded-2xl font-bold text-sm hover:bg-[#e55f00] transition-colors"
            >
              Back to Listings
            </button>
          </div>
        )}

        {/* REGISTER VIEW */}
        {view === 'register' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-[#FF6B00] rounded-2xl p-6 text-white mb-6 shadow-lg shadow-orange-500/20">
              <h2 className="text-xl font-black mb-1">List Your Company</h2>
              <p className="text-orange-100 text-sm">Reach thousands of corporate clients looking for travel services across East Africa.</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              {/* Category */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Company Type</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META[Category]][]).map(([key, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRegForm(f => ({ ...f, category: key }))}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all text-center ${
                          regForm.category === key
                            ? 'border-[#FF6B00] bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${regForm.category === key ? 'text-[#FF6B00]' : 'text-gray-400'}`} />
                        <span className={`text-xs font-semibold ${regForm.category === key ? 'text-[#FF6B00]' : 'text-gray-600'}`}>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Basic Info */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Company Details</h3>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Company Name *</label>
                  <input required value={regForm.company_name} onChange={e => setRegForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Your company name" className={INP} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description *</label>
                  <textarea required value={regForm.description} onChange={e => setRegForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your services, specialities, and what makes you unique..." rows={3}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none placeholder-gray-400 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Min Price (KES)</label>
                    <input type="number" min={0} value={regForm.min_price_kes} onChange={e => setRegForm(f => ({ ...f, min_price_kes: +e.target.value }))} className={INP} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Max Price (KES)</label>
                    <input type="number" min={0} value={regForm.max_price_kes} onChange={e => setRegForm(f => ({ ...f, max_price_kes: +e.target.value }))} className={INP} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Destinations (comma-separated)</label>
                  <input value={regForm.destinations} onChange={e => setRegForm(f => ({ ...f, destinations: e.target.value }))} placeholder="e.g. Nairobi, Mombasa, Masai Mara, Kigali" className={INP} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Office Locations</label>
                  <input value={regForm.locations} onChange={e => setRegForm(f => ({ ...f, locations: e.target.value }))} placeholder="e.g. Nairobi CBD, Westlands" className={INP} />
                </div>
              </div>

              {/* Services */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Services Offered</h3>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Accommodation Options</label>
                  <input value={regForm.accommodation_types} onChange={e => setRegForm(f => ({ ...f, accommodation_types: e.target.value }))} placeholder="e.g. Rooms, Suites, Conference Halls" className={INP} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Transport Options</label>
                  <input value={regForm.transport_options} onChange={e => setRegForm(f => ({ ...f, transport_options: e.target.value }))} placeholder="e.g. Airport Transfers, Safari Vehicles, Buses" className={INP} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Food & Dining</label>
                  <input value={regForm.food_options} onChange={e => setRegForm(f => ({ ...f, food_options: e.target.value }))} placeholder="e.g. Breakfast, Lunch, Dinner, Conference Meals" className={INP} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cancellation & Booking Policy</label>
                  <textarea value={regForm.policies} onChange={e => setRegForm(f => ({ ...f, policies: e.target.value }))} placeholder="Cancellation policy, deposit requirements, group booking terms..." rows={2}
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none placeholder-gray-400 resize-none" />
                </div>
              </div>

              {/* Packages */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Packages</h3>
                  <button type="button" onClick={() => setRegPackages(ps => [...ps, { name: '', description: '', price_kes: 0, duration: '', includes: [] }])}
                    className="flex items-center gap-1 text-xs text-[#FF6B00] font-semibold hover:underline">
                    <Plus className="w-3.5 h-3.5" /> Add Package
                  </button>
                </div>
                <div className="space-y-4">
                  {regPackages.map((pkg, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Package {i + 1}</span>
                        {regPackages.length > 1 && (
                          <button type="button" onClick={() => setRegPackages(ps => ps.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input value={pkg.name} onChange={e => setRegPackages(ps => ps.map((p, j) => j === i ? { ...p, name: e.target.value } : p))} placeholder="Package name" className={INP} />
                      <input value={pkg.description} onChange={e => setRegPackages(ps => ps.map((p, j) => j === i ? { ...p, description: e.target.value } : p))} placeholder="Short description" className={INP} />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" min={0} value={pkg.price_kes || ''} onChange={e => setRegPackages(ps => ps.map((p, j) => j === i ? { ...p, price_kes: +e.target.value } : p))} placeholder="Price (KES)" className={INP} />
                        <input value={pkg.duration} onChange={e => setRegPackages(ps => ps.map((p, j) => j === i ? { ...p, duration: e.target.value } : p))} placeholder="Duration (e.g. 2 days)" className={INP} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Contact Information</h3>
                <input required value={regForm.contact_name} onChange={e => setRegForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Contact person name" className={INP} />
                <div className="grid grid-cols-2 gap-3">
                  <input required type="email" value={regForm.contact_email} onChange={e => setRegForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="Email address" className={INP} />
                  <input required type="tel" value={regForm.contact_phone} onChange={e => setRegForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="Phone number" className={INP} />
                </div>
                <input value={regForm.website} onChange={e => setRegForm(f => ({ ...f, website: e.target.value }))} placeholder="Website (optional)" className={INP} />
              </div>

              {regError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{regError}</div>
              )}

              <button type="submit" disabled={regSaving}
                className="w-full py-4 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                {regSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle className="w-4 h-4" />Submit for Listing</>}
              </button>
            </form>
          </div>
        )}

        {/* INQUIRY VIEW */}
        {view === 'inquire' && selectedProvider && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-5">
              <div className="flex items-center gap-3 mb-1">
                {selectedProvider.images[0] && (
                  <img src={selectedProvider.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover" />
                )}
                <div>
                  <div className="font-bold text-gray-900">{selectedProvider.company_name}</div>
                  <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${CATEGORY_COLORS[CATEGORY_META[selectedProvider.category].color]}`}>
                    {CATEGORY_META[selectedProvider.category].label}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleInquiry} className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Your Details</h3>
                <input required value={inquiryForm.company_name} onChange={e => setInquiryForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Your company name" className={INP} />
                <input required value={inquiryForm.contact_name} onChange={e => setInquiryForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Your full name" className={INP} />
                <div className="grid grid-cols-2 gap-3">
                  <input required type="email" value={inquiryForm.contact_email} onChange={e => setInquiryForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="Email" className={INP} />
                  <input required type="tel" value={inquiryForm.contact_phone} onChange={e => setInquiryForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="Phone" className={INP} />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Trip Details</h3>
                <input required value={inquiryForm.destination} onChange={e => setInquiryForm(f => ({ ...f, destination: e.target.value }))} placeholder="Destination" className={INP} />
                <input required value={inquiryForm.travel_dates} onChange={e => setInquiryForm(f => ({ ...f, travel_dates: e.target.value }))} placeholder="Travel dates (e.g. 12–15 June 2026)" className={INP} />
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setInquiryForm(f => ({ ...f, employee_count: Math.max(1, f.employee_count - 1) }))}
                    className="w-10 h-10 bg-gray-100 rounded-xl text-gray-700 font-bold hover:bg-gray-200 flex items-center justify-center transition-colors">−</button>
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-black text-[#FF6B00]">{inquiryForm.employee_count}</div>
                    <div className="text-xs text-gray-500">employees</div>
                  </div>
                  <button type="button" onClick={() => setInquiryForm(f => ({ ...f, employee_count: f.employee_count + 1 }))}
                    className="w-10 h-10 bg-gray-100 rounded-xl text-gray-700 font-bold hover:bg-gray-200 flex items-center justify-center transition-colors">+</button>
                </div>
                <textarea required value={inquiryForm.message} onChange={e => setInquiryForm(f => ({ ...f, message: e.target.value }))} placeholder="Describe your requirements, preferred packages, special needs..." rows={3}
                  className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:border-[#FF6B00] focus:ring-2 focus:ring-orange-500/20 outline-none placeholder-gray-400 resize-none" />
              </div>

              <button type="submit" disabled={inquirySaving}
                className="w-full py-4 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-orange-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                {inquirySaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Mail className="w-4 h-4" />Send Inquiry</>}
              </button>
            </form>
          </div>
        )}

        {/* DETAIL VIEW */}
        {view === 'detail' && selectedProvider && (
          <div className="max-w-3xl mx-auto">
            {/* Hero */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-5">
              {selectedProvider.images[0] && (
                <div className="h-56 overflow-hidden relative">
                  <img src={selectedProvider.images[0]} alt={selectedProvider.company_name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div>
                      <h1 className="text-xl font-black text-white">{selectedProvider.company_name}</h1>
                      <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${CATEGORY_COLORS[CATEGORY_META[selectedProvider.category].color]}`}>
                        {CATEGORY_META[selectedProvider.category].label}
                      </div>
                    </div>
                    {selectedProvider.is_verified && (
                      <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="p-5">
                {selectedProvider.rating > 0 && (
                  <div className="flex items-center gap-1.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.round(selectedProvider.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    ))}
                    <span className="text-sm font-bold text-gray-900">{selectedProvider.rating}</span>
                    <span className="text-xs text-gray-400">({selectedProvider.review_count} reviews)</span>
                  </div>
                )}
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{selectedProvider.description}</p>

                {selectedProvider.destinations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {selectedProvider.destinations.map(d => (
                      <span key={d} className="flex items-center gap-1 bg-orange-50 border border-orange-200 text-[#FF6B00] text-xs font-semibold px-2.5 py-1 rounded-full">
                        <MapPin className="w-3 h-3" />{d}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-sm font-bold text-[#FF6B00]">
                  KES {selectedProvider.min_price_kes.toLocaleString()} — {selectedProvider.max_price_kes.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Packages */}
            {selectedProvider.packages.length > 0 && (
              <div className="mb-5">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Packages</h2>
                <div className="space-y-3">
                  {selectedProvider.packages.map((pkg, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{pkg.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{pkg.duration}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-[#FF6B00] text-base">KES {pkg.price_kes.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">per person</div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{pkg.description}</p>
                      {pkg.includes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {pkg.includes.map(inc => (
                            <span key={inc} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5" />{inc}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {selectedProvider.accommodation_types.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-[#FF6B00]" />Accommodation</div>
                  <div className="space-y-1">{selectedProvider.accommodation_types.map(t => <div key={t} className="text-xs text-gray-600">{t}</div>)}</div>
                </div>
              )}
              {selectedProvider.transport_options.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Car className="w-3.5 h-3.5 text-[#FF6B00]" />Transport</div>
                  <div className="space-y-1">{selectedProvider.transport_options.map(t => <div key={t} className="text-xs text-gray-600">{t}</div>)}</div>
                </div>
              )}
              {selectedProvider.food_options.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Utensils className="w-3.5 h-3.5 text-[#FF6B00]" />Dining</div>
                  <div className="space-y-1">{selectedProvider.food_options.map(t => <div key={t} className="text-xs text-gray-600">{t}</div>)}</div>
                </div>
              )}
            </div>

            {/* Contact + CTA */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-5">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Contact</h2>
              <div className="space-y-2">
                {selectedProvider.contact_phone && (
                  <a href={`tel:${selectedProvider.contact_phone}`} className="flex items-center gap-2 text-sm text-[#FF6B00] hover:underline">
                    <Phone className="w-4 h-4" />{selectedProvider.contact_phone}
                  </a>
                )}
                {selectedProvider.contact_email && (
                  <a href={`mailto:${selectedProvider.contact_email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#FF6B00] transition-colors">
                    <Mail className="w-4 h-4" />{selectedProvider.contact_email}
                  </a>
                )}
                {selectedProvider.website && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Globe className="w-4 h-4" />{selectedProvider.website}
                  </div>
                )}
              </div>
            </div>

            {selectedProvider.policies && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5">Policies</div>
                <p className="text-xs text-amber-800 leading-relaxed">{selectedProvider.policies}</p>
              </div>
            )}

            <button
              onClick={() => {
                if (!user) { setShowAuth(true); return; }
                setView('inquire');
              }}
              className="w-full py-4 bg-[#FF6B00] hover:bg-[#e55f00] text-white rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />Send Inquiry to {selectedProvider.company_name}
            </button>
          </div>
        )}

        {/* BROWSE VIEW */}
        {view === 'browse' && (
          <div>
            {/* Hero banner */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-8 w-32 h-32 border-2 border-white rounded-full" />
                <div className="absolute -bottom-8 -right-8 w-48 h-48 border-2 border-white rounded-full" />
              </div>
              <div className="relative">
                <div className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">Corporate Travel Hub</div>
                <h1 className="text-2xl font-black mb-2">Hotels, Tours & Travel Agencies</h1>
                <p className="text-gray-300 text-sm mb-4">Browse and compare verified providers across East Africa. Send direct inquiries and get custom quotes.</p>
                <button onClick={() => setView('register')}
                  className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#e55f00] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors w-fit">
                  <Plus className="w-4 h-4" />List Your Company
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, destination..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500/40 focus:border-[#FF6B00] outline-none"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                <button
                  onClick={() => setFilterCategory('all')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${filterCategory === 'all' ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}
                >
                  All
                </button>
                {(Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META[Category]][]).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setFilterCategory(key)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${filterCategory === key ? 'bg-[#FF6B00] text-white border-[#FF6B00]' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}
                  >
                    {meta.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Provider grid */}
            {loadingProviders ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <Briefcase className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No providers found. Try a different search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(provider => {
                  const meta = CATEGORY_META[provider.category];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={provider.id}
                      className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => { setSelectedProvider(provider); setView('detail'); }}
                    >
                      <div className="h-40 overflow-hidden relative bg-gray-100">
                        {provider.images[0] ? (
                          <img src={provider.images[0]} alt={provider.company_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="w-12 h-12 text-gray-300" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute top-2 left-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[meta.color]}`}>
                            {meta.label}
                          </span>
                        </div>
                        {provider.is_verified && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <CheckCircle className="w-2.5 h-2.5" /> Verified
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">{provider.company_name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{provider.description}</p>

                        {provider.destinations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {provider.destinations.slice(0, 3).map(d => (
                              <span key={d} className="text-[10px] bg-orange-50 text-[#FF6B00] border border-orange-100 px-1.5 py-0.5 rounded-full font-medium">{d}</span>
                            ))}
                            {provider.destinations.length > 3 && (
                              <span className="text-[10px] text-gray-400">+{provider.destinations.length - 3}</span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            {provider.rating > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span className="text-xs font-bold text-gray-900">{provider.rating}</span>
                                <span className="text-xs text-gray-400">({provider.review_count})</span>
                              </div>
                            )}
                            <div className="text-xs font-bold text-[#FF6B00] mt-0.5">
                              From KES {provider.min_price_kes.toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[#FF6B00] text-xs font-semibold group-hover:gap-2 transition-all">
                            View <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {showAuth && <Auth modal onClose={() => setShowAuth(false)} />}
    </div>
  );
};
