# Synthesized sound track for the Get Into engine v2, locked to its timeline.
# Each pillar adds one sustained note when it lands, so the chord stacks up with the slabs.
# usage: python3 sound.py timeline.json out.wav [web]
#   web: the cut for the web player. It stops at the finished stack (no logo outro) and lets the chord ring out.
import json, sys, wave
import numpy as np

tl = json.load(open(sys.argv[1]))
out = sys.argv[2]
WEB = len(sys.argv) > 3 and sys.argv[3] == "web"
SR, DUR = 48000, float(tl["webDuration"] if WEB else tl["duration"])
RELEASE = 2.6 if WEB else 1.4
CHORD_END = DUR if WEB else tl["outroIn"] + 2.2
N = int(SR * DUR)
dry = np.zeros(N)
rng = np.random.default_rng(7)
NOTES = [110.0, 164.81, 261.63, 392.0, 493.88]        # A2 E3 C4 G4 B4: A minor 9, built bottom up
land, n = tl["land"], int(tl["n"])

def add(sig, t, gain=1.0):
    i = int(max(t, 0) * SR); j = min(N, i + len(sig))
    if i < N: dry[i:j] += gain * sig[: j - i]

def env(m, a=0.002, r=0.05):
    t = np.arange(m) / SR
    return np.minimum(1, t / a) * np.exp(-t / r)

def tick(pitch=2600, r=0.008):
    m = int(0.04 * SR); t = np.arange(m) / SR
    return (0.5 * rng.standard_normal(m) + np.sin(2 * np.pi * pitch * t)) * env(m, 0.0005, r)

def thump(hz):
    m = int(1.0 * SR); t = np.arange(m) / SR
    kick = np.sin(2 * np.pi * (48 * t + 95 * 0.035 * (1 - np.exp(-t / 0.035)))) * env(m, 0.001, 0.22)
    blip = (np.sin(2 * np.pi * hz * 2 * t) + 0.4 * np.sin(2 * np.pi * hz * 4 * t)) * env(m, 0.002, 0.18)
    click = rng.standard_normal(m) * env(m, 0.0003, 0.006)
    return 1.0 * kick + 0.30 * blip + 0.25 * click

def whoosh(dur, f0, f1, r=0.5):
    m = int(dur * SR); t = np.arange(m) / SR
    noise = rng.standard_normal(m)
    f = f0 * (f1 / f0) ** (t / dur)                     # sweep a resonant band through the noise
    ph = np.cumsum(2 * np.pi * f / SR)
    band = np.convolve(noise, np.ones(48) / 48, mode="same") * np.sin(ph) * 3.0
    shape = np.sin(np.pi * t / dur) ** 2
    return (band + 0.15 * noise * shape) * shape * r

def pluck(hz, r=0.5):
    m = int(1.6 * SR); t = np.arange(m) / SR
    return (np.sin(2 * np.pi * hz * t) + 0.35 * np.sin(2 * np.pi * 2 * hz * t) + 0.12 * np.sin(2 * np.pi * 3 * hz * t)) * env(m, 0.003, r)

def sustain(hz, t0, t1, gain):
    i, j = int(t0 * SR), int(min(t1, DUR) * SR)
    t = np.arange(j - i) / SR
    tone = sum(np.sin(2 * np.pi * hz * d * t + ph) for d, ph in [(1.0, 0), (1.004, 1.3), (0.996, 2.1)]) / 3
    tone += 0.22 * np.sin(2 * np.pi * 2 * hz * t)
    shape = np.minimum(1, t / 0.5) * np.minimum(1, (t[-1] - t) / RELEASE + 1e-3)
    dry[i:j] += tone * shape * gain * (1 + 0.12 * np.sin(2 * np.pi * 0.23 * t + hz))

# bed: low drone from frame 0 (the title frame is already on screen, so no hard hit)
sustain(55.0, 0.0, DUR, 0.060)
sustain(82.41, 0.0, DUR if WEB else tl["outroIn"] + 1.0, 0.022)
add(pluck(440, 0.9), 0.05, 0.10); add(pluck(659.25, 0.9), 0.18, 0.07)

# the command types itself in on the title frame, then Enter
def key(deep=False):
    m = int(0.07 * SR); t = np.arange(m) / SR
    body = np.sin(2 * np.pi * (240 if deep else 420 + 120 * rng.random()) * t) * env(m, 0.0005, 0.012)
    click = rng.standard_normal(m) * env(m, 0.0003, 0.004 if not deep else 0.007)
    return 0.7 * body + (0.55 + 0.25 * rng.random()) * click
for k, ch in enumerate(tl["cmd"]):
    add(key(), tl["typeStart"] + k / tl["typeCps"] + 0.012 * rng.standard_normal(), 0.11 if ch == " " else 0.17)
add(key(deep=True), tl["typeEnd"] + 0.16, 0.30)

# title -> stage: slabs lift off
add(whoosh(0.85, 300, 2400), tl["titleHold"] - 0.05, 0.22)

for i in range(n):
    L = land[i]
    add(whoosh(0.42, 1800, 260, 0.6), L - 0.44, 0.20)                 # the drop
    add(thump(NOTES[i]), L, 0.95)                                      # the landing
    sustain(NOTES[i], L, CHORD_END, 0.050 if i else 0.070)   # this pillar's note joins the chord
    words = len(tl["descs"][i].split())
    for k in range(words): add(tick(2400 + 90 * k), L + 0.18 + k * (0.28 / words), 0.07)

# recap: the chord, played bottom to top, then the answer
for i in range(n):
    add(pluck(NOTES[i] * 2, 0.7), tl["recapIn"] + 0.25 + i * tl["rowStagger"], 0.16)
add(pluck(880, 1.1), tl["whyIn"], 0.14); add(pluck(1318.5, 1.1), tl["whyIn"] + 0.08, 0.10)

# outro: logo, url, tag
if not WEB:
    add(whoosh(0.9, 200, 1500), tl["outroIn"] - 0.1, 0.16)
    add(thump(110) * 0.8, tl["outroIn"] + 0.75, 0.6)
    for hz, g in [(440, .16), (554.37, .12), (659.25, .12), (880, .10)]: add(pluck(hz, 1.5), tl["outroIn"] + 0.78, g)
    for k in range(len(tl["url"])): add(tick(2500), tl["urlStart"] + k / tl["urlCps"], 0.16)
    add(pluck(659.25, 1.2), tl["tagIn"], 0.10); add(pluck(987.77, 1.2), tl["tagIn"] + 0.06, 0.07)

# a little room: stereo reverb from two decaying noise tails
def reverb(x, seed):
    r = np.random.default_rng(seed)
    m = int(1.6 * SR); t = np.arange(m) / SR
    ir = r.standard_normal(m) * np.exp(-t / 0.38); ir[: int(0.012 * SR)] = 0; ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(x) + m)))
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]

fade = np.minimum(1, np.arange(N) / (0.25 * SR)) * np.minimum(1, (N - np.arange(N)) / (0.9 * SR))
chans = []
for seed in (11, 23):
    ch = (dry + 0.22 * reverb(dry, seed)) * fade
    chans.append(ch)
mix = np.stack(chans, axis=1)
mix = np.tanh(mix * (0.9 / np.max(np.abs(mix))) * 1.25) / np.tanh(1.25) * 0.89
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("sound ", out)
