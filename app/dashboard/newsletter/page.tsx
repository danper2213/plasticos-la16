import { getNewsletterSubscribers } from "./actions";

export default async function NewsletterPage() {
  const subscribers = await getNewsletterSubscribers();

  return (
    <div className="space-y-6 pt-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
          Suscriptores Newsletter
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Correos registrados desde el footer de la landing.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
        <div className="grid grid-cols-[1fr_auto] border-b border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm font-semibold text-zinc-200">
          <span>Email</span>
          <span>Fecha</span>
        </div>
        {subscribers.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-400">
            Aún no hay correos suscritos.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {subscribers.map((subscriber) => (
              <div
                key={subscriber.id}
                className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 text-sm"
              >
                <span className="text-zinc-100">{subscriber.email}</span>
                <span className="text-zinc-500">
                  {new Date(subscriber.created_at).toLocaleDateString("es-CO")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
