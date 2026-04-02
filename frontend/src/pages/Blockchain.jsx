import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:4000/api'
const short = (s = '') => s.length > 16 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s
const ago = (ts) => {
    const d = Math.floor((Date.now() - ts * 1000) / 1000)
    if (d < 60) return `${d}s ago`
    if (d < 3600) return `${Math.floor(d / 60)}m ago`
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`
    return new Date(ts * 1000).toLocaleDateString()
}

/* ── Shared Logo SVG ────────────────────────────────────────── */
const LogoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
)

/* ── Navbar ─────────────────────────────────────────────────── */
function Navbar({ tab, setTab, account, isOwner, onLogout }) {
    const tabs = ['Overview', 'Upload', 'History', 'Clients', ...(isOwner ? ['Nodes'] : [])]
    return (
        <nav style={{
            position: 'sticky', top: 0, zIndex: 50,
            background: 'rgba(11,17,32,0.9)',
            borderBottom: '1px solid var(--border)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LogoIcon />
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>FedShield</span>
                    </div>
                    <div className="tab-bar">
                        {tabs.map(t => (
                            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                    {isOwner && <span className="badge badge-warning">Owner</span>}
                    <div className="wallet-badge">
                        <div className="pulse-dot" />
                        <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-2)' }}>{short(account)}</span>
                    </div>
                    <button className="btn btn-ghost" onClick={onLogout} style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>Disconnect</button>
                </div>
            </div>
        </nav>
    )
}

/* ── Step progress bar ────────────────────────────────────────── */
function StepBar({ step }) {
    const steps = [
        { id: 0, label: 'Select File' },
        { id: 1, label: 'IPFS Upload' },
        { id: 2, label: 'On-chain Tx' },
        { id: 3, label: 'Complete' },
    ]
    return (
        <div className="step-bar">
            {steps.map((s, i) => {
                const done = step > s.id
                const active = step === s.id
                const state = done ? 'done' : active ? 'active' : 'idle'
                return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div className={`step-circle ${state}`}>
                                {active && step < 3 ? <div className="spinner" style={{ width: 14, height: 14 }} /> : s.id + 1}
                            </div>
                            <span className={`step-label ${state}`}>{s.label}</span>
                        </div>
                        {i < steps.length - 1 && <div className={`step-connector ${done ? 'done' : 'idle'}`} />}
                    </div>
                )
            })}
        </div>
    )
}

/* ── Stat Card ──────────────────────────────────────────────── */
function StatCard({ label, value, sub, color, onClick, delay }) {
    return (
        <div
            className={`glass${onClick ? ' glass-hover' : ''} fade-up`}
            onClick={onClick}
            style={{ padding: '1.25rem 1.5rem', animationDelay: delay, cursor: onClick ? 'pointer' : 'default' }}
        >
            <p className="section-label" style={{ marginBottom: '0.65rem' }}>{label}</p>
            <div className="stat-value" style={{ color: color || 'var(--text-1)', marginBottom: sub ? 4 : 0 }}>{value}</div>
            {sub && <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: 2 }}>{sub}</div>}
        </div>
    )
}

/* ══ TAB: OVERVIEW ═════════════════════════════════════════════ */
function OverviewTab({ data, loading, onRefresh, setTab }) {
    return (
        <div>
            <div className="fade-up" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.4rem' }}>Blockchain Dashboard</h1>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>FedShield · Polygon Amoy Testnet</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="pulse-dot" />
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-2)' }}>Live · auto-refresh 30s</span>
                    </div>
                    <button className="btn btn-ghost" onClick={onRefresh} style={{ padding: '0.38rem 0.875rem', fontSize: '0.78rem' }}>Refresh</button>
                </div>
            </div>

            {loading && !data ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
            ) : data ? (
                <>
                    {/* Stat cards */}
                    <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '0.875rem', marginBottom: '1.25rem' }}>
                        <StatCard label="Current Round" value={data.round} color="var(--accent-2)" delay="0s" />
                        <StatCard label="Model Versions" value={data.totalVersions} onClick={() => setTab('History')} delay="0.05s" />
                        <StatCard label="Clients This Round" value={data.clientCount ?? '—'} onClick={() => setTab('Clients')} delay="0.10s" />
                        <StatCard label="Latest CID" value={short(data.latestCid)} sub={data.latestCid} delay="0.15s" />
                    </div>

                    {/* Latest model banner */}
                    {data.latestCid && (
                        <div className="glass fade-up" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem', borderColor: 'rgba(99,102,241,0.2)', animationDelay: '0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <p className="section-label" style={{ marginBottom: '0.4rem' }}>Latest Global Model</p>
                                    <code style={{ fontSize: '0.78rem', background: 'none', padding: 0, wordBreak: 'break-all', color: 'var(--text-1)' }}>{data.latestCid}</code>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <a href={`https://gateway.pinata.cloud/ipfs/${data.latestCid}`} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '0.38rem 0.875rem', fontSize: '0.78rem' }}>View on IPFS</a>
                                    <button className="btn btn-primary" onClick={() => setTab('Upload')} style={{ padding: '0.38rem 0.875rem', fontSize: '0.78rem' }}>Upload New</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent history */}
                    {data.versions?.length > 0 && (
                        <div className="glass fade-up" style={{ overflow: 'hidden', animationDelay: '0.25s' }}>
                            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Recent Global Models</h3>
                                <button className="btn btn-ghost" onClick={() => setTab('History')} style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem' }}>View all</button>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table>
                                    <thead><tr><th>Version</th><th>Round</th><th>IPFS CID</th><th>Recorded</th><th>By</th></tr></thead>
                                    <tbody>
                                        {data.versions.slice(-5).reverse().map((v, i) => (
                                            <tr key={i}>
                                                <td><span className="badge badge-accent">v{v.version}</span></td>
                                                <td style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>{v.round}</td>
                                                <td><a href={v.gateway} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.77rem' }}>{short(v.ipfsCID)}</a></td>
                                                <td style={{ color: 'var(--text-2)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{ago(v.timestamp)}</td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-3)' }}>{short(v.recordedBy)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="glass fade-up" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ marginBottom: '1rem' }}>Could not reach blockchain server on port 4000.</p>
                    <button className="btn btn-primary" onClick={onRefresh}>Retry</button>
                </div>
            )}
        </div>
    )
}

/* ══ TAB: UPLOAD ════════════════════════════════════════════════ */
function UploadTab({ onSuccess }) {
    const fileRef = useRef()
    const [file, setFile] = useState(null)
    const [dragging, setDragging] = useState(false)
    const [step, setStep] = useState(0)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    const pickFile = (f) => {
        if (!f) return
        if (!f.name.endsWith('.json')) { setError('Only .json files accepted.'); return }
        setError(''); setFile(f); setResult(null); setStep(0)
    }

    const onDrop = useCallback(e => {
        e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0])
    }, [])

    const submit = async () => {
        if (!file) return
        setError(''); setResult(null); setStep(1)
        const fd = new FormData()
        fd.append('model', file)
        fd.append('pinName', `fedshield_${file.name.replace('.json', '')}_${Date.now()}`)
        try {
            await new Promise(r => setTimeout(r, 500)); setStep(2)
            const res = await fetch(`${API}/upload-and-register`, { method: 'POST', body: fd })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Upload failed')
            setStep(3); setResult(data); onSuccess?.()
        } catch (e) { setError(e.message); setStep(0) }
    }

    const dropZoneBg = dragging ? 'rgba(99,102,241,0.07)' : file ? 'rgba(34,197,94,0.04)' : 'transparent'
    const dropZoneBorder = dragging ? 'var(--accent-2)' : file ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'

    return (
        <div>
            <div className="fade-up" style={{ marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: '0.4rem' }}>Upload & Register</h1>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Pin a model file to IPFS and record the CID on-chain in one step</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                <div className="glass fade-up" style={{ padding: '1.75rem' }}>
                    <StepBar step={step} />

                    {/* Drop zone */}
                    <div
                        onClick={() => step === 0 && fileRef.current.click()}
                        onDragOver={e => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        style={{
                            border: `1.5px dashed ${dropZoneBorder}`,
                            borderRadius: 'var(--r-md)',
                            padding: '2.5rem 1.5rem',
                            textAlign: 'center',
                            cursor: step === 0 ? 'pointer' : 'default',
                            background: dropZoneBg,
                            transition: 'all 0.18s',
                        }}
                    >
                        <input ref={fileRef} type="file" accept=".json" hidden onChange={e => pickFile(e.target.files[0])} />
                        {file ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                    </svg>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 3 }}>{file.name}</div>
                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>{(file.size / 1024).toFixed(1)} KB</div>
                                </div>
                                {step === 0 && (
                                    <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setFile(null) }} style={{ padding: '0.25rem 0.65rem', fontSize: '0.73rem' }}>
                                        Remove
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                                    </svg>
                                </div>
                                <div>
                                    <p style={{ fontWeight: 600, color: 'var(--text-1)', margin: '0 0 4px', fontSize: '0.875rem' }}>Drag & drop your JSON model</p>
                                    <p style={{ fontSize: '0.8rem', margin: 0 }}>or <span style={{ color: 'var(--accent-2)', fontWeight: 600 }}>click to browse</span></p>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && <div className="alert-error fade-in" style={{ marginTop: '1rem' }}>{error}</div>}

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem' }}>
                        <button className="btn btn-primary" onClick={submit} disabled={!file || (step > 0 && step < 3)} style={{ flex: 1, justifyContent: 'center' }}>
                            {step === 1 ? <><div className="spinner" style={{ width: 14, height: 14 }} />Uploading…</>
                                : step === 2 ? <><div className="spinner" style={{ width: 14, height: 14 }} />Submitting tx…</>
                                    : step === 3 ? 'Upload another'
                                        : 'Upload & Register'}
                        </button>
                        {(step === 3 || error) && (
                            <button className="btn btn-ghost" onClick={() => { setFile(null); setStep(0); setResult(null); setError('') }}>Reset</button>
                        )}
                    </div>
                </div>

                {/* Result / how-it-works */}
                <div className="fade-up" style={{ animationDelay: '0.1s' }}>
                    {result ? (
                        <div className="glass" style={{ padding: '1.5rem', borderColor: 'rgba(34,197,94,0.22)' }}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <h3 style={{ color: 'var(--success)', marginBottom: 4, fontSize: '0.95rem' }}>Successfully Registered</h3>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Pinned on IPFS · Stored on Polygon Amoy</span>
                            </div>
                            {[['IPFS CID', result.cid, result.gateway], ['Transaction', result.txHash, result.explorer], ['Block', `#${result.blockNumber}`, null]].map(([label, val, link]) => (
                                <div key={label} style={{ padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>
                                    <div className="section-label" style={{ marginBottom: 5 }}>{label}</div>
                                    {link ? <a href={link} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>{val}</a>
                                        : <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>{val}</span>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1.25rem', fontSize: '0.875rem', fontWeight: 600 }}>How it works</h3>
                            {[
                                ['1', 'IPFS Upload', 'Your .json file is pinned permanently via Pinata'],
                                ['2', 'On-chain Register', 'The CID is stored in FedShieldCoordinator as a new version'],
                                ['3', 'Immutable History', 'Every version is queryable on Polygon Amoy forever'],
                            ].map(([n, title, desc]) => (
                                <div key={n} style={{ display: 'flex', gap: '0.875rem', marginBottom: '1rem' }}>
                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-subtle)', border: '1px solid rgba(99,102,241,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-2)', flexShrink: 0, marginTop: 1 }}>{n}</div>
                                    <div>
                                        <div style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: 2 }}>{title}</div>
                                        <div style={{ fontSize: '0.76rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ══ TAB: HISTORY ════════════════════════════════════════════════ */
function HistoryTab() {
    const [versions, setVersions] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try { const r = await fetch(`${API}/model-versions`).then(x => x.json()); setVersions(r.versions || []) }
        catch (_) { } finally { setLoading(false) }
    }, [])
    useEffect(() => { load() }, [load])

    const filtered = versions.filter(v =>
        v.ipfsCID.toLowerCase().includes(search.toLowerCase()) ||
        v.recordedBy.toLowerCase().includes(search.toLowerCase()) ||
        String(v.version).includes(search) || String(v.round).includes(search)
    ).slice().reverse()

    return (
        <div>
            <div className="fade-up" style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.4rem' }}>Model History</h1>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>{versions.length} version{versions.length !== 1 ? 's' : ''} recorded on-chain</p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <input type="text" placeholder="Search CID, address, version…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 260, fontSize: '0.82rem', padding: '0.45rem 0.875rem' }} />
                    <button className="btn btn-ghost" onClick={load} style={{ padding: '0.45rem 0.875rem', fontSize: '0.78rem' }}>Refresh</button>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" style={{ width: 26, height: 26 }} /></div>
            ) : filtered.length === 0 ? (
                <div className="glass fade-up" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-2)' }}>{search ? 'No matching versions.' : 'No model versions recorded yet.'}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {filtered.map((v, i) => (
                        <div key={i} className="glass glass-hover fade-up" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', animationDelay: `${Math.min(i, 6) * 0.04}s` }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: 'var(--accent-subtle)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '0.52rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ver</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-2)', lineHeight: 1 }}>{v.version}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
                                    <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>Round {v.round}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>{new Date(v.timestamp * 1000).toLocaleString()}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>· {ago(v.timestamp)}</span>
                                </div>
                                <a href={v.gateway} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>{v.ipfsCID}</a>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 2, fontFamily: 'monospace' }}>By: {v.recordedBy}</div>
                            </div>
                            <a href={v.gateway} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '0.32rem 0.75rem', fontSize: '0.74rem', flexShrink: 0 }}>IPFS</a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

/* ══ TAB: CLIENTS ════════════════════════════════════════════════ */
function ClientsTab({ currentRound }) {
    const [round, setRound] = useState('')
    const [updates, setUpdates] = useState(null)
    const [loading, setLoading] = useState(false)
    const [err, setErr] = useState('')

    const fetchRound = async (r) => {
        const n = parseInt(r ?? round, 10)
        if (isNaN(n) || n < 0) { setErr('Enter a valid round ≥ 0'); return }
        setErr(''); setLoading(true); setUpdates(null)
        try { const res = await fetch(`${API}/client-updates/${n}`).then(x => x.json()); setUpdates(res); setRound(String(n)) }
        catch (e) { setErr(e.message) } finally { setLoading(false) }
    }

    useEffect(() => { if (currentRound >= 0) fetchRound(currentRound) }, [currentRound])

    const roundNum = parseInt(round, 10) || 0

    return (
        <div>
            <div className="fade-up" style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ marginBottom: '0.4rem' }}>Client Updates</h1>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Browse local model submissions from federated nodes per round</p>
            </div>

            {/* Round picker */}
            <div className="glass fade-up" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => fetchRound(Math.max(1, roundNum - 1))} disabled={loading || roundNum <= 1} style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}>‹</button>
                <input type="number" min="1" placeholder="Round" value={round} onChange={e => setRound(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchRound()} style={{ maxWidth: 96, textAlign: 'center', padding: '0.4rem 0.6rem', fontSize: '0.875rem' }} />
                <button className="btn btn-ghost" onClick={() => fetchRound(roundNum + 1)} disabled={loading} style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}>›</button>
                <button className="btn btn-primary" onClick={() => fetchRound()} disabled={loading} style={{ padding: '0.4rem 1rem', fontSize: '0.82rem' }}>
                    {loading ? <><div className="spinner" style={{ width: 13, height: 13 }} />Loading…</> : 'Fetch'}
                </button>
                {currentRound > 0 && (
                    <button className="btn btn-ghost" onClick={() => fetchRound(currentRound)} disabled={loading} style={{ padding: '0.4rem 0.875rem', fontSize: '0.78rem' }}>
                        Current (#{currentRound})
                    </button>
                )}
                {err && <span style={{ color: 'var(--danger)', fontSize: '0.82rem' }}>{err}</span>}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" style={{ width: 26, height: 26 }} /></div>
            ) : updates ? (
                <div className="fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Round {updates.round}</h3>
                        <span className={`badge ${updates.total > 0 ? 'badge-success' : 'badge-warning'}`}>{updates.total} update{updates.total !== 1 ? 's' : ''}</span>
                    </div>
                    {updates.total === 0 ? (
                        <div className="glass" style={{ padding: '2.5rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-2)' }}>No client updates for round {updates.round}.</p>
                        </div>
                    ) : (
                        <div className="glass" style={{ overflow: 'hidden' }}>
                            <table>
                                <thead><tr><th>Node Address</th><th>IPFS CID</th><th>Submitted</th><th>Metadata</th><th></th></tr></thead>
                                <tbody>
                                    {updates.updates.map((u, i) => (
                                        <tr key={i}>
                                            <td><code style={{ fontSize: '0.76rem', color: 'var(--accent-2)', background: 'none', padding: 0 }}>{short(u.nodeAddress)}</code></td>
                                            <td><a href={u.gateway} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.76rem' }}>{short(u.ipfsCID)}</a></td>
                                            <td style={{ fontSize: '0.78rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{ago(u.timestamp)}</td>
                                            <td>{u.metadata && <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.2rem 0.5rem', color: 'var(--text-2)' }}>{u.metadata}</span>}</td>
                                            <td><a href={u.gateway} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '0.28rem 0.65rem', fontSize: '0.72rem' }}>IPFS</a></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <div className="glass fade-up" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-2)' }}>Pick a round and press Fetch to view client updates.</p>
                </div>
            )}
        </div>
    )
}

/* ══ TAB: NODES (owner only) ════════════════════════════════════ */
function NodesTab() {
    const [address, setAddress] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    const submit = async () => {
        const addr = address.trim()
        if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) { setError('Enter a valid 0x address (40 hex chars)'); return }
        setError(''); setResult(null); setLoading(true)
        try {
            const res = await fetch(`${API}/authorize-node`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: addr }) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Request failed')
            setResult({ ...data, address: addr }); setAddress('')
        } catch (e) { setError(e.message) } finally { setLoading(false) }
    }

    return (
        <div>
            <div className="fade-up" style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ marginBottom: '0.4rem' }}>Node Management</h1>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Authorize nodes to submit local model updates</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                <div className="glass fade-up" style={{ padding: '1.75rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.25rem' }}>Authorize Node</h3>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Node Ethereum Address</label>
                    <input type="text" placeholder="0x0000…0000" value={address} onChange={e => { setAddress(e.target.value); setError(''); setResult(null) }} onKeyDown={e => e.key === 'Enter' && submit()} style={{ marginBottom: '1rem', fontFamily: 'monospace', fontSize: '0.84rem' }} />
                    {error && <div className="alert-error fade-in" style={{ marginBottom: '1rem' }}>{error}</div>}
                    <button className="btn btn-primary" onClick={submit} disabled={loading || !address} style={{ width: '100%', justifyContent: 'center' }}>
                        {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} />Sending tx…</> : 'Authorize Node'}
                    </button>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-3)', marginTop: '0.875rem', textAlign: 'center' }}>Only the contract owner can authorize nodes</p>
                </div>

                <div className="fade-up" style={{ animationDelay: '0.1s' }}>
                    {result ? (
                        <div className="glass" style={{ padding: '1.5rem', borderColor: 'rgba(34,197,94,0.22)' }}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <h3 style={{ color: 'var(--success)', marginBottom: 4, fontSize: '0.95rem' }}>Node Authorized</h3>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-2)' }}>Confirmed on Polygon Amoy</span>
                            </div>
                            {[['Address', result.address, null], ['Transaction', result.txHash, result.explorer], ['Block', `#${result.blockNumber}`, null]].map(([label, val, link]) => (
                                <div key={label} style={{ padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
                                    <div className="section-label" style={{ marginBottom: 4 }}>{label}</div>
                                    {link ? <a href={link} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.77rem', wordBreak: 'break-all' }}>{val}</a>
                                        : <span style={{ fontFamily: 'monospace', fontSize: '0.77rem', wordBreak: 'break-all' }}>{val}</span>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>About Authorization</h3>
                            {[
                                ['Access Control', 'Only authorized nodes can submit local updates'],
                                ['On-chain', 'addNode(address) recorded on Polygon Amoy'],
                                ['Owner Only', 'Only the deployer wallet can authorize nodes'],
                                ['Federated', 'Authorized nodes join the training rounds'],
                            ].map(([title, desc]) => (
                                <div key={title} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.875rem' }}>
                                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-2)', flexShrink: 0, marginTop: 6 }} />
                                    <div>
                                        <div style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: 2 }}>{title}</div>
                                        <div style={{ fontSize: '0.76rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ══ ROOT ════════════════════════════════════════════════════════ */
export default function Blockchain() {
    const navigate = useNavigate()
    const account = localStorage.getItem('account') || ''
    const isOwner = localStorage.getItem('isOwner') === 'true'
    const [tab, setTab] = useState('Overview')
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchAll = useCallback(async () => {
        try {
            const [rnd, mdl, vers] = await Promise.all([
                fetch(`${API}/current-round`).then(r => r.json()),
                fetch(`${API}/latest-model`).then(r => r.json()),
                fetch(`${API}/model-versions`).then(r => r.json()),
            ])
            const cr = rnd.currentRound ?? 0
            let clientCount = 0
            try { const cu = await fetch(`${API}/client-updates/${cr}`).then(r => r.json()); clientCount = cu.total || 0 } catch (_) { }
            setData({ round: cr, latestCid: mdl.cid, latestGateway: mdl.gateway, totalVersions: (vers.versions || []).length, versions: vers.versions || [], clientCount })
        } catch (_) { } finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchAll(); const id = setInterval(fetchAll, 30000); return () => clearInterval(id) }, [fetchAll])

    const logout = () => { localStorage.clear(); navigate('/login') }

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
            <Navbar tab={tab} setTab={setTab} account={account} isOwner={isOwner} onLogout={logout} />
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
                {tab === 'Overview' && <OverviewTab data={data} loading={loading} onRefresh={fetchAll} setTab={setTab} />}
                {tab === 'Upload' && <UploadTab onSuccess={fetchAll} />}
                {tab === 'History' && <HistoryTab />}
                {tab === 'Clients' && <ClientsTab currentRound={data?.round || 0} />}
                {tab === 'Nodes' && isOwner && <NodesTab />}
            </div>
        </div>
    )
}
