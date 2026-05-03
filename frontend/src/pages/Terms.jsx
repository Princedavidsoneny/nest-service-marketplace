export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <h1 className="text-3xl font-bold text-white">Terms of Service</h1>

        <p className="mt-4 text-slate-300">
          By using Nest, you agree to use the platform responsibly and honestly.
          Nest connects customers with local service providers.
        </p>

        <h2 className="mt-6 text-xl font-semibold text-white">For customers</h2>
        <p className="mt-2 text-slate-300">
          Customers should provide accurate booking details, communicate clearly,
          and make payments only through approved platform methods.
        </p>

        <h2 className="mt-6 text-xl font-semibold text-white">For providers</h2>
        <p className="mt-2 text-slate-300">
          Providers must provide truthful service information, respond to bookings
          professionally, and complete work as agreed with customers.
        </p>

        <h2 className="mt-6 text-xl font-semibold text-white">Payments and disputes</h2>
        <p className="mt-2 text-slate-300">
          Payment terms, refunds, and disputes may be reviewed based on the
          booking details and communication between the customer and provider.
        </p>

        <h2 className="mt-6 text-xl font-semibold text-white">Changes</h2>
        <p className="mt-2 text-slate-300">
          We may update these terms as the platform grows.
        </p>
      </div>
    </div>
  );
}