import React, { useEffect, useState } from 'react';
import { X, User, Car, MapPin, FileText, Phone, Mail, CreditCard as Edit2, Check, DollarSign, Navigation, Clock, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Vehicle, Booking, Profile } from '../lib/supabase';
import { generateReceipt } from '../lib/receipt';

type Props = { onClose: () => void };

type BookingWithVehicle = Booking & {
  vehicles: Vehicle & { profiles: Profile };
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export const ProfilePage: React.FC<Props> = ({ onClose }) => {
  const { profile, user } = useAuth();
  const isDriver = profile?.role === 'driver';

  const [tab, setTab] = useState<'overview' | 'trips' | 'reports'>('overview');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name ?? '');
  const [editPhone, setEditPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [bookings, setBookings] = useState<BookingWithVehicle[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => { fetchData(); }, [profile?.id]);

  const fetchData = async () => {
    if (!profile?.id) return;
    setLoadingData(true);
    if (isDriver) {
      const { data: vData } = await supabase
        .from('vehicles').select('*')
        .eq('driver_id', profile.id)
        .order('departure_time', { ascending: false });
      if (vData) setVehicles(vData);
    } else {
      const { data: bData } = await supabase
        .from('bookings').select('*, vehicles(*, profiles(*))')
        .eq('passenger_id', profile.id)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });
      if (bData) setBookings(bData as BookingWithVehicle[]);
    }
    setLoadingData(false);
  };

  const saveProfile = async () => {
    if (!profile?.id) return;
    setSaving(true);
    await supabase.from('profiles').update({ full_name: editName, phone: editPhone }).eq('id', profile.id);
    setSaving(false);
    setEditing(false);
    setSaveMsg('Profile updated!');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const completedVehicles = vehicles.filter((v) => v.status === 'completed').length;
  const activeVehicles = vehicles.filter((v) => v.status === 'pending' || v.status === 'traveling').length;
  const totalRevenue = bookings.reduce((a, b) => a + (b.amount_paid ?? 0), 0);

  const downloadTripReport = () => {
    if (isDriver) {
      const rows = vehicles.map((v) =>
        `${v.route_from} → ${v.route_to},${formatDate(v.departure_time)},${v.status},${v.registration_number},${v.seat_count}`
      );
      const csv = ['Route,Date,Status,Reg,Seats', ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `songa-driver-report-${Date.now()}.csv`; a.click();
    } else {
      const rows = bookings.map((b) =>
        `${b.vehicles.route_from} → ${b.vehicles.route_to},${formatDate(b.vehicles.departure_time)},Seat ${b.seat_number},KES ${b.amount_paid}`
      );
      const csv = ['Route,Date,Seat,Paid', ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `songa-trips-report-${Date.now()}.csv`; a.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl max-h-[96vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">My Profile</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['overview', 'trips', 'reports'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-semibold capitalize border-b-2 transition-colors ${
                tab === t ? 'text-orange-600 border-orange-500' : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              {t === 'trips' ? (isDriver ? 'My Vehicles' : 'My Trips') : t === 'reports' ? 'Reports' : 'Overview'}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">

          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div className="p-5 space-y-5">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  {isDriver
                    ? <Car className="w-8 h-8 text-orange-500" />
                    : <User className="w-8 h-8 text-orange-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <div className="space-y-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                        placeholder="Full name"
                      />
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                        placeholder="Phone"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveProfile}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 disabled:opacity-60"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-gray-500 text-xs hover:text-gray-700">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-bold text-gray-900 text-lg truncate">{profile?.full_name}</p>
                      <p className="text-sm text-gray-500 capitalize">{profile?.role}</p>
                      {saveMsg && <p className="text-xs text-green-600 font-semibold mt-1">{saveMsg}</p>}
                    </>
                  )}
                </div>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
              </div>

              {/* Contact info */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{profile?.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{user?.email}</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {isDriver ? (
                  <>
                    <StatCard icon={<Navigation className="w-5 h-5 text-orange-500" />} label="Active Trips" value={activeVehicles} />
                    <StatCard icon={<Check className="w-5 h-5 text-green-500" />} label="Completed" value={completedVehicles} />
                    <StatCard icon={<Car className="w-5 h-5 text-blue-500" />} label="Total Trips" value={vehicles.length} />
                    <StatCard icon={<DollarSign className="w-5 h-5 text-orange-400" />} label="Earnings" value="—" sub="Tracked per booking" />
                  </>
                ) : (
                  <>
                    <StatCard icon={<MapPin className="w-5 h-5 text-orange-500" />} label="Rides Taken" value={bookings.filter((b) => b.vehicles.status === 'completed').length} />
                    <StatCard icon={<Clock className="w-5 h-5 text-blue-500" />} label="Upcoming" value={bookings.filter((b) => b.vehicles.status === 'pending').length} />
                    <StatCard icon={<Users className="w-5 h-5 text-green-500" />} label="Total Bookings" value={bookings.length} />
                    <StatCard icon={<DollarSign className="w-5 h-5 text-orange-400" />} label="Total Paid" value={`KES ${totalRevenue.toLocaleString()}`} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* TRIPS TAB */}
          {tab === 'trips' && (
            <div className="p-4">
              {loadingData ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : isDriver ? (
                vehicles.length === 0 ? (
                  <EmptyState icon={<Car className="w-8 h-8 text-gray-300" />} text="No vehicles added yet" />
                ) : (
                  <div className="space-y-2">
                    {vehicles.map((v) => (
                      <div key={v.id} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{v.route_from} → {v.route_to}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{formatDate(v.departure_time)} · {formatTime(v.departure_time)}</p>
                            {v.registration_number && (
                              <p className="text-xs text-gray-400 font-mono mt-0.5">{v.registration_number}</p>
                            )}
                          </div>
                          <StatusBadge status={v.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>{v.seat_count}-seater</span>
                          <span>KES {v.price_per_seat}/seat</span>
                          {v.sacco && <span>{v.sacco}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                bookings.length === 0 ? (
                  <EmptyState icon={<MapPin className="w-8 h-8 text-gray-300" />} text="No trips booked yet" />
                ) : (
                  <div className="space-y-2">
                    {bookings.map((b) => {
                      const v = b.vehicles;
                      return (
                        <div key={b.id} className="border border-gray-100 rounded-xl p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{v.route_from} → {v.route_to}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{formatDate(v.departure_time)} · {formatTime(v.departure_time)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-orange-600">Seat {b.seat_number}</p>
                              <p className="text-xs text-gray-400">KES {b.amount_paid}</p>
                            </div>
                          </div>
                          {b.vehicles.status === 'completed' && (
                            <button
                              onClick={() => generateReceipt({
                                passengerName: profile?.full_name ?? '',
                                passengerPhone: profile?.phone ?? '',
                                seatNumber: b.seat_number,
                                amountPaid: b.amount_paid,
                                route: `${v.route_from} → ${v.route_to}`,
                                departureTime: v.departure_time,
                                driverName: v.profiles.full_name,
                                driverPhone: v.profiles.phone,
                                registration: v.registration_number,
                                sacco: v.sacco,
                                bookingDate: b.created_at,
                                pickupLocation: b.pickup_location,
                                bookingId: b.id,
                              })}
                              className="mt-2 flex items-center gap-1.5 text-xs text-orange-600 font-semibold hover:underline"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Download Receipt
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {/* REPORTS TAB */}
          {tab === 'reports' && (
            <div className="p-5 space-y-4">
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                <p className="font-bold text-gray-800 mb-1 text-sm">
                  {isDriver ? 'Trip & Vehicle Report' : 'Booking Activity Report'}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  {isDriver
                    ? `All ${vehicles.length} vehicles with route, date, and status.`
                    : `All ${bookings.length} bookings with route, seat, and amount paid.`}
                </p>
                <button
                  onClick={downloadTripReport}
                  className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Download CSV Report
                </button>
              </div>

              {!isDriver && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                  <p className="font-bold text-gray-800 mb-1 text-sm">Individual Receipts</p>
                  <p className="text-xs text-gray-500 mb-3">Download a PDF receipt for any completed trip.</p>
                  {bookings.filter((b) => b.vehicles.status === 'completed').length === 0 ? (
                    <p className="text-xs text-gray-400">No completed trips yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {bookings.filter((b) => b.vehicles.status === 'completed').map((b) => (
                        <div key={b.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{b.vehicles.route_from} → {b.vehicles.route_to}</p>
                            <p className="text-xs text-gray-400">{formatDate(b.vehicles.departure_time)} · Seat {b.seat_number}</p>
                          </div>
                          <button
                            onClick={() => generateReceipt({
                              passengerName: profile?.full_name ?? '',
                              passengerPhone: profile?.phone ?? '',
                              seatNumber: b.seat_number,
                              amountPaid: b.amount_paid,
                              route: `${b.vehicles.route_from} → ${b.vehicles.route_to}`,
                              departureTime: b.vehicles.departure_time,
                              driverName: b.vehicles.profiles.full_name,
                              driverPhone: b.vehicles.profiles.phone,
                              registration: b.vehicles.registration_number,
                              sacco: b.vehicles.sacco,
                              bookingDate: b.created_at,
                              pickupLocation: b.pickup_location,
                              bookingId: b.id,
                            })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-200 text-orange-600 rounded-lg text-xs font-semibold hover:bg-orange-50"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            PDF
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isDriver && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                  <p className="font-bold text-gray-800 mb-1 text-sm">Activity Summary</p>
                  <div className="space-y-2 mt-3">
                    <SummaryRow label="Total Vehicles" value={vehicles.length.toString()} />
                    <SummaryRow label="Active Trips" value={activeVehicles.toString()} />
                    <SummaryRow label="Completed Trips" value={completedVehicles.toString()} />
                    <SummaryRow label="Canceled" value={vehicles.filter((v) => v.status === 'canceled').length.toString()} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; sub?: string }> = ({ icon, label, value, sub }) => (
  <div className="bg-gray-50 rounded-2xl p-4">
    <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-500 font-medium">{label}</span></div>
    <p className="text-2xl font-black text-gray-900">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cls = status === 'completed' ? 'bg-gray-100 text-gray-500'
    : status === 'traveling' ? 'bg-blue-100 text-blue-700'
    : status === 'canceled' ? 'bg-red-100 text-red-600'
    : 'bg-emerald-100 text-emerald-700';
  return <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${cls}`}>{status}</span>;
};

const EmptyState: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="text-center py-14">
    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">{icon}</div>
    <p className="text-gray-400 text-sm">{text}</p>
  </div>
);

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-bold text-gray-800">{value}</span>
  </div>
);
