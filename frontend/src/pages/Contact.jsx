export default function Contact() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <h1 className="text-3xl font-bold text-white">Contact Nest</h1>

        <p className="mt-4 text-slate-300">
          Need help with bookings, payments, provider accounts, or general support?
          Contact the Nest team.
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <h2 className="font-semibold text-white">Email</h2>
            <p className="mt-1 text-slate-300">support@nestmarketplace.com</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <h2 className="font-semibold text-white">Support hours</h2>
            <p className="mt-1 text-slate-300">Monday to Friday, 9am - 5pm</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <h2 className="font-semibold text-white">About Nest</h2>
            <p className="mt-1 text-slate-300">
              Nest helps customers find trusted local professionals and allows
              providers to publish services, receive bookings, and manage jobs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}