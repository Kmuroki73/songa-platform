import React, { useEffect, useState } from 'react';
import { supabase, Vehicle, getPassengerSeats } from '../lib/supabase';

type Props = {
  vehicle: Pick<Vehicle, 'id' | 'seat_count' | 'vehicle_type'>;
  onSeatSelect: (seatNumber: number) => void;
  selectedSeat: number | null;
};

type SeatStatus = 'available' | 'booked' | 'selected';

/*
  Kenyan right-hand drive (RHD) layouts.
  Driver is always top-right of the diagram (front-right of vehicle).

  4-seater  (saloon):   front [P1 · D]  rear [P2 P3 P4]  — 1+3
  5-seater  (sedan):    front [P1 · D]  rear [P2 P3 P4 P5] — 1+4 (wide bench)
  7-seater  (SUV):      front [P1 · D]  mid [P2 P3]  rear [P4 P5 P6 P7]
  10-seater (matatu):   front [P1 · D]  then rows of 3 (left-pair + aisle + right-single)
  14-seater (matatu):   front [P1 · D]  then rows of 3
  28-seater (minibus):  front [P1 · D]  then rows of 2+aisle+2
  32-seater (coach):    front [P1 · D]  then rows of 2+aisle+2
*/
type Cell = number | 'driver' | 'aisle' | 'empty';

function buildLayout(n: number): Cell[][] {
  const front: Cell[] = [1, 'aisle', 'driver'];

  if (n <= 1) return [front];

  // 4-seater: 1 front + 3 rear (bench)
  if (n === 4) {
    return [front, [2, 3, 4]];
  }

  // 5-seater: 1 front + 4 rear (wide bench 2+2)
  if (n === 5) {
    return [front, [2, 3, 'aisle', 4, 5]];
  }

  // 7-seater SUV: 1 front + 2 middle + 4 rear (captain chairs + bench)
  if (n === 7) {
    return [
      front,
      [2, 'aisle', 3],          // captain chairs
      [4, 5, 'aisle', 6, 7],   // rear bench
    ];
  }

  // 10-seater matatu: 1 front + 3 rows of 3 (2 left, aisle, 1 right)
  if (n === 10) {
    return [
      front,
      [2, 3, 'aisle', 4],
      [5, 6, 'aisle', 7],
      [8, 9, 'aisle', 10],
    ];
  }

  // 14-seater matatu: 1 front + rows of 3
  if (n === 14) {
    return [
      front,
      [2, 3, 'aisle', 4],
      [5, 6, 'aisle', 7],
      [8, 9, 'aisle', 10],
      [11, 12, 'aisle', 13],
      [14, 'empty', 'aisle', 'empty'],
    ];
  }

  // 28-seater minibus: 1 front + rows of 2+aisle+2
  if (n <= 28) {
    const rows: Cell[][] = [front];
    let seat = 2;
    while (seat <= n) {
      const a: Cell = seat <= n ? seat++ : 'empty';
      const b: Cell = seat <= n ? seat++ : 'empty';
      const c: Cell = seat <= n ? seat++ : 'empty';
      const d: Cell = seat <= n ? seat++ : 'empty';
      rows.push([a, b, 'aisle', c, d]);
    }
    return rows;
  }

  // 32-seater coach: same 2+aisle+2
  const rows: Cell[][] = [front];
  let seat = 2;
  while (seat <= n) {
    const a: Cell = seat <= n ? seat++ : 'empty';
    const b: Cell = seat <= n ? seat++ : 'empty';
    const c: Cell = seat <= n ? seat++ : 'empty';
    const d: Cell = seat <= n ? seat++ : 'empty';
    rows.push([a, b, 'aisle', c, d]);
  }
  return rows;
}

export const SeatSelector: React.FC<Props> = ({ vehicle, onSeatSelect, selectedSeat }) => {
  const totalSeats = getPassengerSeats(vehicle);
  const [bookedSeats, setBookedSeats] = useState<number[]>([]);

  useEffect(() => {
    fetchBooked();
    const sub = supabase
      .channel(`seats-${vehicle.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'bookings',
        filter: `vehicle_id=eq.${vehicle.id}`,
      }, fetchBooked)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [vehicle.id]);

  const fetchBooked = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('seat_number')
      .eq('vehicle_id', vehicle.id)
      .eq('payment_status', 'completed');
    if (data) setBookedSeats(data.map((b) => b.seat_number));
  };

  const getStatus = (seat: number): SeatStatus => {
    if (seat === selectedSeat) return 'selected';
    if (bookedSeats.includes(seat)) return 'booked';
    return 'available';
  };

  const available = totalSeats - bookedSeats.length;
  const rows = buildLayout(totalSeats);

  const SeatBtn = ({ seat }: { seat: number }) => {
    const status = getStatus(seat);
    return (
      <button
        onClick={() => status !== 'booked' && onSeatSelect(seat)}
        disabled={status === 'booked'}
        title={`Seat ${seat}`}
        className={`relative w-9 h-10 rounded-t-xl rounded-b-sm text-xs font-bold border-2 transition-all duration-150 flex items-center justify-center flex-shrink-0
          ${status === 'selected'
            ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-lg shadow-orange-400/40 scale-110 z-10'
            : status === 'booked'
            ? 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed'
            : 'bg-white border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-[#FF6B00] hover:scale-105 cursor-pointer'
          }`}
      >
        <span className={`absolute top-0 left-0.5 right-0.5 h-[3px] rounded-t-full ${
          status === 'selected' ? 'bg-orange-300' : status === 'booked' ? 'bg-gray-200' : 'bg-orange-100'
        }`} />
        {seat}
      </button>
    );
  };

  const DriverSeat = () => (
    <div
      className="relative w-9 h-10 rounded-t-xl rounded-b-sm bg-gray-700 border-2 border-gray-600 flex items-center justify-center flex-shrink-0"
      title="Driver"
    >
      <span className="absolute top-0 left-0.5 right-0.5 h-[3px] rounded-t-full bg-gray-500" />
      <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="7" r="3" />
        <path d="M6 20c0-3.31 2.69-6 6-6s6 2.69 6 6" />
      </svg>
    </div>
  );

  const Aisle = () => <div className="w-5 flex-shrink-0" />;
  const EmptySlot = () => <div className="w-9 h-10 flex-shrink-0" />;

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {totalSeats}-Seat Vehicle
        </span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          available === 0 ? 'bg-red-100 text-red-600'
          : available <= 3 ? 'bg-orange-100 text-orange-600'
          : 'bg-green-100 text-green-700'
        }`}>
          {available === 0 ? 'Full' : `${available} / ${totalSeats} free`}
        </span>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-2">
          Front — Windscreen
        </p>
        <div className="h-1.5 bg-gradient-to-b from-sky-200 to-sky-100 rounded-full mx-4 mb-4 border border-sky-200" />

        <div className="flex flex-col items-center gap-2">
          {rows.map((row, ri) => (
            <div key={ri} className="flex items-end justify-center gap-1.5">
              {row.map((cell, ci) => {
                if (cell === 'driver') return <DriverSeat key={ci} />;
                if (cell === 'aisle') return <Aisle key={ci} />;
                if (cell === 'empty') return <EmptySlot key={ci} />;
                return <SeatBtn key={ci} seat={cell as number} />;
              })}
            </div>
          ))}
        </div>

        <div className="h-1.5 bg-gradient-to-t from-gray-300 to-gray-200 rounded-full mx-4 mt-4 border border-gray-200" />
        <p className="text-center text-[10px] text-gray-400 uppercase tracking-widest font-semibold mt-2">
          Back
        </p>
      </div>

      <div className="flex items-center justify-center gap-5 mt-3 text-xs text-gray-500">
        {[
          { label: 'Free', cls: 'bg-white border-orange-200' },
          { label: 'Yours', cls: 'bg-[#FF6B00] border-[#FF6B00]' },
          { label: 'Taken', cls: 'bg-gray-100 border-gray-200' },
          { label: 'Driver', cls: 'bg-gray-700 border-gray-600' },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded-t-lg rounded-b-sm border-2 ${cls}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
