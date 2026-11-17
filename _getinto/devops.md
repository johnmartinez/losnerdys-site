---
# ---- identity ----
slug: devops
title: DevOps
short: DevOps                     # portrait video title line (keep it short)
status: live                      # live | soon
order: 2
permalink: /getinto/getintodevops.html
redirect_from:
  - /getintodevops
  - /getinto/devops/

# ---- card on /getinto ----
blurb: "Build it, ship it, run it, automate the boring parts."

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
# Series pattern: pillar 1 is the prerequisite (the foundations from Get Into Cyber),
# the last pillar is the one that makes it this field.
pillars:
  - name: Foundations
    desc: "OS, networking, code, AI. Start there."
    detail: >-
      The same four I give anyone getting into tech: an operating system,
      networking, a programming language, and AI. DevOps is those four, applied
      to shipping and running software. If they're shaky, everything you stack
      on top of them is shaky. The Get Into Cyber guide walks through each one.
    resource: { name: "Get Into Cyber: the first four pillars", url: "/getinto/getintocyber.html" }
  - name: Cloud
    desc: "Pick one. AWS, Azure o GCP. Learn it well."
    detail: >-
      Pick one cloud and go deep: compute, storage, networking, and identity
      (IAM). The concepts carry over to the other two. I came up on AWS.
      Before you build anything, set a budget alert. The cloud will happily
      bill you for a lesson.
    resource: { name: "AWS Cloud Practitioner Essentials (free on Skill Builder)", url: "https://aws.amazon.com/training/digital/" }
    exercise: >-
      Build a small server by hand in the console. Tear it down. Now build the
      same thing without touching the console. That gap is the whole job.
  - name: Containers
    desc: "Docker first. Then Kubernetes."
    detail: >-
      A container is your app plus everything it needs, in one package that
      runs the same everywhere. Learn Docker until building and running an
      image is boring. Then learn Kubernetes, which runs containers across many
      machines and has become the standard way to do it. Don't start with
      Kubernetes. It only makes sense once you've felt the problem it solves.
    resource: { name: "Kubernetes Basics (interactive tutorial)", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/" }
    tools:
      - { name: "Docker", what: "Build and run your first container. Start with the official getting started guide.", url: "https://docs.docker.com/get-started/" }
      - { name: "minikube or kind", what: "A real Kubernetes cluster on your laptop, for free.", url: "https://minikube.sigs.k8s.io/" }
    exercise: >-
      Put any app you wrote into a container and run it. Then run three copies
      on Kubernetes and delete one while you watch.
  - name: Pipelines
    desc: "Git, CI/CD, infrastructure as code."
    detail: >-
      Everything lives in Git: the app, the tests, and the infrastructure. A
      pipeline takes a commit and builds it, tests it and ships it with no
      human in the middle. That's CI/CD. Infrastructure as code means your
      servers and networks are files you can review, version and rebuild.
    resource: { name: "GitHub Skills (free, hands-on)", url: "https://skills.github.com/" }
    tools:
      - { name: "GitHub Actions", what: "The pipeline that's already attached to your repo.", url: "https://docs.github.com/actions" }
      - { name: "Terraform or OpenTofu", what: "Describe infrastructure in files, then apply it. Same language. OpenTofu is the open-source fork.", url: "https://opentofu.org/" }
    exercise: >-
      One rule for a week: nothing reaches your server unless it went through
      the pipeline. No logging in to fix it by hand.
  - name: Run it
    desc: "You build it, you run it."
    detail: >-
      This is the part that makes it DevOps. The line is Werner Vogels', from
      Amazon, and it's still the best summary. Shipping is half the job. The
      other half is knowing it's healthy, finding out before your users do, and
      fixing it at 2 a.m. without making it worse. Learn monitoring, logs,
      alerts, on-call, and how to write an honest postmortem.
    resource: { name: "Google's SRE books (free online)", url: "https://sre.google/books/" }
    tools:
      - { name: "Prometheus and Grafana", what: "Collect metrics and put them on a dashboard. Free, and you'll find them everywhere.", url: "https://prometheus.io/" }
    exercise: >-
      Break your own deployment on purpose. Kill a container, fill a disk,
      block a port. Did anything tell you? If not, that's your next task.

# ---- videos (rendered with tools/getinto-video) ----
player: /getinto/player/getinto-devops.html
youtube: https://www.youtube.com/watch?v=LeGpnRPP0pg   # the landscape cut on YouTube, linked under the player
---

<!-- Intro: who this is for, what the work looks like. -->
DevOps isn't a tool or a team name. It's what happens when the people who write
the software also own getting it to production and keeping it up. Day to day
that means automating builds and deploys, wiring up cloud infrastructure, and
being the one who knows why it broke.

## Why this order
It's a stack, same as cyber. The foundations are at the bottom. Cloud is where
things run now. Containers are how they're packaged. Pipelines are how they get
there without you. Running it comes last, because you can't keep something
healthy until you understand every layer underneath it.

## Find your people
- DevOpsDays: local, volunteer-run and cheap. Volunteer at one. Same trick as cyber.
- Kubernetes and cloud native meetups. Most cities have one, and most are free.
- Your cloud's user group (AWS, Azure and Google Cloud all have them).
- Go bigger when you can: KubeCon, or your cloud's big conference.

## How I got in
Before it had a name. I was doing DevOps, and a few variations of it, before
anybody was calling it "DevOps."

That was at Netflix, in the early days of the cloud. Everything I learned there
came with me to Adobe, where I designed the foundation for how we did DevOps and
cloud deployments for Creative Cloud.

I even got to tell that story on stage at AWS re:Invent in 2013:
[How Adobe Deploys: Refreshing the Entire Stack Every Time](https://www.youtube.com/watch?v=iwnvIbT6CV0).
Fair warning: it's ancient by today's tech standards. Watch it like a history
lesson.
