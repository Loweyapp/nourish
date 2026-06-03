// Implemented in chunk 11
export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        <div style={{ color: '#767676', marginBottom: 16 }}>Settings — migration in progress</div>
        <button onClick={onClose} style={{ padding: '10px 20px', background: '#9ebd6e', color: '#fff', border: 'none', borderRadius: 12, fontFamily: 'inherit' }}>Close</button>
      </div>
    </div>
  )
}
