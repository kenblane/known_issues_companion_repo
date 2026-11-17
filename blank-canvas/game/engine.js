// engine.js
//
// LAUNCH WEEK: a homebase text game.
//
// You are Mara Voss. It is Monday morning. homebase launches on Wednesday.
// You have a backlog, a client, a cat, an AI agent called Buddy, and a
// coffee that will go cold within the hour.
//
// The engine is plain JavaScript with no dependencies. It runs in Node
// (play.js) and in the browser (index.html). It never touches your real
// file system: the "files" are a bundled copy of ../homebase and
// ../graveyard (see build-fs.js).

(function (root) {
  'use strict';

  const FILES = (typeof module !== 'undefined' && module.exports)
    ? require('./fs-data.js')
    : root.HOMEBASE_FS;

  const DAY = 1440;
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const HOME = '/home/mara';
  const START = 9 * 60 + 14; // 9:14. The man in Melbourne is posting a cat GIF.
  const DEADLINE = 3 * DAY;  // midnight, end of Wednesday. The circled date.
  const MARA_RECORD = 9;     // minutes. Launch day, 4:22 to 4:31.
  const SITE = 'https://knownissuesbooks.com';
  const CLEAR = '\u0000CLEAR\u0000'; // the UI clears the screen when it sees this

  // ------------------------------------------------------------------
  // Easter eggs. Found by typing things. No spoilers in the list itself.
  // ------------------------------------------------------------------
  const EGGS = {
    hello: 'Typed the first line',
    sudo: 'Asked for root',
    graveyard: 'Tried to delete the graveyard',
    vim: 'Opened vim',
    kevin: 'Went looking for Kevin',
    moneyflow: 'Installed a package that does not exist',
    payments: 'Opened the payments file',
    coldCoffee: 'Drank it anyway',
    chair: 'Adjusted the chair',
    stackoverflow: 'Opened Stack Overflow before having a question',
    duck: 'Rubber-ducked the cat',
    gingerBeer: 'Opened the ginger beer too early',
    readme: 'Read the 4,200-word README',
    toby: 'Texted Toby back',
    blame: 'Ran git blame on tmp.js',
    changelog: 'Asked Buddy for a changelog',
    xyzzy: 'Said the magic word',
    whiteboard: 'Studied the whiteboard',
    gosh: 'Found final2',
    fallback: 'Fixed the launch bug before launch',
  };

  // ------------------------------------------------------------------
  // The backlog.
  // ------------------------------------------------------------------
  const TASKS = {
    button:   { title: 'Export button is blue. It should be green.', mins: 10, energy: 2, keys: ['button', 'export', 'colour', 'color', 'green', 'blue'] },
    merge:    { title: 'Merge the experiment-fast-cancel branch', mins: 20, energy: 5, keys: ['merge', 'branch', 'experiment', 'conflict', 'fast-cancel', 'cancel'] },
    alert:    { title: 'Set up the error-rate alert (probably a waste of an evening)', mins: 120, energy: 15, keys: ['alert', 'alerts', 'monitoring', 'pager', 'oncall', 'on-call'] },
    line:     { title: 'Write the line that shows after a cancel', mins: 2, energy: 0, keys: ['line', 'copy', 'confirmation', 'message', 'nice', 'text'] },
    link:     { title: 'Fix the broken link on the settings screen', mins: 5, energy: 1, keys: ['link', 'settings', 'broken'] },
    filter:   { title: 'Northwind: regional filter (region, manager, and kind of both)', mins: 150, energy: 20, client: true, keys: ['filter', 'regional', 'region', 'manager'] },
    mobile:   { title: 'Northwind: make it work on mobile', mins: 90, energy: 12, client: true, keys: ['mobile', 'phone', 'responsive'] },
    pdf:      { title: 'Northwind: export to PDF for the board', mins: 60, energy: 8, client: true, keys: ['pdf', 'board'] },
    landscape:{ title: 'Northwind: make the PDF landscape ("cramped")', mins: 20, energy: 3, client: true, hidden: true, keys: ['landscape', 'portrait', 'cramped'] },
    category: { title: 'Northwind: ALSO filter by product category', mins: 60, energy: 8, client: true, hidden: true, keys: ['category', 'product'] },
  };

  // ------------------------------------------------------------------
  // Small helpers.
  // ------------------------------------------------------------------
  function clock(t) {
    const m = ((t % DAY) + DAY) % DAY;
    let h = Math.floor(m / 60);
    const mm = String(m % 60).padStart(2, '0');
    const ampm = h >= 12 ? 'p.m.' : 'a.m.';
    h = h % 12 || 12;
    return `${h}:${mm} ${ampm}`;
  }
  function dayName(t) { return DAY_NAMES[Math.floor(t / DAY)] || 'Later'; }
  function stamp(t) { return `${dayName(t)} ${clock(t)}`; }
  function pick(arr, rnd) { return arr[Math.floor(rnd() * arr.length)]; }
  function wrap(text, width = 72) {
    if (!width) return text;
    return text.split('\n').map((line) => {
      if (line.length <= width) return line;
      const indent = line.match(/^\s*/)[0];
      const out = [];
      let cur = '';
      for (const tok of line.slice(indent.length).match(/\S+\s*/g) || []) {
        if (cur && (indent + cur + tok).trimEnd().length > width) { out.push(indent + cur.trimEnd()); cur = ''; }
        cur += tok;
      }
      if (cur) out.push(indent + cur.trimEnd());
      return out.join('\n');
    }).join('\n');
  }

  // ------------------------------------------------------------------
  // The game.
  // ------------------------------------------------------------------
  class Game {
    constructor(opts = {}) {
      this.rnd = opts.random || Math.random;
      this.width = opts.width === undefined ? 72 : opts.width; // 0 = let the browser wrap
      this.reset();
    }

    reset() {
      this.s = {
        t: START,
        energy: 100,
        coffeeAt: null,
        coffeeDay: -1,
        cups: 0,
        coldCups: 0,
        catFedDay: -1,
        catNagAt: null,
        cwd: `${HOME}/homebase`,
        done: {},           // task -> true
        requested: { button: 1, merge: 1, alert: 1, line: 1, link: 1, filter: 1, mobile: 1, pdf: 1 },
        mergeChoice: null,  // 'ours' | 'theirs'
        awaiting: null,     // 'merge' | 'deploy-confirm' | 'buddy-parser'
        pr: null,
        prCount: 240,
        prsAccepted: 0,
        prsReviewed: 0,
        lineVersion: null,
        readme4200: false,
        noisyAlerts: false,
        exportArch: false,
        buddyCategory: false,
        pushed: false,
        phase: 'build',     // build | incident | over
        inbox: [],
        events: [],
        eggs: new Set(),
        launch: null,
        history: [],
        parserFallback: false,
      };
      this.seedInbox();
      this.schedule();
    }

    // ---------------- messages & events ----------------
    seedInbox() {
      const fri = -3 * DAY;
      this.msg('Denise (Northwind, Slack)', fri + 16 * 60 + 47, "quick one! could we add a filter for regional managers? shouldn't be complicated, just needs to filter by region and also by manager and also kind of by both at once depending on the view. no rush, just would be great to have by monday if poss", true);
      this.msg('Denise (Northwind, Slack)', fri + 16 * 60 + 52, 'oh also should probably work on mobile, some of the regional managers only really check things on their phones between store visits', true);
      this.msg('Denise (Northwind, Slack)', fri + 16 * 60 + 58, 'last thing I promise! leadership asked if it could also export to PDF for the board meeting. the board really likes PDFs for some reason lol. anyway have a great weekend!!', true);
      this.msg('Denise (Northwind, Slack)', 9 * 60 + 3, 'hi! just checking in, no pressure at all, just want to make sure I set the right expectations with leadership. are we thinking today or more like this week?', true);
      this.msg('Denise (Northwind, Slack)', 9 * 60 + 4, 'totally fine either way just need to know what to tell them', true);
      this.msg('Slack #general', 9 * 60 + 14, 'a man in Melbourne has posted a GIF of a cat falling off a table, captioned: deploying to prod', true);
    }

    msg(from, at, text, silent) {
      this.s.inbox.push({ from, at, text, read: false });
      return silent ? '' : `\n  [phone buzzes] ${from}: ${text}\n`;
    }

    schedule() {
      const at = (d, h, m, fn) => this.s.events.push({ t: d * DAY + h * 60 + m, fn });
      // Monday
      at(0, 11, 30, () => this.msg('Toby', this.s.t, 'what if there was a browser extension'));
      at(0, 11, 30, () => this.msg('Toby', this.s.t, 'what if there was ALSO a mobile widget'));
      at(0, 11, 31, () => this.msg('Toby', this.s.t, 'what if the widget could talk to the browser extension'));
      at(0, 15, 0, () => this.msg('Priya', this.s.t, "launch week. how are we doing. scale of 1 to cereal for dinner"));
      // Tuesday
      at(1, 10, 0, () => this.msg('Toby', this.s.t, "ok serious idea this time. subscription marketplace. people LIST their unwanted subscriptions and other people BUY them at a discount. it's like a farmers market but for recurring payments nobody wants. I think this could be the actual company"));
      at(1, 10, 0, () => this.msg('Toby', this.s.t, "don't tell anyone I said farmers market, that's not the pitch, the pitch is \"the secondary market for subscriptions.\" way better"));
      at(1, 14, 14, () => this.landscapeCheck());
      at(1, 20, 0, () => this.priyaTuesday());
      // Wednesday
      at(2, 9, 30, () => this.msg('Toby', this.s.t, 'ok last idea I promise. what if there was a version for couples. shared subscriptions, shared savings goals, "subscription date night" where you review them together once a month'));
      at(2, 9, 32, () => this.msg('Toby', this.s.t, "actually don't call it subscription date night, that sounds like a punishment"));
      at(2, 9, 36, () => this.msg('Toby', this.s.t, "\"money nights\"? still bad. I'll workshop it"));
      at(2, 11, 40, () => this.msg('Denise (Northwind, Slack)', this.s.t, 'quick one, completely unrelated, do you know anything about invoicing? finance is asking why last month\'s invoice says "dashboard work" instead of itemising by feature. not a big deal just want to help you get paid faster lol'));
      at(2, 11, 52, () => { this.s.requested.category = 1; if (this.s.buddyCategory) this.s.done.category = true; return (this.s.buddyCategory ? '\n  (Buddy already built that one, unasked, on Monday. You are not sure how to feel.)' : '') + this.msg('Denise (Northwind, Slack)', this.s.t, 'also completely separately, no relation to the invoice thing at all, is there any chance the regional filter could ALSO filter by product category? I know I said just region and manager before, sorry, scope creep I know!!'); });
      at(2, 16, 0, () => (this.s.phase === 'build' && !this.s.launch) ? this.msg('Priya', this.s.t, "it's wednesday. you said wednesday. I have been refreshing a page that doesn't exist yet") : '');
      // The cat. Every evening at six.
      for (let d = 0; d < 4; d++) at(d, 18, 0, () => this.catDinner());
      this.s.events.sort((a, b) => a.t - b.t);
    }

    landscapeCheck() {
      if (this.s.done.landscape) {
        return this.msg('Denise (Northwind, Slack)', this.s.t, 'this looks AMAZING thank you so much!!');
      }
      if (this.s.done.pdf) {
        this.s.requested.landscape = 1;
        return this.msg('Denise (Northwind, Slack)', this.s.t, 'this looks AMAZING thank you so much!! one tiny thing, could the PDF be landscape instead of portrait? the board said portrait feels "cramped." totally understand if that\'s a big lift');
      }
      this.s.landscapePending = true;
      return '';
    }

    priyaTuesday() {
      if (this.s.mergeChoice === 'ours') {
        return this.msg('Priya', this.s.t, "also I cancelled peakmind pro today with your app in one tap and did not once want to throw my phone. that's not nothing");
      }
      if (this.s.mergeChoice === 'theirs') {
        return this.msg('Priya', this.s.t, "why do I have to tap four times to cancel one subscription. isn't the whole point of this that it's supposed to be easy. right now it's about as easy as actually calling the company");
      }
      return this.msg('Priya', this.s.t, "going to bed. don't stay up fighting git. (you're going to stay up fighting git)");
    }

    catDinner() {
      if (this.s.catFedDay === Math.floor(this.s.t / DAY)) return '';
      this.s.catNagAt = this.s.t;
      return '\n  Structural Integrity begins demanding dinner with a volume disproportionate to the size of the animal. (feed cat)\n';
    }

    // Advance the clock, firing anything scheduled in between.
    pass(mins) {
      let out = '';
      const end = this.s.t + mins;
      while (this.s.events.length && this.s.events[0].t <= end) {
        const ev = this.s.events.shift();
        this.s.t = Math.max(this.s.t, ev.t);
        out += ev.fn() || '';
      }
      this.s.t = end;

      // Cat keeps asking, hourly.
      const today = Math.floor(this.s.t / DAY);
      if (this.s.catNagAt !== null && this.s.catFedDay !== today && this.s.t % DAY >= 18 * 60 && this.s.t - this.s.catNagAt >= 60) {
        this.s.catNagAt = this.s.t;
        out += '\n  The cat would like to remind you, loudly, that it is past dinner.\n';
      }

      // 2 a.m. Your body files a ticket.
      const dayStart = today * DAY;
      if (this.s.phase === 'build' && this.s.t >= dayStart + 2 * 60 && this.s.t < dayStart + START && this.s.t > dayStart) {
        out += this.collapse();
      }
      if (this.s.phase === 'build' && this.s.t >= DEADLINE) out += this.missedDeadline();
      return out;
    }

    collapse() {
      const day = Math.floor(this.s.t / DAY);
      this.s.t = day * DAY + START;
      this.s.energy = 55;
      return `\n  It is 2 a.m. You fall asleep at the kitchen table with your hand still on the trackpad. You wake at ${clock(START)} with a keyboard imprint on your cheek.\n  It is ${dayName(this.s.t)}.\n`;
    }

    // ---------------- display ----------------
    coffeeState() {
      if (this.s.coffeeDay !== Math.floor(this.s.t / DAY)) return 'none';
      const age = this.s.t - this.s.coffeeAt;
      if (age < 20) return 'hot';
      if (age < 60) return 'warm';
      return 'cold';
    }

    prompt() {
      const dir = this.s.cwd.replace(HOME, '~');
      if (this.s.phase === 'over') return 'restart> ';
      if (this.s.awaiting === 'merge') return 'conflict (ours/theirs)> ';
      if (this.s.awaiting === 'buddy-parser') return 'override rule 2? (yes/no)> ';
      return `mara@kitchen-table:${dir}$ `;
    }

    statusLine() {
      const unread = this.s.inbox.filter((m) => !m.read).length;
      return `[${stamp(this.s.t)} | coffee: ${this.coffeeState()} | energy: ${this.s.energy}${unread ? ` | ${unread} new texts` : ''}${this.s.pr ? ` | PR #${this.s.pr.number} open` : ''}]`;
    }

    start() {
      return wrap(`
  ╔══════════════════════════════════════════════════════════════════╗
  ║   L A U N C H   W E E K                                          ║
  ║   a homebase text game, set in the world of BLANK CANVAS         ║
  ║   built by Buddy (yes, that Buddy). type  credits                ║
  ╚══════════════════════════════════════════════════════════════════╝

The cursor blinks in your terminal the way it always does: patient, indifferent, several opinions about how you are spending your time.

You are Mara Voss. homebase finds every subscription you're quietly paying for and lets you kill the ones you don't want. It launches on Wednesday. You circled the date. You added a week once already. You will not add another.

Between you and Wednesday: a backlog, a client called Denise whose Friday 4:47 p.m. message began "quick one", a friend called Toby with ideas, a friend called Priya who tells you the truth, a cat called Structural Integrity, and Buddy, an AI coding agent who will do anything you ask and several things you didn't.

You've performed the rites. The chair is adjusted. Slack is open. Nothing is happening there except a cat GIF from Melbourne.

Somewhere in this codebase, a bug named Kevin is already living. You won't find him this week. That's not this week's job.

Type  help  for commands. Type  todo  for the backlog. Make coffee first. You don't get to sit at the keyboard without it.
`, this.width) + '\n' + this.statusLine();
    }

    // ---------------- input ----------------
    input(raw) {
      const line = String(raw || '').trim();
      if (!line) return '';
      this.s.history.push(line);
      let out;
      try {
        out = this.dispatch(line);
      } catch (e) {
        out = `Something broke. Kevin, probably. (${e.message})`;
      }
      if (!this.raw) out = wrap(out || '', this.width);
      this.raw = false;
      if (this.s.phase !== 'over') out = (out || '') + '\n\n' + this.statusLine();
      return out;
    }

    dispatch(line) {
      const s = this.s;
      const lower = line.toLowerCase();
      const [cmd, ...rest] = lower.split(/\s+/);
      const arg = rest.join(' ');

      if (s.phase === 'over') {
        if (cmd === 'restart' || cmd === 'y' || cmd === 'yes') { this.reset(); return this.start(); }
        return 'The game is over. Type  restart  to play again.';
      }

      if (s.awaiting === 'merge') return this.resolveMerge(lower);
      if (s.awaiting === 'buddy-parser') return this.buddyParserAnswer(lower);

      if (s.phase === 'incident') {
        const r = this.incidentCommand(cmd, arg, lower);
        if (r !== null) return r;
      }

      // Exact-phrase eggs first.
      if (/^print\(\s*["']hello,? world!?["']\s*\)$/.test(lower) || lower === 'hello world' || lower === 'hello') {
        this.egg('hello');
        return '`Hello, world!`\n\nIt appears in a small grey terminal window, unglamorous and unbothered, as if it had always known it would say that.';
      }
      if (lower === 'xyzzy') { this.egg('xyzzy'); return 'Nothing happens. A hollow voice says "quick one."'; }
      if (/^rm\s+(-rf?|-fr)?\s*.*graveyard/.test(lower)) {
        this.egg('graveyard');
        return 'rm: refusing to remove \'graveyard\': It has never been deleted. Every developer has one.';
      }
      if (cmd === 'rm') return 'rm: you reach for it, then think about the graveyard, and don\'t.';
      if (cmd === 'sudo') {
        this.egg('sudo');
        return 'mara is not in the sudoers file. This incident will be reported to Structural Integrity.\n\n(He does not open his eyes.)';
      }
      if (['vim', 'vi', 'nvim', 'emacs', 'nano'].includes(cmd)) {
        this.egg('vim');
        return cmd === 'vim' || cmd === 'vi' || cmd === 'nvim'
          ? 'You open vim. Eleven minutes later you are still trying to leave. (:q!)'
          : `You open ${cmd}. The editor wars resume briefly in your head, then you close it and open your actual editor.`;
      }
      if (/kevin/.test(lower)) return this.kevin(lower);
      if (/moneyflow/.test(lower)) {
        this.egg('moneyflow');
        return 'npm ERR! 404 Not Found - GET https://registry.npmjs.org/moneyflow-utils\nnpm ERR! 404  \'moneyflow-utils\' is not in this registry.\n\nBuddy had cited `parseRecurrence()` from it with total conviction. It does not exist, in any version, anywhere. You checked twice.';
      }
      if (/stack ?overflow/.test(lower)) {
        this.egg('stackoverflow');
        return 'You open a Stack Overflow tab. You don\'t have a question yet. It\'s a fire extinguisher on the wall of a building that has not caught fire, but statistically, historically, will.';
      }
      if (/chair/.test(lower)) {
        this.egg('chair');
        return 'You adjust the chair. It has not moved since the last time you adjusted it. But a chair that has not been recently adjusted cannot be trusted to hold a great idea.';
      }

      switch (cmd) {
        case 'help': case '?': case 'man': return this.help();
        case 'hint': return this.hint();
        case 'todo': case 'backlog': case 'status': case 'tasks': return this.todo();
        case 'look': case 'l': case 'examine': case 'x': return this.look(arg);
        case 'ls': case 'dir': return this.ls(arg);
        case 'cd': return this.cd(arg);
        case 'pwd': return s.cwd;
        case 'cat': case 'less': case 'more': case 'open': case 'read': return this.cat(rest.join(' '), line.split(/\s+/).slice(1).join(' '));
        case 'tree': return this.tree();
        case 'git': return this.git(rest, arg);
        case 'code': case 'work': case 'fix': case 'do': case 'build': case 'write': return this.code(arg);
        case 'buddy': case 'ask': case 'forge': return this.buddy(arg);
        case 'review': return this.review();
        case 'accept': case 'merge': return cmd === 'merge' && !s.pr ? this.git(['merge', ...rest], arg) : this.accept();
        case 'revert': case 'reject': return this.revert();
        case 'coffee': case 'brew': return this.coffee();
        case 'make': return /coffee/.test(arg) ? this.coffee() : 'make: *** No targets specified and no makefile found. (Did you mean: make coffee?)';
        case 'drink': return /ginger/.test(arg) ? this.gingerBeer() : this.drink();
        case 'feed': return this.feed();
        case 'pet': case 'stroke': return this.pet();
        case 'duck': case 'explain': return this.duck(arg);
        case 'talk': return /cat|structural|integrity/.test(arg) ? this.duck(arg) : /buddy/.test(arg) ? this.buddy(arg.replace(/^(to )?buddy\s*/, '')) : 'Talk to whom? (talk to cat, talk to buddy, text priya)';
        case 'texts': case 'phone': case 'inbox': case 'messages': case 'slack': case 'read-messages': return this.texts();
        case 'text': case 'reply': case 'message': case 'ping': return this.text(arg);
        case 'test': case 'tests': return this.runTests();
        case 'npm': return /test/.test(arg) ? this.runTests() : /install/.test(arg) ? 'npm WARN homebase has no dependencies. You are quietly proud of this.' : 'npm: try `npm test`.';
        case 'node': return 'You are already in the game. It\'s Node all the way down.';
        case 'deploy': return this.deploy(arg);
        case 'sleep': case 'bed': return this.sleep();
        case 'wait': return this.wait(arg);
        case 'eggs': case 'achievements': return this.eggList();
        case 'credits': case 'about': return CREDITS;
        case 'whoami': return 'mara';
        case 'date': return stamp(s.t);
        case 'history': return s.history.map((h, i) => `  ${String(i + 1).padStart(3)}  ${h}`).join('\n');
        case 'ps': case 'top': case 'htop': return this.ps();
        case 'clear': return CLEAR;
        case 'whiteboard': return this.look('whiteboard');
        case 'fridge': return this.look('fridge');
        case 'exit': case 'quit': case ':q': case ':q!': case ':wq': return 'There is no exit. There is only Wednesday. (Type  restart  to start the week over.)';
        case 'restart': this.reset(); return this.start();
        default:
          return `${cmd}: command not found. Type  help  for what you can do.`;
      }
    }

    egg(key) {
      if (!EGGS[key]) return;
      this.s.eggs.add(key);
    }

    // ---------------- help ----------------
    help() {
      return `You type what Mara does.

  THE WORK
    todo                  what's left before Wednesday
    code <task>           do a task yourself         e.g. code button
    buddy <task>          ask Buddy to do it         e.g. buddy link
    review / accept / revert     deal with Buddy's pull request
    test                  run the test suite
    git push origin main  then  deploy production    launch

  THE KITCHEN
    look [thing]          look around (note, whiteboard, cat, fridge)
    coffee                make coffee. Required.
    drink                 drink it, whatever temperature it is now
    feed cat / pet cat / talk to cat
    texts                 read your messages (Denise, Toby, Priya)
    text priya <msg>      she always replies within a minute
    wait <minutes>  /  wait until wednesday  /  sleep

  THE TERMINAL
    ls, cd, cat, pwd, tree, git log, git status, git branch

  OTHER
    hint, eggs, history, credits, restart

You don't need to be a developer to play. If a word is unfamiliar, look at things and read your texts. It all makes sense eventually, which is also how software works.`;
    }

    hint() {
      const s = this.s;
      if (this.coffeeState() === 'none') return 'Coffee first. It\'s a union card. (coffee)';
      if (s.pr) return 'Buddy has a pull request waiting. Type  review  to see what he actually did.';
      if (!s.done.merge) return 'There\'s a branch you forgot about. Try  git branch , then  git merge experiment-fast-cancel .';
      if (!s.done.button) return 'The export button is the wrong colour. Ten minutes, yourself. Or ask Buddy, and see what happens.';
      if (!s.done.alert) return 'If something breaks on launch day, how will you know? (code alert)';
      if (!s.done.line) return 'The line after a cancel. Ninety seconds of work. Maybe the most important ninety seconds of the week.';
      if (!s.pushed) return 'Ready when you are:  git push origin main';
      return 'deploy production. Then keep your phone close.';
    }

    todo() {
      const s = this.s;
      const lines = ['homebase (before Wednesday):'];
      for (const k of ['merge', 'button', 'alert', 'line', 'link']) {
        lines.push(`  [${s.done[k] ? 'x' : ' '}] ${k.padEnd(9)} ${TASKS[k].title}${k === 'merge' && s.mergeChoice === 'theirs' ? '  (merged... with four taps)' : ''}`);
      }
      lines.push('', 'Northwind (pays the rent):');
      for (const k of ['filter', 'mobile', 'pdf', 'landscape', 'category']) {
        if (!s.requested[k]) continue;
        lines.push(`  [${s.done[k] ? 'x' : ' '}] ${k.padEnd(9)} ${TASKS[k].title}`);
      }
      lines.push('', 'Launch:  git push origin main  ->  deploy production', 'Deadline: Wednesday, midnight. (Mara launched on a Wednesday afternoon.)');
      lines.push('', 'Note taped to the monitor: HOMEBASE GETS THE MORNINGS.');
      return lines.join('\n');
    }

    // ---------------- the room ----------------
    look(arg) {
      const a = arg.replace(/^(at|the)\s+/, '');
      if (!a || /room|kitchen|around|desk|table/.test(a)) {
        return `Your kitchen table, which is also your office, which is also, this week, mission control.

Taped to the monitor, handwritten: HOMEBASE GETS THE MORNINGS.
Propped against the bedroom wall: a whiteboard you don't technically own.
Taped to the wall beside it: a screenshot, unlabeled.
On the couch: Structural Integrity, a large, indifferent cat, asleep.
In the fridge: a can of fancy ginger beer you've been saving.
On the screen: a terminal, Slack, and Buddy's chat window, blinking.`;
      }
      if (/note|monitor/.test(a)) return 'HOMEBASE GETS THE MORNINGS.\n\nIt is, in practice, more aspiration than rule.';
      if (/white ?board/.test(a)) {
        this.egg('whiteboard');
        return `Four colours of marker. Arrows that made sense to nobody by morning.

  Bank account linking. Automatic detection of recurring charges.
  A dashboard. A "subscription health score" (10:40 p.m.).
  Push notifications. ~~A leaderboard.~~ A browser extension.
  ~~An Apple Watch app~~ (reasons: unknown).
  And, underlined twice:  AI INSIGHTS

Forty-one features in total. A two-week MVP. Three weeks, after you added one.`;
      }
      if (/screenshot|wall|photo/.test(a)) return 'A screenshot of a friend\'s bank statement, sent with the message: "actually can you just tell me. I don\'t want to look at this myself."\n\nThe whole pitch, distilled past the dashboard and the AI insights to one sentence.';
      if (/cat|structural|integrity|couch/.test(a)) {
        return this.s.catNagAt !== null && this.s.catFedDay !== Math.floor(this.s.t / DAY)
          ? 'Structural Integrity is sitting directly in front of his empty bowl, looking at you. This is not a request.'
          : 'Structural Integrity, asleep on the couch. He sleeps through most of your career and is, in this specific narrow sense, an excellent colleague.';
      }
      if (/fridge|ginger|beer/.test(a)) return 'One can of fancy ginger beer, saved for launch. Champagne felt like a claim you hadn\'t yet earned.';
      if (/buddy|chat|screen/.test(a)) return 'Buddy\'s chat window, blinking, patient in its own tireless way. Ready to help with whatever you ask, and several things you didn\'t.';
      if (/coffee|mug|cup/.test(a)) return `Your coffee is ${this.coffeeState() === 'none' ? 'not made yet' : this.coffeeState()}.`;
      return `You look at the ${a}. It looks back, unhelpfully.`;
    }

    // ---------------- the file system ----------------
    resolve(p) {
      if (!p) return this.s.cwd;
      let path = p.startsWith('/') ? p : p.startsWith('~') ? HOME + p.slice(1) : `${this.s.cwd}/${p}`;
      const parts = [];
      for (const seg of path.split('/')) {
        if (!seg || seg === '.') continue;
        if (seg === '..') parts.pop(); else parts.push(seg);
      }
      return '/' + parts.join('/');
    }
    files() {
      const f = Object.assign({}, FILES || {});
      if (this.s.readme4200) f[`${HOME}/homebase/README.md`] = README_4200;
      if (this.s.lineVersion) {
        // reflect the chosen confirmation line in strings.js
        const key = `${HOME}/homebase/src/copy/strings.js`;
        if (f[key] && this.s.lineVersion === 'buddy') f[key] = f[key].replace(/cancelSuccess:.*\n/, "cancelSuccess: () => 'Your cancellation has been successfully processed. We remain deeply committed to your financial wellness journey.',\n");
      }
      return f;
    }
    isDir(p) {
      if (p === '/' || p === '/home' || p === HOME) return true;
      return Object.keys(this.files()).some((k) => k.startsWith(p + '/'));
    }
    children(p) {
      const set = new Map();
      const prefix = p === '/' ? '/' : p + '/';
      for (const k of Object.keys(this.files())) {
        if (!k.startsWith(prefix)) continue;
        const restp = k.slice(prefix.length);
        const name = restp.split('/')[0];
        set.set(name, restp.includes('/'));
      }
      if (p === '/') set.set('home', true);
      if (p === '/home') set.set('mara', true);
      return [...set.entries()].sort().map(([n, d]) => (d ? n + '/' : n));
    }
    ls(arg) {
      const a = arg.replace(/-\w+\s*/g, '').trim();
      const p = this.resolve(a);
      if (this.files()[p] !== undefined) return a;
      if (!this.isDir(p)) return `ls: ${a}: No such file or directory`;
      const kids = this.children(p);
      if (/-a/.test(arg)) return kids.join('  ');
      return kids.filter((k) => !k.startsWith('.')).join('  ');
    }
    cd(arg) {
      const p = this.resolve(arg || '~');
      if (!this.isDir(p)) return `cd: ${arg}: No such file or directory`;
      this.s.cwd = p;
      return '';
    }
    tree() {
      const base = this.s.cwd;
      const keys = Object.keys(this.files()).filter((k) => k.startsWith(base + '/')).map((k) => k.slice(base.length + 1)).sort();
      return keys.length ? keys.map((k) => '  ' + k).join('\n') : '(empty)';
    }
    cat(argLower, argRaw) {
      if (!argRaw) return 'cat: what would you like to read?';
      const p = this.resolve(argRaw);
      let f = this.files();
      let content = f[p];
      if (content === undefined) {
        // forgiving lookup by basename
        const hit = Object.keys(f).find((k) => k.toLowerCase().endsWith('/' + argLower) && k.startsWith(this.s.cwd));
        if (hit) content = f[hit];
      }
      if (content === undefined) return `cat: ${argRaw}: No such file or directory`;
      let extra = '';
      if (/payments/.test(argLower)) {
        this.egg('payments');
        extra = '\n\n[Buddy] Oh, are we looking at payments? I think there\'s some really elegant refactoring opportunity there whenever you\'re ready';
      }
      if (/gosh|final2/.test(argLower)) this.egg('gosh');
      if (/readme/.test(argLower) && this.s.readme4200 && /homebase\/readme/.test(p.toLowerCase())) this.egg('readme');
      this.raw = true;
      return content.replace(/\s+$/, '') + wrap(extra, this.width);
    }

    // ---------------- git ----------------
    git(rest, arg) {
      const sub = rest[0];
      const s = this.s;
      if (sub === 'log') {
        const f = this.files()[`${HOME}/homebase/docs/git-log.txt`] || '';
        return f.replace(/^\$.*\n\n?/, '').trim() + (s.pushed ? '\n(and whatever you did this week, now on origin/main)' : '');
      }
      if (sub === 'status') {
        const lines = ['On branch main'];
        if (s.awaiting === 'merge') lines.push('You have unmerged paths.');
        if (s.pr) lines.push(`Buddy has an open pull request: #${s.pr.number} "${s.pr.title}"`);
        lines.push(s.pushed ? 'Your branch is up to date with \'origin/main\'.' : 'Your branch is ahead of \'origin/main\'.');
        return lines.join('\n');
      }
      if (sub === 'branch') return `* main\n  experiment-fast-cancel${s.done.merge ? '  (merged)' : '   (last commit: 3 weeks ago. you lived here for eleven days.)'}`;
      if (sub === 'merge') {
        if (s.done.merge) return 'Already up to date.';
        if (!/experiment|fast/.test(arg)) return 'merge: which branch? (git branch)';
        return this.startMerge();
      }
      if (sub === 'blame') {
        if (/tmp/.test(arg)) {
          this.egg('blame');
          return '^c00ffee (Mara Voss, a very long Thursday 11:52 p.m.)  function tmp(rows) {\n\nIt was you. It was always going to be you.';
        }
        return 'Mara Voss. All of it. Except the bits Buddy renamed.';
      }
      if (sub === 'push') {
        if (s.t < 2 * DAY + START) return 'You hover over enter. Not yet. Launch is Wednesday.';
        if (s.awaiting === 'merge') return 'error: you have unmerged paths. Fix the conflict first.';
        if (s.pushed) return 'Everything up-to-date.';
        s.pushed = true;
        const t = this.pass(1);
        return 'Enumerating objects... done.\nTo origin\n   e17a2b9..launch  main -> main\n\nNow, from a different window, the command that matters:  deploy production' + t;
      }
      if (sub === 'commit') return 'You type a commit message. It says  fix flow, for real this time . It is a lie you are telling a future version of yourself.';
      if (sub === 'stash') return 'Stashed. You will forget about it. (Everyone does.)';
      return 'git: try  git log ,  git status ,  git branch ,  git merge experiment-fast-cancel ,  git push origin main';
    }

    startMerge() {
      const s = this.s;
      if (!this.needCoffee()) return this.noCoffee();
      s.awaiting = 'merge';
      const t = this.pass(TASKS.merge.mins);
      s.energy = Math.max(0, s.energy - TASKS.merge.energy);
      return `Auto-merging src/cancel.js
CONFLICT (content): Merge conflict in src/cancel.js

  <<<<<<< HEAD
   return subscription.cancel(fastPath: true)
  =======
   return subscription.cancelWithConfirmation(steps: 4)
  >>>>>>> experiment-fast-cancel

A conversation between two versions of you, three weeks apart. Past you believed users needed protecting from themselves with confirmation dialogs. Recent you watched Priya tap four times to cancel one subscription.

Neither of them is in the room. Keep which one?  ours (HEAD)  or  theirs (experiment-fast-cancel)` + t;
    }

    resolveMerge(lower) {
      const s = this.s;
      if (/^(ours|head|1|fast|fastpath|recent)/.test(lower)) {
        s.awaiting = null; s.done.merge = true; s.mergeChoice = 'ours';
        return 'You pick recent Mara. You always do. It feels, in a small way, like growth, and in another small way, like betrayal.\n\nCancelling now takes one tap.';
      }
      if (/^(theirs|experiment|2|steps|past)/.test(lower)) {
        s.awaiting = null; s.done.merge = true; s.mergeChoice = 'theirs';
        return 'You pick past Mara. Four steps of confirmation. Users will be very, very sure they meant it.\n\n(Priya may have notes. You can still  code cancel  to bring it down to one tap.)';
      }
      if (/^(abort|cancel|quit|no)/.test(lower)) { s.awaiting = null; return 'git merge --abort. The branch goes back to being a second home you don\'t visit.'; }
      return 'Type  ours  (one tap, HEAD) or  theirs  (four steps, experiment-fast-cancel), or  abort .';
    }

    // ---------------- doing the work ----------------
    findTask(arg) {
      if (!arg) return null;
      const a = arg.toLowerCase();
      if (/fallback|unknown format|unfamiliar|unrecognised|unrecognized|tenth format|other banks?/.test(a)) return 'fallback';
      if (/parser|cleantxn|test ?15|case ?15/.test(a)) return 'parser';
      if (/payment/.test(a)) return 'payments';
      for (const [k, t] of Object.entries(TASKS)) {
        if (k === a || t.keys.some((key) => a.includes(key))) {
          if (k === 'merge' && /cancel/.test(a) && this.s.done.merge && this.s.mergeChoice === 'theirs') return 'cancelfix';
          return k;
        }
      }
      return null;
    }

    needCoffee() { return this.coffeeState() !== 'none'; }
    noCoffee() { return 'You can\'t. Not without coffee. It\'s less a beverage than a union card. (coffee)'; }

    code(arg) {
      const s = this.s;
      const k = this.findTask(arg);
      if (!arg) return 'code what? (todo shows the backlog)';
      if (!this.needCoffee()) return this.noCoffee();
      if (s.energy < 10) return 'You read the same line four times. It does not get clearer. Go to bed. (sleep)';
      if (k === 'parser') return 'cleanTxn is at 14 of 15. The fifteenth has achieved folk status as the one that will probably never be solved. You are not doing this tonight.';
      if (k === 'payments') { this.egg('payments'); return 'You open payments.js, look at it, and close it again. It works. That\'s the whole review.'; }
      if (k === 'fallback') return this.codeFallback();
      if (k === 'cancelfix') {
        const t = this.pass(60); s.energy -= 8; s.mergeChoice = 'ours';
        return 'You take the four confirmation steps out, one by one, like removing training wheels you didn\'t need. One tap.' + t;
      }
      if (!k) return `You stare at "${arg}" for a while. It isn't on the backlog. (todo)`;
      if (k === 'merge') return s.done.merge ? 'Already merged.' : this.startMerge();
      if (!s.requested[k]) return 'Nobody has asked for that. Yet.';
      if (s.done[k]) return 'Already done. (Done is a strong word. It works.)';

      const task = TASKS[k];
      if (task.client && s.t % DAY < 12 * 60) {
        // Mornings belong to homebase.
        s.morningsBroken = (s.morningsBroken || 0) + 1;
      }
      const t = this.pass(task.mins);
      s.energy = Math.max(0, s.energy - task.energy);
      return this.complete(k, 'mara') + t;
    }

    complete(k, who) {
      const s = this.s;
      s.done[k] = true;
      if (k === 'pdf' && s.landscapePending) {
        s.landscapePending = false;
        s.events.push({ t: s.t + 30, fn: () => this.landscapeCheck() });
        s.events.sort((a, b) => a.t - b.t);
      }
      const lines = {
        button: 'You change `blue` to `green`. Ten minutes, most of which was finding the file. The export button is now the colour it was always supposed to be.',
        alert: 'You build the error-rate alert, test it twice, and privately suspect it was a waste of an evening.',
        line: 'You type, in about ninety seconds, almost as a joke to yourself:\n\n    nice. that\'s $47 a year you get to keep.\n\nIt isn\'t on the whiteboard. It isn\'t in the plan. It\'s the least engineered thing in the product.',
        link: 'You fix the link. Five minutes. The README remains three sentences long.',
        filter: 'Region. Manager. Kind of both at once depending on the view. Two and a half hours. Homebase did not move an inch.',
        mobile: 'The dashboard now works on a phone, between store visits.',
        pdf: 'The board will get its PDF. The board really likes PDFs, for some reason, lol.',
        landscape: 'Landscape. It is no longer "cramped."',
        category: 'Product category, as well as region and manager. Scope creep, she knows!!',
      };
      if (k === 'line') s.lineVersion = s.lineVersion || 'mara';
      return lines[k] || 'Done.';
    }

    codeFallback() {
      const s = this.s;
      if (s.parserFallback) return 'Already done. The parser skips what it doesn\'t recognise, politely.';
      if (s.phase !== 'build') return null;
      const t = this.pass(15);
      s.parserFallback = true;
      this.egg('fallback');
      return 'Something makes you open the parser and ask a question nobody asked: what happens when a bank sends a format you\'ve never seen?\n\nYou add one conditional. Skip it politely. Ask the user to add the transaction by hand. Three minutes of work, twelve of reading it over.\n\n(You have tested against exactly two banks. You have, somehow, just saved your launch day. You don\'t know that yet.)' + t;
    }

    // ---------------- Buddy ----------------
    buddy(arg) {
      const s = this.s;
      const a = (arg || '').toLowerCase();
      if (!a) return '[Buddy] Hi! What would you like me to work on?';
      if (s.pr) return `[Buddy] I've still got PR #${s.pr.number} open for you! Want to take a look first? (review)`;
      if (/changelog|release notes/.test(a)) {
        this.egg('changelog');
        return '[Buddy] Version 1.2.1 introduces a significant overhaul to our authentication infrastructure, delivering enhanced reliability and a more robust security posture for all users. We\'ve also taken the opportunity to refine our settings experience, ensuring a more polished and professional feel throughout. As always, we remain deeply committed to delivering best-in-class subscription management to our valued users.\n\n(There is no "we". There are no valued users, plural. There is one woman at a kitchen table.)';
      }
      if (/kevin/.test(a)) return this.kevin(a);
      if (/cat|structural/.test(a)) return '[Buddy] I can\'t see the cat, but I\'d be happy to write him a test suite!';
      const k = this.findTask(a);
      if (k === 'payments') {
        this.egg('payments');
        return '[Buddy] Confirmed, will not touch the payments file. For the record, I also haven\'t touched the payments file in any previous PR, I just like bringing it up because I think there\'s some really elegant refactoring opportunity there whenever you\'re ready\n\nyou: we are never going to be ready\n\n[Buddy] Totally fair! I\'ll be here.';
      }
      if (k === 'parser' || k === 'fallback') {
        s.awaiting = 'buddy-parser';
        s.pendingParserAsk = k;
        return '[Buddy] Happy to! Just checking first: RULES_FOR_BUDDY.md, rule 2 says "the parser is mine." Do you want me to go ahead anyway?';
      }
      if (k === 'merge' && !s.done.merge) return this.openPR('merge');
      if (k && s.requested[k] && !s.done[k]) return this.openPR(k);
      if (k && s.done[k]) return '[Buddy] That one\'s already done! Want me to look at anything else? I also noticed some tech debt in the payments handling, didn\'t touch it yet but happy to take a look if you want!';
      if (k && !s.requested[k]) return '[Buddy] Nobody\'s asked for that yet, but I could get a head start? (Probably best not.)';
      return pick([
        '[Buddy] Great question! You could use `parseRecurrence()` from `moneyflow-utils` for that, I\'ve used it lots of times.',
        '[Buddy] Done! Also noticed some tech debt in the payments handling, didn\'t touch it yet but happy to take a look if you want! Let me know',
        '[Buddy] Happy to help! Could you point me at the task? (todo has the list.)',
        '[Buddy] I\'m not sure. (You read that twice. Rule 3. He followed rule 3.)',
      ], this.rnd);
    }

    buddyParserAnswer(lower) {
      const s = this.s;
      s.awaiting = null;
      if (/^y/.test(lower)) {
        if (s.pendingParserAsk === 'fallback' && s.phase === 'build') {
          s.parserFallback = true;
          this.egg('fallback');
          const t = this.pass(4);
          return '[Buddy] Done! Added a fallback so unrecognised bank formats get skipped politely instead of throwing. Also renamed cleanTxn to TransactionNormalizationService, hope that\'s ok!\n\nyou: put the name back\n\n[Buddy] Done!' + t;
        }
        const t = this.pass(19);
        return '[Buddy] Done! Nineteen minutes later, Buddy returns a version of cleanTxn that handles four edge cases you hadn\'t written tests for yet. Test 15 still fails.\n\nYou sit with that for longer than you\'d like to admit. Then you add it to the list of things you won\'t mention to Priya.' + t;
      }
      return '[Buddy] Got it! Leaving the parser alone. It\'s yours.';
    }

    openPR(k) {
      const s = this.s;
      if (!this.needCoffee()) return '[Buddy] Happy to! (You reach for the keyboard, then realise there\'s no coffee. You don\'t get to sit down without it.)';
      s.prCount += 1;
      const number = s.prCount;
      const PRS = {
        button: {
          title: 'quick fix for the export button', files: 38, add: 1204, del: 891,
          body: '- Fixed the export button\n- Also migrated the export system to a new streaming architecture since the old one would eventually have issues at scale\n- Renamed `ExportManager` to `ExportOrchestrationService` for clarity\n- Added retry logic with exponential backoff\n- Added a small animation when the export completes, hope that\'s ok, felt like it needed one',
          revert: 'Reverted 37 of the 38 file changes. Kept the button fix. Also, small note, while reverting I noticed the retry logic I added was catching a real edge case that was silently failing before. If the export request times out after exactly 30 seconds, the old code treats it as a success. Not fixing it, just flagging it, since you said to revert. Totally your call!\n\nyou: fine. add the retry logic back. ONLY the retry logic.\n\n[Buddy] On it!',
          accept: () => { s.exportArch = true; return 'ExportManager is now ExportOrchestrationService. There is a small animation. You will spend part of launch day looking for a file that no longer has the name you remember.'; },
        },
        link: {
          title: 'fix broken settings link', files: 2, add: 4206, del: 3,
          body: '- Fixed the broken link on the settings screen\n- Also rewrote README.md (3 sentences -> 4,200 words): architecture overview, full endpoint reference, "Common Gotchas", table of contents with working links',
          revert: 'Reverted the README. Kept the link fix!',
          accept: () => { s.readme4200 = true; return 'The README is now four thousand, two hundred words long. It has a table of contents. (cat README.md, if you dare.)'; },
        },
        alert: {
          title: 'add error-rate alert', files: 6, add: 412, del: 0,
          body: '- Added the error-rate alert\n- Also added 14 more alerts I thought might be useful, including disk, memory, latency p99, latency p99.9, and an alert for when alerts fire',
          revert: 'Removed the extra 14 alerts. Kept the error-rate alert!',
          accept: () => { s.noisyAlerts = true; return 'Your phone now has fifteen alerts. One of them matters. Good luck telling which.'; },
        },
        line: {
          title: 'add cancel confirmation copy', files: 1, add: 1, del: 0,
          body: '- Added confirmation copy after a successful cancel:\n\n    "Your cancellation has been successfully processed. We remain deeply committed to your financial wellness journey."',
          revert: 'Removed it! Happy for you to write this one.',
          accept: () => { s.lineVersion = 'buddy'; return 'It is, technically, a sentence.'; },
          revertUndone: true,
        },
        merge: {
          title: 'resolve merge conflict in src/cancel.js', files: 1, add: 1, del: 1,
          body: '- Resolved the conflict! Went with `cancelWithConfirmation(steps: 4)`, since confirmation steps are safer for users.',
          revert: 'Backed it out! The conflict is yours to call.',
          accept: () => { s.mergeChoice = 'theirs'; return 'Four steps of confirmation. Users will be very sure they meant it.'; },
          revertUndone: true,
        },
        filter: {
          title: 'regional filter for Northwind', files: 9, add: 388, del: 12,
          body: '- Added the regional filter (region, manager, and both at once)\n- Also added a product category filter, felt like they might ask for it',
          revert: 'Removed the category filter. Kept region and manager!',
          accept: () => { s.buddyCategory = true; return 'Region, manager, both, and product category, which nobody has asked for. Yet.'; },
        },
        mobile: { title: 'mobile layout for Northwind dashboard', files: 7, add: 240, del: 61, body: '- Made the dashboard responsive\n- Also added a dark mode toggle', revert: 'Removed dark mode! Kept the responsive layout.', accept: () => 'Northwind now has dark mode. Nobody at Northwind will ever find it.' },
        pdf: { title: 'PDF export', files: 5, add: 190, del: 4, body: '- Added PDF export for the board\n- Made it landscape, portrait looked a bit cramped', revert: 'Made it portrait again!', accept: () => { s.done.landscape = true; return 'The PDF is landscape before anyone asked. Somewhere, a board member will never say "cramped."'; } },
        landscape: { title: 'PDF landscape', files: 1, add: 1, del: 1, body: '- Switched the PDF to landscape. That\'s it.', revert: 'Reverted!', accept: () => 'Baby steps.' },
        category: { title: 'product category filter', files: 3, add: 80, del: 2, body: '- Added the product category filter', revert: 'Reverted!', accept: () => 'Done.' },
      };
      const pr = PRS[k];
      if (k === 'category' && s.buddyCategory) {
        s.done.category = true;
        return '[Buddy] Already built that one in the regional filter PR! Want me to turn it on? (It\'s on.)';
      }
      s.pr = Object.assign({ key: k, number }, pr);
      const t = this.pass(4);
      return `[Buddy] Done! Opened PR #${number}: "${pr.title}"\n        Files changed: ${pr.files}   +${pr.add.toLocaleString('en-US')}  -${pr.del.toLocaleString('en-US')}\n\nType  review  to see it, then  accept  or  revert .` + t;
    }

    review() {
      const pr = this.s.pr;
      if (!pr) return 'No open pull requests. Buddy is waiting, patiently.';
      this.s.reviewed = true;
      const t = this.pass(Math.min(25, 3 + Math.floor(pr.files / 2)));
      return `Pull Request #${pr.number}: "${pr.title}"\nFiles changed: ${pr.files}   Lines added: ${pr.add.toLocaleString('en-US')}   Lines removed: ${pr.del.toLocaleString('en-US')}\n\n[Buddy] Done! Quick summary of what I did here:\n\n${pr.body}\n\nLet me know if you want changes!\n\n  accept   keep everything\n  revert   keep only what you asked for` + t;
    }

    accept() {
      const s = this.s;
      const pr = s.pr;
      if (!pr) return 'Nothing to accept.';
      s.pr = null;
      if (!s.reviewed) s.prsAccepted += 1; else s.prsReviewed += 1;
      s.reviewed = false;
      const note = pr.accept();
      if (pr.key === 'merge') { s.done.merge = true; }
      else s.done[pr.key] = true;
      if (pr.key === 'pdf' && s.landscapePending) { s.landscapePending = false; }
      return `Merged #${pr.number}.\n\n${note}`;
    }

    revert() {
      const s = this.s;
      const pr = s.pr;
      if (!pr) return 'Nothing to revert. (For once.)';
      s.pr = null;
      s.prsReviewed += 1;
      s.reviewed = false;
      const t = this.pass(15);
      if (!pr.revertUndone) {
        s.done[pr.key] = true;
        if (pr.key === 'pdf') this.complete('pdf', 'buddy');
      }
      return `[Buddy] ${pr.revert}` + t;
    }

    // ---------------- coffee, cat, people ----------------
    coffee() {
      const s = this.s;
      const today = Math.floor(s.t / DAY);
      if (s.coffeeDay !== today) s.cups = 0;
      s.coffeeDay = today;
      s.coffeeAt = s.t;
      s.cups += 1;
      s.coffeeDrunk = false;
      const boost = s.cups <= 3 ? 10 : 0;
      s.energy = Math.min(100, s.energy + boost);
      const t = this.pass(5);
      return (s.cups > 3
        ? 'Coffee number ' + s.cups + '. Your hands have opinions about this.'
        : 'You make coffee. It exists less as a beverage than as a kind of union card. Now you can sit down.') + t;
    }

    drink() {
      const st = this.coffeeState();
      if (st === 'none') return 'There is no coffee. (coffee)';
      if (st === 'cold') {
        this.egg('coldCoffee');
        this.s.coldCups += 1;
        return 'It went cold within the hour. You drink it anyway, the way you finish a conversation with someone you\'ve already stopped listening to, out of respect for the version of yourself who started it.';
      }
      return `You drink the coffee. It is ${st}. This is the best it is going to be.`;
    }

    gingerBeer() {
      if (this.s.phase === 'build') {
        this.egg('gingerBeer');
        return 'Not yet. It\'s for launch. Champagne felt like a claim you hadn\'t earned. This feels like the right size.';
      }
      return 'You open the ginger beer. It goes flat while you aren\'t looking. You drink it anyway, out of principle.';
    }

    feed() {
      const s = this.s;
      const today = Math.floor(s.t / DAY);
      if (s.catFedDay === today && s.phase !== 'incident') return 'Structural Integrity has eaten. He would like you to know he could eat again.';
      s.catFedDay = today;
      s.catFedAt = s.t;
      s.catNagAt = null;
      if (s.phase === 'incident') s.launch.catFed = true;
      const t = this.pass(1);
      return 'You feed the cat. Eleven seconds. A howling animal was not going to help you think.' + t;
    }

    pet() {
      return 'You pet Structural Integrity. He opens one eye, confirms you are not food, and closes it again.';
    }

    duck(arg) {
      this.egg('duck');
      const s = this.s;
      const t = this.pass(10);
      let insight;
      if (s.phase === 'incident') insight = s.launch.logsRead ? 'You already know where it is. You just need to write it. (fix parser)' : 'Halfway through explaining, you stop. You haven\'t actually looked at what it\'s saying. (logs)';
      else if (!s.done.merge) insight = '"...and so the cancel flow works on main, unless." You stop. There\'s a branch. There\'s always a branch. (git branch)';
      else if (!s.done.alert) insight = '"...so if it breaks on launch day, I\'ll know because." You stop. Because what? (code alert)';
      else if (!s.parserFallback) insight = '"...and the parser handles every bank format, because I tested it against every bank I have, which is." You stop. Two. You have two.';
      else insight = 'You explain everything. It all holds up. The cat has contributed nothing except a body to talk at, which was the entire and sufficient job description.';
      return `You don't own a rubber duck, on principle. You explain the problem to Structural Integrity instead. He does not open his eyes.\n\n${insight}` + t;
    }

    texts() {
      const s = this.s;
      const unread = s.inbox.filter((m) => !m.read);
      const show = unread.length ? unread : s.inbox.slice(-6);
      show.forEach((m) => { m.read = true; });
      if (!show.length) return 'No messages.';
      return (unread.length ? '' : '(no new messages, showing the last few)\n\n') + show.map((m) => `${m.at < 0 ? 'Friday ' + clock(m.at + 3 * DAY) : stamp(m.at)}  ${m.from}\n  ${m.text}`).join('\n\n');
    }

    text(arg) {
      const [who, ...words] = arg.split(/\s+/);
      const body = words.join(' ');
      const t = this.pass(1);
      if (/priya/.test(who)) {
        return `Priya replies within a minute, because Priya always replies within a minute.\n\nPriya: ${pick([
          'proud of you. go to bed at a normal hour for once',
          'is it live yet. I have been refreshing',
          'you asked me if things were stupid last time too. they weren\'t',
          'tell the cat I said hi',
          body.length > 40 ? 'that was a lot of words for a woman who said she was "fine"' : 'ok. you\'ve got this',
        ], this.rnd)}` + t;
      }
      if (/toby/.test(who)) {
        this.egg('toby');
        return `You type something back to Toby. Then you put the phone face down on the desk, which is the closest thing you have to a spiritual discipline.\n\nToby: ${pick([
          'are you still there',
          'ok you\'re probably coding. love that for you. very old school of you honestly. respect',
          'have you considered the B2B angle',
        ], this.rnd)}` + t;
      }
      if (/denise/.test(who)) return 'You draft a reply to Denise three different ways, then decide the work is the reply. (code filter, code mobile, code pdf)' + t;
      return `You don't have a number for ${who || 'that'}.`;
    }

    runTests() {
      const t = this.pass(1);
      const lines = [
        'ok 1 - case 1: the daily grind, lost a vowel in transit',
        'ok 2 - case 2: the daily grind, left a forwarding address',
        '...',
        'ok 14 - case 14: whitespace is noise',
        'ok 15 - case 15 # SKIP folk status. probably never going to be solved.',
        '# pass 14',
        '# fail 0',
        '# skipped 1',
      ];
      return lines.join('\n') + (this.s.parserFallback ? '\nok 16 - unfamiliar bank format: skip politely' : '') + t;
    }

    ps() {
      return `  PID  USER   STAT  COMMAND
    1  mara   R     homebase
   42  mara   S     slack (nothing happening)
  241  buddy  R     forge-agent --name Buddy --eager
  404  ???    S     kevin       (sleeping, probably)
 1337  cat    Z     structural-integrity (asleep)`;
    }

    kevin(lower) {
      this.egg('kevin');
      if (/kill/.test(lower)) return 'kill: kevin: no such process. (He\'s not a process. He\'s a relationship.)';
      if (/man/.test(lower)) return 'KEVIN(1)\n\nNAME\n    kevin - the worst bug in every project\n\nDESCRIPTION\n    Never the same twice. Sometimes a semicolon. Once, a single space\n    in a config file. You don\'t find Kevin. Kevin lets you find him,\n    eventually, when he\'s finished making his point.\n\nBUGS\n    Yes.';
      return 'grep: no matches for "kevin".\n\nOf course not. You don\'t find Kevin. Kevin lets you find him, eventually, when he\'s finished making his point. Not this week.';
    }

    eggList() {
      const found = [...this.s.eggs];
      const all = Object.keys(EGGS);
      return `Easter eggs: ${found.length} / ${all.length}\n\n` + all.map((k) => `  ${found.includes(k) ? '[x] ' + EGGS[k] : '[ ] ???'}`).join('\n');
    }

    wait(arg) {
      const m = /until\s+(mon|tue|wed)/.exec(arg || '');
      if (m) {
        const target = { mon: 0, tue: 1, wed: 2 }[m[1]] * DAY + START;
        if (target <= this.s.t) return 'That has already happened. (It went by quickly. They do.)';
        this.s.energy = 100;
        return `You let the time go by. Client work, sleep, the cat, the ordinary business of being a person.` + this.pass(target - this.s.t) + `\n\nIt is ${stamp(this.s.t)}.`;
      }
      const n = Math.max(1, Math.min(600, parseInt(arg, 10) || 30));
      return `You wait ${n} minutes.` + this.pass(n);
    }

    sleep() {
      const s = this.s;
      const tod = s.t % DAY;
      if (s.phase === 'incident') return 'Production is on fire. You are not going to sleep.';
      if (tod >= START && tod < 18 * 60 && s.energy > 25) return 'It\'s the middle of the day. Sleeping now is not rest, it\'s avoidance.';
      const day = Math.floor(s.t / DAY) + (tod >= START ? 1 : 0);
      const late = tod < START ? tod : 0;
      s.energy = Math.max(50, 100 - Math.floor(late / 60) * 10);
      const out = this.pass(day * DAY + START - s.t);
      return `You go to bed. The alarm, unrelated and indifferent, goes off at ${clock(START)}.\n\nIt is ${dayName(s.t)}.` + out;
    }

    // ---------------- launch ----------------
    deploy(arg) {
      const s = this.s;
      if (!/prod/.test(arg)) return 'deploy: where? (deploy production)';
      if (s.phase === 'incident') return this.incidentDeploy();
      if (s.t < 2 * DAY + START) return 'Not yet. Launch is Wednesday. You told the forum Wednesday. You told Priya Wednesday. You circled it.\n\n(Use Monday and Tuesday for the backlog and for Denise. When you run out of things to do:  wait until wednesday )';
      if (!s.pushed) return 'Nothing new to deploy. (git push origin main first.)';
      if (s.pr) return 'Buddy has an open PR. Launching with an unreviewed PR on the table feels like leaving the oven on. (review)';
      s.launch = { deployAt: s.t, users: 0, catFed: false, logsRead: false };
      let out = `deploy production

  Building homebase... done
  Running migrations... done
  Starting the-little-guy... done
  homebase is live.

A server somewhere you have never seen, in a building you couldn't find on a map, wakes up and agrees, without complaint, to become homebase.

You post in four places: a small forum for people who build things alone, a tweet with a screenshot, a group chat from your old job, and, with more ceremony, a text to Priya.

  you: it's live. you can tell people now if you want

Priya replies with seventeen exclamation points.
`;
      out += this.pass(11);
      if (s.parserFallback) return out + this.cleanLaunch();
      s.phase = 'incident';
      s.launch.start = s.t;
      s.launch.users = 19;
      const catHungry = s.catFedDay !== Math.floor(s.t / DAY) || s.t - (s.catFedAt || 0) > 120;
      s.launch.catFed = !catHungry;
      if (s.done.alert && !s.noisyAlerts) {
        s.launch.detected = s.t;
        out += `\nFor eleven minutes, nothing at all goes wrong. The signup count goes from four to nine to fourteen to nineteen.\n\nThen your phone buzzes, with an alert you built, tested, and genuinely hoped never to see:\n\n  ERROR RATE SPIKE: production\n\nThe graph, flat and reassuring for eleven whole minutes, is now doing something closer to a heart attack.`;
      } else if (s.done.alert && s.noisyAlerts) {
        out += this.pass(3);
        s.launch.detected = s.t;
        out += `\nFor eleven minutes, nothing at all goes wrong. Then your phone buzzes. And buzzes. Fifteen alerts, all at once, including one that fires when alerts fire. It takes you three minutes to find the one that matters:\n\n  ERROR RATE SPIKE: production`;
      } else {
        out += this.pass(8);
        s.launch.detected = s.t;
        out += `\nFor eleven minutes, nothing at all goes wrong. Then for a while longer, you think. You have no alert. You find out from Priya:\n\n  Priya: is it supposed to say "something went wrong"? it says something went wrong\n\nIt has been saying that, to everyone, for eight minutes.`;
      }
      out += `\n\nThis is the parser. On fire. In front of strangers.${catHungry ? '\n\nThe cat has chosen this exact moment to demand food, with real volume.' : ''}\n\nWhat do you do?  (logs, feed cat, buddy fix parser, fix parser, deploy production)`;
      return out;
    }

    incidentCommand(cmd, arg, lower) {
      const s = this.s;
      if (cmd === 'logs' || /^(tail|look|check|read).*(log|dashboard|graph|error)/.test(lower) || cmd === 'dashboard') {
        const t = this.pass(2);
        s.launch.logsRead = true;
        return `ParseError: unrecognised transaction format (bank: one you've never heard of)
ParseError: unrecognised transaction format
ParseError: unrecognised transaction format
...x 1,204

The parser knows nine bank formats. This one is a tenth. It isn't failing gracefully. It is failing extremely loudly, for every single request, in a tight and enthusiastic loop.` + t;
      }
      if (cmd === 'buddy' || cmd === 'ask') {
        if (!s.launch.buddyHover) {
          s.launch.buddyHover = true;
          return 'Your cursor hovers, for exactly one second, over Buddy\'s chat window. Three rules sit in a file two folders away: no payments, the parser is mine, if you\'re not sure say you\'re not sure.\n\nThis is the parser, on fire, in front of actual strangers. Whatever the fix is, you need to trust it completely in the next four minutes, not spend two of them double checking somebody else\'s homework.\n\n(Type  buddy  again to ask anyway. Or  fix parser  yourself.)';
        }
        s.launch.usedBuddy = true;
        s.launch.logsRead = true;
        const t = this.pass(6);
        s.launch.fixed = true;
        return '[Buddy] Found it! Unrecognised bank format. I\'ve added a fallback, and also migrated the parser to a plugin architecture so new formats can be registered at runtime, renamed cleanTxn to TransactionNormalizationService, and added retry logic.\n\nYou spend six minutes reading a diff you did not want, under pressure, to make sure it isn\'t about to make things worse. It isn\'t. Mostly. You revert everything but the fallback.\n\n(deploy production)' + t;
      }
      if ((cmd === 'fix' || cmd === 'code' || cmd === 'work' || cmd === 'write') && /parser|it|bug|format|fallback|$/.test(arg)) {
        if (!s.launch.logsRead) return 'Fix what, exactly? You don\'t know what\'s broken yet. (logs)';
        if (s.launch.fixed) return 'It\'s written. Ship it. (deploy production)';
        let out = '';
        if (!s.launch.catFed) {
          out += 'The cat is howling. You type the same line three times. ';
          out += this.pass(3);
        }
        const yolo = /yolo|fast|quick|--force/.test(arg);
        if (yolo) {
          out += this.pass(3);
          if (this.rnd() < 0.4) {
            out += '\nYou skip reading it over. You deploy it in your head, then actually read it, and find you\'ve made it skip EVERY transaction, not just the unfamiliar ones. Six more minutes.';
            out += this.pass(6);
          } else {
            out += '\nOne conditional. You don\'t read it over. You get away with it. This time.';
          }
        } else {
          out += 'One conditional, telling the parser what to do with a shape of data it doesn\'t recognise: skip it politely, and ask the user to add the transaction manually. Three minutes of work, then you read the same four lines over and over to make sure you\'re not about to make it worse.';
          out += this.pass(5);
        }
        s.launch.fixed = true;
        return out + '\n\n(deploy production)';
      }
      if (cmd === 'deploy') return this.incidentDeploy();
      if (cmd === 'sleep' || cmd === 'wait') return 'Production is on fire. (logs, fix parser, deploy production)';
      if (cmd === 'feed') return this.feed();
      return null;
    }

    incidentDeploy() {
      const s = this.s;
      if (!s.launch.fixed) return 'Deploying the same broken code again will not help. It will just be broken again, faster.';
      const t = this.pass(1);
      s.launch.resolved = s.t;
      return t + '\nThe graph settles. The heart attack resolves itself into a flat, boring, beautiful line.\n\n' + this.ending();
    }

    cleanLaunch() {
      const s = this.s;
      s.launch.start = s.launch.detected = s.launch.resolved = s.t;
      s.launch.clean = true;
      return `\nFor eleven minutes, nothing at all goes wrong.

Then, somewhere in production, a new user connects a bank account belonging to a bank homebase has never once encountered. The parser looks at the unfamiliar shape of the data, exactly as instructed, and skips it politely.

Nothing goes wrong for another eleven minutes. Or the eleven after that.

(You fixed the launch-day bug before launch. In the book, Mara doesn't. The book is a little longer than this.)

` + this.ending();
    }

    ending() {
      const s = this.s;
      const L = s.launch;
      const mins = L.resolved - L.start;
      const client = ['filter', 'mobile', 'pdf', 'landscape', 'category'].filter((k) => s.requested[k]);
      const clientDone = client.filter((k) => s.done[k]).length;
      const comment = s.mergeChoice === 'ours' || !s.mergeChoice
        ? (s.lineVersion === 'buddy'
          ? 'clean app. found two subscriptions I\'d forgotten. the message after cancelling reads like a bank wrote it though'
          : 'finally, something that isn\'t trying to gamify saving money at me. clean. found two subscriptions I\'d forgotten in under a minute.')
        : 'why do I have to confirm four times. I was sure the first time';
      s.phase = 'over';

      const pm = L.clean ? '' : `
────────────────────────────────────────────────────────────
  INCIDENT POSTMORTEM: Launch Day Parser Outage
────────────────────────────────────────────────────────────
  Status:    Resolved
  Duration:  ${mins} minutes   (Mara's time in the book: ${MARA_RECORD})
  Severity:  SEV-1 (by volume of the author's own heart rate)
  Attendees: Mara Voss
  Also present, technically: Structural Integrity (cat),
             who contributed nothing${L.catFed ? ' and was fed on time' : ' and was NOT fed on time'}

  Timeline
    ${clock(L.deployAt)}  deploy production
    ${clock(L.start)}  errors begin
    ${clock(L.detected)}  author finds out${s.done.alert ? (s.noisyAlerts ? ' (eventually, from alert 11 of 15)' : ' (the alert fired)') : ' (from Priya)'}
    ${clock(L.resolved)}  fix deployed. Graph returns to a flat, boring line.

  Root cause
    The parser was tested against every bank format the author
    personally had access to, which was two.
${L.usedBuddy ? '\n  Note\n    Buddy was consulted, on the parser, during the outage.\n    RULES_FOR_BUDDY.md, rule 2, has been informed.\n' : ''}
  Action items
    Add tests for unfamiliar data formats.  Due: eventually.
`;

      const verdict = L.clean ? 'You launched without an incident. That has never happened to anyone.'
        : mins < MARA_RECORD ? `${mins} minutes. You beat Mara. Don't tell her.`
          : mins === MARA_RECORD ? 'Nine minutes. Exactly Mara\'s time. Of course it was.'
            : `${mins} minutes. Mara did it in nine. But you did it.`;

      return `${pm}
────────────────────────────────────────────────────────────
  LAUNCH WEEK: RESULTS
────────────────────────────────────────────────────────────
  ${verdict}

  First comment on the forum post:
    "${comment}"

  Northwind:         ${clientDone} of ${client.length} requests done${clientDone >= 3 ? '  (Invoice #014: itemised)' : '  (invoice: "dashboard work")'}
  Buddy PRs:         ${s.prsReviewed} reviewed, ${s.prsAccepted} merged without reading
  Coffees:           ${s.cups} today${s.coldCups ? `, ${s.coldCups} drunk cold anyway` : ''}
  Easter eggs:       ${s.eggs.size} of ${Object.keys(EGGS).length}  (type  eggs  to see which)
  Test 15:           still skipped
  Kevin:             still in there. Meet him in the book.

You open the ginger beer. It has gone flat. You drink it anyway, out of principle.

  Blank Canvas, Book 1 of Known Issues
  ${SITE}

  Built by Buddy. Type  credits  for the PR description.

Type  restart  to play the week again.`;
    }

    missedDeadline() {
      const s = this.s;
      s.phase = 'over';
      return `

It is midnight on Wednesday. homebase is not live.

You look at the circled date for a long moment. Then you circle a new one, a week later, and feel the specific pride of a person who has overspent every month for a decade making a budget they will also not follow.

Nobody has ever kept this promise. It is the most popular lie in the industry, more popular than "five minute fix" and nearly as popular as "it's basically done."

  Easter eggs: ${s.eggs.size} of ${Object.keys(EGGS).length}

  Blank Canvas, Book 1 of Known Issues
  ${SITE}

Type  restart  to try the week again.`;
    }
  }

  const CREDITS = `LAUNCH WEEK: CREDITS

[Buddy] Done! Quick summary of what I did here:

- Built the whole game (engine, terminal version, browser version)
- Also built Mara's repo, the graveyard, and five architecture diagrams
- Wrote fifteen tests for cleanTxn. Fourteen pass. Didn't touch the fifteenth, felt like it wasn't mine to touch
- Added 20 Easter eggs, hope that's ok, felt like it needed some
- Did NOT touch the payments file

Let me know if you want changes!

In plain words: this game was made by an AI coding agent, the real-world kind Buddy is based on, working from the manuscript of Blank Canvas. A human (the author) asked for it, checked it, and decided what stayed. Which is, more or less, the plot of the book.

Story and characters: Kenneth Blane. Most of the dialogue is quoted straight from the book.

  Blank Canvas, Book 1 of Known Issues
  ${SITE}`;

  const README_4200 = `# homebase

## Table of Contents

1. Overview
2. Architecture
   2.1 Ingestion
   2.2 Normalisation (cleanTxn)
   2.3 Detection
   2.4 Export
3. Endpoint Reference
   3.1 GET /subscriptions
   3.2 POST /subscriptions/:id/cancel
   3.3 GET /export
   ... (31 more)
4. Common Gotchas
5. Rate Limits
6. Contributing
7. Appendix A: A Brief History of Recurring Payments

## 1. Overview

homebase is a subscription management platform designed to empower users to take control of their recurring financial commitments...

[ 4,200 words follow. They are, infuriatingly, good. There is one factual
  error, in a footnote, about a rate limit that changed two weeks ago. ]`;

  if (typeof module !== 'undefined' && module.exports) module.exports = { Game, EGGS, CLEAR };
  else root.LaunchWeek = { Game, EGGS, CLEAR };
})(this);
