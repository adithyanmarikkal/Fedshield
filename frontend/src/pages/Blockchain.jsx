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

/* ── Navbar ──────────────────────────────────────────────────── */
function Navbar({ tab, setTab, account, isOwner, onLogout }) {
    const tabs = ['Overview', 'Upload', 'History', 'Clients', ...(isOwner ? ['Nodes'] : [])]
    return (
        <nav style={{
            position: 'sticky', top: 0, zIndex: 50,
            backdropFilter: 'blur(22px) saturate(190%)',
            WebkitBackdropFilter: 'blur(22px) saturate(190%)',
            background: 'rgba(6,10,18,0.82)',
            borderBottom: '1px solid var(--border)',
        }}>
            <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 1.5rem', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 900, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap' }}>
                        ⬡ FedShield
                    </span>
                    <div className="tab-bar">
                        {tabs.map(t => (
                            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexShrink: 0 }}>
                    {isOwner && <span className="badge badge-accent">👑 Owner</span>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.35rem 0.75rem' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                        <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: 'var(--text-2)' }}>{short(account)}</span>
                    </div>
                    <button className="btn btn-ghost" onClick={onLogout} style={{ padding: '0.38rem 0.85rem', fontSize: '0.76rem' }}>Disconnect</button>
                </div>
            </div>
        </nav>
    )
}

/* ── Step progress bar ───────────────────────────────────────── */
function StepBar({ step }) {
    const steps = [
        { id: 0, icon: '📁', label: 'Select File' },
        { id: 1, icon: '☁️', label: 'IPFS Upload' },
        { id: 2, icon: '🔗', label: 'On-chain Tx' },
        { id: 3, icon: '✅', label: 'Complete' },
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
                                {active && step < 3 ? <div className="spinner" style={{ width: 18, height: 18 }} /> : s.icon}
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

/* ══ TAB: OVERVIEW ══════════════════════════════════════════════ */
function OverviewTab({ data, loading, onRefresh, setTab }) {
    return (
        <div>
            <div className="fade-up" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ marginBottom: 5 }}>
                        Blockchain{' '}
                        <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Dashboard</span>
                    </h1>
                    <p style={{ margin: 0, fontSize: '0.86rem' }}>FedShield · Polygon Amoy Testnet</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="pulse-dot" />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>Live · auto-refresh 30s</span>
                    </div>
                    <button className="btn btn-ghost" onClick={onRefresh} style={{ padding: '0.4rem 0.9rem', fontSize: '0.76rem' }}>↻ Refresh</button>
                </div>
            </div>

            {loading && !data ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" style={{ width: 30, height: 30 }} /></div>
            ) : data ? (
                <>
                    {/* Stat cards */}
                    <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        {[
                            { icon: '🔄', label: 'Current Round', value: data.round, color: '#6366f1' },
                            { icon: '📦', label: 'Model Versions', value: data.totalVersions, color: '#8b5cf6', click: () => setTab('History') },
                            { icon: '👥', label: 'Clients This Round', value: data.clientCount ?? '—', color: '#0ea5e9', click: () => setTab('Clients') },
                            { icon: '🔒', label: 'Latest CID', value: short(data.latestCid), sub: data.latestCid, color: '#22c55e' },
                        ].map(({ icon, label, value, sub, color, click }, i) => (
                            <div key={label} className="glass glass-hover fade-up" onClick={click}
                                style={{ padding: '1.35rem', display: 'flex', gap: '0.9rem', alignItems: 'flex-start', cursor: click ? 'pointer' : 'default', animationDelay: `${i * 0.07}s` }}>
                                <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: `${color}1a`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{icon}</div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
                                    {sub && <div style={{ fontSize: '0.68rem', color: 'var(--text-2)', marginTop: 3, fontFamily: 'monospace', wordBreak: 'break-all' }}>{sub}</div>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Latest model banner */}
                    {data.latestCid && (
                        <div className="glass fade-up" style={{ padding: '1.3rem 1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg,rgba(99,102,241,0.09),rgba(139,92,246,0.06))', borderColor: 'rgba(99,102,241,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', animationDelay: '0.3s' }}>
                            <div>
                                <div style={{ fontSize: '0.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--accent)', marginBottom: 5 }}>🌐 Latest Global Model</div>
                                <code style={{ fontSize: '0.8rem', background: 'none', padding: 0, wordBreak: 'break-all' }}>{data.latestCid}</code>
                            </div>
                            <div style={{ display: 'flex', gap: '0.6rem' }}>
                                <a href={`https://gateway.pinata.cloud/ipfs/${data.latestCid}`} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '0.4rem 0.88rem', fontSize: '0.76rem' }}>☁️ IPFS</a>
                                <button className="btn btn-primary" onClick={() => setTab('Upload')} style={{ padding: '0.4rem 0.88rem', fontSize: '0.76rem' }}>🚀 Upload New</button>
                            </div>
                        </div>
                    )}

                    {/* Recent history */}
                    {data.versions?.length > 0 && (
                        <div className="glass fade-up" style={{ overflow: 'hidden', animationDelay: '0.35s' }}>
                            <div style={{ padding: '0.9rem 1.3rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: '0.92rem' }}>📋 Recent Global Models</h3>
                                <button className="btn btn-ghost" onClick={() => setTab('History')} style={{ padding: '0.32rem 0.7rem', fontSize: '0.73rem' }}>View all →</button>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table>
                                    <thead><tr><th>Version</th><th>Round</th><th>IPFS CID</th><th>Recorded</th><th>By</th></tr></thead>
                                    <tbody>
                                        {data.versions.slice(-5).reverse().map((v, i) => (
                                            <tr key={i}>
                                                <td><span className="badge badge-accent">v{v.version}</span></td>
                                                <td style={{ color: 'var(--text-2)' }}>{v.round}</td>
                                                <td><a href={v.gateway} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.76rem' }}>{short(v.ipfsCID)}</a></td>
                                                <td style={{ color: 'var(--text-2)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{ago(v.timestamp)}</td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-3)' }}>{short(v.recordedBy)}</td>
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
                    <p style={{ marginBottom: '1rem' }}>⚠️ Could not reach blockchain server on port 4000.</p>
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

    return (
        <div>
            <div className="fade-up" style={{ marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: 5 }}>Upload &amp; Register</h1>
                <p style={{ margin: 0, fontSize: '0.86rem' }}>Pin a model file to IPFS and record the CID on-chain in one step</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                <div className="glass fade-up" style={{ padding: '2rem' }}>
                    <StepBar step={step} />

                    {/* Drop zone */}
                    <div
                        onClick={() => step === 0 && fileRef.current.click()}
                        onDragOver={e => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        style={{
                            border: `2px dashed ${dragging ? 'var(--accent)' : file ? 'rgba(34,197,94,0.5)' : 'var(--border)'}`,
                            borderRadius: 'var(--r-md)', padding: '2.5rem 1.5rem', textAlign: 'center',
                            cursor: step === 0 ? 'pointer' : 'default',
                            background: dragging ? 'rgba(99,102,241,0.07)' : file ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
                            transition: 'all 0.22s', boxShadow: dragging ? '0 0 32px rgba(99,102,241,0.18)' : 'none',
                        }}>
                        <input ref={fileRef} type="file" accept=".json" hidden onChange={e => pickFile(e.target.files[0])} />
                        {file ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '2.8rem' }}>📄</span>
                                <span style={{ fontWeight: 700 }}>{file.name}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{(file.size / 1024).toFixed(1)} KB</span>
                                {step === 0 && <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setFile(null) }} style={{ padding: '0.28rem 0.75rem', fontSize: '0.73rem' }}>✕ Remove</button>}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '3rem', transition: 'filter 0.2s', filter: dragging ? 'drop-shadow(0 0 14px #6366f1)' : 'none' }}>☁️</span>
                                <p style={{ fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Drag & drop your JSON model</p>
                                <p style={{ fontSize: '0.8rem', margin: 0 }}>or <span style={{ color: 'var(--accent)', fontWeight: 600 }}>click to browse</span></p>
                            </div>
                        )}
                    </div>

                    {error && <div className="alert-error fade-in" style={{ marginTop: '1rem' }}>⚠️ {error}</div>}

                    <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.7rem' }}>
                        <button className="btn btn-primary" onClick={submit} disabled={!file || (step > 0 && step < 3)}
                            style={{ flex: 1, justifyContent: 'center' }}>
                            {step === 1 ? <><div className="spinner" style={{ width: 15, height: 15 }} /> Uploading…</>
                                : step === 2 ? <><div className="spinner" style={{ width: 15, height: 15 }} /> Submitting tx…</>
                                    : step === 3 ? '✅ Upload another'
                                        : '🚀 Upload & Register'}
                        </button>
                        {(step === 3 || error) && <button className="btn btn-ghost" onClick={() => { setFile(null); setStep(0); setResult(null); setError('') }}>↺</button>}
                    </div>
                </div>

                {/* Result / how-it-works */}
                <div className="fade-up" style={{ animationDelay: '0.1s' }}>
                    {result ? (
                        <div className="glass" style={{ padding: '1.6rem', borderColor: 'rgba(34,197,94,0.28)', boxShadow: '0 0 30px rgba(34,197,94,0.07)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.2rem' }}>
                                <span style={{ fontSize: '1.6rem' }}>🎉</span>
                                <div>
                                    <h3 style={{ color: 'var(--success)', marginBottom: 2 }}>Successfully Registered</h3>
                                    <span style={{ fontSize: '0.74rem', color: 'var(--text-2)' }}>Pinned on IPFS · Stored on Polygon Amoy</span>
                                </div>
                            </div>
                            {[['IPFS CID', result.cid, result.gateway], ['Transaction', result.txHash, result.explorer], ['Block', `#${result.blockNumber}`, null]].map(([label, val, link]) => (
                                <div key={label} style={{ padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
                                    {link ? <a href={link} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.77rem', wordBreak: 'break-all' }}>{val}</a>
                                        : <span style={{ fontFamily: 'monospace', fontSize: '0.77rem', wordBreak: 'break-all' }}>{val}</span>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass" style={{ padding: '1.6rem' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '0.93rem' }}>ℹ️ How it works</h3>
                            {[
                                ['1', '📤 IPFS Upload', 'Your .json file is pinned permanently via Pinata'],
                                ['2', '🔗 On-chain Register', 'The CID is stored in FedShieldCoordinator as a new version'],
                                ['3', '📋 Immutable History', 'Every version is queryable on Polygon Amoy forever'],
                            ].map(([n, title, desc]) => (
                                <div key={n} style={{ display: 'flex', gap: '0.85rem', marginBottom: '0.9rem' }}>
                                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{n}</div>
                                    <div><div style={{ fontSize: '0.83rem', fontWeight: 600, marginBottom: 2 }}>{title}</div><div style={{ fontSize: '0.76rem', color: 'var(--text-2)' }}>{desc}</div></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ══ TAB: HISTORY ═══════════════════════════════════════════════ */
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
            <div className="fade-up" style={{ marginBottom: '1.8rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ marginBottom: 4 }}>Model History</h1>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>{versions.length} version{versions.length !== 1 ? 's' : ''} recorded on-chain</p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <input type="text" placeholder="Search CID, address, version…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 260, fontSize: '0.82rem', padding: '0.45rem 0.9rem' }} />
                    <button className="btn btn-ghost" onClick={load} style={{ padding: '0.45rem 0.85rem', fontSize: '0.76rem' }}>↻</button>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
            ) : filtered.length === 0 ? (
                <div className="glass fade-up" style={{ padding: '3rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-2)' }}>{search ? 'No matching versions.' : 'No model versions recorded yet.'}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filtered.map((v, i) => (
                        <div key={i} className="glass glass-hover fade-up" style={{ padding: '1.1rem 1.4rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', animationDelay: `${Math.min(i, 6) * 0.05}s` }}>
                            <div style={{ width: 50, height: 50, borderRadius: 13, flexShrink: 0, background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.28)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>ver</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{v.version}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                                    <span className="badge badge-accent" style={{ fontSize: '0.63rem' }}>Round {v.round}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>{new Date(v.timestamp * 1000).toLocaleString()}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>· {ago(v.timestamp)}</span>
                                </div>
                                <a href={v.gateway} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.77rem', wordBreak: 'break-all' }}>{v.ipfsCID}</a>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 3, fontFamily: 'monospace' }}>By: {v.recordedBy}</div>
                            </div>
                            <a href={v.gateway} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '0.35rem 0.75rem', fontSize: '0.73rem', flexShrink: 0 }}>☁️ IPFS</a>
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
            <div className="fade-up" style={{ marginBottom: '1.8rem' }}>
                <h1 style={{ marginBottom: 4 }}>Client Updates</h1>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Browse local model submissions from federated nodes per round</p>
            </div>

            {/* Round picker */}
            <div className="glass fade-up" style={{ padding: '1.1rem 1.3rem', marginBottom: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => fetchRound(Math.max(1, roundNum - 1))} disabled={loading || roundNum <= 1} style={{ padding: '0.42rem 0.75rem', fontSize: '0.85rem' }}>‹</button>
                <input type="number" min="1" placeholder="Round" value={round} onChange={e => setRound(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchRound()} style={{ maxWidth: 100, textAlign: 'center', padding: '0.42rem 0.6rem', fontSize: '0.85rem' }} />
                <button className="btn btn-ghost" onClick={() => fetchRound(roundNum + 1)} disabled={loading} style={{ padding: '0.42rem 0.75rem', fontSize: '0.85rem' }}>›</button>
                <button className="btn btn-primary" onClick={() => fetchRound()} disabled={loading} style={{ padding: '0.42rem 1rem', fontSize: '0.8rem' }}>
                    {loading ? <><div className="spinner" style={{ width: 13, height: 13 }} /> Loading…</> : '→ Fetch'}
                </button>
                {currentRound > 0 && (
                    <button className="btn btn-ghost" onClick={() => fetchRound(currentRound)} disabled={loading} style={{ padding: '0.42rem 0.85rem', fontSize: '0.76rem' }}>
                        Jump to current (#{currentRound})
                    </button>
                )}
                {err && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>⚠️ {err}</span>}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
            ) : updates ? (
                <div className="fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.93rem' }}>Round {updates.round}</h3>
                        <span className={`badge ${updates.total > 0 ? 'badge-success' : 'badge-warning'}`}>{updates.total} update{updates.total !== 1 ? 's' : ''}</span>
                    </div>
                    {updates.total === 0 ? (
                        <div className="glass" style={{ padding: '2.5rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-2)' }}>No client updates for round {updates.round}.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {updates.updates.map((u, i) => (
                                <div key={i} className="glass glass-hover fade-up" style={{ padding: '1rem 1.3rem', animationDelay: `${i * 0.05}s` }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem', flexWrap: 'wrap' }}>
                                        <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>👤</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                                <code style={{ fontSize: '0.77rem', color: '#0ea5e9', background: 'none', padding: 0 }}>{u.nodeAddress}</code>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{ago(u.timestamp)}</span>
                                            </div>
                                            <div style={{ marginBottom: u.metadata ? 4 : 0 }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>CID: </span>
                                                <a href={u.gateway} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{u.ipfsCID}</a>
                                            </div>
                                            {u.metadata && <div style={{ fontSize: '0.74rem', fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.28rem 0.6rem', display: 'inline-block', color: 'var(--text-2)' }}>{u.metadata}</div>}
                                        </div>
                                        <a href={u.gateway} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '0.32rem 0.7rem', fontSize: '0.72rem', flexShrink: 0 }}>☁️</a>
                                    </div>
                                </div>
                            ))}
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
            <div className="fade-up" style={{ marginBottom: '1.8rem', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>👑</div>
                <div>
                    <h1 style={{ marginBottom: 3 }}>Node Management</h1>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Authorize nodes to submit local model updates</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                <div className="glass fade-up" style={{ padding: '1.8rem' }}>
                    <h3 style={{ fontSize: '0.92rem', marginBottom: '1.3rem', display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ color: 'var(--success)' }}>✅</span> Authorize Node</h3>
                    <label style={{ fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', display: 'block', marginBottom: 7 }}>Node Ethereum Address</label>
                    <input type="text" placeholder="0x0000…0000" value={address} onChange={e => { setAddress(e.target.value); setError(''); setResult(null) }} onKeyDown={e => e.key === 'Enter' && submit()} style={{ marginBottom: '1rem', fontFamily: 'monospace', fontSize: '0.82rem' }} />
                    {error && <div className="alert-error fade-in" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}
                    <button className="btn btn-primary" onClick={submit} disabled={loading || !address} style={{ width: '100%', justifyContent: 'center' }}>
                        {loading ? <><div className="spinner" style={{ width: 15, height: 15 }} /> Sending tx…</> : '🔐 Authorize Node'}
                    </button>
                    <p style={{ fontSize: '0.73rem', color: 'var(--text-3)', marginTop: '1rem', textAlign: 'center' }}>Only the contract owner can authorize nodes</p>
                </div>

                <div className="fade-up" style={{ animationDelay: '0.1s' }}>
                    {result ? (
                        <div className="glass" style={{ padding: '1.5rem', borderColor: 'rgba(34,197,94,0.28)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.2rem' }}>
                                <span style={{ fontSize: '1.5rem' }}>✅</span>
                                <div><h3 style={{ color: 'var(--success)', marginBottom: 2 }}>Node Authorized</h3><span style={{ fontSize: '0.73rem', color: 'var(--text-2)' }}>Confirmed on Polygon Amoy</span></div>
                            </div>
                            {[['Address', result.address, null], ['Transaction', result.txHash, result.explorer], ['Block', `#${result.blockNumber}`, null]].map(([label, val, link]) => (
                                <div key={label} style={{ padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
                                    {link ? <a href={link} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.76rem', wordBreak: 'break-all' }}>{val}</a>
                                        : <span style={{ fontFamily: 'monospace', fontSize: '0.76rem', wordBreak: 'break-all' }}>{val}</span>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '0.92rem', marginBottom: '0.9rem' }}>ℹ️ About Authorization</h3>
                            {[
                                ['🔐', 'Access Control', 'Only authorized nodes can submit local updates'],
                                ['⛓️', 'On-chain', '`addNode(address)` recorded on Polygon Amoy'],
                                ['🧑‍💼', 'Owner Only', 'Only the deployer wallet can authorize nodes'],
                                ['📡', 'Federated', 'Authorized nodes join the training rounds'],
                            ].map(([icon, title, desc]) => (
                                <div key={title} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.8rem' }}>
                                    <span style={{ fontSize: '0.95rem', lineHeight: 1.4, flexShrink: 0 }}>{icon}</span>
                                    <div><div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 2 }}>{title}</div><div style={{ fontSize: '0.74rem', color: 'var(--text-2)' }}>{desc}</div></div>
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
            <div style={{ maxWidth: 1160, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
                {tab === 'Overview' && <OverviewTab data={data} loading={loading} onRefresh={fetchAll} setTab={setTab} />}
                {tab === 'Upload' && <UploadTab onSuccess={fetchAll} />}
                {tab === 'History' && <HistoryTab />}
                {tab === 'Clients' && <ClientsTab currentRound={data?.round || 0} />}
                {tab === 'Nodes' && isOwner && <NodesTab />}
            </div>
        </div>
    )
}
