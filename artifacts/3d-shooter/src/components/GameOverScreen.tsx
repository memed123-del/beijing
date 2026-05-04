interface GameOverScreenProps {
  score: number;
  wave: number;
  onRestart: () => void;
}

export default function GameOverScreen({ score, wave, onRestart }: GameOverScreenProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        fontFamily: "'Courier New', monospace",
        color: "#fff",
      }}
    >
      <div style={{ fontSize: 60, fontWeight: "bold", color: "#e74c3c", textShadow: "0 0 40px #e74c3c", letterSpacing: 4 }}>
        GAME OVER
      </div>

      <div style={{ marginTop: 40, textAlign: "center", lineHeight: 2.5 }}>
        <div style={{ fontSize: 18, color: "#aaa" }}>
          FINAL SCORE: <span style={{ fontSize: 36, color: "#3498db", fontWeight: "bold" }}>{score}</span>
        </div>
        <div style={{ fontSize: 16, color: "#aaa" }}>
          SURVIVED TO WAVE: <span style={{ color: "#e67e22", fontWeight: "bold" }}>{wave}</span>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 13, color: "#666" }}>
        {score >= 100 ? "🏆 Great shooting!" : score >= 50 ? "⚔️ Keep practicing!" : "💀 Try again!"}
      </div>

      <button
        onClick={onRestart}
        style={{
          marginTop: 48,
          padding: "14px 50px",
          fontSize: 18,
          fontWeight: "bold",
          letterSpacing: 3,
          fontFamily: "'Courier New', monospace",
          background: "#e74c3c",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          boxShadow: "0 0 30px rgba(231,76,60,0.5)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        PLAY AGAIN
      </button>
    </div>
  );
}
