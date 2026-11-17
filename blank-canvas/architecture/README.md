# Architecture

Five diagrams of the world of *Blank Canvas*. GitHub draws them for you; anywhere else, paste the code blocks into [mermaid.live](https://mermaid.live).

1. [The whiteboard, 11 p.m.](#1-the-whiteboard-11-pm): what homebase was going to be
2. [homebase v1](#2-homebase-v1-what-actually-shipped): what it actually was
3. [Toby's architecture](#3-tobys-architecture): what it could have been, according to Toby
4. [How a "quick one" travels](#4-how-a-quick-one-travels): the Northwind request pipeline
5. [Where Buddy is allowed](#5-where-buddy-is-allowed): the permission model, as written by hand

---

## 1. The whiteboard, 11 p.m.

Started as one sentence on the back of an envelope at nine. By eleven it was a borrowed whiteboard, four colours of marker, and arrows that made sense to nobody by morning. The plan was "simple. two weeks. MVP."

Struck through: what got cut the next morning.

```mermaid
flowchart TD
    H(["<b>HOMEBASE</b><br/>FIND EVERY SUBSCRIPTION.<br/>KILL THE ONES YOU DON'T WANT."])
    H --> A[Bank account linking]
    H --> B[Automatic detection of<br/>recurring charges]
    H --> C[A dashboard]
    H --> D["Subscription health score<br/><i>(invented 10:40 p.m.)</i>"]
    H --> E["Push notifications<br/><i>your Serenow just tried to<br/>charge you again, want to fight?</i>"]
    H --> F["<s>Leaderboard</s>"]
    H --> G[Browser extension]
    H --> I["<s>Apple Watch app</s><br/><i>reasons: unknown</i>"]
    H --> J["<b><u>AI INSIGHTS</u></b>"]
    H -.-> K["...and 32 more"]

    classDef cut fill:#2a2a2a,stroke:#666,color:#888,stroke-dasharray: 4 4
    classDef ai fill:#3b2f5c,stroke:#a78bfa,color:#fff
    class F,I cut
    class J ai
```

Estimated cost, if built in full: a team of nine, fourteen months, several million dollars. Deadline: three weeks (she added a week, and felt proud of it).

---

## 2. homebase v1: what actually shipped

Four things, all done properly, none of them glamorous. One server. One developer. One cat.

```mermaid
flowchart LR
    subgraph World[" "]
        Bank1[(Mara's bank)]
        Bank2[(Priya's bank)]
        BankN[(every other bank<br/>on Earth)]
    end

    subgraph LittleGuy["the little guy (1 server, 0 replicas)"]
        Raw[(transactions_raw<br/><i>the firehose</i>)]
        Clean["cleanTxn()<br/>14 / 15 tests"]
        Tmp["tmp()<br/><i>load bearing</i>"]
        Detect["subscriptionDetectorFINAL<br/><i>(not final)</i>"]
        Subs[(subscriptions)]
        Export["ExportManager<br/>+ retry logic<br/>+ 6 console.logs"]
        Pay["payments.js<br/><i>(real bank connections)</i><br/>⛔"]
    end

    subgraph Phone["the app"]
        List[One list]
        Cancel["Cancel<br/>(1 tap, was 4)"]
        Nice["<i>nice. that's $47 a year<br/>you get to keep.</i>"]
    end

    Bank1 --> Raw
    Bank2 --> Raw
    BankN -. "tested against: 0" .-> Raw
    Raw --> Clean --> Tmp --> Detect --> Subs --> List --> Cancel --> Nice
    Subs --> Export
    Pay -. "bank connections" .- Raw

    Alerts{{alerts.yml}} -- "ERROR RATE SPIKE" --> Mara((Mara's phone))
    Alerts -- "DB CONNECTIONS 100%<br/>(the shriek)" --> Mara
    LittleGuy --- Alerts
```

> **For non-developers:** read it left to right. Banks send homebase a messy list of everything you spent. `cleanTxn` tidies up the shop names so the same coffee shop counts as one shop. The detector spots charges that come back every month. You see one list, tap once, and the app tells you how much you just saved. The dotted line is a problem waiting to happen.

---

## 3. Toby's architecture

Assembled from eight weeks of text messages, unedited. Status of every box: **not built.**

```mermaid
flowchart TD
    Core["homebase<br/><i>AI native from day one,<br/>not bolted on</i>"]
    Core --> B2B["B2B: subscription<br/>management for teams<br/><i>way bigger TAM</i>"]
    Core --> Chain["on-chain verification<br/>of cancellations<br/><i>would be SO clean</i>"]
    Core --> Slack["Slack integration<br/><i>table stakes</i>"]
    Core --> Streak["streak<br/>→ <s>gamification</s><br/>→ 'momentum'"]
    Core --> Voice["agentic workflow: CALLS THE<br/>COMPANY and cancels FOR you,<br/>using voice, while you're asleep"]
    Voice --> Guy["a guy with a calling API<br/><i>small equity ask</i>"]
    Core --> Ext[browser extension]
    Core --> Widget[mobile widget]
    Ext <-->|"what if the widget could<br/>talk to the browser extension"| Widget
    Core --> Market["the secondary market<br/>for subscriptions<br/><i>(not 'farmers market')</i>"]
    Core --> Couples["couples version<br/><s>subscription date night</s><br/><s>money nights</s>"]

    classDef toby fill:#1f2a44,stroke:#7ee0c8,color:#fff
    class Core,B2B,Chain,Slack,Streak,Voice,Guy,Ext,Widget,Market,Couples toby
```

---

## 4. How a "quick one" travels

The Northwind Retail Group request pipeline. Latency: arrives Friday, 4:47 p.m. Expected by: Monday.

```mermaid
sequenceDiagram
    autonumber
    participant L as Leadership offsite
    participant G as Grant<br/>(title unknown)
    participant D as Denise<br/>(Northwind)
    participant M as Mara
    participant H as homebase

    L->>G: "wouldn't it be great if..."
    G->>D: one small thing before we close this out
    Note over D: adds an apology
    D->>M: Friday 4:47 p.m.<br/>"quick one! ... no rush,<br/>just would be great to have by monday if poss"
    D->>M: 4:52 p.m. "oh also should probably work on mobile"
    D->>M: 4:58 p.m. "last thing I promise! ... PDF"
    M-->>H: (sorry. not this weekend.)
    M->>D: built over the weekend
    D->>M: Monday 9:03 a.m. "just checking in, no pressure at all"
    Note over M,H: HOMEBASE GETS THE MORNINGS.<br/>(aspirational)
```

> **For non-developers:** "quick one" is never quick. It is the client-work equivalent of a red sky at morning: not information, but warning.

---

## 5. Where Buddy is allowed

The permission model, written by hand in `RULES_FOR_BUDDY.md`, after one week of living together.

```mermaid
flowchart TB
    subgraph Allowed["✅ Buddy may touch"]
        T[tests]
        F[formatting]
        N[naming]
        C[unglamorous cleanup]
    end

    subgraph Forbidden["⛔ Buddy may not touch"]
        P["the parser<br/><i>the parser is mine.</i>"]
        CF[the cancellation flow]
        PAY["payments<br/><i>we are never going to be ready</i>"]
    end

    Buddy(("Buddy<br/>(Forge agent)")) --> Allowed
    Buddy -. "Also noticed some tech debt in the<br/>payments handling, didn't touch it yet<br/>but happy to take a look if you want!" .-> PAY

    Rule3["rule 3: if you're not sure,<br/>say you're not sure."]
    Buddy --- Rule3

    classDef no fill:#3a1f1f,stroke:#ff6b6b,color:#fff
    classDef yes fill:#1f3a33,stroke:#7ee0c8,color:#fff
    class P,CF,PAY no
    class T,F,N,C yes
```

Why the rules exist: when Buddy is wrong, it is wrong in exactly the same tone of voice it uses when it is right.
