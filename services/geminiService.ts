import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { REHAN_SCHOOL_SYSTEM_INSTRUCTION } from '../constants';
import { createPcmBlob, decodeAudioData } from './audioUtils';

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private outputNode: GainNode | null = null;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private nextStartTime: number = 0;
  private onCloseCallback: () => void = () => {};
  private onVolumeChange: (inputVol: number, outputVol: number) => void = () => {};
  private isMuted: boolean = false;
  
  // Analysers for visualization
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;

  constructor() {
    // Assuming process.env.API_KEY is available
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public setVolumeCallback(cb: (inputVol: number, outputVol: number) => void) {
    this.onVolumeChange = cb;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public async connect(onClose: () => void, onError: (e: Error) => void) {
    this.onCloseCallback = onClose;

    try {
      // 1. Setup Audio Contexts
      // Input: 16kHz required by Gemini Live
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      // Output: 24kHz recommended for Gemini Live
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // 2. Setup Analysers
      this.inputAnalyser = this.inputAudioContext.createAnalyser();
      this.outputAnalyser = this.outputAudioContext.createAnalyser();
      this.inputAnalyser.fftSize = 256;
      this.outputAnalyser.fftSize = 256;

      // 3. Setup Audio Output Node
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);
      this.outputNode.connect(this.outputAnalyser); // Connect output to analyser

      // 4. Get User Media
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 5. Connect to Gemini Live
      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }, // 'Puck' is generally helpful/friendly
          },
          systemInstruction: REHAN_SCHOOL_SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Session Opened');
            this.startAudioInput(sessionPromise);
            this.startVolumeMonitoring();
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && this.outputAudioContext && this.outputNode) {
              await this.playAudioChunk(base64Audio);
            }

            // Handle Interruptions
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              this.stopAllAudio();
            }
          },
          onclose: (e) => {
            console.log('Session closed', e);
            this.cleanup();
            onClose();
          },
          onerror: (e) => {
            console.error('Session error', e);
            onError(new Error("Connection error occurred."));
            this.cleanup();
          }
        }
      });

    } catch (error: any) {
      console.error("Failed to connect:", error);
      onError(error);
      this.cleanup();
    }
  }

  private startAudioInput(sessionPromise: Promise<any>) {
    if (!this.inputAudioContext || !this.mediaStream) return;

    this.source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    this.source.connect(this.inputAnalyser!); // Connect input to analyser

    // Use ScriptProcessor for raw PCM access (bufferSize: 4096, in: 1, out: 1)
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Apply Mute Logic: If muted, send silence (zeros)
      if (this.isMuted) {
          for (let i = 0; i < inputData.length; i++) {
              inputData[i] = 0;
          }
      }

      const pcmBlob = createPcmBlob(inputData);
      
      sessionPromise.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.source.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async playAudioChunk(base64Audio: string) {
    if (!this.outputAudioContext || !this.outputNode) return;

    // Determine start time to prevent gaps
    this.nextStartTime = Math.max(this.outputAudioContext.currentTime, this.nextStartTime);

    const audioBuffer = await decodeAudioData(
      base64Audio,
      this.outputAudioContext,
      24000,
      1
    );

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputNode);

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    
    this.activeSources.add(source);
    
    source.onended = () => {
      this.activeSources.delete(source);
    };
  }

  private stopAllAudio() {
    this.activeSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors if source already stopped
      }
    });
    this.activeSources.clear();
    this.nextStartTime = 0; // Reset timing
    if (this.outputAudioContext) {
        // Reset timing baseline
        this.nextStartTime = this.outputAudioContext.currentTime;
    }
  }

  private startVolumeMonitoring() {
    const updateVolume = () => {
      if (!this.inputAnalyser || !this.outputAnalyser) return;

      const inputData = new Uint8Array(this.inputAnalyser.frequencyBinCount);
      const outputData = new Uint8Array(this.outputAnalyser.frequencyBinCount);

      this.inputAnalyser.getByteFrequencyData(inputData);
      this.outputAnalyser.getByteFrequencyData(outputData);

      const getInputAvg = () => inputData.reduce((a, b) => a + b, 0) / inputData.length;
      const getOutputAvg = () => outputData.reduce((a, b) => a + b, 0) / outputData.length;

      this.onVolumeChange(getInputAvg(), getOutputAvg());
      
      // Continue loop if context exists
      if (this.inputAudioContext && this.inputAudioContext.state !== 'closed') {
        requestAnimationFrame(updateVolume);
      }
    };
    updateVolume();
  }

  public disconnect() {
    this.cleanup();
    this.onCloseCallback();
  }

  private cleanup() {
    this.isMuted = false;
    
    // Stop tracks
    if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
    }
    
    // Disconnect audio nodes
    if (this.source) {
        this.source.disconnect();
        this.source = null;
    }
    if (this.processor) {
        this.processor.disconnect();
        this.processor.onaudioprocess = null;
        this.processor = null;
    }
    
    // Stop active audio
    this.stopAllAudio();
    
    // Close contexts
    if (this.inputAudioContext) {
        this.inputAudioContext.close();
        this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
        this.outputAudioContext.close();
        this.outputAudioContext = null;
    }
  }
}