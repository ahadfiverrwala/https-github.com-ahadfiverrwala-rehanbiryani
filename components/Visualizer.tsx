import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  inputVolume: number;
  outputVolume: number;
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ inputVolume, outputVolume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const centerY = rect.height / 2;
    // We will use 5 bars
    const barCount = 5;
    const barWidth = 6 * dpr; // Slightly thinner for elegance
    const maxBarHeight = 100 * dpr;
    const spacing = 16 * dpr;
    
    const totalWidth = (barCount * barWidth) + ((barCount - 1) * spacing);
    const startX = (rect.width - totalWidth) / 2 + (barWidth / 2);

    const render = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      const time = Date.now() / 200; // Slower time for elegance
      
      const micLevel = Math.max(0, inputVolume);
      const aiLevel = Math.max(0, outputVolume);
      
      const isAiSpeaking = aiLevel > (micLevel + 5); 
      const totalVol = Math.max(micLevel, aiLevel);
      
      // Gradients
      let colorStart, colorEnd;

      if (!isActive) {
        colorStart = "rgb(226, 232, 240)"; // slate-200
        colorEnd = "rgb(203, 213, 225)";   // slate-300
      } else if (isAiSpeaking) {
        // Emerald/Teal
        colorStart = "rgb(52, 211, 153)"; 
        colorEnd = "rgb(16, 185, 129)";   
      } else {
        // Blue/Indigo
        colorStart = "rgb(96, 165, 250)"; 
        colorEnd = "rgb(59, 130, 246)";   
      }

      ctx.lineCap = 'round';
      ctx.lineWidth = barWidth;

      for (let i = 0; i < barCount; i++) {
        const phase = i * 0.5;
        let height = 0;

        if (!isActive) {
            // Idle: Gentle breathing
            height = 8 + Math.sin(time + phase) * 3;
        } else {
            // Active
            const intensity = i === 2 ? 1.2 : (i === 1 || i === 3 ? 0.9 : 0.6);
            const noise = Math.sin(time * 2 + phase) * 5; 
            const volumeEffect = (totalVol * 3.0) * intensity;
            
            height = 16 + Math.max(0, volumeEffect + noise);
            height = Math.min(height, maxBarHeight);
        }

        const x = startX + (i * spacing);
        
        const gradient = ctx.createLinearGradient(0, centerY - height/2, 0, centerY + height/2);
        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(1, colorEnd);
        ctx.strokeStyle = gradient;

        // Subtle glow
        if (isActive && totalVol > 5) {
             ctx.shadowBlur = 12;
             ctx.shadowColor = isAiSpeaking ? "rgba(16, 185, 129, 0.2)" : "rgba(59, 130, 246, 0.2)";
        } else {
             ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.moveTo(x, centerY - height / 2);
        ctx.lineTo(x, centerY + height / 2);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [inputVolume, outputVolume, isActive]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
};

export default Visualizer;