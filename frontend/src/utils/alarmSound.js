let audioContext;
let oscillators = [];

export async function startAlarmLoop() {
  if (oscillators.length) {
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  audioContext = audioContext || new AudioContextClass();
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const frequencies = [440, 660];
  oscillators = frequencies.map((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = index % 2 === 0 ? "square" : "sawtooth";
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.015;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    return { oscillator, gain };
  });
}

export function stopAlarmLoop() {
  for (const entry of oscillators) {
    entry.oscillator.stop();
    entry.oscillator.disconnect();
    entry.gain.disconnect();
  }

  oscillators = [];
}
