import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:4000/api'
const short = (s = '') => s.length > 14 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s
const ago = (ts) => {
    const d = Math.floor((Date.now() - ts * 1000) / 1000)
    if (d < 60) return `${d}s ago`; if (d < 3600) return `${Math.floor(d / 60)}m ago`
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`; return new Date(ts * 1000).toLocaleDateString()
}

// ── Shared icon ──────────────────────────────────────────────────────────────
const LogoIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
)

// ── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ tab, setTab, account, onLogout }) {
    const tabs = ['Node Management', 'Verify Client Updates', 'Aggregation']
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
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginLeft: 2 }}>Admin</span>
                    </div>
                    <div className="tab-bar">
                        {tabs.map(t => (
                            <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t}</button>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span className="badge badge-warning">Admin</span>
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

// ── Node Management ──────────────────────────────────────────────────────────
function NodeManagementTab() {
    const [address, setAddress] = useState('')
    const [action, setAction] = useState('authorize')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')
    const [nodes, setNodes] = useState([])
    const [nodesLoading, setNodesLoading] = useState(true)

    const fetchNodes = useCallback(async () => {
        setNodesLoading(true)
        try {
            const res = await fetch(`${API}/authorized-nodes`)
            const data = await res.json()
            setNodes(data.nodes || [])
        } catch (_) { setNodes([]) } finally { setNodesLoading(false) }
    }, [])

    useEffect(() => { fetchNodes() }, [fetchNodes])

    const submit = async () => {
        if (!address) return setError('Address required')
        if (address.length !== 42 || !address.startsWith('0x')) return setError('Invalid Ethereum address format.')
        setError(''); setResult(null); setLoading(true)
        try {
            const endpoint = action === 'authorize' ? '/authorize-node' : '/revoke-node'
            const res = await fetch(`${API}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Request failed')
            setResult({ ...data, actionType: action })
            setAddress('')
            fetchNodes()
        } catch (e) {
            setError(e.message)
        } finally { setLoading(false) }
    }

    const isAuthorize = action === 'authorize'

    return (
        <div className="fade-up">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: '0.4rem' }}>Node Management</h1>
                <p style={{ maxWidth: 520, fontSize: '0.875rem', margin: 0 }}>
                    Only authorized addresses can record client updates on the blockchain. Add or remove nodes carefully.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Form card */}
                <div className="glass" style={{ padding: '1.75rem' }}>
                    {/* Action toggle */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '0.25rem' }}>
                        <button
                            onClick={() => setAction('authorize')}
                            style={{ flex: 1, padding: '0.45rem', borderRadius: 'calc(var(--r-sm) - 2px)', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: isAuthorize ? 'rgba(34,197,94,0.12)' : 'transparent', color: isAuthorize ? 'var(--success)' : 'var(--text-2)' }}
                        >
                            Authorize Node
                        </button>
                        <button
                            onClick={() => setAction('revoke')}
                            style={{ flex: 1, padding: '0.45rem', borderRadius: 'calc(var(--r-sm) - 2px)', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: !isAuthorize ? 'rgba(239,68,68,0.12)' : 'transparent', color: !isAuthorize ? 'var(--danger)' : 'var(--text-2)' }}
                        >
                            Revoke Node
                        </button>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Node Ethereum Address
                        </label>
                        <input
                            type="text"
                            placeholder="0x…"
                            value={address}
                            onChange={e => { setAddress(e.target.value); setError('') }}
                            style={{ fontFamily: 'monospace', fontSize: '0.84rem' }}
                        />
                    </div>

                    {error && <div className="alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}

                    <button
                        className="btn"
                        onClick={submit}
                        disabled={loading || !address}
                        style={{
                            width: '100%', justifyContent: 'center',
                            background: isAuthorize ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
                            color: isAuthorize ? 'var(--success)' : 'var(--danger)',
                            border: `1px solid ${isAuthorize ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.22)'}`,
                            fontWeight: 600,
                        }}
                    >
                        {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} />Processing…</> : isAuthorize ? 'Authorize Node' : 'Revoke Node'}
                    </button>
                </div>

                {/* Result panel */}
                <div>
                    {result && (
                        <div className="glass fade-up" style={{ padding: '1.5rem', borderColor: result.actionType === 'authorize' ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)' }}>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <h3 style={{ color: result.actionType === 'authorize' ? 'var(--success)' : 'var(--danger)', fontSize: '0.95rem', marginBottom: 4 }}>
                                    {result.actionType === 'authorize' ? 'Node Authorized' : 'Node Revoked'}
                                </h3>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-2)' }}>Transaction confirmed on Polygon Amoy</span>
                            </div>
                            {[['Target Address', short(result.address), null], ['Transaction', result.txHash, result.explorer], ['Block', `#${result.blockNumber}`, null]].map(([label, val, link]) => (
                                <div key={label} style={{ padding: '0.65rem 0', borderBottom: '1px solid var(--border)' }}>
                                    <div className="section-label" style={{ marginBottom: 4 }}>{label}</div>
                                    {link ? <a href={link} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.77rem', wordBreak: 'break-all' }}>{val}</a>
                                        : <span style={{ fontFamily: 'monospace', fontSize: '0.77rem', wordBreak: 'break-all' }}>{val}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Authorized Nodes List */}
            <div className="glass fade-up" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                        Registered Nodes
                        <span style={{ marginLeft: 8, padding: '1px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-2)' }}>{nodes.length}</span>
                    </h3>
                    <button className="btn btn-ghost" onClick={fetchNodes} style={{ padding: '0.3rem 0.65rem', fontSize: '0.74rem' }}>Refresh</button>
                </div>
                {nodesLoading ? (
                    <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" style={{ width: 22, height: 22 }} /></div>
                ) : nodes.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead><tr><th>Status</th><th>Node Address</th><th>Last Transaction</th></tr></thead>
                            <tbody>
                                {nodes.map((n, i) => (
                                    <tr key={i}>
                                        <td>
                                            {n.authorized
                                                ? <span className="badge badge-success">Active</span>
                                                : <span className="badge badge-danger">Revoked</span>}
                                        </td>
                                        <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{n.address}</span></td>
                                        <td><a href={n.explorer} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.76rem' }}>{short(n.lastTxHash)}</a></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
                        <p style={{ color: 'var(--text-3)' }}>No nodes have been registered yet.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Verify Client Updates ────────────────────────────────────────────────────
function VerifyClientUpdatesTab() {
    const [allUpdates, setAllUpdates] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchAllUpdates = useCallback(async () => {
        setLoading(true)
        try {
            const rndRes = await fetch(`${API}/current-round`).then(r => r.json())
            const cr = rndRes.currentRound ?? 0
            const promises = []
            for (let r = 0; r <= cr; r++) {
                promises.push(
                    fetch(`${API}/client-updates/${r}`)
                        .then(res => res.json())
                        .then(data => (data.updates || []).map(u => ({ ...u, round: r })))
                        .catch(() => [])
                )
            }
            const results = await Promise.all(promises)
            const flat = results.flat().sort((a, b) => b.timestamp - a.timestamp)
            setAllUpdates(flat)
        } catch (_) { setAllUpdates([]) } finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchAllUpdates() }, [fetchAllUpdates])

    return (
        <div className="fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.4rem' }}>Verify Client Updates</h1>
                    <p style={{ maxWidth: 520, fontSize: '0.875rem', margin: 0 }}>Review all local model submissions from participating nodes across all rounds.</p>
                </div>
                <button className="btn btn-ghost" onClick={fetchAllUpdates} style={{ padding: '0.38rem 0.75rem', fontSize: '0.78rem' }}>Refresh</button>
            </div>

            <div className="glass" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>
                        All Client Submissions
                        <span style={{ marginLeft: 8, padding: '1px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.07)', fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-2)' }}>{allUpdates.length}</span>
                    </h3>
                </div>
                {loading ? (
                    <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>
                ) : allUpdates.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead><tr><th>Round</th><th>Node Address</th><th>IPFS CID</th><th>Metadata</th><th>Submitted</th></tr></thead>
                            <tbody>
                                {allUpdates.map((u, i) => (
                                    <tr key={i}>
                                        <td><span className="badge badge-accent">Round {u.round}</span></td>
                                        <td><span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{u.nodeAddress}</span></td>
                                        <td><a href={u.gateway} target="_blank" rel="noreferrer" style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{short(u.ipfsCID)}</a></td>
                                        <td><span style={{ fontSize: '0.76rem', color: 'var(--text-2)' }}>{u.metadata || '—'}</span></td>
                                        <td style={{ color: 'var(--text-2)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{ago(u.timestamp)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-3)', marginBottom: 6 }}>No client updates have been submitted yet.</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Clients need to use Upload Local Model to submit updates.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Aggregation ──────────────────────────────────────────────────────────────
function AggregationTab() {
    const [running, setRunning] = useState(false)
    const [result, setResult] = useState(null)

    const handleAggregate = async () => {
        setRunning(true)
        setResult(null)
        try {
            const res = await fetch(`${API}/run-aggregation`, { method: 'POST' })
            const data = await res.json()
            setResult(data)
        } catch (e) {
            setResult({ success: false, logs: [], error: e.message })
        } finally {
            setRunning(false)
        }
    }

    return (
        <div className="fade-up">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: '0.4rem' }}>Global Model Aggregation</h1>
                <p style={{ maxWidth: 520, fontSize: '0.875rem', margin: 0 }}>
                    Trigger the FedAvg algorithm to aggregate local IPFS weights, create a new global model, and advance the blockchain round.
                </p>
            </div>

            <div className="glass" style={{ padding: '2.5rem', maxWidth: 620, margin: '0 auto' }}>
                {/* Icon */}
                <div style={{
                    width: 56, height: 56, borderRadius: 14, margin: '0 auto 1.5rem',
                    background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-2)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Run FedAvg</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', margin: 0 }}>
                        Executes <code>aggregation.py</code> — fetches client CIDs, runs FedAvg, uploads the global model to IPFS, and registers it on-chain.
                    </p>
                </div>

                {!running && !result && (
                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}
                        onClick={handleAggregate}
                    >
                        Run Aggregation
                    </button>
                )}

                {running && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem' }}>
                        <div className="spinner" style={{ width: 28, height: 28 }} />
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>Running aggregation.py — this may take a minute</span>
                    </div>
                )}

                {result && (
                    <div>
                        <div className={result.success ? 'alert-success' : 'alert-error'} style={{ marginBottom: '1rem' }}>
                            <strong>{result.success ? 'Aggregation completed successfully' : 'Aggregation failed'}</strong>
                            {result.error && <div style={{ marginTop: 4, fontSize: '0.8rem' }}>{result.error}</div>}
                        </div>

                        {result.logs && result.logs.length > 0 && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <div className="section-label" style={{ marginBottom: '0.5rem' }}>Script Output</div>
                                <pre style={{
                                    background: 'rgba(0,0,0,0.35)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--r-sm)',
                                    padding: '1rem',
                                    fontSize: '0.72rem',
                                    fontFamily: 'ui-monospace, monospace',
                                    color: 'var(--success)',
                                    maxHeight: 300,
                                    overflowY: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                }}>
                                    {result.logs.join('\n')}
                                </pre>
                            </div>
                        )}

                        <button className="btn btn-ghost" onClick={() => setResult(null)} style={{ width: '100%', justifyContent: 'center' }}>
                            Run Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function AdminHome() {
    const navigate = useNavigate()
    const account = localStorage.getItem('account') || ''
    const [tab, setTab] = useState('Node Management')

    const logout = () => { localStorage.clear(); navigate('/login') }

    return (
        <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
            <Navbar tab={tab} setTab={setTab} account={account} onLogout={logout} />
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
                {tab === 'Node Management' && <NodeManagementTab />}
                {tab === 'Verify Client Updates' && <VerifyClientUpdatesTab />}
                {tab === 'Aggregation' && <AggregationTab />}
            </div>
        </div>
    )
}
