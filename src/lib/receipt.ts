export type ReceiptData = {
  passengerName: string;
  passengerPhone: string;
  seatNumber: number;
  amountPaid: number;
  route: string;
  departureTime: string;
  driverName: string;
  driverPhone: string;
  registration: string;
  sacco: string;
  bookingDate: string;
  pickupLocation?: string;
  bookingId?: string;
};

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="56" height="56">
  <rect width="100" height="100" rx="22" fill="#FF6B00"/>
  <path d="M65,28C65,20 58,15 49,15L40,15C31,15 25,20 25,27C25,34 31,38 40,41L60,47C69,50 75,55 75,63C75,71 68,77 58,77L48,77C38,77 32,73 32,66"
    fill="none" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="18" y1="72" x2="72" y2="62" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.9"/>
  <polyline points="62,56 72,62 65,70" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
</svg>`;

function fmt(d: string) {
  return new Date(d).toLocaleString('en-KE', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function makeQrUrl(data: string): string {
  const encoded = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encoded}&format=png&margin=4`;
}

export function generateReceipt(data: ReceiptData) {
  const rideId = data.bookingId ?? `SONGA-${Date.now()}`;
  const verifyUrl = `https://songa.co.ke/verify?id=${rideId}`;
  const qrContent = `Songa Ride\nID: ${rideId}\nRoute: ${data.route}\nPassenger: ${data.passengerName}\nSeat: ${data.seatNumber}\nPaid: KES ${data.amountPaid}\nVerify: ${verifyUrl}`;
  const qrUrl = makeQrUrl(qrContent);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Songa Receipt — ${data.passengerName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;color:#111;padding:32px 28px;max-width:560px;margin:0 auto;}
    .lh{display:flex;align-items:center;gap:16px;padding-bottom:18px;border-bottom:3px solid #FF6B00;margin-bottom:24px;}
    .brand{font-size:28px;font-weight:900;color:#FF6B00;letter-spacing:-1px;}
    .slogan{font-size:11px;color:#888;margin-top:2px;font-style:italic;}
    .contact{font-size:11px;color:#555;margin-top:4px;}
    .contact a{color:#FF6B00;text-decoration:none;font-weight:600;}
    .badge{display:inline-block;background:#fff8f4;border:2px solid #fde8d8;border-radius:8px;padding:5px 16px;font-size:10px;font-weight:800;color:#FF6B00;text-transform:uppercase;letter-spacing:2px;margin-left:auto;align-self:flex-start;}
    .seat-wrap{text-align:center;margin-bottom:20px;}
    .seat-label{font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;}
    .seat-num{display:inline-block;background:#FF6B00;color:#fff;font-size:24px;font-weight:900;padding:8px 28px;border-radius:10px;}
    .sec{margin-bottom:18px;}
    .sec-title{font-size:9px;font-weight:800;color:#FF6B00;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #fde8d8;}
    .row{display:flex;justify-content:space-between;margin-bottom:6px;}
    .lbl{font-size:12px;color:#888;}
    .val{font-size:12px;font-weight:600;color:#111;text-align:right;max-width:60%;}
    .total{background:#fff8f4;border:2px solid #fde8d8;border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
    .total-lbl{font-size:13px;font-weight:700;}
    .total-val{font-size:22px;font-weight:900;color:#FF6B00;}
    .notice{background:#fff3f0;border:1.5px solid #ffcfbf;border-radius:10px;padding:13px 16px;margin-bottom:20px;}
    .notice-title{font-size:11px;font-weight:800;color:#cc3300;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;}
    .notice-text{font-size:12px;color:#aa2200;line-height:1.55;}
    .qr-section{display:flex;align-items:flex-start;gap:16px;padding:16px;background:#f9f9f9;border:1px solid #eee;border-radius:12px;margin-bottom:20px;}
    .qr-text{font-size:11px;color:#555;line-height:1.6;}
    .qr-text strong{color:#111;font-size:12px;}
    .qr-id{font-family:monospace;font-size:10px;color:#888;margin-top:4px;word-break:break-all;}
    .footer{text-align:center;padding-top:16px;border-top:1px solid #eee;}
    .footer a{font-size:13px;color:#FF6B00;font-weight:800;text-decoration:none;}
    .footer-phone{font-size:12px;color:#555;margin-top:3px;}
    .copy{font-size:10px;color:#bbb;margin-top:8px;}
    @media print{body{padding:16px;}.no-print{display:none!important;}}
  </style>
</head>
<body>
  <div class="lh">
    ${LOGO_SVG}
    <div>
      <div class="brand">Songa</div>
      <div class="slogan">Your Journey, Redefined</div>
      <div class="contact"><a href="https://songa.co.ke">songa.co.ke</a> &bull; <a href="tel:0704876036">0704 876 036</a></div>
    </div>
    <div class="badge">Receipt</div>
  </div>

  <div class="seat-wrap">
    <div class="seat-label">Your Seat</div>
    <div class="seat-num">Seat ${data.seatNumber}</div>
  </div>

  <div class="sec">
    <div class="sec-title">Passenger</div>
    <div class="row"><span class="lbl">Name</span><span class="val">${data.passengerName}</span></div>
    <div class="row"><span class="lbl">Phone</span><span class="val">${data.passengerPhone}</span></div>
    ${data.pickupLocation ? `<div class="row"><span class="lbl">Pickup Point</span><span class="val">${data.pickupLocation}</span></div>` : ''}
  </div>

  <div class="sec">
    <div class="sec-title">Journey</div>
    <div class="row"><span class="lbl">Route</span><span class="val">${data.route}</span></div>
    <div class="row"><span class="lbl">Departure</span><span class="val">${fmt(data.departureTime)}</span></div>
    <div class="row"><span class="lbl">Booked On</span><span class="val">${new Date(data.bookingDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
  </div>

  <div class="sec">
    <div class="sec-title">Vehicle &amp; Driver</div>
    <div class="row"><span class="lbl">Driver</span><span class="val">${data.driverName}</span></div>
    <div class="row"><span class="lbl">Driver Phone</span><span class="val">${data.driverPhone}</span></div>
    ${data.registration ? `<div class="row"><span class="lbl">Reg. No.</span><span class="val" style="font-family:monospace">${data.registration}</span></div>` : ''}
    ${data.sacco ? `<div class="row"><span class="lbl">SACCO</span><span class="val">${data.sacco}</span></div>` : ''}
  </div>

  <div class="total">
    <span class="total-lbl">Total Paid</span>
    <span class="total-val">KES ${data.amountPaid.toLocaleString()}</span>
  </div>

  <div class="notice">
    <div class="notice-title">Payment Notice</div>
    <div class="notice-text">Payment should be made to the <strong>driver only</strong>. Confirm with the driver immediately after paying.</div>
  </div>

  <!-- QR Code -->
  <div class="qr-section">
    <img src="${qrUrl}" alt="Ride QR Code" width="100" height="100" style="border-radius:8px;flex-shrink:0;" />
    <div>
      <div class="qr-text"><strong>Ride Verification QR</strong><br/>Scan to verify this booking or share details. Valid for travel on the date shown above.</div>
      <div class="qr-id">ID: ${rideId}</div>
    </div>
  </div>

  <div class="footer">
    <a href="https://songa.co.ke">www.songa.co.ke</a>
    <div class="footer-phone">Support: 0704 876 036</div>
    <div class="copy">&copy; ${new Date().getFullYear()} Songa &mdash; Your Journey, Redefined</div>
  </div>
  <script>window.onload=function(){window.print();}</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=640,height=900');
  if (win) { win.document.write(html); win.document.close(); }
}
