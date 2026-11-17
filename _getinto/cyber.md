---
# ---- identity ----
slug: cyber
title: Cyber
short: Cyber                      # portrait video title line (keep it short)
status: live                      # live | soon
order: 1
permalink: /getinto/getintocyber.html
redirect_from:
  - /getintocyber
  - /getinto/cyber/

# ---- card on /getinto ----
blurb: "OS, networking, code, and AI. Learn the stack, then learn how it breaks."

# ---- author ----
author: John Martinez
author_short: John M.
author_role: Tech Evangelist at Delinea. Host of Los Nerdys and Grounds for Access.
author_photo: /assets/getinto/authors/john-martinez.jpg
author_bio: >-
  John Martinez is a technologist, speaker, and podcaster with 30+ years in
  systems engineering, cloud, and cybersecurity. He has been doing cloud since
  2010, when he joined Netflix, and has since worked at Adobe, Palo Alto
  Networks, and StrongDM. Now a Technical Evangelist at Delinea, he focuses on
  identity, privileged access, and securing AI agents. He hosts two podcasts:
  Grounds for Access, focused on identity security, and Los Nerdys, a show at
  the intersection of latinidad and tech. He mentors students and early-career
  technologists into rooms they were never handed a key to. Bay Area based.
  Espresso obsessed. Dad to two CS majors.
author_links:
  - { label: "bio.johnmartinez.com", url: "https://bio.johnmartinez.com" }
  - { label: "LinkedIn", url: "https://www.linkedin.com/in/johnmartinez/" }
  - { label: "Los Nerdys on Substack", url: "https://losnerdys.substack.com" }
  - { label: "@cafecitofuerte", url: "https://www.instagram.com/cafecitofuerte" }
podcast_episode:                  # optional: { label: "...", url: "https://..." } for a related Los Nerdys episode

# ---- pillars: drive the page AND the animation ----
# name: <= 12 chars. desc: <= ~48 chars (animation copy, auto-shrinks if longer).
# detail: the full paragraph on the page. resource: one free "start tonight" link.
# Page-only extras (optional, not in the animation):
#   tools: examples to practice with, each { name, what, url }
#   exercise: one thing to try
pillars:
  - name: OS
    desc: "Linux o Windows. Learn one, and learn it well."
    detail: >-
      Linux or Windows, doesn't matter. Pick one and go deep: the filesystem,
      processes, permissions, users, services, logs. I lean heavily Linux.
      The real goal is to know it well enough to break it, and to fix it after.
    resource: { name: "OverTheWire: Bandit", url: "https://overthewire.org/wargames/bandit/" }
    tools:
      - { name: "Kali Linux", what: "Linux with a security toolbox preinstalled. It's a toolbox, not a skill, so learn Linux first.", url: "https://www.kali.org/" }
      - { name: "Sysinternals", what: "Microsoft's free tools for seeing what Windows is really doing: processes, autoruns, file and registry activity.", url: "https://learn.microsoft.com/sysinternals/" }
      - { name: "Commando VM and FLARE-VM", what: "Mandiant's free scripts that turn a Windows VM into a pentest box (Commando) or a malware analysis box (FLARE). The closest thing Windows has to Kali.", url: "https://github.com/mandiant/commando-vm" }
    exercise: >-
      Spin up a VM and delete the whole filesystem: `sudo rm -rf --no-preserve-root /`.
      Watch what dies first and what keeps running. Then rebuild it.
      In a VM. Never on your own machine.
  - name: Networking
    desc: "TCP/IP. HTTP es la puerta, but go deeper."
    detail: >-
      Learn TCP/IP for real. HTTP is the way in, but there's a lot more
      underneath: DNS, routing, ports, TLS, what a packet actually looks like.
    resource: { name: "Professor Messer: Network+ (free)", url: "https://www.professormesser.com/" }
    tools:
      - { name: "Wireshark", what: "See every packet on the wire. Open it, load a web page, and read what just happened.", url: "https://www.wireshark.org/" }
      - { name: "Nmap", what: "Find out what's listening on a machine. Scan your own VM and explain every open port.", url: "https://nmap.org/" }
  - name: Code
    desc: "Any language. Python is a great start."
    detail: >-
      Which language doesn't matter. You're learning how programs work.
      Python is a great choice, but most give you similar skills.
    resource: { name: "Automate the Boring Stuff with Python", url: "https://automatetheboringstuff.com/" }
    tools:
      - { name: "Burp Suite Community or ZAP", what: "Sit between your browser and a web app, watch the requests, then change them. Both are free.", url: "https://www.zaproxy.org/" }
  - name: AI
    desc: "Skills, connectors, agents. Not just prompts."
    detail: >-
      The new one. Not just prompting: how skills and connectors work, how
      agents work, how to generate code from a model. Then learn how agents
      break: prompt injection, overprivileged connectors, agents holding
      standing credentials. That's identity and access for AI.
    resource: { name: "Model Context Protocol docs", url: "https://modelcontextprotocol.io/" }
  - name: Security
    desc: "Now learn how each layer breaks."
    detail: >-
      This is the part that makes it cyber. Go back through every layer and ask
      how it fails: a misconfigured OS, an open port, an injection bug, an agent
      with too much access. Tools are how you practice, not what you learn, and
      they change with the lane you pick (red team, blue team, cloud, identity).
      Only test on labs or on things you own.
    resource: { name: "TryHackMe (free rooms)", url: "https://tryhackme.com/" }
    tools:
      - { name: "TryHackMe", what: "Guided, browser-based labs. The gentlest on-ramp, with plenty you can do for free.", url: "https://tryhackme.com/" }
      - { name: "Hack The Box", what: "Less hand-holding, more puzzle. Go here once the guided rooms feel easy.", url: "https://www.hackthebox.com/" }

# ---- videos (rendered with tools/getinto-video, see HANDOFF.md) ----
player: /getinto/player/getinto-cyber.html
---

<!-- Intro: who this is for, what the work looks like. -->
I get asked "how do I get into cyber?" all the time. Most recently by an Uber
driver in Toronto. This is the answer I gave him, written down.

## Why this order
It's a stack. The OS, then the network between machines, then the code that
runs on them, then the AI that writes and runs code. Each layer makes the next
one make sense. Security sits on top because you can't break, or defend, what
you don't understand.

## Find your people
- Local meetups: BSides, OWASP chapters, DEF CON groups. Most are free.
- Volunteer at a con. It's the classic way in for free, and you meet everyone.
- Go bigger when you can: SecTor, BSides, regional cons. Expo or business
  passes are often free or cheap.

<!-- TODO (John): your path, short and honest. Uncomment the heading when it's written.
## How I got in
-->
