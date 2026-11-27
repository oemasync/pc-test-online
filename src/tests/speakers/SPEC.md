# Speakers Test Module

## What it measures
Whether the PC's audio output path works for left, right and both channels, the listener's audible frequency range, and basic polarity. It exercises the browser's Web Audio output and (optionally) output-device routing.

## Safety
- All output gain is capped at `MAX_OUTPUT_GAIN` (0.25 linear, ~-12 dBFS). Every gain path, including the tone generator and envelopes, is clamped to this ceiling.
- Default tone volume is low (`DEFAULT_TONE_VOLUME` = 0.1).
- A "lower your volume" notice is shown before any tone plays (sweeps and pure tones can damage tweeters/hearing).

## Browser APIs (MDN-accurate)
- `AudioContext`
- `AudioContext.setSinkId` (experimental, Chromium-based)
- `OscillatorNode` (type, frequency, start, stop)
- `GainNode` (gain, `setValueAtTime`, `linearRampToValueAtTime`, `setTargetAtTime`)
- `StereoPannerNode` (pan)
- `HTMLMediaElement.setSinkId` (alternative output routing)
- `navigator.mediaDevices.enumerateDevices` (audiooutput kind)
- `MediaDeviceInfo` (deviceId, label, kind)

## Browser support caveats
- `AudioContext.setSinkId` is supported mainly in Chromium-based browsers; Firefox/Safari lack it. Module feature-detects via `'setSinkId' in AudioContext.prototype` / `'setSinkId' in HTMLMediaElement.prototype` and shows a clear "output device selection unavailable" message instead of failing.
- `HTMLMediaElement.setSinkId` is an alternative when AudioContext routing is unavailable.
- Autoplay policy requires the AudioContext to be created/resumed inside a user gesture.
- Device labels may be empty until permission is granted.

## UX flow
1. Check `isSupported` (AudioContext available).
2. Enumerate audiooutput devices; user can select output device.
3. Left / Right / Both buttons play a short synthesized scale through the selected channel via StereoPannerNode.
4. Tone generator: user sets frequency and volume (default low), plays a sustained tone.
5. Logarithmic sweep 20 Hz -> 20 kHz (rising) and optionally falling for the high end: user marks the low and high frequencies where they stop hearing; reaction time (~250 ms, `SWEEP_REACTION_TIME_S`) is compensated; audible range is recorded.
6. Short pleasant chord (synthesized, no audio files).
7. Phase/polarity check: same mono signal to both channels, then right channel inverted. In-phase sounds centred and full; inverted sounds diffuse with weak bass.
8. Pass/Fail/Skip via TestLayout with recorded details.

## Pass/Fail meaning
- Pass: user confirms left, right and both channels audible and sweep range recorded.
- Fail: a channel is inaudible or polarity issue detected.
- Skip: unsupported device or user choice.

## details keys recorded
- `leftChannelPlayed` (boolean)
- `rightChannelPlayed` (boolean)
- `bothChannelsPlayed` (boolean)
- `toneFrequencyHz` (number)
- `toneVolume` (number)
- `sweepLowHz` (number)
- `sweepHighHz` (number)
- `audibleRangeOctaves` (number)
- `chordPlayed` (boolean)
- `phaseCheckPlayed` (boolean)
- `sinkIdSupported` (boolean)
- `outputDeviceId` (string)
