interface HUDProps {
  health: number;
  score: number;
  wave: number;
}

export default function HUD({ health, score, wave }: HUDProps) {
  const healthColor = health > 60 ? "#2ecc71" : health > 30 ? "#f39c12" : "#e74c3c";

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          background: "rgba(0,0,0,0.7)",
          border: "1px solid #2ecc71",
          borderRadius: 8,
          padding: "12px 20px",
          color: "#fff",
          fontFamily: "'Courier New', monospace",
        }}
      >
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>HEALTH</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 120,
              height: 12,
              background: "#333",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${health}%`,
                height: "100%",
                background: healthColor,
                transition: "width 0.2s, background 0.3s",
              }}
            />
          </div>
          <span style={{ fontSize: 14, color: healthColor, fontWeight: "bold" }}>{health}</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: "rgba(0,0,0,0.7)",
          border: "1px solid #3498db",
          borderRadius: 8,
          padding: "12px 20px",
          color: "#fff",
          textAlign: "right",
          fontFamily: "'Courier New', monospace",
        }}
      >
        <div style={{ fontSize: 12, color: "#aaa" }}>SCORE</div>
        <div style={{ fontSize: 28, fontWeight: "bold", color: "#3498db" }}>{score}</div>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
          WAVE <span style={{ color: "#e67e22", fontWeight: "bold" }}>{wave}</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            border: "2px solid rgba(255,255,255,0.8)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 3, height: 3, background: "#fff", borderRadius: "50%" }} />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.4)",
          fontSize: 11,
          fontFamily: "'Courier New', monospace",
          textAlign: "center",
          letterSpacing: 1,
        }}
      >
        WASD / ARROWS = MOVE &nbsp;|&nbsp; MOUSE = AIM &nbsp;|&nbsp; CLICK = SHOOT
      </div>
    </div>
  );
}
