'use client';
import './agent-tools';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs';
import KoraHeroIllustration from '@/components/kora-hero-illustration';
import {
  connectWallet,
  restoreWallet,
  shortAddress,
  friendlyError,
  type ConnectedWallet,
} from '@/lib/kora';

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
const INFLOW = [48, 62, 55, 77, 66, 91];
const PROOF_LOOP = [
  ['Business Data', 'SIMULATED', 'Fictional Ada’s Pharmacy records with validated evidence hashes.'],
  ['Understand', 'REAL — LOCAL', 'Typed cash-flow and obligation skills; no prompt arithmetic.'],
  ['Simulate', 'REAL — LOCAL', 'Baseline, late-invoice and 20% sales-decline scenarios.'],
  ['Decide', 'REAL — LOCAL', 'Traceable recommendation, assumptions, risks and policy version.'],
  ['Finance', 'PARTIAL', 'Smaller cash-plus-facility terms require explicit human approval.'],
  ['Base Settlement', 'PARTIAL', 'Contract and receipt verifier exist; public testnet receipt is still required.'],
  ['Repay', 'REAL — LOCAL', 'Exact repayment bounds pass on the private EVM lifecycle.'],
  ['Updated History', 'PARTIAL', 'Reconciliation code links repayment to graph history after a verified receipt.'],
] as const;

function fmtNgn(v: number) {
  return '₦' + v.toLocaleString('en-NG');
}

function Counter({value}: {value: number}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const [n, setN] = useState(0);
  const cur = useRef(0);

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      const t = setTimeout(() => setInView(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, {threshold: 0.4});
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  useEffect(() => {
    if (!inView) return;
    const target = value;
    const from = cur.current;
    if (from === target) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const raf2 = requestAnimationFrame(() => {
        cur.current = target;
        setN(target);
      });
      return () => cancelAnimationFrame(raf2);
    }
    const start = performance.now();
    const dur = 1200;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (target - from) * e);
      cur.current = v;
      setN(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return <strong ref={ref}>{fmtNgn(n)}</strong>;
}

export default function Home() {
  const [paused, setPaused] = useState(false);
  const [paid, setPaid] = useState(false);
  const [ai, setAi] = useState(false);
  const [active, setActive] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.classList.add('js');
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const s = window.scrollY > 10;
      setScrolled((prev) => (prev === s ? prev : s));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const secs = ['system', 'workspace', 'capital'];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      {rootMargin: '-40% 0px -55% 0px'},
    );
    secs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('revealed'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            io.unobserve(e.target);
          }
        });
      },
      {threshold: 0.2, rootMargin: '0px 0px -6% 0px'},
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = grid.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        grid.style.setProperty('--mx', String(x * 34));
        grid.style.setProperty('--my', String(y * 34));
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      grid.style.removeProperty('--mx');
      grid.style.removeProperty('--my');
    };
    grid.addEventListener('pointermove', onMove);
    grid.addEventListener('pointerleave', onLeave);
    return () => {
      grid.removeEventListener('pointermove', onMove);
      grid.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    let live = true;
    const syncWallet = () => void (async () => {
      try {
        const restored = await restoreWallet();
        if (live) setWallet(restored);
      } catch {}
    })();
    syncWallet();
    window.ethereum?.on?.('accountsChanged', syncWallet);
    window.ethereum?.on?.('chainChanged', syncWallet);
    return () => {
      live = false;
      window.ethereum?.removeListener?.('accountsChanged', syncWallet);
      window.ethereum?.removeListener?.('chainChanged', syncWallet);
    };
  }, []);

  const connect = async () => {
    setConnecting(true);
    setConnectMsg(null);
    try {
      setWallet(await connectWallet());
    } catch (e) {
      setConnectMsg(friendlyError(String((e as Error).message), null));
    } finally {
      setConnecting(false);
    }
  };

  const clearWallet = () => {
    setWallet(null);
    setConnectMsg('Wallet cleared from Kora. Your wallet app remains securely connected to your browser.');
  };

  const noteText =
    wallet
      ? `Wallet connected as ${shortAddress(wallet.address)}${wallet.chainId === 84532 ? ' on Base Sepolia' : ` on chain ${wallet.chainId}`}. This public workspace is a safe simulation: it will not request signatures, submit transactions or move funds.`
      : connectMsg
        ? connectMsg
        : 'Public demo · No wallet required. Sample business data and changes stay in this browser session; no real money moves.';

  return (
    <>
      <header className={scrolled ? 'scrolled' : ''}>
        <Link className="logo" href="/">
          kora ✳
        </Link>
        <nav aria-label="Sections">
          <a className={active === 'system' ? 'on' : ''} href="#system">
            The system
          </a>
          <a className={active === 'workspace' ? 'on' : ''} href="#workspace">
            Workspace
          </a>
          <a className={active === 'capital' ? 'on' : ''} href="#capital">
            Working capital
          </a>
        </nav>
        <a href="#workspace">Explore Kora ↗</a>
      </header>
      <main className={paused ? 'paused' : ''}>
        <section className="hero">
          <div className="meta">
            <span>● FINANCIAL INTELLIGENCE, IN MOTION</span>
            <span>🔵 BUILT ON BASE</span>
          </div>
          <div className="hero-grid" ref={gridRef}>
            <div className="copy">
              <p className="eyebrow">YOUR BUSINESS. ONE CLEAR PICTURE.</p>
              <h1>
                <span>From fragments.</span>
                <em>To flow.</em>
              </h1>
              <p className="lead">
                Your cash flow, invoices, payments and suppliers.
                <br />
                Finally speaking the same language.
              </p>
              <p className="sub">
                The AI financial operating system for African businesses.
              </p>
              <div className="actions">
                <a className="button" href="#workspace">
                  Enter the workspace
                </a>
                <a href="#system">See how it connects ↓</a>
              </div>
              <div className="hero-foot">
                <span>01 / CLARITY IS YOUR NEXT MOVE</span>
                <button onClick={() => setPaused(!paused)}>
                  {paused ? '▶ Play motion' : 'Ⅱ Pause motion'}
                </button>
              </div>
            </div>
              <KoraHeroIllustration paused={paused} />
          </div>
          <div className="ticker" aria-hidden="true">
            <div>
              {[1, 2, 3, 4].map((n) => (
                <span key={n}>
                  CASH FLOW　✳　INVOICES　✳　PAYMENTS　✳　SUPPLIERS　✳　WORKING CAPITAL　✳　
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="system">
          <p className="eyebrow" data-reveal>
            01 / THE CONNECTED BUSINESS
          </p>
          <div className="heading" data-reveal style={{transitionDelay: '80ms'}}>
            <h2>
              Less chasing numbers.
              <br />
              <em>More moving forward.</em>
            </h2>
            <p>
              Connect the pieces of your business. Understand what’s happening,
              act on what matters, and build a clearer path to capital.
            </p>
          </div>
          <div className="principles">
            {[
              [
                'See clearly.',
                'Turn scattered transactions into a shared view of your money. Know what came in, what’s going out, and what comes next.',
              ],
              [
                'Act with context.',
                'Bring invoice follow-ups and supplier obligations into one place. Let financial intelligence inform your next move.',
              ],
              [
                'Build your next chapter.',
                'Use your trading activity to tell a fuller financial story when preparing for working capital.',
              ],
            ].map(([t, d], i) => (
              <article key={t} data-reveal style={{transitionDelay: i * 90 + 120 + 'ms'}}>
                <span>0{i + 1} ↗</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section workspace-section" id="workspace">
          <div className="heading" data-reveal>
            <div>
              <p className="eyebrow">02 / YOUR FINANCIAL CONTROL ROOM</p>
              <h2>
                The whole picture.
                <br />
                <em>At your fingertips.</em>
              </h2>
            </div>
            <span>◉ Interactive demo · NGN</span>
          </div>
          <div className="workspace" data-reveal style={{transitionDelay: '90ms'}}>
            <div className="workspace-head">
              <b className="logo">kora ✳</b>
              <span>Ade & Co. / Lagos, NG</span>
              <div className="head-right">
                <button
                  className={wallet ? 'connect on' : 'connect'}
                  onClick={wallet ? clearWallet : connect}
                  disabled={connecting}
                >
                  {connecting ? 'Connecting…' : wallet ? 'Connected' : 'Connect wallet'}
                </button>
                <small>
                  <i className={wallet ? 'pulse' : 'dot'} aria-hidden="true" />
                  {wallet
                    ? `${shortAddress(wallet.address)} · ${wallet.chainId === 84532 ? 'BASE SEPOLIA' : `CHAIN ${wallet.chainId}`}`
                    : 'PUBLIC DEMO · NO WALLET REQUIRED'}
                </small>
              </div>
            </div>
            <Tabs defaultValue="overview">
              <TabsList variant="line" className="tabs">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="tabpanel">
                <div className="dash-head">
                  <h3>A clearer day ahead.</h3>
                  <button className="button dark" onClick={() => setAi(!ai)}>
                    ✳ {ai ? 'Close insight' : 'Ask Kora'}
                  </button>
                </div>
                {ai && (
                  <div className="insight" role="status">
                    {paid
                      ? 'Abeni Retail is marked paid. Demo receivables have updated.'
                      : 'Abeni Retail’s overdue ₦2,450,000 invoice could cover the next ₦1,400,000 supplier obligation. Rule-based demo insight.'}
                  </div>
                )}
                <div className="metrics" data-reveal style={{transitionDelay: '150ms'}}>
                  {([
                    ['Available cash', 12840000],
                    ['Outstanding invoices', paid ? 1820000 : 4270000],
                    ['Supplier obligations', 3200000],
                  ] as Array<[string, number]>).map(([t, v]) => (
                    <article key={t}>
                      <span>{t}</span>
                      <Counter value={v} />
                    </article>
                  ))}
                </div>
                <div className="chart-row">
                  <div>
                    <p>Cash in. Cash out.</p>
                    <div
                      className="bars"
                      role="img"
                      aria-label="Sample April to September inflows exceed outflows each month"
                    >
                      {INFLOW.map((n, i) => (
                        <div className="col" key={n}>
                          <span className="tip">
                            {MONTHS[i]} · In {n}% · Out {Math.round(n * 0.65)}%
                          </span>
                          <div className="pair">
                            <b style={{height: n + '%', animationDelay: i * 70 + 'ms'}} />
                            <b style={{height: Math.round(n * 0.65) + '%', animationDelay: i * 70 + 'ms'}} />
                          </div>
                          <span>{MONTHS[i]}</span>
                        </div>
                      ))}
                    </div>
                    <small>Red: inflow · Green: outflow</small>
                  </div>
                  <aside>
                    <p className="eyebrow">✳ KORA INTELLIGENCE</p>
                    <h3>
                      A payment gap.
                      <br />
                      A clear next step.
                    </h3>
                    <p>See how receivables line up with upcoming supplier obligations.</p>
                    <button onClick={() => setAi(true)}>Review the insight ↗</button>
                  </aside>
                </div>
              </TabsContent>
              <TabsContent value="invoices" className="tabpanel">
                <h3 className="view-title">Keep your money moving.</h3>
                <div className="record">
                  <div>
                    <b>Abeni Retail Ltd</b>
                    <small>Due 02 Sep · ₦2,450,000</small>
                  </div>
                  <span>{paid ? 'Paid' : 'Overdue'}</span>
                  <button disabled={paid} onClick={() => setPaid(true)}>
                    {paid ? 'Settled' : 'Mark paid'}
                  </button>
                </div>
                <div className="record">Accra Supply Co. · ₦1,820,000 · Due 12 Sep</div>
                <p role="status">{paid ? 'Demo invoice marked paid. No real money moved.' : ''}</p>
              </TabsContent>
              <TabsContent value="suppliers" className="tabpanel">
                <h3 className="view-title">Know what’s coming.</h3>
                {[
                  ['Mainland Packaging', '18 Sep', '₦1,400,000'],
                  ['Tema Logistics', '24 Sep', '₦800,000'],
                  ['Oyo Produce Collective', '30 Sep', '₦1,000,000'],
                ].map(([n, d, a]) => (
                  <div className="record" key={n}>
                    <div>
                      <b>{n}</b>
                      <small>Payment due {d}</small>
                    </div>
                    <b>{a}</b>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
            <p className={connectMsg ? 'note err' : 'note'}>{noteText}</p>
          </div>
        </section>

        <section className="section proof-section" id="proof">
          <div className="heading" data-reveal>
            <div>
              <p className="eyebrow">03 / THE EVIDENCE LOOP</p>
              <h2>
                One decision.
                <br />
                <em>Proven end to end.</em>
              </h2>
            </div>
            <p>
              Kora separates working mechanisms from claims that still need public network evidence.
              Nothing is marked testnet-verified without a real receipt.
            </p>
          </div>
          <ol className="proof-loop" aria-label="Kora end-to-end evidence path">
            {PROOF_LOOP.map(([name, status, detail], index) => (
              <li key={name} data-reveal style={{transitionDelay: index * 55 + 'ms'}}>
                <span className="proof-index">{String(index + 1).padStart(2, '0')}</span>
                <small className={status.startsWith('UNVERIFIED') ? 'blocked' : ''}>{status}</small>
                <h3>{name}</h3>
                <p>{detail}</p>
              </li>
            ))}
          </ol>
          <div className="proof-footer">
            <span>Business Data → Understand → Simulate → Decide → Finance → Base Settlement → Repay → Updated Business History</span>
            <a href="https://github.com/0xNexuz/kora/tree/main/docs/build-harness">
              Inspect the evidence ↗
            </a>
          </div>
        </section>

        <section className="section capital" id="capital">
          <div className="big-star" aria-hidden="true" data-reveal>
            ✳
          </div>
          <div>
            <p className="eyebrow" data-reveal>
              04 / THE NEXT CHAPTER
            </p>
            <h2 data-reveal style={{transitionDelay: '70ms'}}>
              Your business has a story.
              <br />
              <em>Let your numbers tell it.</em>
            </h2>
            <p data-reveal style={{transitionDelay: '140ms'}}>
              Bring cash flow, invoice history and supplier activity together into a clearer
              working-capital picture.
            </p>
            <details data-reveal style={{transitionDelay: '210ms'}}>
              <summary>Explore capital readiness</summary>
              <p>
                ✓ Cash-flow history
                <br />
                ✓ Invoice and supplier records
                <br />○ Business verification and lender review needed
              </p>
              <small>
                Illustrative checklist, not a financing offer. Base settlement and lender connections
                are planned integrations.
              </small>
            </details>
          </div>
        </section>

        <footer>
          <Link className="logo" href="/">
            kora ✳
          </Link>
          <p>Built for the way Africa does business.</p>
          <span>FROM FRAGMENTS TO FLOW. / 2026</span>
        </footer>
      </main>
    </>
  );
}
