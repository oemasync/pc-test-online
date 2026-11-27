# Speakers Test Module

## What it measures
Whether the PC's audio output path works for left, right and both channels, the listener's audible frequency range, and basic polarity. It exercises the browser's Web Audio output and (optionally) output-device routing.

## Browser APIs (MDN-accurate)
- `AudioContext`
- `AudioContext.setSinkId` (experimental, Chromium-based)
- `OscillatorNode` (type, frequency, start, stop)
- `GainNode` (gain, `setValueAtTime`, `linearRampToValueAtTime`)
- `StereoPannerNode` (pan)
- `HTMLMediaElement.setSinkId` (alternative output routing)
- `navigator.mediaDevices.enumerateDevices` (audiooutput kind)
- `MediaDeviceInfo` (deviceId, label, kind)

## Browser support caveats
- `AudioContext.setSinkId` is supported mainly in Chromium-based browsers; Firefox/Safari lack it. Module feature-detects and shows a clear "output device selection unavailable" message instead of failing.
- `HTMLMediaElement.setSinkId` is an alternative when AudioContext routing is unavailable.
- Autoplay policy requires the AudioContext to be created/resumed inside a user gesture.
- Device labels may be empty until permission is granted (audiooutput usually needs no permission, but labels can still be blank).

## UX flow
1. Check `isSupported` (AudioContext available).
2. Enumerate audiooutput devices; user can select output device.
3. Left / Right / Both buttons play a short synthesized scale through the selected channel via StereoPannerNode.
4. Tone generator: user sets frequency and volume, plays a sustained tone.
5. Logarithmic sweep 20 Hz -> 20 kHz: user marks the low and high frequencies where they stop hearing; audible range is recorded.
6. Short pleasant chord (synthesized, no audio files).
7. Phase/polarity check: plays in-phase then inverted stereo.
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
