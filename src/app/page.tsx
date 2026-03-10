import Link from "next/link";

export default function Home() {
  const features = [
    {
      href: "/receptive",
      title: "ASL to English",
      description:
        "Sign to your camera and get real-time text transcription while you practice fingerspelling.",
      cta: "Start Receptive Mode",
      icon: (
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.8"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
          />
        </svg>
      ),
    },
    {
      href: "/expressive",
      title: "English to ASL",
      description:
        "Type or speak naturally and watch your message translated into ASL signs and fingerspelling.",
      cta: "Start Expressive Mode",
      icon: (
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.8"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802M14.25 18h6.75"
          />
        </svg>
      ),
    },
    {
      href: "/community",
      title: "Community Capture",
      description:
        "Contribute short phrase recordings to grow shared training data and improve model diversity.",
      cta: "Contribute a Clip",
      icon: (
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.8"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V7.5m0 9 3-3m-3 3-3-3m9.75 5.25h-13.5a2.25 2.25 0 0 1-2.25-2.25V6.75A2.25 2.25 0 0 1 4.5 4.5h15a2.25 2.25 0 0 1 2.25 2.25v9.75a2.25 2.25 0 0 1-2.25 2.25Z"
          />
        </svg>
      ),
    },
  ] as const;

  return (
    <div className="relative h-full w-full overflow-auto bg-neutral-100 text-neutral-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="ambient-grid absolute inset-0" />
        <div className="ambient-orb ambient-orb-a" />
        <div className="ambient-orb ambient-orb-b" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col px-6 pb-10 pt-8 md:px-10 md:pb-14 md:pt-12">
        <header className="mb-10 flex flex-col gap-7 border border-neutral-300 bg-white p-6 md:p-8">
          <div className="inline-flex w-fit items-center gap-2 border border-neutral-300 bg-neutral-50 px-3 py-1 text-xs uppercase tracking-[0.15em] text-neutral-600">
            SignBridge Utility
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">
                ASL and English translation tools.
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-neutral-600 md:text-base">
                Choose a mode to run live transcription, avatar output, or
                community data capture. Designed for fast access and predictable
                behavior.
              </p>
            </div>

            <div className="border border-neutral-300 bg-neutral-50 p-5">
              <p className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                Workflow
              </p>
              <div className="mt-3 flex flex-col gap-2 text-sm text-neutral-700">
                <div className="border border-neutral-300 bg-white px-3 py-2">1. Select a mode</div>
                <div className="border border-neutral-300 bg-white px-3 py-2">
                  2. Start translating instantly
                </div>
                <div className="border border-neutral-300 bg-white px-3 py-2">
                  3. Clear output or switch modes
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature) => {
            return (
              <Link href={feature.href} key={feature.href} className="group">
                <article
                  className="h-full border border-neutral-300 bg-white p-6 transition duration-200 hover:border-neutral-500 hover:bg-neutral-50"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center border border-neutral-300 bg-neutral-50 text-neutral-700">
                    {feature.icon}
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
                    {feature.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                    {feature.description}
                  </p>
                  <div className="mt-5 flex items-center gap-2 text-sm font-medium text-neutral-800">
                    <span>{feature.cta}</span>
                    <span className="transition group-hover:translate-x-1">-&gt;</span>
                  </div>
                </article>
              </Link>
            );
          })}
        </section>

        <footer className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-neutral-300 pt-5 text-sm text-neutral-600 md:flex-row md:items-center">
          <p>Powered by MediaPipe, GPT-4o, and Three.js</p>
          <p>Utility interface for daily translation workflows.</p>
        </footer>
      </main>
    </div>
  );
}
