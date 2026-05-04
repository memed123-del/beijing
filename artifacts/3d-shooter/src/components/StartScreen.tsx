interface StartScreenProps {
  onStart: () => void;
}

export default function StartScreen({ onStart }: StartScreenProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        fontFamily: "'Courier New', monospace",
        color: "#fff",
      }}
    >
      <div style={{ fontSize: 64, fontWeight: "bold", letterSpacing: 6, color: "#e74c3c", textShadow: "0 0 30px #e74c3c" }}>
        ZONE ZERO
      </div>
      <div style={{ fontSize: 16, color: "#aaa", marginTop: 8, letterSpacing: 4 }}>
        3D ARENA SHOOTER
      </div>

      <div
        style={{
          marginTop: 50,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: "24px 40px",
          textAlign: "center",
          lineHeight: 2,
          color: "#ccc",
          fontSize: 14,
        }}
      >
        <div>🎮 <strong style={{ color: "#fff" }}>WASD / Arrow Keys</strong> — Move</div>
        <div>🖱️ <strong style={{ color: "#fff" }}>Mouse</strong> — Aim</div>
        <div>🔫 <strong style={{ color: "#fff" }}>Left Click</strong> — Shoot</div>
        <div>❤️ Kill enemies before they reach you!</div>
      </div>

      <button
        onClick={onStart}
        style={{
          marginTop: 48,
          padding: "16px 56px",
          fontSize: 20,
          fontWeight: "bold",
          letterSpacing: 3,
          fontFamily: "'Courier New', monospace",
          background: "#e74c3c",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          boxShadow: "0 0 30px rgba(231,76,60,0.5)",
          transition: "transform 0.1s, box-shadow 0.1s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 50px rgba(231,76,60,0.8)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 30px rgba(231,76,60,0.5)";
        }}
      >
        START GAME
      </button>
    </div>
  );
}
