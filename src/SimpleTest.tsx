/**
 * 简单测试页面
 */

export default function SimpleTest() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#020617', color: 'white', padding: '20px' }}>
      <h1 style={{ color: '#34d399', fontSize: '24px', marginBottom: '20px' }}>简单测试页面</h1>
      <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', marginBottom: '20px' }}>
        <p style={{ color: '#fbbf24' }}>这是黄色文字</p>
      </div>
      <div style={{ padding: '20px', backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: '12px' }}>
        <p style={{ color: '#60a5fa' }}>这是蓝色文字</p>
      </div>
    </div>
  )
}
