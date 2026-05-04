import { useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { KeyboardControls } from "@react-three/drei";
import Scene from "./Scene";
import HUD from "./HUD";
import StartScreen from "./StartScreen";
import GameOverScreen from "./GameOverScreen";

enum Controls {
  forward = "forward",
  back = "back",
  left = "left",
  right = "right",
}

const keyMap = [
  { name: Controls.forward, keys: ["ArrowUp", "KeyW"] },
  { name: Controls.back, keys: ["ArrowDown", "KeyS"] },
  { name: Controls.left, keys: ["ArrowLeft", "KeyA"] },
  { name: Controls.right, keys: ["ArrowRight", "KeyD"] },
];

export type GameState = "start" | "playing" | "gameover";

export default function Game() {
  const [gameState, setGameState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [wave, setWave] = useState(1);
  const [gameKey, setGameKey] = useState(0);

  const handleStart = useCallback(() => {
    setScore(0);
    setHealth(100);
    setWave(1);
    setGameKey((k) => k + 1);
    setGameState("playing");
  }, []);

  const handleGameOver = useCallback(() => {
    setGameState("gameover");
  }, []);

  const handleScore = useCallback((pts: number) => {
    setScore((s) => s + pts);
  }, []);

  const handleHealth = useCallback((hp: number) => {
    setHealth((h) => {
      const next = Math.max(0, h + hp);
      if (next <= 0) handleGameOver();
      return next;
    });
  }, [handleGameOver]);

  const handleWave = useCallback((w: number) => {
    setWave(w);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#000" }}>
      {gameState === "start" && <StartScreen onStart={handleStart} />}
      {gameState === "gameover" && (
        <GameOverScreen score={score} wave={wave} onRestart={handleStart} />
      )}
      {gameState === "playing" && (
        <>
          <KeyboardControls map={keyMap}>
            <Canvas
              key={gameKey}
              shadows
              camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 8, 0] }}
              style={{ width: "100%", height: "100%" }}
            >
              <Scene
                onScore={handleScore}
                onHealth={handleHealth}
                onWave={handleWave}
                currentWave={wave}
              />
            </Canvas>
          </KeyboardControls>
          <HUD health={health} score={score} wave={wave} />
        </>
      )}
    </div>
  );
}
